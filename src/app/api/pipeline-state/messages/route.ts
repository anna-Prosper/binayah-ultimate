import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateText, validateUserId } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { chatBus } from "@/lib/chatBus";

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
  return NextResponse.json({ ok: true, total });
}
