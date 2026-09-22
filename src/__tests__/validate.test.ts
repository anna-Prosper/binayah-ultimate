import {
  validatePatchKeys,
  validateNestedKeys,
  validateStageKey,
  validateSubtasks,
  MAX_SUBTASKS_PER_STAGE,
  PATCH_KEY_WHITELIST,
  MAP_SLICE_KEYS,
  ARRAY_BY_ID_SLICE_KEYS,
  SET_SLICE_KEYS,
} from "@/lib/validate";

describe("validatePatchKeys", () => {
  it("accepts all known whitelisted keys", () => {
    const patch = Object.fromEntries([...PATCH_KEY_WHITELIST].map(k => [k, null]));
    expect(validatePatchKeys(patch)).toBeNull();
  });

  it("rejects unknown keys", () => {
    expect(validatePatchKeys({ unknownField: 1 })).toMatch(/not an allowed patch key/);
  });

  it("rejects keys with $ (Mongo operator injection)", () => {
    expect(validatePatchKeys({ "$where": 1 })).not.toBeNull();
  });

  it("rejects keys with . (dot-path injection)", () => {
    expect(validatePatchKeys({ "state.owners": 1 })).not.toBeNull();
  });

  it("rejects __proto__ when present as an own key (e.g. from JSON.parse)", () => {
    // Object literal { __proto__: 1 } doesn't create an own key in JS,
    // but JSON.parse does — simulate that case.
    const parsed = JSON.parse('{"__proto__": {"isAdmin": true}}') as Record<string, unknown>;
    expect(validatePatchKeys(parsed)).not.toBeNull();
  });
});

describe("validateNestedKeys", () => {
  it("passes clean objects", () => {
    expect(validateNestedKeys({ foo: { bar: "baz" } })).toBe(true);
  });

  it("rejects nested keys that START with $ (Mongo operator-injection position)", () => {
    expect(validateNestedKeys({ foo: { "$where": "1=1" } })).toBe(false);
  });

  it("rejects prototype-pollution keys at any depth", () => {
    // JSON.parse (how the route reads the body) creates an OWN "__proto__" key — the real
    // vector — unlike an object literal, where "__proto__" sets the prototype instead.
    expect(validateNestedKeys(JSON.parse('{"foo":{"__proto__":{"x":1}}}'))).toBe(false);
    expect(validateNestedKeys({ foo: { "constructor": {} } })).toBe(false);
  });

  it("ALLOWS dotted free-text map keys — stage names legitimately contain '.'", () => {
    // e.g. "Fix binayah.com issues" is a real stage name; its status/owner writes must
    // not be rejected. The merge is a JS spread and the focused write uses $setField, so
    // '.' is never interpreted as a Mongo path. (Was the cause of a persistent "changes
    // not saved — retrying" offline banner when moving such a card.)
    expect(validateNestedKeys({ owners: { "Fix binayah.com issues": ["shyam"] } })).toBe(true);
    expect(validateNestedKeys({ subtaskStages: { "default-parent-x::123": "active" } })).toBe(true);
  });

  it("allows a '$' that is not the first character", () => {
    expect(validateNestedKeys({ stageDueDates: { "Add $ pricing page": "2026-01-01" } })).toBe(true);
  });

  it("passes arrays (not recursed as object keys)", () => {
    expect(validateNestedKeys({ arr: ["a", "b"] })).toBe(true);
  });
});

describe("validateStageKey", () => {
  it("accepts normal stage names", () => {
    expect(validateStageKey("Dev Agent Pipeline")).toBeNull();
    expect(validateStageKey("Qdrant Research")).toBeNull();
  });

  it("rejects empty strings", () => {
    expect(validateStageKey("")).not.toBeNull();
  });

  it("rejects names over 240 chars", () => {
    expect(validateStageKey("x".repeat(240))).toBeNull();
    expect(validateStageKey("x".repeat(241))).not.toBeNull();
  });

  it("rejects names with $ or .", () => {
    expect(validateStageKey("stage.$where")).not.toBeNull();
    expect(validateStageKey("stage.name")).not.toBeNull();
  });
});

describe("validateSubtasks", () => {
  it("passes valid subtasks map", () => {
    expect(validateSubtasks({
      "Stage A": [{ id: 1, text: "task", done: false, by: "anna" }],
    })).toBeNull();
  });

  it("rejects non-object", () => {
    expect(validateSubtasks(["not", "an", "object"])).not.toBeNull();
  });

  it("rejects subtask list exceeding max", () => {
    const items = Array.from({ length: MAX_SUBTASKS_PER_STAGE + 1 }, (_, i) => ({ id: i, text: `t${i}`, done: false, by: "anna" }));
    expect(validateSubtasks({ "Stage A": items })).toMatch(/exceeds max/);
  });

  it("rejects subtask text exceeding 500 chars", () => {
    const items = [{ id: 1, text: "x".repeat(501), done: false, by: "anna" }];
    expect(validateSubtasks({ "Stage A": items })).toMatch(/500 char/);
  });
});

describe("slice category sets", () => {
  it("MAP_SLICE_KEYS includes stageStatusOverrides and owners", () => {
    expect(MAP_SLICE_KEYS.has("stageStatusOverrides")).toBe(true);
    expect(MAP_SLICE_KEYS.has("owners")).toBe(true);
  });

  it("ARRAY_BY_ID_SLICE_KEYS includes execProposals and bugs", () => {
    expect(ARRAY_BY_ID_SLICE_KEYS.has("execProposals")).toBe(true);
    expect(ARRAY_BY_ID_SLICE_KEYS.has("bugs")).toBe(true);
  });

  it("SET_SLICE_KEYS includes approvedStages and archivedPipelines", () => {
    expect(SET_SLICE_KEYS.has("approvedStages")).toBe(true);
    expect(SET_SLICE_KEYS.has("archivedPipelines")).toBe(true);
  });
});
