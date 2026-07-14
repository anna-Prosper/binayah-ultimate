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

// Keep the first item per id. A buggy client can send an array with duplicate
// ids (observed: a subtask copied 2-3× into one stage), and the merges below
// append incoming as-is — so without this the duplicates persist and render as
// repeated cards. Deduping at the merge boundary is the durable guard.
function dedupeById<T extends ItemWithId>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = String(item?.id);
    if (item == null || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
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
    out[stage] = dedupeById([...kept, ...incomingArr]);
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
  // Guard against duplicate ids in either input surviving the merge.
  return dedupeById(merged);
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

/**
 * Merge the `workspaces` slice by workspace id, and union-merge the array fields
 * inside each workspace (members, captains, pinned series, etc.). Workspaces were
 * wholesale-replaced, so a stale tab autosaving its older copy could silently
 * wipe another admin's membership / captain / pinned-series change. Here we keep
 * every existing member/pipeline/series the patch doesn't mention, so concurrent
 * edits never clobber. REMOVALS flow through `_deletes` with keys
 * `${wsId}` (whole workspace) or `${wsId}::${field}::${value}` (one array member).
 */
const WS_ARRAY_FIELDS = ["members", "captains", "firstMates", "pipelineIds", "callSeriesFilters", "hiddenTabs"] as const;
type WsLike = { id: string } & Record<string, unknown>;
function mergeWorkspacesById(current: WsLike[], patch: WsLike[]): WsLike[] {
  const out: WsLike[] = [...current];
  const idxById = new Map<string, number>();
  out.forEach((w, i) => idxById.set(String(w.id), i));
  for (const incoming of patch) {
    const key = String(incoming.id);
    const existingIdx = idxById.get(key);
    if (existingIdx === undefined) {
      idxById.set(key, out.length);
      out.push(incoming);
      continue;
    }
    const existing = out[existingIdx];
    const merged: WsLike = { ...existing, ...incoming }; // scalars (name/icon/label): incoming wins
    for (const f of WS_ARRAY_FIELDS) {
      const a = Array.isArray(existing[f]) ? (existing[f] as unknown[]) : [];
      const b = Array.isArray(incoming[f]) ? (incoming[f] as unknown[]) : [];
      // Union, preserving existing order then appending new — keep the field even
      // if the patch omits it (never blank out members/captains).
      if (a.length || b.length) merged[f] = Array.from(new Set([...a, ...b]));
    }
    out[existingIdx] = merged;
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
// Catastrophe backstop: a single delete payload should never remove nearly all
// of a slice's current items — that only happens when a buggy/un-hydrated client
// diffs an empty local state against a full server. Blocking it protects the data
// regardless of the client version. Returns how many current items the deletes
// would remove and the current count, for the caller to judge.
function deleteImpact(field: string, keys: unknown[], state: State): { current: number; removing: number } {
  const cur = state[field];
  if (field === "subtasks") {
    // keys are `stage::id` (one subtask) or bare `stage` (whole stage's list).
    const subs = isObject(cur) ? cur as Record<string, ItemWithId[]> : {};
    let current = 0;
    for (const l of Object.values(subs)) if (Array.isArray(l)) current += l.length;
    let removing = 0;
    for (const k of keys) {
      const str = String(k); const sep = str.indexOf("::");
      if (sep === -1) { const arr = subs[str]; if (Array.isArray(arr)) removing += arr.length; }
      else { const stage = str.slice(0, sep), id = str.slice(sep + 2); const arr = subs[stage]; if (Array.isArray(arr) && arr.some(i => String(i.id) === id)) removing++; }
    }
    return { current, removing };
  }
  if (field === "databases") {
    const dbs = Array.isArray(cur) ? cur as DbLike[] : [];
    const ids = new Set(dbs.map(d => String(d.id)));
    let totalRows = 0;
    for (const d of dbs) totalRows += Array.isArray(d.rows) ? d.rows.length : 0;
    let removing = 0;
    for (const k of keys) {
      const str = String(k); const sep = str.indexOf("::");
      if (sep === -1) { if (ids.has(str)) { const d = dbs.find(x => String(x.id) === str); removing += 1 + (Array.isArray(d?.rows) ? d!.rows!.length : 0); } }
      else { const dbId = str.slice(0, sep), rowId = str.slice(sep + 2); const d = dbs.find(x => String(x.id) === dbId); if (d && Array.isArray(d.rows) && d.rows.some(r => String(r.id) === rowId)) removing++; }
    }
    return { current: dbs.length + totalRows, removing };
  }
  if (SET_SLICE_KEYS.has(field)) {
    const arr = Array.isArray(cur) ? cur as string[] : [];
    const s = new Set(arr.map(String));
    return { current: arr.length, removing: [...new Set(keys.map(String))].filter(k => s.has(k)).length };
  }
  if (ARRAY_BY_ID_SLICE_KEYS.has(field)) {
    const arr = Array.isArray(cur) ? cur as ItemWithId[] : [];
    const ids = new Set(arr.map(i => String(i.id)));
    return { current: arr.length, removing: [...new Set(keys.map(String))].filter(k => ids.has(k)).length };
  }
  if (MAP_SLICE_KEYS.has(field)) {
    const m = isObject(cur) ? cur as Record<string, unknown> : {};
    const mk = new Set(Object.keys(m));
    return { current: mk.size, removing: [...new Set(keys.map(String))].filter(k => mk.has(k)).length };
  }
  return { current: 0, removing: 0 }; // subtasks / unknown — not guarded here
}

function applyDeletes(state: State, deletes: DeletesEnvelope): State {
  const out: State = { ...state };
  for (const [field, keys] of Object.entries(deletes)) {
    if (!Array.isArray(keys) || keys.length === 0) continue;

    // Users are seeded from code and never removed via sync. Workspaces DO support
    // deletion (root-only deleteWorkspace) and membership edits — both flow through
    // the EXPLICIT delete queue (never a diff), so they're safe to apply here:
    // bare `${wsId}` drops a workspace, scoped `${wsId}::${field}::${value}` drops
    // one member/captain/pinned-series. The mass-delete backstop below still guards.
    if (field === "users") {
      console.warn(`[merge] ignored _deletes for protected slice "users"`);
      continue;
    }

    // Refuse a mass-wipe: if these deletes would strip >=90% of a slice that has
    // >=5 items, treat it as a bad diff and skip it (the individual items survive).
    const { current, removing } = deleteImpact(field, keys, out);
    if (current >= 5 && removing >= current * 0.9) {
      console.warn(`[merge] blocked mass-delete of "${field}": would remove ${removing}/${current} items`);
      continue;
    }

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

    // Special: workspaces accepts a bare `${wsId}` to drop a whole workspace, or a
    // scoped `${wsId}::${field}::${value}` to drop one member/captain/pinned-series.
    if (field === "workspaces") {
      let wss = Array.isArray(out.workspaces) ? [...(out.workspaces as WsLike[])] : [];
      const dropWhole = new Set<string>();
      for (const key of keys) {
        const str = String(key);
        const first = str.indexOf("::");
        if (first === -1) { dropWhole.add(str); continue; } // bare wsId — whole workspace
        const wsId = str.slice(0, first);
        const rest = str.slice(first + 2);
        const sep = rest.indexOf("::");
        if (sep === -1) continue; // malformed — need field + value
        const f = rest.slice(0, sep);
        const val = rest.slice(sep + 2);
        if (!(WS_ARRAY_FIELDS as readonly string[]).includes(f)) continue;
        const idx = wss.findIndex(w => String(w.id) === wsId);
        if (idx === -1) continue;
        const arr = Array.isArray(wss[idx][f]) ? (wss[idx][f] as unknown[]) : [];
        wss[idx] = { ...wss[idx], [f]: arr.filter(x => String(x) !== val) };
      }
      if (dropWhole.size > 0) wss = wss.filter(w => !dropWhole.has(String(w.id)));
      out.workspaces = wss;
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
/**
 * A pipeline belongs to exactly one workspace. A browser tab still running the old
 * "add every pipeline to Binayah Properties" migration re-bloats that workspace's
 * pipelineIds on every save, which snapped moved pipelines back and repopulated
 * Properties with Binayah AI's + Marketing's pipelines. This guard drops, from the
 * just-merged workspaces, any pipelineId a workspace tries to hold while a DIFFERENT
 * workspace owned it in the prior server state and still lists it. So an addition is
 * only honoured when the pipeline was unassigned, or its previous owner relinquished
 * it in the same write (a real move — the workspaces slice carries all workspaces, so
 * a genuine move sends both sides). `__inbox__` is exempt: it's a shared per-workspace
 * holder that legitimately appears in multiple workspaces.
 */
type WsLite = { id: string; pipelineIds?: string[] };
function enforceSinglePipelineOwner(prior: WsLite[], merged: WsLite[]): WsLite[] {
  const priorOwner = new Map<string, string>();
  for (const w of prior) for (const pid of (w.pipelineIds || [])) if (!priorOwner.has(pid)) priorOwner.set(pid, w.id);
  const mergedHas = (wsId: string, pid: string) => {
    const w = merged.find(x => x.id === wsId);
    return !!w && (w.pipelineIds || []).includes(pid);
  };
  return merged.map(w => {
    const ids = w.pipelineIds || [];
    const kept = ids.filter(pid => {
      if (pid === "__inbox__") return true;
      const owner = priorOwner.get(pid);
      if (owner === undefined || owner === w.id) return true;
      return !mergedHas(owner, pid); // prior owner relinquished it → allow the move
    });
    return kept.length === ids.length ? w : { ...w, pipelineIds: kept };
  });
}

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
    // Special-case: workspaces merge by id + union of member/captain/series arrays,
    // so a stale tab can't wipe another admin's membership or pinned-series change.
    if (k === "workspaces" && Array.isArray(v)) {
      const cur = Array.isArray(next.workspaces) ? next.workspaces as WsLike[] : [];
      next.workspaces = mergeWorkspacesById(cur, v as WsLike[]);
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

  // Single-owner guard for workspace pipeline assignments — neutralizes the stale
  // "force every pipeline into Binayah Properties" client migration server-side, so
  // it can't re-bloat a workspace no matter what code a client is running.
  if ("workspaces" in patch && Array.isArray(next.workspaces) && Array.isArray(current.workspaces)) {
    next.workspaces = enforceSinglePipelineOwner(
      current.workspaces as WsLite[],
      next.workspaces as WsLite[],
    ) as State["workspaces"];
  }

  if (deletes && isObject(deletes)) {
    next = applyDeletes(next, deletes as DeletesEnvelope);
  }

  return next;
}
