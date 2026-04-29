import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { rateLimit } from "@/lib/rateLimit";
import { checkContentLength, validateStageKey, validateText } from "@/lib/validate";
import { logApi } from "@/lib/log";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { notifyMentions, parseMentions } from "@/lib/mentions";
import { sendNotifications } from "@/lib/sendNotifications";
import { pipelineData, stageDefaults } from "@/lib/data";

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

  // comment.by will be overwritten by session user below — skip body validation of by
  const textErr = validateText(comment.text, "text", 1000);
  if (textErr) {
    logApi(ROUTE, "validation_fail", { reason: textErr });
    return NextResponse.json({ error: textErr }, { status: 400 });
  }

  try {
    // Session-authoritative attribution — overwrite comment.by with session user; ignore body value
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logApi(ROUTE, "unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authoredUser = session.user.fixedUserId ?? "unknown";
    comment.by = authoredUser;

    await connectMongo();
    await ensureDoc();

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
    // Fire-and-forget mention notifications (legacy path — immediate email)
    const commentText = (comment.text as string) || "";
    if (commentText && authoredUser) {
      void notifyMentions(commentText, authoredUser, "comment", stage as string).catch(e =>
        console.warn("[comment-mention] notifyMentions failed:", e)
      );
    }

    // Watcher notifications: queue a digest entry for the stage's claimers/assignees,
    // and fan out to operators/root per the recipient resolver. Mentioned users
    // are upgraded to immediate by getRecipients.
    try {
      const stateDoc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
      const postState = stateDoc?.state ?? {};
      const stageKey = stage as string;
      const postClaims = (postState.claims as Record<string, string[]> | undefined)?.[stageKey] ?? [];
      const postAssign = (postState.assignments as Record<string, string[]> | undefined)?.[stageKey] ?? [];
      const postWorkspaces = (postState.workspaces as Array<{
        id: string; name: string; captains: string[]; members: string[]; pipelineIds: string[];
      }> | undefined) ?? [];
      // Resolve workspace for this stage
      const stageToP = new Map<string, string>();
      for (const p of pipelineData) for (const s of p.stages) stageToP.set(s, p.id);
      const customStages = (postState.customStages as Record<string, string[]> | undefined) ?? {};
      for (const [pid, stages] of Object.entries(customStages)) for (const s of stages) stageToP.set(s, pid);
      const pipelineId = stageToP.get(stageKey);
      const pipeline = pipelineData.find(p => p.id === pipelineId);
      const ws = postWorkspaces.find(w => pipelineId && w.pipelineIds.includes(pipelineId));
      const mentioned = parseMentions(commentText);
      void sendNotifications({
        eventType: mentioned.length > 0 ? "mentioned" : "commented",
        stageKey,
        pipelineName: pipeline?.name ?? pipelineId ?? stageKey,
        workspaceId: ws?.id ?? "",
        workspaceName: ws?.name ?? "",
        workspaces: postWorkspaces,
        actorId: authoredUser,
        claimers: postClaims,
        assignees: postAssign,
        mentioned,
        points: stageDefaults[stageKey]?.points ?? 0,
        detail: `${authoredUser} commented on ${stageKey}: "${commentText.slice(0, 80)}"`,
      });
    } catch (e) {
      console.warn("[comment-watch] sendNotifications failed:", e);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logApi(ROUTE, "db_error", { message: (err as Error).message });
    return NextResponse.json({ error: "COMMENT_FAILED", message: "Failed to save comment — try again" }, { status: 500 });
  }
}
