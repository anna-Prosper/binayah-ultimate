/**
 * Pure merge logic for the pipeline-state PATCH endpoint.
 *
 * The PATCH handler reads the current `state` object from MongoDB, calls
 * mergeStateWithPatch() to produce the next state, and writes it back with
 * an optimistic-lock filter (matching `updatedAt`). On match-fail the handler
 * retries — so the merge itself is pure, side-effect-free, and easy to test.
 *
 * Why merge in app code instead of letting Mongo replace fields:
 *
 * Each client sends its full local copy of every slice on every save. A stale
 * tab whose copy is missing a key would erase that key on the server if writes
 * were wholesale $set. The merge below preserves keys/items the patch doesn't
 * mention, so concurrent edits to disjoint keys never lose data. Explicit
 * deletions flow through the `_deletes` envelope.
 */

import { MAP_SLICE_KEYS, ARRAY_BY_ID_SLICE_KEYS, SET_SLICE_KEYS } from "./validate";

type State = Record<string, unknown>;
type ItemWithId = { id: number | string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Merge `subtasks[stage]` arrays by item id rather than wholesale-replace.
 * Two users adding subtasks to the same stage from different tabs will both
 * keep their additions; an edit to subtask 3 plus an addition of subtask 4
 * results in both surviving.
 */
function mergeSubtasksMap(
  current: Record<string, ItemWithId[]>,
  patch: Record<string, unknown>,
): Record<string, ItemWithId[]> {
  const out: Record<string, ItemWithId[]> = { ...current };
  for (const [stage, incoming] of Object.entries(patch)) {
    if (!Array.isArray(incoming)) continue;
    const incomingArr = incoming as ItemWithId[];
    const existing = Array.isArray(out[stage]) ? out[stage] : [];
    const incomingIds = new Set(incomingArr.map(i => i.id));
    // Keep existing items whose ids aren't in the patch; replace the rest with incoming.
    const kept = existing.filter(i => !incomingIds.has(i.id));
    out[stage] = [...kept, ...incomingArr];
  }
  return out;
}

/**
 * Merge `reactions[stage][emoji]` user lists by set-union rather than replace.
 * Stops a stale tab from erasing a reaction another user just added.
 */
function mergeReactionsMap(
  current: Record<string, Record<string, string[]>>,
  patch: Record<string, unknown>,
): Record<string, Record<string, string[]>> {
  const out: Record<string, Record<string, string[]>> = { ...current };
  for (const [stage, emojiMap] of Object.entries(patch)) {
    if (!isObject(emojiMap)) continue;
    const existingStage = isObject(out[stage]) ? { ...out[stage] } : {};
    for (const [emoji, users] of Object.entries(emojiMap)) {
      if (!Array.isArray(users)) continue;
      const prev = Array.isArray(existingStage[emoji]) ? existingStage[emoji] as string[] : [];
      existingStage[emoji] = Array.from(new Set([...prev, ...(users as string[])]));
    }
    out[stage] = existingStage as Record<string, string[]>;
  }
  return out;
}

/**
 * Merge the `databases` slice by database id AND by row/column id inside each
 * database. Databases are ARRAY_BY_ID items, but their `rows` array is edited
 * concurrently by multiple users. Wholesale-replacing a database by id (the old
 * mergeArrayById behaviour) let any stale tab's save overwrite rows another user
 * had just added — silent, unrecoverable data loss. Here we keep every existing
 * row/column whose id the patch doesn't mention, so disjoint edits never clobber.
 * Row/column REMOVALS must flow through `_deletes` (keys `${dbId}::${rowId}`),
 * exactly like subtasks — a merge alone can never delete.
 */
type DbLike = { id: number | string; rows?: ItemWithId[]; columns?: ItemWithId[] } & Record<string, unknown>;
function mergeItemsById(existing: ItemWithId[], incoming: ItemWithId[]): ItemWithId[] {
  const existingById = new Map(existing.map(r => [String(r.id), r]));
  const incomingById = new Map(incoming.map(r => [String(r.id), r]));
  // Preserve existing order; update values in place for ids present in the patch.
  const merged: ItemWithId[] = existing.map(r => incomingById.get(String(r.id)) ?? r);
  // Append incoming items that are new (not already present).
  for (const r of incoming) if (!existingById.has(String(r.id))) merged.push(r);
  return merged;
}
function mergeDatabasesById(current: DbLike[], patch: DbLike[]): DbLike[] {
  const out: DbLike[] = [...current];
  const idxById = new Map<string, number>();
  out.forEach((d, i) => idxById.set(String(d.id), i));
  for (const incoming of patch) {
    const key = String(incoming.id);
    const existingIdx = idxById.get(key);
    if (existingIdx === undefined) {
      idxById.set(key, out.length);
      out.push(incoming);
      continue;
    }
    const existing = out[existingIdx];
    const existingRows = Array.isArray(existing.rows) ? existing.rows : [];
    const incomingRows = Array.isArray(incoming.rows) ? incoming.rows : [];
    const existingCols = Array.isArray(existing.columns) ? existing.columns : [];
    const incomingCols = Array.isArray(incoming.columns) ? incoming.columns : [];
    out[existingIdx] = {
      ...existing,
      ...incoming,
      rows: mergeItemsById(existingRows, incomingRows),
      // Only merge columns when the patch carries them; never blank them out.
      columns: incomingCols.length || existingCols.length
        ? mergeItemsById(existingCols, incomingCols)
        : existing.columns,
    };
  }
  return out;
}

function mergeMapSlice(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...current, ...patch };
}

function mergeArrayById(
  current: ItemWithId[],
  patch: ItemWithId[],
): ItemWithId[] {
  const incomingIds = new Set(patch.map(i => i.id));
  const kept = current.filter(i => !incomingIds.has(i.id));
  return [...kept, ...patch];
}

function mergeSetSlice(current: string[], patch: string[]): string[] {
  return Array.from(new Set([...current, ...patch]));
}

export type DeletesEnvelope = Record<string, string[]>;

/**
 * Apply explicit deletions to a state object. Mutates a copy and returns it.
 * - MAP slices: removes the given keys.
 * - SET slices: pulls the given strings.
 * - ARRAY_BY_ID slices: filters items whose id (string-coerced) matches.
 * - Special: `subtasks` accepts keys like `${stage}::${subtaskId}` to drop a
 *   single subtask from a stage's array. (This matches how subtaskApproval
 *   keys are formed elsewhere in the app.)
 */
function applyDeletes(state: State, deletes: DeletesEnvelope): State {
  const out: State = { ...state };
  for (const [field, keys] of Object.entries(deletes)) {
    if (!Array.isArray(keys) || keys.length === 0) continue;

    if (field === "subtasks") {
      const subtasks = isObject(out.subtasks) ? { ...out.subtasks } : {};
      for (const key of keys) {
        if (typeof key !== "string") continue;
        const [stage, idStr] = key.split("::");
        if (!stage || !idStr) {
          // Stage-level delete — drop the whole stage entry.
          delete subtasks[key];
          continue;
        }
        const arr = Array.isArray(subtasks[stage]) ? subtasks[stage] as ItemWithId[] : null;
        if (!arr) continue;
        subtasks[stage] = arr.filter(i => String(i.id) !== idStr);
      }
      out.subtasks = subtasks;
      continue;
    }

    // Special: databases accepts `${dbId}::${rowId}` to drop a single row (mirrors
    // subtasks), or a bare `${dbId}` to drop a whole database.
    if (field === "databases") {
      const dbs = Array.isArray(out.databases) ? [...(out.databases as DbLike[])] : [];
      const dropWholeDb = new Set<string>();
      for (const key of keys) {
        const str = String(key);
        const sep = str.indexOf("::");
        if (sep === -1) { dropWholeDb.add(str); continue; }
        const dbId = str.slice(0, sep);
        const rowId = str.slice(sep + 2);
        const idx = dbs.findIndex(d => String(d.id) === dbId);
        if (idx === -1) continue;
        const rows = Array.isArray(dbs[idx].rows) ? dbs[idx].rows as ItemWithId[] : [];
        dbs[idx] = { ...dbs[idx], rows: rows.filter(r => String(r.id) !== rowId) };
      }
      out.databases = dbs.filter(d => !dropWholeDb.has(String(d.id)));
      continue;
    }

    if (MAP_SLICE_KEYS.has(field)) {
      const map = isObject(out[field]) ? { ...(out[field] as Record<string, unknown>) } : {};
      for (const key of keys) {
        if (typeof key !== "string") continue;
        delete map[key];
      }
      out[field] = map;
      continue;
    }

    if (SET_SLICE_KEYS.has(field)) {
      const arr = Array.isArray(out[field]) ? out[field] as string[] : [];
      const drop = new Set(keys);
      out[field] = arr.filter(s => !drop.has(s));
      continue;
    }

    if (ARRAY_BY_ID_SLICE_KEYS.has(field)) {
      const arr = Array.isArray(out[field]) ? out[field] as ItemWithId[] : [];
      const drop = new Set(keys.map(String));
      out[field] = arr.filter(i => !drop.has(String(i.id)));
      continue;
    }
  }
  return out;
}

/**
 * Merge a patch into a state object. Returns the next state.
 * `patch` is the cleanPatch (whitelist-checked, no `_deletes`).
 * `deletes` is the optional `_deletes` envelope.
 */
export function mergeStateWithPatch(
  current: State,
  patch: Record<string, unknown>,
  deletes?: DeletesEnvelope,
): State {
  let next: State = { ...current };

  for (const [k, v] of Object.entries(patch)) {
    // Special-case: subtasks needs inner-array merge.
    if (k === "subtasks" && isObject(v)) {
      const cur = isObject(next.subtasks) ? next.subtasks as Record<string, ItemWithId[]> : {};
      next.subtasks = mergeSubtasksMap(cur, v);
      continue;
    }
    // Special-case: reactions needs inner-emoji set-union.
    if (k === "reactions" && isObject(v)) {
      const cur = isObject(next.reactions) ? next.reactions as Record<string, Record<string, string[]>> : {};
      next.reactions = mergeReactionsMap(cur, v);
      continue;
    }
    // Special-case: databases needs inner-row/column merge by id (not whole-db replace).
    if (k === "databases" && Array.isArray(v)) {
      const cur = Array.isArray(next.databases) ? next.databases as DbLike[] : [];
      next.databases = mergeDatabasesById(cur, v as DbLike[]);
      continue;
    }
    if (MAP_SLICE_KEYS.has(k) && isObject(v)) {
      const cur = isObject(next[k]) ? next[k] as Record<string, unknown> : {};
      next[k] = mergeMapSlice(cur, v);
      continue;
    }
    if (ARRAY_BY_ID_SLICE_KEYS.has(k) && Array.isArray(v)) {
      const cur = Array.isArray(next[k]) ? next[k] as ItemWithId[] : [];
      next[k] = mergeArrayById(cur, v as ItemWithId[]);
      continue;
    }
    if (SET_SLICE_KEYS.has(k) && Array.isArray(v)) {
      const cur = Array.isArray(next[k]) ? next[k] as string[] : [];
      next[k] = mergeSetSlice(cur, v as string[]);
      continue;
    }
    // Default: replace (users, workspaces, scalars).
    next[k] = v;
  }

  if (deletes && isObject(deletes)) {
    next = applyDeletes(next, deletes as DeletesEnvelope);
  }

  return next;
}
