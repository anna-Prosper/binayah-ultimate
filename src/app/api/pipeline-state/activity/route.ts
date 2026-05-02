import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateText } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { chatBus } from "@/lib/chatBus";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Event types surfaced in the notification bell
const BELL_EVENT_TYPES = new Set(["claim", "create", "request", "comment", "status", "active"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const WORKSPACE = { workspaceId: "main" };
const ROUTE = "/api/pipeline-state/activity";

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

  const entry = (await req.json()) as Record<string, unknown>;

  // Server-authoritative attribution — ignore body.user entirely
  // Moved below session check (after connectMongo)
  if (entry.detail !== undefined) {
    const detailErr = validateText(entry.detail, "detail", 500);
    if (detailErr) {
      logApi(ROUTE, "validation_fail", { reason: detailErr });
      return NextResponse.json({ error: detailErr }, { status: 400 });
    }
  }
  if (entry.target !== undefined) {
    const targetErr = validateText(entry.target, "target", 200);
    if (targetErr) {
      logApi(ROUTE, "validation_fail", { reason: targetErr });
      return NextResponse.json({ error: targetErr }, { status: 400 });
    }
  }

  // Session-authoritative attribution — require a valid session; ignore body.user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    logApi(ROUTE, "unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authoredUser = session.user.fixedUserId ?? "unknown";
  entry.user = authoredUser;
  if (entry.by !== undefined) entry.by = authoredUser;

  await connectMongo();
  await ensureDoc();

  // $slice: 200 keeps the most recent 200 entries (prepended, so slice from front)
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    {
      $push: { "state.activityLog": { $each: [entry], $position: 0, $slice: 200 } },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );

  // Fan out to SSE subscribers for bell-relevant event types only
  const entryType = typeof entry.type === "string" ? entry.type : "";
  if (BELL_EVENT_TYPES.has(entryType)) {
    chatBus.emit("activity", entry);
  }

  logApi(ROUTE, "success");
  return NextResponse.json({ ok: true });
}
