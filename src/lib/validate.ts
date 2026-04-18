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
 * Note: this is a fast pre-check; the actual body is also bounded by the server.
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
