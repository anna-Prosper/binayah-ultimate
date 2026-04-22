import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateStageKey, validateText, validateUserId } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { pipelineData } from "@/lib/data";

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

/** Resolve a stage name to its pipeline ID from static data. */
function getPipelineIdForStage(stageName: string): string | undefined {
  for (const p of pipelineData) {
    if (p.stages.includes(stageName)) return p.id;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  // Rate limit: 30 req/min per IP
  const rl = rateLimit(req, ROUTE, 30, 60_000);
  if (!rl.ok) {
    logApi(ROUTE, "rate_limited", { retryAfter: rl.retryAfter });
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many requests — slow down" },
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
  const textErr = validateText(comment.text, "text", 1000);
  if (textErr) {
    logApi(ROUTE, "validation_fail", { reason: textErr });
    return NextResponse.json({ error: textErr }, { status: 400 });
  }

  try {
    await connectMongo();
    await ensureDoc();

    // Pipeline lock enforcement — check if the target stage's pipeline is locked
    const stageName = stage as string;
    const pipelineId = getPipelineIdForStage(stageName);
    if (pipelineId) {
      const currentDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
      const lockedPipelines = (currentDoc?.state?.lockedPipelines as string[] | undefined) || [];
      if (lockedPipelines.includes(pipelineId)) {
        logApi(ROUTE, "pipeline_locked", { pipelineId, stage: stageName });
        return NextResponse.json(
          { error: "PIPELINE_LOCKED", message: "Pipeline is locked", pipelineId },
          { status: 423 }
        );
      }
    }

    // $slice: -100 keeps the most recent 100 comments per stage
    await PipelineState.findOneAndUpdate(
      WORKSPACE,
      {
        $push: { [`state.comments.${stage}`]: { $each: [comment], $slice: -100 } },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );
    logApi(ROUTE, "success", { stage });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logApi(ROUTE, "db_error", { message: (err as Error).message });
    return NextResponse.json({ error: "COMMENT_FAILED", message: "Failed to save comment — try again" }, { status: 500 });
  }
}
