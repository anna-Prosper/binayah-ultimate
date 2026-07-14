import { mergeStateWithPatch } from "@/lib/pipelineStateMerge";

// ── Map slices: per-key merge ──────────────────────────────────────────────────

describe("map slices (stageStatusOverrides, owners, etc.)", () => {
  it("adds new keys without erasing existing ones", () => {
    const current = { stageStatusOverrides: { "Stage A": "concept" } };
    const patch = { stageStatusOverrides: { "Stage B": "active" } };
    const next = mergeStateWithPatch(current, patch);
    expect(next.stageStatusOverrides).toEqual({ "Stage A": "concept", "Stage B": "active" });
  });

  it("updates an existing key", () => {
    const current = { stageStatusOverrides: { "Stage A": "concept" } };
    const patch = { stageStatusOverrides: { "Stage A": "in-progress" } };
    const next = mergeStateWithPatch(current, patch);
    expect((next.stageStatusOverrides as Record<string, string>)["Stage A"]).toBe("in-progress");
  });

  it("a stale client missing a key does not erase server keys", () => {
    // Simulate stale client: patch has only Stage B, server had Stage A already
    const current = { owners: { "Stage A": ["anna"], "Stage B": ["usama"] } };
    const patch = { owners: { "Stage B": ["usama", "aakarshit"] } };
    const next = mergeStateWithPatch(current, patch);
    expect((next.owners as Record<string, string[]>)["Stage A"]).toEqual(["anna"]);
    expect((next.owners as Record<string, string[]>)["Stage B"]).toEqual(["usama", "aakarshit"]);
  });
});

// ── Map slice _deletes ────────────────────────────────────────────────────────

describe("_deletes for map slices", () => {
  it("removes a specific key from a map slice", () => {
    const current = { stageStatusOverrides: { "Stage A": "concept", "Stage B": "active" } };
    const next = mergeStateWithPatch(current, {}, { stageStatusOverrides: ["Stage B"] });
    expect((next.stageStatusOverrides as Record<string, string>)["Stage A"]).toBe("concept");
    expect((next.stageStatusOverrides as Record<string, string>)["Stage B"]).toBeUndefined();
  });
});

// ── Array-by-id slices (execProposals, reminders, notes, bugs) ─────────────────

describe("array-by-id slices", () => {
  it("adds new items without losing existing ones", () => {
    const current = { execProposals: [{ id: 1, title: "old" }] };
    const patch = { execProposals: [{ id: 2, title: "new" }] };
    const next = mergeStateWithPatch(current, patch);
    const eps = next.execProposals as { id: number; title: string }[];
    expect(eps.find(p => p.id === 1)?.title).toBe("old");
    expect(eps.find(p => p.id === 2)?.title).toBe("new");
  });

  it("updates an existing item by id", () => {
    const current = { bugs: [{ id: 1, title: "old", status: "open" }] };
    const patch = { bugs: [{ id: 1, title: "updated", status: "fixed" }] };
    const next = mergeStateWithPatch(current, patch);
    const bugs = next.bugs as { id: number; title: string; status: string }[];
    expect(bugs).toHaveLength(1);
    expect(bugs[0].title).toBe("updated");
    expect(bugs[0].status).toBe("fixed");
  });

  it("_deletes removes by id string", () => {
    const current = { reminders: [{ id: 1, title: "a" }, { id: 2, title: "b" }] };
    const next = mergeStateWithPatch(current, {}, { reminders: ["1"] });
    const reminders = next.reminders as { id: number }[];
    expect(reminders.find(r => r.id === 1)).toBeUndefined();
    expect(reminders.find(r => r.id === 2)).toBeDefined();
  });
});

// ── Set-like slices (approvedStages, archivedStages, etc.) ────────────────────

describe("set-like slices", () => {
  it("unions incoming with existing", () => {
    const current = { approvedStages: ["A", "B"] };
    const patch = { approvedStages: ["B", "C"] };
    const next = mergeStateWithPatch(current, patch);
    expect(new Set(next.approvedStages as string[])).toEqual(new Set(["A", "B", "C"]));
  });

  it("_deletes removes members from set", () => {
    const current = { archivedStages: ["A", "B", "C"] };
    const next = mergeStateWithPatch(current, {}, { archivedStages: ["B"] });
    expect(next.archivedStages).not.toContain("B");
    expect(next.archivedStages).toContain("A");
    expect(next.archivedStages).toContain("C");
  });
});

// ── Subtasks: inner-array merge by id ─────────────────────────────────────────

describe("subtasks inner-array merge", () => {
  it("merges subtasks per stage by id without losing concurrent additions", () => {
    // Client 1 sends their full array (missing subtask 2 added by client 2)
    const patch = {
      subtasks: {
        "Stage A": [{ id: 1, text: "first", done: true, by: "anna" }],
      },
    };
    // Simulate: server already has subtask 2 (from another client)
    const serverState = {
      subtasks: {
        "Stage A": [
          { id: 1, text: "first", done: false, by: "anna" },
          { id: 2, text: "second", done: false, by: "usama" },
        ],
      },
    };
    const next = mergeStateWithPatch(serverState, patch);
    const stageA = (next.subtasks as Record<string, { id: number; done: boolean }[]>)["Stage A"];
    // Subtask 1 should be updated (done=true)
    expect(stageA.find(s => s.id === 1)?.done).toBe(true);
    // Subtask 2 should still be there
    expect(stageA.find(s => s.id === 2)).toBeDefined();
  });

  it("_deletes removes a specific subtask by stage::id notation", () => {
    const current = {
      subtasks: {
        "Stage A": [
          { id: 1, text: "keep", done: false, by: "anna" },
          { id: 2, text: "remove", done: false, by: "usama" },
        ],
      },
    };
    const next = mergeStateWithPatch(current, {}, { subtasks: ["Stage A::2"] });
    const stageA = (next.subtasks as Record<string, { id: number }[]>)["Stage A"];
    expect(stageA.find(s => s.id === 1)).toBeDefined();
    expect(stageA.find(s => s.id === 2)).toBeUndefined();
  });
});

// ── Reactions: inner emoji set-union ──────────────────────────────────────────

describe("reactions inner merge", () => {
  it("unions emoji user lists — no user erasure from concurrent reactions", () => {
    const current = {
      reactions: { "Stage A": { "🔥": ["anna"] } },
    };
    const patch = {
      reactions: { "Stage A": { "🔥": ["usama"] } }, // usama's tab doesn't know anna reacted
    };
    const next = mergeStateWithPatch(current, patch);
    const fire = (next.reactions as Record<string, Record<string, string[]>>)["Stage A"]["🔥"];
    expect(fire).toContain("anna");
    expect(fire).toContain("usama");
  });
});

// ── Non-classified slices: full replace ───────────────────────────────────────

describe("identity-critical slices (users, workspaces)", () => {
  it("merges by id (keep-existing) so a stale client can't shrink them", () => {
    // Stale client's patch is missing anna — she must survive the merge.
    const current = { users: [{ id: "anna" }, { id: "usama" }] };
    const patch = { users: [{ id: "usama", name: "Usama" }] };
    const next = mergeStateWithPatch(current, patch) as { users: { id: string; name?: string }[] };
    expect(next.users.map(u => u.id).sort()).toEqual(["anna", "usama"]);
    expect(next.users.find(u => u.id === "usama")?.name).toBe("Usama"); // updated in place
  });

  it("still replaces a genuinely unclassified field wholesale", () => {
    const current = { activityLog: [{ type: "a" }, { type: "b" }] };
    const patch = { activityLog: [{ type: "c" }] };
    const next = mergeStateWithPatch(current, patch) as { activityLog: { type: string }[] };
    expect(next.activityLog).toEqual([{ type: "c" }]);
  });
});

// ── Databases: row-level merge (guards against multi-user row clobber) ─────────

describe("databases row-level merge", () => {
  const db = (rows: { id: number; v: string }[], extra: object = {}) => ({
    id: 1, name: "Content", columns: [{ id: "c1", name: "V" }], rows, ...extra,
  });

  it("a stale tab missing new rows does NOT erase them (the Deepshikha bug)", () => {
    // Server has 3 rows (someone just added row 3). Stale tab still has rows 1-2.
    const current = { databases: [db([{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 3, v: "new" }])] };
    const patch = { databases: [db([{ id: 1, v: "a" }, { id: 2, v: "b" }])] };
    const next = mergeStateWithPatch(current, patch) as { databases: { rows: { id: number }[] }[] };
    expect(next.databases[0].rows.map(r => r.id)).toEqual([1, 2, 3]);
  });

  it("concurrent additions from two tabs both survive", () => {
    const current = { databases: [db([{ id: 1, v: "a" }, { id: 9, v: "tabA-add" }])] };
    const patch = { databases: [db([{ id: 1, v: "a" }, { id: 8, v: "tabB-add" }])] };
    const next = mergeStateWithPatch(current, patch) as { databases: { rows: { id: number }[] }[] };
    expect(next.databases[0].rows.map(r => r.id).sort()).toEqual([1, 8, 9]);
  });

  it("editing a row's cell updates in place, preserving order", () => {
    const current = { databases: [db([{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 3, v: "c" }])] };
    const patch = { databases: [db([{ id: 2, v: "EDITED" }])] };
    const next = mergeStateWithPatch(current, patch) as { databases: { rows: { id: number; v: string }[] }[] };
    expect(next.databases[0].rows).toEqual([{ id: 1, v: "a" }, { id: 2, v: "EDITED" }, { id: 3, v: "c" }]);
  });

  it("row removal propagates via _deletes (dbId::rowId)", () => {
    const current = { databases: [db([{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 3, v: "c" }])] };
    const patch = { databases: [db([{ id: 1, v: "a" }, { id: 3, v: "c" }])] };
    const next = mergeStateWithPatch(current, patch, { databases: ["1::2"] }) as { databases: { rows: { id: number }[] }[] };
    expect(next.databases[0].rows.map(r => r.id)).toEqual([1, 3]);
  });

  it("whole-database removal via bare id in _deletes", () => {
    const current = { databases: [db([{ id: 1, v: "a" }]), { id: 2, name: "Other", rows: [] }] };
    const patch = { databases: [] as unknown[] };
    const next = mergeStateWithPatch(current, patch, { databases: ["2"] }) as { databases: { id: number }[] };
    expect(next.databases.map(d => d.id)).toEqual([1]);
  });

  it("a new database is added wholesale", () => {
    const current = { databases: [db([{ id: 1, v: "a" }])] };
    const patch = { databases: [{ id: 5, name: "Brand New", columns: [], rows: [{ id: 1, v: "x" }] }] };
    const next = mergeStateWithPatch(current, patch) as { databases: { id: number }[] };
    expect(next.databases.map(d => d.id).sort()).toEqual([1, 5]);
  });

  it("does not blank columns when patch omits them", () => {
    const current = { databases: [db([{ id: 1, v: "a" }])] };
    const patch = { databases: [{ id: 1, name: "Content", rows: [{ id: 1, v: "a2" }] }] };
    const next = mergeStateWithPatch(current, patch) as { databases: { columns: unknown[] }[] };
    expect(next.databases[0].columns).toEqual([{ id: "c1", name: "V" }]);
  });
});

// ── Workspaces: by-id merge + array-field union (guards permission clobber) ────

describe("workspaces by-id merge", () => {
  const ws = (over: object = {}) => ({
    id: "marketing", name: "Marketing Hub", icon: "📣", colorKey: "amber",
    members: ["anna", "abdallah"], captains: ["anna", "abdallah"],
    pipelineIds: [], callSeriesFilters: ["Binayah SMM"], ...over,
  });

  it("a stale tab missing a captain does NOT drop it (the Abdallah bug)", () => {
    const current = { workspaces: [ws()] };
    // Stale tab only has anna as captain and no pinned series
    const patch = { workspaces: [ws({ captains: ["anna"], callSeriesFilters: [] })] };
    const next = mergeStateWithPatch(current, patch) as { workspaces: { captains: string[]; callSeriesFilters: string[] }[] };
    expect(next.workspaces[0].captains.sort()).toEqual(["abdallah", "anna"]);
    expect(next.workspaces[0].callSeriesFilters).toEqual(["Binayah SMM"]);
  });

  it("concurrent member additions from two tabs both survive", () => {
    const current = { workspaces: [ws({ members: ["anna", "prajeesh"] })] };
    const patch = { workspaces: [ws({ members: ["anna", "yasmine"] })] };
    const next = mergeStateWithPatch(current, patch) as { workspaces: { members: string[] }[] };
    expect(next.workspaces[0].members.sort()).toEqual(["anna", "prajeesh", "yasmine"]);
  });

  it("scalar fields (name/icon) take the incoming value", () => {
    const current = { workspaces: [ws({ name: "Marketing Hub" })] };
    const patch = { workspaces: [ws({ name: "Marketing" })] };
    const next = mergeStateWithPatch(current, patch) as { workspaces: { name: string }[] };
    expect(next.workspaces[0].name).toBe("Marketing");
  });

  it("removing a member propagates via _deletes (wsId::field::value)", () => {
    const current = { workspaces: [ws({ members: ["anna", "abdallah", "yasmine"] })] };
    const patch = { workspaces: [ws({ members: ["anna", "abdallah"] })] };
    const next = mergeStateWithPatch(current, patch, { workspaces: ["marketing::members::yasmine"] }) as { workspaces: { members: string[] }[] };
    expect(next.workspaces[0].members.sort()).toEqual(["abdallah", "anna"]);
  });

  it("deletes a whole workspace via an explicit bare-id _delete", () => {
    const current = { workspaces: [ws(), { id: "old", name: "Old", members: [], captains: [], pipelineIds: [] }] };
    const next = mergeStateWithPatch(current, { workspaces: [] as unknown[] }, { workspaces: ["old"] }) as { workspaces: { id: string }[] };
    expect(next.workspaces.map(w => w.id)).toEqual(["marketing"]);
  });

  it("applies a bare-id delete AND a scoped delete in the same patch", () => {
    const current = { workspaces: [ws({ members: ["anna", "abdallah", "yasmine"] }), { id: "old", name: "Old", members: [], captains: [], pipelineIds: [] }] };
    const next = mergeStateWithPatch(current, { workspaces: [ws()] }, { workspaces: ["old", "marketing::members::yasmine"] }) as { workspaces: { id: string; members?: string[] }[] };
    expect(next.workspaces.map(w => w.id)).toEqual(["marketing"]); // "old" deleted
    expect(next.workspaces.find(w => w.id === "marketing")?.members?.sort()).toEqual(["abdallah", "anna"]); // yasmine removed
  });

  it("does NOT delete workspaces via a diff — omitting one from the patch keeps it", () => {
    // The stale-tab safety: a patch that simply doesn't mention "old" must NOT drop it.
    const current = { workspaces: [ws(), { id: "old", name: "Old", members: ["x"], captains: ["x"], pipelineIds: [] }] };
    const next = mergeStateWithPatch(current, { workspaces: [ws()] }) as { workspaces: { id: string }[] };
    expect(next.workspaces.map(w => w.id).sort()).toEqual(["marketing", "old"]);
  });

  it("a new workspace is added, existing untouched", () => {
    const current = { workspaces: [ws()] };
    const patch = { workspaces: [{ id: "new", name: "New", members: ["anna"], captains: ["anna"], pipelineIds: [] }] };
    const next = mergeStateWithPatch(current, patch) as { workspaces: { id: string }[] };
    expect(next.workspaces.map(w => w.id).sort()).toEqual(["marketing", "new"]);
  });

  it("does not blank pipelineIds when the patch omits the field", () => {
    const current = { workspaces: [ws({ pipelineIds: ["core", "content"] })] };
    const patch = { workspaces: [{ id: "marketing", name: "Marketing Hub" }] };
    const next = mergeStateWithPatch(current, patch) as { workspaces: { pipelineIds: string[] }[] };
    expect(next.workspaces[0].pipelineIds.sort()).toEqual(["content", "core"]);
  });
});

// ── Dedup guard: a client sending duplicate ids must not persist them ──────────

describe("subtasks/databases dedup by id", () => {
  it("collapses duplicate subtask ids within a stage (the Medium Automation bug)", () => {
    const current = { subtasks: { "Stage A": [] as { id: number; text: string }[] } };
    // Client sends the same subtask 3× (identical copies).
    const patch = { subtasks: { "Stage A": [
      { id: 1, text: "Medium Automation" },
      { id: 1, text: "Medium Automation" },
      { id: 1, text: "Medium Automation" },
      { id: 2, text: "other" },
    ] } };
    const next = mergeStateWithPatch(current, patch) as { subtasks: Record<string, { id: number }[]> };
    expect(next.subtasks["Stage A"].map(s => s.id)).toEqual([1, 2]);
  });

  it("collapses duplicate database row ids", () => {
    const current = { databases: [{ id: 1, name: "D", columns: [], rows: [] as { id: number }[] }] };
    const patch = { databases: [{ id: 1, name: "D", columns: [], rows: [{ id: 9 }, { id: 9 }, { id: 10 }] }] };
    const next = mergeStateWithPatch(current, patch) as { databases: { rows: { id: number }[] }[] };
    expect(next.databases[0].rows.map(r => r.id)).toEqual([9, 10]);
  });
});

// ── Cross-stage subtask dedup (self-heal corruption) ──────────────────────────

describe("cross-stage subtask dedup", () => {
  it("keeps a subtask under only one stage, preferring the default-parent home", () => {
    const patch = { subtasks: {
      "default-parent-notion-article-pages": [{ id: 1, text: "Medium Automation" }],
      "Add a boolean field to news": [{ id: 1, text: "Medium Automation" }, { id: 2, text: "legit" }],
      "Temporarily hide views": [{ id: 1, text: "Medium Automation" }],
    } };
    const next = mergeStateWithPatch({}, patch) as { subtasks: Record<string, { id: number }[]> };
    expect(next.subtasks["default-parent-notion-article-pages"].map(s => s.id)).toEqual([1]);
    expect(next.subtasks["Add a boolean field to news"].map(s => s.id)).toEqual([2]); // 1 dropped
    expect(next.subtasks["Temporarily hide views"]).toEqual([]); // 1 dropped
  });

  it("re-added cross-stage duplicate is undone on the next merge (server converges)", () => {
    const server = { subtasks: { "default-parent-x": [{ id: 9, text: "t" }] } };
    // A stale client re-adds id 9 under a task-named stage.
    const patch = { subtasks: { "some task stage": [{ id: 9, text: "t" }] } };
    const next = mergeStateWithPatch(server, patch) as { subtasks: Record<string, { id: number }[]> };
    expect(next.subtasks["default-parent-x"].map(s => s.id)).toEqual([9]);
    expect(next.subtasks["some task stage"]).toEqual([]);
  });
});
