// ── Timing ────────────────────────────────────────────────────────────────────

/** How often the sync poll fetches from the server (ms). */
export const SYNC_POLL_INTERVAL_MS = 5_000;

/** Debounce window before a state change triggers a PATCH write (ms). */
export const SYNC_WRITE_DEBOUNCE_MS = 1_500;

/** How long to protect a locally-optimistic write from being clobbered by an
 *  incoming poll merge. Must exceed SYNC_WRITE_DEBOUNCE_MS + max PATCH
 *  retry budget + slow network round-trip. */
export const LOCAL_WRITE_PROTECT_MS = 10_000;

/** Auto-dismiss duration for chat/claim/reaction pop-up notifications (ms). */
export const NOTIF_DISMISS_MS = 4_000;

/** Auto-dismiss duration for comment notifications (slightly longer, ms). */
export const COMMENT_NOTIF_DISMISS_MS = 5_000;

/** Minimum gap between conflict-warning toasts (ms). */
export const CONFLICT_TOAST_THROTTLE_MS = 30_000;

/** Heartbeat interval for writing the "last seen" timestamp (ms). */
export const HEARTBEAT_INTERVAL_MS = 60_000;

// ── Time constants (shared across timeAgo helpers) ────────────────────────────

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

// ── Limits ────────────────────────────────────────────────────────────────────

/** Max subtasks per stage (also enforced in validate.ts). */
export const MAX_SUBTASKS_PER_STAGE = 20;

/** Max characters per subtask text. */
export const MAX_SUBTASK_TEXT_LEN = 200;

/** Max characters in note/bug body fields. */
export const MAX_BODY_TEXT_LEN = 5_000;

/** Max characters in a chat message. */
export const MAX_CHAT_MSG_LEN = 2_000;

/** Max characters in an AI chat message. */
export const MAX_AI_MSG_LEN = 4_000;

/** Max raw PATCH body bytes (2 MB). */
export const MAX_PATCH_BODY_BYTES = 2 * 1024 * 1024;

/** Max activity log entries kept in state. */
export const MAX_ACTIVITY_LOG = 200;

/** Number of days an activity log entry stays visible on the dashboard. */
export const ACTIVITY_LOG_VISIBLE_DAYS = 7;

/** Days to retain nightly pipeline-state backups. */
export const BACKUP_RETAIN_DAYS = 14;

// ── SSE ───────────────────────────────────────────────────────────────────────

/** Max SSE reconnect backoff (ms). */
export const SSE_MAX_BACKOFF_MS = 30_000;
