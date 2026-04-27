"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchState, patchState, type SharedState } from "@/lib/apiSync";

export type SyncStatus = "hydrating" | "live" | "offline" | "error";

interface UseSyncOptions {
  onPatch: (patch: SharedState) => void;  // ModelContext calls this to merge incoming state
  getPatch: () => Partial<SharedState>;    // ModelContext provides current state for debounced write
  intervalMs?: number;                      // default 5000
}

export function useSync({ onPatch, getPatch, intervalMs = 5000 }: UseSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("hydrating");
  const isInitializedRef = useRef(false);

  // Initial hydrate
  useEffect(() => {
    fetchState().then(s => {
      if (s) {
        onPatch(s);
        setStatus("live");
      } else {
        setStatus("offline");
      }
      isInitializedRef.current = true;
    }).catch(() => setStatus("error"));
  // onPatch is stable (useCallback) — safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll — only after initial hydrate completes
  useEffect(() => {
    const id = setInterval(async () => {
      if (!isInitializedRef.current) return;
      try {
        const s = await fetchState();
        if (s) { onPatch(s); setStatus("live"); }
        else setStatus("offline");
      } catch { setStatus("offline"); }
    }, intervalMs);
    return () => clearInterval(id);
  // onPatch + intervalMs are stable references
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  // Debounced write — exposed so ModelContext can call it when state changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleWrite = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      patchState(getPatch()).catch(() => setStatus("offline"));
    }, 1500);
  }, [getPatch]);

  const setOffline = useCallback(() => setStatus("offline"), []);

  return { status, scheduleWrite, setOffline };
}
