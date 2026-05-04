"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/themes";

interface NotificationPrefsProps {
  t: T;
  targetUserId?: string;
  targetName?: string;
}

type PrefsState = {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  notifyMention: boolean;
  notifyApproved: boolean;
  notifyAssigned: boolean;
  notifyClaim: boolean;
  notifyStatus: boolean;
  notifyComment: boolean;
  notifySubtask: boolean;
  notifyReminder: boolean;
  notifyRequest: boolean;
  notifyDue: boolean;
  notifyChat: boolean;
  notifyDm: boolean;
  notifyBug: boolean;
  notifyOther: boolean;
  inAppMention: boolean;
  inAppApproved: boolean;
  inAppAssigned: boolean;
  inAppClaim: boolean;
  inAppStatus: boolean;
  inAppComment: boolean;
  inAppSubtask: boolean;
  inAppReminder: boolean;
  inAppRequest: boolean;
  inAppDue: boolean;
  inAppChat: boolean;
  inAppDm: boolean;
  inAppBug: boolean;
  inAppOther: boolean;
};

const ROWS: { emailKey: keyof PrefsState; appKey: keyof PrefsState; label: string; hint: string }[] = [
  { emailKey: "notifyMention",  appKey: "inAppMention",  label: "mentions",     hint: "@you in comments and chat" },
  { emailKey: "notifyApproved", appKey: "inAppApproved", label: "approvals",    hint: "your task got points" },
  { emailKey: "notifyAssigned", appKey: "inAppAssigned", label: "assignments",  hint: "task assigned to you" },
  { emailKey: "notifyClaim",    appKey: "inAppClaim",    label: "claims",       hint: "someone claims your task" },
  { emailKey: "notifyStatus",   appKey: "inAppStatus",   label: "status",       hint: "task moves to active/blocked" },
  { emailKey: "notifyComment",  appKey: "inAppComment",  label: "comments",     hint: "comment on your task" },
  { emailKey: "notifySubtask",  appKey: "inAppSubtask",  label: "subtasks",     hint: "subtask events on your task" },
  { emailKey: "notifyReminder", appKey: "inAppReminder", label: "reminders",    hint: "scheduled alerts" },
  { emailKey: "notifyRequest",  appKey: "inAppRequest",  label: "requests",     hint: "approval and exec requests" },
  { emailKey: "notifyDue",      appKey: "inAppDue",      label: "due dates",    hint: "expired and soon-expiring work" },
  { emailKey: "notifyChat",     appKey: "inAppChat",     label: "team chat",    hint: "team chat signals" },
  { emailKey: "notifyDm",       appKey: "inAppDm",       label: "DMs",          hint: "direct messages" },
  { emailKey: "notifyBug",      appKey: "inAppBug",      label: "bugs/tests",   hint: "bug and testing tracker updates" },
  { emailKey: "notifyOther",    appKey: "inAppOther",    label: "other",        hint: "misc alerts" },
];

const PREF_DEFAULTS: PrefsState = {
  emailNotifications: true,
  inAppNotifications: true,
  notifyMention: true, notifyApproved: true, notifyAssigned: true, notifyClaim: true, notifyStatus: true, notifyComment: true, notifySubtask: true,
  notifyReminder: true, notifyRequest: true, notifyDue: true, notifyChat: true, notifyDm: true, notifyBug: true, notifyOther: true,
  inAppMention: true, inAppApproved: true, inAppAssigned: true, inAppClaim: true, inAppStatus: true, inAppComment: true, inAppSubtask: true,
  inAppReminder: true, inAppRequest: true, inAppDue: true, inAppChat: true, inAppDm: true, inAppBug: true, inAppOther: true,
};

export default function NotificationPrefs({ t, targetUserId, targetName }: NotificationPrefsProps) {
  const [prefs, setPrefs] = useState<PrefsState | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const qs = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : "";
    setPrefs(null);
    fetch(`/api/auth/prefs${qs}`)
      .then(r => r.json())
      .then((data: Partial<PrefsState>) => {
        setPrefs({ ...PREF_DEFAULTS, ...data });
      })
      .catch(() => { /* leave null */ });
  }, [targetUserId]);

  const update = useCallback(async (key: keyof PrefsState, val: boolean) => {
    if (!prefs || saving) return;
    setSaving(key);
    setError(null);
    try {
      const qs = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : "";
      const res = await fetch(`/api/auth/prefs${qs}`, {
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
  }, [prefs, saving, targetUserId]);

  if (!prefs) return null;

  const emailOff = !prefs.emailNotifications;
  const inAppOff = !prefs.inAppNotifications;

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5 }}>
          {targetName ? `${targetName} email` : "email notifications"}
        </span>
        <Toggle on={prefs.emailNotifications} onChange={v => update("emailNotifications", v)} disabled={saving === "emailNotifications"} t={t} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5 }}>
          {targetName ? `${targetName} in-app` : "in-app notifications"}
        </span>
        <Toggle on={prefs.inAppNotifications} onChange={v => update("inAppNotifications", v)} disabled={saving === "inAppNotifications"} t={t} />
      </div>

      {(!emailOff || !inAppOff) && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}
          >
            {expanded ? "// hide details" : "// per-event settings"}
          </button>
        </div>
      )}

      {(!emailOff || !inAppOff) && expanded && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 42px 42px", gap: 8, color: t.textDim, fontSize: 9, fontFamily: "var(--font-dm-mono), monospace", textTransform: "uppercase" }}>
            <span />
            <span>email</span>
            <span>app</span>
          </div>
          {ROWS.map(row => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "1fr 42px 42px", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}>{row.label}</div>
                <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{row.hint}</div>
              </div>
              <Toggle on={prefs[row.emailKey] as boolean} onChange={v => update(row.emailKey, v)} disabled={emailOff || saving === row.emailKey} t={t} />
              <Toggle on={prefs[row.appKey] as boolean} onChange={v => update(row.appKey, v)} disabled={inAppOff || saving === row.appKey} t={t} />
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
