/**
 * Tests for buildStatusSetFieldExpr — the atomic per-key status write expression.
 *
 * The server applies a focused status change with an aggregation-pipeline $set that uses
 * $setField, NOT a full-document read-modify-write CAS. That's what makes status writes
 * contention-free (no 409), so "move a card to done and it comes back" can't happen from
 * write contention at all — the client retry is now only a network-failure fallback.
 *
 * $setField stores the literal key, so keys with '.', '::' or '$' are safe (verified
 * against the live MongoDB 8.0 server; a dotted-path $set / $mergeObjects rejects them).
 * These tests lock the generated expression shape so a refactor can't silently regress to
 * a dotted-path write that would corrupt free-text stage-name keys.
 */
import { buildStatusSetFieldExpr } from "@/lib/focusedStatusWrite";

describe("buildStatusSetFieldExpr", () => {
  test("empty map → just the $ifNull seed (no-op set)", () => {
    expect(buildStatusSetFieldExpr("subtaskStages", {})).toEqual({ $ifNull: ["$state.subtaskStages", {}] });
  });

  test("single key → one $setField over the existing map", () => {
    const key = "default-parent-notion-sm-automation::1784010163119";
    expect(buildStatusSetFieldExpr("subtaskStages", { [key]: "active" })).toEqual({
      $setField: {
        field: { $literal: key },
        input: { $ifNull: ["$state.subtaskStages", {}] },
        value: "active",
      },
    });
  });

  test("dotted free-text stage-name key is passed to $setField as a literal (not a path)", () => {
    const key = "To fix all the binayah.com issues";
    const expr = buildStatusSetFieldExpr("stageStatusOverrides", { [key]: "active" }) as {
      $setField: { field: { $literal: string } };
    };
    // The dotted key must live inside $literal — a bare dotted field path would be rejected
    // by Mongo (FieldPath may not contain '.') and corrupt into nested fields.
    expect(expr.$setField.field).toEqual({ $literal: key });
  });

  test("multiple keys nest so each is set atomically over the prior result", () => {
    const expr = buildStatusSetFieldExpr("stageStatusOverrides", { A: "active", B: "blocked" }) as Record<string, unknown>;
    // Outer $setField sets B; its input is the $setField that sets A; whose input is $ifNull.
    const outer = expr as { $setField: { field: { $literal: string }; value: string; input: unknown } };
    expect(outer.$setField.field).toEqual({ $literal: "B" });
    expect(outer.$setField.value).toBe("blocked");
    const inner = outer.$setField.input as { $setField: { field: { $literal: string }; value: string; input: unknown } };
    expect(inner.$setField.field).toEqual({ $literal: "A" });
    expect(inner.$setField.value).toBe("active");
    expect(inner.$setField.input).toEqual({ $ifNull: ["$state.stageStatusOverrides", {}] });
  });
});
