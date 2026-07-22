// Pure helpers for the daily checklist. `dailyDone` keys are
// `${userId}::${YYYY-MM-DD}::${itemId}` → points earned that day. These are pure
// (no Date.now) so they're unit-testable and reusable by points, streak, and the
// heatmap; callers pass "today" (a Dubai date string) in explicitly.

export interface DayCompletion {
  count: number;
  points: number;
}

/** Parse a dailyDone key. userId is alphanumeric/dash (no `::`), so a plain split is safe. */
export function parseDailyKey(key: string): { userId: string; day: string; itemId: string } | null {
  const parts = key.split("::");
  if (parts.length < 3) return null;
  return { userId: parts[0], day: parts[1], itemId: parts.slice(2).join("::") };
}

/** Map of `YYYY-MM-DD` → { count, points } for a single user's completions. */
export function completionByDay(userId: string, dailyDone: Record<string, number>): Map<string, DayCompletion> {
  const out = new Map<string, DayCompletion>();
  const prefix = `${userId}::`;
  for (const [key, pts] of Object.entries(dailyDone)) {
    if (!key.startsWith(prefix)) continue;
    const parsed = parseDailyKey(key);
    if (!parsed || parsed.userId !== userId) continue;
    const cur = out.get(parsed.day) ?? { count: 0, points: 0 };
    cur.count += 1;
    cur.points += typeof pts === "number" ? pts : 0;
    out.set(parsed.day, cur);
  }
  return out;
}

/** Total daily-checklist points for a user, capped per day at `cap`. */
export function dailyPointsForUser(userId: string, dailyDone: Record<string, number>, cap: number): number {
  let total = 0;
  for (const { points } of completionByDay(userId, dailyDone).values()) {
    total += Math.min(points, cap);
  }
  return total;
}

/** Step a `YYYY-MM-DD` string by n calendar days (timezone-agnostic string math). */
export function shiftDay(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Consecutive-day streak of "completed ≥1 daily item", anchored at `todayStr`.
 * If today has no completion yet the streak isn't broken — it counts back from
 * yesterday (habit-tracker convention: a streak dies only after a full missed day).
 */
export function dailyStreak(userId: string, dailyDone: Record<string, number>, todayStr: string): number {
  const days = completionByDay(userId, dailyDone);
  if (days.size === 0) return 0;
  let cursor = days.has(todayStr) ? todayStr : shiftDay(todayStr, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}
