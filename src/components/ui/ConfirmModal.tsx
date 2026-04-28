"use client";

import { useEffect, useRef } from "react";
import { type T } from "@/lib/themes";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: T;
}

export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "confirm",
  cancelLabel = "cancel",
  danger = false,
  onConfirm,
  onCancel,
  t,
}: ConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard: Escape cancels, Enter confirms
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onConfirm, onCancel]);

  // Focus confirm button when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${danger ? t.red + "44" : t.border}`,
          borderRadius: 16,
          padding: "24px 28px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.15s ease",
        }}
      >
        {/* Title */}
        <div style={{
          fontSize: 15,
          fontWeight: 900,
          color: danger ? t.red : t.text,
          fontFamily: "var(--font-dm-mono), monospace",
          marginBottom: 10,
          letterSpacing: -0.3,
        }}>
          {title}
        </div>

        {/* Body */}
        <div style={{
          fontSize: 13,
          color: t.textSec,
          lineHeight: 1.55,
          fontFamily: "var(--font-dm-sans), sans-serif",
          marginBottom: 20,
        }}>
          {body}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "7px 16px",
              cursor: "pointer",
              fontSize: 12,
              color: t.textMuted,
              fontFamily: "var(--font-dm-mono), monospace",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.textMuted; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            style={{
              background: danger ? t.red : t.accent,
              border: "none",
              borderRadius: 10,
              padding: "7px 16px",
              cursor: "pointer",
              fontSize: 12,
              color: "#fff",
              fontFamily: "var(--font-dm-mono), monospace",
              fontWeight: 700,
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
