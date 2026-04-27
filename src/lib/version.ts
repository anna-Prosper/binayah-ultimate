// SCHEMA_VERSION — bump this to bust stale localStorage on deploy
// Dashboard checks this on mount; if mismatch, all lsSet() keys are cleared and page reloads.
// NOTE: also update LS_VERSION in storage.ts to the same value when bumping.
// v3 — dropped lockedPipelines + trashedStages/trashedPipelines/trashedSubtasks
export const SCHEMA_VERSION = "v3";
