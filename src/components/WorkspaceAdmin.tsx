"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { type UserType, type Workspace, ADMIN_IDS } from "@/lib/data";
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
      <div style={{ fontSize: 15, fontWeight: 800, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}>+ new workspace</div>


      <div style={{ marginTop: 20 }}>
        <FieldLabel t={t}>name</FieldLabel>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Marketing Ops"
          style={{ width: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none" }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <FieldLabel t={t}>icon</FieldLabel>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ICON_OPTIONS.map(i => (
            <button key={i} onClick={() => setIcon(i)} style={{ background: i === icon ? t.accent + "22" : "transparent", border: `1px solid ${i === icon ? t.accent + "55" : t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>{i}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <FieldLabel t={t}>accent color</FieldLabel>
        <div style={{ display: "flex", gap: 4 }}>
          {COLOR_OPTIONS.map(c => (
            <button key={c} onClick={() => setColorKey(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: ck[c], cursor: "pointer", border: colorKey === c ? `2px solid ${t.text}` : `2px solid transparent` }} />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "flex-end" }}>
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
  onSetRank: (userId: string, rank: "operator" | "agent") => void;
  onDelete: () => void;
}

type Rank = "root" | "operator" | "agent";

export function ManageWorkspaceModal({ t, users, workspace, currentUser, onAddMember, onRemoveMember, onSetRank, onDelete, onClose }: ManageProps) {
  const amRoot = ADMIN_IDS.includes(currentUser);
  const amOperator = workspace.captains.includes(currentUser) || amRoot;
  const canManage = amOperator;
  const rankOf = (uid: string): Rank =>
    ADMIN_IDS.includes(uid) ? "root"
    : workspace.captains.includes(uid) ? "operator"
    : "agent";

  const rankLabel = (r: Rank) => r === "root" ? "ROOT" : r === "operator" ? "OPERATOR" : "AGENT";
  const rankIcon = (r: Rank) => r === "root" ? "🔑" : r === "operator" ? "⚡" : "👤";
  const rankColor = (r: Rank) => r === "root" ? t.accent : r === "operator" ? t.amber : t.textDim;
  const memberIds = new Set(workspace.members);
  const nonMembers = users.filter(u => !memberIds.has(u.id));

  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <ModalShell t={t} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 24 }}>{workspace.icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{workspace.name}</div>
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 0 }}>// {workspace.members.length} members · {workspace.pipelineIds.length} pipelines</div>
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
            const isRoot = rank === "root";
            const onlyOperator = workspace.captains.length === 1 && workspace.captains[0] === uid;
            const lockRank = isRoot || onlyOperator; // root rank is global, can't be edited per-workspace
            return (
              <div key={uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12 }}>
                <AvatarC user={u} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: u.color }}>{u.name} {isMe && <span style={{ fontSize: 10, color: t.textDim }}>(you)</span>}</div>
                  <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 0 }}>{u.role}</div>
                </div>
                {amOperator && !lockRank ? (
                  <select
                    value={rank}
                    onChange={e => onSetRank(uid, e.target.value as "operator" | "agent")}
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 4px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", cursor: "pointer" }}
                  >
                    <option value="operator">⚡ operator</option>
                    <option value="agent">👤 agent</option>
                  </select>
                ) : (
                  <span style={{ fontSize: 10, color: rankColor(rank), fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, background: rankColor(rank) + "18", padding: "0 4px", borderRadius: 8 }}>
                    {rankIcon(rank)} {rankLabel(rank)}
                  </span>
                )}
                {canManage && !lockRank && (
                  <button onClick={() => onRemoveMember(uid)} title="Remove from workspace" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: t.red, fontFamily: "var(--font-dm-mono), monospace" }}>×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {canManage && nonMembers.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} style={{ ...secondaryBtn(t), fontSize: 13 }}>+ add member</button>
          ) : (
            <div>
              <FieldLabel t={t}>add member</FieldLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {nonMembers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { onAddMember(u.id); if (nonMembers.length === 1) setShowAdd(false); }}
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left" }}
                  >
                    <AvatarC user={u} size={20} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: u.color, fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                    </div>
                    <span style={{ fontSize: 11, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>+ add</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>cancel</button>
            </div>
          )}
        </div>
      )}

      {amRoot && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "transparent", border: `1px solid ${t.red}55`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13, color: t.red, fontFamily: "var(--font-dm-mono), monospace" }}>🗑 delete workspace</button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: t.red, fontFamily: "var(--font-dm-mono), monospace" }}>// delete {workspace.name}?</span>
              <button onClick={() => { onDelete(); onClose(); }} style={{ background: t.red, border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>yes, delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>cancel</button>
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
        style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", position: "relative" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: t.textMuted, lineHeight: 1, padding: 4 }} aria-label="Close">×</button>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ t, children }: { t: T; children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 4, fontWeight: 700 }}>{children}</div>;
}

function primaryBtn(t: T): React.CSSProperties {
  return { background: t.accent, border: "none", borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace" };
}

function secondaryBtn(t: T): React.CSSProperties {
  return { background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" };
}
