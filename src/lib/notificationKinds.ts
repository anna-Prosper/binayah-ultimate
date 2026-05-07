/**
 * Notification taxonomy for the role-aware notifications panel.
 *
 * Two buckets:
 * - "Action required" items (actionRequired: true) are derived from current
 *   STATE — they disappear only when the underlying state changes (e.g.
 *   approval granted, bug closed, owner assigned). They have no read/unread.
 * - "Updates" items (actionRequired: false) are timestamped EVENTS — they
 *   stay visible until explicitly dismissed; a per-user "last read" stamp
 *   determines unread vs read styling.
 */

export type NotificationKind =
  | "approval"
  | "exec-pending"
  | "exec-update"
  | "blocked"
  | "unassigned-now"
  | "bug"
  | "reminder"
  | "due-soon"
  | "stalled"
  | "opportunity"
  | "mention"
  | "claim"
  | "comment"
  | "reaction"
  | "approval-given"
  | "status-change";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  stage?: string;
  pipelineId?: string;
  /** ms-since-epoch. 0 for state-derived action-required items. */
  time: number;
  priority?: "high" | "medium" | "low";
  /** True for the action-required bucket; false for the updates bucket. */
  actionRequired: boolean;
  /** Optional client-side route (next/link). */
  href?: string;
};

export const KIND_LABEL: Record<NotificationKind, string> = {
  approval: "needs approval",
  "exec-pending": "exec proposal pending",
  "exec-update": "exec update",
  blocked: "blocked",
  "unassigned-now": "unassigned NOW",
  bug: "bug/test",
  reminder: "reminder due",
  "due-soon": "due soon",
  stalled: "stalled",
  opportunity: "open task",
  mention: "mentioned you",
  claim: "claimed",
  comment: "commented",
  reaction: "reacted",
  "approval-given": "approved",
  "status-change": "status changed",
};
