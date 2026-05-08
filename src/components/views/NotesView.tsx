"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { ADMIN_IDS } from "@/lib/data";
import { useModel } from "@/lib/contexts/ModelContext";
import { type T } from "@/lib/themes";

export default function NotesView({ t, currentWorkspaceId }: { t: T; currentWorkspaceId: string }) {
  const { notes, addNote, updateNote, deleteNote, users, currentUser } = useModel();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinnedTo, setPinnedTo] = useState("");
  const [color, setColor] = useState("accent");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "pinned" | "mine">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const highlightId = useSearchParams().get("highlight");
  const mono = "var(--font-dm-mono), monospace";
  const palette = [
    { id: "accent", label: "accent", c: t.accent },
    { id: "green", label: "green", c: t.green },
    { id: "amber", label: "amber", c: t.amber },
    { id: "cyan", label: "cyan", c: t.cyan || t.accent },
    { id: "red", label: "red", c: t.red },
  ];
  const colorValue = (id?: string) => palette.find(p => p.id === id)?.c || t.accent;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => !n.workspaceId || n.workspaceId === currentWorkspaceId)
      .filter(n => mode === "all" || (mode === "pinned" ? !!n.pinnedTo : n.by === currentUser))
      .filter(n => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || (n.pinnedTo || "").toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.pinnedTo) - Number(!!a.pinnedTo) || b.updatedAt - a.updatedAt);
  }, [currentWorkspaceId, currentUser, mode, notes, query]);

  useEffect(() => {
    if (!highlightId) return;
    requestAnimationFrame(() => document.getElementById(`note-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [highlightId, visible.length]);

  const submit = () => {
    if (editingId) {
      updateNote(editingId, { title, body, pinnedTo, color });
    } else {
      addNote({ title, body, pinnedTo, color });
    }
    setTitle("");
    setBody("");
    setPinnedTo("");
    setColor("accent");
    setEditingId(null);
  };
  const resetEditor = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
    setPinnedTo("");
    setColor("accent");
  };
  const addTemplate = (kind: "checklist" | "decision" | "meeting") => {
    const tpl = kind === "checklist"
      ? "- [ ] \n- [ ] \n- [ ] "
      : kind === "decision"
      ? "Decision:\n\nWhy:\n\nOwner:\n\nNext step:"
      : "Context:\n\nNotes:\n\nActions:\n- [ ] ";
    setBody(prev => prev ? `${prev}\n\n${tpl}` : tpl);
  };

  const renderNoteBody = (note: typeof notes[number], canEdit: boolean) => {
    const lines = note.body.split("\n");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {lines.map((line, idx) => {
          const match = line.match(/^(\s*)- \[( |x|X)\]\s?(.*)$/);
          if (!match) {
            return <div key={idx} style={{ whiteSpace: "pre-wrap" }}>{line || " "}</div>;
          }
          const checked = match[2].toLowerCase() === "x";
          const label = match[3];
          return (
            <label key={idx} style={{ display: "flex", gap: 7, alignItems: "flex-start", cursor: canEdit ? "pointer" : "default", color: checked ? t.textDim : t.textSec }}>
              <input
                type="checkbox"
                checked={checked}
                disabled={!canEdit}
                onChange={() => {
                  const next = [...lines];
                  next[idx] = `${match[1]}- [${checked ? " " : "x"}] ${label}`;
                  updateNote(note.id, { body: next.join("\n") });
                }}
                style={{ marginTop: 2, accentColor: colorValue(note.color) }}
              />
              <span style={{ textDecoration: checked ? "line-through" : "none", whiteSpace: "pre-wrap" }}>{label || " "}</span>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ padding: "18px 0 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>notes</div>
          <div style={{ fontSize: 24, fontWeight: 950, color: t.text }}>Team memory</div>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search notes..." style={{ width: 260, maxWidth: "45vw", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 13 }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {(["all", "pinned", "mine"] as const).map(v => (
          <button key={v} type="button" onClick={() => setMode(v)} style={{ background: mode === v ? t.accent + "18" : t.bgCard, border: `1px solid ${mode === v ? t.accent + "66" : t.border}`, color: mode === v ? t.accent : t.textMuted, borderRadius: 9, padding: "6px 10px", cursor: "pointer", fontFamily: mono, fontSize: 12, fontWeight: 800 }}>{v}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14 }}>
        <section style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {editingId && <div style={{ color: t.amber, fontFamily: mono, fontSize: 11, fontWeight: 900 }}>editing note</div>}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="note title" style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 10px", color: t.text, outline: "none", fontSize: 14, fontWeight: 800 }} />
          <input value={pinnedTo} onChange={e => setPinnedTo(e.target.value)} placeholder="pin/tag optional, e.g. launch, qa, policy" style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 10px", color: t.textMuted, outline: "none", fontSize: 13, fontFamily: mono }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {palette.map(p => (
              <button key={p.id} type="button" onClick={() => setColor(p.id)} title={p.label} style={{ width: 22, height: 22, borderRadius: 999, background: p.c, border: `2px solid ${color === p.id ? t.text : "transparent"}`, cursor: "pointer" }} />
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 5, flexWrap: "wrap" }}>
              <button type="button" onClick={() => addTemplate("checklist")} style={miniBtn(t, mono)}>checklist</button>
              <button type="button" onClick={() => addTemplate("decision")} style={miniBtn(t, mono)}>decision</button>
              <button type="button" onClick={() => addTemplate("meeting")} style={miniBtn(t, mono)}>meeting</button>
            </div>
          </div>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="write a note, checklist, decision, idea..." rows={12} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: 10, color: t.text, outline: "none", resize: "vertical", lineHeight: 1.5 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submit} disabled={!title.trim() && !body.trim()} style={{ background: t.accent, border: "none", borderRadius: 10, padding: "9px 12px", color: "#fff", fontWeight: 900, fontFamily: mono, cursor: "pointer", opacity: (!title.trim() && !body.trim()) ? 0.45 : 1 }}>{editingId ? "save note" : "+ add note"}</button>
            {(editingId || title || body || pinnedTo) && <button onClick={resetEditor} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 12px", color: t.textMuted, fontFamily: mono, cursor: "pointer" }}>clear</button>}
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, alignContent: "start" }}>
          {visible.map(note => {
            const author = users.find(u => u.id === note.by);
            const canEdit = note.by === currentUser || ADMIN_IDS.includes(currentUser!);
            const noteColor = colorValue(note.color);
            return (
              <article id={`note-${note.id}`} key={note.id} style={{ background: t.bgCard, border: `1px solid ${String(note.id) === highlightId ? noteColor : noteColor + "44"}`, borderLeft: `4px solid ${noteColor}`, borderRadius: 12, padding: 12, minHeight: 150, boxShadow: String(note.id) === highlightId ? `0 0 0 3px ${noteColor}22` : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 15, color: t.text, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>{note.title}</div>
                  {note.pinnedTo && <span style={{ color: noteColor, border: `1px solid ${noteColor}55`, borderRadius: 999, padding: "1px 7px", fontFamily: mono, fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" }}>{note.pinnedTo}</span>}
                </div>
                <div style={{ color: t.textSec, fontSize: 13, lineHeight: 1.5, maxHeight: 220, overflow: "auto" }}>{renderNoteBody(note, canEdit)}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10, color: t.textDim, fontSize: 11, fontFamily: mono }}>
                  <span>{author?.name || note.by}</span>
                  <span>·</span>
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  {canEdit && <button onClick={() => { setEditingId(note.id); setTitle(note.title); setBody(note.body); setPinnedTo(note.pinnedTo || ""); setColor(note.color || "accent"); }} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, color: t.textMuted, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>edit</button>}
                  {canEdit && <button onClick={() => deleteNote(note.id)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, color: t.textMuted, fontSize: 11, fontFamily: mono, cursor: "pointer" }}>delete</button>}
                </div>
              </article>
            );
          })}
          {visible.length === 0 && <div style={{ color: t.textDim, fontFamily: mono, fontSize: 13, padding: 24, border: `1px dashed ${t.border}`, borderRadius: 12 }}>// no notes yet</div>}
        </section>
      </div>
    </div>
  );
}

function miniBtn(t: T, mono: string): CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    color: t.textMuted,
    cursor: "pointer",
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 7px",
  };
}
