/**
 * Hand-rolled validators. No external dependencies.
 * Returns null on pass, or an error string on fail.
 */

/** Max raw body size in bytes. Chat attachments are stored as compact data URLs. */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

const ALPHANUMERIC_DASH = /^[a-zA-Z0-9_-]+$/;

export function validateUserId(id: unknown, field = "userId"): string | null {
  if (typeof id !== "string") return `${field} must be a string`;
  if (id.length === 0 || id.length > 40) return `${field} must be 1–40 chars`;
  if (!ALPHANUMERIC_DASH.test(id)) return `${field} must be alphanumeric with dashes/underscores`;
  return null;
}

export function validateText(text: unknown, field: string, maxLen: number): string | null {
  if (typeof text !== "string") return `${field} must be a string`;
  if (text.length === 0) return `${field} must not be empty`;
  if (text.length > maxLen) return `${field} exceeds ${maxLen} char limit`;
  return null;
}

/**
 * Validate a chat messages array.
 * - max 20 messages
 * - each message.content <= 4000 chars
 * - role must be "user" | "assistant" | "system"
 */
export function validateChatMessages(messages: unknown): string | null {
  if (!Array.isArray(messages)) return "messages must be an array";
  if (messages.length > 20) return "messages array exceeds 20 items";
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (typeof m !== "object" || m === null) return `messages[${i}] must be an object`;
    const obj = m as Record<string, unknown>;
    if (!["user", "assistant", "system"].includes(obj.role as string)) {
      return `messages[${i}].role must be user|assistant|system`;
    }
    const err = validateText(obj.content, `messages[${i}].content`, 4000);
    if (err) return err;
  }
  return null;
}

/**
 * Validate the Content-Length header value against MAX_BODY_BYTES.
 * Returns an error string if the declared size exceeds the cap.
 * Note: this is a fast pre-check only — clients using chunked transfer encoding
 * omit the Content-Length header and will bypass this guard. Vercel imposes a
 * platform-level 4.5 MB body cap so req.json() will still reject extreme payloads.
 * A stricter byte-counting stream reader could be added later if needed.
 */
export function checkContentLength(req: { headers: { get(name: string): string | null } }): string | null {
  const cl = req.headers.get("content-length");
  if (cl !== null) {
    const n = parseInt(cl, 10);
    if (!isNaN(n) && n > MAX_BODY_BYTES) {
      return `payload too large (max ${MAX_BODY_BYTES} bytes)`;
    }
  }
  return null;
}

/** Whitelist of allowed PATCH keys for /api/pipeline-state */
// v3 — removed lockedPipelines, trashedStages, trashedPipelines, trashedSubtasks
export const PATCH_KEY_WHITELIST = new Set([
  // Canonical ownership field — replaces claims+assignments split.
  "owners",
  // Legacy fields kept in the whitelist so old clients can still write during
  // the migration window. The server merges them into owners on hydrate.
  "claims",
  "assignments",
  // Approval state — was previously client-only (localStorage). Now syncs so
  // other users can see "this is approved" without a manual reload.
  "approvedStages",
  "approvedSubtasks",
  "approvedPipelines",
  "reminders",
  "timelineEvents",
  "notes",
  "bugs",
  "usefulLinks",
  "reactions",
  "subtasks",
  "stageStatusOverrides",
  "stageDescOverrides",
  "stageDueDates",
  "stageNameOverrides",
  "subtaskStages",
  "subtaskDescOverrides",
  "subtaskDueDates",
  "pipeDescOverrides",
  "pipeMetaOverrides",
  "customStages",
  "customPipelines",
  "users",
  "workspaces",
  "archivedStages",
  "archivedPipelines",
  "archivedSubtasks",
  "stagePointsOverride",
  "stagePriorities",
  // Maps an Inbox stage id -> workspace id (per-workspace Inbox scoping).
  "inboxStageWorkspace",
  "execProposals",
  "databases",
  // Per-user notification read state — userId → last-read timestamp.
  "notifReads",
  // Per-user notification dismissals — userId → string[] of dismissed item ids.
  "notifDismissed",
  // Per-user per-item read state — userId → string[] of read item ids.
  "notifReadIds",
  "updatedAt",
  // Transient server-side notification intents. Consumed by /api/pipeline-state
  // after the state merge and never persisted.
  "notificationEvents",
  // Envelope for explicit per-key deletions on map slices. Shape:
  //   { _deletes: { stageStatusOverrides: ["StageA"], owners: ["StageB::1"] } }
  // Required because map slices are now merged per-key on the server, so
  // omitting a key from the patch no longer deletes it.
  "_deletes",
  // Marker: the sender computes deletions from explicit user intent. The server
  // only honours `_deletes` when this is "explicit"; old diff-based clients omit
  // it, so their spurious deletes are ignored.
  "_deleteMode",
]);

/** Map slices on the server — per-key merged, not wholesale-replaced.
 *  Inner-array slices (subtasks, reactions) get extra special-case merging
 *  in route.ts so writes inside them don't clobber concurrent writes either. */
export const MAP_SLICE_KEYS = new Set([
  "owners",
  "claims",
  "assignments",
  "stageStatusOverrides",
  "stageDescOverrides",
  "stageDueDates",
  "stageNameOverrides",
  "stagePriorities",
  "stagePointsOverride",
  "subtaskStages",
  "subtaskDescOverrides",
  "subtaskDueDates",
  "pipeDescOverrides",
  "pipeMetaOverrides",
  "customStages",
  "inboxStageWorkspace",
  "subtasks",
  "reactions",
  // Per-user maps — keys are userIds, values are scalars/arrays. Per-key merge so
  // one user's "mark read" doesn't clobber another user's dismiss list.
  "notifReads",
  "notifDismissed",
  "notifReadIds",
]);

/** Arrays of objects with stable numeric `id` — merged by id (upsert each item),
 *  never wholesale-replaced. _deletes for these is { slice: ["id1","id2"] }. */
export const ARRAY_BY_ID_SLICE_KEYS = new Set([
  "execProposals",
  "reminders",
  "timelineEvents",
  "notes",
  "bugs",
  "usefulLinks",
  "customPipelines",
  "databases",
  // Identity-critical lists: merge by id (keep-existing) instead of wholesale
  // replace, so a stale/partial client can never shrink them. Real removals go
  // through an explicit _deletes (guarded by the mass-delete backstop).
  "workspaces",
  "users",
]);

/** Set-like arrays (string lists treated as a set). Merged via union;
 *  _deletes pulls members. */
export const SET_SLICE_KEYS = new Set([
  "approvedStages",
  "approvedSubtasks",
  "approvedPipelines",
  "archivedStages",
  "archivedPipelines",
  "archivedSubtasks",
]);

const FORBIDDEN_KEY_PATTERN = /[.$]|__proto__|constructor|prototype/;

export function validatePatchKeys(patch: Record<string, unknown>): string | null {
  for (const k of Object.keys(patch)) {
    if (FORBIDDEN_KEY_PATTERN.test(k)) return `key "${k}" contains forbidden characters`;
    if (!PATCH_KEY_WHITELIST.has(k)) return `key "${k}" is not an allowed patch key`;
  }
  return null;
}

/** Max subtasks per stage */
export const MAX_SUBTASKS_PER_STAGE = 100;
/** Max characters per subtask text */
export const MAX_SUBTASK_TEXT_LEN = 500;

/**
 * Validate a subtasks map before persisting it.
 * Each stage may have at most MAX_SUBTASKS_PER_STAGE subtasks,
 * and each subtask's text must be <= MAX_SUBTASK_TEXT_LEN chars.
 * Returns null on pass, or an error string on first violation.
 */
export function validateSubtasks(subtasks: unknown): string | null {
  if (typeof subtasks !== "object" || subtasks === null || Array.isArray(subtasks)) {
    return "subtasks must be an object";
  }
  const map = subtasks as Record<string, unknown>;
  for (const [stage, items] of Object.entries(map)) {
    if (!Array.isArray(items)) return `subtasks["${stage}"] must be an array`;
    if (items.length > MAX_SUBTASKS_PER_STAGE) {
      return `subtasks["${stage}"] exceeds max ${MAX_SUBTASKS_PER_STAGE} subtasks`;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (typeof item !== "object" || item === null) {
        return `subtasks["${stage}"][${i}] must be an object`;
      }
      const obj = item as Record<string, unknown>;
      if (typeof obj.text !== "string") return `subtasks["${stage}"][${i}].text must be a string`;
      if (obj.text.length > MAX_SUBTASK_TEXT_LEN) {
        return `subtasks["${stage}"][${i}].text exceeds ${MAX_SUBTASK_TEXT_LEN} char limit`;
      }
    }
  }
  return null;
}

/**
 * Nested key validator — walks values of pipeline-scoped patch keys and rejects
 * any nested key containing $, ., __proto__, constructor, or prototype.
 * Max recursion depth: 6. Returns false if a forbidden key is found, true if clean.
 */
export function validateNestedKeys(obj: unknown, depth = 0): boolean {
  if (depth > 6) return true; // stop recursing at max depth
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return true;
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEY_PATTERN.test(k)) return false;
    const child = (obj as Record<string, unknown>)[k];
    if (!validateNestedKeys(child, depth + 1)) return false;
  }
  return true;
}

/**
 * Like validateNestedKeys but returns the dotted path of the first bad key found,
 * or null if everything is clean. Used by the PATCH handler to give the client a
 * specific reason when pushes fail — previously the error was just "INVALID_KEY"
 * with no clue which slice or which entry was broken.
 */
export function findForbiddenNestedKey(obj: unknown, path = "", depth = 0): string | null {
  if (depth > 6) return null;
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return null;
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const here = path ? `${path}.${k}` : k;
    if (FORBIDDEN_KEY_PATTERN.test(k)) return here;
    const child = (obj as Record<string, unknown>)[k];
    const inner = findForbiddenNestedKey(child, here, depth + 1);
    if (inner) return inner;
  }
  return null;
}

/**
 * Validate a stage key before interpolating it into a MongoDB path
 * (e.g., `state.comments.${stage}`). Rejects keys containing Mongo
 * operators or prototype-pollution vectors, and caps length.
 */
export function validateStageKey(stage: unknown): string | null {
  if (typeof stage !== "string") return "stage must be a string";
  const s = stage.trim();
  if (s.length === 0) return "stage must not be empty";
  if (s.length > 240) return "stage exceeds 240 char limit";
  if (FORBIDDEN_KEY_PATTERN.test(s)) return `stage "${s}" contains forbidden characters`;
  return null;
}
