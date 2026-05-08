"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useModel } from "@/lib/contexts/ModelContext";
import type { T } from "@/lib/themes";
import { ADMIN_IDS, type BugAttachment, type BugSeverity, type BugStatus, type BugType } from "@/lib/data";

const TYPES: BugType[] = ["bug", "test", "qa"];
const SEVERITIES: BugSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: BugStatus[] = ["open", "triage", "testing", "fixed", "closed"];

function colorFor(t: T, severity: BugSeverity) {
  if (severity === "critical") return t.red;
  if (severity === "high") return t.amber;
  if (severity === "medium") return t.accent;
  return t.green;
}

export default function BugTrackerView({ t, currentWorkspaceId }: { t: T; currentWorkspaceId: string }) {
  const { bugs, addBug, updateBug, deleteBug, users, currentUser, workspaces, allPipelinesGlobal, addCustomStage, setStageDescOverride } = useModel();
  const mono = "var(--font-dm-mono), monospace";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | BugStatus>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | BugSeverity>("all");
  const highlightId = useSearchParams().get("highlight");
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    steps: "",
    expected: "",
    actual: "",
    type: "bug" as BugType,
    severity: "medium" as BugSeverity,
    ownerId: "",
    linkedTask: "",
  });
  const [attachments, setAttachments] = useState<BugAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const existingFileInputRef = useRef<HTMLInputElement | null>(null);
  const [lightbox, setLightbox] = useState<BugAttachment | null>(null);

  const MAX_BYTES = 25 * 1024 * 1024;
  const handleFiles = async (files: FileList | null, targetBugId?: number) => {
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bugs
      .filter(item => !currentWorkspaceId || !item.workspaceId || item.workspaceId === currentWorkspaceId)
      .filter(item => status === "all" || item.status === status)
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
    addBug({ ...draft, attachments });
    setDraft({ title: "", body: "", steps: "", expected: "", actual: "", type: "bug", severity: "medium", ownerId: "", linkedTask: "" });
    setAttachments([]);
    setUploadError(null);
  };

  const addComment = (bugId: number) => {
    const text = (commentDrafts[bugId] || "").trim();
    if (!text || !currentUser) return;
    const item = bugs.find(b => b.id === bugId);
    updateBug(bugId, { comments: [...(item?.comments || []), { id: Date.now(), text, by: currentUser, time: Date.now() }] });
    setCommentDrafts(prev => ({ ...prev, [bugId]: "" }));
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
    <div style={{ marginTop: 16, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>bug / testing tracker</div>
          <div style={{ marginTop: 3, fontSize: 22, color: t.text, fontWeight: 950 }}>bugs, QA checks, and fixes</div>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search tracker..." style={{ width: 280, maxWidth: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 12 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: 14, alignItems: "start" }}>
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgCard, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="bug or test title" style={field(t, mono)} />
          <textarea value={draft.body} onChange={e => setDraft(p => ({ ...p, body: e.target.value }))} placeholder="what happened?" rows={3} style={field(t, mono)} />
          <textarea value={draft.steps} onChange={e => setDraft(p => ({ ...p, steps: e.target.value }))} placeholder="steps to reproduce / test steps" rows={3} style={field(t, mono)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <textarea value={draft.expected} onChange={e => setDraft(p => ({ ...p, expected: e.target.value }))} placeholder="expected" rows={2} style={field(t, mono)} />
            <textarea value={draft.actual} onChange={e => setDraft(p => ({ ...p, actual: e.target.value }))} placeholder="actual" rows={2} style={field(t, mono)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={draft.type} onChange={e => setDraft(p => ({ ...p, type: e.target.value as BugType }))} style={field(t, mono)}>{TYPES.map(x => <option key={x}>{x}</option>)}</select>
            <select value={draft.severity} onChange={e => setDraft(p => ({ ...p, severity: e.target.value as BugSeverity }))} style={field(t, mono)}>{SEVERITIES.map(x => <option key={x}>{x}</option>)}</select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select value={draft.ownerId} onChange={e => setDraft(p => ({ ...p, ownerId: e.target.value }))} style={field(t, mono)}>
              <option value="">unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
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
              style={{ background: "transparent", border: `1px dashed ${t.border}`, color: uploading ? t.textDim : t.textMuted, borderRadius: 9, padding: "7px 10px", fontFamily: mono, fontSize: 11, fontWeight: 700, cursor: uploading || attachments.length >= 8 ? "not-allowed" : "pointer", textAlign: "left" }}
            >
              {uploading ? "uploading…" : attachments.length >= 8 ? "max 8 files" : "📎 attach file or screenshot"}
            </button>
            {uploadError && <div style={{ fontSize: 10, color: t.red, fontFamily: mono }}>{uploadError}</div>}
            {attachments.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {attachments.map(a => {
                  const isImg = a.contentType.startsWith("image/");
                  return (
                    <div key={a.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: isImg ? 2 : "4px 8px", fontSize: 10, color: t.textMuted, fontFamily: mono, maxWidth: 160 }}>
                      {isImg
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={a.url} alt={a.name} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 5 }} />
                        : <span>📄</span>
                      }
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 16 }}>{a.name}</span>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))} title="Remove" style={{ position: "absolute", top: 1, right: 2, background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button type="button" onClick={submit} style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 10, padding: "10px 12px", fontFamily: mono, fontSize: 12, fontWeight: 900, cursor: "pointer" }}>add tracker item</button>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {(["all", ...STATUSES] as const).map(s => (
              <button key={s} type="button" onClick={() => setStatus(s)} style={{ background: status === s ? t.accent + "18" : t.bgCard, border: `1px solid ${status === s ? t.accent + "66" : t.border}`, color: status === s ? t.accent : t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 10, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>{s}</button>
            ))}
            <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} style={{ ...field(t, mono), width: 150, padding: "5px 8px", fontSize: 10 }}>
              <option value="all">all owners</option>
              <option value="unassigned">unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as "all" | BugSeverity)} style={{ ...field(t, mono), width: 126, padding: "5px 8px", fontSize: 10 }}>
              <option value="all">all severity</option>
              {SEVERITIES.map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
            {visible.map(item => {
              const c = colorFor(t, item.severity);
              const owner = users.find(u => u.id === item.ownerId);
              const canDelete = currentUser && (currentUser === item.createdBy || currentUser === item.ownerId || ADMIN_IDS.includes(currentUser));
              return (
                <div id={`bug-${item.id}`} key={item.id} style={{ border: `1px solid ${String(item.id) === highlightId ? c : c + "44"}`, background: c + "08", borderRadius: 12, padding: 11, minWidth: 0, boxShadow: String(item.id) === highlightId ? `0 0 0 3px ${c}22` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: t.text, fontSize: 14, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                      <div style={{ marginTop: 2, color: c, fontFamily: mono, fontSize: 10, fontWeight: 850 }}>{item.type} · {item.severity}{owner ? ` · ${owner.name}` : " · unassigned"}</div>
                    </div>
                    <select value={item.status} onChange={e => updateBug(item.id, { status: e.target.value as BugStatus })} style={{ ...field(t, mono), width: 96, padding: "5px 7px", fontSize: 10 }}>
                      {STATUSES.map(x => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  {item.body && <div style={{ marginTop: 8, color: t.textMuted, fontSize: 12, lineHeight: 1.45 }}>{item.body}</div>}
                  {item.steps && <div style={{ marginTop: 8, color: t.textDim, fontSize: 11, fontFamily: mono, whiteSpace: "pre-wrap" }}>{item.steps}</div>}
                  {(item.expected || item.actual) && (
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {item.expected && <div style={{ background: t.bg, border: `1px solid ${t.green}33`, borderRadius: 8, padding: 7, color: t.textMuted, fontSize: 11 }}><b style={{ color: t.green, fontFamily: mono }}>expected</b><br />{item.expected}</div>}
                      {item.actual && <div style={{ background: t.bg, border: `1px solid ${t.amber}33`, borderRadius: 8, padding: 7, color: t.textMuted, fontSize: 11 }}><b style={{ color: t.amber, fontFamily: mono }}>actual</b><br />{item.actual}</div>}
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
                          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 10, color: t.textMuted, fontFamily: mono, textDecoration: "none", maxWidth: 160 }}>
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
                    <select value={item.ownerId || ""} onChange={e => updateBug(item.id, { ownerId: e.target.value })} style={{ ...field(t, mono), width: 140, padding: "5px 7px", fontSize: 10 }}>
                      <option value="">unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select value={item.severity} onChange={e => updateBug(item.id, { severity: e.target.value as BugSeverity })} style={{ ...field(t, mono), width: 94, padding: "5px 7px", fontSize: 10 }}>
                      {SEVERITIES.map(x => <option key={x}>{x}</option>)}
                    </select>
                    <button type="button" onClick={() => { setUploadTargetId(item.id); requestAnimationFrame(() => existingFileInputRef.current?.click()); }} disabled={uploading || (item.attachments || []).length >= 8} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 10, fontFamily: mono, fontWeight: 800, cursor: uploading || (item.attachments || []).length >= 8 ? "not-allowed" : "pointer" }}>{uploading && uploadTargetId === item.id ? "uploading…" : "attach"}</button>
                    <button type="button" onClick={() => convertToTask(item.id)} disabled={!pipelineChoices.length || !!item.linkedTask} style={{ background: item.linkedTask ? t.green + "12" : t.accent + "12", border: `1px solid ${item.linkedTask ? t.green + "44" : t.accent + "44"}`, color: item.linkedTask ? t.green : t.accent, borderRadius: 8, padding: "5px 8px", fontSize: 10, fontFamily: mono, fontWeight: 800, cursor: !pipelineChoices.length || item.linkedTask ? "default" : "pointer" }}>{item.linkedTask ? `task: ${item.linkedTask}` : "make task"}</button>
                    {canDelete && <button type="button" onClick={() => deleteBug(item.id)} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 10, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>delete</button>}
                  </div>
                  <div style={{ marginTop: 10, borderTop: `1px solid ${t.border}`, paddingTop: 8 }}>
                    {(item.comments || []).length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 7 }}>
                        {(item.comments || []).slice(-3).map(cmt => {
                          const by = users.find(u => u.id === cmt.by);
                          return <div key={cmt.id} style={{ background: t.bg, borderRadius: 8, padding: "6px 8px", fontSize: 11, color: t.textMuted }}><b style={{ color: by?.color || t.accent }}>{by?.name || cmt.by}</b> {cmt.text}</div>;
                        })}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input value={commentDrafts[item.id] || ""} onChange={e => setCommentDrafts(prev => ({ ...prev, [item.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addComment(item.id); }} placeholder="add test note..." style={{ ...field(t, mono), padding: "6px 8px", fontSize: 11 }} />
                      <button type="button" onClick={() => addComment(item.id)} style={{ background: t.accent, border: "none", color: "#fff", borderRadius: 8, padding: "5px 9px", fontSize: 10, fontFamily: mono, fontWeight: 900, cursor: "pointer" }}>send</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {visible.length === 0 && <div style={{ border: `1px dashed ${t.border}`, borderRadius: 12, padding: 28, color: t.textDim, fontFamily: mono, fontSize: 12, textAlign: "center" }}>// no tracker items here</div>}
        </div>
      </div>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 32, cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }} style={{ position: "absolute", top: 18, right: 22, background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 22, padding: "4px 12px", borderRadius: 8, cursor: "pointer" }}>✕</button>
          <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", color: "#fff", fontFamily: mono, fontSize: 12, background: "rgba(0,0,0,0.45)", padding: "4px 10px", borderRadius: 8 }}>{lightbox.name}</div>
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
    fontSize: 12,
    width: "100%",
  };
}
