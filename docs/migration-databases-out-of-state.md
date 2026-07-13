# Migration plan — move `databases` out of the shared state doc

**Status:** proposed · **Owner:** TBD · **Est:** ~2–3 focused days · **Risk:** medium (touches the sync layer + a data migration)

## Why

Everything lives in one Mongo doc: `pipelinestates.state` (`workspaceId: "main"`), currently **767 KB**. The `databases` slice is **483 KB of that (63%)** and grows with every content row:

| Database | Rows | Size |
|---|---|---|
| Projects Update + Content Addition | 493 | 159 KB |
| Projects Update | 500 | 121 KB |
| Backlinks | 229 | 80 KB |
| Deepshikha – Content Update | 173 | 49 KB |
| Backlinks – New | 135 | 46 KB |
| (7 more) | — | ~28 KB |

This single-doc design is the root enabler of most of this quarter's incidents:
- the **64 KB `beforeunload` keepalive** couldn't carry the state → lost writes;
- **write contention** on one hot doc;
- **clobbers** (a stale tab replacing the whole slice);
- approaching Mongo's **16 MB doc limit** as content grows.

The interim **delta-sync** (only dirty slices are sent) mitigates the *acute* pain, so this is **not on fire** — but it's the correct next architectural step and unblocks scaling content databases.

## Goal

`databases` no longer rides in `state`. Each database is its own Mongo document, loaded and written independently, so the shared state doc drops to **~284 KB** and a 500-row table never touches unrelated saves.

## Target architecture (Phase 1: one doc per database)

New collection **`workspacedatabases`** — one document per database (rows embedded, as today):

```ts
{
  _id: ObjectId,
  dbId: number,            // existing WorkspaceDb.id (timestamp) — stable external key
  workspaceId: string,
  name, icon,
  columns: DbColumn[],
  rows: DbRow[],           // embedded (Phase 1); see Phase 2 for row-per-doc
  views: [...],
  recurringSlots?: [...],
  createdBy, createdAt,
  updatedAt: Date,         // for optimistic-lock (CAS), like pipelinestates
}
```

Rows stay **embedded** in Phase 1 — that already removes `databases` from the shared doc (the primary win) and keeps the proven `mergeDatabasesById` row-level merge, just scoped to one db-doc instead of the whole slice. **Row-per-doc is Phase 2**, only if a single database outgrows ~1 MB (none is close today; largest is 159 KB).

### Endpoints (new `/api/databases`)
Reuse the exact merge + `_deletes` + CAS patterns already in `pipelineStateMerge.ts` / `pipeline-state/route.ts`:
- `GET  /api/databases?workspaceId=…` — list (metadata only; rows omitted for the sidebar list).
- `GET  /api/databases/:dbId` — one database incl. rows.
- `POST /api/databases` — create.
- `PATCH /api/databases/:dbId` — merge update (row/column merge by id + `_deletes` `${rowId}`), CAS on `updatedAt`.
- `DELETE /api/databases/:dbId` — delete (root/officer only).

Auth: same session + workspace-membership checks as the current state route.

## Client changes

Today `databases` is a slice of `ModelContext` state (**61 touchpoints** in `ModelContext.tsx`; consumed by `DatabasesView`, `CampaignsView`, `AppShell`, `LeftSidebar`, `WorkspaceAdmin`).

Introduce a **`useWorkspaceDatabases()` hook** (or a `DatabasesContext`) that owns fetching/mutation against the new endpoints, mirroring the current mutation API so component call-sites barely change:
- `createDatabase / updateDatabase / deleteDatabase / addDbRow / updateDbRow / deleteDbRow / addDbColumn` keep their signatures but target the new endpoints (immediate flush + the same `queueDelete` semantics for row removal).
- Keep the optimistic-local + poll-merge model per-database (poll a database only while its panel is open).

## Migration steps (safe, reversible)

0. **Backup** — `npm run dr:backup` (state + collections). Confirm `dr:snapshots` lists it.
1. **Ship the collection + endpoints** behind a flag; no reads switched yet.
2. **Backfill** — one-shot script: copy each `state.databases[*]` → `workspacedatabases` (idempotent, keyed by `dbId`). Verify counts + a checksum per db.
3. **Dual-write window** — writes go to BOTH `state.databases` and the new collection for ~a few days. Reads still from `state`. This makes cutover and rollback trivial.
4. **Cutover reads** — flip the client to read from the new endpoints. Watch for a day.
5. **Stop writing `state.databases`**, then **remove the slice** from `state` (a `_deletes`-style removal or a one-shot `$unset`). Shared doc drops ~483 KB.
6. Remove the `databases` special-cases from `pipelineStateMerge.ts` once nothing writes the slice.

**Rollback:** any time before step 5, revert the read flag — `state.databases` is still the source of truth. After step 5, restore from the Phase-0 backup via `dr:restore --slice databases`.

## Testing
- Unit: port the `databases row-level merge` tests to the new per-db merge; add CAS-conflict + row-`_deletes` cases.
- Migration: backfill idempotency + checksum equality (state vs collection) on a scratch db.
- E2E: create db → add/edit/delete rows → reload → concurrent-tab edit (the clobber scenario) → delete db.
- Load: a 500-row db loads/saves without touching unrelated slices.

## Risks & mitigations
- **Split-brain during dual-write** — mitigate with the dual-write window + per-db checksum before cutover.
- **Missed touchpoint** (61 of them) — grep gate in CI for `\.databases` outside the new hook; TypeScript will catch most once the slice is removed from the context type.
- **CampaignsView / recurring slots** read databases too — include them in the cutover checklist.
- **Auth regressions** — reuse the existing route's membership checks verbatim; test a non-member gets 403.

## Explicitly out of scope (Phase 2, later)
Row-per-doc collection (`workspacedatabaserows`) for true single-row I/O — only needed if one database exceeds ~1 MB. Revisit when the largest crosses ~2,000 rows.
