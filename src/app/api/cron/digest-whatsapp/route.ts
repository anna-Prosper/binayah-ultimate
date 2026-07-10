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
  execProposals?: Array<{ id: number; title: string; status: string; by: string; kind?: string }>;
  bugs?: Array<{ id: number; title: string; status?: string; severity?: string; ownerId?: string }>;
};

function stageToPipelineIndex(customStages: Record<string, string[]>) {
  const idx = new Map<string, string>();
  for (const p of pipelineData) for (const s of p.stages) idx.set(s, p.name);
  for (const [pid, stages] of Object.entries(customStages)) {
    const name = pipelineData.find(p => p.id === pid)?.name ?? cleanHumanText(pid);
    for (const s of stages) idx.set(s, name);
  }
  return idx;
}

function buildDigestText(state: StateDoc): string {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const names: Record<string, string> = Object.fromEntries(USERS_DEFAULT.map(u => [u.id, u.name]));
  const nameOf = (id: string) => names[id] ?? id;
  const log = (state.activityLog ?? []).filter(a => a.time > weekAgo);
  const idx = stageToPipelineIndex(state.customStages ?? {});
  const overrides = state.stageStatusOverrides ?? {};
  const allStages = Array.from(new Set([
    ...pipelineData.flatMap(p => p.stages),
    ...Object.values(state.customStages ?? {}).flat(),
  ]));

  const completions = log.filter(a => a.type === "status_change" && /active/i.test(a.detail));
  const approvals = log.filter(a => /→\s*approved|\bapproved\b/i.test(a.detail));

  // Shipped, grouped by pipeline
  const byPipe = new Map<string, number>();
  for (const c of completions) {
    const p = idx.get(c.target) ?? "General delivery";
    byPipe.set(p, (byPipe.get(p) ?? 0) + 1);
  }
  const shippedRows = [...byPipe.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([p, n]) => `• ${cleanHumanText(p)} — ${n}`);

  // On fire — top movers this week (completions + approvals earned)
  const byUser = new Map<string, number>();
  for (const c of completions) byUser.set(c.user, (byUser.get(c.user) ?? 0) + 1);
  for (const a of approvals) byUser.set(a.user, (byUser.get(a.user) ?? 0) + 1);
  const fireRows = [...byUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([uid, n], i) => `${["🥇", "🥈", "🥉"][i] ?? "•"} ${nameOf(uid)} — ${n} moves`);

  // Blocked
  const blocked = allStages.filter(s => overrides[s] === "blocked");
  const blockedRows = blocked.slice(0, 6).map(s => `• ${cleanHumanText(s)} · ${cleanHumanText(idx.get(s) ?? "")}`.replace(/ · $/, ""));

  // Decisions pending
  const pending = (state.execProposals ?? []).filter(p => p.status === "pending");
  const decisionRows = pending.slice(0, 6).map(p => `• ${cleanHumanText(p.title)} — ${nameOf(p.by)}`);

  const weekOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const section = (title: string, rows: string[], empty: string) =>
    `${title}\n${rows.length ? rows.join("\n") : empty}`;

  return [
    `🏴 *Binayah Weekly Digest*`,
    `Week of ${weekOf}`,
    ``,
    section(`🚀 *Shipped* (${completions.length})`, shippedRows, `— nothing shipped this week`),
    ``,
    section(`🔥 *On fire*`, fireRows, `— quiet week`),
    ``,
    section(`⛔ *Blocked* (${blocked.length})`, blockedRows, `— nothing blocked ✅`),
    ...(pending.length ? [``, section(`🗳️ *Decisions pending* (${pending.length})`, decisionRows, ``)] : []),
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
