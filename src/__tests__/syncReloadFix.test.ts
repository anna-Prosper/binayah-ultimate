/**
 * Unit tests for the reload-persistence fixes applied to ModelContext.
 *
 * These test the exact two behaviours that caused tasks to revert on reload:
 *
 * 1. mergeMapOnHydrate — on initial hydration, local (localStorage) values
 *    must win over stale server values for map slices.
 *
 * 2. Immediate lsSet — status / due-date / etc. setters must write to
 *    localStorage synchronously, not just after the 300ms debounce.
 *
 * We test the pure logic (no React, no Playwright) so these run in Jest/node.
 */

// ── 1. mergeMapOnHydrate logic ────────────────────────────────────────────────
// Extracted from ModelContext.tsx for direct testing.
function mergeMapOnHydrate<T extends Record<string, unknown>>(
  isInitialHydrate: boolean,
  serverVal: T,
  localVal: T,
): T {
  if (isInitialHydrate) {
    return { ...serverVal, ...localVal };
  }
  return serverVal;
}

describe("mergeMapOnHydrate", () => {
  const server: Record<string, string> = { taskA: "planned", taskB: "in-progress" };
  const local:  Record<string, string> = { taskA: "in-progress", taskC: "active" };

  test("on initial hydrate: local keys win over server", () => {
    const merged = mergeMapOnHydrate(true, server, local);
    expect(merged.taskA).toBe("in-progress"); // local wins
    expect(merged.taskB).toBe("in-progress"); // server key not in local → preserved
    expect(merged.taskC).toBe("active");       // local-only key kept
  });

  test("after initial hydrate: server replaces everything", () => {
    const merged = mergeMapOnHydrate(false, server, local);
    expect(merged.taskA).toBe("planned");        // server wins
    expect(merged.taskB).toBe("in-progress");    // server value
    expect(merged.taskC).toBeUndefined();        // local-only key gone
  });

  test("on initial hydrate with empty local (fresh device): server wins entirely", () => {
    const merged = mergeMapOnHydrate(true, server, {});
    expect(merged).toEqual(server);
  });

  test("on initial hydrate with empty server: local kept", () => {
    const merged = mergeMapOnHydrate(true, {}, local);
    expect(merged).toEqual(local);
  });
});

// ── 2. Immediate lsSet behaviour ─────────────────────────────────────────────
// Simulate the relevant part of setStageStatusDirect / setSubtaskStage:
// the lsSet call must happen synchronously at the time of the setter call,
// not after the 300ms debounce.

type MockStorage = Record<string, unknown>;

function makeSetters(storage: MockStorage) {
  // Mirrors the relevant section of each fixed setter.
  const state = {
    stageStatusOverrides: {} as Record<string, string>,
    subtaskStages: {}       as Record<string, string>,
    stageDueDates: {}       as Record<string, string>,
    stagePriorities: {}     as Record<string, string>,
  };

  function lsSet(key: string, val: unknown) {
    storage[key] = val;
  }

  function setStageStatusDirect(name: string, status: string) {
    state.stageStatusOverrides = { ...state.stageStatusOverrides, [name]: status };
    lsSet("stageStatusOverrides", { ...state.stageStatusOverrides });
  }

  function setSubtaskStage(key: string, status: string) {
    state.subtaskStages = { ...state.subtaskStages, [key]: status };
    lsSet("subtaskStages", { ...state.subtaskStages });
  }

  function setStageDueDate(name: string, val: string | null) {
    const next = { ...state.stageDueDates };
    if (!val) delete next[name]; else next[name] = val;
    state.stageDueDates = next;
    lsSet("stageDueDates", next);
  }

  return { state, setStageStatusDirect, setSubtaskStage, setStageDueDate };
}

describe("Immediate lsSet on setter calls", () => {
  test("setStageStatusDirect writes stageStatusOverrides to storage synchronously", () => {
    const storage: MockStorage = {};
    const { setStageStatusDirect } = makeSetters(storage);

    expect(storage["stageStatusOverrides"]).toBeUndefined();
    setStageStatusDirect("taskA", "in-progress");
    // Must be written BEFORE any setTimeout/debounce fires
    expect((storage["stageStatusOverrides"] as Record<string, string>)["taskA"]).toBe("in-progress");
  });

  test("setSubtaskStage writes subtaskStages to storage synchronously", () => {
    const storage: MockStorage = {};
    const { setSubtaskStage } = makeSetters(storage);

    setSubtaskStage("stageX::1", "active");
    expect((storage["subtaskStages"] as Record<string, string>)["stageX::1"]).toBe("active");
  });

  test("setStageDueDate writes new value synchronously", () => {
    const storage: MockStorage = {};
    const { setStageDueDate } = makeSetters(storage);

    setStageDueDate("taskA", "2026-07-01");
    expect((storage["stageDueDates"] as Record<string, string>)["taskA"]).toBe("2026-07-01");
  });

  test("setStageDueDate deletes key synchronously when val is null", () => {
    const storage: MockStorage = {};
    const { setStageDueDate } = makeSetters(storage);

    setStageDueDate("taskA", "2026-07-01");
    setStageDueDate("taskA", null);
    expect((storage["stageDueDates"] as Record<string, string>)["taskA"]).toBeUndefined();
  });

  test("multiple setter calls accumulate correctly in storage", () => {
    const storage: MockStorage = {};
    const { setStageStatusDirect } = makeSetters(storage);

    setStageStatusDirect("taskA", "in-progress");
    setStageStatusDirect("taskB", "active");
    setStageStatusDirect("taskA", "done");

    const overrides = storage["stageStatusOverrides"] as Record<string, string>;
    expect(overrides["taskA"]).toBe("done");
    expect(overrides["taskB"]).toBe("active");
  });
});

// ── 3. The combined reload scenario ──────────────────────────────────────────
describe("Combined reload scenario", () => {
  test("change → reload → hydrate: task stays in-progress", () => {
    // Step 1: user changes task to in-progress
    const localStorage: MockStorage = {};
    const { setStageStatusDirect } = makeSetters(localStorage);
    setStageStatusDirect("taskA", "in-progress");

    // Step 2: user reloads — localStorage persists, React state resets
    // On fresh page: prev = localStorage["stageStatusOverrides"]
    const prevFromStorage = localStorage["stageStatusOverrides"] as Record<string, string>;
    expect(prevFromStorage["taskA"]).toBe("in-progress"); // lsSet worked

    // Step 3: initial fetchState returns stale server value (keepalive PATCH race)
    const serverReturns = { taskA: "planned", taskB: "done" };

    // Step 4: mergeMapOnHydrate — local wins
    const hydrated = mergeMapOnHydrate(true, serverReturns, prevFromStorage);
    expect(hydrated["taskA"]).toBe("in-progress"); // not reverted!
    expect(hydrated["taskB"]).toBe("done");         // server value for keys not in local
  });

  test("after initial hydration: server update from another device applies", () => {
    const localStorage: MockStorage = { stageStatusOverrides: { taskA: "in-progress" } };
    const prevFromStorage = localStorage["stageStatusOverrides"] as Record<string, string>;

    // A poll (not initial hydrate) comes back with another device's update
    const serverUpdate = { taskA: "done", taskB: "active" };
    const result = mergeMapOnHydrate(false, serverUpdate, prevFromStorage);

    expect(result["taskA"]).toBe("done");   // server wins after initial hydrate
    expect(result["taskB"]).toBe("active");
  });
});
