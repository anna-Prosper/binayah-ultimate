"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchState, patchState, type SharedState, type PatchEnvelope } from "@/lib/apiSync";

export type SyncStatus = "hydrating" | "live" | "offline" | "error";

interface UseSyncOptions {
  onPatch: (patch: SharedState) => void;  // ModelContext calls this to merge incoming state
  getPatch: () => PatchEnvelope;           // ModelContext provides current state for debounced write
  onWriteSuccess?: (sent: PatchEnvelope) => void; // fires after a successful PATCH so caller can prune pending-deletes
  intervalMs?: number;                      // default 5000
}

export function useSync({ onPatch, getPatch, onWriteSuccess, intervalMs = 5000 }: UseSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("hydrating");
  const isInitializedRef = useRef(false);

  // Track last-known server updatedAt for delta sync
  const lastUpdatedAtRef = useRef<number | undefined>(undefined);

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
    }).catch(() => setStatus("error"));
  // onPatch is stable (useCallback) — safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll — only after initial hydrate completes; pass since= for 304 short-circuit
  useEffect(() => {
    const id = setInterval(async () => {
      if (!isInitializedRef.current) return;
      try {
        const s = await fetchState(lastUpdatedAtRef.current);
        // null means 304 (no update) or fetch error
        if (s) {
          onPatch(s);
          if (s.updatedAt) lastUpdatedAtRef.current = s.updatedAt;
          setStatus("live");
        } else if (lastUpdatedAtRef.current !== undefined) {
          // 304 — still live, just no new data
          setStatus("live");
        } else {
          setStatus("offline");
        }
      } catch { setStatus("offline"); }
    }, intervalMs);
    return () => clearInterval(id);
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
    }
  }, [getPatch, onWriteSuccess]);

  const scheduleWrite = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void doWrite();
    }, 1500);
  }, [doWrite]);

  const setOffline = useCallback(() => setStatus("offline"), []);

  return { status, scheduleWrite, setOffline };
}
