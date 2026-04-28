"use client";

import { useRef } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { AvatarC } from "@/components/ui/Avatar";
import NotificationPrefs from "@/components/NotificationPrefs";

interface TeamBarProps {
  ptsFlash: boolean;
  viewingUser: string | null;
  setViewingUser: (id: string | null) => void;
  currentWorkspaceId: string;
  onAvatarClick: (userId: string, avatar: string) => void;
}

export default function TeamBar({ ptsFlash, viewingUser, setViewingUser, currentWorkspaceId, onAvatarClick }: TeamBarProps) {
  const { users, currentUser, claims, getStatus, getPoints, workspaces, streakByUser, t } = useModel();
  const popupRef = useRef<HTMLDivElement>(null);
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;

  const userRankInCurrent = (uid: string): "captain" | "firstMate" | "crew" | null => {
    if (!currentWorkspace) return null;
    if (currentWorkspace.captains.includes(uid)) return "captain";
    if (currentWorkspace.firstMates.includes(uid)) return "firstMate";
    if (currentWorkspace.members.includes(uid)) return "crew";
    return null;
  };

  return (
    <div className="bu-team" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "12px 16px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, flexWrap: "wrap" }}>
      {users.map(u => {
        const isMe = u.id === currentUser;
        const uPts = getPoints(u.id);
        const claimedStages = Object.entries(claims).filter(([, cl]) => (cl as string[]).includes(u.id)).map(([s]) => s);
        const rank = [...users].sort((a, b) => getPoints(b.id) - getPoints(a.id)).findIndex(x => x.id === u.id) + 1;
        const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
        return (
          <div key={u.id} style={{ position: "relative" }}>
            <div onClick={e => { e.stopPropagation(); setViewingUser(viewingUser === u.id ? null : u.id); }} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", borderRadius: 12, padding: "4px 4px", margin: "-4px -6px" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = u.color + "12"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0, position: "relative" }}>
                <AvatarC user={u} size={26} />
                {userRankInCurrent(u.id) === "captain" && <span style={{ position: "absolute", bottom: -2, right: -4, fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>👑</span>}
                {userRankInCurrent(u.id) === "firstMate" && <span style={{ position: "absolute", bottom: -2, right: -4, fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>⚓</span>}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: isMe ? 900 : 800, color: isMe ? u.color : t.text }}>{u.name}</div>
                <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash ? "ptsCount 0.6s ease" : "none", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{uPts}pts</span>
                  {(streakByUser[u.id] ?? 0) >= 2 && (
                    <span title={`${streakByUser[u.id]}-day streak`}>🔥{streakByUser[u.id]}</span>
                  )}
                </div>
              </div>
            </div>
            {viewingUser === u.id && (
              <div ref={popupRef} onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 200, background: t.bgCard, border: `1.5px solid ${u.color}44`, borderRadius: 16, padding: "16px", minWidth: 210, maxWidth: "min(320px, calc(100vw - 32px))", boxShadow: t.shadowLg, animation: "fadeIn 0.15s ease" }}>
                <button onClick={() => setViewingUser(null)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textDim, padding: "0 4px", borderRadius: 8 }}>×</button>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}><div style={{ borderRadius: "50%", background: `linear-gradient(135deg,${u.color},${u.color}66)` }}><AvatarC user={u} size={42} /></div><div><div style={{ fontSize: 15, fontWeight: 900, color: u.color }}>{u.name} <span style={{ fontSize: 13 }}>{rankEmoji}</span></div><div style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div></div></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
                  {[{ val: uPts, label: "pts", color: t.accent }, { val: claimedStages.length, label: "owned", color: t.accent }].map(({ val, label, color }) => (
                    <div key={label} style={{ background: t.bgHover, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash && label === "pts" ? "ptsCount 0.6s ease" : "none" }}>{val}</div><div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div></div>
                  ))}
                </div>
                {claimedStages.length > 0 && (
                  <div style={{ marginBottom: isMe ? 10 : 0 }}>
                    <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>owned stages</div>
                    {claimedStages.map(s => { const st = { active: t.green, "in-progress": t.amber, planned: t.cyan || t.accent, concept: t.purple }[getStatus(s)] || "#888"; return (<div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.textSec, marginBottom: 2 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: st, flexShrink: 0, boxShadow: getStatus(s) === "active" ? `0 0 6px ${st}` : "none" }} /><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</span></div>); })}
                  </div>
                )}
                {claimedStages.length === 0 && <div style={{ fontSize: 10, color: t.textDim, fontStyle: "italic", marginBottom: isMe ? 10 : 0 }}>no stages claimed yet</div>}
                {isMe && (<><button onClick={() => { onAvatarClick(u.id, u.avatar); setViewingUser(null); }} style={{ width: "100%", background: u.color + "18", border: `1px solid ${u.color}44`, borderRadius: 12, padding: "8px", cursor: "pointer", fontSize: 11, color: u.color, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>change avatar →</button><NotificationPrefs t={t} /></>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
