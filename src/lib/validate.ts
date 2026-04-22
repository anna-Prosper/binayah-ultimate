/**
 * Hand-rolled validators. No external dependencies.
 * Returns null on pass, or an error string on fail.
 */

/** Max raw body size in bytes (64 KB). */
export const MAX_BODY_BYTES = 64 * 1024;

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
export const PATCH_KEY_WHITELIST = new Set([
  "claims",
  "reactions",
  "subtasks",
  "stageStatusOverrides",
  "stageDescOverrides",
  "pipeDescOverrides",
  "pipeMetaOverrides",
  "customStages",
  "customPipelines",
  "users",
  "updatedAt",
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
export const MAX_SUBTASKS_PER_STAGE = 20;
/** Max characters per subtask text */
export const MAX_SUBTASK_TEXT_LEN = 200;

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
 * Validate a stage key before interpolating it into a MongoDB path
 * (e.g., `state.comments.${stage}`). Rejects keys containing Mongo
 * operators or prototype-pollution vectors, and caps length.
 */
export function validateStageKey(stage: unknown): string | null {
  if (typeof stage !== "string") return "stage must be a string";
  const s = stage.trim();
  if (s.length === 0) return "stage must not be empty";
  if (s.length > 80) return "stage exceeds 80 char limit";
  if (FORBIDDEN_KEY_PATTERN.test(s)) return `stage "${s}" contains forbidden characters`;
  return null;
}
