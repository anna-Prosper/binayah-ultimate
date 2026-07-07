"use client";

import { useMemo, useState } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { AvatarC } from "@/components/ui/Avatar";
import { ADMIN_IDS } from "@/lib/data";
import type { DbRow } from "@/lib/data";
import { Plus, Target, X, Trash2, Wallet, Activity, PiggyBank, Percent } from "lucide-react";

// The Campaigns page is a bespoke marketing dashboard rendered over the existing
// "Campaigns" database (so rows still persist + sync through the normal flow).
const WS_ID = "marketing";
const C = {
  name: "camp_name", channel: "camp_channel", status: "camp_status",
  start: "camp_start", end: "camp_end", budget: "camp_budget", spent: "camp_spent",
  owner: "camp_owner", goal: "camp_goal", notes: "camp_notes",
} as const;
const STATUSES = ["Planning", "Active", "Paused", "Complete"] as const;
const CHANNELS = ["Social", "Email", "SEO", "Paid", "PR", "Events"] as const;

type T = ReturnType<typeof useModel>["t"];

function statusColor(s: string, t: T) {
  const v = s.trim().toLowerCase();
  if (v === "active") return t.green;
  if (v === "planning") return t.amber;
  if (v === "paused") return t.orange;
  if (v === "complete") return t.cyan;
  return t.textMuted;
}
function channelColor(ch: string, t: T) {
  const pal = [t.accent, t.green, t.cyan, t.amber, t.orange, t.pink];
  const i = (CHANNELS as readonly string[]).indexOf(ch);
  return i >= 0 ? pal[i % pal.length] : t.textMuted;
}
function num(v: string | undefined) { return parseInt((v || "").replace(/[^\d.]/g, ""), 10) || 0; }
function money(n: number) { return n.toLocaleString("en-US"); }
function fmtDate(v: string | undefined) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CampaignsView() {
  const { databases, users, currentUser, workspaces, addDbRow, updateDbRow, deleteDbRow, t } = useModel();
  const db = databases.find(d => d.workspaceId === WS_ID && d.name === "Campaigns");
  const ws = workspaces.find(w => w.id === WS_ID);
  const canEdit = !!currentUser && (ADMIN_IDS.includes(currentUser) || ws?.members.includes(currentUser) === true || ws?.captains.includes(currentUser) === true);
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: DbRow } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const rows = useMemo(() => db?.rows ?? [], [db]);
  const stats = useMemo(() => {
    const active = rows.filter(r => (r.values[C.status] || "").toLowerCase() === "active").length;
    const budget = rows.reduce((s, r) => s + num(r.values[C.budget]), 0);
    const spent = rows.reduce((s, r) => s + num(r.values[C.spent]), 0);
    return { active, budget, spent, util: budget > 0 ? Math.round((spent / budget) * 100) : 0, total: rows.length };
  }, [rows]);

  if (!db) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: t.textDim, fontSize: 14 }}>
        <Target size={28} style={{ opacity: 0.3 }} />
        <div style={{ marginTop: 8 }}>No Campaigns database in this workspace yet.</div>
      </div>
    );
  }

  const save = (values: Record<string, string>) => {
    if (editing?.mode === "edit" && editing.row) updateDbRow(db.id, editing.row.id, values);
    else {
      const base: Record<string, string> = currentUser ? { [C.owner]: currentUser } : {};
      addDbRow(db.id, { ...base, ...values });
    }
    setEditing(null);
  };

  const statCard = (icon: React.ReactNode, label: string, value: string, accent: string) => (
    <div style={{ flex: "1 1 160px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted }}>
        <span style={{ color: accent, display: "inline-flex" }}>{icon}</span> {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{value}</span>
    </div>
  );

  return (
    <div style={{ padding: "20px 24px 40px", height: "100%", overflow: "auto", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Target size={20} style={{ color: t.accent }} />
        <span style={{ fontSize: 20, fontWeight: 800, color: t.text }}>Campaigns</span>
        <span style={{ fontSize: 12, color: t.textMuted, background: t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 20, padding: "2px 10px" }}>{stats.total}</span>
        <div style={{ flex: 1 }} />
        {canEdit && (
          <button onClick={() => setEditing({ mode: "create" })}
            style={{ display: "flex", alignItems: "center", gap: 6, background: t.accent, border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            <Plus size={15} /> new campaign
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        {statCard(<Activity size={13} />, "active", String(stats.active), t.green)}
        {statCard(<Wallet size={13} />, "total budget", `AED ${money(stats.budget)}`, t.accent)}
        {statCard(<PiggyBank size={13} />, "total spent", `AED ${money(stats.spent)}`, t.orange)}
        {statCard(<Percent size={13} />, "utilization", `${stats.util}%`, stats.util > 90 ? t.red : t.cyan)}
      </div>

      {/* Status board */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, alignItems: "start" }}>
        {STATUSES.map(status => {
          const col = rows.filter(r => (r.values[C.status] || "Planning").toLowerCase() === status.toLowerCase());
          const sc = statusColor(status, t);
          return (
            <div key={status}
              onDragOver={e => { if (dragId != null) { e.preventDefault(); setDragOver(status); } }}
              onDragLeave={() => setDragOver(o => (o === status ? null : o))}
              onDrop={() => { if (dragId != null) { updateDbRow(db.id, dragId, { [C.status]: status }); setDragId(null); setDragOver(null); } }}
              style={{ background: dragOver === status ? t.accent + "12" : t.bgSoft, border: `1px solid ${dragOver === status ? t.accent : t.border}`, borderRadius: 14, padding: 10, minHeight: 120, transition: "background .12s ease, border-color .12s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingLeft: 2 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: sc }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: t.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>{status}</span>
                <span style={{ fontSize: 11, color: t.textMuted }}>{col.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.map(r => {
                  const budget = num(r.values[C.budget]);
                  const spent = num(r.values[C.spent]);
                  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                  const over = spent > budget && budget > 0;
                  const channel = r.values[C.channel] || "";
                  const owner = users.find(u => u.id === r.values[C.owner]);
                  const cc = channelColor(channel, t);
                  return (
                    <div key={r.id}
                      draggable={canEdit}
                      onDragStart={() => setDragId(r.id)}
                      onDragEnd={() => { setDragId(null); setDragOver(null); }}
                      onClick={() => canEdit && setEditing({ mode: "edit", row: r })}
                      title={canEdit ? "Click to edit · drag to change status" : undefined}
                      style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderLeft: `3px solid ${sc}`, borderRadius: 10, padding: 11, cursor: canEdit ? "pointer" : "default", opacity: dragId === r.id ? 0.5 : 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text, flex: 1, lineHeight: 1.3 }}>{r.values[C.name] || "(untitled)"}</span>
                        {owner && <AvatarC user={owner} size={22} />}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {channel && <span style={{ fontSize: 10, fontWeight: 700, color: cc, background: cc + "1f", borderRadius: 6, padding: "2px 8px" }}>{channel}</span>}
                        {(r.values[C.start] || r.values[C.end]) && (
                          <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>
                            {fmtDate(r.values[C.start])}{r.values[C.end] ? ` → ${fmtDate(r.values[C.end])}` : ""}
                          </span>
                        )}
                      </div>
                      {r.values[C.goal] && <div style={{ fontSize: 11, color: t.textSec, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{r.values[C.goal]}</div>}
                      {budget > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ height: 6, borderRadius: 4, background: t.bgSoft, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: over ? t.red : sc, borderRadius: 4 }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: over ? t.red : t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>
                            <span>AED {money(spent)} / {money(budget)}</span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {canEdit && (
                  <button onClick={() => setEditing({ mode: "create", row: undefined })}
                    style={{ background: "transparent", border: `1px dashed ${t.border}`, borderRadius: 8, padding: "7px", color: t.textMuted, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Plus size={12} /> add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && <CampaignEditor mode={editing.mode} row={editing.row} users={users} currentUser={currentUser} t={t}
        onSave={save} onDelete={editing.mode === "edit" && editing.row ? () => { deleteDbRow(db.id, editing.row!.id); setEditing(null); } : undefined} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CampaignEditor({ mode, row, users, currentUser, t, onSave, onDelete, onClose }: {
  mode: "create" | "edit";
  row?: DbRow;
  users: ReturnType<typeof useModel>["users"];
  currentUser: string | null;
  t: T;
  onSave: (values: Record<string, string>) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [v, setV] = useState<Record<string, string>>(() => ({
    [C.name]: row?.values[C.name] || "",
    [C.channel]: row?.values[C.channel] || "Social",
    [C.status]: row?.values[C.status] || "Planning",
    [C.start]: row?.values[C.start] || "",
    [C.end]: row?.values[C.end] || "",
    [C.budget]: row?.values[C.budget] || "",
    [C.spent]: row?.values[C.spent] || "",
    [C.owner]: row?.values[C.owner] || currentUser || "",
    [C.goal]: row?.values[C.goal] || "",
    [C.notes]: row?.values[C.notes] || "",
  }));
  const set = (k: string, val: string) => setV(p => ({ ...p, [k]: val }));
  const input: React.CSSProperties = { background: t.surface, color: t.text, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
  const label = (s: string) => <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: t.textMuted }}>{s}</span>;
  const field = (l: string, node: React.ReactNode) => <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>{label(l)}{node}</label>;
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onMouseDown={e => e.stopPropagation()} style={{ width: "min(460px, 100%)", maxHeight: "88vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, boxShadow: t.shadowLg, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: t.accent }}><Target size={13} /> {mode === "create" ? "new campaign" : "edit campaign"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", display: "flex" }}><X size={16} /></button>
        </div>
        {field("Campaign", <input autoFocus value={v[C.name]} onChange={e => set(C.name, e.target.value)} style={input} />)}
        <div style={{ display: "flex", gap: 10 }}>
          {field("Channel", <select value={v[C.channel]} onChange={e => set(C.channel, e.target.value)} style={{ ...input, cursor: "pointer" }}>{CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}</select>)}
          {field("Status", <select value={v[C.status]} onChange={e => set(C.status, e.target.value)} style={{ ...input, cursor: "pointer" }}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {field("Start", <input type="date" value={v[C.start]} onChange={e => set(C.start, e.target.value)} style={input} />)}
          {field("End", <input type="date" value={v[C.end]} onChange={e => set(C.end, e.target.value)} style={input} />)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {field("Budget AED", <input inputMode="numeric" value={v[C.budget]} onChange={e => set(C.budget, e.target.value)} style={input} />)}
          {field("Spent AED", <input inputMode="numeric" value={v[C.spent]} onChange={e => set(C.spent, e.target.value)} style={input} />)}
        </div>
        {field("Owner", <select value={v[C.owner]} onChange={e => set(C.owner, e.target.value)} style={{ ...input, cursor: "pointer" }}><option value="">— None</option>{users.filter(u => u.id !== "ai").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>)}
        {field("Goal", <textarea value={v[C.goal]} onChange={e => set(C.goal, e.target.value)} rows={2} style={{ ...input, resize: "vertical", minHeight: 48 }} />)}
        {field("Notes", <textarea value={v[C.notes]} onChange={e => set(C.notes, e.target.value)} rows={2} style={{ ...input, resize: "vertical", minHeight: 48 }} />)}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => onSave(v)} style={{ flex: 1, background: t.accent, border: "none", borderRadius: 8, padding: "9px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>save</button>
          {mode === "edit" && onDelete && <button onClick={onDelete} style={{ background: "transparent", border: `1px solid ${t.red}55`, borderRadius: 8, padding: "9px 12px", color: t.red, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={13} /> delete</button>}
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 12px", color: t.textDim, cursor: "pointer", fontSize: 12 }}>cancel</button>
        </div>
      </div>
    </div>
  );
}
