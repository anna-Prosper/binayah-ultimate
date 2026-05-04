"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { T } from "@/lib/themes";

export type ToastItem = {
  id: number;
  message: string;
  color: string;
  action?: { label: string; onClick: () => void };
};

interface ToastContainerProps {
  t: T;
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

// Toast container — renders up to 3 stacked toasts, fixed bottom-center
export function ToastContainer({ t, toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <>
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column-reverse",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.slice(0, 3).map((toast, i) => (
          <div
            key={toast.id}
            style={{
              background: t.bgCard,
              border: `1px solid ${toast.color}44`,
              borderRadius: 12,
              padding: "8px 16px",
              fontSize: 13,
              fontFamily: "var(--font-dm-mono), monospace",
              color: toast.color,
              boxShadow: `0 4px 24px rgba(0,0,0,0.45), 0 0 12px ${toast.color}22`,
              animation: "toastSlideUp 0.2s ease-out",
              opacity: 1 - i * 0.15,
              pointerEvents: "auto",
              cursor: "pointer",
              maxWidth: "min(400px, calc(100vw - 48px))",
              display: "flex",
              alignItems: "center",
            }}
            onClick={() => onDismiss(toast.id)}
          >
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.action && (
              <button
                onClick={e => { e.stopPropagation(); toast.action!.onClick(); onDismiss(toast.id); }}
                style={{
                  background: "transparent",
                  border: `1px solid currentColor`,
                  borderRadius: 6,
                  padding: "2px 8px",
                  cursor: "pointer",
                  fontSize: 11,
                  color: "inherit",
                  fontFamily: "var(--font-dm-mono), monospace",
                  fontWeight: 700,
                  marginLeft: 8,
                  flexShrink: 0,
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// Hook for managing toasts
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const timers = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Clear all pending timers on unmount to prevent state updates on unmounted component
  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const showToast = useCallback((message: string, color: string, durationMs = 3000, action?: { label: string; onClick: () => void }) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev.slice(-2), { id, message, color, action }]); // max 3
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      timers.current.delete(id);
    }, durationMs);
    timers.current.set(id, timer);
    return id;
  }, []);

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

// Recovery toast — shown when schema version mismatch detected
// Returns a promise that resolves after the toast duration
interface RecoveryToastProps {
  t: T;
  message?: string;
}

export function RecoveryToast({ t, message = "// cache cleared — fresh start" }: RecoveryToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes recoverySlideUp {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          background: t.bgCard,
          border: `1px solid ${t.amber}44`,
          borderRadius: 12,
          padding: "8px 16px",
          fontSize: 13,
          fontFamily: "var(--font-dm-mono), monospace",
          color: t.amber,
          boxShadow: `0 4px 24px rgba(0,0,0,0.45), 0 0 12px ${t.amber}22`,
          animation: "recoverySlideUp 0.25s ease-out",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {message}
      </div>
    </>
  );
}
