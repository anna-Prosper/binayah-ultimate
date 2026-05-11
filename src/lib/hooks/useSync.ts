"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchState, patchState, type SharedState, type PatchEnvelope } from "@/lib/apiSync";
import { SYNC_POLL_INTERVAL_MS, SYNC_WRITE_DEBOUNCE_MS } from "@/lib/constants";

export type SyncStatus = "hydrating" | "live" | "offline" | "error";

interface UseSyncOptions {
  onPatch: (patch: SharedState) => void;  // ModelContext calls this to merge incoming state
  getPatch: () => PatchEnvelope;           // ModelContext provides current state for debounced write
  onWriteSuccess?: (sent: PatchEnvelope) => void; // fires after a successful PATCH so caller can prune pending-deletes
  intervalMs?: number;                      // default 5000
}

export function useSync({ onPatch, getPatch, onWriteSuccess, intervalMs = SYNC_POLL_INTERVAL_MS }: UseSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("hydrating");
  const isInitializedRef = useRef(false);
  // Hydration gate — scheduleWrite is a no-op until first fetchState resolves.
  // Without this a fast-typing user can fire a write before the server's truth
  // has been merged in; we'd ship a partial state envelope and clobber server
  // keys we never read.
  const isHydratedRef = useRef(false);
  // Set to true if scheduleWrite fires before hydrate completes. After hydrate
  // resolves we flush exactly one debounced write so the user's pre-hydrate
  // change isn't lost.
  const pendingWriteRef = useRef(false);

  // Track last-known server updatedAt for delta sync
  const lastUpdatedAtRef = useRef<number | undefined>(undefined);

  // Adaptive polling: track current interval, idle (304) count, and a "snap" flag
  // that lets activity/data events kick the timer back to the fast cadence. Start
  // fast (5s); after IDLE_BEFORE_BACKOFF_TICKS consecutive 304s switch to slow
  // (SLOW_INTERVAL_MS = 30s). Snap back on user activity or real data.
  const FAST_INTERVAL_MS = intervalMs;
  const SLOW_INTERVAL_MS = 30_000;
  // 24 ticks at 5s = 120s = 2min idle threshold
  const IDLE_BEFORE_BACKOFF_TICKS = Math.max(1, Math.floor((2 * 60_000) / FAST_INTERVAL_MS));
  const idleTickRef = useRef(0);
  const currentIntervalRef = useRef(FAST_INTERVAL_MS);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial hydrate
  useEffect(() => {
    fetchState().then(s => {
      if (s) {
        onPatch(s);
        if (s.updatedAt) lastUpdatedAtRef.current = s.updatedAt;
        setStatus("live");
      } else {
        setStatus("offline");
      }
      isInitializedRef.current = true;
      isHydratedRef.current = true;
      // Flush any write that was queued before hydration completed.
      if (pendingWriteRef.current) {
        pendingWriteRef.current = false;
        scheduleWriteRef.current?.();
      }
    }).catch(() => setStatus("error"));
  // onPatch is stable (useCallback) — safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll loop — uses a self-rescheduling setInterval so we can adjust cadence.
  useEffect(() => {
    const tick = async () => {
      if (!isInitializedRef.current) return;
      try {
        const s = await fetchState(lastUpdatedAtRef.current);
        // null means 304 (no update) or fetch error
        if (s) {
          onPatch(s);
          if (s.updatedAt) lastUpdatedAtRef.current = s.updatedAt;
          setStatus("live");
          // Real data → snap back to fast cadence
          idleTickRef.current = 0;
          if (currentIntervalRef.current !== FAST_INTERVAL_MS) {
            armPoll(FAST_INTERVAL_MS);
          }
        } else if (lastUpdatedAtRef.current !== undefined) {
          // 304 — still live, just no new data
          setStatus("live");
          idleTickRef.current += 1;
          if (idleTickRef.current >= IDLE_BEFORE_BACKOFF_TICKS && currentIntervalRef.current !== SLOW_INTERVAL_MS) {
            armPoll(SLOW_INTERVAL_MS);
          }
        } else {
          setStatus("offline");
        }
      } catch { setStatus("offline"); }
    };
    const armPoll = (ms: number) => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      currentIntervalRef.current = ms;
      intervalIdRef.current = setInterval(tick, ms);
    };
    armPoll(FAST_INTERVAL_MS);

    // User activity → snap back to fast cadence
    const onActivity = () => {
      if (currentIntervalRef.current !== FAST_INTERVAL_MS) {
        idleTickRef.current = 0;
        armPoll(FAST_INTERVAL_MS);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("mousemove", onActivity, { passive: true });
      document.addEventListener("keydown", onActivity);
      window.addEventListener("focus", onActivity);
    }
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (typeof document !== "undefined") {
        document.removeEventListener("mousemove", onActivity);
        document.removeEventListener("keydown", onActivity);
        window.removeEventListener("focus", onActivity);
      }
    };
  // onPatch + intervalMs are stable references
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  // Debounced write with retry — exposed so ModelContext can call it when
  // state changes. On transient failure (network blip, server 409 contention)
  // we retry with jittered exponential backoff up to 4 attempts. Permanent
  // failures (401/403/400) don't retry — they indicate auth or validation
  // problems that won't fix themselves.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const retryCountRef = useRef(0);
  // Forward ref so the hydrate effect can call scheduleWrite without depending on it
  const scheduleWriteRef = useRef<(() => void) | null>(null);

  const doWrite = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      // Snapshot the patch at start of attempt; if state changed during retries,
      // we re-snapshot (so retries always send fresh data).
      while (retryCountRef.current < 4) {
        const sent = getPatch();
        const res = await patchState(sent);
        if (res.ok) {
          if (onWriteSuccess) onWriteSuccess(sent);
          retryCountRef.current = 0;
          setStatus("live");
          return;
        }
        // 4xx auth/validation: don't retry, surface offline so UI shows error.
        if (res.status && res.status >= 400 && res.status < 500 && res.status !== 409 && res.status !== 429) {
          setStatus("offline");
          retryCountRef.current = 0;
          return;
        }
        // Transient: backoff + retry.
        retryCountRef.current += 1;
        const backoff = Math.min(8000, 500 * 2 ** (retryCountRef.current - 1)) + Math.floor(Math.random() * 250);
        setStatus("offline");
        await new Promise(r => setTimeout(r, backoff));
      }
      // Exhausted retries — leave status offline; next state change re-arms scheduleWrite.
      retryCountRef.current = 0;
    } finally {
      inFlightRef.current = false;
      // If a state change landed during the in-flight write, arm a fresh debounce
      // so the user's latest local edits get pushed.
      if (pendingWriteRef.current) {
        pendingWriteRef.current = false;
        scheduleWriteRef.current?.();
      }
    }
  }, [getPatch, onWriteSuccess]);

  const scheduleWrite = useCallback(() => {
    // Pre-hydrate: queue a flush once hydrate resolves.
    if (!isHydratedRef.current) {
      pendingWriteRef.current = true;
      return;
    }
    // In-flight: queue a re-arm after current write completes.
    if (inFlightRef.current) {
      pendingWriteRef.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doWrite();
    }, SYNC_WRITE_DEBOUNCE_MS);
  }, [doWrite]);

  // Keep ref in sync so hydrate / doWrite can re-arm without a circular dep
  scheduleWriteRef.current = scheduleWrite;

  // Force an immediate write — bypasses the 1.5s debounce. Use for high-value
  // user actions (task creation, etc.) where we don't want to risk losing the
  // change if the user reloads or navigates away before the debounce fires.
  // Falls back to scheduleWrite if hydration isn't done or a write is in flight
  // (those guards still apply — we can't safely write before hydrate has merged
  // the server's truth, and a parallel write would race).
  const writeNow = useCallback(() => {
    if (!isHydratedRef.current || inFlightRef.current) {
      pendingWriteRef.current = true;
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    void doWrite();
  }, [doWrite]);

  // beforeunload: flush any pending debounced write synchronously via sendBeacon.
  // Without this, a user who creates a task and reloads within 1.5s loses the
  // change — the timeout never fires and the PATCH never lands. sendBeacon
  // bypasses page lifecycle and is the standard "fire-and-forget on unload"
  // mechanism. Only fires when there's an unflushed change pending.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforeUnload = () => {
      if (!isHydratedRef.current) return;
      // If a debounce is armed, the write hasn't been sent yet — flush it now.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        try {
          const sent = getPatch();
          const blob = new Blob(
            [JSON.stringify({ ...sent, updatedAt: Date.now() })],
            { type: "application/json" }
          );
          // sendBeacon returns false if the body is too large or unsupported —
          // nothing we can do about it on unload, the best-effort attempt was made.
          navigator.sendBeacon?.("/api/pipeline-state", blob);
        } catch { /* swallow — unload context, no UI to surface to */ }
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [getPatch]);

  const setOffline = useCallback(() => setStatus("offline"), []);

  return { status, scheduleWrite, writeNow, setOffline };
}
