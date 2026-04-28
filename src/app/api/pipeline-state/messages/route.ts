import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import ChatMessage from "@/lib/ChatMessage";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateText, validateUserId } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { chatBus } from "@/lib/chatBus";
import { notifyMentions } from "@/lib/mentions";

export const dynamic = "force-dynamic";
const ROUTE = "/api/pipeline-state/messages";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const before = req.nextUrl.searchParams.get("before");   // optional msgId cursor
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

  await connectMongo();
  const query: Record<string, unknown> = { workspaceId: "main" };
  if (before) query.id = { $lt: parseInt(before, 10) };

  const messages = await ChatMessage.find(query)
    .sort({ id: -1 })   // newest first from DB
    .limit(limit)
    .lean();

  // Return oldest-first for client rendering
  return NextResponse.json(messages.reverse().map(m => ({
    id: m.id, userId: m.userId, text: m.text, time: m.time,
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
  await ChatMessage.create({
    workspaceId: "main",
    id: msg.id,
    userId: msg.userId,
    text: msg.text,
    time: msg.time,
  });
  logApi(ROUTE, "success");
  // Emit to SSE subscribers so all connected clients receive the message instantly
  chatBus.emit("message", msg);
  // Fire-and-forget: email mentioned users (Gmail SMTP)
  const text = (msg.text as string) || "";
  const senderId = (msg.userId as string) || "";
  if (text && senderId) {
    notifyMentions(text, senderId).catch(e => console.warn("[chat-mention] notifyMentions failed:", e));
  }
  return NextResponse.json({ ok: true });
}
