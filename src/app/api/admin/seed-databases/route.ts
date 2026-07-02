/**
 * ONE-TIME MIGRATION: seeds all databases into MongoDB so client-side seeding
 * can be removed entirely. Safe to call multiple times (idempotent — never
 * overwrites an existing database by name).
 *
 * GET  → returns current DB names in MongoDB
 * POST → seeds any missing databases, returns what was added
 *
 * DELETE THIS ROUTE after running POST once successfully.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { NOTION_DB_SEEDS } from "@/lib/notionDbSeeds";
import { getServerSession } from "next-auth/next";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";

const MIGRATION_KEY = process.env.CRON_SECRET ?? process.env.ADMIN_SECRET ?? "";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WORKSPACE = { workspaceId: "main" };
const DEFAULT_WORKSPACE_ID = "war-room";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Which seed names are forced to which workspace
const WORKSPACE_FORCE: Record<string, string> = {
  backlinksupdate: "property",    // resolved from state.workspaces at runtime
  expenses: DEFAULT_WORKSPACE_ID,
  campaigns: "marketing",
  contentcalendar: "marketing",
  leads: "marketing",
  monthlymetrics: "marketing",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAuthorized(req: NextRequest, session: any) {
  const key = req.headers.get("x-admin-secret") ?? "";
  return isRootAdminFromSession(session) || (MIGRATION_KEY && key === MIGRATION_KEY);
}

async function getState() {
  await connectMongo();
  const doc = await PipelineState.findOne(WORKSPACE).lean() as { state?: Record<string, unknown> } | null;
  return (doc?.state ?? {}) as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(req, session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = await getState();
  const dbs = (state.databases as { id: number; name: string; workspaceId?: string; rows?: unknown[] }[] | undefined) ?? [];
  return NextResponse.json({
    count: dbs.length,
    databases: dbs.map(d => ({ id: d.id, name: d.name, workspaceId: d.workspaceId, rows: (d.rows ?? []).length })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(req, session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await getState();
  const existing = (state.databases as { id: number; name: string; workspaceId?: string }[] | undefined) ?? [];
  const existingNames = new Set(existing.map(d => normalize(d.name)));

  // Resolve property workspace ID from state
  const workspaces = (state.workspaces as { id: string; name: string }[] | undefined) ?? [];
  const propertyWs = workspaces.find(w => normalize(w.name) === "binayahproperties");
  const propertyWsId = propertyWs?.id ?? DEFAULT_WORKSPACE_ID;

  const added: string[] = [];
  const toAdd: unknown[] = [];
  const now = Date.now();

  // Seed from NOTION_DB_SEEDS
  for (const seed of NOTION_DB_SEEDS) {
    const seedName = normalize(seed.name);
    if (existingNames.has(seedName)) continue; // already exists — skip

    const forceWs = WORKSPACE_FORCE[seedName];
    const workspaceId = forceWs === "property"
      ? propertyWsId
      : forceWs
      ? forceWs
      : propertyWsId; // default to property

    const dateCol = seed.columns.find(c => c.type === "date");
    const statusCol = seed.columns.find(c => c.type === "status");
    const views = [
      { id: "view_all", name: "All rows" },
      ...(dateCol ? [{ id: "view_date", name: "By Date", filterCol: dateCol.id, filterVal: "" }] : []),
      ...(statusCol ? [{ id: "view_status", name: "By Status", filterCol: statusCol.id, filterVal: "" }] : []),
    ];
    const rows = seed.rows.map((r, i) => ({
      id: seed.idBase + i + 1,
      createdAt: now,
      createdBy: "anna",
      values: r,
    }));

    toAdd.push({
      id: seed.idBase,
      workspaceId,
      name: seed.name,
      icon: seed.icon,
      columns: seed.columns,
      rows,
      views,
      createdAt: now,
      createdBy: "anna",
    });
    existingNames.add(seedName);
    added.push(`${seed.name} → ${workspaceId}`);
  }

  // AI Backlinks (empty DB in war-room — separate from the Binayah Properties Backlinks)
  const hasWarRoomBacklinks = existing.some(d => normalize(d.name) === "backlinks" && d.workspaceId === DEFAULT_WORKSPACE_ID);
  if (!hasWarRoomBacklinks) {
    toAdd.push({
      id: 1760400000000,
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: "Backlinks",
      icon: "🔗",
      columns: [
        { id: "backlink",          name: "Backlink",          type: "url",    width: 320 },
        { id: "property",          name: "Property",          type: "url",    width: 280 },
        { id: "anchor_text",       name: "Anchor Text",       type: "text",   width: 220 },
        { id: "date_added",        name: "Date Added",        type: "date",   width: 140 },
        { id: "domain_authority",  name: "Domain Authority",  type: "number", width: 130 },
        { id: "status",            name: "Status",            type: "status", width: 120, options: ["Active", "Pending"] },
      ],
      rows: [],
      views: [
        { id: "view_all",    name: "All rows" },
        { id: "view_date",   name: "By Date",   filterCol: "date_added", filterVal: "" },
        { id: "view_status", name: "By Status", filterCol: "status",     filterVal: "" },
      ],
      createdAt: now,
      createdBy: "anna",
    });
    added.push("Backlinks (empty) → war-room");
  }

  // Ensure marketing workspace exists
  const hasMarketingWs = workspaces.some(w => w.id === "marketing");
  let wsUpdate = {};
  if (!hasMarketingWs) {
    const { ADMIN_IDS } = await import("@/lib/data");
    const newWs = {
      id: "marketing",
      name: "Marketing Hub",
      icon: "📣",
      colorKey: "green",
      members: [...ADMIN_IDS],
      captains: [...ADMIN_IDS],
      pipelineIds: [],
    };
    const updatedWorkspaces = [...workspaces, newWs];
    wsUpdate = { "state.workspaces": updatedWorkspaces };
    added.push("Marketing Hub workspace created");
  }

  if (toAdd.length === 0 && Object.keys(wsUpdate).length === 0) {
    return NextResponse.json({ message: "Nothing to add — all databases already exist in MongoDB.", added: [] });
  }

  // Merge into existing databases and save
  await connectMongo();
  if (toAdd.length > 0) {
    const allDbs = [...existing, ...toAdd];
    await PipelineState.updateOne(WORKSPACE, { $set: { "state.databases": allDbs, updatedAt: new Date(), ...wsUpdate } });
  } else if (Object.keys(wsUpdate).length > 0) {
    await PipelineState.updateOne(WORKSPACE, { $set: { updatedAt: new Date(), ...wsUpdate } });
  }

  return NextResponse.json({ message: "Migration complete.", added });
}
