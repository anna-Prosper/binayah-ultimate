/**
 * notifyRecipients — resolves who gets notified for a given event, and how.
 *
 * Routing rules:
 *   root     (ADMIN_IDS)              → every event, every workspace
 *   operator (workspace.captains)     → every event in their workspace(s)
 *   agent    (workspace.members)      → only events where they are: mentioned,
 *                                       a claimer, an assignee, or the new
 *                                       assignee on an `assigned` event
 *   actor                             → never notified about their own action
 *
 * Delivery channels:
 *   `immediate` — email is sent now. Reserved for high-urgency: mentions,
 *                 approvals on your own stage/subtask, being assigned to
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
  | "subtask_approved";

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

const URGENT_FOR_AGENT = new Set<EventType>(["mentioned", "approved", "assigned"]);
const URGENT_FOR_OPERATOR = new Set<EventType>(["mentioned", "approved"]);

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
    if (userId === ctx.actorId) continue;

    const isRoot = ADMIN_IDS.includes(userId);
    const isOperator = !!ws && ws.captains.includes(userId);
    const isAgent = !!ws && ws.members.includes(userId) && !isOperator;
    const isClaimerOrAssignee =
      ctx.claimers.includes(userId) || ctx.assignees.includes(userId);
    const isMentioned = ctx.mentioned.includes(userId);
    const isNewlyAssigned = (ctx.newlyAssigned ?? []).includes(userId);

    let notify = false;
    let urgent = false;

    if (isRoot) {
      notify = true;
      urgent =
        isMentioned ||
        (ctx.eventType === "approved" && isClaimerOrAssignee) ||
        isNewlyAssigned;
    } else if (isOperator) {
      notify = true;
      urgent =
        isMentioned ||
        URGENT_FOR_OPERATOR.has(ctx.eventType) && isClaimerOrAssignee ||
        isNewlyAssigned;
    } else if (isAgent) {
      // Agents only get events related to them
      if (isMentioned) {
        notify = true; urgent = true;
      } else if (isNewlyAssigned) {
        notify = true; urgent = true;
      } else if (isClaimerOrAssignee) {
        notify = true;
        urgent = URGENT_FOR_AGENT.has(ctx.eventType);
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
    if (userId === ctx.actorId) continue;
    if (!immediate.has(userId)) {
      digest.delete(userId);
      immediate.add(userId);
    }
  }

  return { immediate: [...immediate], digest: [...digest] };
}
