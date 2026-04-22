"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { type T } from "@/lib/themes";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  t: T;
}

export default function BottomSheet({ open, onClose, title, children, t }: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Mount detection for portal
  useEffect(() => { setMounted(true); }, []);

  // Animate in/out
  useEffect(() => {
    if (open) {
      setVisible(true);
      // Save previous focus
      prevFocusRef.current = document.activeElement as HTMLElement;
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Keyboard dismiss
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !sheetRef.current) return;
    const el = sheetRef.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    el.addEventListener("keydown", trap);
    return () => { el.removeEventListener("keydown", trap); prevFocusRef.current?.focus(); };
  }, [open, visible]);

  // Swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
    setDragDelta(0);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    const delta = e.touches[0].clientY - dragStartY;
    if (delta > 0) setDragDelta(delta);
  };
  const handleTouchEnd = () => {
    if (dragDelta > 80) onClose();
    setDragDelta(0);
    setDragStartY(null);
  };

  if (!mounted || !visible) return null;

  const sheet = (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        // Backdrop
        background: open ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0)",
        transition: "background 0.3s ease",
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Sheet panel */}
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: t.bgCard,
          borderRadius: "16px 16px 0 0",
          border: `1px solid ${t.border}`,
          borderBottom: "none",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          transform: open ? `translateY(${dragDelta}px)` : "translateY(100%)",
          transition: dragDelta > 0 ? "none" : "transform 0.3s ease",
          boxShadow: `0 -8px 40px rgba(0,0,0,0.5)`,
          willChange: "transform",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 6px", flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.border }} />
        </div>

        {/* Header row */}
        {title && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "4px 16px 10px", flexShrink: 0,
            borderBottom: `1px solid ${t.border}`,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: t.textMuted,
              fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1,
            }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: `1px solid ${t.border}`,
                borderRadius: 8, padding: "4px 10px", cursor: "pointer",
                fontSize: 11, color: t.textMuted, fontFamily: "inherit",
                minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
