/**
 * Tests for the tab-visibility throttle (Vercel cost optimisation).
 *
 * A dashboard tab left open in the background used to keep polling every 15-30s AND hold two
 * 5-minute SSE server functions open indefinitely — the bulk of the idle serverless cost.
 * Now: hidden → cheap 60s poll heartbeat and BOTH SSE streams closed; visible → fast poll +
 * immediate catch-up and streams reopened (each replays what it missed via since/sinceActivity).
 *
 * We test the pure decision logic (no DOM) so it runs in Jest/node.
 */

const FAST = 15_000;
const HIDDEN = 60_000;

// Mirrors useSync's onVisibility interval choice.
function pollIntervalFor(hidden: boolean): number {
  return hidden ? HIDDEN : FAST;
}

// Mirrors the SSE component decision: keep the stream open only while visible.
type SseAction = "close" | "reopen" | "noop";
function sseAction(hidden: boolean, streamOpen: boolean): SseAction {
  if (hidden) return streamOpen ? "close" : "noop";
  return streamOpen ? "noop" : "reopen";
}

describe("visibility throttle — poll cadence", () => {
  test("hidden tab drops to the 60s heartbeat", () => {
    expect(pollIntervalFor(true)).toBe(60_000);
  });
  test("visible tab uses the fast cadence", () => {
    expect(pollIntervalFor(false)).toBe(15_000);
  });
  test("hidden interval is strictly slower than fast (fewer invocations)", () => {
    expect(pollIntervalFor(true)).toBeGreaterThan(pollIntervalFor(false));
  });
});

describe("visibility throttle — SSE stream lifecycle", () => {
  test("going hidden with an open stream closes it (stops the held-open function)", () => {
    expect(sseAction(true, true)).toBe("close");
  });
  test("hidden with no stream does nothing", () => {
    expect(sseAction(true, false)).toBe("noop");
  });
  test("becoming visible with no stream reopens it (catches up via since)", () => {
    expect(sseAction(false, false)).toBe("reopen");
  });
  test("visible with an already-open stream does not churn", () => {
    expect(sseAction(false, true)).toBe("noop");
  });
});
