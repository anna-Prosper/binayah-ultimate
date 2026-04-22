"use client";

import { useState, useEffect } from "react";
import { T } from "@/lib/themes";

interface NotificationPrefsProps {
  t: T;
}

/**
 * Small inline toggle for email notifications in the user stats popup.
 * Fetches current preference on mount, patches on toggle.
 */
export default function NotificationPrefs({ t }: NotificationPrefsProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null); // null = loading
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current preference
  useEffect(() => {
    fetch("/api/auth/prefs")
      .then(r => r.json())
      .then((data: { emailNotifications?: boolean; error?: string }) => {
        if (typeof data.emailNotifications === "boolean") {
          setEnabled(data.emailNotifications);
        }
      })
      .catch(() => {
        // Non-fatal — leave as null (hidden)
      });
  }, []);

  async function handleToggle() {
    if (enabled === null || saving) return;
    const newVal = !enabled;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: newVal }),
      });
      if (!res.ok) throw new Error("save failed");
      setEnabled(newVal);
    } catch {
      setError("// couldn't save — try again");
    } finally {
      setSaving(false);
    }
  }

  // Don't render until preference is loaded
  if (enabled === null) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontSize: 9,
            color: t.textDim,
            fontFamily: "var(--font-dm-mono), monospace",
            letterSpacing: 0.5,
          }}
        >
          email notifications
        </span>

        {/* Toggle pill */}
        <button
          onClick={handleToggle}
          disabled={saving}
          title={enabled ? "click to disable email notifications" : "click to enable email notifications"}
          style={{
            display: "flex",
            alignItems: "center",
            width: 34,
            height: 18,
            borderRadius: 9,
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            background: enabled ? t.accent : t.border,
            padding: 2,
            transition: "background 0.2s",
            flexShrink: 0,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <span
            style={{
              display: "block",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: t.bg,
              transform: enabled ? "translateX(16px)" : "translateX(0)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          />
        </button>
      </div>

      {error && (
        <div
          style={{
            fontSize: 8,
            color: t.red ?? "#ff453a",
            fontFamily: "var(--font-dm-mono), monospace",
            marginTop: 3,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
