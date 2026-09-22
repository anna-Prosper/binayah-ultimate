import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateCommentStageKey } from "@/lib/validate";
import { buildToggleReactionPipeline } from "@/lib/commentWrite";
import { logApi } from "@/lib/log";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { REACTIONS } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const WORKSPACE = { workspaceId: "main" };
const ROUTE = "/api/pipeline-state/comment-reactions";

export async function POST(req: NextRequest) {
  logApi(ROUTE, "request");

  // Rate limit: 60 req/min per IP
  const rl = rateLimit(req, ROUTE, 60, 60_000);
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

  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    logApi(ROUTE, "unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.fixedUserId;

  const body = (await req.json()) as { stageId?: unknown; commentId?: unknown; emoji?: unknown };

  // Validate stageId
  const stageErr = validateCommentStageKey(body.stageId);
  if (stageErr) {
    logApi(ROUTE, "validation_fail", { reason: stageErr });
    return NextResponse.json({ error: stageErr }, { status: 400 });
  }
  const stageId = body.stageId as string;

  // Validate commentId
  if (typeof body.commentId !== "number" || !Number.isFinite(body.commentId) || body.commentId <= 0) {
    logApi(ROUTE, "validation_fail", { reason: "commentId must be a positive number" });
    return NextResponse.json({ error: "commentId must be a positive number" }, { status: 400 });
  }
  const commentId = body.commentId as number;

  // Validate emoji is in REACTIONS
  if (typeof body.emoji !== "string" || !REACTIONS.includes(body.emoji)) {
    logApi(ROUTE, "validation_fail", { reason: "emoji must be one of the allowed reactions" });
    return NextResponse.json({ error: "emoji must be one of the allowed reactions" }, { status: 400 });
  }
  const emoji = body.emoji as string;

  // Composite key: stageId::commentId
  const reactionKey = `${stageId}::${commentId}`;

  await connectMongo();

  // Single-op atomic toggle via aggregation-pipeline update, addressing the reaction key by
  // NAME ($setField/$getField) rather than a dotted path — so a dotted stage name works.
  // One round-trip, one mutation — no read/write race. The pre-read is only to report which
  // action happened (JS object access, safe for dotted keys).
  const pre = await PipelineState.findOne(WORKSPACE).lean() as
    | { state?: { commentReactions?: Record<string, Record<string, string[]>> } }
    | null;
  const preArray: string[] = pre?.state?.commentReactions?.[reactionKey]?.[emoji] ?? [];
  const wasPresent = preArray.includes(userId);

  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    buildToggleReactionPipeline(reactionKey, emoji, userId),
    { updatePipeline: true }
  );

  logApi(ROUTE, "success", { stageId, commentId, emoji, action: wasPresent ? "removed" : "added" });
  return NextResponse.json({ ok: true, action: wasPresent ? "removed" : "added" });
}
