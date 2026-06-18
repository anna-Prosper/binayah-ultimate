import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import DigestEntry from "@/lib/DigestEntry";
import NotifyLog from "@/lib/NotifyLog";
import AuthUser from "@/lib/AuthUser";
import { AppBackupRun } from "@/lib/AppBackup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isRootAdminFromSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const [state, digestPending, recentNotify, authUsers, lastAppBackup] = await Promise.all([
    PipelineState.findOne({ workspaceId: "main" }).select("updatedAt state.reminders").lean() as Promise<{ updatedAt?: Date; state?: { reminders?: unknown[] } } | null>,
    DigestEntry.countDocuments({}),
    NotifyLog.find({}).sort({ sentAt: -1 }).limit(8).lean() as Promise<Array<{ key: string; sentAt: Date }>>,
    AuthUser.countDocuments({}),
    AppBackupRun.findOne({}).sort({ snapshotAt: -1 }).lean() as Promise<{ backupId: string; snapshotAt?: Date; collections?: Array<{ collectionName: string; count: number }> } | null>,
  ]);

  return NextResponse.json({
    ok: true,
    db: {
      pipelineStateUpdatedAt: state?.updatedAt || null,
      authUsers,
      reminders: state?.state?.reminders?.length || 0,
    },
    notifications: {
      digestPending,
      recentRateLimitedKeys: recentNotify.map(n => ({ key: n.key, sentAt: n.sentAt })),
    },
    backups: {
      lastAppBackupAt: lastAppBackup?.snapshotAt || null,
      lastAppBackupId: lastAppBackup?.backupId || null,
      collections: lastAppBackup?.collections || [],
      offsiteConfigured: Boolean(process.env.BACKUP_S3_BUCKET || process.env.DR_S3_BUCKET),
      offsiteBucket: process.env.BACKUP_S3_BUCKET || process.env.DR_S3_BUCKET || null,
      offsitePrefix: process.env.BACKUP_S3_PREFIX || "disaster-recovery",
    },
  });
}
