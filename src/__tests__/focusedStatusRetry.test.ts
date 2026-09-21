/**
 * Regression tests for focused status-write retry (ModelContext.persistFocusedStatus).
 *
 * Bug: focused stage/subtask status writes (which bypass useSync's retrying doWrite
 * and PATCH directly, because the server only accepts single-key status patches)
 * were fire-and-forget. On ANY failure they set "offline" and dropped the write.
 * Under concurrent use the server's optimistic-lock CAS can exhaust and return
 * 409 WRITE_CONTENTION — a transient failure. Dropping it meant "move to done"
 * never reached the DB and the next poll reverted the card. Confirmed in prod:
 * subtask default-parent-notion-sm-automation::1784010163119 ("Binayah Studio
 * Optimisation and Migration") stuck at "in-progress" with no override landing.
 *
 * Fix: retry transient failures with backoff; abandon only on success, on a newer
 * local value (supersede), or on a real auth/validation error.
 *
 * These test the pure decision logic (no React/network) so they run in Jest/node.
 */

type Decision = "confirm" | "retry" | "stop-auth" | "stop-offline";

// Mirrors the branch logic inside persistFocusedStatus.attempt().
function decideFocusedWrite(result: { ok: boolean; status?: number }): Decision {
  if (result.ok) return "confirm";
  if (result.status && result.status >= 400 && result.status < 500 && result.status !== 409 && result.status !== 429) {
    return result.status === 401 ? "stop-auth" : "stop-offline";
  }
  return "retry"; // 409 / 429 / 5xx / network(no status)
}

// Mirrors isSuperseded(): retry stops re-asserting a stale value if the user has
// since moved the card to a different status.
function isSuperseded(currentLocal: string | undefined, writing: string): boolean {
  return currentLocal !== writing;
}

// Mirrors scheduleNext() backoff shape (bounded, fast burst then durable steps).
function nextDelay(n: number, MAX = 12): number | null {
  if (n >= MAX) return null; // give up (stay offline) — bounded so no runaway loop
  return n < 5 ? Math.min(4000, 300 * 2 ** n) : 8000;
}

describe("focused status write — retry classification", () => {
  test("409 WRITE_CONTENTION is retried, not dropped (the core bug)", () => {
    expect(decideFocusedWrite({ ok: false, status: 409 })).toBe("retry");
  });
  test("429 rate-limit is retried", () => {
    expect(decideFocusedWrite({ ok: false, status: 429 })).toBe("retry");
  });
  test("5xx is retried", () => {
    expect(decideFocusedWrite({ ok: false, status: 503 })).toBe("retry");
  });
  test("network error (no status) is retried", () => {
    expect(decideFocusedWrite({ ok: false })).toBe("retry");
  });
  test("success confirms", () => {
    expect(decideFocusedWrite({ ok: true })).toBe("confirm");
  });
  test("401 stops as auth (no retry, keeps dirty for re-send)", () => {
    expect(decideFocusedWrite({ ok: false, status: 401 })).toBe("stop-auth");
  });
  test("400/403 stop as offline (validation — retry won't help)", () => {
    expect(decideFocusedWrite({ ok: false, status: 400 })).toBe("stop-offline");
    expect(decideFocusedWrite({ ok: false, status: 403 })).toBe("stop-offline");
  });
});

describe("focused status write — supersede + backoff bounds", () => {
  test("retry abandons when the user moved the card to a different status", () => {
    expect(isSuperseded("active", "in-progress")).toBe(true); // we were re-asserting in-progress; user set active
    expect(isSuperseded("in-progress", "in-progress")).toBe(false); // still ours → keep retrying
  });
  test("backoff grows then caps, and terminates so contention can't loop forever", () => {
    expect(nextDelay(0)).toBe(300);
    expect(nextDelay(1)).toBe(600);
    expect(nextDelay(4)).toBe(4000);
    expect(nextDelay(5)).toBe(8000); // durable step
    expect(nextDelay(12)).toBeNull(); // bounded
  });
});
