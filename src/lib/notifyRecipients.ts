/**
 * notifyRecipients — resolves who gets notified for a given event, and how.
 *
 * Routing rules:
 *   root     (ADMIN_IDS)              → every event, every workspace, digest by
 *                                       default unless directly involved
 *   operator (workspace.captains)     → every event in their workspace(s), digest
 *                                       by default unless directly involved
 *   agent    (workspace.members)      → only events where they are: mentioned,
 *                                       a claimer, an assignee, or the new
 *                                       assignee on an `assigned` event
 *   actor                             → never notified about their own action,
 *                                       unless they explicitly @mention themself
 *
 * Delivery channels:
 *   `immediate` — email is sent now. Reserved for high-urgency: mentions,
 *                 approvals/completions on your own work, and being assigned
 *                 something. These are interruptions worth your attention.
 *   `digest`    — accumulated and emailed once per day. Everything else.
 *
 * Per-recipient prefs are checked downstream in sendNotifications.
 */
import { ADMIN_IDS } from "./data";

/**
 * Minimal shape needed for recipient routing. The full Workspace type also
 * has icon/colorKey/name but those are display concerns — kept out of here so
 * server-side callers can pass a narrower projection from the DB document
 * without a full type assertion.
 */
export interface WorkspaceLike {
  id: string;
  captains: string[];
  members: string[];
  pipelineIds: string[];
}

export type EventType =
  | "claimed"
  | "unclaimed"
  | "status_change"
  | "active"
  | "blocked"
  | "approved"
  | "assigned"
  | "commented"
  | "mentioned"
  | "subtask_added"
  | "subtask_approved"
  | "pipeline_completed"
  | "reminder"
  | "request"
  | "due"
  | "chat"
  | "dm"
  | "bug";

export interface RecipientContext {
  eventType: EventType;
  workspaceId: string;
  actorId: string | null;
  /** current claimers of the affected stage (or parent stage of subtask) */
  claimers: string[];
  /** current assignees of the affected stage */
  assignees: string[];
  /** users explicitly @mentioned in this event (comments/chat) */
  mentioned: string[];
  /** for `assigned` events — the user who was just assigned */
  newlyAssigned?: string[];
}

export interface RecipientPlan {
  immediate: string[];
  digest: string[];
}

const OWNED_WORK_EVENTS = new Set<EventType>(["active", "approved", "subtask_approved", "pipeline_completed"]);

export function getRecipients(
  ctx: RecipientContext,
  workspaces: WorkspaceLike[],
  allUserIds: string[],
): RecipientPlan {
  const immediate = new Set<string>();
  const digest = new Set<string>();

  const ws = workspaces.find(w => w.id === ctx.workspaceId);
  // If the stage's workspace is unknown, only mentioned/assigned/claimers can be reached.
  // Root still gets it.
  for (const userId of allUserIds) {
    const isRoot = ADMIN_IDS.includes(userId);
    const isOperator = !!ws && ws.captains.includes(userId);
    const isAgent = !!ws && ws.members.includes(userId) && !isOperator;
    const isClaimerOrAssignee =
      ctx.claimers.includes(userId) || ctx.assignees.includes(userId);
    const isMentioned = ctx.mentioned.includes(userId);
    const isNewlyAssigned = (ctx.newlyAssigned ?? []).includes(userId);
    const isDirectAssignment = ctx.eventType === "assigned" && isNewlyAssigned;
    const isOwnedWorkEvent = OWNED_WORK_EVENTS.has(ctx.eventType) && isClaimerOrAssignee;
    if (userId === ctx.actorId && !isMentioned) continue;

    let notify = false;
    let urgent = false;

    if (isRoot) {
      notify = true;
      urgent = isMentioned || isDirectAssignment || isOwnedWorkEvent;
    } else if (isOperator) {
      notify = true;
      urgent = isMentioned || isDirectAssignment || isOwnedWorkEvent;
    } else if (isAgent) {
      // Agents only get events related to them
      if (isMentioned) {
        notify = true; urgent = true;
      } else if (isDirectAssignment) {
        notify = true; urgent = true;
      } else if (isClaimerOrAssignee) {
        notify = true;
        urgent = isOwnedWorkEvent;
      }
    }

    if (notify) {
      if (urgent) immediate.add(userId);
      else digest.add(userId);
    }
  }

  // Mentioned users always get immediate, even if not a workspace member.
  // (Edge case: someone mentioned outside their workspace — still notify.)
  for (const userId of ctx.mentioned) {
    if (!immediate.has(userId)) {
      digest.delete(userId);
      immediate.add(userId);
    }
  }

  return { immediate: [...immediate], digest: [...digest] };
}
