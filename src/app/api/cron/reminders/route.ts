import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PipelineState from "@/lib/PipelineState";
import AuthUser from "@/lib/AuthUser";
import { getEmailsForUser } from "@/lib/auth";
import { sendStageEmail } from "@/lib/email";
import { USERS_DEFAULT, type ReminderItem } from "@/lib/data";
import { buildUnsubscribeToken } from "@/app/api/unsubscribe/route";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE = "/api/cron/reminders";
const WORKSPACE = { workspaceId: "main" };

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch] || ch));
}

function reminderEmail(reminder: ReminderItem, creatorName: string, appUrl: string, unsubscribeUrl: string) {
  const due = new Date(reminder.remindAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const title = escapeHtml(reminder.title);
  const body = escapeHtml(reminder.body || "No note.");
  return {
    subject: `[Binayah Dashboard] reminder: ${reminder.title}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8f4ff;padding:24px;color:#18072f">
        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eadcff;border-radius:14px;padding:20px">
          <div style="font-size:11px;color:#7c3aed;font-family:monospace;font-weight:800;letter-spacing:.8px;text-transform:uppercase">binayah dashboard · reminder</div>
          <h1 style="font-size:22px;line-height:1.25;margin:10px 0 8px">${title}</h1>
          <p style="font-size:14px;line-height:1.55;margin:0 0 12px;color:#4c386d">${body}</p>
          <div style="font-size:12px;color:#7b5aa6;font-family:monospace;margin:12px 0">due: ${due}<br/>created by: ${escapeHtml(creatorName)}</div>
          <a href="${appUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;padding:10px 14px;font-size:13px;font-weight:700">Open dashboard</a>
          <div style="font-size:11px;color:#9b87b6;margin-top:18px">
            <a href="${unsubscribeUrl}" style="color:#7c3aed">manage notifications</a>
          </div>
        </div>
      </div>
    `,
  };
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

  const appUrl = process.env.NEXTAUTH_URL ?? "https://dashboard-gamification.vercel.app";
  await connectMongo();
  const doc = await PipelineState.findOne(WORKSPACE).lean() as { state?: { reminders?: ReminderItem[] } } | null;
  const reminders = doc?.state?.reminders || [];
  const now = Date.now();
  let sent = 0;
  let failed = 0;
  let changed = false;

  const nextReminders = await Promise.all(reminders.map(async reminder => {
    if (Date.parse(reminder.remindAt) > now) return reminder;
    const emailedTo = new Set(reminder.emailedTo || []);
    const creatorName = USERS_DEFAULT.find(u => u.id === reminder.createdBy)?.name || reminder.createdBy;
    for (const recipientId of reminder.recipientIds) {
      if (emailedTo.has(recipientId)) continue;
      try {
        const authUser = await AuthUser.findOne({ fixedUserId: recipientId }).lean() as { emailNotifications?: boolean; notifyReminder?: boolean; notifyOther?: boolean } | null;
        const oldOtherOptOut = authUser?.notifyReminder === undefined && authUser?.notifyOther === false;
        if (authUser?.emailNotifications === false || authUser?.notifyReminder === false || oldOtherOptOut) {
          emailedTo.add(recipientId);
          changed = true;
          continue;
        }
        const emails = getEmailsForUser(recipientId);
        if (emails.length === 0) {
          emailedTo.add(recipientId);
          changed = true;
          continue;
        }
        const tmpl = reminderEmail(reminder, creatorName, appUrl, `${appUrl}/api/unsubscribe?t=${buildUnsubscribeToken(recipientId)}`);
        for (const email of emails) {
          await sendStageEmail({ to: email, subject: tmpl.subject, html: tmpl.html });
        }
        emailedTo.add(recipientId);
        sent++;
        changed = true;
      } catch (err) {
        failed++;
        console.error("[cron/reminders] failed for", recipientId, (err as Error).message);
      }
    }
    return { ...reminder, emailedTo: [...emailedTo] };
  }));

  if (changed) {
    await PipelineState.findOneAndUpdate(
      WORKSPACE,
      { $set: { "state.reminders": nextReminders, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  logApi(ROUTE, "complete", { sent, failed });
  return NextResponse.json({ ok: true, sent, failed });
}
