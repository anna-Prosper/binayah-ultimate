"use client";
import { useState } from "react";
import { T } from "@/lib/themes";
import { type UserType, type ExecProposal, ADMIN_IDS, EXEC_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { timeAgo, isExecutiveProposal } from "@/lib/timeHelpers";

export function ExecutiveRequestsPanel({ t, currentUser, users, proposals, onSubmit, onUpdate, onApply, onDelete, onCancel }: {
  t: T;
  currentUser: string;
  users: UserType[];
  proposals: ExecProposal[];
  onSubmit: (title: string, body: string) => void;
  onUpdate: (id: number, status: "reviewed" | "rejected" | "canceled") => void;
  onApply: (id: number) => void;
  onDelete: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const mono = "var(--font-dm-mono), monospace";
  const isExec = EXEC_IDS.includes(currentUser);
  const isAdmin = ADMIN_IDS.includes(currentUser);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sectionCollapsed, setSectionCollapsed] = useState(() => {
    try { return localStorage.getItem("home_section_exec") === "1"; } catch { return false; }
  });
  const toggleSection = () => setSectionCollapsed(v => { const next = !v; try { localStorage.setItem("home_section_exec", next ? "1" : "0"); } catch {} return next; });
  const executiveProposals = proposals.filter(isExecutiveProposal);
  const pending = executiveProposals.filter(p => p.status === "pending");
  const visible = isAdmin
    ? executiveProposals.slice(0, 8)
    : proposals.filter(p => p.by === currentUser && isExecutiveProposal(p)).slice(0, 6);
  if (!isExec && !isAdmin) return null;

  const submit = () => {
    if (!title.trim() || !body.trim()) return;
    onSubmit(title, body);
    setTitle("");
    setBody("");
  };

  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16 }}>
      <button type="button" onClick={toggleSection} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", marginBottom: sectionCollapsed ? 0 : 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: isAdmin ? t.green : t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" as const }}>
            {isAdmin ? "exec requests" : "propose to Anna"}
            {isAdmin && pending.length > 0 && <span style={{ background: t.green + "22", border: `1px solid ${t.green}44`, color: t.green, borderRadius: 8, padding: "0 5px", fontSize: 10, fontFamily: mono, fontWeight: 800 }}>{pending.length} open</span>}
          </div>
          <div style={{ marginTop: 4, fontSize: 18, color: t.text, fontWeight: 900 }}>
            {isAdmin ? "executive requests" : "what should the team look at?"}
          </div>
        </div>
        <span style={{ fontSize: 12, color: t.textDim, fontFamily: mono, flexShrink: 0 }}>{sectionCollapsed ? "▼" : "▲"}</span>
      </button>

      {!sectionCollapsed && isExec && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 0.7fr) 1fr auto", gap: 8, alignItems: "stretch", marginBottom: visible.length > 0 ? 12 : 0 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="proposal title"
            maxLength={120}
            style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", color: t.text, fontSize: 13, outline: "none" }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="what should the team look at, approve, or consider?"
            maxLength={1200}
            rows={2}
            style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", color: t.text, fontSize: 13, outline: "none", resize: "vertical", minHeight: 38 }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || !body.trim()}
            style={{ background: (!title.trim() || !body.trim()) ? t.bgHover || t.bgSoft : t.accent + "22", border: `1px solid ${(!title.trim() || !body.trim()) ? t.border : t.accent + "77"}`, borderRadius: 8, color: (!title.trim() || !body.trim()) ? t.textDim : t.accent, padding: "0 14px", fontFamily: mono, fontSize: 13, fontWeight: 800, cursor: (!title.trim() || !body.trim()) ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
          >
            send
          </button>
        </div>
      )}

      {!sectionCollapsed && (visible.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {visible.map(p => {
            const author = users.find(u => u.id === p.by);
            const reviewer = p.reviewedBy ? users.find(u => u.id === p.reviewedBy) : null;
            const color = p.status === "pending" ? t.green : p.status === "rejected" ? t.red : t.textDim;
            const statusLabel = p.status === "reviewed" ? "approved" : p.status;
            return (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", border: `1px solid ${color}33`, background: color + "08", borderRadius: 10 }}>
                {author && <AvatarC user={author} size={22} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: t.text, fontWeight: 800 }}>{p.title}</span>
                    {p.kind && <span style={{ fontSize: 11, color: t.accent, fontFamily: mono }}>{p.kind}</span>}
                    <span style={{ fontSize: 11, color, fontFamily: mono }}>{statusLabel}</span>
                    <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>requested by {author?.name.split(" ")[0] || p.by} · {timeAgo(p.createdAt)}</span>
                    {p.reviewedBy && <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>reviewed by {reviewer?.name.split(" ")[0] || p.reviewedBy}</span>}
                  </div>
                  {p.target && <div style={{ marginTop: 2, fontSize: 11, color: t.textDim, fontFamily: mono }}>target: {p.target}{p.requestedAction ? ` · ${p.requestedAction}` : ""}</div>}
                  <div style={{ marginTop: 3, fontSize: 13, color: t.textMuted, lineHeight: 1.4 }}>{p.body}</div>
                </div>
                {isExec && p.status === "pending" && p.by === currentUser && (
                  <button type="button" onClick={() => onCancel(p.id)} style={{ background: t.amber + "12", border: `1px solid ${t.amber}44`, color: t.amber, borderRadius: 7, padding: "3px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>cancel</button>
                )}
                {isAdmin && p.status === "pending" && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button type="button" onClick={() => onUpdate(p.id, "reviewed")} style={{ background: t.green + "22", border: `1px solid ${t.green}55`, color: t.green, borderRadius: 7, padding: "3px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>approve</button>
                    <button type="button" onClick={() => onUpdate(p.id, "rejected")} style={{ background: t.red + "12", border: `1px solid ${t.red}44`, color: t.red, borderRadius: 7, padding: "3px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>decline</button>
                  </div>
                )}
                {isAdmin && p.status !== "pending" && (
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {p.status === "reviewed" && p.kind && p.kind !== "strategy" && (
                      <button type="button" onClick={() => onApply(p.id)} style={{ background: t.green + "14", border: `1px solid ${t.green}44`, color: t.green, borderRadius: 7, padding: "3px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>apply</button>
                    )}
                    <button type="button" onClick={() => onDelete(p.id)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textDim, borderRadius: 7, padding: "3px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>archive</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: "20px 0", color: t.textDim, fontSize: 13, fontFamily: mono, border: `1px dashed ${t.border}`, borderRadius: 10, textAlign: "center" }}>
          {isAdmin ? "no executive requests yet" : "no proposals sent yet"}
        </div>
      ))}
    </section>
  );
}
