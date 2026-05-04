import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import ChatMessage from "@/lib/ChatMessage";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateText } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { chatBus } from "@/lib/chatBus";
import { notifyMentions } from "@/lib/mentions";

export const dynamic = "force-dynamic";
const ROUTE = "/api/pipeline-state/messages";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessionUserId = session.user?.fixedUserId;

  const before = req.nextUrl.searchParams.get("before");   // optional msgId cursor
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);
  const threadId = req.nextUrl.searchParams.get("threadId") ?? "team";
  if (threadId.startsWith("dm:") && (!sessionUserId || !threadId.split(":").includes(sessionUserId))) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // workspaceId filter: if provided, scope to that workspace; otherwise fall back to "main"
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? "main";

  await connectMongo();
  const query: Record<string, unknown> = { workspaceId, threadId };
  if (before) query.id = { $lt: parseInt(before, 10) };

  const messages = await ChatMessage.find(query)
    .sort({ id: -1 })   // newest first from DB
    .limit(limit)
    .lean();

  // Return oldest-first for client rendering
  return NextResponse.json(messages.reverse().map(m => ({
    id: m.id, userId: m.userId, text: m.text, time: m.time, workspaceId: m.workspaceId, threadId: m.threadId ?? "team", attachments: m.attachments ?? [],
  })));
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

  const session = await getServerSession(authOptions);
  const authoredUserId = session?.user?.fixedUserId;
  if (!authoredUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const textErr = validateText(msg.text, "text", 2000);
  const attachments = Array.isArray(msg.attachments) ? msg.attachments.slice(0, 4) : [];
  if (textErr && attachments.length === 0) {
    logApi(ROUTE, "validation_fail", { reason: textErr });
    return NextResponse.json({ error: textErr }, { status: 400 });
  }
  for (const file of attachments) {
    if (!file || typeof file !== "object") return NextResponse.json({ error: "invalid attachment" }, { status: 400 });
    const f = file as Record<string, unknown>;
    if (typeof f.name !== "string" || f.name.length > 160) return NextResponse.json({ error: "invalid attachment name" }, { status: 400 });
    if (typeof f.type !== "string" || f.type.length > 120) return NextResponse.json({ error: "invalid attachment type" }, { status: 400 });
    if (typeof f.dataUrl !== "string" || !f.dataUrl.startsWith("data:") || f.dataUrl.length > 1_500_000) return NextResponse.json({ error: "invalid attachment data" }, { status: 400 });
  }

  // Use workspaceId from body when provided; fall back to "main" for legacy clients
  const workspaceId = typeof msg.workspaceId === "string" && msg.workspaceId ? msg.workspaceId : "main";
  const threadId = typeof msg.threadId === "string" && msg.threadId ? msg.threadId : "team";
  if (threadId.startsWith("dm:") && !threadId.split(":").includes(authoredUserId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await connectMongo();
  await ChatMessage.create({
    workspaceId,
    threadId,
    id: msg.id,
    userId: authoredUserId,
    text: typeof msg.text === "string" ? msg.text : "",
    attachments,
    time: msg.time,
  });
  logApi(ROUTE, "success");
  // Emit to SSE subscribers so all connected clients receive the message instantly
  chatBus.emit("message", { ...msg, userId: authoredUserId, workspaceId, threadId, attachments });
  // Fire-and-forget: email mentioned users (Gmail SMTP)
  const text = (msg.text as string) || "";
  const senderId = authoredUserId;
  if (text && senderId) {
    notifyMentions(text, senderId).catch(e => console.warn("[chat-mention] notifyMentions failed:", e));
  }
  return NextResponse.json({ ok: true });
}
