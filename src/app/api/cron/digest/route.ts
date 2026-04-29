/**
 * Daily digest cron — drains DigestEntry into one email per recipient.
 *
 * Scheduled by vercel.json at 09:00 UTC (~1pm Dubai). Vercel calls this
 * with header `authorization: Bearer ${CRON_SECRET}` if CRON_SECRET is
 * set in env vars; we verify it. For local debugging, GET works without
 * the header (logs a warning).
 *
 * Per recipient:
 *   1. Pull all their DigestEntry docs
 *   2. Render one digest email with all rows
 *   3. Send (best-effort)
 *   4. Delete those docs
 *
 * Per-recipient errors are isolated — one user's failure does not block
 * the rest of the run.
 */
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import DigestEntry from "@/lib/DigestEntry";
import AuthUser from "@/lib/AuthUser";
import { getEmailForUser } from "@/lib/auth";
import { sendStageEmail } from "@/lib/email";
import { digestEmailTemplate } from "@/lib/emailTemplates";
import { buildUnsubscribeToken } from "@/app/api/unsubscribe/route";
import { logApi } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const ROUTE = "/api/cron/digest";

export async function GET(req: NextRequest) {
  // Auth: Vercel cron sends an Authorization header; production runs require it.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      logApi(ROUTE, "unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[cron/digest] CRON_SECRET not set — running unauthenticated");
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://dashboard-gamification.vercel.app";

  await connectMongo();

  // Pull all entries grouped by recipient
  const entries = await DigestEntry.find({}).lean();
  if (entries.length === 0) {
    logApi(ROUTE, "no_entries");
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const byRecipient = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = byRecipient.get(e.recipientId) ?? [];
    arr.push(e);
    byRecipient.set(e.recipientId, arr);
  }

  let sent = 0;
  let failed = 0;
  for (const [recipientId, rows] of byRecipient.entries()) {
    try {
      // Per-recipient master switch (digest still respects emailNotifications=false)
      const authUser = await AuthUser.findOne({ fixedUserId: recipientId }).lean();
      if ((authUser as { emailNotifications?: boolean } | null)?.emailNotifications === false) {
        // Drop their queue without sending
        await DigestEntry.deleteMany({ recipientId });
        continue;
      }
      const email = getEmailForUser(recipientId);
      if (!email) {
        await DigestEntry.deleteMany({ recipientId });
        continue;
      }

      const tmpl = digestEmailTemplate({
        rows: rows.map(r => ({
          eventType: r.eventType,
          detail: r.detail,
          stageName: r.stageKey,
          pipelineName: r.pipelineName,
          workspaceName: r.workspaceName,
          actorName: r.actorName,
          points: r.points,
        })),
        appUrl,
        unsubscribeUrl: `${appUrl}/api/unsubscribe?t=${buildUnsubscribeToken(recipientId)}`,
      });

      await sendStageEmail({ to: email, subject: tmpl.subject, html: tmpl.html });
      await DigestEntry.deleteMany({ recipientId });
      sent++;
    } catch (err) {
      failed++;
      console.error("[cron/digest] failed for", recipientId, (err as Error).message);
      // Keep entries so the next run can retry
    }
  }

  logApi(ROUTE, "complete", { sent, failed, recipients: byRecipient.size });
  return NextResponse.json({ ok: true, sent, failed, recipients: byRecipient.size });
}
