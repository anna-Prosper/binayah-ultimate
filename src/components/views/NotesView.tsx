"use client";

import { useMemo, useState } from "react";
import { ADMIN_IDS } from "@/lib/data";
import { useModel } from "@/lib/contexts/ModelContext";
import { type T } from "@/lib/themes";

export default function NotesView({ t, currentWorkspaceId }: { t: T; currentWorkspaceId: string }) {
  const { notes, addNote, updateNote, deleteNote, users, currentUser } = useModel();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const mono = "var(--font-dm-mono), monospace";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => !n.workspaceId || n.workspaceId === currentWorkspaceId)
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || (n.pinnedTo || "").toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [currentWorkspaceId, notes, query]);

  const submit = () => {
    if (editingId) {
      updateNote(editingId, { title, body });
    } else {
      addNote({ title, body });
    }
    setTitle("");
    setBody("");
    setEditingId(null);
  };

  return (
    <div style={{ padding: "18px 0 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>notes</div>
          <div style={{ fontSize: 24, fontWeight: 950, color: t.text }}>Team memory</div>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search notes..." style={{ width: 260, maxWidth: "45vw", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 12 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 0.8fr) minmax(360px, 1.2fr)", gap: 14 }}>
        <section style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="note title" style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 10px", color: t.text, outline: "none", fontSize: 14, fontWeight: 800 }} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="write a note, checklist, decision, idea..." rows={12} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: 10, color: t.text, outline: "none", resize: "vertical", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submit} disabled={!title.trim() && !body.trim()} style={{ background: t.accent, border: "none", borderRadius: 10, padding: "9px 12px", color: "#fff", fontWeight: 900, fontFamily: mono, cursor: "pointer", opacity: (!title.trim() && !body.trim()) ? 0.45 : 1 }}>{editingId ? "save note" : "+ add note"}</button>
            {editingId && <button onClick={() => { setEditingId(null); setTitle(""); setBody(""); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px", color: t.textMuted, fontFamily: mono, cursor: "pointer" }}>cancel</button>}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, alignContent: "start" }}>
          {visible.map(note => {
            const author = users.find(u => u.id === note.by);
            const canEdit = note.by === currentUser || ADMIN_IDS.includes(currentUser!);
            return (
              <article key={note.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 12, minHeight: 150 }}>
                <div style={{ fontSize: 15, color: t.text, fontWeight: 900, marginBottom: 6 }}>{note.title}</div>
                <div style={{ whiteSpace: "pre-wrap", color: t.textSec, fontSize: 13, lineHeight: 1.5, maxHeight: 220, overflow: "auto" }}>{note.body}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, color: t.textDim, fontSize: 10, fontFamily: mono }}>
                  <span>{author?.name || note.by}</span>
                  <span>·</span>
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  {canEdit && <button onClick={() => { setEditingId(note.id); setTitle(note.title); setBody(note.body); }} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, color: t.textMuted, fontSize: 10, fontFamily: mono, cursor: "pointer" }}>edit</button>}
                  {canEdit && <button onClick={() => deleteNote(note.id)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, color: t.textMuted, fontSize: 10, fontFamily: mono, cursor: "pointer" }}>delete</button>}
                </div>
              </article>
            );
          })}
          {visible.length === 0 && <div style={{ color: t.textDim, fontFamily: mono, fontSize: 12, padding: 24, border: `1px dashed ${t.border}`, borderRadius: 12 }}>// no notes yet</div>}
        </section>
      </div>
    </div>
  );
}
