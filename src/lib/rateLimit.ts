/**
 * Simple in-memory sliding-window rate limiter.
 * Works on single-instance serverless (Vercel coalesces instances).
 * Cold starts reset the window — acceptable for MVP. Upgrade path: Upstash Redis.
 */

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

function getIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

function check(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { ok: false, retryAfter };
  }
  return { ok: true, retryAfter: 0 };
}

// Prune stale keys periodically to prevent unbounded memory growth
let lastPruned = Date.now();
function maybePrune() {
  const now = Date.now();
  if (now - lastPruned < 60_000) return;
  lastPruned = now;
  for (const [k, v] of store.entries()) {
    if (now >= v.resetAt) store.delete(k);
  }
}

export function rateLimit(
  req: { headers: { get(name: string): string | null } },
  route: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  maybePrune();
  const ip = getIp(req);
  return check(`${route}:${ip}`, limit, windowMs);
}
