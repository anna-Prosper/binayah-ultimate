const LS_PREFIX = "binayah_";

export function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { /* quota */ }
}
