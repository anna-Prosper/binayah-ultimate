/**
 * Regression tests for per-key, ledger-based reconciliation of dirty-keyed MAP slices
 * (ModelContext.applyKeyedMapFromServer).
 *
 * Bug (root of "I move a card to done and it comes back"): on every poll the status /
 * owner / due / priority / name / points map slices were WHOLE-MAP replaced with the
 * server's copy, gated only by a 10s slice-wide time window. Any pending local change
 * that outlived the window (slow write, 409 contention, retry backoff) was reverted by
 * the next poll — and it reverted the whole slice, not just the changed key.
 *
 * Fix: server wins for every key EXCEPT keys with an unconfirmed local write
 * (dirtyMapKeysRef). Those keep their local value (or stay locally deleted) until the
 * write confirms and the key clears; then a later poll accepts the now-equal server
 * value. No time window. A locally changed key can't be reverted by a poll while its
 * write is in flight.
 *
 * These test the pure reconciliation logic (no React) so they run in Jest/node.
 */

// Mirrors applyKeyedMapFromServer's setter body.
function reconcile(
  serverVal: Record<string, unknown>,
  prev: Record<string, unknown>,
  dirty: Set<string>,
  isInitialHydrate: boolean,
): Record<string, unknown> {
  if (isInitialHydrate) return { ...serverVal, ...prev }; // local precedence on first hydrate
  if (dirty.size === 0) return serverVal; // no pending local writes → server wins wholesale
  const next: Record<string, unknown> = { ...serverVal };
  for (const k of dirty) {
    if (Object.prototype.hasOwnProperty.call(prev, k)) next[k] = prev[k];
    else delete next[k];
  }
  return next;
}

describe("keyed-map reconciliation — poll (not initial hydrate)", () => {
  test("clean key: server value wins", () => {
    const out = reconcile({ A: "planned" }, { A: "in-progress" }, new Set(), false);
    expect(out.A).toBe("planned");
  });

  test("dirty key: local value is preserved even when the server disagrees (the fix)", () => {
    // User moved A to active; server poll still says in-progress (write not yet confirmed).
    const out = reconcile({ A: "in-progress", B: "planned" }, { A: "active", B: "planned" }, new Set(["A"]), false);
    expect(out.A).toBe("active");  // NOT reverted
    expect(out.B).toBe("planned"); // untouched key still takes server value
  });

  test("dirty deletion: a locally-removed key stays gone, server can't resurrect it", () => {
    // User cleared A's due date (A absent locally) but the write hasn't confirmed.
    const out = reconcile({ A: "2026-07-01", B: "2026-08-01" }, { B: "2026-08-01" }, new Set(["A"]), false);
    expect("A" in out).toBe(false);
    expect(out.B).toBe("2026-08-01");
  });

  test("after the write confirms (key no longer dirty): server value applies", () => {
    // Same server value, but dirty set is now empty → server wins, local 'active' converges.
    const out = reconcile({ A: "active" }, { A: "active" }, new Set(), false);
    expect(out.A).toBe("active");
  });

  test("other users' changes to non-dirty keys appear immediately (no protection lag)", () => {
    const out = reconcile({ A: "active", C: "blocked" }, { A: "active" }, new Set(), false);
    expect(out.C).toBe("blocked");
  });

  test("multiple dirty keys preserved together while others reconcile", () => {
    const server = { A: "planned", B: "planned", C: "active" };
    const prev = { A: "active", B: "in-progress", C: "planned" };
    const out = reconcile(server, prev, new Set(["A", "B"]), false);
    expect(out).toEqual({ A: "active", B: "in-progress", C: "active" });
  });
});

describe("keyed-map reconciliation — initial hydrate", () => {
  test("local precedence so an in-flight keepalive write doesn't flash the stale value", () => {
    const out = reconcile({ A: "planned", B: "planned" }, { A: "active" }, new Set(), true);
    expect(out.A).toBe("active"); // local kept
    expect(out.B).toBe("planned"); // server-only key present
  });
});
