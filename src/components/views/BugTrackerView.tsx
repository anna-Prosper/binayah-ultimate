"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useModel } from "@/lib/contexts/ModelContext";
import type { T } from "@/lib/themes";
import { ADMIN_IDS, type BugAttachment, type BugSeverity, type BugStatus, type BugType, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { useIsMobile } from "@/hooks/useIsMobile";

const TYPES: BugType[] = ["bug", "test", "qa"];
const SEVERITIES: BugSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: BugStatus[] = ["open", "triage", "testing", "fixed", "closed"];
type StatusFilter = "active" | "all" | "solved" | BugStatus;
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "active", label: "active" },
  { id: "all", label: "all" },
  { id: "open", label: "open" },
  { id: "triage", label: "triage" },
  { id: "testing", label: "testing" },
  { id: "solved", label: "solved" },
];

function colorFor(t: T, severity: BugSeverity) {
  if (severity === "critical") return t.red;
  if (severity === "high") return t.amber;
  if (severity === "medium") return t.accent;
  return t.green;
}

export default function BugTrackerView({ t, currentWorkspaceId }: { t: T; currentWorkspaceId: string }) {
  const { bugs, addBug, updateBug, deleteBug, users, currentUser, workspaces, allPipelinesGlobal, addCustomStage, setStageDescOverride } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  const isMobile = useIsMobile(720);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | BugSeverity>("all");
  const highlightId = useSearchParams().get("highlight");
  const emptyDraft = {
    title: "",
    body: "",
    steps: "",
    expected: "",
    actual: "",
    type: "bug" as BugType,
    severity: "medium" as BugSeverity,
    ownerId: "",
    linkedTask: "",
  };
  const [draft, setDraft] = useState({
    ...emptyDraft,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [attachments, setAttachments] = useState<BugAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pasteTargetId, setPasteTargetId] = useState<number | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [editingBugComment, setEditingBugComment] = useState<{ bugId: number; commentId: number; text: string } | null>(null);
  const [ownerPickerOpen, setOwnerPickerOpen] = useState<"filter" | "draft" | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const existingFileInputRef = useRef<HTMLInputElement | null>(null);
  const [lightbox, setLightbox] = useState<BugAttachment | null>(null);
  const workspaceUsers = useMemo(() => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    const allowed = new Set(ws ? [...ws.members, ...ws.captains] : users.map(u => u.id));
    return users.filter(u => allowed.has(u.id));
  }, [currentWorkspaceId, users, workspaces]);
  useEffect(() => {
    if (ownerFilter === "all" || ownerFilter === "unassigned") return;
    if (!workspaceUsers.some(u => u.id === ownerFilter)) setOwnerFilter("all");
  }, [ownerFilter, workspaceUsers]);

  const MAX_BYTES = 25 * 1024 * 1024;
  const handleFiles = async (files: FileList | File[] | null, targetBugId?: number) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadTargetId(targetBugId ?? null);
    setUploadError(null);
    const newAtts: BugAttachment[] = [];
    for (const f of Array.from(files)) {
      // Reject too-big files locally — Vercel's 4.5MB function payload limit
      // would otherwise truncate the request before it reaches our API.
      if (f.size > MAX_BYTES) {
        const mb = (f.size / 1024 / 1024).toFixed(1);
        setUploadError(`${f.name} is ${mb} MB — max is 25 MB. Compress or screenshot a smaller version.`);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/bugs/upload", { method: "POST", body: fd, credentials: "include" });
        const text = await res.text();
        let data: { attachment?: BugAttachment; error?: string } | null = null;
        try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body — surfaced below */ }
        if (!res.ok) {
          // Surface the actual status + body so the user can see what's wrong
          const reason = data?.error || (text ? text.slice(0, 200) : `status ${res.status}`);
          setUploadError(`${f.name}: ${reason}`);
          continue;
        }
        if (data?.attachment) newAtts.push(data.attachment);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setUploadError(`${f.name}: ${msg}`);
      }
    }
    if (newAtts.length > 0) {
      if (targetBugId) {
        const target = bugs.find(b => b.id === targetBugId);
        updateBug(targetBugId, { attachments: [...(target?.attachments || []), ...newAtts].slice(0, 8) });
      } else {
        setAttachments(prev => [...prev, ...newAtts].slice(0, 8));
      }
    }
    setUploading(false);
    setUploadTargetId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (existingFileInputRef.current) existingFileInputRef.current.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData.items)
      .filter(item => item.kind === "file" && item.type.startsWith("image/"))
      .map(item => item.getAsFile())
      .filter((file): file is File => !!file);
    if (files.length === 0) return;
    e.preventDefault();
    void handleFiles(files, pasteTargetId ?? undefined);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bugs
      .filter(item => !currentWorkspaceId || !item.workspaceId || item.workspaceId === currentWorkspaceId)
      .filter(item => {
        const solved = item.status === "fixed" || item.status === "closed";
        if (status === "active") return !solved;
        if (status === "solved") return solved;
        return status === "all" || item.status === status;
      })
      .filter(item => ownerFilter === "all" || (ownerFilter === "unassigned" ? !item.ownerId : item.ownerId === ownerFilter))
      .filter(item => severityFilter === "all" || item.severity === severityFilter)
      .filter(item => !q || `${item.title} ${item.body} ${item.steps || ""} ${item.expected || ""} ${item.actual || ""} ${item.linkedTask || ""} ${(item.comments || []).map(c => c.text).join(" ")}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const statusRank = (s: BugStatus) => s === "open" ? 0 : s === "triage" ? 1 : s === "testing" ? 2 : s === "fixed" ? 3 : 4;
        const sevRank = (s: BugSeverity) => SEVERITIES.indexOf(s);
        return statusRank(a.status) - statusRank(b.status) || sevRank(a.severity) - sevRank(b.severity) || b.updatedAt - a.updatedAt;
      });
  }, [bugs, currentWorkspaceId, ownerFilter, query, severityFilter, status]);

  useEffect(() => {
    if (!highlightId) return;
    requestAnimationFrame(() => document.getElementById(`bug-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }, [highlightId, visible.length]);

  const submit = () => {
    if (!draft.title.trim()) return;
    addBug({ ...draft, attachments });
    setDraft({ ...emptyDraft });
    setAttachments([]);
    setUploadError(null);
    setCreateOpen(false);
  };

  const addComment = (bugId: number) => {
    const text = (commentDrafts[bugId] || "").trim().slice(0, 3000);
    if (!text || !currentUser) return;
    const item = bugs.find(b => b.id === bugId);
    updateBug(bugId, { comments: [...(item?.comments || []), { id: Date.now(), text, by: currentUser, time: Date.now() }] });
    setCommentDrafts(prev => ({ ...prev, [bugId]: "" }));
  };

  const saveBugComment = () => {
    if (!editingBugComment) return;
    const text = editingBugComment.text.trim().slice(0, 3000);
    if (!text) return;
    const item = bugs.find(b => b.id === editingBugComment.bugId);
    const comment = item?.comments?.find(c => c.id === editingBugComment.commentId);
    if (!item || !comment || comment.by !== currentUser) return;
    updateBug(item.id, {
      comments: (item.comments || []).map(c => c.id === editingBugComment.commentId ? { ...c, text } : c),
    });
    setEditingBugComment(null);
  };

  const pipelineChoices = useMemo(() => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    const ids = ws?.pipelineIds;
    return ids ? allPipelinesGlobal.filter(p => ids.includes(p.id)) : allPipelinesGlobal;
  }, [allPipelinesGlobal, currentWorkspaceId, workspaces]);

  const convertToTask = (bugId: number) => {
    const item = bugs.find(b => b.id === bugId);
    const pipeline = pipelineChoices[0];
    if (!item || !pipeline) return;
    addCustomStage(pipeline.id, item.title);
    setStageDescOverride(item.title, [item.body, item.steps ? `Steps:\n${item.steps}` : "", item.expected ? `Expected:\n${item.expected}` : "", item.actual ? `Actual:\n${item.actual}` : ""].filter(Boolean).join("\n\n"));
    updateBug(item.id, { linkedTask: item.title, status: item.status === "closed" ? item.status : "triage" });
  };

  return (
    <div style={{ marginTop: isMobile ? 8 : 16, padding: isMobile ? 4 : 12 }} onPaste={handlePaste}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: isMobile ? "stretch" : "flex-start", marginBottom: 14, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
        <div>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>bug / testing tracker</div>
          <div style={{ marginTop: 3, fontSize: isMobile ? 20 : 22, color: t.text, fontWeight: 950, lineHeight: 1.18 }}>bugs, QA checks, and fixes</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isMobile ? "stretch" : "flex-end", width: isMobile ? "100%" : "auto" }}>
          <button type="button" onClick={() => { setPasteTargetId(null); setCreateOpen(true); }} style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 10, padding: "10px 12px", fontFamily: mono, fontSize: 13, fontWeight: 900, cursor: "pointer", flex: isMobile ? "1 1 100%" : undefined }}>+ add bug / QA</button>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search tracker..." style={{ width: isMobile ? "100%" : 280, maxWidth: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 13 }} />
        </div>
      </div>

      {createOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28, 16, 38, 0.48)", zIndex: 900, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? 10 : 18, paddingTop: isMobile ? 12 : 18 }} onMouseDown={() => setCreateOpen(false)}>
          <div style={{ width: "min(760px, 100%)", maxHeight: isMobile ? "calc(100vh - 24px)" : "90vh", overflow: "auto", border: `1px solid ${t.border}`, borderRadius: 14, background: t.bgCard, padding: isMobile ? 12 : 14, boxShadow: "0 20px 70px rgba(0,0,0,0.2)" }} onMouseDown={e => { e.stopPropagation(); setPasteTargetId(null); }} onFocus={() => setPasteTargetId(null)}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ color: t.accent, fontSize: 11, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>new tracker item</div>
                <div style={{ marginTop: 2, color: t.text, fontSize: 18, fontWeight: 950 }}>add bug, QA check, or fix</div>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 9, padding: "6px 9px", fontFamily: mono, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>close</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="bug or test title" style={field(t, mono)} />
          <textarea value={draft.body} onChange={e => setDraft(p => ({ ...p, body: e.target.value }))} placeholder="what happened?" rows={3} style={field(t, mono)} />
          <textarea value={draft.steps} onChange={e => setDraft(p => ({ ...p, steps: e.target.value }))} placeholder="steps to reproduce / test steps" rows={3} style={field(t, mono)} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            <textarea value={draft.expected} onChange={e => setDraft(p => ({ ...p, expected: e.target.value }))} placeholder="expected" rows={2} style={field(t, mono)} />
            <textarea value={draft.actual} onChange={e => setDraft(p => ({ ...p, actual: e.target.value }))} placeholder="actual" rows={2} style={field(t, mono)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            <select value={draft.type} onChange={e => setDraft(p => ({ ...p, type: e.target.value as BugType }))} style={field(t, mono)}>{TYPES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={draft.severity} onChange={e => setDraft(p => ({ ...p, severity: e.target.value as BugSeverity }))} style={field(t, mono)}>{SEVERITIES.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
            <OwnerPicker
              t={t}
              mono={mono}
              users={workspaceUsers}
              value={draft.ownerId}
              onChange={ownerId => setDraft(p => ({ ...p, ownerId }))}
              open={ownerPickerOpen === "draft"}
              setOpen={open => setOwnerPickerOpen(open ? "draft" : null)}
              unassignedLabel="unassigned"
              fullWidth
            />
            <input value={draft.linkedTask} onChange={e => setDraft(p => ({ ...p, linkedTask: e.target.value }))} placeholder="linked task optional" style={field(t, mono)} />
          </div>
          {/* Attachments */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/plain,text/markdown,text/csv,application/json,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={e => handleFiles(e.target.files)}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || attachments.length >= 8}
              style={{ background: "transparent", border: `1px dashed ${t.border}`, color: uploading ? t.textDim : t.textMuted, borderRadius: 9, padding: "7px 10px", fontFamily: mono, fontSize: 12, fontWeight: 700, cursor: uploading || attachments.length >= 8 ? "not-allowed" : "pointer", textAlign: "left" }}
            >
              {uploading ? "uploading…" : attachments.length >= 8 ? "max 8 files" : "📎 attach file, screenshot, or paste image"}
            </button>
            {uploadError && <div style={{ fontSize: 11, color: t.red, fontFamily: mono }}>{uploadError}</div>}
            {attachments.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {attachments.map(a => {
                  const isImg = a.contentType.startsWith("image/");
                  return (
                    <div key={a.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: isImg ? 2 : "4px 8px", fontSize: 11, color: t.textMuted, fontFamily: mono, maxWidth: 160 }}>
                      {isImg
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={a.url} alt={a.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 5 }} />
                        : <span>📄</span>
                      }
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>{a.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))} title="Remove" style={{ position: "absolute", top: 1, right: 2, background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button type="button" onClick={submit} style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 10, padding: "10px 12px", fontFamily: mono, fontSize: 13, fontWeight: 900, cursor: "pointer" }}>add tracker item</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
            {STATUS_FILTERS.map(s => (
              <button key={s.id} type="button" onClick={() => setStatus(s.id)} style={{ background: status === s.id ? t.accent + "18" : t.bgCard, border: `1px solid ${status === s.id ? t.accent + "66" : t.border}`, color: status === s.id ? t.accent : t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>{s.label}</button>
            ))}
            <OwnerPicker
              t={t}
              mono={mono}
              users={workspaceUsers}
              value={ownerFilter}
              onChange={setOwnerFilter}
              open={ownerPickerOpen === "filter"}
              setOpen={open => setOwnerPickerOpen(open ? "filter" : null)}
              includeAll
              compact
              fullWidth={isMobile}
            />
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as "all" | BugSeverity)} style={{ ...field(t, mono), width: isMobile ? "100%" : 126, flex: isMobile ? "1 1 100%" : undefined, padding: "5px 8px", fontSize: 11 }}>
              <option value="all">all severity</option>
              {SEVERITIES.map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 10 }}>
            {visible.map(item => {
              const c = colorFor(t, item.severity);
              const isSolved = item.status === "fixed" || item.status === "closed";
              const cardColor = isSolved ? t.green : c;
              const owner = users.find(u => u.id === item.ownerId);
              const canDelete = currentUser && (currentUser === item.createdBy || currentUser === item.ownerId || ADMIN_IDS.includes(currentUser));
              return (
                <div id={`bug-${item.id}`} key={item.id} tabIndex={0} onFocus={() => setPasteTargetId(item.id)} onMouseDown={() => setPasteTargetId(item.id)} style={{ border: `1px solid ${String(item.id) === highlightId ? cardColor : cardColor + "44"}`, background: cardColor + (isSolved ? "0d" : "08"), borderRadius: 12, padding: 11, minWidth: 0, boxShadow: String(item.id) === highlightId ? `0 0 0 3px ${cardColor}22` : "none", outline: pasteTargetId === item.id ? `2px solid ${cardColor}33` : "none", outlineOffset: 2, opacity: isSolved ? 0.78 : 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 96px", gap: 8, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: t.text, fontSize: 14, fontWeight: 900, lineHeight: 1.28, whiteSpace: "normal", overflowWrap: "anywhere", textDecoration: isSolved ? "line-through" : "none", textDecorationColor: cardColor + "aa" }}>{item.title}</div>
                      <div style={{ marginTop: 2, color: cardColor, fontFamily: mono, fontSize: 11, fontWeight: 850 }}>{isSolved ? "solved" : item.type} · {item.severity}{owner ? ` · ${owner.name}` : " · unassigned"}</div>
                    </div>
                    <select value={item.status} onChange={e => updateBug(item.id, { status: e.target.value as BugStatus })} style={{ ...field(t, mono), width: isMobile ? "100%" : 96, padding: "5px 7px", fontSize: 11 }}>
                      {STATUSES.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  {item.body && <div style={{ marginTop: 8, color: t.textMuted, fontSize: 13, lineHeight: 1.45 }}>{item.body}</div>}
                  {item.steps && <div style={{ marginTop: 8, color: t.textDim, fontSize: 12, fontFamily: mono, whiteSpace: "pre-wrap" }}>{item.steps}</div>}
                  {(item.expected || item.actual) && (
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6 }}>
                      {item.expected && <div style={{ background: t.bg, border: `1px solid ${t.green}33`, borderRadius: 8, padding: 7, color: t.textMuted, fontSize: 12 }}><b style={{ color: t.green, fontFamily: mono }}>expected</b><br />{item.expected}</div>}
                      {item.actual && <div style={{ background: t.bg, border: `1px solid ${t.amber}33`, borderRadius: 8, padding: 7, color: t.textMuted, fontSize: 12 }}><b style={{ color: t.amber, fontFamily: mono }}>actual</b><br />{item.actual}</div>}
                    </div>
                  )}
                  {item.attachments && item.attachments.length > 0 && (
                    <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.attachments.map(a => {
                        const isImg = a.contentType.startsWith("image/");
                        if (isImg) {
                          return (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={a.id}
                              src={a.url}
                              alt={a.name}
                              title={a.name}
                              onClick={() => setLightbox(a)}
                              style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${t.border}`, cursor: "zoom-in" }}
                            />
                          );
                        }
                        return (
                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.textMuted, fontFamily: mono, textDecoration: "none", maxWidth: 160 }}>
                            <span>📄</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <input
                      ref={existingFileInputRef}
                      type="file"
                      multiple
                      accept="image/*,application/pdf,text/plain,text/markdown,text/csv,application/json,application/zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={e => { if (uploadTargetId) void handleFiles(e.target.files, uploadTargetId); }}
                      style={{ display: "none" }}
                    />
                    <OwnerPicker
                      t={t}
                      mono={mono}
                      users={workspaceUsers}
                      value={item.ownerId || ""}
                      onChange={ownerId => updateBug(item.id, { ownerId })}
                      open={ownerPickerOpen === item.id}
                      setOpen={open => setOwnerPickerOpen(open ? item.id : null)}
                      compact
                      fullWidth={isMobile}
                    />
                    <select value={item.severity} onChange={e => updateBug(item.id, { severity: e.target.value as BugSeverity })} style={{ ...field(t, mono), width: isMobile ? "calc(50% - 3px)" : 94, flex: isMobile ? "1 1 calc(50% - 3px)" : undefined, padding: "5px 7px", fontSize: 11 }}>
                      {SEVERITIES.map(x => <option key={x}>{x}</option>)}
                    </select>
                    <button type="button" onClick={() => { setPasteTargetId(item.id); setUploadTargetId(item.id); requestAnimationFrame(() => existingFileInputRef.current?.click()); }} disabled={uploading || (item.attachments || []).length >= 8} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: uploading || (item.attachments || []).length >= 8 ? "not-allowed" : "pointer" }}>{uploading && uploadTargetId === item.id ? "uploading…" : "attach"}</button>
                    <button type="button" onClick={() => updateBug(item.id, { status: isSolved ? "open" : "closed" })} style={{ background: isSolved ? t.bgCard : t.green + "14", border: `1px solid ${isSolved ? t.border : t.green + "55"}`, color: isSolved ? t.textMuted : t.green, borderRadius: 8, padding: "5px 8px", fontSize: 11, fontFamily: mono, fontWeight: 900, cursor: "pointer" }}>{isSolved ? "reopen" : "✓ done"}</button>
                    <button type="button" onClick={() => convertToTask(item.id)} disabled={!pipelineChoices.length || !!item.linkedTask} style={{ background: item.linkedTask ? t.green + "12" : t.accent + "12", border: `1px solid ${item.linkedTask ? t.green + "44" : t.accent + "44"}`, color: item.linkedTask ? t.green : t.accent, borderRadius: 8, padding: "5px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: !pipelineChoices.length || item.linkedTask ? "default" : "pointer" }}>{item.linkedTask ? `task: ${item.linkedTask}` : "make task"}</button>
                    {canDelete && <button type="button" onClick={() => deleteBug(item.id)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>delete</button>}
                  </div>
                  <div style={{ marginTop: 10, borderTop: `1px solid ${t.border}`, paddingTop: 8 }}>
                    {(item.comments || []).length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 7 }}>
                        {(item.comments || []).slice(-3).map(cmt => {
                          const by = users.find(u => u.id === cmt.by);
                          const isEditing = editingBugComment?.bugId === item.id && editingBugComment.commentId === cmt.id;
                          return (
                            <div key={cmt.id} style={{ background: t.bg, borderRadius: 8, padding: "6px 8px", fontSize: 12, color: t.textMuted }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                <b style={{ color: by?.color || t.accent }}>{by?.name || cmt.by}</b>
                                <span style={{ color: t.textDim, fontSize: 11 }}>{cmt.time}</span>
                                {cmt.by === currentUser && !isEditing && (
                                  <button type="button" onClick={() => setEditingBugComment({ bugId: item.id, commentId: cmt.id, text: cmt.text })} style={{ marginLeft: "auto", background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 11, fontFamily: mono }}>edit</button>
                                )}
                              </div>
                              {isEditing ? (
                                <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                                  <input
                                    autoFocus
                                    value={editingBugComment.text}
                                    maxLength={3000}
                                    onChange={e => setEditingBugComment(prev => prev ? { ...prev, text: e.target.value } : prev)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") { e.preventDefault(); saveBugComment(); }
                                      if (e.key === "Escape") { e.preventDefault(); setEditingBugComment(null); }
                                    }}
                                    style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 7, padding: "4px 7px", color: t.text, fontFamily: mono, fontSize: 12, outline: "none" }}
                                  />
                                  <button type="button" onClick={saveBugComment} style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 7, padding: "4px 8px", fontSize: 11, fontFamily: mono, fontWeight: 900, cursor: "pointer" }}>save</button>
                                  <button type="button" onClick={() => setEditingBugComment(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textDim, borderRadius: 7, padding: "4px 8px", fontSize: 11, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>cancel</button>
                                </div>
                              ) : (
                                <div style={{ marginTop: 2 }}>{cmt.text}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <input value={commentDrafts[item.id] || ""} maxLength={3000} onChange={e => setCommentDrafts(prev => ({ ...prev, [item.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addComment(item.id); }} placeholder="add test note..." style={{ ...field(t, mono), padding: "6px 8px", fontSize: 12 }} />
                      <button type="button" onClick={() => addComment(item.id)} style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 8, padding: "5px 9px", fontSize: 11, fontFamily: mono, fontWeight: 900, cursor: "pointer", minHeight: 34, flex: isMobile ? "1 1 90px" : undefined }}>send</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {visible.length === 0 && <div style={{ border: `1px dashed ${t.border}`, borderRadius: 12, padding: 28, color: t.textDim, fontFamily: mono, fontSize: 13, textAlign: "center" }}>// no tracker items here</div>}
      </div>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 32, cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }} style={{ position: "absolute", top: 18, right: 22, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 22, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}>✕</button>
          <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", color: "#fff", fontFamily: mono, fontSize: 13, background: "rgba(0,0,0,0.45)", padding: "4px 10px", borderRadius: 8 }}>{lightbox.name}</div>
        </div>
      )}
    </div>
  );
}

function field(t: T, mono: string): CSSProperties {
  return {
    background: t.bg,
    border: `1px solid ${t.border}`,
    borderRadius: 9,
    padding: "8px 10px",
    color: t.text,
    outline: "none",
    fontFamily: mono,
    fontSize: 13,
    width: "100%",
  };
}

function OwnerPicker({
  t,
  mono,
  users,
  value,
  onChange,
  open,
  setOpen,
  includeAll = false,
  unassignedLabel = "unassigned",
  compact = false,
  fullWidth = false,
}: {
  t: T;
  mono: string;
  users: UserType[];
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  includeAll?: boolean;
  unassignedLabel?: string;
  compact?: boolean;
  fullWidth?: boolean;
}) {
  const selected = users.find(u => u.id === value);
  const label = includeAll && value === "all"
    ? "all owners"
    : value === "unassigned" || !value
      ? unassignedLabel
      : selected?.name || value;
  const color = selected?.color || (includeAll && value === "all" ? t.accent : t.textMuted);
  const optionStyle = (active: boolean, activeColor: string): CSSProperties => ({
    width: "100%",
    background: active ? activeColor + "18" : "transparent",
    border: "none",
    borderRadius: 8,
    color: active ? activeColor : t.text,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: mono,
    fontSize: 12,
    fontWeight: active ? 900 : 700,
    padding: "6px 8px",
    textAlign: "left",
  });

  return (
    <div style={{ position: "relative", width: fullWidth ? "100%" : compact ? 150 : "100%", flex: fullWidth ? "1 1 100%" : undefined }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(!open); }}
        style={{
          ...field(t, mono),
          width: "100%",
          padding: compact ? "5px 7px" : "7px 9px",
          fontSize: compact ? 11 : 13,
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
          color,
          fontWeight: 850,
          minHeight: compact ? 30 : 38,
        }}
      >
        {selected ? <AvatarC user={selected} size={compact ? 18 : 22} /> : <span style={{ width: compact ? 18 : 22, height: compact ? 18 : 22, borderRadius: "50%", border: `1px dashed ${t.border}`, display: "inline-flex", alignItems: "center", justifyContent: "center", color: t.textDim, fontSize: 10 }}>-</span>}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{label}</span>
        <span style={{ color: t.textDim, fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div
          data-no-close
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 300, minWidth: 210, width: "max-content", maxWidth: 260, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 5, boxShadow: "0 10px 30px rgba(0,0,0,0.22)" }}
        >
          {includeAll && (
            <button type="button" onClick={() => { onChange("all"); setOpen(false); }} style={optionStyle(value === "all", t.accent)}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: t.accent + "16", color: t.accent, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>◎</span>
              <span style={{ flex: 1 }}>all owners</span>
              {value === "all" && <span>✓</span>}
            </button>
          )}
          <button type="button" onClick={() => { onChange(includeAll ? "unassigned" : ""); setOpen(false); }} style={optionStyle(value === "unassigned" || (!includeAll && !value), t.textMuted)}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", border: `1px dashed ${t.border}`, color: t.textDim, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>-</span>
            <span style={{ flex: 1 }}>{unassignedLabel}</span>
            {(value === "unassigned" || (!includeAll && !value)) && <span>✓</span>}
          </button>
          {users.map(u => {
            const active = value === u.id;
            return (
              <button key={u.id} type="button" onClick={() => { onChange(u.id); setOpen(false); }} style={optionStyle(active, u.color)}>
                <AvatarC user={u} size={22} />
                <span style={{ flex: 1 }}>{u.name}</span>
                {active && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
