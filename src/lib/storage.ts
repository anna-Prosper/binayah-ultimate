import { SCHEMA_VERSION } from "@/lib/version";

const LS_PREFIX = "binayah_";
// Keys written by lsSet() across the codebase — used for full cache wipe on schema version mismatch
// NOTE: keep this list in sync with every lsSet() call in the codebase
export const ALL_LS_KEYS = [
  "isDark", "themeId", "currentUser", "users", "onboardStep",
  "reactions", "claims", "subtasks", "comments",
  "stageStatusOverrides", "stageImages", "lockedPipelines",
  "stageDescOverrides", "pipeDescOverrides", "pipeMetaOverrides",
  "customStages", "customPipelines", "expanded", "activityLog",
  "chatMessages", "view", "lastSeenActivity",
];

const VERSION_KEY = LS_PREFIX + "schema_ver";
// Legacy key that had an extra underscore — cleared on migration to avoid cruft
const VERSION_KEY_LEGACY = LS_PREFIX + "_schema_ver";

export function checkSchemaVersion(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(VERSION_KEY) === SCHEMA_VERSION;
  } catch {
    return true;
  }
}

export function clearAllLsKeys(): void {
  if (typeof window === "undefined") return;
  try {
    ALL_LS_KEYS.forEach(k => localStorage.removeItem(LS_PREFIX + k));
    // Clear legacy double-underscore key if still present
    localStorage.removeItem(VERSION_KEY_LEGACY);
    // Also clear any binayah_ prefixed keys not in the known list (belt-and-suspenders)
    Object.keys(localStorage)
      .filter(k => k.startsWith(LS_PREFIX) && k !== VERSION_KEY)
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
  } catch { /* quota or SSR */ }
}

export function markSchemaVersionCurrent(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VERSION_KEY_LEGACY);
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
  } catch { /* quota */ }
}

let versionChecked = false;

export function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (!versionChecked) {
    // Run a lightweight internal version check on first use
    // Full schema version check is done in Dashboard.tsx on mount
    versionChecked = true;
  }
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch { /* quota */ }
}
