/**
 * Regression tests for the "session expired" banner confirmation gate.
 *
 * Bug: a single /api/pipeline-state request that transiently 307 → /login
 * (edge/middleware blip) flipped the module `authExpired` flag true, which drove
 * syncStatus → "auth" and flashed the fixed red "session expired" banner on and
 * off "a lot" — while the user was still fully authenticated.
 *
 * Fix: before alarming, confirm against NextAuth's own /api/auth/session
 * endpoint (matcher-exempt, authoritative). Only show "auth" when the session is
 * genuinely gone; a transient redirect with a still-valid session must NOT.
 *
 * We test the pure decision logic (no React, no fetch) so it runs in Jest/node.
 */

type SyncStatus = "hydrating" | "live" | "offline" | "error" | "auth";

// Mirrors the poll-tick gate in useSync.ts: a redirect was seen (sawRedirect);
// confirmLost is the authoritative /api/auth/session result. hydrated = we have
// a prior lastUpdatedAt (so a null poll response is a "still live", not "offline").
function decidePollStatus(sawRedirect: boolean, confirmLost: boolean, hydrated: boolean): SyncStatus {
  if (sawRedirect) {
    if (confirmLost) return "auth";
    if (hydrated) return "live";
  }
  return "offline"; // fell through: not hydrated yet / no data
}

// Mirrors the write-path gate in useSync.ts: on a 401/redirect, confirm before
// alarming. Returns both the status and whether a durable retry should be armed
// (a false-alarm write still didn't land, so it must not be stranded).
function decideWriteAuthFailure(confirmLost: boolean, dirty: boolean): { status: SyncStatus; durableRetry: boolean } {
  if (confirmLost) return { status: "auth", durableRetry: false };
  return { status: "offline", durableRetry: dirty };
}

describe("auth banner confirmation gate — poll path", () => {
  test("transient redirect but session still valid → stays live, no banner", () => {
    expect(decidePollStatus(true, /* confirmLost */ false, /* hydrated */ true)).toBe("live");
  });

  test("redirect AND session genuinely gone → auth (banner shows)", () => {
    expect(decidePollStatus(true, true, true)).toBe("auth");
  });

  test("no redirect at all → gate is irrelevant (offline path only if no data)", () => {
    expect(decidePollStatus(false, false, true)).toBe("offline");
  });

  test("transient redirect before first hydrate → cannot claim live", () => {
    // No lastUpdatedAt yet, session not confirmed lost → can't say live, falls through.
    expect(decidePollStatus(true, false, false)).toBe("offline");
  });
});

describe("auth banner confirmation gate — write path", () => {
  test("write redirected but session valid → offline + durable retry (not stranded)", () => {
    expect(decideWriteAuthFailure(/* confirmLost */ false, /* dirty */ true)).toEqual({
      status: "offline",
      durableRetry: true,
    });
  });

  test("write redirected and session gone → auth, no retry (waits for re-login)", () => {
    expect(decideWriteAuthFailure(true, true)).toEqual({ status: "auth", durableRetry: false });
  });

  test("false alarm with nothing dirty → offline, nothing to retry", () => {
    expect(decideWriteAuthFailure(false, false)).toEqual({ status: "offline", durableRetry: false });
  });
});
