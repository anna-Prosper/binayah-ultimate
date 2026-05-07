"use client";
import { useState } from "react";
import { T } from "@/lib/themes";
import { type UserType } from "@/lib/data";
import { useModel } from "@/lib/contexts/ModelContext";

export function ReminderPanel({ t, users, currentUser, reminders, onAdd, onDismiss }: {
  t: T;
  users: UserType[];
  currentUser: string;
  reminders: ReturnType<typeof useModel>["reminders"];
  onAdd: (input: { title: string; body: string; recipientIds: string[]; remindAt: string }) => void;
  onDismiss: (id: number) => void;
}) {
  const mono = "var(--font-dm-mono), monospace";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [recipientIds, setRecipientIds] = useState<string[]>([currentUser]);
  const [now] = useState(() => Date.now());
  const relevant = reminders
    .filter(r => r.recipientIds.includes(currentUser) && !(r.dismissedBy || []).includes(currentUser))
    .sort((a, b) => Date.parse(a.remindAt) - Date.parse(b.remindAt))
    .slice(0, 4);
  const toggleRecipient = (id: string) => {
    setRecipientIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const submit = () => {
    onAdd({ title, body, recipientIds, remindAt });
    setTitle("");
    setBody("");
    setRemindAt("");
    setRecipientIds([currentUser]);
    setOpen(false);
  };

  const [sectionCollapsed, setSectionCollapsed] = useState(() => {
    try { return localStorage.getItem("home_section_reminders") === "1"; } catch { return false; }
  });
  const toggleSection = () => setSectionCollapsed(v => { const next = !v; try { localStorage.setItem("home_section_reminders", next ? "1" : "0"); } catch {} return next; });

  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 16 }}>
      <button type="button" onClick={toggleSection} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", marginBottom: (!sectionCollapsed && (open || relevant.length > 0)) ? 12 : 0 }}>
        <div style={{ textAlign: "left" as const }}>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" as const, display: "flex", alignItems: "center", gap: 6 }}>
            reminders
            {relevant.length > 0 && <span style={{ background: t.amber + "22", border: `1px solid ${t.amber}44`, color: t.amber, borderRadius: 8, padding: "0 5px", fontSize: 9, fontFamily: mono, fontWeight: 800 }}>{relevant.length}</span>}
          </div>
          <div style={{ marginTop: 3, fontSize: 16, color: t.text, fontWeight: 900 }}>dated app + email notifications</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>{sectionCollapsed ? "▼" : "▲"}</span>
        </div>
      </button>
      {!sectionCollapsed && <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: open || relevant.length > 0 ? 8 : 0 }}>
        <button type="button" onClick={e => { e.stopPropagation(); setOpen(v => !v); }} style={{ background: t.accent + "16", border: `1px solid ${t.accent}55`, color: t.accent, borderRadius: 8, padding: "5px 10px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>{open ? "close" : "+ reminder"}</button>
      </div>}
      {!sectionCollapsed && open && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, .8fr) minmax(180px, 1fr) auto", gap: 8, alignItems: "start", marginBottom: 12 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="title" maxLength={140} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", color: t.text, fontSize: 12, outline: "none" }} />
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="note (optional)" maxLength={1000} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px", color: t.text, fontSize: 12, outline: "none" }} />
          <input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 9px", color: t.textMuted, fontSize: 11, fontFamily: mono, outline: "none" }} />
          <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 5 }}>
            {users.filter(u => u.id !== "ai").map(u => {
              const selected = recipientIds.includes(u.id);
              return (
                <button key={u.id} type="button" onClick={() => toggleRecipient(u.id)} style={{ background: selected ? u.color + "20" : t.bgHover || t.bgSoft, border: `1px solid ${selected ? u.color + "77" : t.border}`, color: selected ? u.color : t.textMuted, borderRadius: 999, padding: "4px 9px", fontSize: 11, fontFamily: mono, fontWeight: selected ? 800 : 600, cursor: "pointer" }}>
                  {selected ? "✓ " : ""}{u.name}
                </button>
              );
            })}
            <button type="button" onClick={submit} disabled={!title.trim() || !remindAt || recipientIds.length === 0} style={{ marginLeft: "auto", background: title.trim() && remindAt && recipientIds.length ? t.green + "22" : t.bgHover || t.bgSoft, border: `1px solid ${title.trim() && remindAt && recipientIds.length ? t.green + "55" : t.border}`, color: title.trim() && remindAt && recipientIds.length ? t.green : t.textDim, borderRadius: 8, padding: "4px 11px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: title.trim() && remindAt && recipientIds.length ? "pointer" : "not-allowed" }}>schedule</button>
          </div>
        </div>
      )}
      {!sectionCollapsed && relevant.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {relevant.map(r => {
            const due = Date.parse(r.remindAt) <= now;
            return (
              <div key={r.id} style={{ display: "flex", gap: 8, alignItems: "center", border: `1px solid ${due ? t.amber + "55" : t.border}`, background: due ? t.amber + "0d" : t.bgHover || t.bgSoft, borderRadius: 9, padding: "7px 9px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: t.text, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: due ? t.amber : t.textMuted, fontFamily: mono }}>{due ? "due now" : new Date(r.remindAt).toLocaleString()} · {r.body || "no note"}</div>
                </div>
                {due && <button type="button" onClick={() => onDismiss(r.id)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textDim, borderRadius: 7, padding: "3px 8px", fontSize: 10, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>done</button>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
