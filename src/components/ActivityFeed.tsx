"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { type ActivityItem, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { NB } from "@/components/ui/primitives";

interface ActivityFeedProps {
  activityLog: ActivityItem[];
  users: UserType[];
  t: T;
}

const INITIAL_SHOW = 10;
const PAGE_SIZE = 10;

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
  const [showCount, setShowCount] = useState(INITIAL_SHOW);
  const visible = activityLog.slice(0, showCount);
  const hasMore = activityLog.length > showCount;

  return (
    <NB color={t.accent} style={{ background: t.bgCard, padding: "12px 12px", marginBottom: 8, borderRadius: 16 }}>
      <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
        activity feed
        {activityLog.length > 0 && (
          <span style={{ fontSize: 10, color: t.textDim }}>({activityLog.length})</span>
        )}
      </div>
      {activityLog.length === 0 ? (
        <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// no activity yet — make a move</span>
        </div>
      ) : (
        <>
          {visible.map((a, i) => {
            const u = users.find(x => x.id === a.user);
            const timeStr = relativeTime(a.time);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 0", borderBottom: i < visible.length - 1 ? `1px solid ${t.border}` : "none" }}>
                {u && <AvatarC user={u} size={16} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>
                    {" "}{a.type === "claim" ? "claimed" : a.type === "comment" ? "commented on" : a.type === "status" ? "updated" : a.type}{" "}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>{a.target}</span>
                  {a.detail && <span style={{ fontSize: 10, color: t.accent, marginLeft: 4 }}>{a.detail}</span>}
                </div>
                <span style={{ fontSize: 10, color: t.textDim, flexShrink: 0 }}>{timeStr}</span>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={() => setShowCount(c => c + PAGE_SIZE)}
              style={{ marginTop: 6, width: "100%", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 0", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; (e.currentTarget as HTMLElement).style.color = t.accent; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
            >
              show more ({activityLog.length - showCount} remaining)
            </button>
          )}
        </>
      )}
    </NB>
  );
}
