import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createDisasterRecoveryBackup } from "@/lib/disasterRecovery";
import { logApi } from "@/lib/log";

/** Constant-time string compare. Returns false on null/length mismatch. */
function safeStrEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/backup";

/**
 * Daily backup for disaster recovery.
 * - PipelineStateBackup keeps a quick-restore copy of pipeline_state.state.
 * - AppBackupRun/AppBackupItem keeps document-level copies of the other
 *   durable Mongo collections without hitting Mongo's 16 MB document limit.
 * - A compressed disaster-recovery artifact is written to BACKUP_S3_BUCKET /
 *   DR_S3_BUCKET when configured, and S3 document attachments are copied there.
 * Triggered by Vercel cron once a day. Also prunes snapshots older than
 * BACKUP_RETAIN_DAYS so in-Mongo backup collections don't grow unbounded.
 *
 * Recovery is intentionally manual: use the stored artifact only when requested.
 */
export async function GET(req: NextRequest) {
  logApi(ROUTE, "GET");

  // Vercel sets a `vercel-cron` header for scheduled invocations. We accept
  // either that or a manually-triggered call from an authenticated context;
  // anonymous direct hits get rejected.
  const isVercelCron = req.headers.get("x-vercel-cron") !== null
    || req.headers.get("user-agent")?.toLowerCase().includes("vercel-cron");
  const adminSecret = req.headers.get("x-admin-secret");
  if (!isVercelCron && !safeStrEqual(adminSecret, process.env.ADMIN_SECRET)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await createDisasterRecoveryBackup();

  logApi(ROUTE, "snapshotted", result);
  return NextResponse.json(result);
}
