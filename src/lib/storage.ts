const LS_PREFIX = "binayah_";
const LS_VERSION = "v3"; // bump to bust stale cache after pipeline changes

function checkVersion() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LS_PREFIX + "_ver") !== LS_VERSION) {
      // Clear all binayah_ keys
      Object.keys(localStorage).filter(k => k.startsWith(LS_PREFIX)).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(LS_PREFIX + "_ver", LS_VERSION);
    }
  } catch { /* */ }
}

let versionChecked = false;

export function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  if (!versionChecked) { checkVersion(); versionChecked = true; }
  try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { /* quota */ }
}
