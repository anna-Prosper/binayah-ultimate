/**
 * sendNotifications — fans out per-user emails OR queues digest entries.
 *
 * Caller passes a workspace + event context; this module:
 *   1. Resolves recipients (root/operator/agent rules, see notifyRecipients.ts)
 *   2. For each user: checks per-event email pref, applies rate limit
 *   3. Sends "immediate" recipients an email now
 *   4. Queues "digest" recipients into DigestEntry — flushed by daily cron
 *
 * Fire-and-forget from API routes (`void sendNotifications(...)`). Errors
 * are logged, never thrown.
 */
import { connectMongo } from "@/lib/mongo";
import AuthUser from "@/lib/AuthUser";
import { getEmailForUser } from "@/lib/auth";
import { checkNotifyRateLimit } from "@/lib/notifyRateLimit";
import { sendStageEmail } from "@/lib/email";
import {
  claimEmailTemplate,
  activeEmailTemplate,
  approvedEmailTemplate,
  assignedEmailTemplate,
} from "@/lib/emailTemplates";
import { buildUnsubscribeToken } from "@/app/api/unsubscribe/route";
import { USERS_DEFAULT } from "@/lib/data";
import {
  getRecipients,
  type EventType,
  type RecipientContext,
  type WorkspaceLike,
} from "@/lib/notifyRecipients";
import DigestEntry from "@/lib/DigestEntry";

export interface NotifyOpts {
  eventType: EventType;
  stageKey: string;
  pipelineName: string;
  workspaceId: string;
  workspaceName: string;
  workspaces: WorkspaceLike[];
  /** id of user who triggered the event (will be excluded from recipients) */
  actorId: string | null;
  /** human-readable actor display ("Anna" or "someone") */
  actorName?: string;
  /** current claimers of the affected stage (for routing) */
  claimers?: string[];
  /** current assignees of the affected stage (for routing) */
  assignees?: string[];
  /** users explicitly @mentioned (comments/chat events) */
  mentioned?: string[];
  /** for `assigned` events — newly assigned users */
  newlyAssigned?: string[];
  points?: number;
  /** human-readable digest line, e.g. "Anna marked Foo → active" */
  detail?: string;
}

function resolveDisplayName(fixedUserId: string | null): string {
  if (!fixedUserId) return "someone";
  return USERS_DEFAULT.find(u => u.id === fixedUserId)?.name ?? fixedUserId;
}

/** Per-event preference key on AuthUser. Any falsy value disables that channel. */
function prefKeyForEvent(eventType: EventType): string {
  // Map event → pref bucket. Mentions/approvals always notify (cannot be silenced).
  switch (eventType) {
    case "mentioned": return "notifyMention";
    case "approved": return "notifyApproved";
    case "assigned": return "notifyAssigned";
    case "claimed":
    case "unclaimed": return "notifyClaim";
    case "active":
    case "blocked":
    case "status_change": return "notifyStatus";
    case "commented": return "notifyComment";
    case "subtask_added":
    case "subtask_approved": return "notifySubtask";
    default: return "notifyOther";
  }
}

async function userOptedIn(fixedUserId: string, eventType: EventType): Promise<boolean> {
  const authUser = await AuthUser.findOne({ fixedUserId }).lean();
  if (!authUser) return true;
  const u = authUser as unknown as Record<string, unknown>;
  // Master switch
  if (u.emailNotifications === false) return false;
  // Per-event switch — defaults to true if undefined
  const key = prefKeyForEvent(eventType);
  if (u[key] === false) return false;
  return true;
}

function renderEmail(
  eventType: EventType,
  base: { stageName: string; pipelineName: string; actorName: string; appUrl: string; unsubscribeUrl: string; points: number },
): { subject: string; html: string } | null {
  switch (eventType) {
    case "claimed":
      return claimEmailTemplate(base);
    case "active":
      return activeEmailTemplate(base);
    case "approved":
      return approvedEmailTemplate(base);
    case "assigned":
      return assignedEmailTemplate(base);
    // Other event types only flow into the digest, never immediate email.
    default:
      return null;
  }
}

export async function sendNotifications(opts: NotifyOpts): Promise<void> {
  const appUrl = process.env.NEXTAUTH_URL ?? "https://dashboard-gamification.vercel.app";
  const actorDisplay = opts.actorName ?? resolveDisplayName(opts.actorId);

  try { await connectMongo(); } catch (err) {
    console.error("[notify] MongoDB connect failed:", (err as Error).message);
    return;
  }

  const ctx: RecipientContext = {
    eventType: opts.eventType,
    workspaceId: opts.workspaceId,
    actorId: opts.actorId,
    claimers: opts.claimers ?? [],
    assignees: opts.assignees ?? [],
    mentioned: opts.mentioned ?? [],
    newlyAssigned: opts.newlyAssigned,
  };

  const allUserIds = USERS_DEFAULT.map(u => u.id);
  const plan = getRecipients(ctx, opts.workspaces, allUserIds);

  // ── Immediate emails ──────────────────────────────────────────────────────
  for (const fixedUserId of plan.immediate) {
    try {
      const email = getEmailForUser(fixedUserId);
      if (!email) continue;
      if (!(await userOptedIn(fixedUserId, opts.eventType))) continue;
      if (!(await checkNotifyRateLimit(fixedUserId, opts.stageKey, opts.eventType))) continue;

      const tmpl = renderEmail(opts.eventType, {
        stageName: opts.stageKey,
        pipelineName: opts.pipelineName,
        actorName: actorDisplay,
        appUrl,
        unsubscribeUrl: `${appUrl}/api/unsubscribe?t=${buildUnsubscribeToken(fixedUserId)}`,
        points: opts.points ?? 0,
      });
      if (!tmpl) continue;

      sendStageEmail({ to: email, subject: tmpl.subject, html: tmpl.html }).catch(err =>
        console.error("[notify] email failed for", fixedUserId, (err as Error).message)
      );
    } catch (err) {
      console.error("[notify] immediate error for", fixedUserId, (err as Error).message);
    }
  }

  // ── Digest queue ──────────────────────────────────────────────────────────
  // Only queue for users who haven't opted out of email entirely.
  for (const fixedUserId of plan.digest) {
    try {
      const authUser = await AuthUser.findOne({ fixedUserId }).lean();
      if ((authUser as { emailNotifications?: boolean } | null)?.emailNotifications === false) continue;
      // Per-event opt-out also applies to the digest
      if (!(await userOptedIn(fixedUserId, opts.eventType))) continue;

      await DigestEntry.create({
        recipientId: fixedUserId,
        eventType: opts.eventType,
        stageKey: opts.stageKey,
        pipelineName: opts.pipelineName,
        workspaceName: opts.workspaceName,
        actorName: actorDisplay,
        detail: opts.detail || `${actorDisplay}: ${opts.eventType} on ${opts.stageKey}`,
        points: opts.points ?? 0,
      });
    } catch (err) {
      console.error("[notify] digest enqueue failed for", fixedUserId, (err as Error).message);
    }
  }
}
