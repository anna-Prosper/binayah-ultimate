"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { type UserType, type Workspace } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

const ICON_OPTIONS = ["🏴‍☠️", "🏴", "⚡", "🔬", "🏗️", "💎", "🎯", "🚀", "🧠", "🔥", "📡", "🛸", "⚙️", "🧪", "🌐", "🤖"];
const COLOR_OPTIONS = ["purple", "blue", "green", "amber", "cyan", "red", "orange", "lime", "slate"];

interface BaseProps {
  t: T;
  users: UserType[];
  onClose: () => void;
  ck: Record<string, string>;
}

// ─── Create Workspace modal ──────────────────────────────────────────────────

interface CreateProps extends BaseProps {
  onCreate: (name: string, icon: string, colorKey: string) => void;
}

export function CreateWorkspaceModal({ t, onClose, onCreate, ck }: CreateProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏴");
  const [colorKey, setColorKey] = useState("purple");

  return (
    <ModalShell t={t} onClose={onClose}>
      <div style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}>+ new workspace</div>
      <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>// you&apos;ll be the captain of this one</div>

      <div style={{ marginTop: 20 }}>
        <FieldLabel t={t}>name</FieldLabel>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Marketing Ops"
          style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none" }}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <FieldLabel t={t}>icon</FieldLabel>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ICON_OPTIONS.map(i => (
            <button key={i} onClick={() => setIcon(i)} style={{ background: i === icon ? t.accent + "22" : "transparent", border: `1px solid ${i === icon ? t.accent + "55" : t.border}`, borderRadius: 8, padding: "6px 9px", cursor: "pointer", fontSize: 16 }}>{i}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <FieldLabel t={t}>accent color</FieldLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {COLOR_OPTIONS.map(c => (
            <button key={c} onClick={() => setColorKey(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: ck[c], cursor: "pointer", border: colorKey === c ? `2px solid ${t.text}` : `2px solid transparent` }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={secondaryBtn(t)}>cancel</button>
        <button onClick={() => { onCreate(name, icon, colorKey); onClose(); }} disabled={!name.trim()} style={{ ...primaryBtn(t), opacity: name.trim() ? 1 : 0.4, cursor: name.trim() ? "pointer" : "not-allowed" }}>create workspace</button>
      </div>
    </ModalShell>
  );
}

// ─── Manage Workspace modal ──────────────────────────────────────────────────

interface ManageProps extends BaseProps {
  workspace: Workspace;
  currentUser: string;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onSetRank: (userId: string, rank: "captain" | "firstMate" | "crew") => void;
  onDelete: () => void;
}

export function ManageWorkspaceModal({ t, users, workspace, currentUser, onAddMember, onRemoveMember, onSetRank, onDelete, onClose }: ManageProps) {
  const amCaptain = workspace.captains.includes(currentUser);
  const canManage = amCaptain || workspace.firstMates.includes(currentUser);
  const rankOf = (uid: string) => workspace.captains.includes(uid) ? "captain" : workspace.firstMates.includes(uid) ? "firstMate" : "crew";
  const memberIds = new Set(workspace.members);
  const nonMembers = users.filter(u => !memberIds.has(u.id));

  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <ModalShell t={t} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>{workspace.icon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{workspace.name}</div>
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2 }}>// {workspace.members.length} members · {workspace.pipelineIds.length} pipelines</div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <FieldLabel t={t}>members</FieldLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
          {workspace.members.map(uid => {
            const u = users.find(u => u.id === uid);
            if (!u) return null;
            const rank = rankOf(uid);
            const isMe = uid === currentUser;
            const onlyCaptain = workspace.captains.length === 1 && workspace.captains[0] === uid;
            return (
              <div key={uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10 }}>
                <AvatarC user={u} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: u.color }}>{u.name} {isMe && <span style={{ fontSize: 8, color: t.textDim }}>(you)</span>}</div>
                  <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>{u.role}</div>
                </div>
                {amCaptain ? (
                  <select
                    value={rank}
                    onChange={e => onSetRank(uid, e.target.value as "captain" | "firstMate" | "crew")}
                    disabled={onlyCaptain}
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 6px", fontSize: 9, color: t.text, fontFamily: "var(--font-dm-mono), monospace", cursor: onlyCaptain ? "not-allowed" : "pointer" }}
                  >
                    <option value="captain">👑 captain</option>
                    <option value="firstMate">⚓ first mate</option>
                    <option value="crew">🏴‍☠️ crew</option>
                  </select>
                ) : (
                  <span style={{ fontSize: 8, color: rank === "captain" ? t.amber : rank === "firstMate" ? (t.cyan || t.accent) : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, background: (rank === "captain" ? t.amber : rank === "firstMate" ? (t.cyan || t.accent) : t.textDim) + "18", padding: "2px 6px", borderRadius: 4 }}>
                    {rank === "captain" ? "CAPTAIN" : rank === "firstMate" ? "FIRST MATE" : "CREW"}
                  </span>
                )}
                {canManage && !onlyCaptain && (
                  <button onClick={() => onRemoveMember(uid)} title="Remove from workspace" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 9, color: t.red, fontFamily: "var(--font-dm-mono), monospace" }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canManage && nonMembers.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} style={{ ...secondaryBtn(t), fontSize: 10 }}>+ add member</button>
          ) : (
            <div>
              <FieldLabel t={t}>add member</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
                {nonMembers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { onAddMember(u.id); if (nonMembers.length === 1) setShowAdd(false); }}
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
                  >
                    <AvatarC user={u} size={20} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: u.color, fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                    </div>
                    <span style={{ fontSize: 9, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>+ add</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 6 }}>cancel</button>
            </div>
          )}
        </div>
      )}

      {amCaptain && (
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "transparent", border: `1px solid ${t.red}55`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 10, color: t.red, fontFamily: "var(--font-dm-mono), monospace" }}>🗑 delete workspace</button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: t.red, fontFamily: "var(--font-dm-mono), monospace" }}>// delete {workspace.name}?</span>
              <button onClick={() => { onDelete(); onClose(); }} style={{ background: t.red, border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 10, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>cancel</button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={primaryBtn(t)}>done</button>
      </div>
    </ModalShell>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function ModalShell({ t, onClose, children }: { t: T; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 18, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", position: "relative" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: t.textMuted, lineHeight: 1, padding: 4 }} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ t, children }: { t: T; children: React.ReactNode }) {
  return <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 6, fontWeight: 700 }}>{children}</div>;
}

function primaryBtn(t: T): React.CSSProperties {
  return { background: t.accent, border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace" };
}

function secondaryBtn(t: T): React.CSSProperties {
  return { background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" };
}
