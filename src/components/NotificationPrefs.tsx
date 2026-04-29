"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/themes";

interface NotificationPrefsProps {
  t: T;
}

type PrefsState = {
  emailNotifications: boolean;
  notifyMention: boolean;
  notifyApproved: boolean;
  notifyAssigned: boolean;
  notifyClaim: boolean;
  notifyStatus: boolean;
  notifyComment: boolean;
  notifySubtask: boolean;
};

const ROWS: { key: keyof PrefsState; label: string; hint: string }[] = [
  { key: "notifyMention",  label: "mentions",         hint: "@you in comments and chat" },
  { key: "notifyApproved", label: "approvals",        hint: "your task got points" },
  { key: "notifyAssigned", label: "assignments",      hint: "task assigned to you" },
  { key: "notifyClaim",    label: "claims",           hint: "someone claims your task" },
  { key: "notifyStatus",   label: "status changes",   hint: "task moves to active/blocked" },
  { key: "notifyComment",  label: "comments",         hint: "comment on your task" },
  { key: "notifySubtask",  label: "subtasks",         hint: "subtask events on your task" },
];

export default function NotificationPrefs({ t }: NotificationPrefsProps) {
  const [prefs, setPrefs] = useState<PrefsState | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/prefs")
      .then(r => r.json())
      .then((data: Partial<PrefsState>) => {
        setPrefs({
          emailNotifications: data.emailNotifications ?? true,
          notifyMention:  data.notifyMention  ?? true,
          notifyApproved: data.notifyApproved ?? true,
          notifyAssigned: data.notifyAssigned ?? true,
          notifyClaim:    data.notifyClaim    ?? true,
          notifyStatus:   data.notifyStatus   ?? true,
          notifyComment:  data.notifyComment  ?? true,
          notifySubtask:  data.notifySubtask  ?? true,
        });
      })
      .catch(() => { /* leave null */ });
  }, []);

  const update = useCallback(async (key: keyof PrefsState, val: boolean) => {
    if (!prefs || saving) return;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch("/api/auth/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: val }),
      });
      if (!res.ok) throw new Error("save failed");
      setPrefs(p => p ? { ...p, [key]: val } : p);
    } catch {
      setError("// couldn't save — try again");
    } finally {
      setSaving(null);
    }
  }, [prefs, saving]);

  if (!prefs) return null;

  const masterOff = !prefs.emailNotifications;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Master switch */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5 }}>
          email notifications
        </span>
        <Toggle on={prefs.emailNotifications} onChange={v => update("emailNotifications", v)} disabled={saving === "emailNotifications"} t={t} />
      </div>

      {/* Per-event toggles — collapsed by default */}
      {!masterOff && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}
          >
            {expanded ? "// hide details" : "// per-event settings"}
          </button>
        </div>
      )}

      {!masterOff && expanded && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
          {ROWS.map(row => (
            <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}>{row.label}</div>
                <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{row.hint}</div>
              </div>
              <Toggle on={prefs[row.key] as boolean} onChange={v => update(row.key, v)} disabled={saving === row.key} t={t} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 10, color: t.red ?? "#ff453a", fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange, disabled, t }: { on: boolean; onChange: (v: boolean) => void; disabled: boolean; t: T }) {
  return (
    <button
      onClick={() => onChange(!on)}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center",
        width: 28, height: 16, borderRadius: 12, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? t.accent : t.border,
        padding: 0, transition: "background 0.2s", flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{
        display: "block", width: 12, height: 12, borderRadius: "50%",
        background: t.bg, transform: on ? "translateX(13px)" : "translateX(1px)",
        transition: "transform 0.2s", flexShrink: 0,
      }} />
    </button>
  );
}
