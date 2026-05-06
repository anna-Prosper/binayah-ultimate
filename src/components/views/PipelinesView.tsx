"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import { useModel, useRole } from "@/lib/contexts/ModelContext";
import { Chev } from "@/components/ui/primitives";
import ClaimerPills from "@/components/ui/ClaimerPills";
import SearchFilter from "@/components/SearchFilter";
import Stage from "@/components/Stage";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { KanbanSkeleton, OverviewSkeleton } from "@/components/ui/Skeletons";
import ConfirmModal from "@/components/ui/ConfirmModal";
import dynamic from "next/dynamic";
import { REACTIONS, ADMIN_IDS } from "@/lib/data";

const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });
const OverviewPanel = dynamic(() => import("@/components/OverviewPanel"), { ssr: false });

const ICON_OPTIONS = ["🔧", "🚀", "💡", "🎯", "⚡", "🔥", "🤖", "💥", "✨", "📊"];
const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;
const COLOR_OPTIONS = ["blue", "purple", "green", "amber", "cyan", "red", "orange", "lime", "slate"] as const;

interface PipelinesViewProps {
  view: "list" | "kanban" | "overview";
  setView: (v: "list" | "kanban" | "overview") => void;
  expanded: string[];
  setExpanded: React.Dispatch<React.SetStateAction<string[]>>;
  expS: string | null;
  setExpS: (v: string | null) => void;
  searchQ: string;
  setSearchQ: (v: string) => void;
  statusFilter: string | null;
  setStatusFilter: (v: string | null) => void;
  isMobile: boolean;
  currentWorkspaceId: string;
  currentWorkspace: { name: string; icon: string } | null;
  isAdmin: boolean;
  readOnly?: boolean;
  showToast: (msg: string, color: string) => void;
  handleClaimWithAnim: (sid: string) => void;
  sharePipeline: (pid: string, pname: string, pdesc: string, priority: string, stageList: string[]) => void;
  onPipelineClick: (pid: string) => void;
}

export default function PipelinesView({
  view, setView, expanded, setExpanded, expS, setExpS,
  searchQ, setSearchQ, statusFilter, setStatusFilter,
  isMobile, currentWorkspaceId, currentWorkspace,
  isAdmin, readOnly, showToast, handleClaimWithAnim, sharePipeline, onPipelineClick,
}: PipelinesViewProps) {
  // Pipeline editing state — local to PipelinesView
  const [editingPipeDesc, setEditingPipeDesc] = useState<string | null>(null);
  const [editingPipeName, setEditingPipeName] = useState<string | null>(null);
  const [newStageInput, setNewStageInput] = useState<Record<string, string>>({});
  const [addingPipeline, setAddingPipeline] = useState(false);
  // Hover state for revealing secondary actions per row
  const [hoveredPipeline, setHoveredPipeline] = useState<string | null>(null);
  const [newPipeForm, setNewPipeForm] = useState({ name: "", desc: "", icon: "🔧", colorKey: "blue", priority: "MEDIUM" });
  const [pipeMenuOpen, setPipeMenuOpen] = useState<string | null>(null);
  // Per-pipeline edit mode (pencil toggle)
  const [pipelineEditMode, setPipelineEditMode] = useState<string | null>(null);
  const pipelineEditRef = useRef<HTMLDivElement | null>(null);
  // Confirm modal state for destructive pipeline ops
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; pipelineId: string; title: string; body: string;
  }>({ open: false, pipelineId: "", title: "", body: "" });

  const {
    users, currentUser, me,
    claims, reactions, getPoints,
    stageDescOverrides,
    pipeDescOverrides, setPipeDescOverrides, pipeMetaOverrides, setPipeMetaOverrides,
    customStages, workspaces, allPipelinesGlobal,
    getStatus, sc, ck, pr,
    handleReact,
    setStageDescOverride,
    addCustomStage, addCustomPipeline, cyclePriority, archivePipeline,
    archivedStages, archivedPipelines,
    activityLog,
    t,
  } = useModel();

  // Derive workspace ID for a given pipeline (the workspace whose pipelineIds includes it)
  const getPipelineWorkspaceId = useCallback((pipelineId: string): string | undefined => {
    return workspaces.find(w => w.pipelineIds.includes(pipelineId))?.id ?? currentWorkspaceId ?? undefined;
  }, [workspaces, currentWorkspaceId]);

  // Role in the current workspace (for pipeline edit gating)
  const roleInCurrentWs = useRole(currentWorkspaceId || undefined);
  const canEditPipeline = useCallback((pipelineId: string): boolean => {
    if (readOnly) return false;
    if (currentUser && ADMIN_IDS.includes(currentUser)) return true;
    const wsId = getPipelineWorkspaceId(pipelineId);
    if (!wsId) {
      return roleInCurrentWs === "operator" || roleInCurrentWs === "root";
    }
    const ws = workspaces.find(w => w.id === wsId);
    if (!ws || !currentUser) return false;
    return ws.captains.includes(currentUser);
  }, [getPipelineWorkspaceId, workspaces, currentUser, roleInCurrentWs, readOnly]);

  // Click-outside + Escape handler for pipelineEditMode
  const closePipelineEditMode = useCallback(() => {
    setPipelineEditMode(null);
    setEditingPipeName(null);
    setEditingPipeDesc(null);
  }, []);

  useEffect(() => {
    if (!pipelineEditMode) return;
    const handler = (e: MouseEvent) => {
      if (pipelineEditRef.current && !pipelineEditRef.current.contains(e.target as Node)) {
        closePipelineEditMode();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePipelineEditMode();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [pipelineEditMode, closePipelineEditMode]);
  const { reactOpen, setReactOpen, copied } = useEphemeral();

  const allPipelines = currentWorkspaceId
    ? (() => {
        const ws = workspaces.find(w => w.id === currentWorkspaceId);
        return ws ? allPipelinesGlobal.filter(p => ws.pipelineIds.includes(p.id)) : allPipelinesGlobal;
      })()
    : allPipelinesGlobal;

  const toggleExpand = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const addCustomStageLocal = (pid: string) => { const val = newStageInput[pid]?.trim(); if (!val) return; addCustomStage(pid, val); setNewStageInput(prev => ({ ...prev, [pid]: "" })); };
  const addCustomPipelineLocal = () => { if (!newPipeForm.name.trim()) return; const id = addCustomPipeline(newPipeForm); if (id) { setNewPipeForm({ name: "", desc: "", icon: "🔧", colorKey: "blue", priority: "MEDIUM" }); setAddingPipeline(false); setExpanded(prev => [...prev, id]); } };

  // Top claim stage
  const topClaimStageName = (() => {
    if (!currentUser) return null;
    const actionableStatuses = new Set(["planned", "in-progress", "active"]);
    for (const p of allPipelines) {
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      for (const s of stages) {
        if (actionableStatuses.has(getStatus(s)) && !(claims[s] || []).includes(currentUser)) return s;
      }
    }
    return null;
  })();

  if (!me) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        body={confirmModal.body}
        confirmLabel="archive"
        cancelLabel="cancel"
        danger
        onConfirm={() => {
          archivePipeline(confirmModal.pipelineId);
          closePipelineEditMode();
          setConfirmModal(prev => ({ ...prev, open: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        t={t}
      />
      {/* Search + view toggle */}
      <div className="bu-search-row" style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "stretch" }}>
        <div style={{ flex: 1 }}><SearchFilter searchQ={searchQ} setSearchQ={setSearchQ} statusFilter={statusFilter} setStatusFilter={setStatusFilter} t={t} /></div>
        <div className="bu-view-toggle" style={{ display: "flex", gap: 4, alignItems: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 4px" }}>
          {([["list", "☰ list", "☰"], ["kanban", "⊞ kanban", "⊞"], ["overview", "□ overview", "□"]] as const).map(([v, label, icon]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: view === v ? t.accent + "22" : "transparent", border: `1px solid ${view === v ? t.accent + "55" : "transparent"}`, borderRadius: 8, padding: isMobile ? "10px 14px" : "5px 12px", minHeight: isMobile ? 44 : undefined, cursor: "pointer", fontSize: 11, color: view === v ? t.accent : t.textMuted, fontWeight: view === v ? 700 : 500, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>{isMobile ? icon : label}</button>
          ))}
        </div>
      </div>

      {/* Overview */}
      {view === "overview" && (
        <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
          <Suspense fallback={<OverviewSkeleton t={t} />}>
            <OverviewPanel allPipelines={allPipelines} customStages={customStages} getStatus={getStatus} claims={claims} users={users} sc={sc} ck={ck} stageDescOverrides={stageDescOverrides} setStageDescOverride={setStageDescOverride} pipeDescOverrides={pipeDescOverrides} setPipeDescOverrides={setPipeDescOverrides} pipeMetaOverrides={pipeMetaOverrides} setPipeMetaOverrides={setPipeMetaOverrides} searchQ={searchQ} activityLog={activityLog} t={t} readOnly={readOnly} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Kanban */}
      {view === "kanban" && (
        <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
          <Suspense fallback={<KanbanSkeleton t={t} />}>
            <TasksView t={t} allPipelines={allPipelines} customStages={customStages} pipeMetaOverrides={pipeMetaOverrides} getStatus={getStatus} users={users} currentUser={currentUser} isAdmin={isAdmin} ck={ck} onPipelineClick={onPipelineClick} showMyAllFilter={true} defaultMyAllFilter={isAdmin || readOnly ? "all" : "my"} pipelineWorkspaceMap={Object.fromEntries(allPipelines.map(p => [p.id, { id: currentWorkspaceId || "", name: currentWorkspace?.name || "", icon: currentWorkspace?.icon || "" }]))} currentWorkspaceId={currentWorkspaceId} readOnly={readOnly} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* List */}
      {view === "list" && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {allPipelines.filter(p => !archivedPipelines.includes(p.id)).filter(p => {
          const q = searchQ.toLowerCase();
          const allPStages = [...p.stages, ...(customStages[p.id] || [])].filter(s => !archivedStages.includes(s));
          const matchesSearch = !q || p.name.toLowerCase().includes(q) || allPStages.some(s => s.toLowerCase().includes(q));
          const matchesFilter = !statusFilter || (statusFilter === "claimed" ? allPStages.some(s => (claims[s] || []).includes(currentUser!)) : allPStages.some(s => getStatus(s) === statusFilter));
          return matchesSearch && matchesFilter;
        }).map(p => {
          const isO = expanded.includes(p.id);
          const pipeMeta = pipeMetaOverrides[p.id] || {};
          const pipeName = pipeMeta.name ?? p.name;
          const pipePriority = pipeMeta.priority ?? p.priority;
          const pipeDesc = pipeDescOverrides[p.id] ?? p.desc;
          const allPStages = [...p.stages, ...(customStages[p.id] || [])].filter(s => !archivedStages.includes(s));
          const pC = ck[p.colorKey] || t.accent;
          const prC = pr[pipePriority as keyof typeof pr] || { c: t.textMuted };
          const statusWeight: Record<string, number> = { concept: 0, planned: 25, "in-progress": 60, active: 100 };
          const pct = allPStages.length > 0 ? Math.round(allPStages.reduce((sum, s) => sum + (statusWeight[getStatus(s)] || 0), 0) / allPStages.length) : 0;
          const uClaim = [...new Set(allPStages.flatMap(s => claims[s] || []))];
          const allPipelineClaimed = allPStages.length > 0 && allPStages.every(s => (claims[s] || []).includes(currentUser!));
          const pipeReactKey = `_pipe_${p.id}`;
          const pipeReactions = reactions[pipeReactKey] || {};
          const pipeReactExist = Object.entries(pipeReactions).filter(([, v]) => v.length > 0);
          // #6: dim "settled" pipelines — only concept/done stages, nothing in flight
          const hasActive = allPStages.some(s => {
            const st = getStatus(s);
            return st === "in-progress" || st === "planned" || st === "blocked";
          });
          const isSettled = allPStages.length > 0 && !hasActive;
          // #4: priority config (icon + visual treatment matches task-card style)
          const priCfg = pipePriority === "NOW"
            ? { color: t.red, icon: "🔥", label: "NOW", urgent: true }
            : pipePriority === "HIGH"
            ? { color: t.amber, icon: "⬆", label: "HIGH", urgent: false }
            : pipePriority === "MEDIUM"
            ? { color: t.cyan || t.accent, icon: "→", label: "MED", urgent: false }
            : { color: t.textDim, icon: "⬇", label: "LOW", urgent: false };
          // #3: progress-bar tint — red < 30, amber 30–70, green > 70
          const pctColor = pct >= 70 ? t.green : pct >= 30 ? t.amber : pct > 0 ? t.red : t.textDim;
          const isRowHovered = hoveredPipeline === p.id;
          return (
            <div
              key={p.id}
              ref={pipelineEditMode === p.id ? pipelineEditRef : null}
              onMouseEnter={() => setHoveredPipeline(p.id)}
              onMouseLeave={() => setHoveredPipeline(prev => prev === p.id ? null : prev)}
              style={{ background: t.bgCard, border: `1px solid ${pipelineEditMode === p.id ? pC + "55" : isO ? pC + "33" : t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: isO ? t.shadowLg : t.shadow, transition: "all 0.25s, opacity 0.2s", opacity: isSettled && !isO ? 0.55 : 1, position: "relative" as const }}
            >
              {/* #3: thicker, status-tinted progress bar replacing the % text */}
              <div style={{ height: 4, background: t.surface }}><div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: `linear-gradient(90deg,${pctColor},${pctColor}aa)`, transition: "width 0.5s" }} /></div>
              {/* #5: tighter row padding */}
              <div onClick={() => toggleExpand(p.id)} style={{ padding: "8px 14px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                    <Chev open={isO} color={pC} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <span style={{ fontSize: 16 }}>{p.icon}</span>
                        {editingPipeName === p.id ? (
                          <input value={pipeName} onChange={e => setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), name: e.target.value } }))} onBlur={() => setEditingPipeName(null)} onKeyDown={e => { if (e.key === "Enter") setEditingPipeName(null); }} autoFocus onClick={e => e.stopPropagation()} style={{ fontSize: 15, fontWeight: 900, color: t.text, background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "0 8px", outline: "none", fontFamily: "inherit" }} />
                        ) : (
                          <span style={{ fontSize: 15, fontWeight: 900, color: t.text }}>{pipeName}</span>
                        )}
                        <span style={{ fontSize: 10, color: pC, background: pC + "12", padding: "0 7px", borderRadius: 8, fontWeight: 700 }}>{allPStages.length}</span>
                        {/* #4: priority badge — icon + tight pill, urgent state filled */}
                        <span
                          onClick={e => { e.stopPropagation(); cyclePriority(p.id, pipePriority); }}
                          title="Click to cycle priority"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            background: priCfg.urgent ? priCfg.color : priCfg.color + "22",
                            color: priCfg.urgent ? "#fff" : priCfg.color,
                            border: `1px solid ${priCfg.urgent ? priCfg.color : priCfg.color + "88"}`,
                            borderRadius: 6, padding: "1px 7px",
                            fontSize: 9, fontWeight: 900, letterSpacing: 0.5,
                            cursor: "pointer",
                            boxShadow: priCfg.urgent ? `0 0 8px ${priCfg.color}55` : "none",
                          }}
                        >
                          <span style={{ fontSize: 9 }}>{priCfg.icon}</span>
                          <span>{priCfg.label}</span>
                        </span>
                      </div>
                      {/* #5: description — single truncated line by default, full edit mode unchanged */}
                      {editingPipeDesc === p.id ? (
                        <textarea value={pipeDesc} onChange={e => setPipeDescOverrides(prev => ({ ...prev, [p.id]: e.target.value }))} onBlur={() => setEditingPipeDesc(null)} autoFocus onClick={e => e.stopPropagation()} rows={2} style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.5, marginBottom: 0 }} />
                      ) : (
                        <p style={{ fontSize: 12, color: t.textSec, margin: "0", lineHeight: 1.4, display: "flex", alignItems: "baseline", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isO ? "normal" : "nowrap" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{pipeDesc || <span style={{ fontStyle: "italic", opacity: 0.5 }}>Add description...</span>}</span>
                          {pipelineEditMode === p.id && <span onClick={e => { e.stopPropagation(); setEditingPipeDesc(p.id); }} style={{ fontSize: 10, color: t.textDim, opacity: 0.4, flexShrink: 0, cursor: "pointer" }}>{"✎"}</span>}
                        </p>
                      )}
                      {/* Existing reactions — always visible (engagement signal). The picker
                          only opens via the hover-revealed '+ react' button below. */}
                      {pipeReactExist.length > 0 && reactOpen !== pipeReactKey && (
                        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                          {pipeReactExist.map(([emoji, arr]) => {
                            const mine = arr.includes(currentUser!);
                            return (
                              <button key={emoji} onClick={() => handleReact(pipeReactKey, emoji)} style={{ background: mine ? pC + "18" : t.surface, border: "none", borderRadius: 8, padding: "0 6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
                                <span style={{ fontSize: 13 }}>{emoji}</span>
                                <span style={{ fontSize: 10, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* Action row — fades out when row not hovered (still tappable for touch) */}
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap",
                          opacity: (isRowHovered || isO || reactOpen === pipeReactKey || pipelineEditMode === p.id) ? 1 : 0,
                          maxHeight: (isRowHovered || isO || reactOpen === pipeReactKey || pipelineEditMode === p.id) ? 60 : 0,
                          overflow: "hidden",
                          transition: "opacity 0.18s, max-height 0.18s",
                          pointerEvents: (isRowHovered || isO || reactOpen === pipeReactKey || pipelineEditMode === p.id) ? "auto" : "none",
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button onClick={() => sharePipeline(p.id, pipeName, pipeDesc, pipePriority, allPStages)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: copied === `pipe-${p.id}` ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace" }}>{copied === `pipe-${p.id}` ? "✓" : "📋"}</button>
                        <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                          {reactOpen === pipeReactKey
                            ? <>{REACTIONS.map(r => { const us = pipeReactions[r] || []; const mine = us.includes(currentUser!); return (<button key={r} onClick={() => handleReact(pipeReactKey, r)} style={{ background: mine ? pC + "22" : us.length > 0 ? t.surface : "transparent", border: "none", borderRadius: 8, padding: "0 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit", opacity: us.length > 0 ? 1 : 0.4 }}><span style={{ fontSize: us.length > 0 ? 12 : 10 }}>{r}</span>{us.length > 0 && <span style={{ fontSize: 10, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{us.length}</span>}</button>); })}<button onClick={() => setReactOpen(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "0 4px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>done</button></>
                            : <button onClick={() => setReactOpen(pipeReactKey)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "0 8px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>+ react</button>
                          }
                        </div>
                        <button onClick={() => toggleExpand(p.id)} style={{ background: isO ? pC + "15" : "transparent", border: `1px solid ${isO ? pC + "44" : t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: isO ? pC : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{isO ? "▾ collapse" : "▸ details"}</button>
                        {!allPipelineClaimed ? (
                          <button onClick={() => { allPStages.forEach(s => { if (!(claims[s] || []).includes(currentUser!)) handleClaimWithAnim(s); }); }} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: pC, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>{"💀"} claim all</button>
                        ) : (
                          <button onClick={() => { allPStages.forEach(s => { if ((claims[s] || []).includes(currentUser!)) handleClaimWithAnim(s); }); }} style={{ background: t.green + "15", border: `1px solid ${t.green}44`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }} title="Click to unclaim all">{"✓"} all claimed</button>
                        )}
                      </div>
                      {/* claimers stay always visible — they convey ownership state */}
                      {uClaim.length > 0 && (
                        <div style={{ marginTop: 4, display: "flex" }} onClick={e => e.stopPropagation()}>
                          <ClaimerPills claimerIds={uClaim} users={users} getPoints={getPoints} t={t} variant="pill" size={16} maxVisible={2} />
                        </div>
                      )}
                    </div>
                  </div>
                  {isMobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
                      <div style={{ position: "relative" }}>
                        <button onClick={e => { e.stopPropagation(); setPipeMenuOpen(pipeMenuOpen === p.id ? null : p.id); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, padding: "4px 8px", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>⋮</button>
                        {pipeMenuOpen === p.id && (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, zIndex: 50, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "fadeIn 0.15s ease" }}>
                            <button onClick={e => { e.stopPropagation(); setEditingPipeName(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>✎ rename pipeline</button>
                            <button onClick={e => { e.stopPropagation(); setEditingPipeDesc(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>✎ edit description</button>
                            <button onClick={e => { e.stopPropagation(); toggleExpand(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>{isO ? "collapse" : "expand stages"}</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* #7: clean points label, no dot-grid; progress bar above conveys completion */}
                  <div className="bu-pipe-right" style={{ textAlign: "right", flexShrink: 0, marginLeft: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 12, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 800 }}>{p.points}pts</div>
                    {canEditPipeline(p.id) && (
                      <button
                        onClick={e => { e.stopPropagation(); setPipelineEditMode(pipelineEditMode === p.id ? null : p.id); setEditingPipeName(p.id); setEditingPipeDesc(p.id); }}
                        title={pipelineEditMode === p.id ? "Exit edit mode (Esc)" : "Edit pipeline"}
                        style={{ background: pipelineEditMode === p.id ? pC + "22" : "transparent", border: `1px solid ${pipelineEditMode === p.id ? pC + "88" : t.border}`, borderRadius: 8, width: 24, height: 24, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", color: pipelineEditMode === p.id ? pC : t.textMuted, transition: "all 0.15s", opacity: isRowHovered ? 1 : 0.4 }}
                      >&#9998;</button>
                    )}
                  </div>
                </div>
                {/* Stage chip preview removed — expand the row to see stages. */}
              </div>
              {/* Pipeline edit mode panel */}
              {pipelineEditMode === p.id && (
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${pC}33`, background: pC + "05", animation: "fadeIn 0.15s ease" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 8, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>editing pipeline</div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                    <input
                      value={pipeMetaOverrides[p.id]?.name ?? p.name}
                      onChange={e => setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), name: e.target.value } }))}
                      placeholder="Pipeline name"
                      style={{ background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: t.text, fontFamily: "inherit", fontWeight: 700, outline: "none", width: "100%" }}
                    />
                    <textarea
                      value={pipeDescOverrides[p.id] ?? p.desc}
                      onChange={e => setPipeDescOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="Pipeline description..."
                      rows={2}
                      style={{ background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none" as const, lineHeight: 1.5, width: "100%" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>priority:</span>
                      {(["NOW", "HIGH", "MEDIUM", "LOW"] as const).map(pri => (
                        <button
                          key={pri}
                          onClick={() => cyclePriority(p.id, pipeMetaOverrides[p.id]?.priority ?? p.priority)}
                          style={{ background: (pipeMetaOverrides[p.id]?.priority ?? p.priority) === pri ? (pr[pri]?.c || t.accent) + "22" : "transparent", border: `1px solid ${(pipeMetaOverrides[p.id]?.priority ?? p.priority) === pri ? (pr[pri]?.c || t.accent) + "88" : t.border}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: (pipeMetaOverrides[p.id]?.priority ?? p.priority) === pri ? pr[pri]?.c || t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}
                        >{pri}</button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const allPStagesForConfirm = [...p.stages, ...(customStages[p.id] || [])];
                        const unclaimed = allPStagesForConfirm.filter(s => (claims[s] || []).length === 0).length;
                        setConfirmModal({
                          open: true,
                          pipelineId: p.id,
                          title: `archive "${pipeMetaOverrides[p.id]?.name ?? p.name}"?`,
                          body: `this pipeline has ${allPStagesForConfirm.length} stage${allPStagesForConfirm.length !== 1 ? "s" : ""}${unclaimed > 0 ? `, ${unclaimed} unclaimed` : ""}. archive anyway?`,
                        });
                      }}
                      style={{ background: "transparent", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 10, color: t.amber, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", alignSelf: "flex-start" as const }}
                    >📦 archive pipeline</button>
                  </div>
                </div>
              )}

              {isO && (
                <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>
                  <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
                    {allPStages.map((s, i) => <div key={`${p.id}-${s}`} id={`stage-${s}`}><Stage name={s} idx={i} tot={allPStages.length} pC={pC} pId={p.id} t={t} expS={expS} setExpS={setExpS} isMobile={isMobile} isTopClaim={s === topClaimStageName} /></div>)}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, paddingLeft: 24 }} onClick={e => e.stopPropagation()}>
                    <input value={newStageInput[p.id] || ""} onChange={e => setNewStageInput(prev => ({ ...prev, [p.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addCustomStageLocal(p.id); }} placeholder="+ add stage..." style={{ flex: 1, background: "transparent", border: `1px dashed ${pC}33`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }} />
                    <button onClick={() => addCustomStageLocal(p.id)} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: pC, fontWeight: 700, fontFamily: "inherit" }}>add</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add pipeline */}
        {!addingPipeline ? (
          <button onClick={() => setAddingPipeline(true)} style={{ background: "transparent", border: `2px dashed ${t.border}`, borderRadius: 16, padding: "16px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center", width: "100%" }}>+ new pipeline</button>
        ) : (
          <div style={{ background: t.bgCard, border: `1px solid ${t.accent}33`, borderRadius: 16, padding: "20px" }}>
            <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "var(--font-dm-mono), monospace" }}>new pipeline</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
              {ICON_OPTIONS.map(ico => (<button key={ico} onClick={() => setNewPipeForm(p => ({ ...p, icon: ico }))} style={{ background: newPipeForm.icon === ico ? t.accent + "22" : "transparent", border: `1px solid ${newPipeForm.icon === ico ? t.accent + "66" : t.border}`, borderRadius: 8, padding: "4px 4px", cursor: "pointer", fontSize: 16 }}>{ico}</button>))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <input value={newPipeForm.name} onChange={e => setNewPipeForm(p => ({ ...p, name: e.target.value }))} placeholder="Pipeline name *" autoFocus style={{ flex: "1 1 200px", background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none", fontWeight: 700 }} />
              <input value={newPipeForm.desc} onChange={e => setNewPipeForm(p => ({ ...p, desc: e.target.value }))} placeholder="Short description" style={{ flex: "2 1 280px", background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>PRIORITY:</span>
              {PRIORITY_CYCLE.map(p => <button key={p} onClick={() => setNewPipeForm(prev => ({ ...prev, priority: p }))} style={{ background: newPipeForm.priority === p ? (pr[p]?.c || t.accent) + "22" : "transparent", border: `1px solid ${newPipeForm.priority === p ? (pr[p]?.c || t.accent) + "55" : t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: newPipeForm.priority === p ? pr[p]?.c || t.accent : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{p}</button>)}
              <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginLeft: 8 }}>COLOR:</span>
              {COLOR_OPTIONS.map(c => <div key={c} onClick={() => setNewPipeForm(p => ({ ...p, colorKey: c }))} style={{ width: 14, height: 14, borderRadius: "50%", background: ck[c], cursor: "pointer", border: newPipeForm.colorKey === c ? `2px solid ${t.text}` : "2px solid transparent", flexShrink: 0 }} />)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addCustomPipelineLocal} disabled={!newPipeForm.name.trim()} style={{ background: t.accent, border: "none", borderRadius: 12, padding: "8px 20px", cursor: newPipeForm.name.trim() ? "pointer" : "not-allowed", fontSize: 13, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", opacity: newPipeForm.name.trim() ? 1 : 0.45, transition: "opacity 0.15s" }}>create pipeline</button>
              <button onClick={() => setAddingPipeline(false)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>cancel</button>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
