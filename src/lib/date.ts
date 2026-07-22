// Shared date helpers. The team is Dubai-based, so "today" for daily features
// must use Asia/Dubai (UTC+4, no DST) — not UTC. A 2am-Dubai action is still
// "today" in Dubai but would land on the previous day under a UTC boundary.

/** YYYY-MM-DD for the given instant in Asia/Dubai time (defaults to now). */
export function dubaiDateStr(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
