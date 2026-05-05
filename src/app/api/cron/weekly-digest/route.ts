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
import { pipelineData } from "@/lib/data";
import { logApi } from "@/lib/log";

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
  claims?: Record<string, string[]>;
  owners?: Record<string, string[]>;
  assignments?: Record<string, string[]>;
  stageStatusOverrides?: Record<string, string>;
};

function buildPipelineIndex() {
  const stageToPipeline = new Map<string, string>();
  for (const p of pipelineData) {
    for (const s of p.stages) stageToPipeline.set(s, p.name);
  }
  return stageToPipeline;
}

function htmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  // All owners/claims per stage
  const itemOwners = (key: string) => Array.from(new Set([
    ...(state.claims?.[key] ?? []),
    ...(state.owners?.[key] ?? []),
    ...(state.assignments?.[key] ?? []),
  ]));

  const statusOverrides = state.stageStatusOverrides ?? {};
  const allStages = pipelineData.flatMap(p => p.stages);

  // All team completions this week (status_change → active)
  const completions = activityLog.filter(a =>
    a.type === "status_change" && /active|→ active/i.test(a.detail)
  );

  const dashboardUrl = process.env.NEXTAUTH_URL ?? "https://dashboard.binayahhub.com";
  const results: { userId: string; sent: boolean }[] = [];

  // User name map (id → display name)
  const userNames: Record<string, string> = {
    anna: "Anna", aakarshit: "Aakarshit", usama: "Usama",
    ahsan: "Ahsan", prajeesh: "Prajeesh", abdallah: "Abdallah",
  };

  for (const [userId, email] of Object.entries(USER_PRIMARY_EMAIL)) {
    try {
      const userName = userNames[userId] ?? userId;

      // My completions this week
      const myCompleted = completions
        .filter(a => a.user === userId)
        .map(a => `${a.target} (${stageToPipeline.get(a.target) ?? "pipeline"})`);

      // My open items (not active)
      const myOpen = allStages
        .filter(s => itemOwners(s).includes(userId) && (statusOverrides[s] ?? "planned") !== "active")
        .slice(0, 8)
        .map(s => `${s} · ${stageToPipeline.get(s) ?? ""}`);

      // My blocked items
      const myBlocked = allStages
        .filter(s => itemOwners(s).includes(userId) && statusOverrides[s] === "blocked")
        .map(s => `${s} · ${stageToPipeline.get(s) ?? ""}`);

      // Team wins (other users)
      const teamWins = completions
        .filter(a => a.user !== userId)
        .slice(0, 6)
        .map(a => ({
          user: userNames[a.user] ?? a.user,
          stage: a.target,
          pipeline: stageToPipeline.get(a.target) ?? "",
        }));

      // Skip if nothing to report
      if (myCompleted.length === 0 && myOpen.length === 0 && myBlocked.length === 0 && teamWins.length === 0) {
        results.push({ userId, sent: false });
        continue;
      }

      const html = buildEmail(userName, userId, [], myCompleted, myOpen, myBlocked, teamWins, dashboardUrl);
      const subject = `Binayah weekly digest — ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
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
