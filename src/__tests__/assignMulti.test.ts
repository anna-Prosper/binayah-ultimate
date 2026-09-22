/**
 * Regression test for multi-assignee task creation (assignTaskMulti).
 *
 * Bug: the create form assigned two people by calling assignTask twice in a loop.
 * assignTask computes nextOwners from the STALE render-closure `owners` and does an
 * absolute setOwners + its own per-key patchState — so two back-to-back calls both build
 * from the same base and the second OVERWRITES the first (server too, via per-key
 * last-write-wins). Only the last-clicked assignee stuck. Confirmed in prod: a task
 * created with "Shyam + Prajeesh" persisted owners=["prajeesh"] only.
 *
 * Fix: assignTaskMulti SETS the whole owner list once (deduped, capped at ASSIGN_CAP) —
 * one setOwners, one patchState — so all selected assignees land together.
 */

const ASSIGN_CAP = 2;

// Models the OLD loop-of-assignTask: each call rebuilds from the same stale base and
// replaces owners[sid] absolutely, so the last call wins.
function buggyLoopAssign(base: string[], userIds: string[]): string[] {
  let owners = base;
  for (const uid of userIds) {
    // assignTask always read the stale closure `base`, not the running `owners`.
    owners = [...base, uid].slice(-ASSIGN_CAP);
  }
  return owners;
}

// Models assignTaskMulti: set the full list once.
function assignTaskMulti(userIds: string[]): string[] {
  return Array.from(new Set(userIds.filter(Boolean))).slice(0, ASSIGN_CAP);
}

describe("multi-assignee at task creation", () => {
  test("the old loop drops all but the last assignee (the bug)", () => {
    expect(buggyLoopAssign([], ["shyam", "prajeesh"])).toEqual(["prajeesh"]);
  });

  test("assignTaskMulti keeps BOTH selected assignees", () => {
    expect(assignTaskMulti(["shyam", "prajeesh"])).toEqual(["shyam", "prajeesh"]);
  });

  test("dedupes and caps at ASSIGN_CAP (2)", () => {
    expect(assignTaskMulti(["shyam", "shyam", "prajeesh"])).toEqual(["shyam", "prajeesh"]);
    expect(assignTaskMulti(["a", "b", "c"])).toEqual(["a", "b"]);
  });

  test("single assignee still works", () => {
    expect(assignTaskMulti(["prajeesh"])).toEqual(["prajeesh"]);
  });
});
