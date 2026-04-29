/**
 * Persistent rate limiter for email notifications.
 *
 * Key: `${fixedUserId}:${stageKey}:${eventType}` (e.g. "anna:PM Agent:claimed")
 * Limit: 1 email per key per 5 minutes.
 *
 * Backed by MongoDB with a TTL index on `sentAt` so docs auto-expire after
 * the rate-limit window. Replaces the previous in-memory Map which reset
 * on every Vercel cold start and allowed duplicate emails to slip through.
 */
import { connectMongo } from "./mongo";
import NotifyLog from "./NotifyLog";

/**
 * Returns true if the notification should be sent. Records the send so
 * the next call within the window returns false.
 *
 * Async: requires a DB roundtrip. Caller should `await`.
 *
 * Fail-open: any DB error short-circuits to `true` (better to risk a
 * duplicate email than silently swallow a notification).
 */
export async function checkNotifyRateLimit(
  fixedUserId: string,
  stageKey: string,
  eventType: string,
): Promise<boolean> {
  const key = `${fixedUserId}:${stageKey}:${eventType}`;
  try {
    await connectMongo();
    // insertOne with unique index → fails if key already exists in window
    await NotifyLog.create({ key, sentAt: new Date() });
    return true;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 11000) return false; // duplicate key — already sent within window
    console.error("[notifyRateLimit] DB error:", (err as Error).message);
    return true; // fail-open
  }
}
