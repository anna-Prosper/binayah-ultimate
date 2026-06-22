"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AtSign, Trash2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { useToasts, ToastContainer } from "@/components/ui/Toast";
import { pipelineData } from "@/lib/data";
import { useIsMobile } from "@/hooks/useIsMobile";
import { invalidateDocCache } from "@/components/SearchPalette";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useModel } from "@/lib/contexts/ModelContext";

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

const MAX_BROWSER_UPLOAD_BYTES = 10 * 1024 * 1024;
const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "pdf", "txt", "md", "csv", "json", "docx", "xlsx", "zip"]);

function canUploadFile(file: File): string | null {
  if (file.size > MAX_BROWSER_UPLOAD_BYTES) return `// file too large — max ${Math.round(MAX_BROWSER_UPLOAD_BYTES / 1024 / 1024)}MB`;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return `// unsupported file type: .${ext || "unknown"}`;
  return null;
}

async function postFileToS3(upload: { url: string; fields: Record<string, string> }, file: File): Promise<void> {
  const form = new FormData();
  Object.entries(upload.fields).forEach(([name, value]) => form.append(name, value));
  form.append("file", file);
  await fetch(upload.url, {
    method: "POST",
    mode: "no-cors",
    body: form,
  });
}

interface DocListItem {
  _id: string;
  title: string;
  createdBy: string;
  updatedBy: string | null;
  pipelineId: string | null;
  updatedAt: string;
}

interface DocSearchItem {
  _id: string;
  title: string;
  pipelineId: string | null;
  plaintext: string;
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

type DocPatchFields = Partial<{ title: string; content: Record<string, unknown>; pipelineId: string | null }>;

interface Props {
  t: T;
  /** When set, immediately opens this doc on mount/change (used by Cmd+K palette routing) */
  initialDocId?: string | null;
  /** When set, only docs belonging to these pipeline IDs (or with no pipeline) are shown */
  workspacePipelineIds?: string[];
}

// Toolbar button component
function ToolbarBtn({
  onClick, active, disabled, children, t, title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  t: T;
  title: string;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      aria-label={title}
      data-tooltip={title}
      style={{
        background: active ? t.accent + "22" : "transparent",
        border: `1px solid ${active ? t.accent + "55" : "transparent"}`,
        borderRadius: 8,
        padding: "4px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: active ? t.accent : t.textMuted,
        fontSize: 13,
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

export default function DocumentsPanel({ t, initialDocId, workspacePipelineIds }: Props) {
  const isMobile = useIsMobile(768);
  const { users, currentUser, sendChat } = useModel();

  const [docs, setDocs] = useState<DocListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocFull | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [filterPipeline, setFilterPipeline] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDocs, setSearchDocs] = useState<Record<string, DocSearchItem>>({});
  const [loadingSearch, setLoadingSearch] = useState(false);
  // Mobile: show list or editor
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  // Attachment upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pingOpen, setPingOpen] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null); // doc id to delete
  const [confirmDeleteAttach, setConfirmDeleteAttach] = useState<string | null>(null); // attachmentId to delete
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toasts, showToast, dismissToast } = useToasts();

  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDraftRef = useRef<string | null>(null);

  // Clear all pending timers on unmount
  useEffect(() => () => {
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    if (contentSaveTimer.current) clearTimeout(contentSaveTimer.current);
    if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
  }, []);

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

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;
    let alive = true;
    setLoadingSearch(true);
    fetch("/api/documents?includeContent=true")
      .then(r => r.ok ? r.json() : null)
      .then((data: { docs?: DocSearchItem[] } | null) => {
        if (!alive || !data?.docs) return;
        setSearchDocs(Object.fromEntries(data.docs.map(doc => [doc._id, doc])));
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingSearch(false); });
    return () => { alive = false; };
  }, [searchQuery]);

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
    titleDraftRef.current = null;
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
        body: JSON.stringify({ title: "untitled", content: null, pipelineId: filterPipeline ?? workspacePipelineIds?.[0] ?? null }),
      });
      if (!res.ok) return;
      const data = await res.json() as { doc: DocFull };
      setDocs(prev => [data.doc, ...prev]);
      await openDoc(data.doc._id);
    } catch { showToast("// failed to create document", t.red); }
  }, [filterPipeline, openDoc, workspacePipelineIds, showToast, t.red]);

  // PATCH helper — sets saveStatus, updates list + activeDoc, surfaces toast on error
  const patchDoc = useCallback(async (id: string, fields: DocPatchFields) => {
    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const data = await res.json() as { doc: DocFull };
        const titleWasSaved = "title" in fields;
        const applyTitleFromServer = titleWasSaved && (titleDraftRef.current === null || titleDraftRef.current === fields.title);
        if (titleWasSaved && titleDraftRef.current === fields.title) titleDraftRef.current = null;
        setDocs(prev => prev.map(d => d._id === id ? {
          ...d,
          updatedAt: data.doc.updatedAt,
          updatedBy: data.doc.updatedBy,
          ...(applyTitleFromServer ? { title: data.doc.title } : {}),
          ...("pipelineId" in fields ? { pipelineId: data.doc.pipelineId } : {}),
        } : d));
        setActiveDoc(prev => prev && prev._id === id ? {
          ...prev,
          updatedAt: data.doc.updatedAt,
          updatedBy: data.doc.updatedBy,
          ...(applyTitleFromServer ? { title: data.doc.title } : {}),
          ...("content" in fields ? { content: data.doc.content } : {}),
          ...("pipelineId" in fields ? { pipelineId: data.doc.pipelineId } : {}),
        } : prev);
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
    }
  }, [showToast, t.red]);

  // Delete document
  const deleteDoc = useCallback(async (id: string) => {
    setConfirmDeleteDoc(id);
  }, []);

  const executeDeleteDoc = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) return;
      setDocs(prev => prev.filter(d => d._id !== id));
      if (activeId === id) {
        setActiveId(null);
        setActiveDoc(null);
        if (isMobile) setMobileView("list");
      }
    } catch { showToast("// failed to delete document", t.red); }
  }, [activeId, isMobile, showToast, t.red]);

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
    const preflightError = canUploadFile(file);
    if (preflightError) {
      showToast(preflightError, t.red);
      return;
    }
    setUploadingFile(true);
    try {
      if (file.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
        const presignRes = await fetch(`/api/documents/${activeId}/attachments/presign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, type: file.type || "application/octet-stream", size: file.size }),
        });
        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}));
          showToast(err.error || `// upload failed (${presignRes.status})`, t.red);
          return;
        }
        const data = await presignRes.json() as { upload: { key: string; url: string; fields: Record<string, string>; publicUrl: string; contentType: string } };
        await postFileToS3(data.upload, file);
        const completeRes = await fetch(`/api/documents/${activeId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: data.upload.key,
            url: data.upload.publicUrl,
            name: file.name,
            contentType: data.upload.contentType,
            size: file.size,
          }),
        });
        if (!completeRes.ok) {
          const err = await completeRes.json().catch(() => ({}));
          showToast(err.error || `// upload saved file but failed to attach (${completeRes.status})`, t.red);
          return;
        }
        const done = await completeRes.json();
        setActiveDoc(prev => prev ? { ...prev, attachments: [...(prev.attachments || []), done.attachment] } : prev);
        showToast(`// uploaded ${file.name}`, t.green);
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/documents/${activeId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || `// upload failed (${res.status})`, t.red);
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
    setConfirmDeleteAttach(attachmentId);
  }, [activeId]);

  const executeDeleteAttach = useCallback(async (attachmentId: string) => {
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
    titleDraftRef.current = val;
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

  const getDocUrl = useCallback((docId = activeDoc?._id) => {
    if (!docId || typeof window === "undefined") return "";
    return `${window.location.origin}/documents?doc=${encodeURIComponent(docId)}`;
  }, [activeDoc?._id]);

  const shareDocument = useCallback(async () => {
    if (!activeDoc) return;
    const url = getDocUrl(activeDoc._id);
    const title = activeDoc.title || "untitled document";
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url });
        showToast("// share sheet opened", t.green);
      } else {
        await navigator.clipboard.writeText(url);
        showToast("// document link copied", t.green);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        showToast("// document link copied", t.green);
      } catch {
        showToast("// could not copy link", t.red);
      }
    }
  }, [activeDoc, getDocUrl, showToast, t.green, t.red]);

  const pingDocument = useCallback((userId: string) => {
    if (!activeDoc || !currentUser) return;
    const url = getDocUrl(activeDoc._id);
    sendChat(`@${userId} please review "${activeDoc.title || "untitled document"}": ${url}`, { threadId: "team" });
    setPingOpen(false);
    showToast(`// pinged ${users.find(u => u.id === userId)?.name || userId}`, t.green);
  }, [activeDoc, currentUser, getDocUrl, sendChat, showToast, t.green, users]);

  const allPipelines = workspacePipelineIds
    ? pipelineData.filter(p => workspacePipelineIds.includes(p.id))
    : pipelineData;
  // Always apply workspace filter: show untagged docs + docs whose pipeline is in this workspace.
  // When workspacePipelineIds is undefined (no workspace context), show everything.
  const filteredDocs = useMemo(() => (
    workspacePipelineIds
      ? docs.filter(doc => !doc.pipelineId || workspacePipelineIds.includes(doc.pipelineId))
      : docs
  ), [docs, workspacePipelineIds]);
  const visibleDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredDocs;
    return filteredDocs.filter(doc => {
      const searchDoc = searchDocs[doc._id];
      const haystack = `${doc.title || ""} ${searchDoc?.title || ""} ${searchDoc?.plaintext || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [filteredDocs, searchDocs, searchQuery]);

  // Skeleton row
  const SkeletonRow = () => (
    <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ height: 12, width: "70%", background: t.bgHover, borderRadius: 8 }} />
      <div style={{ height: 9, width: "40%", background: t.bgHover, borderRadius: 8, opacity: 0.6 }} />
    </div>
  );

  // Attribution strip — renders below title when updatedBy is set
  const updatedByUser = activeDoc?.updatedBy
    ? users.find(u => u.id === activeDoc.updatedBy)
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
      <div style={{ padding: "12px 12px 8px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-geist-mono, monospace)", flex: 1 }}>
          // documents
        </span>
        <button
          onClick={createDoc}
          data-tooltip="Create a new document"
          style={{
            background: t.accent + "18",
            border: `1px solid ${t.accent + "44"}`,
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 12,
            color: t.accent,
            fontWeight: 700,
            fontFamily: "var(--font-geist-mono, monospace)",
            whiteSpace: "nowrap",
          }}
        >
          + new doc
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}` }}>
        <div style={{ position: "relative" }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="search documents..."
            aria-label="Search documents"
            style={{
              width: "100%",
              background: t.bgCard,
              border: `1px solid ${searchQuery ? t.accent + "66" : t.border}`,
              borderRadius: 10,
              padding: "7px 28px 7px 10px",
              outline: "none",
              color: t.text,
              fontSize: 12,
              fontFamily: "var(--font-geist-mono, monospace)",
              boxSizing: "border-box",
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear document search"
              data-tooltip="Clear search"
              style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 3 }}
            >
              ×
            </button>
          ) : (
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: t.textDim, fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)", pointerEvents: "none" }}>⌕</span>
          )}
        </div>
        {searchQuery.trim() && (
          <div style={{ marginTop: 5, fontSize: 10, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
            {loadingSearch ? "searching content..." : `${visibleDocs.length} match${visibleDocs.length === 1 ? "" : "es"}`}
          </div>
        )}
      </div>

      {/* Pipeline filter pills */}
      <div style={{ padding: "8px 12px 4px", display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${t.border}` }}>
        <button
          onClick={() => setFilterPipeline(null)}
          data-tooltip="Show all documents"
          style={{
            background: filterPipeline === null ? t.accent + "22" : "transparent",
            border: `1px solid ${filterPipeline === null ? t.accent + "55" : t.border}`,
            borderRadius: 16,
            padding: "0 8px",
            cursor: "pointer",
            fontSize: 11,
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
              aria-label={p.name}
              data-tooltip={p.name}
              style={{
                background: isActive ? pColor + "22" : "transparent",
                border: `1px solid ${isActive ? pColor + "55" : t.border}`,
                borderRadius: 16,
                padding: isActive ? "0 10px 0 8px" : "0 8px",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: "26px",
                color: isActive ? pColor : t.textMuted,
                fontWeight: isActive ? 800 : 500,
                fontFamily: "var(--font-geist-mono, monospace)",
                transition: "all 0.15s",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span aria-hidden style={{ fontSize: 13 }}>{p.icon}</span>
              {isActive && <span>{p.name.split(" ")[0].toLowerCase()}</span>}
            </button>
          );
        })}
      </div>

      {/* Document list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loadingList ? (
          <>{[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}</>
        ) : visibleDocs.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 8 }}>
            <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)", textAlign: "center", lineHeight: 1.6 }}>
              {searchQuery.trim() ? "// no matching docs" : "// no docs yet — forge one"}
            </span>
            {!searchQuery.trim() && (
              <button
                onClick={createDoc}
                style={{
                  background: t.accent + "22",
                  border: `1px solid ${t.accent + "55"}`,
                  borderRadius: 12,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: t.accent,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}
              >
                + new document
              </button>
            )}
          </div>
        ) : visibleDocs.map(doc => {
          const isActive = activeId === doc._id;
          const creator = users.find(u => u.id === doc.createdBy);
          const pipe = allPipelines.find(p => p.id === doc.pipelineId);
          const pColor = pipe ? colorFromKey(pipe.colorKey, t) : t.textDim;

          return (
            <div
              key={doc._id}
              onClick={() => openDoc(doc._id)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: isActive ? t.bgHover : "transparent",
                borderLeft: `3px solid ${isActive ? t.accent : "transparent"}`,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = t.bgHover + "88"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: t.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.title || "untitled"}
                </span>
                {creator && <AvatarC user={creator} size={16} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {pipe && (
                  <span style={{ fontSize: 11, color: pColor, background: pColor + "18", border: `1px solid ${pColor + "33"}`, borderRadius: 8, padding: "0 4px", fontWeight: 700, fontFamily: "var(--font-geist-mono, monospace)" }}>
                    {pipe.icon} {pipe.name}
                  </span>
                )}
                <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>
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
          <span style={{ fontSize: 13, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)" }}>
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
                  style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)" }}
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
                  fontSize: 22,
                  fontWeight: 800,
                  color: t.text,
                  fontFamily: "var(--font-geist-sans, sans-serif)",
                }}
              />
              {/* Syncing indicator — pulse hairline when saving, text when saved/error */}
              <span style={{
                fontSize: 11,
                fontFamily: "var(--font-geist-mono, monospace)",
                color: saveStatus === "saved" ? t.green : saveStatus === "error" ? t.red : t.textMuted,
                transition: "color 0.3s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}>
                {saveStatus === "saving" ? "" : saveStatus === "saved" ? "// saved" : saveStatus === "error" ? "// save failed" : ""}
              </span>
              <button
                onClick={shareDocument}
                aria-label="Share this document link"
                data-tooltip="Share this document link"
                style={{ background: t.accent + "12", border: `1px solid ${t.accent}44`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13, color: t.accent, fontWeight: 800, fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                share
              </button>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setPingOpen(v => !v)}
                  aria-label="Notify a teammate"
                  data-tooltip="Notify a teammate"
                  style={{
                    background: pingOpen ? t.amber + "22" : "transparent",
                    border: `1px solid ${pingOpen ? t.amber + "66" : t.border}`,
                    borderRadius: 8,
                    width: 30, height: 30,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    color: pingOpen ? t.amber : t.textMuted,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!pingOpen) (e.currentTarget as HTMLElement).style.color = t.amber; }}
                  onMouseLeave={e => { if (!pingOpen) (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                >
                  <AtSign size={15} strokeWidth={2} />
                </button>
                {pingOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 240, maxHeight: 320, overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: t.shadowLg, zIndex: 20, padding: 6 }}>
                    <div style={{ padding: "6px 10px 8px", fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5, textTransform: "uppercase" as const, fontWeight: 800 }}>
                      notify a teammate
                    </div>
                    {users.filter(u => u.id !== currentUser && u.id !== "ai").map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => pingDocument(u.id)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", borderRadius: 8, padding: "7px 8px", cursor: "pointer", color: t.text, textAlign: "left" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = u.color + "16"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <AvatarC user={u} size={22} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteDoc(activeDoc._id)}
                style={{
                  background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8,
                  width: 30, height: 30,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: t.textMuted, transition: "all 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = t.red; (e.currentTarget as HTMLElement).style.borderColor = t.red + "55"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = t.textMuted; (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                aria-label="Delete this document"
                data-tooltip="Delete document"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Syncing pulse hairline — visible only while saving */}
            {saveStatus === "saving" && (
              <div style={{
                height: 2,
                borderRadius: 1,
                background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
                animation: "syncPulse 1.2s ease-in-out infinite",
                marginBottom: 0,
              }} />
            )}

            {/* Attribution strip — shown when updatedBy is set */}
            {activeDoc.updatedBy ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                paddingBottom: 4,
                paddingTop: 0,
              }}>
                {updatedByUser && <AvatarC user={updatedByUser} size={18} />}
                <span style={{
                  fontSize: 12,
                  color: t.textMuted,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                  last saved by {updatedByUser?.name ?? activeDoc.updatedBy},{" "}
                  {relativeTime(activeDoc.updatedAt)}
                </span>
              </div>
            ) : (
              <div style={{ paddingBottom: 4, paddingTop: 0 }}>
                <span style={{
                  fontSize: 12,
                  color: t.textDim,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}>
                  // unsaved
                </span>
              </div>
            )}

            {/* Pipeline tag dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, paddingBottom: 8 }}>
              <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)" }}>pipeline:</span>
              <select
                value={activeDoc.pipelineId ?? ""}
                onChange={e => handlePipelineChange(e.target.value)}
                style={{
                  background: t.bgCard,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "0 4px",
                  fontSize: 12,
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
            <div style={{ padding: "4px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <ToolbarBtn title="Heading 1" t={t} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>H1</ToolbarBtn>
              <ToolbarBtn title="Heading 2" t={t} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>H2</ToolbarBtn>
              <ToolbarBtn title="Bold" t={t} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><strong>B</strong></ToolbarBtn>
              <ToolbarBtn title="Italic" t={t} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><em>I</em></ToolbarBtn>
              <ToolbarBtn title="Bullet list" t={t} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>• —</ToolbarBtn>
              <ToolbarBtn title="Numbered list" t={t} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1.</ToolbarBtn>
              <ToolbarBtn title="Quote" t={t} onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>" "</ToolbarBtn>
            </div>
          )}

          {/* Editor content area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", background: t.bgCard }}>
            <style>{`
              /* TipTap prose overrides — all values derived from t.* tokens via CSS vars */
              .binayah-editor .tiptap { outline: none; min-height: 200px; font-family: var(--font-dm-sans, var(--font-geist-sans, sans-serif)); }
              .binayah-editor .tiptap p { color: var(--doc-text); margin: 0 0 0.8em; font-size: 15px; line-height: 1.75; }
              .binayah-editor .tiptap h1 { color: var(--doc-text); font-size: 26px; font-weight: 850; margin: 0 0 0.55em; line-height: 1.2; }
              .binayah-editor .tiptap h2 { color: var(--doc-text); font-size: 20px; font-weight: 800; margin: 0 0 0.55em; line-height: 1.3; }
              .binayah-editor .tiptap h3 { color: var(--doc-textsec); font-size: 16px; font-weight: 750; margin: 0 0 0.45em; }
              .binayah-editor .tiptap strong { color: var(--doc-text); font-weight: 700; }
              .binayah-editor .tiptap em { color: var(--doc-textsec); font-style: italic; }
              .binayah-editor .tiptap a { color: var(--doc-accent); text-decoration: underline; }
              .binayah-editor .tiptap ul, .binayah-editor .tiptap ol { color: var(--doc-text); padding-left: 1.5em; margin: 0 0 0.75em; }
              .binayah-editor .tiptap li { margin-bottom: 0.3em; font-size: 15px; line-height: 1.65; }
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700 }}>
                    attachments {activeDoc?.attachments && activeDoc.attachments.length > 0 ? `(${activeDoc.attachments.length})` : ""}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.txt,.md,.csv,.json,.docx,.xlsx,.zip,application/pdf,image/*,text/plain,text/markdown,text/csv,application/json,application/zip"
                    style={{ display: "none" }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) { uploadAttachment(file); e.target.value = ""; }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    title="Attach a file to this document"
                    data-tooltip="Attach a file to this document"
                    style={{ background: uploadingFile ? t.surface : t.accent + "18", border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "4px 12px", cursor: uploadingFile ? "wait" : "pointer", fontSize: 13, color: t.accent, fontWeight: 700, fontFamily: "var(--font-geist-mono, monospace)", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {uploadingFile ? "↑ uploading..." : "📎 attach file"}
                  </button>
                </div>
                {activeDoc?.attachments && activeDoc.attachments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {activeDoc.attachments.map(a => {
                      const uploader = users.find(u => u.id === a.uploadedBy);
                      const isImage = a.contentType.startsWith("image/");
                      return (
                        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12 }}>
                          <span style={{ fontSize: 18 }}>{isImage ? "🖼" : a.contentType.includes("pdf") ? "📄" : a.contentType.includes("zip") ? "🗜" : "📎"}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: t.text, textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{a.name}</a>
                            <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", marginTop: 0 }}>
                              {(a.size / 1024).toFixed(1)} kB
                              {uploader && ` · by ${uploader.name}`}
                              {a.uploadedAt && ` · ${relativeTime(a.uploadedAt)}`}
                            </div>
                          </div>
                          <a href={a.url} target="_blank" rel="noreferrer" title="Open this attachment" data-tooltip="Open this attachment" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, color: t.textMuted, fontFamily: "var(--font-geist-mono, monospace)", textDecoration: "none" }}>↓ open</a>
                          <button onClick={() => deleteAttachment(a.id)} title="Remove this attachment" aria-label="Remove this attachment" data-tooltip="Remove this attachment" style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 13, color: t.red, fontFamily: "var(--font-geist-mono, monospace)" }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: t.textDim, fontFamily: "var(--font-geist-mono, monospace)", fontStyle: "italic" }}>
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

      <ConfirmModal
        open={confirmDeleteDoc !== null}
        title="delete this document?"
        body="This will permanently delete the document and all its attachments. This cannot be undone."
        confirmLabel="delete"
        danger={true}
        onConfirm={() => { if (confirmDeleteDoc) executeDeleteDoc(confirmDeleteDoc); setConfirmDeleteDoc(null); }}
        onCancel={() => setConfirmDeleteDoc(null)}
        t={t}
      />
      <ConfirmModal
        open={confirmDeleteAttach !== null}
        title="delete this attachment?"
        body="The file will be permanently removed."
        confirmLabel="delete"
        danger={true}
        onConfirm={() => { if (confirmDeleteAttach) executeDeleteAttach(confirmDeleteAttach); setConfirmDeleteAttach(null); }}
        onCancel={() => setConfirmDeleteAttach(null)}
        t={t}
      />
    </>
  );
}
