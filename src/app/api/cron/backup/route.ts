import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import PipelineStateBackup from "@/lib/PipelineStateBackup";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/backup";
const WORKSPACE = { workspaceId: "main" };
const RETAIN_DAYS = 14;

/**
 * Daily snapshot of pipeline_state.state into pipeline_state_backups.
 * Triggered by Vercel cron once a day. Also prunes snapshots older than
 * RETAIN_DAYS so the backup collection doesn't grow unbounded.
 *
 * Recovery: query PipelineStateBackup.find({}).sort({ snapshotAt: -1 }) and
 * pick a recent doc, then write its `state` back to the live PipelineState.
 */
export async function GET(req: NextRequest) {
  logApi(ROUTE, "GET");

  // Vercel sets a `vercel-cron` header for scheduled invocations. We accept
  // either that or a manually-triggered call from an authenticated context;
  // anonymous direct hits get rejected.
  const isVercelCron = req.headers.get("x-vercel-cron") !== null
    || req.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");
  const adminSecret = req.headers.get("x-admin-secret");
  if (!isVercelCron && adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await connectMongo();
  const live = await PipelineState.findOne(WORKSPACE).lean() as
    | { state?: Record<string, unknown>; updatedAt?: Date }
    | null;
  if (!live) {
    return NextResponse.json({ ok: true, snapshotted: false, reason: "no live doc" });
  }

  const snap = await PipelineStateBackup.create({
    workspaceId: WORKSPACE.workspaceId,
    state: live.state ?? {},
    sourceUpdatedAt: live.updatedAt,
    snapshotAt: new Date(),
  });

  // Prune old snapshots.
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000);
  const pruned = await PipelineStateBackup.deleteMany({ snapshotAt: { $lt: cutoff } });

  logApi(ROUTE, "snapshotted", {
    snapId: String(snap._id),
    sourceUpdatedAt: live.updatedAt?.toISOString(),
    prunedCount: pruned.deletedCount,
  });
  return NextResponse.json({
    ok: true,
    snapshotId: String(snap._id),
    sourceUpdatedAt: live.updatedAt?.toISOString(),
    prunedCount: pruned.deletedCount,
  });
}
