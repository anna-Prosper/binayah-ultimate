/**
 * Regression guard for the "daily checklist unchecks itself on reload" bug.
 *
 * Root cause: ModelContext persists a mutation only when the write-trigger
 * effect re-runs, and that effect re-runs only when one of the state slices in
 * its dependency array changes. `dailyDone` and `dailyChecklistItems` were
 * mutated via markLocalWrite (bumping the action counter) + setState, but were
 * MISSING from the effect's dependency array — so a daily toggle changed local
 * state without ever firing writeNow(). It persisted only when some unrelated
 * tracked action happened to fire the effect moments later (hence "sometimes"),
 * and on reload the poll hydrate replaced the local check with the unchecked
 * server copy.
 *
 * These tests read the real ModelContext source and assert the write-trigger
 * effect depends on the daily slices, so re-introducing the omission fails CI.
 */

import { readFileSync } from "fs";
import { join } from "path";

const SRC = readFileSync(
  join(__dirname, "..", "lib", "contexts", "ModelContext.tsx"),
  "utf8",
);

/**
 * Extract the dependency array of the write-trigger effect. The effect is
 * uniquely identified by the counter-gate guard it runs before scheduling a
 * write; we then read the `}, [ ... ]);` dependency list that closes it.
 */
function writeTriggerDeps(src: string): string[] {
  const anchor = "if (userActionCounterRef.current === lastWrittenActionRef.current) return;";
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error("write-trigger effect anchor not found — did the guard change?");
  // The dependency array is the first `}, [ ... ]);` after the anchor.
  const depsStart = src.indexOf("}, [", at);
  const depsEnd = src.indexOf("]", depsStart);
  if (depsStart === -1 || depsEnd === -1) throw new Error("write-trigger dep array not found");
  return src
    .slice(depsStart + 4, depsEnd)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

describe("daily checklist write persistence", () => {
  const deps = writeTriggerDeps(SRC);

  test("write-trigger effect depends on dailyDone (checking an item persists)", () => {
    expect(deps).toContain("dailyDone");
  });

  test("write-trigger effect depends on dailyChecklistItems (item edits persist)", () => {
    expect(deps).toContain("dailyChecklistItems");
  });

  // Broader guard: every slice that is (a) sent by buildFullState and (b) mutated
  // through a plain setter must be in the write-trigger deps, or its mutations
  // silently never flush. This pins the known-good set so a NEW slice added
  // without a dep entry — the exact mistake that caused this bug — fails here.
  test("write-trigger depends on all plainly-persisted slices", () => {
    const mustDepend = [
      "owners", "subtasks", "subtaskStages", "customStages", "customPipelines",
      "stageStatusOverrides", "stageNameOverrides", "stageDueDates",
      "archivedStages", "archivedPipelines", "archivedSubtasks",
      "inboxStageWorkspace", "workspaces", "timelineEvents", "notes", "bugs",
      "usefulLinks", "execProposals", "reminders", "databases",
      "dailyDone", "dailyChecklistItems",
    ];
    const missing = mustDepend.filter(s => !deps.includes(s));
    expect(missing).toEqual([]);
  });
});
