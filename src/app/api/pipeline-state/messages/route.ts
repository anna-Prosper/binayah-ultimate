import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateText, validateUserId } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { chatBus } from "@/lib/chatBus";
import { USERS_DEFAULT } from "@/lib/data";
import { getEmailForUser } from "@/lib/auth";
import { sendStageEmail } from "@/lib/email";

// Resolve @mentions in chat text → user IDs.
// Matches @username (alphanumeric + -, _) case-insensitive.
function parseMentions(text: string): string[] {
  const matches = text.match(/@([a-z0-9_-]+)/gi) || [];
  const ids = new Set<string>();
  for (const m of matches) {
    const handle = m.slice(1).toLowerCase();
    const user = USERS_DEFAULT.find(u => u.id === handle || u.name.toLowerCase() === handle);
    if (user) ids.add(user.id);
  }
  return Array.from(ids);
}

const APP_URL = process.env.NEXTAUTH_URL || "https://dashboard-gamification.vercel.app";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function notifyMentions(text: string, senderUserId: string) {
  const mentioned = parseMentions(text);
  if (mentioned.length === 0) return;
  const sender = USERS_DEFAULT.find(u => u.id === senderUserId);
  const senderName = sender?.name || senderUserId;
  const safeText = escapeHtml(text).slice(0, 600);
  const html = `<div style="font-family:system-ui,sans-serif;color:#222;max-width:520px;margin:0 auto;padding:24px;">
    <div style="font-size:12px;color:#999;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">// Binayah Dashboard</div>
    <h2 style="margin:0 0 16px;font-size:18px;">${escapeHtml(senderName)} mentioned you</h2>
    <blockquote style="margin:0;padding:14px 18px;background:#f5f5f5;border-left:3px solid #bf5af2;border-radius:6px;font-size:14px;line-height:1.5;color:#333;">${safeText}</blockquote>
    <p style="margin-top:24px;"><a href="${APP_URL}" style="display:inline-block;background:#bf5af2;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">Open chat →</a></p>
    <p style="margin-top:24px;font-size:11px;color:#999;">You're receiving this because you were mentioned in the team chat.</p>
  </div>`;

  await Promise.allSettled(mentioned.filter(id => id !== senderUserId).map(uid => {
    const to = getEmailForUser(uid);
    if (!to) return Promise.resolve();
    return sendStageEmail({ to, subject: `${senderName} mentioned you in chat`, html }).catch(e => {
      console.warn(`[chat-mention] failed to email ${uid}:`, e);
    });
  }));
}

export const dynamic = "force-dynamic";
const WORKSPACE = { workspaceId: "main" };
const ROUTE = "/api/pipeline-state/messages";

async function ensureDoc() {
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $setOnInsert: { state: {}, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  // Rate limit: 30 req/min per IP
  const rl = rateLimit(req, ROUTE, 30, 60_000);
  if (!rl.ok) {
    logApi(ROUTE, "rate_limited", { retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "Too many requests — slow down" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const sizeErr = checkContentLength(req);
  if (sizeErr) {
    logApi(ROUTE, "payload_too_large");
    return NextResponse.json({ error: sizeErr }, { status: 400 });
  }

  const msg = (await req.json()) as Record<string, unknown>;

  const userIdErr = validateUserId(msg.userId, "userId");
  if (userIdErr) {
    logApi(ROUTE, "validation_fail", { reason: userIdErr });
    return NextResponse.json({ error: userIdErr }, { status: 400 });
  }
  const textErr = validateText(msg.text, "text", 2000);
  if (textErr) {
    logApi(ROUTE, "validation_fail", { reason: textErr });
    return NextResponse.json({ error: textErr }, { status: 400 });
  }

  await connectMongo();
  await ensureDoc();
  // $slice: -200 keeps the most recent 200 messages
  const doc = await PipelineState.findOneAndUpdate(
    WORKSPACE,
    {
      $push: { "state.chatMessages": { $each: [msg], $slice: -200 } },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  ).lean();
  const total = ((doc as { state?: { chatMessages?: unknown[] } } | null)?.state?.chatMessages || []).length;
  logApi(ROUTE, "success", { total });
  // Emit to SSE subscribers so all connected clients receive the message instantly
  chatBus.emit("message", msg);
  // Fire-and-forget: email mentioned users (Gmail SMTP)
  const text = (msg.text as string) || "";
  const senderId = (msg.userId as string) || "";
  if (text && senderId) {
    notifyMentions(text, senderId).catch(e => console.warn("[chat-mention] notifyMentions failed:", e));
  }
  return NextResponse.json({ ok: true, total });
}
