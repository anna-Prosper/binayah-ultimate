"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { useToasts, ToastContainer } from "@/components/ui/Toast";
import { pipelineData, USERS_DEFAULT } from "@/lib/data";
import { useIsMobile } from "@/hooks/useIsMobile";
import { invalidateDocCache } from "@/components/SearchPalette";

// Color key → theme token helper (matching existing ck pattern in Dashboard)
function colorFromKey(colorKey: string, t: T): string {
  const ck: Record<string, string> = {
    blue: t.accent, purple: t.purple, green: t.green, amber: t.amber,
    cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate,
  };
  return ck[colorKey] || t.accent;
}

// Relative time helper
function relativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

interface DocListItem {
  _id: string;
  title: string;
  createdBy: string;
  updatedBy: string | null;
  pipelineId: string | null;
  updatedAt: string;
}

interface DocAttachment {
  id: string;
  key: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface DocFull extends DocListItem {
  content: Record<string, unknown> | null;
  attachments?: DocAttachment[];
}

interface Props {
  t: T;
  /** When set, immediately opens this doc on mount/change (used by Cmd+K palette routing) */
  initialDocId?: string | null;
}

// Toolbar button component
function ToolbarBtn({
  onClick, active, disabled, children, t,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  t: T;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      style={{
        background: active ? t.accent + "22" : "transparent",
        border: `1px solid ${active ? t.accent + "55" : "transparent"}`,
        borderRadius: 6,
        padding: "3px 7px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: active ? t.accent : t.textMuted,
        fontSize: 11,
        fontWeight: active ? 700 : 500,
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.1s",
        lineHeight: 1.4,
        fontFamily: "var(--font-geist-mono, monospace)",
      }}
    >
      {children}
    </button>
  );
}

export default function DocumentsPanel({ t, initialDocId }: Props) {
  const isMobile = useIsMobile(768);

  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocFull | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [filterPipeline, setFilterPipeline] = useState<string | null>(null);
  // Mobile: show list or editor
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  // Attachment upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toasts, showToast, dismissToast } = useToasts();

  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlight = useRef(false);

  // Fetch document list
  const fetchList = useCallback(async (pipelineFilter?: string | null) => {
    try {
      const url = pipelineFilter
        ? `/api/documents?pipelineId=${encodeURIComponent(pipelineFilter)}`
        : "/api/documents";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as { docs: DocListItem[] };
      setDocs(data.docs);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchList(filterPipeline);
  }, [fetchList, filterPipeline]);

  // Open a document externally when initialDocId prop changes (from Cmd+K routing)
  useEffect(() => {
    if (initialDocId) {
      openDoc(initialDocId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDocId]);

  // Open a document
  const openDoc = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingDoc(true);
    setSaveStatus("idle");
    if (isMobile) setMobileView("editor");
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) return;
      const data = await res.json() as { doc: DocFull };
      setActiveDoc(data.doc);
    } finally {
      setLoadingDoc(false);
    }
  }, [isMobile]);

  // Create new document
  const createDoc = useCallback(async () => {
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "untitled", content: null, pipelineId: filterPipeline }),
      });
      if (!res.ok) return;
      const data = await res.json() as { doc: DocFull };
      setDocs(prev => [data.doc, ...prev]);
      await openDoc(data.doc._id);
    } catch { /* toast not available here, silently fail */ }
  }, [filterPipeline, openDoc]);

  // PATCH helper — sets saveStatus, updates list + activeDoc, surfaces toast on error
  const patchDoc = useCallback(async (id: string, fields: Partial<{ title: string; content: Record<string, unknown>; pipelineId: string | null }>) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const data = await res.json() as { doc: DocFull };
        // Update list item
        setDocs(prev => prev.map(d => d._id === id ? { ...d, ...data.doc } : d));
        // Update activeDoc to pick up server-assigned updatedBy + updatedAt
        setActiveDoc(prev => prev && prev._id === id ? { ...prev, ...data.doc } : prev);
        setSaveStatus("saved");
        // Bust the search palette's doc-content cache so saved content is searchable
        invalidateDocCache();
        if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
        savedIndicatorTimer.current = setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
        showToast("// save failed — check connection", t.red, 4000);
        savedIndicatorTimer.current = setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      showToast("// save failed — check connection", t.red, 4000);
      savedIndicatorTimer.current = setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      saveInFlight.current = false;
    }
  }, [showToast, t.red]);

  // Delete document
  const deleteDoc = useCallback(async (id: string) => {
    if (!confirm("delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setDocs(prev => prev.filter(d => d._id !== id));
      if (activeId === id) {
        setActiveId(null);
        setActiveDoc(null);
        if (isMobile) setMobileView("list");
      }
    } catch { /* silently fail */ }
  }, [activeId, isMobile]);

  // TipTap editor — debounce-save 3s after last keystroke; blur-save cancels debounce
  const editor = useEditor({
    extensions: [StarterKit],
    content: activeDoc?.content ?? "",
    onUpdate: ({ editor }) => {
      if (!activeId) return;
      // Cancel any pending debounce and restart 3s timer
      if (contentSaveTimer.current) clearTimeout(contentSaveTimer.current);
      contentSaveTimer.current = setTimeout(() => {
        patchDoc(activeId, { content: editor.getJSON() as Record<string, unknown> });
      }, 3000);
    },
    onBlur: ({ editor }) => {
      if (!activeId) return;
      // Blur is authoritative — cancel debounce and save immediately
      if (contentSaveTimer.current) {
        clearTimeout(contentSaveTimer.current);
        contentSaveTimer.current = null;
      }
      patchDoc(activeId, { content: editor.getJSON() as Record<string, unknown> });
    },
  });

  // Attachment upload + delete handlers
  const uploadAttachment = useCallback(async (file: File) => {
    if (!activeId) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/documents/${activeId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "// upload failed", t.red);
        return;
      }
      const data = await res.json();
      setActiveDoc(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), data.attachment] } : prev);
      showToast(`// uploaded ${file.name}`, t.green);
    } catch (e) {
      console.error("upload failed", e);
      showToast("// upload failed", t.red);
    } finally {
      setUploadingFile(false);
    }
  }, [activeId, showToast, t.red, t.green]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    if (!activeId) return;
    if (!confirm("Delete this attachment?")) return;
    try {
      const res = await fetch(`/api/documents/${activeId}/attachments/${attachmentId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "// delete failed", t.red);
        return;
      }
      setActiveDoc(prev => prev ? { ...prev, attachments: (prev.attachments || []).filter(a => a.id !== attachmentId) } : prev);
    } catch (e) {
      console.error("delete failed", e);
      showToast("// delete failed", t.red);
    }
  }, [activeId, showToast, t.red]);

  // Update editor content when doc changes
  useEffect(() => {
    if (!editor) return;
    if (activeDoc?.content) {
      editor.commands.setContent(activeDoc.content as Parameters<typeof editor.commands.setContent>[0]);
    } else {
      editor.commands.setContent("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc?._id]);

  // Title change — debounce 800ms; blur save handled by input onBlur
  const handleTitleChange = (val: string) => {
    if (!activeDoc || !activeId) return;
    setActiveDoc(prev => prev ? { ...prev, title: val } : prev);
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      patchDoc(activeId, { title: val });
    }, 800);
  };

  // Title blur — cancel debounce and save immediately (mirrors content blur pattern)
  const handleTitleBlur = (val: string) => {
    if (!activeDoc || !activeId) return;
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = null;
    }
    patchDoc(activeId, { title: val });
  };

  // Pipeline tag change
  const handlePipelineChange = (val: string) => {
    if (!activeDoc || !activeId) return;
    const pid = val === "" ? null : val;
    setActiveDoc(prev => prev ? { ...prev, pipelineId: pid } : prev);
    patchDoc(activeId, { pipelineId: pid });
  };

  const allPipelines = pipelineData;
  const filteredDocs = docs; // server already filters, but filter state drives URL

  // Skeleton row
  const SkeletonRow = () => (
    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ height: 12, width: "70%", background: t.bgHover, borderRadius: 4 }} />
      <div style={{ height: 9, width: "40%", background: t.bgHover, borderRadius: 4, opacity: 0.6 }} />
    </div>
  );

  // Attribution strip — renders below title when updatedBy is set
  const updatedByUser = activeDoc?.updatedBy
    ? USERS_DEFAULT.find(u => u.id === activeDoc.updatedBy)
    : null;

  const listPanel = (
    <div style={{
      width: isMobile ? "100%" : 280,
      flexShrink: 0,
      borderRight: isMobile ? "none" : `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height: "100%",
    }}>
      {/* Header + new doc button */}
      <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: t.textMuted, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-geist-mono, monospace)", flex: 1 }}>
          // documents
        </span>
        <button
          onClick={createDoc}
          style={{
            background: t.accent + "18",
            border: `1px solid ${t.accent + "44"}`,
            borderRadius: 8,
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 9,
            color: t.accent,
            fontWeight: 700,
            fontFamily: "var(--font-geist-mono, monospace)",
            whiteSpace: "nowrap",
          }}
        >
          + new doc
        </button>
      </div>

      {/* Pipeline filter pills */}
      <div style={{ padding: "8px 12px 6px", display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${t.border}` }}>
        <button
          onClick={() => setFilterPipeline(null)}
          style={{
            background: filterPipeline === null ? t.accent + "22" : "transparent",
            border: `1px solid ${filterPipeline === null ? t.accent + "55" : t.border}`,
            borderRadius: 20,
            padding: "2px 9px",
            cursor: "pointer",
            fontSize: 8,
            color: filterPipeline === null ? t.accent : t.textMuted,
            fontWeight: filterPipeline === null ? 700 : 400,
            fontFamily: "var(--font-geist-mono, monospace)",
            transition: "all 0.15s",
          }}
        >
          all
        </button>
        {allPipelines.map(p => {
          const isActive = filterPipeline === p.id;
          const pColor = colorFromKey(p.colorKey, t);
          return (
            <button
              key={p.id}
              onClick={() => setFilterPipeline(isActive ? null : p.id)}
              style={{
                background: isActive ? pColor + "22" : "transparent",
                border: `1px solid ${isActive ? pColor + "55" : t.border}`,
                borderRadius: 20,
                padding: "2px 9px",
                cursor: "pointer",
                fontSize: 8,
                color: isActive ? pColor : t.textMuted,
                fontWeight: isActive ? 700 : 400,
                fontFamily: "var(--font-geist-mono, monospace)",
                transition: "all 0.15s",
              }}
            >
              {p.icon}
            </button>
          );
        })}
      </div>

      {/* Document list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loadingList ? (
          <>{[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}</>
        ) : filteredDocs.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 10 }}>
            <span style={{ fontSize: 9, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)", textAlign: "center", lineHeight: 1.6 }}>
              // no docs yet — forge one
            </span>
            <button
              onClick={createDoc}
              style={{
                background: t.accent + "22",
                border: `1px solid ${t.accent + "55"}`,
                borderRadius: 10,
                padding: "7px 16px",
                cursor: "pointer",
                fontSize: 10,
                color: t.accent,
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono, monospace)",
              }}
            >
              + new document
            </button>
          </div>
        ) : filteredDocs.map(doc => {
          const isActive = activeId === doc._id;
          const creator = USERS_DEFAULT.find(u => u.id === doc.createdBy);
          const pipe = allPipelines.find(p => p.id === doc.pipelineId);
          const pColor = pipe ? colorFromKey(pipe.colorKey, t) : t.textDim;

          return (
            <div
              key={doc._id}
              onClick={() => openDoc(doc._id)}
              style={{
                padding: "9px 14px",
                cursor: "pointer",
                background: isActive ? t.bgHover : "transparent",
                borderLeft: `3px solid ${isActive ? t.accent : "transparent"}`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = t.bgHover + "88"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 600, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.title || "untitled"}
                </span>
                {creator && <AvatarC user={creator} size={16} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {pipe && (
                  <span style={{ fontSize: 7, color: pColor, background: pColor + "18", border: `1px solid ${pColor + "33"}`, borderRadius: 8, padding: "1px 6px", fontWeight: 700, fontFamily: "var(--font-geist-mono, monospace)" }}>
                    {pipe.icon} {pipe.name}
                  </span>
                )}
                <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
                  {relativeTime(doc.updatedAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const editorPanel = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
      {!activeId ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)" }}>
            // select a doc or create one
          </span>
        </div>
      ) : loadingDoc ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${t.border}`, borderTopColor: t.accent, animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : activeDoc ? (
        <>
          {/* Editor header */}
          <div style={{ padding: "12px 20px 0", borderBottom: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 4 }}>
              {/* Back button on mobile */}
              {isMobile && (
                <button
                  onClick={() => setMobileView("list")}
                  style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 9px", cursor: "pointer", fontSize: 9, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)" }}
                >
                  ← back
                </button>
              )}
              {/* Title input */}
              <input
                value={activeDoc.title}
                onChange={e => handleTitleChange(e.target.value)}
                onBlur={e => handleTitleBlur(e.target.value)}
                placeholder="untitled"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 18,
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: "var(--font-geist-sans, sans-serif)",
                }}
              />
              {/* Syncing indicator — pulse hairline when saving, text when saved/error */}
              <span style={{
                fontSize: 8,
                fontFamily: "var(--font-geist-mono, monospace)",
                color: saveStatus === "saved" ? t.green : saveStatus === "error" ? t.red : t.textMuted,
                transition: "color 0.3s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                {saveStatus === "saving" ? "" : saveStatus === "saved" ? "// saved" : saveStatus === "error" ? "// save failed" : ""}
              </span>
              {/* Delete button */}
              <button
                onClick={() => deleteDoc(activeDoc._id)}
                style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: t.textMuted }}
                title="delete document"
              >
                🗑
              </button>
            </div>

            {/* Syncing pulse hairline — visible only while saving */}
            {saveStatus === "saving" && (
              <div style={{
                height: 2,
                borderRadius: 1,
                background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
                animation: "syncPulse 1.2s ease-in-out infinite",
                marginBottom: 2,
              }} />
            )}

            {/* Attribution strip — shown when updatedBy is set */}
            {activeDoc.updatedBy ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                paddingBottom: 6,
                paddingTop: 2,
              }}>
                {updatedByUser && <AvatarC user={updatedByUser} size={16} />}
                <span style={{
                  fontSize: 9,
                  color: t.textMuted,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                  last saved by {updatedByUser?.name ?? activeDoc.updatedBy},{" "}
                  {relativeTime(activeDoc.updatedAt)}
                </span>
              </div>
            ) : (
              <div style={{ paddingBottom: 6, paddingTop: 2 }}>
                <span style={{
                  fontSize: 9,
                  color: t.textDim,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                  // unsaved
                </span>
              </div>
            )}

            {/* Pipeline tag dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, paddingBottom: 8 }}>
              <span style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>pipeline:</span>
              <select
                value={activeDoc.pipelineId ?? ""}
                onChange={e => handlePipelineChange(e.target.value)}
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 9,
                  color: t.textSec,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="">no pipeline</option>
                {allPipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toolbar */}
          {editor && (
            <div style={{ padding: "6px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 3, flexWrap: "wrap" }}>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>H1</ToolbarBtn>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>H2</ToolbarBtn>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><strong>B</strong></ToolbarBtn>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><em>I</em></ToolbarBtn>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>• —</ToolbarBtn>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1.</ToolbarBtn>
              <ToolbarBtn t={t} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>" "</ToolbarBtn>
            </div>
          )}

          {/* Editor content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: t.bgCard }}>
            <style>{`
              /* TipTap prose overrides — all values derived from t.* tokens via CSS vars */
              .binayah-editor .tiptap { outline: none; min-height: 200px; }
              .binayah-editor .tiptap p { color: var(--doc-text); margin: 0 0 0.75em; font-size: 13px; line-height: 1.7; }
              .binayah-editor .tiptap h1 { color: var(--doc-text); font-size: 22px; font-weight: 800; margin: 0 0 0.5em; line-height: 1.2; }
              .binayah-editor .tiptap h2 { color: var(--doc-text); font-size: 17px; font-weight: 700; margin: 0 0 0.5em; line-height: 1.3; }
              .binayah-editor .tiptap h3 { color: var(--doc-textsec); font-size: 14px; font-weight: 700; margin: 0 0 0.4em; }
              .binayah-editor .tiptap strong { color: var(--doc-text); font-weight: 700; }
              .binayah-editor .tiptap em { color: var(--doc-textsec); font-style: italic; }
              .binayah-editor .tiptap a { color: var(--doc-accent); text-decoration: underline; }
              .binayah-editor .tiptap ul, .binayah-editor .tiptap ol { color: var(--doc-text); padding-left: 1.5em; margin: 0 0 0.75em; }
              .binayah-editor .tiptap li { margin-bottom: 0.25em; font-size: 13px; line-height: 1.6; }
              .binayah-editor .tiptap blockquote { border-left: 3px solid var(--doc-border); padding-left: 1em; margin: 0 0 0.75em; color: var(--doc-textsec); font-style: italic; }
              .binayah-editor .tiptap hr { border: none; border-top: 1px solid var(--doc-border); margin: 1.5em 0; }
              .binayah-editor .tiptap code { background: var(--doc-surface); color: var(--doc-accent); border-radius: 4px; padding: 1px 6px; font-family: var(--font-geist-mono, monospace); font-size: 11px; }
              .binayah-editor .tiptap pre { background: var(--doc-surface); border-radius: 8px; padding: 12px 16px; overflow-x: auto; margin: 0 0 0.75em; }
              .binayah-editor .tiptap pre code { background: none; padding: 0; color: var(--doc-text); }
              .binayah-editor .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--doc-textdim); pointer-events: none; float: left; height: 0; font-style: italic; }
            `}</style>
            <div
              className="binayah-editor"
              style={{
                // Inject theme tokens as CSS custom properties scoped to this element
                "--doc-text": t.text,
                "--doc-textsec": t.textSec,
                "--doc-textmuted": t.textMuted,
                "--doc-textdim": t.textDim,
                "--doc-accent": t.accent,
                "--doc-border": t.border,
                "--doc-surface": t.surface,
              } as React.CSSProperties}
            >
              <EditorContent editor={editor} />

              {/* Attachments */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${t.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700 }}>
                    attachments {activeDoc?.attachments && activeDoc.attachments.length > 0 ? `(${activeDoc.attachments.length})` : ""}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { uploadAttachment(file); e.target.value = ""; }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    style={{ background: uploadingFile ? t.surface : t.accent + "18", border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "5px 12px", cursor: uploadingFile ? "wait" : "pointer", fontSize: 10, color: t.accent, fontWeight: 700, fontFamily: "var(--font-geist-mono, monospace)", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    {uploadingFile ? "↑ uploading..." : "📎 attach file"}
                  </button>
                </div>
                {activeDoc?.attachments && activeDoc.attachments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {activeDoc.attachments.map(a => {
                      const uploader = USERS_DEFAULT.find(u => u.id === a.uploadedBy);
                      const isImage = a.contentType.startsWith("image/");
                      return (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10 }}>
                          <span style={{ fontSize: 18 }}>{isImage ? "🖼" : a.contentType.includes("pdf") ? "📄" : a.contentType.includes("zip") ? "🗜" : "📎"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 600, color: t.text, textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{a.name}</a>
                            <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", marginTop: 2 }}>
                              {(a.size / 1024).toFixed(1)} kB
                              {uploader && ` · by ${uploader.name}`}
                              {a.uploadedAt && ` · ${relativeTime(a.uploadedAt)}`}
                            </div>
                          </div>
                          <a href={a.url} target="_blank" rel="noreferrer" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "4px 10px", fontSize: 9, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none" }}>↓ open</a>
                          <button onClick={() => deleteAttachment(a.id)} title="Remove" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: t.red, fontFamily: "var(--font-geist-mono, monospace)" }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", fontStyle: "italic" }}>
                    // no files attached — drop one above
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        height: "100%",
        flex: 1,
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        overflow: "hidden",
        animation: "fadeIn 0.2s ease",
      }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes syncPulse {
            0%   { opacity: 0.3; transform: scaleX(0.4); }
            50%  { opacity: 1;   transform: scaleX(1); }
            100% { opacity: 0.3; transform: scaleX(0.4); }
          }
        `}</style>

        {/* Mobile: show list OR editor */}
        {isMobile ? (
          <>
            {mobileView === "list" && listPanel}
            {mobileView === "editor" && editorPanel}
          </>
        ) : (
          <>
            {listPanel}
            {editorPanel}
          </>
        )}
      </div>

      {/* Toast container — rendered outside the panel so it's not clipped */}
      <ToastContainer t={t} toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
