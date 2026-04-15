"use client";

import { T } from "@/lib/themes";
import { type ActivityItem, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { NB } from "@/components/ui/primitives";

interface ActivityFeedProps {
  activityLog: ActivityItem[];
  users: UserType[];
  t: T;
}

export default function ActivityFeed({ activityLog, users, t }: ActivityFeedProps) {
  return (
    <NB color={t.accent} style={{ background: t.bgCard, padding: "12px 14px", marginBottom: 8, borderRadius: 14, maxHeight: 240, overflow: "auto" }}>
      <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--font-dm-mono), monospace" }}>activity feed</div>
      {activityLog.length === 0 ? (
        <div style={{ fontSize: 9, color: t.textDim, padding: 8 }}>No activity yet</div>
      ) : (
        activityLog.slice(0, 20).map((a, i) => {
          const u = users.find(x => x.id === a.user);
          const ago = Math.round((Date.now() - a.time) / 60000);
          const timeStr = ago < 1 ? "now" : ago < 60 ? `${ago}m` : ago < 1440 ? `${Math.round(ago / 60)}h` : `${Math.round(ago / 1440)}d`;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: i < 19 ? `1px solid ${t.border}` : "none" }}>
              {u && <AvatarC user={u} size={16} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                <span style={{ fontSize: 8, color: t.textMuted }}> {a.type === "claim" ? "claimed" : a.type === "comment" ? "commented on" : a.type === "status" ? "updated" : a.type} </span>
                <span style={{ fontSize: 8, fontWeight: 600, color: t.text }}>{a.target}</span>
                {a.detail && <span style={{ fontSize: 7, color: t.accent, marginLeft: 4 }}>{a.detail}</span>}
              </div>
              <span style={{ fontSize: 7, color: t.textDim, flexShrink: 0 }}>{timeStr}</span>
            </div>
          );
        })
      )}
    </NB>
  );
}
