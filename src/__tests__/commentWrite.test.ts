/**
 * Tests for the comment/reaction aggregation-pipeline builders.
 *
 * The comment routes used to interpolate the stage name into a Mongo dotted path
 * (`state.comments.${stage}`), which corrupts for a dotted stage name ("Fix binayah.com
 * issues"). These builders address the field by NAME via $setField/$getField/$unsetField
 * with $literal, so dotted names are stored/read verbatim. These tests lock that shape so a
 * refactor can't silently regress to a dotted path — and assert the only $set target keys
 * are the fixed top-level fields, never a `state.comments.<dotted name>` path.
 */
import {
  buildAddCommentPipeline,
  buildEditCommentPipeline,
  buildDeleteCommentPipeline,
  buildToggleReactionPipeline,
} from "@/lib/commentWrite";
import { validateCommentStageKey, validateStageKey } from "@/lib/validate";

const DOTTED = "Fix binayah.com issues";

// No pipeline stage may $set a dotted `state.comments.<name>` / `state.commentReactions.<name>`
// path — only the fixed top-level fields, with the name carried inside $literal.
function assertNoDottedFieldPaths(pipeline: Record<string, unknown>[]) {
  const allowed = new Set(["state.comments", "state.commentReactions", "updatedAt"]);
  for (const stageObj of pipeline) {
    const set = (stageObj as { $set?: Record<string, unknown> }).$set || {};
    for (const key of Object.keys(set)) expect(allowed.has(key)).toBe(true);
  }
  // The dotted name only ever appears inside a $literal.
  const json = JSON.stringify(pipeline);
  expect(json).not.toContain(`state.comments.${DOTTED}`);
  expect(json).toContain(`"$literal":"${DOTTED}"`);
}

describe("comment pipeline builders address fields by $literal, never dotted paths", () => {
  test("add: $setField on state.comments, slices to last 100, comment wrapped in $literal", () => {
    const p = buildAddCommentPipeline(DOTTED, { id: 1, by: "anna", text: "$hi.with.dots" });
    assertNoDottedFieldPaths(p);
    const sf = (p[0].$set as Record<string, { $setField: { value: { $slice: [unknown, number] } } }>)["state.comments"].$setField;
    expect(sf.value.$slice[1]).toBe(-100);
    // the comment (incl. a text starting with $) is a literal, not interpreted as a path
    expect(JSON.stringify(p)).toContain('"$literal":{"id":1,"by":"anna","text":"$hi.with.dots"}');
  });

  test("edit: $map replaces only the matching id's text", () => {
    const p = buildEditCommentPipeline(DOTTED, 7, "new text");
    assertNoDottedFieldPaths(p);
    expect(JSON.stringify(p)).toContain('"$map"');
    expect(JSON.stringify(p)).toContain('"$literal":"new text"');
  });

  test("delete: $filter removes the comment AND $unsetField drops its reactions key", () => {
    const p = buildDeleteCommentPipeline(DOTTED, 5);
    assertNoDottedFieldPaths(p);
    expect(JSON.stringify(p)).toContain('"$filter"');
    // reactions key is stage::id, carried in $literal on $unsetField
    expect(JSON.stringify(p)).toContain(`"$unsetField"`);
    expect(JSON.stringify(p)).toContain(`"$literal":"${DOTTED}::5"`);
  });

  test("react toggle: $setField on state.commentReactions keyed by the reactionKey literal", () => {
    const p = buildToggleReactionPipeline(`${DOTTED}::1`, "👍", "anna");
    const set = p[0].$set as Record<string, unknown>;
    expect(Object.keys(set).sort()).toEqual(["state.commentReactions", "updatedAt"]);
    expect(JSON.stringify(p)).toContain(`"$literal":"${DOTTED}::1"`);
    expect(JSON.stringify(p)).not.toContain(`state.commentReactions.${DOTTED}`);
  });
});

describe("validateCommentStageKey", () => {
  test("allows dotted stage names (which validateStageKey rejects)", () => {
    expect(validateCommentStageKey(DOTTED)).toBeNull();
    expect(validateStageKey(DOTTED)).not.toBeNull(); // strict variant still rejects dots
  });
  test("still blocks leading-$ and prototype pollution and empties", () => {
    expect(validateCommentStageKey("$where")).not.toBeNull();
    expect(validateCommentStageKey("__proto__")).not.toBeNull();
    expect(validateCommentStageKey("")).not.toBeNull();
  });
});
