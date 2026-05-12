import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/admin/wire-team-members";
const WORKSPACE = { workspaceId: "main" };

// One-shot helper to wire the WP/SEO/content team into the digital-marketing
// workspace. Idempotent: re-running it leaves state unchanged if the users are
// already members. Also strips them from war-room (Binayah AI) if they slipped
// in there via the seed-heal pass.
const TEAM_USER_IDS = ["shyam", "zahaib", "deepshikha", "nida"];
const WAR_ROOM_ID = "war-room"; // "Binayah AI" — explicitly NOT where these users go

// Match digital-marketing workspace by id OR name (covers "Digital Marketing",
// "Digital Media", or whatever variant exists). Case-insensitive substring on name.
function isDigitalMarketingWorkspace(w: { id?: string; name?: string }): boolean {
  if (w.id === "digital-marketing" || w.id === "digital-media") return true;
  const name = (w.name || "").toLowerCase();
  return name.includes("digital") && (name.includes("market") || name.includes("media"));
}

type Workspace = {
  id: string;
  name?: string;
  icon?: string;
  captains?: string[];
  firstMates?: string[];
  members?: string[];
  pipelineIds?: string[];
};

export async function GET(req: NextRequest) {
  return run(req, /*apply=*/ false);
}
export async function POST(req: NextRequest) {
  return run(req, /*apply=*/ true);
}

async function run(req: NextRequest, apply: boolean): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");
  const isCron = !!cronSecret && headerSecret === cronSecret;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isRootAdminFromSession(session)) return NextResponse.json({ error: "FORBIDDEN: root admin only" }, { status: 403 });
  }

  await connectMongo();
  const doc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
  const state: Record<string, unknown> = (doc?.state as Record<string, unknown>) ?? {};
  const workspaces = Array.isArray(state.workspaces) ? (state.workspaces as Workspace[]) : [];

  const digitalWs = workspaces.find(isDigitalMarketingWorkspace);
  const allWorkspaceNames = workspaces.map(w => ({ id: w.id, name: w.name }));

  if (!digitalWs) {
    return NextResponse.json({
      ok: false,
      error: "No digital-marketing workspace found",
      availableWorkspaces: allWorkspaceNames,
      hint: "Create a workspace whose name contains 'Digital' and 'Marketing'/'Media', then re-run.",
    }, { status: 404 });
  }

  // Plan the changes.
  const currentMembers = new Set(digitalWs.members || []);
  const missing = TEAM_USER_IDS.filter(uid => !currentMembers.has(uid));

  const warRoom = workspaces.find(w => w.id === WAR_ROOM_ID);
  const presentInWarRoom = warRoom
    ? TEAM_USER_IDS.filter(uid => (warRoom.members || []).includes(uid))
    : [];

  const plan = {
    targetWorkspace: { id: digitalWs.id, name: digitalWs.name },
    addToDigital: missing,
    removeFromWarRoom: presentInWarRoom,
  };

  if (missing.length === 0 && presentInWarRoom.length === 0) {
    return NextResponse.json({ ok: true, applied: false, message: "Already in correct state", plan });
  }

  if (!apply) {
    return NextResponse.json({ ok: true, applied: false, dryRun: true, plan });
  }

  // Apply: add to digital-marketing, remove from war-room.
  const newWorkspaces = workspaces.map(w => {
    if (w.id === digitalWs.id) {
      return {
        ...w,
        members: Array.from(new Set([...(w.members || []), ...TEAM_USER_IDS])),
      };
    }
    if (w.id === WAR_ROOM_ID) {
      const removeSet = new Set(TEAM_USER_IDS);
      return {
        ...w,
        members: (w.members || []).filter(uid => !removeSet.has(uid)),
        captains: (w.captains || []).filter(uid => !removeSet.has(uid)),
        firstMates: (w.firstMates || []).filter(uid => !removeSet.has(uid)),
      };
    }
    return w;
  });

  await PipelineState.findOneAndUpdate(
    WORKSPACE,
    { $set: { "state.workspaces": newWorkspaces, updatedAt: new Date() } }
  );

  logApi(ROUTE, "wired", plan);
  return NextResponse.json({ ok: true, applied: true, plan });
}
