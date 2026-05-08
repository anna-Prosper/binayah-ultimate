"use client";

import { useState } from "react";
import NotificationPrefs from "@/components/NotificationPrefs";
import { ADMIN_IDS } from "@/lib/data";
import { useModel } from "@/lib/contexts/ModelContext";

export default function SettingsView() {
  const { t, users, currentUser } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  const isAdmin = !!currentUser && ADMIN_IDS.includes(currentUser);
  const [showTeam, setShowTeam] = useState(false);
  const me = users.find(u => u.id === currentUser);
  const visibleUsers = users.filter(u => u.id === currentUser || (isAdmin && showTeam && u.id !== currentUser));

  return (
    <div style={{ padding: "18px 0 28px", maxWidth: 980 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>notification preferences</div>
        <div style={{ marginTop: 3, fontSize: 24, color: t.text, fontWeight: 950 }}>notifications</div>
        <div style={{ marginTop: 4, color: t.textDim, fontSize: 13, fontFamily: mono, lineHeight: 1.5 }}>
          This page is mostly for your own alerts. Admin team overrides are hidden unless Anna opens them.
        </div>
        {isAdmin && (
          <button type="button" onClick={() => setShowTeam(v => !v)} style={{ marginTop: 10, background: showTeam ? t.amber + "16" : "transparent", border: `1px solid ${showTeam ? t.amber + "55" : t.border}`, color: showTeam ? t.amber : t.textMuted, borderRadius: 9, padding: "6px 10px", fontSize: 13, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>
            {showTeam ? "hide team overrides" : "show team overrides"}
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 12 }}>
        {(visibleUsers.length ? visibleUsers : me ? [me] : [])
          .map(u => {
            const isMe = u.id === currentUser;
            return (
              <section key={u.id} style={{ background: t.bgCard, border: `1px solid ${isMe ? u.color + "66" : t.border}`, borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ color: isMe ? u.color : t.text, fontSize: 15, fontWeight: 900 }}>{isMe ? "My alerts" : u.name}</div>
                    <div style={{ color: t.textDim, fontSize: 12, fontFamily: mono }}>{u.role}</div>
                  </div>
                  {isAdmin && !isMe && <span style={{ color: t.amber, fontSize: 11, fontFamily: mono, fontWeight: 900 }}>admin</span>}
                </div>
                <NotificationPrefs t={t} targetUserId={u.id} targetName={isMe ? undefined : u.name.split(" ")[0]} defaultExpanded />
              </section>
            );
          })}
      </div>
    </div>
  );
}
