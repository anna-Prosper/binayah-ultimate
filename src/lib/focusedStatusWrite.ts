/**
 * Builds the MongoDB aggregation-pipeline `$set` expression that atomically writes a
 * focused status map (`stageStatusOverrides` / `subtaskStages`) one key at a time using
 * `$setField`.
 *
 * Why this exists: a status move used to go through a full-document read-modify-write with
 * an optimistic-lock CAS on the single giant state doc. Under concurrent use that CAS
 * exhausts and returns 409 WRITE_CONTENTION, dropping the write and reverting the card.
 * `$setField` sets exactly one field inside `state.<slice>` without reading the rest of the
 * document, so the write cannot lose a race and never contends — no CAS, no 409, no retry
 * needed for contention (only for genuine network failures).
 *
 * `$setField` stores the field name literally, so keys containing '.', '::' or '$'
 * (stage names are free-text, subtask keys are `parent::id`) are written verbatim — unlike
 * a dotted-path `$set` or `$mergeObjects`, which reject or mis-nest such keys. Verified
 * against the live server (MongoDB 8.0).
 *
 * The expression nests one `$setField` per key over `$ifNull: ["$state.<slice>", {}]` so an
 * absent map is treated as empty. Focused patches carry exactly one key; multiple are
 * handled correctly by nesting.
 */
export function buildStatusSetFieldExpr(slice: string, map: Record<string, string>): Record<string, unknown> {
  return Object.entries(map).reduce<Record<string, unknown>>(
    (input, [k, v]) => ({ $setField: { field: { $literal: k }, input, value: v } }),
    { $ifNull: [`$state.${slice}`, {}] } as Record<string, unknown>,
  );
}
