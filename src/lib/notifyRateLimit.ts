/**
 * In-memory rate limiter for email notifications.
 *
 * Key: `${fixedUserId}:${stageKey}:${eventType}` (e.g. "anna:PM Agent:claimed")
 * Value: timestamp of last send (ms since epoch)
 *
 * Limit: 1 email per key per WINDOW_MS (5 minutes).
 *
 * Caveat: Vercel serverless instances are isolated — each lambda has its own Map.
 * For a 6-person team this is acceptable; at worst a user gets a second email
 * after a cold start. No external store needed at this scale.
 */

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Single module-level Map shared across requests on the same lambda instance
const lastSent = new Map<string, number>();

/**
 * Returns true if the notification should be sent (not rate-limited).
 * Records the current timestamp so the next call within WINDOW_MS returns false.
 */
export function checkNotifyRateLimit(
  fixedUserId: string,
  stageKey: string,
  eventType: "claimed" | "active"
): boolean {
  const key = `${fixedUserId}:${stageKey}:${eventType}`;
  const prev = lastSent.get(key) ?? 0;
  if (Date.now() - prev < WINDOW_MS) return false;
  lastSent.set(key, Date.now());
  return true;
}
