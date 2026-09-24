/**
 * Regression tests for sending only CHANGED databases in the delta write.
 *
 * Bug: every database cell edit shipped the WHOLE `databases` slice (~500KB, all 12 dbs).
 * That large, slow read-modify-write kept losing the updatedAt CAS to faster concurrent
 * writes (activity/status pushes, other tabs) and got dropped — the intermittent "changes
 * not saved yet — retrying / row vanishes on reload" report for the databases view.
 *
 * Fix: diff each db against the server baseline and send only the ones that differ.
 * Safe by construction: a db the client didn't edit matches the baseline (never re-sent →
 * no row resurrection), and a db it DID edit differs until confirmed (never dropped).
 *
 * Pure logic (no React) so it runs in Jest/node.
 */

type Db = { id: number | string; rows: { id: number; v?: string }[] };

// Mirrors the filter in getCurrentState.
function changedDatabases(all: Db[], baseline: Map<string, string>): Db[] {
  return all.filter(db => baseline.get(String(db.id)) !== JSON.stringify(db));
}

function makeBaseline(dbs: Db[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const db of dbs) m.set(String(db.id), JSON.stringify(db));
  return m;
}

describe("databases delta — send only what changed", () => {
  const A: Db = { id: 1, rows: [{ id: 10, v: "a" }] };
  const B: Db = { id: 2, rows: [{ id: 20, v: "b" }] };

  test("editing one db sends ONLY that db, not the whole slice", () => {
    const baseline = makeBaseline([A, B]);
    const editedA: Db = { id: 1, rows: [{ id: 10, v: "a" }, { id: 11, v: "new" }] };
    const out = changedDatabases([editedA, B], baseline);
    expect(out).toEqual([editedA]);
  });

  test("nothing changed → nothing sent (local equals server, no resurrection)", () => {
    const baseline = makeBaseline([A, B]);
    expect(changedDatabases([A, B], baseline)).toEqual([]);
  });

  test("a brand-new db (absent from baseline) is sent", () => {
    const baseline = makeBaseline([A]);
    const out = changedDatabases([A, B], baseline);
    expect(out).toEqual([B]);
  });

  test("a db another user changed (already applied locally + baseline refreshed) is NOT re-sent", () => {
    // Poll brought B' from the server; baseline and local both hold B'. We didn't touch it.
    const Bp: Db = { id: 2, rows: [{ id: 20, v: "b" }, { id: 21, v: "theirs" }] };
    const baseline = makeBaseline([A, Bp]);
    expect(changedDatabases([A, Bp], baseline)).toEqual([]);
  });

  test("after confirm updates the baseline, the same edit is not re-sent", () => {
    const baseline = makeBaseline([A, B]);
    const editedA: Db = { id: 1, rows: [{ id: 10, v: "a" }, { id: 11, v: "new" }] };
    expect(changedDatabases([editedA, B], baseline)).toEqual([editedA]); // first send
    baseline.set("1", JSON.stringify(editedA)); // onWriteSuccess
    expect(changedDatabases([editedA, B], baseline)).toEqual([]); // no re-send
  });
});
