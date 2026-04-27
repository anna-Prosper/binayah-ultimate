/**
 * sendNotifications — orchestrates per-user notification sends.
 *
 * - Checks emailNotifications preference per user (MongoDB lookup)
 * - Applies per-(user, stage, eventType) rate limit
 * - Renders the HTML template
 * - Fires sendStageEmail in a fire-and-forget manner
 *
 * Called from the PATCH handler via `void sendNotifications(...)`.
 * Never throws — all errors are swallowed after logging.
 */

import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";
import { getEmailForUser } from "@/lib/auth";
import { checkNotifyRateLimit } from "@/lib/notifyRateLimit";
import { sendStageEmail } from "@/lib/email";
import { claimEmailTemplate, activeEmailTemplate } from "@/lib/emailTemplates";
import { buildUnsubscribeToken } from "@/app/api/unsubscribe/route";
import { USERS_DEFAULT } from "@/lib/data";

export interface NotifyOpts {
  eventType: "claimed" | "active";
  stageKey: string;
  pipelineName: string;
  /** fixedUserIds of people to notify */
  recipientIds: string[];
  /** fixedUserId or display name of the person who triggered the event */
  actorName: string;
  points: number;
}

function resolveDisplayName(fixedUserId: string): string {
  const user = USERS_DEFAULT.find(u => u.id === fixedUserId);
  return user?.name ?? fixedUserId;
}

export async function sendNotifications(opts: NotifyOpts): Promise<void> {
  const appUrl =
    process.env.NEXTAUTH_URL ?? "https://dashboard.binayahhub.com";

  // Best-effort actor name resolution
  const actorDisplay = opts.actorName
    ? resolveDisplayName(opts.actorName)
    : "someone";

  try {
    await connectMongo();
  } catch (err) {
    console.error("[notify] MongoDB connect failed:", (err as Error).message);
    return;
  }

  for (const fixedUserId of opts.recipientIds) {
    try {
      const email = getEmailForUser(fixedUserId);
      if (!email) continue;

      // Check per-user email notifications preference
      const authUser = await AuthUser.findOne({ fixedUserId }).lean();
      if (authUser && (authUser as { emailNotifications?: boolean }).emailNotifications === false) {
        continue;
      }

      // Per-(user, stage, event) rate limit
      if (!checkNotifyRateLimit(fixedUserId, opts.stageKey, opts.eventType)) {
        continue;
      }

      const unsubToken = buildUnsubscribeToken(fixedUserId);
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?t=${unsubToken}`;

      let subject: string;
      let html: string;

      if (opts.eventType === "claimed") {
        const tmpl = claimEmailTemplate({
          stageName: opts.stageKey,
          pipelineName: opts.pipelineName,
          actorName: actorDisplay,
          appUrl,
          unsubscribeUrl,
        });
        subject = tmpl.subject;
        html = tmpl.html;
      } else {
        const tmpl = activeEmailTemplate({
          stageName: opts.stageKey,
          pipelineName: opts.pipelineName,
          actorName: actorDisplay,
          points: opts.points,
          appUrl,
          unsubscribeUrl,
        });
        subject = tmpl.subject;
        html = tmpl.html;
      }

      // Fire and forget — do NOT await
      sendStageEmail({ to: email, subject, html }).catch(err =>
        console.error("[notify] email failed for", fixedUserId, (err as Error).message)
      );
    } catch (err) {
      // Per-user errors are swallowed — don't fail the loop
      console.error("[notify] error for user", fixedUserId, (err as Error).message);
    }
  }
}
