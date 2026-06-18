/**
 * Weekly digest cron — every Monday 07:00 UTC (11am Dubai).
 * Sends each team member a summary of the past week:
 * - Stages they completed / moved to active
 * - Their open / blocked items
 * - Team wins (any stages marked active in the last 7 days)
 *
 * Scheduled in vercel.json: "0 7 * * 1"
 */
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import { sendStageEmail } from "@/lib/email";
import { getEmailsForUser, USER_PRIMARY_EMAIL } from "@/lib/auth";
import { EXEC_IDS, pipelineData, USERS_DEFAULT } from "@/lib/data";
import { logApi } from "@/lib/log";
import { cleanHumanText, compactSubject, humanList } from "@/lib/notificationFormat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ROUTE = "/api/cron/weekly-digest";

type ActivityEntry = {
  type: string;
  user: string;
  target: string;
  detail: string;
  time: number;
};

type StateDoc = {
  activityLog?: ActivityEntry[];
  approvedStages?: string[];
  approvedSubtasks?: string[];
  claims?: Record<string, string[]>;
  owners?: Record<string, string[]>;
  assignments?: Record<string, string[]>;
  stageStatusOverrides?: Record<string, string>;
  customStages?: Record<string, string[]>;
  bugs?: Array<{ id: number; title: string; status?: string; severity?: string; ownerId?: string; workspaceId?: string }>;
  execProposals?: Array<{ id: number; title: string; status: string; by: string; createdAt: number; kind?: string }>;
  timelineEvents?: Array<{ id: number; title: string; group: string; status: string; tier?: string; date?: string; responsibleId?: string; notes?: string }>;
};

function buildPipelineIndex() {
  const stageToPipeline = new Map<string, string>();
  for (const p of pipelineData) {
    for (const s of p.stages) stageToPipeline.set(s, p.name);
  }
  return stageToPipeline;
}

function htmlEscape(s: string) {
  return cleanHumanText(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmail(
  userName: string,
  userId: string,
  wins: string[],
  myCompleted: string[],
  myOpen: string[],
  myBlocked: string[],
  teamWins: { user: string; stage: string; pipeline: string }[],
  dashboardUrl: string
): string {
  const greeting = `Hi ${userName.split(" ")[0]},`;
  const weekOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const section = (title: string, color: string, items: string[]) =>
    items.length === 0 ? "" : `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:800;color:${color};letter-spacing:0.6px;text-transform:uppercase;margin-bottom:8px;font-family:monospace">${htmlEscape(title)}</div>
      ${items.map(i => `<div style="padding:7px 12px;background:#f8f8f8;border-left:3px solid ${color};border-radius:4px;margin-bottom:5px;font-size:13px;color:#1a1a1a">${htmlEscape(i)}</div>`).join("")}
    </div>`;

  const teamSection = teamWins.length === 0 ? "" : `
    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:800;color:#00a878;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:8px;font-family:monospace">team wins this week</div>
      ${teamWins.map(w => `<div style="padding:7px 12px;background:#f0fff8;border-left:3px solid #00a878;border-radius:4px;margin-bottom:5px;font-size:13px;color:#1a1a1a"><b>${htmlEscape(w.user)}</b> completed <b>${htmlEscape(w.stage)}</b> <span style="color:#888;font-size:11px">· ${htmlEscape(w.pipeline)}</span></div>`).join("")}
    </div>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:#0d0a18;padding:24px 28px">
      <div style="font-size:10px;color:#bf5af2;font-family:monospace;font-weight:800;letter-spacing:1px;text-transform:uppercase">binayah ai · weekly digest</div>
      <div style="font-size:22px;font-weight:800;color:#f0ecff;margin-top:6px">Week of ${weekOf}</div>
    </div>
    <div style="padding:24px 28px">
      <p style="color:#444;font-size:14px;margin:0 0 20px">${greeting} Here's your weekly summary from the Binayah dashboard.</p>
      ${section("your completions this week", "#00a878", myCompleted)}
      ${section("your open work", "#6e6e80", myOpen)}
      ${section("your blocked items", "#ff453a", myBlocked)}
      ${teamSection}
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;text-align:center">
        <a href="${dashboardUrl}" style="display:inline-block;background:#bf5af2;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:700">Open Dashboard →</a>
      </div>
    </div>
    <div style="padding:16px 28px;background:#f9f9f9;font-size:11px;color:#999;text-align:center">
      Binayah Properties · AI Initiative Dashboard · auto-sent every Monday
    </div>
  </div>
</body></html>`;
}

function buildExecEmail(
  execName: string,
  metrics: {
    completedThisWeek: number;
    activeNow: number;
    atRisk: number;
    decisions: number;
    nextSevenDays: number;
  },
  momentum: string[],
  attention: string[],
  decisions: string[],
  upcoming: Array<{ title: string; date: string; group: string; owner: string; tier: string }>,
  hiddenOperationalCount: number,
  dashboardUrl: string,
): string {
  const weekOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const firstName = execName.split(" ")[0];
  const metricCard = (label: string, value: number | string, color: string) => `
    <td style="width:20%;padding:6px;">
      <div style="border:1px solid ${color}44;background:${color}10;border-radius:14px;padding:14px 12px;min-height:70px;">
        <div style="font-size:10px;color:${color};font-family:monospace;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">${htmlEscape(label)}</div>
        <div style="font-size:26px;line-height:1.1;color:#211236;font-weight:900;margin-top:6px;">${htmlEscape(String(value))}</div>
      </div>
    </td>`;
  const section = (title: string, color: string, rows: string[], empty: string) => `
    <div style="margin-top:22px;">
      <div style="font-size:12px;color:${color};font-family:monospace;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px;">${htmlEscape(title)}</div>
      ${rows.length ? rows.map(row => `
        <div style="border:1px solid #eadff4;background:#ffffff;border-left:4px solid ${color};border-radius:12px;padding:12px 14px;margin-bottom:8px;">
          <div style="font-size:14px;line-height:1.45;color:#211236;font-weight:700;">${htmlEscape(row)}</div>
        </div>`).join("") : `
        <div style="border:1px dashed #d8c6e8;border-radius:12px;padding:14px;color:#7b6791;font-size:14px;">${htmlEscape(empty)}</div>`}
    </div>`;
  const upcomingRows = upcoming.map(e => humanList([
    e.date,
    e.title,
    e.owner ? `owner ${e.owner}` : "",
    e.group,
    e.tier === "secondary" ? "secondary" : "",
  ]));

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f1fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f1fb;">
    <tr><td align="center" style="padding:34px 14px;">
      <table width="720" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;width:100%;">
        <tr><td style="padding:0 4px 14px;">
          <div style="font-size:12px;color:#c00072;font-family:monospace;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">Binayah Command Center</div>
        </td></tr>
        <tr><td style="background:#211236;border-radius:22px 22px 0 0;padding:30px 32px;">
          <div style="font-size:13px;color:#f3b1d9;font-family:monospace;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Executive weekly brief</div>
          <div style="font-size:30px;line-height:1.15;color:#ffffff;font-weight:900;margin-top:8px;">Week of ${htmlEscape(weekOf)}</div>
          <div style="font-size:15px;line-height:1.55;color:#d9caeb;margin-top:10px;">Hi ${htmlEscape(firstName)}, here is the clean high-level view: delivery momentum, executive attention, and upcoming core milestones.</div>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #eadff4;border-top:0;border-radius:0 0 22px 22px;padding:24px 26px;box-shadow:0 20px 50px rgba(50,30,70,.08);">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -6px 10px;">
            <tr>
              ${metricCard("shipped", metrics.completedThisWeek, "#17803d")}
              ${metricCard("live now", metrics.activeNow, "#2563eb")}
              ${metricCard("at risk", metrics.atRisk, "#b45309")}
              ${metricCard("decisions", metrics.decisions, "#c00072")}
              ${metricCard("next 7d", metrics.nextSevenDays, "#8a6d00")}
            </tr>
          </table>
          ${section("delivery momentum", "#17803d", momentum.slice(0, 6), "No delivery movement was recorded this week.")}
          ${section("executive attention", "#b45309", attention.slice(0, 6), "No strategic blockers or high-severity risks need executive attention.")}
          ${decisions.length ? section("decisions / approvals", "#8a6d00", decisions.slice(0, 5), "No executive decisions are pending.") : ""}
          ${section("upcoming milestones", "#c00072", upcomingRows.slice(0, 8), "No upcoming roadmap milestones are scheduled.")}
          ${hiddenOperationalCount > 0 ? `<div style="margin-top:16px;border:1px dashed #d8c6e8;border-radius:12px;padding:12px 14px;color:#7b6791;font-size:13px;line-height:1.45;">${hiddenOperationalCount} routine item${hiddenOperationalCount === 1 ? "" : "s"} are tracked in the dashboard but hidden from this executive brief, including minor bugs, subtask renames, and operational approvals.</div>` : ""}
          <div style="text-align:center;margin-top:26px;padding-top:22px;border-top:1px solid #eadff4;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#c00072;color:#fff;text-decoration:none;border-radius:12px;padding:13px 24px;font-size:14px;font-weight:900;">Open dashboard</a>
          </div>
          <div style="margin-top:18px;text-align:center;color:#9a8aaa;font-size:12px;">High-level executive summary · sent weekly</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      logApi(ROUTE, "unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  logApi(ROUTE, "start");
  await connectMongo();

  const state = await PipelineState.findOne({ key: "main" }).lean() as StateDoc | null;
  if (!state) {
    logApi(ROUTE, "no_state");
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activityLog: ActivityEntry[] = (state.activityLog ?? []).filter(a => a.time > weekAgo);
  const stageToPipeline = buildPipelineIndex();
  for (const [pipelineId, stages] of Object.entries(state.customStages ?? {})) {
    const staticPipeline = pipelineData.find(p => p.id === pipelineId);
    const pipelineName = staticPipeline?.name ?? pipelineId;
    for (const stage of stages) stageToPipeline.set(stage, pipelineName);
  }

  // All owners/claims per stage
  const itemOwners = (key: string) => Array.from(new Set([
    ...(state.claims?.[key] ?? []),
    ...(state.owners?.[key] ?? []),
    ...(state.assignments?.[key] ?? []),
  ]));

  const statusOverrides = state.stageStatusOverrides ?? {};
  const allStages = Array.from(new Set([
    ...pipelineData.flatMap(p => p.stages),
    ...Object.values(state.customStages ?? {}).flat(),
  ]));

  // All team completions this week (status_change → active)
  const completions = activityLog.filter(a =>
    a.type === "status_change" && /active|→ active/i.test(a.detail)
  );

  const dashboardUrl = process.env.NEXTAUTH_URL ?? "https://dashboard.binayahhub.com";
  const results: { userId: string; sent: boolean }[] = [];

  // User name map (id → display name)
  const userNames: Record<string, string> = Object.fromEntries(USERS_DEFAULT.map(u => [u.id, u.name]));
  const activeStages = allStages.filter(s => (statusOverrides[s] ?? "planned") === "active");
  const blockedStages = allStages.filter(s => statusOverrides[s] === "blocked");
  const openBugs = (state.bugs ?? []).filter(b => !["fixed", "closed"].includes((b.status || "open").toLowerCase()));
  const pendingRequests = (state.execProposals ?? []).filter(p => p.status === "pending");
  const strategicBugSeverities = new Set(["high", "critical", "blocker"]);
  const strategicRequestKinds = new Set(["strategy", "timeline", "launch", "roadmap", "budget"]);
  const strategicBugs = openBugs.filter(b => strategicBugSeverities.has((b.severity || "").toLowerCase()));
  const strategicRequests = pendingRequests.filter(p =>
    strategicRequestKinds.has((p.kind || "").toLowerCase()) || EXEC_IDS.includes(p.by)
  );
  const coreUpcomingTimeline = (state.timelineEvents ?? [])
    .filter(e => e.status !== "done" && (e.tier || "core") === "core")
    .sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"))
    .slice(0, 8);
  const nextSevenDays = coreUpcomingTimeline.filter(e => {
    if (!e.date) return false;
    const date = new Date(`${e.date}T12:00:00`).getTime();
    const now = Date.now();
    return date >= now - 24 * 60 * 60 * 1000 && date <= now + 7 * 24 * 60 * 60 * 1000;
  }).length;

  const completionByPipeline = new Map<string, number>();
  for (const item of completions) {
    const pipeline = stageToPipeline.get(item.target) || "General delivery";
    completionByPipeline.set(pipeline, (completionByPipeline.get(pipeline) || 0) + 1);
  }
  const momentumRows = Array.from(completionByPipeline.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pipeline, count]) => `${cleanHumanText(pipeline)}: ${count} completed item${count === 1 ? "" : "s"} this week`);
  if (completions.length > 0 && momentumRows.length === 0) {
    momentumRows.push(`${completions.length} completed item${completions.length === 1 ? "" : "s"} this week`);
  }
  const attentionRows = [
    ...blockedStages.map(s => humanList(["Blocked delivery item", s, stageToPipeline.get(s)])),
    ...strategicBugs.map(b => humanList(["High-severity issue", b.title, b.ownerId ? `owner ${userNames[b.ownerId] ?? b.ownerId}` : ""])),
  ];
  const decisionRows = strategicRequests.map(p =>
    humanList([p.title, p.kind, p.by ? `requested by ${userNames[p.by] ?? p.by}` : ""])
  );
  const hiddenOperationalCount = Math.max(0, openBugs.length - strategicBugs.length) + Math.max(0, pendingRequests.length - strategicRequests.length);

  for (const userId of Object.keys(USER_PRIMARY_EMAIL)) {
    try {
      const userName = userNames[userId] ?? userId;
      const isExecutive = EXEC_IDS.includes(userId);

      // My completions this week
      const myCompleted = completions
        .filter(a => a.user === userId)
        .map(a => humanList([a.target, stageToPipeline.get(a.target) ?? "pipeline"]));

      // My open items (not active)
      const myOpen = allStages
        .filter(s => itemOwners(s).includes(userId) && (statusOverrides[s] ?? "planned") !== "active")
        .slice(0, 8)
        .map(s => humanList([s, stageToPipeline.get(s) ?? ""]));

      // My blocked items
      const myBlocked = allStages
        .filter(s => itemOwners(s).includes(userId) && statusOverrides[s] === "blocked")
        .map(s => humanList([s, stageToPipeline.get(s) ?? ""]));

      // Team wins (other users)
      const teamWins = completions
        .filter(a => a.user !== userId)
        .slice(0, 6)
        .map(a => ({
          user: userNames[a.user] ?? a.user,
          stage: a.target,
          pipeline: stageToPipeline.get(a.target) ?? "",
        }));

      if (isExecutive) {
        const execHtml = buildExecEmail(
          userName,
          {
            completedThisWeek: completions.length,
            activeNow: activeStages.length,
            atRisk: blockedStages.length + strategicBugs.length,
            decisions: strategicRequests.length,
            nextSevenDays,
          },
          momentumRows,
          attentionRows,
          decisionRows,
          coreUpcomingTimeline.map(e => ({
            title: e.title,
            date: e.date ? new Date(`${e.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "No date",
            group: e.group,
            owner: e.responsibleId ? userNames[e.responsibleId] ?? e.responsibleId : "",
            tier: e.tier || "core",
          })),
          hiddenOperationalCount,
          dashboardUrl,
        );
        const subject = compactSubject(`Binayah executive weekly brief — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`);
        for (const addr of getEmailsForUser(userId)) {
          await sendStageEmail({ to: addr, subject, html: execHtml });
        }
        results.push({ userId, sent: true });
        logApi(ROUTE, "sent_exec", { userId, wins: completions.length, blocked: blockedStages.length, bugs: openBugs.length });
        continue;
      }

      // Skip if nothing to report
      if (myCompleted.length === 0 && myOpen.length === 0 && myBlocked.length === 0 && teamWins.length === 0) {
        results.push({ userId, sent: false });
        continue;
      }

      const html = buildEmail(userName, userId, [], myCompleted, myOpen, myBlocked, teamWins, dashboardUrl);
      const subject = compactSubject(`Binayah weekly digest — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`);
      for (const addr of getEmailsForUser(userId)) {
        await sendStageEmail({ to: addr, subject, html });
      }

      results.push({ userId, sent: true });
      logApi(ROUTE, "sent", { userId, myCompleted: myCompleted.length, myOpen: myOpen.length });
    } catch (err) {
      logApi(ROUTE, "error", { userId, err: String(err) });
      results.push({ userId, sent: false });
    }
  }

  const sent = results.filter(r => r.sent).length;
  logApi(ROUTE, "done", { sent, total: results.length });
  return NextResponse.json({ ok: true, sent, total: results.length });
}
