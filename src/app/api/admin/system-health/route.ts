import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import DigestEntry from "@/lib/DigestEntry";
import NotifyLog from "@/lib/NotifyLog";
import AuthUser from "@/lib/AuthUser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isRootAdminFromSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const [state, digestPending, recentNotify, authUsers] = await Promise.all([
    PipelineState.findOne({ workspaceId: "main" }).select("updatedAt state.reminders").lean() as Promise<{ updatedAt?: Date; state?: { reminders?: unknown[] } } | null>,
    DigestEntry.countDocuments({}),
    NotifyLog.find({}).sort({ sentAt: -1 }).limit(8).lean() as Promise<Array<{ key: string; sentAt: Date }>>,
    AuthUser.countDocuments({}),
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
  });
}
