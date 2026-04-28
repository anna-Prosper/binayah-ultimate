"use client";

// Shared user-detail popup. Used by TeamBar (in non-home views) AND HomeView's
// team grid. Same component so behavior is identical regardless of where it's
// rendered; only the parent positions it differently.

import { useRef, useEffect } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { AvatarC } from "@/components/ui/Avatar";
import NotificationPrefs from "@/components/NotificationPrefs";
import { type UserType } from "@/lib/data";

interface UserPopupProps {
  user: UserType;
  onClose: () => void;
  onChangeAvatar?: (userId: string, avatar: string) => void;
  ptsFlash?: boolean;
}

export default function UserPopup({ user, onClose, onChangeAvatar, ptsFlash }: UserPopupProps) {
  const { users, currentUser, claims, getStatus, getPoints, t } = useModel();
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const u = user;
  const isMe = u.id === currentUser;
  const uPts = getPoints(u.id);
  const claimedStages = Object.entries(claims)
    .filter(([, cl]) => (cl as string[]).includes(u.id))
    .map(([s]) => s);
  const rank = [...users].sort((a, b) => getPoints(b.id) - getPoints(a.id)).findIndex(x => x.id === u.id) + 1;
  const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <div
      ref={popupRef}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 200,
        background: t.bgCard, border: `1.5px solid ${u.color}44`, borderRadius: 16, padding: "16px",
        minWidth: 210, maxWidth: "min(320px, calc(100vw - 32px))",
        boxShadow: t.shadowLg, animation: "fadeIn 0.15s ease",
      }}
    >
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textDim, padding: "0 4px", borderRadius: 8 }}
      >×</button>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style={{ borderRadius: "50%", background: `linear-gradient(135deg,${u.color},${u.color}66)` }}>
          <AvatarC user={u} size={42} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: u.color }}>{u.name} <span style={{ fontSize: 13 }}>{rankEmoji}</span></div>
          <div style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
        {[{ val: uPts, label: "pts", color: t.accent }, { val: claimedStages.length, label: "owned", color: t.accent }].map(({ val, label, color }) => (
          <div key={label} style={{ background: t.bgHover, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash && label === "pts" ? "ptsCount 0.6s ease" : "none" }}>{val}</div>
            <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>
      {claimedStages.length > 0 && (
        <div style={{ marginBottom: isMe ? 10 : 0 }}>
          <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>owned stages</div>
          {claimedStages.map(s => {
            const st = ({ active: t.green, "in-progress": t.amber, planned: t.cyan || t.accent, concept: t.purple } as Record<string, string>)[getStatus(s)] || "#888";
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.textSec, marginBottom: 2 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: st, flexShrink: 0, boxShadow: getStatus(s) === "active" ? `0 0 6px ${st}` : "none" }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</span>
              </div>
            );
          })}
        </div>
      )}
      {claimedStages.length === 0 && <div style={{ fontSize: 10, color: t.textDim, fontStyle: "italic", marginBottom: isMe ? 10 : 0 }}>no stages claimed yet</div>}
      {isMe && onChangeAvatar && (
        <>
          <button
            onClick={() => { onChangeAvatar(u.id, u.avatar); onClose(); }}
            style={{ width: "100%", background: u.color + "18", border: `1px solid ${u.color}44`, borderRadius: 12, padding: "8px", cursor: "pointer", fontSize: 11, color: u.color, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}
          >
            change avatar →
          </button>
          <NotificationPrefs t={t} />
        </>
      )}
    </div>
  );
}
