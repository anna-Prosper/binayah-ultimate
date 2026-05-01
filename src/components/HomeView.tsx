"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { T } from "@/lib/themes";
import { type UserType, type Workspace, ADMIN_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import UserPopup from "@/components/ui/UserPopup";
import { useModel } from "@/lib/contexts/ModelContext";
import { SubtaskKey } from "@/lib/subtaskKey";

const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }
type AttentionTone = "accent" | "green" | "amber" | "red" | "cyan";
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

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function timeAgoFrom(now: number, timestamp: number): string {
  const diff = now - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function toneColor(t: T, tone: AttentionTone): string {
  if (tone === "green") return t.green;
  if (tone === "amber") return t.amber;
  if (tone === "red") return t.red;
  if (tone === "cyan") return t.cyan || t.accent;
  return t.accent;
}

function AttentionOverview({ t, attention, onApprove, onClaim }: {
  t: T;
  attention: {
    roleLabel: string;
    scopeLabel: string;
    summary: string;
    stats: Array<{ label: string; value: number; tone: AttentionTone }>;
    actions: Array<{ title: string; meta: string; body: string; tone: AttentionTone }>;
    people: Array<{ user: UserType; title: string; meta: string; body: string; tone: AttentionTone }>;
    rawReviewItems: { key: string; title: string; pipelineName: string; kind: string }[];
    rawBlockedItems: { key: string; title: string; pipelineName: string; owners: string[] }[];
    rawUnownedItems: { key: string; title: string; pipelineName: string }[];
    rawMyItems: { key: string; title: string; pipelineName: string; status: string }[];
    rawMineBlocked: { key: string; title: string; pipelineName: string }[];
  };
  onApprove: (key: string) => void;
  onClaim: (key: string) => void;
}) {
  const mono = "var(--font-dm-mono), monospace";
  const isAgent = attention.roleLabel === "agent";

  function StatTile({ label, value, tone, items }: { label: string; value: number; tone: AttentionTone; items: { title: string }[] }) {
    const color = toneColor(t, tone);
    return (
      <div style={{ border: `1px solid ${color}44`, background: color + "0f", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
        <div style={{ fontSize: 22, color, fontWeight: 900, lineHeight: 1 }}>{value}</div>
        <div style={{ marginTop: 3, fontSize: 10, color: t.textMuted, fontFamily: mono, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
        {items.slice(0, 2).map((item, i) => (
          <div key={i} style={{ marginTop: 4, fontSize: 10, color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.8 }}>· {item.title}</div>
        ))}
      </div>
    );
  }

  function ActionGroup({ label, color, items, actionLabel, onAction }: {
    label: string; color: string;
    items: { key: string; title: string; pipelineName: string }[];
    actionLabel?: string;
    onAction?: (key: string) => void;
  }) {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 9, color, fontFamily: mono, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" as const, marginBottom: 4 }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, background: color + "0a", border: `1px solid ${color}33`, borderRadius: 8, padding: "6px 8px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                <div style={{ fontSize: 10, color: t.textMuted, fontFamily: mono, marginTop: 1 }}>{item.pipelineName}</div>
              </div>
              {actionLabel && onAction && (
                <button type="button" onClick={() => onAction(item.key)}
                  style={{ background: color + "22", border: `1px solid ${color}55`, color, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontFamily: mono, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" as const }}>
                  {actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 12 }}>
        overview · {attention.roleLabel} · {attention.scopeLabel}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {isAgent ? (
              <>
                <StatTile label="my open work" value={attention.stats[0]?.value ?? 0} tone="accent" items={attention.rawMyItems} />
                <StatTile label="mentions" value={attention.stats[1]?.value ?? 0} tone="amber" items={[]} />
                <StatTile label="blocked" value={attention.stats[2]?.value ?? 0} tone="red" items={attention.rawMineBlocked} />
                <StatTile label="hot priorities" value={attention.stats[3]?.value ?? 0} tone="green" items={[]} />
              </>
            ) : (
              <>
                <StatTile label="approval queue" value={attention.stats[0]?.value ?? 0} tone="green" items={attention.rawReviewItems} />
                <StatTile label="blocked" value={attention.stats[1]?.value ?? 0} tone="red" items={attention.rawBlockedItems} />
                <StatTile label="unowned" value={attention.stats[2]?.value ?? 0} tone="amber" items={attention.rawUnownedItems} />
                <StatTile label={attention.stats[3]?.label ?? ""} value={attention.stats[3]?.value ?? 0} tone="cyan" items={[]} />
              </>
            )}
          </div>
          {attention.people.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {attention.people.map(person => {
                const color = toneColor(t, person.tone);
                const isStale = person.tone === "amber";
                return (
                  <div key={person.user.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", border: `1px solid ${isStale ? color + "55" : t.border}`, background: isStale ? color + "08" : t.bgHover || t.bgSoft, borderRadius: 9 }}>
                    <AvatarC user={person.user} size={22} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontSize: 12, color: t.text, fontWeight: 700 }}>{person.title}</span>
                        <span style={{ fontSize: 10, color, fontFamily: mono, whiteSpace: "nowrap" }}>{person.meta}</span>
                      </div>
                      <div style={{ fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{person.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {isAgent ? (
            <>
              <ActionGroup label="blocked — needs your attention" color={t.red} items={attention.rawMineBlocked} />
              <ActionGroup label="your open work" color={t.accent} items={attention.rawMyItems.slice(0, 4)} />
              {attention.actions.filter(a => a.tone === "amber").length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: t.amber, fontFamily: mono, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" as const, marginBottom: 4 }}>mentions</div>
                  {attention.actions.filter(a => a.tone === "amber").slice(0, 3).map((item, i) => (
                    <div key={i} style={{ marginBottom: 4, background: t.amber + "0a", border: `1px solid ${t.amber}33`, borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{item.title}</div>
                      <div style={{ fontSize: 10, color: t.textMuted, fontFamily: mono, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
              {attention.actions.length === 0 && attention.rawMineBlocked.length === 0 && attention.rawMyItems.length === 0 && (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: t.textDim, fontSize: 12, fontFamily: mono, border: `1px dashed ${t.border}`, borderRadius: 10 }}>clear lane — no urgent items</div>
              )}
            </>
          ) : (
            <>
              <ActionGroup label="approve now" color={t.green} items={attention.rawReviewItems} actionLabel="✓ approve" onAction={onApprove} />
              <ActionGroup label="blocked" color={t.red} items={attention.rawBlockedItems} />
              <ActionGroup label="assign owner" color={t.amber} items={attention.rawUnownedItems} actionLabel="+ claim" onAction={onClaim} />
              {attention.actions.filter(a => a.tone === "cyan" || a.tone === "green").slice(0, 3).length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: t.cyan || t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" as const, marginBottom: 4 }}>recent activity</div>
                  {attention.actions.filter(a => a.tone === "cyan" || a.tone === "green").slice(0, 3).map((item, i) => (
                    <div key={i} style={{ marginBottom: 4, background: (t.cyan || t.accent) + "0a", border: `1px solid ${(t.cyan || t.accent)}33`, borderRadius: 8, padding: "6px 8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                        <div style={{ fontSize: 10, color: t.cyan || t.accent, fontFamily: mono, whiteSpace: "nowrap", flexShrink: 0 }}>{item.meta}</div>
                      </div>
                      <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
              {attention.rawReviewItems.length === 0 && attention.rawBlockedItems.length === 0 && attention.rawUnownedItems.length === 0 && attention.actions.length === 0 && (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: t.textDim, fontSize: 12, fontFamily: mono, border: `1px dashed ${t.border}`, borderRadius: 10 }}>clear lane — no urgent signals</div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type TaskProposal = { id: number; title: string; pipelineId: string; pipelineName: string; stageName: string | null; status: "pending" | "approved" | "rejected" };
type ZoomMeeting = { id: string | number; topic: string; startTime: string; duration: number };

type EditingProposal = { id: number; title: string; pipelineId: string; parentStage: string; description: string; assigneeId: string };

function ZoomIntegrationPanel({ t, isAdmin }: { t: T; isAdmin: boolean }) {
  const { addCustomStage, addSubtask, assignTask, setStageDescOverride, allPipelinesGlobal, customStages, stageNameOverrides, archivedStages, users } = useModel();
  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recordings, setRecordings] = useState<ZoomRecordingsStatus | null>(null);
  const [zoomMeetings, setZoomMeetings] = useState<ZoomMeeting[]>([]);
  const [showMeetingPicker, setShowMeetingPicker] = useState(false);
  const [fetchingSummaryId, setFetchingSummaryId] = useState<string | null>(null);

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
      proposals?: { id: number; title: string; pipelineId: string; pipelineName: string; stageName: string | null; sourceMeeting: string; sourceDate: string }[];
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

  if (!isAdmin) return null;
  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;
  const missing = status?.missing ?? [];
  const stateColor = connected ? t.green : configured ? t.amber : t.textDim;

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

  const [cacheAge, setCacheAge] = useState<string | null>(null);

  const syncCalls = async (forceResync = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = forceResync
        ? await fetch("/api/zoom/meetings", { method: "POST", cache: "no-store" })
        : await fetch("/api/zoom/meetings", { cache: "no-store" });
      const data = await res.json().catch(() => null) as {
        ok: boolean;
        meetings?: ZoomMeeting[];
        proposals?: { id: number; title: string; pipelineId: string; pipelineName: string; stageName: string | null; sourceMeeting: string; sourceDate: string }[];
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

  const fetchMeetingSummaryAndExtract = async (meeting: ZoomMeeting) => {
    setShowMeetingPicker(false);
    setFetchingSummaryId(String(meeting.id));
    setExtractError(null);
    try {
      const res = await fetch(`/api/zoom/meeting-summary?meetingId=${encodeURIComponent(String(meeting.id))}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setExtractError(data.error || "No AI summary found for this meeting");
        setFetchingSummaryId(null);
        return;
      }
      // Auto-extract tasks from the fetched summary
      setPastedSummary(data.summary ?? "");
      setFetchingSummaryId(null);
      // Trigger extraction immediately
      const pipelines = allPipelinesGlobal.map(p => ({
        id: p.id, name: p.name, stages: [...p.stages, ...(customStages[p.id] ?? [])],
      }));
      setExtracting(true);
      const extractRes = await fetch("/api/call-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: data.summary, pipelines }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok || !extractData.tasks) { setExtractError(extractData.error || "Failed to extract tasks"); return; }
      const newProposals: TaskProposal[] = (extractData.tasks as { title: string; pipelineId: string; pipelineName: string; stageName: string | null }[]).map((t, i) => ({
        id: nextId + i, title: t.title, pipelineId: t.pipelineId, pipelineName: t.pipelineName, stageName: t.stageName, status: "pending",
      }));
      setNextId(n => n + newProposals.length);
      setProposals(prev => [...newProposals, ...prev]);
    } catch { setExtractError("Network error"); }
    finally { setExtracting(false); setFetchingSummaryId(null); }
  };

  const startEditing = (p: TaskProposal) => {
    setEditing({ id: p.id, title: p.stageName || p.title, pipelineId: p.pipelineId, parentStage: "", description: "", assigneeId: "" });
  };
  const confirmEdit = () => {
    if (!editing || !editing.title.trim()) return;
    const title = editing.title.trim();
    if (editing.parentStage) {
      addSubtask(editing.parentStage, title, () => {});
    } else {
      addCustomStage(editing.pipelineId, title);
      // Apply description + assignee after stage is created
      if (editing.description.trim()) {
        setTimeout(() => setStageDescOverride(title, editing.description.trim()), 100);
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
  const mono = "var(--font-dm-mono), monospace";

  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, display: "grid", gridTemplateColumns: "minmax(240px, 0.8fr) minmax(280px, 1.2fr)", gap: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>zoom intelligence</div>
        <div style={{ fontSize: 18, color: t.text, fontWeight: 850, marginTop: 4, lineHeight: 1.25 }}>call summaries and proposed tasks</div>
        <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
          Paste any call summary or meeting notes — AI extracts action items and queues them here for approval. Each approved task becomes a stage in the relevant pipeline.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" disabled={!configured || checking} onClick={checkZoom} style={{ background: configured ? t.accent : t.bgHover || t.bgSoft, border: `1px solid ${configured ? t.accent : t.border}`, borderRadius: 10, padding: "8px 12px", color: configured ? "#fff" : t.textDim, fontSize: 12, fontWeight: 800, fontFamily: mono, cursor: configured && !checking ? "pointer" : "not-allowed" }}>
            {checking ? "checking..." : "check zoom"}
          </button>
          <span style={{ fontSize: 11, color: stateColor, fontFamily: mono, fontWeight: 800 }}>
            {connected ? "server token ok" : configured ? "credentials found" : "setup needed"}
          </span>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: t.textMuted, lineHeight: 1.45 }}>
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
                  style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "3px 8px", fontSize: 10, color: t.textMuted, fontFamily: mono, cursor: "pointer", flexShrink: 0 }}>
                  ← calls
                </button>
              )}
              <div style={{ fontSize: 12, color: t.text, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedCall
                  ? <>{selectedCall} <span style={{ color: t.accent, marginLeft: 4 }}>{pending.filter(p => (p as unknown as {sourceMeeting?: string}).sourceMeeting === selectedCall).length} tasks</span></>
                  : <>recent calls {syncing && <span style={{ color: t.accent, fontFamily: mono, fontSize: 10, fontWeight: 400, marginLeft: 6 }}>syncing…</span>}</>
                }
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => { setShowPaste(v => !v); setExtractError(null); setSelectedCall(null); }}
                  style={{ border: `1px solid ${t.accent}`, background: showPaste ? t.accent : "transparent", color: showPaste ? "#fff" : t.accent, borderRadius: 8, padding: "4px 0", fontSize: 10, fontWeight: 850, fontFamily: mono, cursor: "pointer", width: 110, textAlign: "center" }}>
                  {showPaste ? "cancel" : "+ paste summary"}
                </button>
                <button type="button" disabled={syncing} onClick={() => syncCalls(true)}
                  style={{ border: `1px solid ${t.accent}44`, background: "transparent", color: t.accent, borderRadius: 8, padding: "4px 0", fontSize: 10, fontWeight: 850, fontFamily: mono, cursor: !syncing ? "pointer" : "not-allowed", opacity: syncing ? 0.5 : 1, width: 110, textAlign: "center" }}>
                  {syncing ? "syncing…" : "↺ resync"}
                </button>
              </div>
              {cacheAge && <span style={{ fontSize: 9, color: t.textDim, fontFamily: mono }}>{cacheAge}</span>}
            </div>
          </div>

          {/* Paste area */}
          {showPaste && (
            <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                value={pastedSummary}
                onChange={e => setPastedSummary(e.target.value)}
                placeholder="Paste call summary or meeting notes…"
                style={{ width: "100%", minHeight: 80, background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", resize: "vertical", outline: "none", lineHeight: 1.5, boxSizing: "border-box" }}
                autoFocus
              />
              {extractError && <div style={{ fontSize: 11, color: t.red }}>{extractError}</div>}
              <button type="button" disabled={!pastedSummary.trim() || extracting} onClick={extractTasks}
                style={{ alignSelf: "flex-end", background: pastedSummary.trim() ? t.accent : t.bgCard, border: `1px solid ${pastedSummary.trim() ? t.accent : t.border}`, color: pastedSummary.trim() ? "#fff" : t.textDim, borderRadius: 8, padding: "5px 14px", fontSize: 11, fontWeight: 850, fontFamily: mono, cursor: pastedSummary.trim() && !extracting ? "pointer" : "not-allowed" }}>
                {extracting ? "extracting…" : "extract tasks"}
              </button>
            </div>
          )}

          {/* CALLS LIST VIEW */}
          {!selectedCall && !showPaste && (() => {
            // Always use zoomMeetings as canonical source — merge with proposal dates
            const proposalCallMap = new Map(
              proposals
                .filter(p => (p as unknown as {sourceMeeting?: string}).sourceMeeting)
                .map(p => {
                  const sp = p as unknown as { sourceMeeting: string; sourceDate: string };
                  return [sp.sourceMeeting, sp.sourceDate];
                })
            );

            // zoomMeetings is the ground truth; also include any calls that only exist in proposals
            const meetingTopics = new Map(zoomMeetings.map(m => [m.topic, m.startTime]));
            for (const [topic, date] of proposalCallMap) {
              if (!meetingTopics.has(topic)) meetingTopics.set(topic, date);
            }

            const sortedCalls = Array.from(meetingTopics.entries())
              .map(([topic, startTime]) => ({ topic, startTime }))
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .slice(0, 5);

            if (syncing && sortedCalls.length === 0) {
              return <div style={{ fontSize: 11, color: t.textMuted, fontFamily: mono }}>syncing Zoom calls and extracting tasks…</div>;
            }
            if (sortedCalls.length === 0) {
              return <div style={{ fontSize: 11, color: t.textMuted }}>Tasks from your latest Zoom calls will appear here. Hit ↺ resync to pull now.</div>;
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortedCalls.map(call => {
                  const callPending = proposals.filter(p => p.status === "pending" && (p as unknown as {sourceMeeting?: string}).sourceMeeting === call.topic);
                  const callDone = proposals.filter(p => p.status !== "pending" && (p as unknown as {sourceMeeting?: string}).sourceMeeting === call.topic);
                  return (
                    <button key={call.topic + call.startTime} type="button" onClick={() => setSelectedCall(call.topic)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left", transition: "border-color 0.1s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.accent + "66"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{call.topic}</div>
                        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: mono, marginTop: 2 }}>
                          {call.startTime ? new Date(call.startTime).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {callPending.length > 0 && <span style={{ background: t.accent, color: "#fff", borderRadius: 8, padding: "1px 7px", fontSize: 10, fontFamily: mono, fontWeight: 700 }}>{callPending.length}</span>}
                        {callDone.length > 0 && <span style={{ color: t.textDim, fontSize: 10, fontFamily: mono }}>{callDone.length} done</span>}
                        {callPending.length === 0 && callDone.length === 0 && <span style={{ color: t.textDim, fontSize: 10, fontFamily: mono }}>no tasks yet</span>}
                        <span style={{ color: t.textDim, fontSize: 12 }}>›</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* TASKS VIEW (drilled into a call) */}
          {selectedCall && !showPaste && (() => {
            const callProposals = pending.filter(p => (p as unknown as {sourceMeeting?: string}).sourceMeeting === selectedCall);
            const callDone = done.filter(p => (p as unknown as {sourceMeeting?: string}).sourceMeeting === selectedCall);

            if (callProposals.length === 0 && callDone.length === 0) {
              return <div style={{ fontSize: 11, color: t.textMuted }}>No tasks extracted from this call yet.</div>;
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
                          style={{ background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "6px 8px", fontSize: 12, color: t.text, fontFamily: mono, outline: "none", width: "100%", boxSizing: "border-box" }}
                        />
                        <div style={{ fontSize: 9, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>pipeline: {editPipe?.name || editing.pipelineId}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {allPipelinesGlobal.map(pipe => {
                            const sel = editing.pipelineId === pipe.id;
                            return <button key={pipe.id} type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, pipelineId: pipe.id, parentStage: "" } : null); }}
                              style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? t.accent : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400 }}>
                              {pipe.icon} {pipe.name}
                            </button>;
                          })}
                        </div>
                        {stagesInPipe.length > 0 && (
                          <>
                            <div style={{ fontSize: 9, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>
                              {editing.parentStage ? `as subtask of: ${stageNameOverrides?.[editing.parentStage] || editing.parentStage}` : "// parent task (optional)"}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {editing.parentStage && <button type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, parentStage: "" } : null); }}
                                style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: t.amber, fontFamily: mono }}>✕ as task</button>}
                              {stagesInPipe.map(s => { const sel = editing.parentStage === s; return <button key={s} type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, parentStage: sel ? "" : s } : null); }}
                                style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? t.accent : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400 }}>{stageNameOverrides?.[s] || s}</button>; })}
                            </div>
                          </>
                        )}
                        {/* Assignee */}
                        <div style={{ fontSize: 9, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>
                          {editing.assigneeId ? `assign to: ${users.find(u => u.id === editing.assigneeId)?.name || editing.assigneeId}` : "// assign to (optional)"}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {editing.assigneeId && <button type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, assigneeId: "" } : null); }}
                            style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: t.amber, fontFamily: mono }}>✕ unassign</button>}
                          {users.filter(u => u.id !== "ai").map(u => {
                            const sel = editing.assigneeId === u.id;
                            return <button key={u.id} type="button" onMouseDown={e => { e.preventDefault(); setEditing(prev => prev ? { ...prev, assigneeId: sel ? "" : u.id } : null); }}
                              style={{ background: sel ? u.color + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? u.color + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? u.color : t.text, fontFamily: mono, fontWeight: sel ? 700 : 400 }}>
                              {u.avatar || u.name.split(" ")[0]}
                            </button>;
                          })}
                        </div>
                        {/* Description */}
                        <div style={{ fontSize: 9, color: t.accent, fontFamily: mono, fontWeight: 700, letterSpacing: 0.5 }}>// description (optional — points auto-assigned by AI)</div>
                        <textarea
                          value={editing.description}
                          onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : null)}
                          placeholder="Add context, acceptance criteria, or notes…"
                          rows={2}
                          style={{ background: t.bgCard, border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "5px 8px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", resize: "none", outline: "none", width: "100%", boxSizing: "border-box", lineHeight: 1.4 }}
                        />
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => setEditing(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: mono }}>cancel</button>
                          <button type="button" onClick={confirmEdit} disabled={!editing.title.trim()}
                            style={{ background: editing.title.trim() ? t.accent : t.surface, border: "none", borderRadius: 8, padding: "4px 12px", cursor: editing.title.trim() ? "pointer" : "not-allowed", fontSize: 10, color: editing.title.trim() ? "#fff" : t.textDim, fontFamily: mono, fontWeight: 700 }}>
                            {editing.parentStage ? "add as subtask" : "add as task"}
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 10px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>{p.title}</div>
                        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: mono, marginTop: 2 }}>{p.pipelineName}{p.stageName ? ` → ${p.stageName}` : " → new stage"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button type="button" onClick={() => startEditing(p)} style={{ background: t.green + "22", border: `1px solid ${t.green}55`, color: t.green, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 850, fontFamily: mono, cursor: "pointer" }}>✓</button>
                        <button type="button" onClick={() => rejectProposal(p.id)} style={{ background: t.red + "16", border: `1px solid ${t.red}44`, color: t.red, borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 850, fontFamily: mono, cursor: "pointer" }}>✕</button>
                      </div>
                    </div>
                  );
                })}
                {callDone.length > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: t.textDim, fontFamily: mono }}>{callDone.filter(x => x.status === "approved").length} approved · {callDone.filter(x => x.status === "rejected").length} rejected</span>
                    <button type="button" onClick={clearDone} style={{ background: "transparent", border: "none", color: t.textDim, fontSize: 10, fontFamily: mono, cursor: "pointer", textDecoration: "underline" }}>clear</button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}

interface Props {
  t: T;
  me: UserType;
  users: UserType[];
  navbarSlot?: React.ReactNode;
  myWorkspaces: Workspace[];
  allPipelinesGlobal: Pipeline[];
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  currentUser: string;
  isCaptainOfAny: boolean;
  currentWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  editMode?: boolean;
  onPipelineClick?: (pipelineId: string) => void;
  onUserClick?: (userId: string) => void;
  viewingUser?: string | null;
  setViewingUser?: (id: string | null) => void;
  onChangeAvatar?: (userId: string, avatar: string) => void;
}

export default function HomeView({
  t, me, users, myWorkspaces, allPipelinesGlobal, pipeMetaOverrides,
  currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace,
  editMode, onPipelineClick, onUserClick, navbarSlot,
  viewingUser, setViewingUser, onChangeAvatar,
}: Props) {
  const {
    claims, comments, approvedStages, approvedSubtasks, customStages, getPoints: modelGetPoints,
    owners, assignments, subtasks, subtaskStages, activityLog, chatMessages,
    getStatus, ck, approveStage, handleClaim,
  } = useModel();

  // null = show all workspaces; string = filter to specific workspace
  const [homeWsFilter, setHomeWsFilter] = useState<string | null>(null);
  const [overviewNow] = useState(() => Date.now());

  // Build full pipeline→workspace map from ALL user's workspaces
  const pipelineWorkspaceMap = useMemo(() => {
    const m: Record<string, { id: string; name: string; icon: string }> = {};
    for (const w of myWorkspaces) {
      for (const pid of w.pipelineIds) {
        if (!m[pid]) m[pid] = { id: w.id, name: w.name, icon: w.icon };
      }
    }
    return m;
  }, [myWorkspaces]);

  // Pipelines visible based on homeWsFilter:
  // null = all pipelines linked to any of user's workspaces
  // set = only pipelines linked to that specific workspace
  const visiblePipelines = useMemo(() => {
    const ids = new Set<string>();
    if (homeWsFilter) {
      const ws = myWorkspaces.find(w => w.id === homeWsFilter);
      (ws?.pipelineIds || []).forEach(pid => ids.add(pid));
    } else {
      for (const w of myWorkspaces) for (const pid of w.pipelineIds) ids.add(pid);
    }
    // Also include pipelines that contain any stage/subtask the current user owns or is assigned to.
    // This guarantees the "mine" tab can never miss a user\'s items, even if a pipeline isn\'t
    // explicitly linked to one of their workspaces.
    if (currentUser) {
      const userInList = (key: string) =>
        (claims[key] || []).includes(currentUser) ||
        (assignments[key] || []).includes(currentUser) ||
        (owners[key] || []).includes(currentUser);
      for (const p of allPipelinesGlobal) {
        if (ids.has(p.id)) continue;
        const allStagesInPipe = [...p.stages, ...(customStages[p.id] || [])];
        const hasOwnedStage = allStagesInPipe.some(userInList);
        const hasOwnedSubtask = !hasOwnedStage && allStagesInPipe.some(s =>
          (subtasks[s] || []).some(sub => userInList(`${s}::${sub.id}`))
        );
        if (hasOwnedStage || hasOwnedSubtask) ids.add(p.id);
      }
    }
    return allPipelinesGlobal.filter(p => ids.has(p.id));
  }, [myWorkspaces, allPipelinesGlobal, homeWsFilter, currentUser, claims, assignments, owners, customStages, subtasks]);

  const greeting = `gm, ${me.name.toLowerCase()} 🫡`;
  const attention = useMemo(() => {
    const dayAgo = overviewNow - 24 * 60 * 60 * 1000;
    const visiblePipelineIds = new Set(visiblePipelines.map(p => p.id));
    const visibleStageIds = new Set<string>();
    const stageToPipeline = new Map<string, Pipeline>();
    for (const p of visiblePipelines) {
      for (const stage of [...p.stages, ...(customStages[p.id] || [])]) {
        visibleStageIds.add(stage);
        stageToPipeline.set(stage, p);
      }
    }

    const itemOwnerIds = (key: string) => Array.from(new Set([
      ...(claims[key] || []),
      ...(owners[key] || []),
      ...(assignments[key] || []),
    ]));
    const isRoot = ADMIN_IDS.includes(currentUser);
    const scopedWorkspaces = homeWsFilter
      ? myWorkspaces.filter(w => w.id === homeWsFilter)
      : myWorkspaces;
    const isOperatorScope = isRoot || scopedWorkspaces.some(w => w.captains.includes(currentUser));
    const roleLabel = isRoot ? "root" : isOperatorScope ? "operator" : "agent";

    const stageItems = Array.from(visibleStageIds).map(stageId => {
      const pipeline = stageToPipeline.get(stageId);
      const priority = pipeline ? pipeMetaOverrides[pipeline.id]?.priority : undefined;
      return {
        key: stageId,
        title: stageNameLabel(stageId),
        pipelineName: pipeline ? ((pipeline as { displayName?: string }).displayName || pipeline.name) : "Inbox",
        pipelineId: pipeline?.id || "",
        status: getStatus(stageId),
        owners: itemOwnerIds(stageId),
        priority,
        kind: "task" as const,
        approved: approvedStages.includes(stageId),
      };
    });
    const subtaskItems = Object.entries(subtasks || {}).flatMap(([parentStageId, list]) => {
      if (!visibleStageIds.has(parentStageId)) return [];
      const parent = stageToPipeline.get(parentStageId);
      return list.map(sub => {
        const key = `${parentStageId}::${sub.id}`;
        return {
          key,
          title: sub.text,
          pipelineName: parent ? ((parent as { displayName?: string }).displayName || parent.name) : "Inbox",
          pipelineId: parent?.id || "",
          status: subtaskStages[key] || "planned",
          owners: itemOwnerIds(key),
          priority: parent ? pipeMetaOverrides[parent.id]?.priority : undefined,
          kind: "subtask" as const,
          approved: approvedSubtasks.includes(key),
          done: sub.done,
        };
      });
    });
    const allItems = [...stageItems, ...subtaskItems].filter(item => item.pipelineId === "" || visiblePipelineIds.has(item.pipelineId));
    const myItems = allItems.filter(item => item.owners.includes(currentUser));
    const freshActivity = activityLog.filter(a => a.time > dayAgo && a.user !== currentUser);
    const scopedMemberIds = new Set(scopedWorkspaces.flatMap(w => w.members));
    const scopedUsers = users.filter(u => scopedMemberIds.has(u.id));
    const newOwned = freshActivity.filter(a => myItems.some(item => item.key === a.target)).slice(0, 6);
    const reviewItems = allItems.filter(item =>
      (item.kind === "task" && item.status === "active" && !item.approved) ||
      (item.kind === "subtask" && item.done && !item.approved)
    );
    const blockedItems = allItems.filter(item => item.status === "blocked");
    const hotItems = allItems.filter(item =>
      (item.priority === "NOW" || item.priority === "HIGH") &&
      item.status !== "active" &&
      item.status !== "blocked"
    );
    const unownedItems = allItems.filter(item => item.owners.length === 0 && item.status !== "active");
    const firstName = me.name.split(" ")[0].toLowerCase();
    const mentionNeedles = [`@${firstName}`, `@${currentUser.toLowerCase()}`];
    const mentions = Object.entries(comments || {}).flatMap(([target, list]) =>
      list
        .filter(c => c.by !== currentUser && mentionNeedles.some(n => c.text.toLowerCase().includes(n)))
        .map(c => ({
          target,
          text: c.text,
          by: c.by,
          title: stageNameLabel(target),
        }))
    ).slice(-5).reverse();
    const mineBlocked = blockedItems.filter(item => item.owners.includes(currentUser));
    const mineHot = hotItems.filter(item => item.owners.includes(currentUser));
    const minePlanned = myItems.filter(item => item.status === "planned" || item.status === "concept");
    const chatMentions = (chatMessages || [])
      .filter(msg => msg.userId !== currentUser && mentionNeedles.some(n => msg.text.toLowerCase().includes(n)))
      .slice(-4)
      .reverse();
    const activeUpdates = freshActivity
      .filter(a => a.type === "status_change" && /active|in progress|→ active/i.test(a.detail))
      .slice(0, 4);
    const people = roleLabel === "agent" ? [] : scopedUsers
      .filter(u => u.id !== currentUser)
      .map(u => {
        const openItems = allItems.filter(item => item.owners.includes(u.id) && item.status !== "active");
        const userActivity = activityLog.filter(a => a.user === u.id);
        const userComments = Object.entries(comments || {}).flatMap(([target, list]) =>
          list.filter(c => c.by === u.id).map(c => ({ target, text: c.text }))
        );
        const userChat = (chatMessages || []).filter(m => m.userId === u.id);
        const lastActivity = Math.max(
          0,
          ...userActivity.map(a => a.time),
          ...userChat.map(m => m.id),
        );
        const recentActive = userActivity
          .filter(a => a.time > dayAgo && a.type === "status_change" && /active|in progress|→ active/i.test(a.detail))
          .slice(0, 1)[0];
        const recentComment = userComments.slice(-1)[0];
        const stale = openItems.length > 0 && (!lastActivity || overviewNow - lastActivity > 48 * 60 * 60 * 1000);
        const title = u.name.split(" ")[0];
        if (stale) {
          return {
            user: u,
            title,
            meta: lastActivity ? `${timeAgoFrom(overviewNow, lastActivity)} quiet` : "no updates",
            body: `${openItems.length} open item${openItems.length === 1 ? "" : "s"} without recent movement`,
            tone: "amber" as AttentionTone,
          };
        }
        if (recentActive) {
          return {
            user: u,
            title,
            meta: "in progress",
            body: `${stageNameLabel(recentActive.target)} moved forward`,
            tone: "green" as AttentionTone,
          };
        }
        return {
          user: u,
          title,
          meta: lastActivity ? timeAgoFrom(overviewNow, lastActivity) : "quiet",
          body: recentComment ? truncate(recentComment.text, 70) : `${openItems.length} open item${openItems.length === 1 ? "" : "s"}`,
          tone: openItems.length > 0 ? "cyan" as AttentionTone : "accent" as AttentionTone,
        };
      })
      .sort((a, b) => {
        const priority = { amber: 0, green: 1, cyan: 2, accent: 3, red: 4 } as Record<AttentionTone, number>;
        return priority[a.tone] - priority[b.tone];
      })
      .slice(0, 6);

    const stats = roleLabel === "agent"
      ? [
          { label: "your open work", value: minePlanned.length, tone: "accent" as AttentionTone },
          { label: "mentions", value: mentions.length, tone: "amber" as AttentionTone },
          { label: "blocked by you", value: mineBlocked.length, tone: "red" as AttentionTone },
          { label: "hot priorities", value: mineHot.length, tone: "green" as AttentionTone },
        ]
      : roleLabel === "operator"
        ? [
            { label: "needs approval", value: reviewItems.length, tone: "green" as AttentionTone },
            { label: "blocked", value: blockedItems.length, tone: "red" as AttentionTone },
            { label: "unowned work", value: unownedItems.length, tone: "amber" as AttentionTone },
            { label: "new activity", value: freshActivity.length, tone: "cyan" as AttentionTone },
          ]
        : [
            { label: "approval queue", value: reviewItems.length, tone: "green" as AttentionTone },
            { label: "blocked across org", value: blockedItems.length, tone: "red" as AttentionTone },
            { label: "unowned", value: unownedItems.length, tone: "amber" as AttentionTone },
            { label: "mentions", value: mentions.length, tone: "accent" as AttentionTone },
          ];

    const actions = roleLabel === "agent"
      ? [
          ...mentions.map(m => ({ tone: "amber" as AttentionTone, title: `${commentUserLabel(m.by)} mentioned you`, meta: m.title, body: truncate(m.text, 92) })),
          ...chatMentions.map(m => ({ tone: "amber" as AttentionTone, title: `${commentUserLabel(m.userId)} messaged you`, meta: "chat", body: truncate(m.text, 92) })),
          ...mineBlocked.slice(0, 3).map(item => ({ tone: "red" as AttentionTone, title: item.title, meta: "blocked", body: item.pipelineName })),
          ...mineHot.slice(0, 3).map(item => ({ tone: "green" as AttentionTone, title: item.title, meta: `${item.priority} priority`, body: item.pipelineName })),
          ...newOwned.slice(0, 2).map(a => ({ tone: "cyan" as AttentionTone, title: a.detail, meta: timeAgo(a.time), body: stageNameLabel(a.target) })),
        ]
      : [
          ...chatMentions.map(m => ({ tone: "amber" as AttentionTone, title: `${commentUserLabel(m.userId)} messaged you`, meta: "chat", body: truncate(m.text, 92) })),
          ...activeUpdates.map(a => ({ tone: "green" as AttentionTone, title: `${commentUserLabel(a.user)} marked work in progress`, meta: timeAgoFrom(overviewNow, a.time), body: stageNameLabel(a.target) })),
          ...reviewItems.slice(0, 4).map(item => ({ tone: "green" as AttentionTone, title: item.title, meta: "ready for review", body: item.pipelineName })),
          ...blockedItems.slice(0, 3).map(item => ({ tone: "red" as AttentionTone, title: item.title, meta: "blocked", body: item.pipelineName })),
          ...unownedItems.slice(0, 3).map(item => ({ tone: "amber" as AttentionTone, title: item.title, meta: "no owner", body: item.pipelineName })),
          ...mentions.slice(0, 2).map(m => ({ tone: "accent" as AttentionTone, title: `${commentUserLabel(m.by)} mentioned you`, meta: m.title, body: truncate(m.text, 92) })),
        ];

    const topAction = actions[0];
    const summary = topAction
      ? topAction.title
      : roleLabel === "agent"
        ? "clear lane: no urgent personal items"
        : "clear lane: no urgent team items";

    function stageNameLabel(key: string) {
      if (SubtaskKey.isValid(key)) {
        const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
        if (parsed) {
          const sub = (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId);
          return sub?.text || key;
        }
      }
      return key;
    }
    function commentUserLabel(id: string) {
      return users.find(u => u.id === id)?.name.split(" ")[0] || id;
    }

    return {
      roleLabel,
      stats,
      actions: actions.slice(0, 6),
      people,
      summary,
      scopeLabel: homeWsFilter ? (myWorkspaces.find(w => w.id === homeWsFilter)?.name || "workspace") : "all workspaces",
      rawReviewItems: reviewItems.slice(0, 5).map(i => ({ key: i.key, title: i.title, pipelineName: i.pipelineName, kind: i.kind })),
      rawBlockedItems: blockedItems.slice(0, 5).map(i => ({ key: i.key, title: i.title, pipelineName: i.pipelineName, owners: i.owners })),
      rawUnownedItems: unownedItems.slice(0, 5).map(i => ({ key: i.key, title: i.title, pipelineName: i.pipelineName })),
      rawMyItems: myItems.filter(i => i.status !== "active").slice(0, 5).map(i => ({ key: i.key, title: i.title, pipelineName: i.pipelineName, status: i.status })),
      rawMineBlocked: mineBlocked.slice(0, 3).map(i => ({ key: i.key, title: i.title, pipelineName: i.pipelineName })),
    };
  }, [
    activityLog, approvedStages, approvedSubtasks, assignments, chatMessages, claims, comments, currentUser,
    customStages, getStatus, homeWsFilter, me.name, myWorkspaces, owners, overviewNow, pipeMetaOverrides,
    subtaskStages, subtasks, users, visiblePipelines,
  ]);

  return (
    <div>
      {/* Greeting + navbar on same line */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.5, lineHeight: 1.15 }}>{greeting}</div>
        {navbarSlot && <div style={{ flexShrink: 0 }}>{navbarSlot}</div>}
      </div>

      {/* Optimized workspace header */}
      {myWorkspaces.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          {/* Workspace switcher row — "All" tab + per-workspace tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {/* "All" tab — selected when no workspace filter is active */}
            {(() => {
              const isAllActive = homeWsFilter === null;
              return (
                <button
                  key="__all__"
                  onClick={() => setHomeWsFilter(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isAllActive ? t.accent + "18" : "transparent",
                    border: isAllActive ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: isAllActive ? t.accent : t.textMuted,
                    fontSize: 12,
                    fontWeight: isAllActive ? 700 : 600,
                    fontFamily: "var(--font-dm-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isAllActive) el.style.color = t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isAllActive) el.style.color = t.textMuted;
                  }}
                >
                  <span style={{ fontSize: 14 }}>🌐</span>
                  <span>All</span>
                </button>
              );
            })()}
            {myWorkspaces.map(w => {
              const isActive = w.id === homeWsFilter;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    const next = homeWsFilter === w.id ? null : w.id;
                    setHomeWsFilter(next);
                    if (next) onSwitchWorkspace(next);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isActive ? t.accent + "18" : "transparent",
                    border: isActive ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: isActive ? t.accent : t.textMuted,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 600,
                    fontFamily: "var(--font-dm-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isActive) el.style.color = t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isActive) el.style.color = t.textMuted;
                  }}
                >
                  <span style={{ fontSize: 14 }}>{w.icon}</span>
                  <span>{w.name}</span>
                </button>
              );
            })}
          </div>

          <AttentionOverview t={t} attention={attention} onApprove={(key) => approveStage(key)} onClaim={(key) => handleClaim(key)} />
          <ZoomIntegrationPanel t={t} isAdmin={attention.roleLabel !== "agent"} />

          {/* Summary card — shows aggregate "all" view when no workspace selected, or specific workspace when one is */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                // "All" mode: aggregate across every workspace the user is in
                if (homeWsFilter === null) {
                  const allPipelineIds = new Set<string>();
                  for (const w of myWorkspaces) for (const pid of w.pipelineIds) allPipelineIds.add(pid);
                  const allPipelines = allPipelinesGlobal.filter(p => allPipelineIds.has(p.id));
                  const totalStages = allPipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                  const allMemberIds = new Set<string>();
                  for (const w of myWorkspaces) for (const m of w.members) allMemberIds.add(m);
                  const allTeamMembers = users.filter(u => allMemberIds.has(u.id));
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>🌐</div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>All workspaces</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.accent }}>◆ {myWorkspaces.length} workspaces</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.green }}>● {allPipelines.length} pipelines</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.cyan || t.accent }}>• {totalStages} stages</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
                          team ({allTeamMembers.length})
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {allTeamMembers.map(u => {
                            const uPts = modelGetPoints(u.id);
                            const isMe = u.id === currentUser;
                            return (
                              <div key={u.id} style={{ position: "relative" }}>
                                <button
                                  type="button"
                                  data-testid="team-avatar"
                                  onClick={e => { e.stopPropagation(); onUserClick?.(u.id); }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.borderColor = u.color + "88"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = isMe ? t.accent + "44" : t.border; }}
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, border-color 0.15s" }}
                                >
                                  <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                    <AvatarC user={u} size={24} />
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{u.name.split(" ")[0]}</div>
                                    <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                                  </div>
                                </button>
                                {viewingUser === u.id && setViewingUser && (
                                  <UserPopup user={u} onClose={() => setViewingUser(null)} onChangeAvatar={onChangeAvatar} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                }

                // Specific workspace selected
                const activeWs = myWorkspaces.find(w => w.id === homeWsFilter);
                if (!activeWs) return null;
                const activePipelines = allPipelinesGlobal.filter(p => activeWs.pipelineIds.includes(p.id));
                const totalStages = activePipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                const wsMembers = activeWs.members;
                const wsTeamMembers = users.filter(u => wsMembers.includes(u.id));

                return (
                  <>
                    {/* Header: icon, name, stats */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>{activeWs.icon}</div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>{activeWs.name}</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.green }}>● {activePipelines.length} pipelines</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.cyan || t.accent }}>• {totalStages} stages</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team members section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
                        team ({wsTeamMembers.length})
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {wsTeamMembers.map((u) => {
                          const uPts = modelGetPoints(u.id);
                          const isMe = u.id === currentUser;
                          const role: "root" | "operator" | null =
                            ADMIN_IDS.includes(u.id) ? "root"
                            : activeWs.captains.includes(u.id) ? "operator"
                            : null;
                          return (
                            <div key={u.id} style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onUserClick?.(u.id); }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.borderColor = u.color + "88"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = isMe ? t.accent + "44" : t.border; }}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, border-color 0.15s" }}
                              >
                                <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                  <AvatarC user={u} size={24} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: "flex", gap: 6, alignItems: "center" }}>
                                    {u.name.split(" ")[0]}
                                    {role && <span style={{ fontSize: 11, color: t.text, fontWeight: 800 }} title={role}>{role === "root" ? "🔑" : "⚡"}</span>}
                                  </div>
                                  <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                                </div>
                              </button>
                              {viewingUser === u.id && setViewingUser && (
                                <UserPopup user={u} onClose={() => setViewingUser(null)} onChangeAvatar={onChangeAvatar} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
        </div>
      )}

      <TasksView
        t={t}
        allPipelines={visiblePipelines}
        customStages={customStages}
        pipeMetaOverrides={pipeMetaOverrides}
        getStatus={getStatus}
        users={users}
        currentUser={currentUser}
        isAdmin={isCaptainOfAny}
        ck={ck}
        showMyAllFilter={true}
        defaultMyAllFilter={isCaptainOfAny ? "all" : "my"}
        pipelineWorkspaceMap={pipelineWorkspaceMap}
        headerLabel="🏠 home"
        editMode={editMode}
        onPipelineClick={onPipelineClick}
        currentWorkspaceId={homeWsFilter}
        availableWorkspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, pipelineIds: w.pipelineIds }))}
      />
    </div>
  );
}
