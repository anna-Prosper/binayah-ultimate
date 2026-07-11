/**
 * WhatsApp weekly digest — an exec-style "shipped / on fire / blocked / decisions"
 * summary of the past 7 days, sent to a single user's WhatsApp.
 *
 * Auth: root-admin session OR the cron Bearer secret (this route sits under
 * /api/cron so it bypasses the login middleware and enforces its own auth).
 *
 * Trigger (test): GET /api/cron/digest-whatsapp?to=anna
 *   - `to` = app user id (default "anna"); resolved to a number via WHATSAPP_USER_*.
 *   - `dry=1` compiles the text and returns it WITHOUT sending (safe preview).
 */
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { getServerSession } from "next-auth/next";
import { authOptions, isRootAdminFromSession } from "@/lib/auth";
import { getWhatsAppRecipientForUser, sendWhatsAppText } from "@/lib/whatsapp";
import { pipelineData, USERS_DEFAULT } from "@/lib/data";
import { cleanHumanText } from "@/lib/notificationFormat";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ROUTE = "/api/cron/digest-whatsapp";
const DASHBOARD_URL = process.env.NEXTAUTH_URL ?? "https://dashboard.binayahhub.com";

type ActivityEntry = { type: string; user: string; target: string; detail: string; time: number };
type StateDoc = {
  activityLog?: ActivityEntry[];
  stageStatusOverrides?: Record<string, string>;
  customStages?: Record<string, string[]>;
  customPipelines?: Array<{ id: string; name?: string }>;
  execProposals?: Array<{ id: number; title: string; status: string; by: string; kind?: string }>;
  bugs?: Array<{ id: number; title: string; status?: string; severity?: string; ownerId?: string; workspaceId?: string }>;
  workspaces?: Array<{ id: string; name: string; pipelineIds?: string[] }>;
};

// Map an activity target (a stage name, a "stage::subtaskId" key, or a
// default-parent holder) to the workspace that owns its pipeline. Best-effort:
// the digest tolerates a few unattributed items.
function buildResolvers(state: StateDoc) {
  const stageToPid = new Map<string, string>();
  for (const p of pipelineData) for (const s of p.stages) stageToPid.set(s, p.id);
  for (const [pid, stages] of Object.entries(state.customStages ?? {})) for (const s of stages) stageToPid.set(s, pid);
  const pidToWs = new Map<string, string>();
  for (const w of state.workspaces ?? []) for (const pid of (w.pipelineIds ?? [])) pidToWs.set(pid, w.name);

  const targetToWorkspace = (rawTarget: string): string | null => {
    const stage = String(rawTarget || "").split("::")[0];
    if (stage.startsWith("default-parent-")) {
      for (const w of state.workspaces ?? []) for (const pid of (w.pipelineIds ?? []))
        if (stage === `default-parent-${pid}` || stage.startsWith(`default-parent-${pid}-`)) return w.name;
    }
    const pid = stageToPid.get(stage) ?? stage;
    return pidToWs.get(pid) ?? null;
  };
  return { targetToWorkspace };
}

function buildDigestText(state: StateDoc): string {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const names: Record<string, string> = Object.fromEntries(USERS_DEFAULT.map(u => [u.id, u.name]));
  const nameOf = (id: string) => names[id] ?? id;
  const log = (state.activityLog ?? []).filter(a => a.time > weekAgo);
  const overrides = state.stageStatusOverrides ?? {};
  const { targetToWorkspace } = buildResolvers(state);

  // Headline counts across the whole team, all workspaces
  const created = log.filter(a => a.type === "create").length;
  const assigned = log.filter(a => a.type === "assign").length;
  const approved = log.filter(a => /→\s*approved|\bapproved\b/i.test(a.detail)).length;
  const completed = log.filter(a => a.type === "status_change" && /→\s*(active|done)/i.test(a.detail)).length;
  const comments = log.filter(a => a.type === "comment").length;

  // Per-workspace activity (in the workspace's own order)
  const wsCount = new Map<string, number>();
  for (const a of log) { const w = targetToWorkspace(a.target); if (w) wsCount.set(w, (wsCount.get(w) ?? 0) + 1); }
  const wsRows = (state.workspaces ?? []).map(w => `• ${cleanHumanText(w.name)} — ${wsCount.get(w.name) ?? 0} updates`);

  // Team leaderboard — most active people this week
  const byUser = new Map<string, number>();
  for (const a of log) byUser.set(a.user, (byUser.get(a.user) ?? 0) + 1);
  const medals = ["🥇", "🥈", "🥉"];
  const leaderRows = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([uid, n], i) => `${medals[i] ?? "•"} ${nameOf(uid)} — ${n}`);

  // Blocked + pending decisions (team-wide)
  const blocked = Object.entries(overrides).filter(([, v]) => v === "blocked").map(([s]) => s);
  const blockedRows = blocked.slice(0, 6).map(s => `• ${cleanHumanText(s)}`);
  const pending = (state.execProposals ?? []).filter(p => p.status === "pending");
  const decisionRows = pending.slice(0, 6).map(p => `• ${cleanHumanText(p.title)} — ${nameOf(p.by)}`);
  const openBugs = (state.bugs ?? []).filter(b => !["fixed", "closed"].includes((b.status || "open").toLowerCase()));

  const weekOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const section = (title: string, rows: string[], empty: string) => `${title}\n${rows.length ? rows.join("\n") : empty}`;

  return [
    `🏴 *Binayah — Team Weekly Digest*`,
    `Week of ${weekOf} · all workspaces`,
    ``,
    `📊 *Activity this week* (${log.length})`,
    `${created} created · ${assigned} assigned · ${approved} approved`,
    `${completed} completed · ${comments} comments`,
    ``,
    section(`🏢 *By workspace*`, wsRows, `— no workspaces`),
    ``,
    section(`🔥 *Most active*`, leaderRows, `— quiet week`),
    ...(blocked.length ? [``, section(`⛔ *Blocked* (${blocked.length})`, blockedRows, ``)] : []),
    ...(pending.length ? [``, section(`🗳️ *Decisions pending* (${pending.length})`, decisionRows, ``)] : []),
    ...(openBugs.length ? [``, `🐞 *Open bugs*: ${openBugs.length}`] : []),
    ``,
    `Open dashboard:`,
    DASHBOARD_URL,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const isAdmin = isRootAdminFromSession(session);
  const cronSecret = process.env.CRON_SECRET;
  const cronOk = !!cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (!isAdmin && !cronOk) {
    logApi(ROUTE, "unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const state = await PipelineState.findOne({ workspaceId: "main" }).lean() as { state?: StateDoc } | null;
  if (!state?.state) return NextResponse.json({ ok: false, error: "no state" }, { status: 404 });

  const text = buildDigestText(state.state);

  const params = new URL(req.url).searchParams;
  const toUser = params.get("to") || "anna";
  const dry = params.get("dry") === "1";

  if (dry) return NextResponse.json({ ok: true, to: toUser, dry: true, text });

  const recipient = getWhatsAppRecipientForUser(toUser);
  if (!recipient) {
    return NextResponse.json({ ok: false, error: `no WhatsApp number mapped for "${toUser}"`, text }, { status: 400 });
  }
  const result = await sendWhatsAppText(recipient, text);
  logApi(ROUTE, "sent", { to: toUser, ok: result.ok, status: result.status });
  return NextResponse.json({ ok: result.ok, to: toUser, sent: result.ok, error: result.error, chars: text.length });
}
