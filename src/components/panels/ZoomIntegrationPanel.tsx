"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/themes";
import { useModel } from "@/lib/contexts/ModelContext";
import { SubtaskKey } from "@/lib/subtaskKey";

type ZoomStatus = {
  configured: boolean;
  connected: boolean;
  mode: "server_to_server";
  missing: string[];
  tokenStatus: number | null;
  tokenError: string | null;
  scopes: string;
  expiresIn: number | null;
};
type ZoomRecordingsStatus = {
  ok: boolean;
  totalRecords?: number;
  meetings?: Array<{ topic: string; startTime?: string; transcriptCount: number; fileCount: number }>;
  message?: string;
};
type ZoomMeeting = { id: string | number; uuid: string; topic: string; startTime: string; duration: number };
type TaskProposal = { id: number; title: string; pipelineId: string; pipelineName: string; stageName: string | null; status: "pending" | "approved" | "rejected"; sourceMeeting?: string; sourceDate?: string; sourceUUID?: string; dueDate?: string };
type EditingProposal = { id: number; title: string; pipelineId: string; parentStage: string; description: string; assigneeId: string; dueDate: string };

export function ZoomIntegrationPanel({ t, isAdmin, workspaceId }: { t: T; isAdmin: boolean; workspaceId?: string | null }) {
  const { addCustomStage, addSubtask, assignTask, setStageDescOverride, setStageDueDate, setSubtaskDueDate, allPipelinesGlobal, customStages, stageNameOverrides, archivedStages, users, workspaces, pinCallSeries, unpinCallSeries } = useModel();
  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [, setRecordings] = useState<ZoomRecordingsStatus | null>(null);
  const [zoomMeetings, setZoomMeetings] = useState<ZoomMeeting[]>([]);
  const [, setShowMeetingPicker] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | null>(null);

  // Paste-summary flow
  const [showPaste, setShowPaste] = useState(false);
  const [pastedSummary, setPastedSummary] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<TaskProposal[]>([]);
  const [nextId, setNextId] = useState(1);

  // Inline proposal editor
  const [editing, setEditing] = useState<EditingProposal | null>(null);
  // Drill-down: null = calls list, string = tasks for that meeting
  const [selectedCall, setSelectedCall] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    fetch("/api/zoom/status")
      .then(r => r.json())
      .then((data: ZoomStatus) => { if (alive) setStatus(data); })
      .catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [isAdmin]);

  // Auto-load cached meetings + proposals on mount; if cache empty, trigger fresh sync
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;

    type MeetingData = {
      ok: boolean;
      meetings?: ZoomMeeting[];
      proposals?: { id: number; title: string; pipelineId: string; pipelineName: string; stageName: string | null; sourceMeeting: string; sourceDate: string; sourceUUID?: string }[];
      updatedAt?: string;
    };

    const applyData = (data: MeetingData) => {
      if (!alive || !data.ok) return;
      if (data.meetings?.length) { setZoomMeetings(data.meetings); setShowMeetingPicker(true); }
      if (data.proposals?.length) {
        setProposals(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const fresh = data.proposals!.filter(p => !existingIds.has(p.id)).map(p => ({ ...p, status: "pending" as const }));
          return [...fresh, ...prev];
        });
        setNextId(n => Math.max(n, ...data.proposals!.map(p => p.id + 1)));
      }
      if (data.updatedAt) {
        const diff = Math.round((Date.now() - new Date(data.updatedAt).getTime()) / 60000);
        setCacheAge(diff < 2 ? "just updated" : `${diff}m ago`);
      }
    };

    fetch("/api/zoom/meetings")
      .then(r => r.json())
      .then(async (data: MeetingData) => {
        if (!alive) return;
        // If cache is empty or has no proposals, auto-trigger a fresh sync
        if (!data.ok || !data.proposals?.length) {
          if (alive) setSyncing(true);
          const res = await fetch("/api/zoom/meetings", { method: "POST", cache: "no-store" });
          const fresh = await res.json().catch(() => ({ ok: false })) as MeetingData;
          if (alive) { applyData(fresh); setSyncing(false); }
        } else {
          applyData(data);
        }
      })
      .catch(() => { if (alive) setSyncing(false); });

    return () => { alive = false; };
  }, [isAdmin]);

  const [sectionCollapsed, setSectionCollapsed] = useState(() => {
    try { return localStorage.getItem("home_section_zoom") === "1"; } catch { return false; }
  });
  const toggleSection = () => setSectionCollapsed((v: boolean) => { const next = !v; try { localStorage.setItem("home_section_zoom", next ? "1" : "0"); } catch {} return next; });

  if (!isAdmin) return null;
  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;
  const stateColor = connected ? t.green : configured ? t.amber : t.textDim;
  const pendingCount = proposals.filter(p => p.status === "pending").length;
  const mono = "var(--font-dm-mono), monospace";

  // Call series filtering — workspace-scoped.
  // Use the explicitly passed workspaceId (from homeWsFilter) when available;
  // fall back to each individual workspace's pinned series for display.
  const activeWs = workspaceId ? workspaces.find(w => w.id === workspaceId) : null;

  // Which topics are pinned to which workspace (for display when no specific ws selected)
  const allPinnedByWs = workspaces.map(w => ({ ws: w, pins: w.callSeriesFilters ?? [] }));

  // When a specific workspace is selected, filter down to its series
  const callSeriesFilters: string[] = activeWs?.callSeriesFilters ?? [];

  const pinSeries = (topic: string, wsId?: string) => {
    const targetId = wsId ?? activeWs?.id;
    if (!targetId || workspaces.find(w => w.id === targetId)?.callSeriesFilters?.includes(topic)) return;
    pinCallSeries(targetId, topic);
  };
  const unpinSeries = (topic: string, wsId?: string) => {
    const targetId = wsId ?? activeWs?.id;
    if (!targetId) return;
    unpinCallSeries(targetId, topic);
  };

  const checkZoom = async () => {
    if (!configured || checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/zoom/connect", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setStatus(prev => ({
        configured: true,
        connected: res.ok,
        mode: "server_to_server",
        missing: [],
        tokenStatus: res.ok ? 200 : res.status,
        tokenError: res.ok ? null : data?.message || "Zoom token check failed",
        scopes: data?.scopes || prev?.scopes || "",
        expiresIn: data?.expiresIn ?? prev?.expiresIn ?? null,
      }));
    } finally {
      setChecking(false);
    }
  };

  const syncCalls = async (forceResync = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = forceResync
        ? await fetch("/api/zoom/meetings?force=true", { method: "POST", cache: "no-store" })
        : await fetch("/api/zoom/meetings", { cache: "no-store" });
      const data = await res.json().catch(() => null) as {
        ok: boolean;
        meetings?: ZoomMeeting[];
        proposals?: { id: number; title: string; pipelineId: string; pipelineName: string; stageName: string | null; sourceMeeting: string; sourceDate: string; sourceUUID?: string }[];
        error?: string;
        updatedAt?: string;
      } | null;
      if (data?.ok) {
        // Always update meetings list (even if empty, clears stale)
        if (data.meetings) setZoomMeetings(data.meetings);
        if (data.proposals?.length) {
          // Replace all pending proposals from this sync (don't just append — replace stale ones)
          setProposals(prev => {
            const nonPending = prev.filter(p => p.status !== "pending");
            const existingIds = new Set(nonPending.map(p => p.id));
            const fresh = data.proposals!.filter(p => !existingIds.has(p.id)).map(p => ({ ...p, status: "pending" as const }));
            return [...fresh, ...nonPending];
          });
          setNextId(n => Math.max(n, ...data.proposals!.map(p => p.id + 1)));
        }
        if (data.updatedAt) {
          const diff = Math.round((Date.now() - new Date(data.updatedAt).getTime()) / 60000);
          setCacheAge(diff < 2 ? "just updated" : `${diff}m ago`);
        }
      } else {
        setRecordings({ ok: false, message: data?.error || "Zoom sync failed" });
      }
    } finally {
      setSyncing(false);
    }
  };

  const extractTasks = async () => {
    if (!pastedSummary.trim() || extracting) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const pipelines = allPipelinesGlobal.map(p => ({
        id: p.id,
        name: p.name,
        stages: [...p.stages, ...(customStages[p.id] ?? [])],
      }));
      const res = await fetch("/api/call-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: pastedSummary.trim(), pipelines }),
      });
      const data = await res.json();
      if (!res.ok || !data.tasks) { setExtractError(data.error || "Failed to extract tasks"); return; }
      const newProposals: TaskProposal[] = (data.tasks as { title: string; pipelineId: string; pipelineName: string; stageName: string | null }[]).map((t, i) => ({
        id: nextId + i,
        title: t.title,
        pipelineId: t.pipelineId,
        pipelineName: t.pipelineName,
        stageName: t.stageName,
        status: "pending",
      }));
      setNextId(n => n + newProposals.length);
      setProposals(prev => [...newProposals, ...prev]);
      setShowPaste(false);
      setPastedSummary("");
    } catch { setExtractError("Network error"); }
    finally { setExtracting(false); }
  };

  const startEditing = (p: TaskProposal) => {
    setEditing({ id: p.id, title: p.stageName || p.title, pipelineId: p.pipelineId, parentStage: "", description: "", assigneeId: "", dueDate: p.dueDate || "" });
  };
  const confirmEdit = () => {
    if (!editing || !editing.title.trim()) return;
    const title = editing.title.trim();
    if (editing.parentStage) {
      const subtaskId = addSubtask(editing.parentStage, title, () => {});
      if (subtaskId !== null && editing.dueDate) {
        setTimeout(() => setSubtaskDueDate(SubtaskKey.make(editing.parentStage, subtaskId), editing.dueDate), 120);
      }
    } else {
      addCustomStage(editing.pipelineId, title);
      // Apply description + assignee after stage is created
      if (editing.description.trim()) {
        setTimeout(() => setStageDescOverride(title, editing.description.trim()), 100);
      }
      if (editing.dueDate) {
        setTimeout(() => setStageDueDate(title, editing.dueDate), 120);
      }
      if (editing.assigneeId) {
        setTimeout(() => assignTask(title, editing.assigneeId), 150);
      }
    }
    setProposals(prev => prev.map(x => x.id === editing.id ? { ...x, status: "approved" } : x));
    setEditing(null);
  };
  const rejectProposal = (id: number) => { setProposals(prev => prev.map(x => x.id === id ? { ...x, status: "rejected" } : x)); if (editing?.id === id) setEditing(null); };
  const clearDone = () => setProposals(prev => prev.filter(x => x.status === "pending"));

  const pending = proposals.filter(p => p.status === "pending");
  const done = proposals.filter(p => p.status !== "pending");

  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16 }}>
      {/* Collapsible header */}
      <button type="button" onClick={toggleSection} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", marginBottom: sectionCollapsed ? 0 : 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" as const }}>
            zoom intelligence
            {pendingCount > 0 && <span style={{ background: t.accent + "22", border: `1px solid ${t.accent}44`, color: t.accent, borderRadius: 8, padding: "0 5px", fontSize: 10, fontFamily: mono, fontWeight: 800 }}>{pendingCount} pending</span>}
            <span style={{ color: stateColor, fontSize: 10, fontFamily: mono }}>{connected ? "● connected" : configured ? "◌ configured" : "○ setup needed"}</span>
          </div>
          <div style={{ fontSize: 18, color: t.text, fontWeight: 850, marginTop: 4, lineHeight: 1.25 }}>call summaries and proposed tasks</div>
        </div>
        <span style={{ fontSize: 12, color: t.textDim, fontFamily: mono, flexShrink: 0 }}>{sectionCollapsed ? "▼" : "▲"}</span>
      </button>
      {!sectionCollapsed && <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.8fr) minmax(280px, 1.2fr)", gap: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ marginTop: 0, fontSize: 13, color: t.textMuted, lineHeight: 1.45 }}>
          Paste any call summary or meeting notes — AI extracts action items and queues them here for approval. Each approved task becomes a stage in the relevant pipeline.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" disabled={!configured || checking} onClick={checkZoom} style={{ background: configured ? t.accent : t.bgHover || t.bgSoft, border: `1px solid ${configured ? t.accent : t.border}`, borderRadius: 10, padding: "8px 12px", color: configured ? "#fff" : t.textDim, fontSize: 13, fontWeight: 800, fontFamily: mono, cursor: configured && !checking ? "pointer" : "not-allowed" }}>
            {checking ? "checking..." : "check zoom"}
          </button>
          <span style={{ fontSize: 12, color: stateColor, fontFamily: mono, fontWeight: 800 }}>
            {connected ? "server token ok" : configured ? "credentials found" : "setup needed"}
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
          Once cloud recordings are enabled, use &ldquo;sync latest calls&rdquo; to auto-import Zoom AI summaries.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        <div style={{ border: `1px solid ${t.border}`, background: t.bgHover || t.bgSoft, borderRadius: 12, padding: 12 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {selectedCall && (
                <button type="button" onClick={() => { setSelectedCall(null); setEditing(null); }}
                  style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "3px 8px", fontSize: 11, color: t.textMuted, fontFamily: mono, cursor: "pointer", flexShrink: 0 }}>
                  ← calls
                </button>
              )}
              <div style={{ fontSize: 13, color: t.text, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedCall
                  ? <>{zoomMeetings.find(m => m.uuid === selectedCall)?.topic || selectedCall} <span style={{ color: t.accent, marginLeft: 4 }}>{pending.filter(p => p.sourceUUID === selectedCall).length} tasks</span></>
                  : <>recent calls {syncing && <span style={{ color: t.accent, fontFamily: mono, fontSize: 11, fontWeight: 400, marginLeft: 6 }}>syncing…</span>}</>
                }
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => { setShowPaste(v => !v); setExtractError(null); setSelectedCall(null); }}
                  style={{ border: `1px solid ${t.accent}`, background: showPaste ? t.accent : "transparent", color: showPaste ? "#fff" : t.accent, borderRadius: 8, padding: "4px 0", fontSize: 11, fontWeight: 850, fontFamily: mono, cursor: "pointer", width: 110, textAlign: "center" }}>
                  {showPaste ? "cancel" : "+ paste summary"}
                </button>
                <button type="button" disabled={syncing} onClick={() => syncCalls(true)}
                  style={{ border: `1px solid ${t.accent}44`, background: "transparent", color: t.accent, borderRadius: 8, padding: "4px 0", fontSize: 11, fontWeight: 850, fontFamily: mono, cursor: !syncing ? "pointer" : "not-allowed", opacity: syncing ? 0.5 : 1, width: 110, textAlign: "center" }}>
                  {syncing ? "syncing…" : "↺ resync"}
                </button>
              </div>
              {cacheAge && <span style={{ fontSize: 10, color: t.textDim, fontFamily: mono }}>{cacheAge}</span>}
            </div>
          </div>

          {/* Paste area */}
          {showPaste && (
            <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                value={pastedSummary}
                onChange={e => setPastedSummary(e.target.value)}
                placeholder="Paste call summary or meeting notes…"
                style={{ width: "100%", minHeight: 80, background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", resize: "vertical", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
                autoFocus
              />
              {extractError && <div style={{ fontSize: 12, color: t.red }}>{extractError}</div>}
              <button type="button" disabled={!pastedSummary.trim() || extracting} onClick={extractTasks}
                style={{ alignSelf: "flex-end", background: pastedSummary.trim() ? t.accent : t.bgCard, border: `1px solid ${pastedSummary.trim() ? t.accent : t.border}`, color: pastedSummary.trim() ? "#fff" : t.textDim, borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 850, fontFamily: mono, cursor: pastedSummary.trim() && !extracting ? "pointer" : "not-allowed" }}>
                {extracting ? "extracting…" : "extract tasks"}
              </button>
            </div>
          )}

          {/* CALLS LIST VIEW */}
          {!selectedCall && !showPaste && (() => {
            // Always use Zoom UUID as canonical source so repeated daily calls do not collapse.
            const proposalCallMap = new Map<string, { topic: string; startTime: string }>(
              proposals
                .filter(p => p.sourceUUID && p.sourceMeeting)
                .map(p => {
                  return [p.sourceUUID!, { topic: p.sourceMeeting!, startTime: p.sourceDate || "" }];
                })
            );

            // zoomMeetings is the ground truth; also include any calls that only exist in proposals
            const meetingTopics = new Map(zoomMeetings.map(m => [m.uuid, { topic: m.topic, startTime: m.startTime }]));
            for (const [uuid, meta] of proposalCallMap) {
              if (!meetingTopics.has(uuid)) meetingTopics.set(uuid, meta);
            }

            const allSortedCalls = Array.from(meetingTopics.entries())
              .map(([uuid, meta]) => ({ uuid, ...meta }))
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            // Apply workspace series filter — if filters are set, only show matching topics
            const sortedCalls = (callSeriesFilters.length > 0
              ? allSortedCalls.filter(c => callSeriesFilters.includes(c.topic))
              : allSortedCalls
            ).slice(0, 7);

            // All unique topics across every call ever seen (for the pin UI)
            const allTopics = Array.from(new Set(allSortedCalls.map(c => c.topic)));

            if (syncing && sortedCalls.length === 0) {
              return <div style={{ fontSize: 12, color: t.textMuted, fontFamily: mono }}>syncing Zoom calls and extracting tasks…</div>;
            }
            if (sortedCalls.length === 0) {
              return <div style={{ fontSize: 12, color: t.textMuted }}>Tasks from your latest Zoom calls will appear here. Hit ↺ resync to pull now.</div>;
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Series pin chips — always visible when there are calls */}
                {allTopics.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: t.textDim, fontFamily: mono, marginBottom: 5, letterSpacing: 0.4 }}>
                      pin series to workspace:
                    </div>
                    {/* When a specific workspace is selected: single-row chips */}
                    {activeWs ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {allTopics.map(topic => {
                          const pinned = callSeriesFilters.includes(topic);
                          return (
                            <button
                              key={topic}
                              type="button"
                              onClick={() => pinned ? unpinSeries(topic) : pinSeries(topic)}
                              data-tooltip={pinned ? `Unpin from ${activeWs.name}` : `Pin to ${activeWs.name}`}
                              style={{
                                background: pinned ? t.accent + "18" : t.bgCard,
                                border: `1px solid ${pinned ? t.accent + "66" : t.border}`,
                                borderRadius: 20, padding: "3px 10px",
                                fontSize: 12, fontWeight: pinned ? 800 : 500,
                                color: pinned ? t.accent : t.textMuted,
                                cursor: "pointer", fontFamily: mono,
                                whiteSpace: "nowrap", transition: "all 0.12s",
                              }}
                            >
                              {pinned ? "📌 " : ""}{topic}
                            </button>
                          );
                        })}
                        {callSeriesFilters.length > 0 && (
                          <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono, alignSelf: "center", marginLeft: 2 }}>
                            · showing {sortedCalls.length} of {allSortedCalls.length}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* No workspace selected: show each topic with per-workspace pin toggles */
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {allTopics.map(topic => (
                          <div key={topic} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: t.text, fontWeight: 600, minWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topic}</span>
                            {workspaces.filter(w => !["guest1","guest2"].some(g => w.members.length === 1 && w.members[0] === g)).map(w => {
                              const pinned = (w.callSeriesFilters ?? []).includes(topic);
                              return (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => pinned ? unpinSeries(topic, w.id) : pinSeries(topic, w.id)}
                                  style={{
                                    background: pinned ? w.colorKey === "purple" ? t.accent + "18" : t.green + "18" : t.bgCard,
                                    border: `1px solid ${pinned ? t.accent + "55" : t.border}`,
                                    borderRadius: 20, padding: "2px 8px",
                                    fontSize: 11, fontWeight: pinned ? 800 : 400,
                                    color: pinned ? t.accent : t.textMuted,
                                    cursor: "pointer", fontFamily: mono,
                                    whiteSpace: "nowrap", transition: "all 0.12s",
                                  }}
                                >
                                  {pinned ? "📌 " : "+ "}{w.icon} {w.name}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {sortedCalls.map(call => {
                  const callPending = proposals.filter(p => p.status === "pending" && p.sourceUUID === call.uuid);
                  const callDone = proposals.filter(p => p.status !== "pending" && p.sourceUUID === call.uuid);
                  return (
                    <button key={call.uuid} type="button" onClick={() => setSelectedCall(call.uuid)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left", transition: "border-color 0.1s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.accent + "66"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{call.topic}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginTop: 2 }}>
                          {call.startTime ? new Date(call.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {callPending.length > 0 && <span style={{ background: t.accent, color: "#fff", borderRadius: 8, padding: "1px 7px", fontSize: 11, fontFamily: mono, fontWeight: 700 }}>{callPending.length}</span>}
                        {callDone.length > 0 && <span style={{ color: t.textDim, fontSize: 11, fontFamily: mono }}>{callDone.length} done</span>}
                        {callPending.length === 0 && callDone.length === 0 && <span style={{ color: t.textDim, fontSize: 11, fontFamily: mono }}>no tasks yet</span>}
                        <span style={{ color: t.textDim, fontSize: 13 }}>›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* TASKS VIEW (drilled into a call) */}
          {selectedCall && !showPaste && (() => {
            const callProposals = pending.filter(p => p.sourceUUID === selectedCall);
            const callDone = done.filter(p => p.sourceUUID === selectedCall);

            if (callProposals.length === 0 && callDone.length === 0) {
              return <div style={{ fontSize: 12, color: t.textMuted }}>No tasks extracted from this call yet.</div>;
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {callProposals.map(p => {
                  const isEditing = editing?.id === p.id;
                  if (isEditing && editing) {
                    const editPipe = allPipelinesGlobal.find(x => x.id === editing.pipelineId);
                    const stagesInPipe = editPipe
                      ? [...editPipe.stages, ...(customStages[editPipe.id] || [])].filter(s => !(archivedStages || []).includes(s))
                      : [];
                    return (
                      <div key={p.id} style={{ border: `1.5px dashed ${t.accent}88`, borderRadius: 10, padding: 10, background: t.accent + "08", display: "flex", flexDirection: "column", gap: 6 }}>
                        <input autoFocus value={editing.title}
                          onChange={e => setEditing(prev => prev ? { ...prev, title: e.target.value } : null)}
                          onKeyDown={e => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditing(null); }}
                          style={{ background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "6px 8px", fontSize: 13, color: t.text, fontFamily: mono, outline: "none", width: "100%", boxSizing: "border-box" }}
                        />
                        <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>pipeline: {editPipe?.name || editing.pipelineId}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {allPipelinesGlobal.map(pipe => {
                            const sel = editing.pipelineId === pipe.id;
                            return <button key={pipe.id} type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, pipelineId: pipe.id, parentStage: "" } : null); }}
                              style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: sel ? t.accent : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400 }}>
                              {pipe.icon} {pipe.name}
                            </button>;
                          })}
                        </div>
                        {stagesInPipe.length > 0 && (
                          <>
                            <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>
                              {editing.parentStage ? `as subtask of: ${stageNameOverrides?.[editing.parentStage] || editing.parentStage}` : "// parent task (optional)"}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {editing.parentStage && <button type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, parentStage: "" } : null); }}
                                style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: t.amber, fontFamily: mono }}>✕ as task</button>}
                              {stagesInPipe.map(s => { const sel = editing.parentStage === s; return <button key={s} type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, parentStage: sel ? "" : s } : null); }}
                                style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: sel ? t.accent : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400 }}>{stageNameOverrides?.[s] || s}</button>; })}
                            </div>
                          </>
                        )}
                        {/* Assignee */}
                        <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>
                          {editing.assigneeId ? `assign to: ${users.find(u => u.id === editing.assigneeId)?.name || editing.assigneeId}` : "// assign to (optional)"}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {editing.assigneeId && <button type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, assigneeId: "" } : null); }}
                            style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: t.amber, fontFamily: mono }}>✕ unassign</button>}
                          {users.filter(u => u.id !== "ai").map(u => {
                            const sel = editing.assigneeId === u.id;
                            return <button key={u.id} type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, assigneeId: sel ? "" : u.id } : null); }}
                              style={{ background: sel ? u.color + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? u.color + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 11, color: sel ? u.color : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400 }}>
                              {u.name}
                            </button>;
                          })}
                        </div>
                        {/* Description */}
                        <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>// description (optional — points auto-assigned by AI)</div>
                        <textarea
                          value={editing.description}
                          onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : null)}
                          placeholder="Add context, acceptance criteria, or notes…"
                          rows={2}
                          style={{ background: t.bgCard, border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "5px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", resize: "none", outline: "none", width: "100%", boxSizing: "border-box", lineHeight: 1.4 }}
                        />
                        <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>// due date (optional)</div>
                        <input
                          type="date"
                          value={editing.dueDate}
                          onChange={e => setEditing(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                          style={{ background: t.bgCard, border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "5px 8px", fontSize: 12, color: t.textMuted, fontFamily: mono, outline: "none", width: "100%", boxSizing: "border-box" }}
                        />
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => setEditing(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: mono }}>cancel</button>
                          <button type="button" onClick={confirmEdit} disabled={!editing.title.trim()}
                            style={{ background: editing.title.trim() ? t.accent : t.surface, border: "none", borderRadius: 8, padding: "4px 12px", cursor: editing.title.trim() ? "pointer" : "not-allowed", fontSize: 11, color: editing.title.trim() ? "#fff" : t.textDim, fontFamily: mono, fontWeight: 700 }}>
                            {editing.parentStage ? "add as subtask" : "add as task"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono, marginTop: 2 }}>{p.pipelineName}{p.stageName ? ` → ${p.stageName}` : " → new stage"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button type="button" onClick={() => startEditing(p)} style={{ background: t.green + "22", border: `1px solid ${t.green}55`, color: t.green, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 850, fontFamily: mono, cursor: "pointer" }}>✓</button>
                        <button type="button" onClick={() => rejectProposal(p.id)} style={{ background: t.red + "16", border: `1px solid ${t.red}44`, color: t.red, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 850, fontFamily: mono, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  );
                })}
                {callDone.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>{callDone.filter(x => x.status === "approved").length} approved · {callDone.filter(x => x.status === "rejected").length} rejected</span>
                    <button type="button" onClick={clearDone} style={{ background: "transparent", border: "none", color: t.textDim, fontSize: 11, fontFamily: mono, cursor: "pointer", textDecoration: "underline" }}>clear</button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      </div>}
    </section>
  );
}
