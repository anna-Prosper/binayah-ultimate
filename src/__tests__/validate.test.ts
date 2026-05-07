import {
  validatePatchKeys,
  validateNestedKeys,
  validateStageKey,
  validateSubtasks,
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

  it("rejects objects with $ keys at any depth", () => {
    expect(validateNestedKeys({ foo: { "$where": "1=1" } })).toBe(false);
  });

  it("rejects objects with . keys at any depth", () => {
    expect(validateNestedKeys({ owners: { "stage.name": ["anna"] } })).toBe(false);
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

  it("rejects names over 80 chars", () => {
    expect(validateStageKey("x".repeat(81))).not.toBeNull();
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
    const items = Array.from({ length: 21 }, (_, i) => ({ id: i, text: `t${i}`, done: false, by: "anna" }));
    expect(validateSubtasks({ "Stage A": items })).toMatch(/exceeds max/);
  });

  it("rejects subtask text exceeding 200 chars", () => {
    const items = [{ id: 1, text: "x".repeat(201), done: false, by: "anna" }];
    expect(validateSubtasks({ "Stage A": items })).toMatch(/200 char/);
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
