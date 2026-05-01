"use client";

import { useState, useEffect, useRef } from "react";
import { type T } from "@/lib/themes";

type Pipeline = { id: string; name: string; icon: string };

interface Props {
  open: boolean;
  onClose: () => void;
  t: T;
  pipelines: Pipeline[];
  onAdd: (pipelineId: string, title: string) => void;
}

export default function QuickAddModal({ open, onClose, t, pipelines, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const mono = "var(--font-dm-mono), monospace";

  useEffect(() => {
    if (open) {
      setTitle("");
      setPipelineId(pipelines[0]?.id ?? "");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, pipelines]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const submit = () => {
    if (!title.trim() || !pipelineId) return;
    onAdd(pipelineId, title.trim());
    onClose();
  };

  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "20vh", zIndex: 9999, backdropFilter: "blur(2px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 20, width: "min(480px, calc(100vw - 32px))", boxShadow: "0 16px 48px rgba(0,0,0,0.5)", animation: "fadeIn 0.12s ease", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5 }}>NEW TASK  <span style={{ color: t.textDim, fontWeight: 400 }}>— press N anywhere to open</span></div>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          placeholder="Task name…"
          style={{ background: t.surface, border: `1px solid ${t.accent}55`, borderRadius: 10, padding: "9px 12px", fontSize: 14, color: t.text, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "var(--font-dm-sans), sans-serif" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {pipelines.map(p => {
            const sel = pipelineId === p.id;
            return (
              <button key={p.id} type="button" onClick={() => setPipelineId(p.id)}
                style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.border}`, borderRadius: 8, padding: "3px 9px", fontSize: 11, color: sel ? t.accent : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400, cursor: "pointer" }}>
                {p.icon} {p.name}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} type="button" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 9, padding: "6px 14px", fontSize: 12, color: t.textMuted, fontFamily: mono, cursor: "pointer" }}>cancel</button>
          <button onClick={submit} type="button" disabled={!title.trim() || !pipelineId}
            style={{ background: title.trim() && pipelineId ? t.accent : t.surface, border: "none", borderRadius: 9, padding: "6px 16px", fontSize: 12, color: title.trim() && pipelineId ? "#fff" : t.textDim, fontFamily: mono, fontWeight: 700, cursor: title.trim() && pipelineId ? "pointer" : "not-allowed" }}>
            add task
          </button>
        </div>
      </div>
    </div>
  );
}
