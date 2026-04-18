import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateStageKey, validateText, validateUserId } from "@/lib/validate";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
const WORKSPACE = { workspaceId: "main" };
const ROUTE = "/api/pipeline-state/comments";

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

  const { stage, comment } = (await req.json()) as { stage: unknown; comment: Record<string, unknown> };

  const stageErr = validateStageKey(stage);
  if (stageErr) {
    logApi(ROUTE, "validation_fail", { reason: stageErr });
    return NextResponse.json({ error: stageErr }, { status: 400 });
  }
  if (!comment || typeof comment !== "object") {
    logApi(ROUTE, "validation_fail", { reason: "comment required" });
    return NextResponse.json({ error: "stage and comment required" }, { status: 400 });
  }

  const byErr = validateUserId(comment.by, "by");
  if (byErr) {
    logApi(ROUTE, "validation_fail", { reason: byErr });
    return NextResponse.json({ error: byErr }, { status: 400 });
  }
  const textErr = validateText(comment.text, "text", 2000);
  if (textErr) {
    logApi(ROUTE, "validation_fail", { reason: textErr });
    return NextResponse.json({ error: textErr }, { status: 400 });
  }

  await connectMongo();
  await ensureDoc();
  // $slice: -50 keeps the most recent 50 comments per stage
  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    {
      $push: { [`state.comments.${stage}`]: { $each: [comment], $slice: -50 } },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );
  logApi(ROUTE, "success", { stage });
  return NextResponse.json({ ok: true });
}
