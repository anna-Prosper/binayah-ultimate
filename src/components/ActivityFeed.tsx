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

// Cap client-side rendering at 200 entries
const CLIENT_CAP = 200;

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ activityLog, users, t }: ActivityFeedProps) {
  const capped = activityLog.slice(0, CLIENT_CAP);

  return (
    <NB color={t.accent} style={{ background: t.bgCard, padding: "12px 14px", marginBottom: 8, borderRadius: 16 }}>
      <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 6 }}>
        activity feed
        {activityLog.length > CLIENT_CAP && (
          <span style={{ fontSize: 7, color: t.amber, fontWeight: 700 }}>
            (showing {CLIENT_CAP} of {activityLog.length})
          </span>
        )}
      </div>
      {capped.length === 0 ? (
        <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// no activity yet — make a move</span>
        </div>
      ) : (
        capped.map((a, i) => {
          const u = users.find(x => x.id === a.user);
          const timeStr = relativeTime(a.time);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: i < capped.length - 1 ? `1px solid ${t.border}` : "none" }}>
              {u && <AvatarC user={u} size={16} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                <span style={{ fontSize: 8, color: t.textMuted }}>
                  {" "}{a.type === "claim" ? "claimed" : a.type === "comment" ? "commented on" : a.type === "status" ? "updated" : a.type}{" "}
                </span>
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
