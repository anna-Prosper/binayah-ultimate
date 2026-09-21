/**
 * Regression guard for the "another session's task change snapped back" bug
 * (sync-invariant #5).
 *
 * Root cause: MAP slices merge last-write-wins per key on the server, but the
 * client pushed the WHOLE map on every write (and in the 60s reconciliation
 * snapshot). So a value the sender only READ was re-asserted and clobbered
 * another session's concurrent edit to that key. The fix sends ONLY the keys a
 * client actually edited (dirtyMapKeysRef) — the same treatment stageStatusOverrides
 * and subtaskStages already had, extended to every per-task metadata map.
 *
 * These tests read the real ModelContext source and assert:
 *  1. every dirty-keyed slice is declared in DIRTY_KEYED_MAP_SLICES, and
 *  2. none of them is a bare key in buildFullState's always-full state literal
 *     (which would re-introduce the whole-map clobber).
 * Re-adding a slice to the literal, or dropping it from the set, fails CI.
 */

import { readFileSync } from "fs";
import { join } from "path";

const SRC = readFileSync(
  join(__dirname, "..", "lib", "contexts", "ModelContext.tsx"),
  "utf8",
);

// The per-task metadata maps that must be sent as dirty-keys-only (excludes
// customStages, which is union-merged and safe to send whole).
const DIRTY_KEYED = [
  "owners",
  "stageStatusOverrides",
  "stageDescOverrides",
  "stageDueDates",
  "stageNameOverrides",
  "stagePriorities",
  "stagePointsOverride",
  "subtaskStages",
  "subtaskDescOverrides",
  "subtaskDueDates",
  "pipeDescOverrides",
  "pipeMetaOverrides",
  "inboxStageWorkspace",
];

function dirtyKeyedSetContents(src: string): string {
  const anchor = "const DIRTY_KEYED_MAP_SLICES = new Set<string>([";
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error("DIRTY_KEYED_MAP_SLICES declaration not found");
  const end = src.indexOf("]);", at);
  if (end === -1) throw new Error("DIRTY_KEYED_MAP_SLICES close not found");
  return src.slice(at, end);
}

// The object literal assigned to `state` inside buildFullState — the "always sent
// whole" slices. Runs from the declaration to its closing `};` at 4-space indent.
function buildFullStateLiteral(src: string): string {
  const anchor = "const state: Record<string, unknown> = {";
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error("buildFullState state literal not found");
  const end = src.indexOf("\n    };", at);
  if (end === -1) throw new Error("buildFullState state literal close not found");
  return src.slice(at + anchor.length, end);
}

describe("dirty-keyed MAP slice sync (sync-invariant #5)", () => {
  const setSrc = dirtyKeyedSetContents(SRC);
  const literal = buildFullStateLiteral(SRC);

  it.each(DIRTY_KEYED)("%s is declared in DIRTY_KEYED_MAP_SLICES", (slice) => {
    expect(setSrc).toContain(`"${slice}"`);
  });

  it.each(DIRTY_KEYED)("%s is NOT a bare key in the always-full state literal", (slice) => {
    // A bare property is `<slice>,` or `<slice>:` at a property position. The literal
    // must not list these — they are emitted as dirty-keys-only just below it.
    const bareKey = new RegExp(`(^|[\\s{])${slice}\\s*[,:}]`);
    expect(bareKey.test(literal)).toBe(false);
  });

  it("buildFullState emits the slices via a dirty-keys loop", () => {
    expect(SRC).toContain("for (const slice of DIRTY_KEYED_MAP_SLICES)");
  });

  it("customStages is still sent whole (union-merged, not dirty-keyed)", () => {
    expect(/(^|[\s{])customStages\s*[,:}]/.test(literal)).toBe(true);
    expect(setSrc).not.toContain('"customStages"');
  });
});

describe("status slices are focused-only (server strips them from bulk patches)", () => {
  it("declares FOCUSED_ONLY_STATUS_SLICES with both status slices", () => {
    const at = SRC.indexOf("const FOCUSED_ONLY_STATUS_SLICES = new Set<string>([");
    expect(at).toBeGreaterThan(-1);
    const block = SRC.slice(at, SRC.indexOf("]);", at));
    expect(block).toContain('"stageStatusOverrides"');
    expect(block).toContain('"subtaskStages"');
  });

  it("buildFullState skips focused-only status slices in the bulk delta", () => {
    // The dirty-keys emission loop must `continue` on FOCUSED_ONLY_STATUS_SLICES,
    // else a bulk envelope carries a status the server silently strips and
    // onWriteSuccess wrongly marks it confirmed (status reverts).
    expect(SRC).toContain("if (FOCUSED_ONLY_STATUS_SLICES.has(slice)) continue;");
  });
});

describe("migrateSubtask propagates the old-stage removal (no dedup snap-back)", () => {
  it("queueDeletes the old subtask member on migrate", () => {
    // Without this, the server keeps the subtask under the old stage and
    // dedupeSubtasksAcrossStages converges the id back — the move reverts.
    const at = SRC.indexOf("const migrateSubtask = useCallback(");
    expect(at).toBeGreaterThan(-1);
    const body = SRC.slice(at, at + 2000);
    expect(body).toContain('queueDelete("subtasks", `${oldParent}::${subtaskId}`)');
    expect(body).toContain("unconfirmedSubtaskKeysRef.current.add(`${newParentStageId}::${subtaskId}`)");
  });
});
