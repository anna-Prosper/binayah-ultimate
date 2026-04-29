"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { T } from "@/lib/themes";
import { REACTIONS, stageDefaults, type SubtaskItem, type UserType, type CommentItem } from "@/lib/data";
import { deriveStageDisplayPoints } from "@/lib/points";
import { AvatarC } from "@/components/ui/Avatar";
import ClaimChip from "@/components/ui/ClaimChip";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import { useModel, useRole, INBOX_PIPELINE_ID } from "@/lib/contexts/ModelContext";
import { SubtaskKey } from "@/lib/subtaskKey";
import { useIsMobile } from "@/hooks/useIsMobile";
import TodayView from "@/components/TodayView";

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  allPipelines: Pipeline[];
  customStages: Record<string, string[]>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  getStatus: (name: string) => string;
  users: UserType[];
  currentUser: string | null;
  ck: Record<string, string>;
  isAdmin: boolean;
  // Optional cross-workspace mode props
  showMyAllFilter?: boolean;
  defaultMyAllFilter?: "my" | "all";
  pipelineWorkspaceMap?: Record<string, { id: string; name: string; icon: string }>;
  headerLabel?: string;
  // Optional editing props
  editMode?: boolean;
  onPipelineClick?: (pipelineId: string) => void;
  hideConcept?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

// Columns in the now-tab kanban — these map 1:1 to stage statuses
const ALL_COLS = [
  { status: "concept",     label: "concept",     colorKey: "slate" },
  { status: "planned",     label: "planned",     colorKey: "cyan"  },
  { status: "in-progress", label: "in progress", colorKey: "amber" },
  { status: "active",      label: "done",        colorKey: "green" },
  { status: "blocked",     label: "blocked",     colorKey: "red"   },
];

export default function TasksView(props: Props) {
  const { t, allPipelines, customStages, pipeMetaOverrides, getStatus, users, currentUser, ck, isAdmin, showMyAllFilter, defaultMyAllFilter, pipelineWorkspaceMap, headerLabel, editMode, onPipelineClick, hideConcept } = props;
  const {
    claims, reactions, comments, subtasks, assignments, approvedStages,
    handleClaim, handleReact, toggleSubtask, renameSubtask,
    setStageStatusDirect: setStageStatus, approveStage, assignTask,
    stageNameOverrides, setStageNameOverride, subtaskStages, setSubtaskStage,
    archivedStages, archivedSubtasks, stagePointsOverride,
    addComment: modelAddComment,
    migrateSubtask,
    addUnparentedStage, moveStageToPipeline,
  } = useModel();
  const { copied, setCopied } = useEphemeral();

  // Comment input is local UI state — no need to lift to context or parent
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  // Reconstruct shareStage locally (writes to clipboard + sets copied ephemeral)
  const shareStage = useCallback((name: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  }, [setCopied]);

  // Wrap addComment to use local commentInput state
  const addComment = useCallback((sid: string) => {
    const val = commentInput[sid]?.trim();
    if (!val) return;
    modelAddComment(sid, val, () => setCommentInput(prev => ({ ...prev, [sid]: "" })));
  }, [commentInput, modelAddComment]);

  const isMobile = useIsMobile(640);

  const COLS = hideConcept ? ALL_COLS.filter(c => c.status !== "concept") : ALL_COLS;

  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dragOver, setDragOver] = useState<string | null>(null);
  // Track active subtask drag for stage-card migration targets
  const [draggingSubtaskKey, setDraggingSubtaskKey] = useState<string | null>(null);
  const [stageDropOver, setStageDropOver] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [myAllFilter, setMyAllFilter] = useState<"my" | "all">(defaultMyAllFilter || "all");
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null); // which column has its inline input open
  const [newTaskColInput, setNewTaskColInput] = useState("");
  const [newTaskColBusy, setNewTaskColBusy] = useState(false);

  const submitNewColumnTask = useCallback(async (status: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setNewTaskColBusy(true);
    const stageName = await addUnparentedStage(trimmed);
    if (stageName) setStageStatus(stageName, status);
    setNewTaskCol(null);
    setNewTaskColInput("");
    setNewTaskColBusy(false);
  }, [addUnparentedStage, setStageStatus]);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");

  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
  }));

  // Virtual "inbox" pipeline — only rendered if it has unparented stages.
  // Lets user-created tasks live without a real pipeline until they're assigned one.
  const inboxStages = customStages[INBOX_PIPELINE_ID] || [];
  if (inboxStages.length > 0) {
    pipelines.unshift({
      id: INBOX_PIPELINE_ID,
      name: "Inbox",
      icon: "📥",
      colorKey: "amber",
      stages: [],
      displayName: "Inbox",
      allStages: inboxStages,
      color: t.amber,
    });
  }

  const archivedSubtaskKeySet = useMemo(() => new Set(archivedSubtasks || []), [archivedSubtasks]);

  // Every non-concept stage becomes a task
  const allStageTasks = pipelines.flatMap(p => {
    const ws = pipelineWorkspaceMap?.[p.id];
    return p.allStages
      .filter(s => !(archivedStages || []).includes(s) && !(hideConcept && getStatus(s) === 'concept'))
      .map(s => ({
        stageId: s,
        displayName: stageNameOverrides?.[s] || s,
        pipelineName: p.displayName,
        pipelineIcon: p.icon,
        pipelineColor: p.color,
        pipelineId: p.id,
        status: getStatus(s),
        claimers: claims[s] || [],
        workspaceIcon: ws?.icon,
        workspaceName: ws?.name,
        workspaceId: ws?.id,
        points: deriveStageDisplayPoints(
          s,
          subtasks[s],
          archivedSubtaskKeySet,
          stageDefaults[s]?.points ?? 5,
          stagePointsOverride || {},
        ),
      }));
  });

  // Apply my/all filter when in cross-workspace mode
  const stageTasks = (showMyAllFilter && myAllFilter === "my")
    ? allStageTasks.filter(s => currentUser ? (s.claimers.includes(currentUser) || (assignments[s.stageId] || []).includes(currentUser)) : false)
    : allStageTasks;

  // Build virtual subtask kanban tasks — ONLY from stages visible in current pipelines
  const visibleStageIds = useMemo(() => new Set(pipelines.flatMap(p => p.allStages)), [pipelines]);

  const subtaskKanbanTasks = useMemo(() => {
    const tasks: SubtaskKanbanTask[] = [];
    for (const [parentStageId, subtaskList] of Object.entries(subtasks || {})) {
      // Only include subtasks whose parent stage is in a visible pipeline
      if (!visibleStageIds.has(parentStageId)) continue;
      for (const sub of subtaskList) {
        const key = SubtaskKey.make(parentStageId, sub.id);
        if (archivedSubtaskKeySet.has(key)) continue;
        let parentStageName = stageNameOverrides?.[parentStageId] || parentStageId;
        let pipelineId = "";
        let pipelineIcon = "";
        let pipelineName = "";
        let pipelineColor = "";
        for (const p of pipelines) {
          if (p.allStages.includes(parentStageId)) {
            pipelineId = p.id;
            pipelineIcon = p.icon;
            pipelineName = p.displayName;
            pipelineColor = p.color;
            break;
          }
        }
        const wsInfo = pipelineWorkspaceMap?.[pipelineId];
        const status = subtaskStages?.[key] || "planned";
        tasks.push({
          key,
          text: sub.text,
          parentStageId,
          parentStageName,
          pipelineId,
          pipelineIcon,
          pipelineName,
          pipelineColor,
          workspaceName: wsInfo?.name,
          workspaceIcon: wsInfo?.icon,
          status,
          done: sub.done,
          by: sub.by,
          points: sub.points ?? 5,
        });
      }
    }
    return tasks;
  }, [subtasks, subtaskStages, stageNameOverrides, pipelines, visibleStageIds, archivedSubtaskKeySet, pipelineWorkspaceMap]);

  const statusColor = (status: string) => {
    const col = COLS.find(c => c.status === status);
    return col ? (ck[col.colorKey] || t.accent) : t.textDim;
  };

  const isMine = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  const handleDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const stageId = e.dataTransfer.getData("stageId");
    const subtaskKey = e.dataTransfer.getData("subtaskKey");
    if (stageId && getStatus(stageId) !== targetStatus) {
      setStageStatus(stageId, targetStatus);
    } else if (subtaskKey && setSubtaskStage) {
      // setSubtaskStage couples sub.done with status === "active" automatically
      setSubtaskStage(subtaskKey, targetStatus);
    }
  };

  const flatBtn = (active: boolean): React.CSSProperties => ({
    background: active ? t.accent + "18" : "transparent",
    border: "none",
    borderRadius: 8,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    color: active ? t.accent : t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
    display: "flex",
    alignItems: "center",
    gap: 4,
  });

  const pendingCount = stageTasks.filter(s => s.status === "active" && !approvedStages.includes(s.stageId)).length;

  // Stage-card drop target handlers for subtask migration
  const handleStageDragOver = useCallback((stageId: string, e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("subtaskkey")) return;
    e.preventDefault();
    setStageDropOver(stageId);
  }, []);
  const handleStageDragLeave = useCallback((stageId: string) => {
    setStageDropOver(prev => prev === stageId ? null : prev);
  }, []);
  const handleStageDrop = useCallback((stageId: string, e: React.DragEvent) => {
    e.preventDefault();
    setStageDropOver(null);
    const key = e.dataTransfer.getData("subtaskKey");
    if (!key || !SubtaskKey.isValid(key)) return;
    migrateSubtask(key as Parameters<typeof migrateSubtask>[0], stageId);
  }, [migrateSubtask]);

  const cardShared = {
    t, users, currentUser, reactions, comments,
    reactOpen, setReactOpen, commentOpen, setCommentOpen,
    assignOpen, setAssignOpen, assignments, assignTask,
    handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
    isAdmin, approveStage, approvedStages, toggleSubtask, subtasks,
    editingStage, setEditingStage: setEditingStage, editingVal, setEditingVal,
    setStageNameOverride,
    editMode, onPipelineClick,
    handleClaim, claims,
    // Stage migration drop target props
    draggingSubtaskKey, stageDropOver,
    onStageDragOver: handleStageDragOver,
    onStageDragLeave: handleStageDragLeave,
    onStageDrop: handleStageDrop,
    availablePipelines: pipelines
      .filter(p => p.id !== INBOX_PIPELINE_ID)
      .map(p => ({ id: p.id, name: p.displayName, icon: p.icon })),
  };

  // Mobile today view: filter to claimed/assigned, sort by status priority
  const STATUS_PRIORITY: Record<string, number> = {
    "in-progress": 0, "planned": 1, "active": 2, "concept": 3, "blocked": 4,
  };

  if (isMobile) {
    const todayStages = allStageTasks
      .filter(s => {
        if (!currentUser) return false;
        return (claims[s.stageId] || []).includes(currentUser) || (assignments[s.stageId] || []).includes(currentUser);
      })
      .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99));

    return (
      <div style={{ padding: "12px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 12 }}>
          // your tasks today
        </div>
        <TodayView
          t={t}
          stages={todayStages.map(s => ({
            stageId: s.stageId,
            displayName: s.displayName,
            status: s.status,
            pipelineName: s.pipelineName,
            pipelineColor: s.pipelineColor,
          }))}
          currentUser={currentUser || ""}
          users={users}
          ck={ck}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>
            {stageTasks.length} tasks
          </span>
          {pendingCount > 0 && isAdmin && (
            <span style={{ fontSize: 10, color: t.amber, background: t.amber + "22", border: `1px solid ${t.amber}44`, borderRadius: 8, padding: "2px 8px", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>
              {pendingCount} awaiting approval
            </span>
          )}
        </div>
        {/* Flat inline controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {showMyAllFilter && (
            <>
              <button style={flatBtn(myAllFilter === "my")} onClick={() => setMyAllFilter("my")}>🐱 mine</button>
              <button style={flatBtn(myAllFilter === "all")} onClick={() => setMyAllFilter("all")}>🌍 all</button>
              <div style={{ width: 1, height: 16, background: t.border, margin: "0 4px" }} />
            </>
          )}
          <button style={flatBtn(view === "kanban")} onClick={() => setView("kanban")}>⊞ kanban</button>
          <button style={flatBtn(view === "list")} onClick={() => setView("list")}>≡ list</button>
        </div>
      </div>

      {stageTasks.length === 0 ? (
        <div style={{ padding: "64px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// empty waters</div>
        </div>
      ) : view === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {COLS.map(col => {
            const colTasks = stageTasks.filter(s => s.status === col.status);
            if (colTasks.length === 0) return null;
            const stColor = statusColor(col.status);
            return (
              <section key={col.status}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: stColor, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                  <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({colTasks.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {colTasks.map(task => <TaskWithSubtasks key={task.stageId} task={task} isMine={isMine(task.stageId)} onClaim={() => handleClaim(task.stageId)} {...cardShared} />)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto", paddingBottom: 16 }}>
          {COLS.map(col => {
            const colTasks = stageTasks.filter(s => s.status === col.status);
            const colSubtasks = subtaskKanbanTasks.filter(s => s.status === col.status);
            const totalCount = colTasks.length + colSubtasks.length;
            if (totalCount === 0 && col.status === "blocked") return null;
            const stColor = statusColor(col.status);
            const isOver = dragOver === col.status;
            return (
              <div
                key={col.status}
                style={{ flex: "1 1 280px", minWidth: 260, background: isOver ? t.accent + "0a" : "transparent", borderRadius: 16, transition: "all 0.15s", padding: 0, opacity: draggingSubtaskKey ? 0.55 : 1 }}
                onDragOver={e => {
                  // Only handle column drag if NOT a subtask being migrated to a stage
                  if (e.dataTransfer.types.includes("subtaskkey")) return;
                  e.preventDefault(); setDragOver(col.status);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => {
                  if (e.dataTransfer.types.includes("subtaskkey")) return;
                  handleDrop(col.status, e);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, padding: "4px 4px", borderBottom: `1px solid ${stColor}33` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: stColor, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                  <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({totalCount})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {totalCount === 0
                    ? <div style={{ border: `1.5px dashed ${isOver ? t.accent + "88" : t.border}`, borderRadius: 12, padding: "24px 12px", textAlign: "center", fontSize: 10, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>// drop to move</div>
                    : <>
                        {colTasks.map(task => <TaskWithSubtasks key={task.stageId} task={task} isMine={isMine(task.stageId)} onClaim={() => handleClaim(task.stageId)} draggable subtaskStages={subtaskStages} {...cardShared} />)}
                        {colSubtasks.map(sub => <SubtaskKanbanCard key={sub.key} sub={sub} isMine={currentUser ? (assignments[sub.key] || []).includes(currentUser) : false} onDone={() => { const p = SubtaskKey.parse(sub.key as Parameters<typeof SubtaskKey.parse>[0]); if (p) toggleSubtask(sub.parentStageId, p.subtaskId); }} onRename={(taskId, text) => renameSubtask?.(sub.parentStageId, taskId, text)} onDragSubtaskStart={() => setDraggingSubtaskKey(sub.key)} onDragSubtaskEnd={() => { setDraggingSubtaskKey(null); setStageDropOver(null); }} {...cardShared} />)}
                      </>
                  }
                  {newTaskCol === col.status ? (
                    <div style={{ border: `1.5px dashed ${t.accent}88`, borderRadius: 12, padding: 8, background: t.accent + "08", display: "flex", flexDirection: "column", gap: 4 }}>
                      <input
                        autoFocus
                        value={newTaskColInput}
                        disabled={newTaskColBusy}
                        onChange={e => setNewTaskColInput(e.target.value)}
                        placeholder="task title…"
                        onKeyDown={e => {
                          if (e.key === "Escape") { setNewTaskCol(null); setNewTaskColInput(""); }
                          if (e.key === "Enter") submitNewColumnTask(col.status, newTaskColInput);
                        }}
                        onBlur={() => { if (!newTaskColBusy && !newTaskColInput.trim()) { setNewTaskCol(null); setNewTaskColInput(""); } }}
                        style={{ background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "6px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none", width: "100%" }}
                      />
                      <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>↵ to add · esc to cancel</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setNewTaskCol(col.status); setNewTaskColInput(""); }}
                      style={{ border: `1.5px dashed ${t.border}`, background: "transparent", borderRadius: 12, padding: "10px 12px", textAlign: "center", fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent + "88"; e.currentTarget.style.color = t.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
                      title="Add a task in this column — assign a parent pipeline later"
                    >+ new task</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Task + nested subtasks ───────────────────────────────────────────────────

interface StageTask {
  stageId: string; displayName: string; pipelineName: string; pipelineIcon: string; pipelineColor: string;
  pipelineId: string;
  status: string; claimers: string[];
  workspaceIcon?: string; workspaceName?: string; workspaceId?: string;
  points: number;
}

interface SubtaskKanbanTask {
  key: string;
  text: string;
  parentStageId: string;
  parentStageName: string;
  pipelineId: string;
  pipelineIcon: string;
  pipelineName: string;
  pipelineColor: string;
  workspaceName?: string;
  workspaceIcon?: string;
  status: string;
  done: boolean;
  by: string;
  points: number;
}

interface SharedCardProps {
  t: T;
  users: UserType[];
  editMode?: boolean;
  onPipelineClick?: (pipelineId: string) => void;
  currentUser: string | null;
  reactions: Record<string, Record<string, string[]>>;
  comments: Record<string, CommentItem[]>;
  reactOpen: string | null;
  setReactOpen: (v: string | null) => void;
  commentOpen: string | null;
  setCommentOpen: (v: string | null) => void;
  handleReact: (sid: string, emoji: string) => void;
  shareStage: (name: string, text: string) => void;
  addComment: (sid: string) => void;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  copied: string | null;
  isAdmin: boolean;
  approveStage: (name: string) => void;
  approvedStages: string[];
  toggleSubtask: (sid: string, taskId: number) => void;
  subtasks: Record<string, SubtaskItem[]>;
  assignOpen: string | null;
  setAssignOpen: (v: string | null) => void;
  assignments: Record<string, string[]>;
  assignTask: (sid: string, userId: string | null) => void;
  // Stage migration drop target props
  draggingSubtaskKey?: string | null;
  stageDropOver?: string | null;
  onStageDragOver?: (stageId: string, e: React.DragEvent) => void;
  onStageDragLeave?: (stageId: string) => void;
  onStageDrop?: (stageId: string, e: React.DragEvent) => void;
  // For orphan task pipeline picker — shown only when task is in inbox
  availablePipelines?: { id: string; name: string; icon: string }[];
}

function TaskWithSubtasks({ task, isMine, onClaim, draggable: isDraggable, ...shared }: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps & { subtaskStages?: Record<string, string> }) {
  const { subtasks, toggleSubtask, subtaskStages } = shared as SharedCardProps & { subtaskStages?: Record<string, string> };
  const taskSubs = (subtasks[task.stageId] || []).filter(s => !s.done && !subtaskStages?.[SubtaskKey.make(task.stageId, s.id)]);
  // Don't show subtasks under "done" stages — completion is implied
  const showSubs = task.status !== "active";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <TaskCard task={task} isMine={isMine} onClaim={onClaim} draggable={isDraggable} draggingSubtaskKey={shared.draggingSubtaskKey} stageDropOver={shared.stageDropOver} onStageDragOver={shared.onStageDragOver} onStageDragLeave={shared.onStageDragLeave} onStageDrop={shared.onStageDrop} {...shared} />
      {showSubs && taskSubs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 16, borderLeft: `2px solid ${task.pipelineColor}33`, marginLeft: 4 }}>
          {taskSubs.map(sub => (
            <SubtaskCard
              key={sub.id}
              taskSub={sub}
              stageId={task.stageId}
              parentStageName={task.stageId}
              pipelineColor={task.pipelineColor}
              pipelineIcon={task.pipelineIcon}
              pipelineName={task.pipelineName}
              onToggle={() => toggleSubtask(task.stageId, sub.id)}
              {...shared}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main task card ───────────────────────────────────────────────────────────

function TaskCard({
  task, isMine, onClaim, draggable: isDraggable,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
  isAdmin, approveStage, approvedStages, subtasks,
  editingStage, setEditingStage, editingVal, setEditingVal, setStageNameOverride, editMode, onPipelineClick,
  draggingSubtaskKey, stageDropOver, onStageDragOver, onStageDragLeave, onStageDrop,
  availablePipelines,
}: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps & { editingStage?: string | null; setEditingStage?: (v: string | null) => void; editingVal?: string; setEditingVal?: (v: string) => void; setStageNameOverride?: (name: string, val: string) => void }) {
  const { stageDescOverrides, setStageDescOverride, archiveStage, pipeMetaOverrides, cyclePriority, moveStageToPipeline } = useModel();
  const role = useRole(task.workspaceId);
  const canArchive = role === "captain" || role === "firstMate";
  const [editOpen, setEditOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDone = task.status === "active";
  const isApproved = approvedStages.includes(task.stageId);
  const isPending = isDone && !isApproved;
  const rxs = reactions[task.stageId] || {};
  const cmts = comments[task.stageId] || [];
  const showReactPicker = reactOpen === task.stageId;
  const showCommentPopover = commentOpen === task.stageId;
  const showAssignPicker = assignOpen === task.stageId;

  // Only register the click-outside handler when *this* card has a popover open.
  // Otherwise every card on screen would call setCommentOpen(null) on every click in
  // any other card — instantly closing the popover the user just opened.
  const isAnyOpen = showReactPicker || showCommentPopover || showAssignPicker || editOpen;
  useEffect(() => {
    if (!isAnyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setReactOpen(null);
        setCommentOpen(null);
        setAssignOpen(null);
        setEditOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAnyOpen, setReactOpen, setCommentOpen, setAssignOpen]);
  const assigneeIds = assignments[task.stageId] || [];
  const assignees = assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as UserType[];
  const assignee = assignees[0] || null; // primary, kept for backwards-compat in render
  const subCount = (subtasks[task.stageId] || []).length;
  const subDone = (subtasks[task.stageId] || []).filter(s => s.done).length;
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);

  const isStageDropTarget = !!draggingSubtaskKey;
  const isDropHover = stageDropOver === task.stageId;

  return (
    <div
      ref={cardRef}
      data-testid="task-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDragOver={isStageDropTarget ? (e) => onStageDragOver?.(task.stageId, e) : undefined}
      onDragLeave={isStageDropTarget ? () => onStageDragLeave?.(task.stageId) : undefined}
      onDrop={isStageDropTarget ? (e) => onStageDrop?.(task.stageId, e) : undefined}
    >
      <CardShell
        t={t}
        borderColor={isDropHover ? t.accent : (isPending ? t.amber + "55" : t.border)}
        borderStyle={isDropHover ? "dashed" : "solid"}
        pipelineColor={task.pipelineColor}
        draggable={isDraggable}
        onDragStart={isDraggable ? e => { e.dataTransfer.setData("stageId", task.stageId); e.dataTransfer.effectAllowed = "move"; } : undefined}
      >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingStage === task.stageId ? (
            <input
              autoFocus
              value={editingVal}
              onChange={e => setEditingVal?.(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (editingVal) setStageNameOverride?.(task.stageId, editingVal);
                  setEditingStage?.(null);
                } else if (e.key === "Escape") {
                  setEditingStage?.(null);
                  setEditOpen(false);
                }
              }}
              onBlur={() => {
                // Save name on blur but don't close edit mode — user may be clicking
                // another field within the card
                if (editingVal && editingVal !== (task.displayName || task.stageId)) {
                  setStageNameOverride?.(task.stageId, editingVal);
                }
                setEditingStage?.(null);
              }}
              style={{ fontSize: 15, fontWeight: 700, color: t.text, border: `2px solid ${t.accent}`, borderRadius: 6, padding: "2px 4px", width: "100%", fontFamily: "inherit" }}
            />
          ) : (
            <div
              title={editOpen ? "Click to rename" : task.stageId}
              onClick={editOpen ? () => { setEditingStage?.(task.stageId); setEditingVal?.(task.displayName || task.stageId); } : undefined}
              style={{ fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3, border: editOpen ? `2px dashed ${t.accent}55` : "none", borderRadius: editOpen ? 6 : 0, padding: editOpen ? "2px 6px" : 0, cursor: editOpen ? "text" : "default", background: editOpen ? t.accent + "08" : "transparent", transition: "all 0.15s" }}
            >{task.displayName}</div>
          )}
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, lineHeight: 1.3, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {task.workspaceIcon && task.workspaceName && <span>{task.workspaceIcon} {task.workspaceName} · </span>}
            <span
              onClick={onPipelineClick ? e => { e.stopPropagation(); onPipelineClick(task.pipelineId); } : undefined}
              style={{ cursor: onPipelineClick ? "pointer" : "default", color: onPipelineClick ? t.accent : t.textDim, display: "flex", alignItems: "center", gap: 3 }}
              title={onPipelineClick ? `Go to ${task.pipelineName}` : task.pipelineName}
            >
              {task.pipelineIcon} {task.pipelineName}
            </span>
            {subCount > 0 && <span style={{ color: subDone === subCount ? t.green : t.textDim }}>· {subDone}/{subCount}</span>}
            <span style={{ color: t.accent, fontWeight: 700 }} title="points (sum of subtasks, or override)">· {task.points}pts</span>
            {assignee && <span style={{ color: assignee.color, fontWeight: 700 }}>→ {assignee.name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ""}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {task.claimers.length > 0 && (
            <div style={{ display: "flex", gap: -4 }}>
              {task.claimers.slice(0, 3).map(id => {
                const u = users.find(u => u.id === id);
                return u ? <AvatarC key={id} user={u} size={20} /> : null;
              })}
            </div>
          )}
          {/* assign is in ActionRow — no duplicate here */}
          {isPending && isAdmin && (
            <button onClick={e => { e.stopPropagation(); approveStage(task.stageId); }} style={btn(t.green, t.green + "22", t.green + "88")} title="Captain approval — awards points to claimers">
              ✓ approve
            </button>
          )}
          {isPending && !isAdmin && <span style={badge(t.amber)}>⏳ pending</span>}
          {isDone && isApproved && <span style={badge(t.green)}>✓ approved</span>}
          {currentUser && !(isPending && isAdmin) && !isApproved && (
            <ClaimChip claimed={isMine} pipelineColor={task.pipelineColor} t={t} onClaim={() => onClaim()} />
          )}
        </div>
      </div>

      {/* Read-mode description — visible whenever a description exists, even outside edit mode */}
      {!editOpen && stageDescOverrides[task.stageId] && (
        <div style={{ fontSize: 12, color: t.textSec || t.textMuted, lineHeight: 1.5, padding: "2px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }}>
          {stageDescOverrides[task.stageId]}
        </div>
      )}

      {/* Edit-mode extra fields: description + priority + archive */}
      {editOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }} onClick={e => e.stopPropagation()}>
          <textarea
            value={stageDescOverrides[task.stageId] || ""}
            onChange={e => setStageDescOverride(task.stageId, e.target.value)}
            placeholder="Stage description..."
            rows={2}
            style={{ width: "100%", background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "4px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.5 }}
          />
          {(() => {
            // Priority cycler — show if the pipeline has a priority set via pipeMetaOverrides
            const pipePriority = pipeMetaOverrides[task.pipelineId]?.priority;
            if (!pipePriority) return null;
            const PRIORITY_CYCLE_VALS = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>priority:</span>
                <button
                  onClick={() => cyclePriority(task.pipelineId, pipePriority)}
                  style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}
                  title={`Cycle priority (${PRIORITY_CYCLE_VALS.join(" → ")})`}
                >
                  {pipePriority} ↻
                </button>
              </div>
            );
          })()}
          {task.pipelineId === INBOX_PIPELINE_ID && availablePipelines && availablePipelines.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>move to:</span>
              <select
                value=""
                onChange={e => {
                  const targetPid = e.target.value;
                  if (!targetPid) return;
                  moveStageToPipeline(task.stageId, INBOX_PIPELINE_ID, targetPid);
                  setEditOpen(false);
                }}
                style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}55`, borderRadius: 6, padding: "3px 6px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none", cursor: "pointer" }}
              >
                <option value="">choose pipeline…</option>
                {availablePipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
          )}
          {archiveStage && canArchive && (
            <button
              onClick={e => { e.stopPropagation(); archiveStage(task.stageId); setEditOpen(false); setEditingStage?.(null); }}
              style={{ background: "transparent", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 10, color: t.amber, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", alignSelf: "flex-start" as const }}
            >
              📦 archive stage
            </button>
          )}
        </div>
      )}

      {visibleReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visibleReactions.map(([emoji, us]) => {
            const mine = currentUser ? us.includes(currentUser) : false;
            return (
              <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(task.stageId, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 12, padding: "0 8px", cursor: "pointer", fontSize: 13, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{us.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <ActionRow
        t={t}
        showReactPicker={showReactPicker}
        showCommentPopover={showCommentPopover}
        showAssignPicker={showAssignPicker}
        commentCount={cmts.length}
        assignee={assignee} assignees={assignees}
        users={users}
        onReactToggle={() => { setReactOpen(showReactPicker ? null : task.stageId); setCommentOpen(null); setAssignOpen(null); setEditOpen(false); }}
        onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : task.stageId); setReactOpen(null); setAssignOpen(null); setEditOpen(false); }}
        onAssignToggle={() => { setAssignOpen(showAssignPicker ? null : task.stageId); setReactOpen(null); setCommentOpen(null); setEditOpen(false); }}
        onAssign={userId => { assignTask(task.stageId, userId); setAssignOpen(null); }}
        onEmoji={emoji => { handleReact(task.stageId, emoji); setReactOpen(null); }}
        onCopy={() => shareStage(task.stageId, `${task.stageId} — ${task.pipelineIcon} ${task.pipelineName}`)}
        copied={copied === task.stageId}
        onEditToggle={() => {
          const next = !editOpen;
          setEditOpen(next);
          setReactOpen(null); setCommentOpen(null); setAssignOpen(null);
          if (next) {
            setEditingStage?.(task.stageId);
            setEditingVal?.(task.displayName || task.stageId);
          } else {
            setEditingStage?.(null);
          }
        }}
        showEditButton={isHovered || editOpen || editingStage === task.stageId}
        showEditInput={editOpen || editingStage === task.stageId}
      />

      {showCommentPopover && (
        <CommentPopover
          t={t}
          users={users}
          comments={cmts}
          inputValue={commentInput[task.stageId] || ""}
          onInputChange={v => setCommentInput(prev => ({ ...prev, [task.stageId]: v }))}
          onSend={() => addComment(task.stageId)}
        />
      )}

    </CardShell>
    </div>
  );
}

// ─── Subtask card (smaller, no description/preview) ──────────────────────────

function SubtaskCard({
  taskSub, stageId, parentStageName, pipelineColor, pipelineIcon, pipelineName, onToggle,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
  handleClaim, claims,
}: {
  taskSub: SubtaskItem; stageId: string; parentStageName: string;
  pipelineColor: string; pipelineIcon: string; pipelineName: string;
  onToggle: () => void;
} & SharedCardProps & { handleClaim?: (sid: string) => void; claims?: Record<string, string[]> }) {
  const [isHovered, setIsHovered] = useState(false);
  const subtaskRef = useRef<HTMLDivElement>(null);

  const key = SubtaskKey.make(stageId, taskSub.id);
  const rxs = reactions[key] || {};
  const cmts = comments[key] || [];
  const showReactPicker = reactOpen === key;
  const showCommentPopover = commentOpen === key;
  const showAssignPicker = assignOpen === key;

  // Only run the click-outside handler when *this* card has a popover open —
  // otherwise sibling cards' handlers fire on every click and close the popover.
  const isAnyOpen = showReactPicker || showCommentPopover || showAssignPicker;
  useEffect(() => {
    if (!isAnyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (subtaskRef.current && !subtaskRef.current.contains(e.target as Node)) {
        setReactOpen(null);
        setCommentOpen(null);
        setAssignOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAnyOpen, setReactOpen, setCommentOpen, setAssignOpen]);
  const assigneeIds = assignments[key] || [];
  const assignees = assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as UserType[];
  const assignee = assignees[0] || null;
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);
  const creator = users.find(u => u.id === taskSub.by);
  const isClaimed = (claims?.[key] || []).includes(currentUser || "");
  const claimers = claims?.[key] || [];

  return (
    <div ref={subtaskRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell t={t} borderColor={t.border} pipelineColor={pipelineColor}>
      {/* Top row — identical structure to TaskCard */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
            <span style={{ color: pipelineColor, marginRight: 4 }}>⤷</span>{taskSub.text}
          </div>
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pipelineIcon} {parentStageName}
            {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ""}</span>}
          </div>
        </div>
        {/* Right side: claimer avatars + claim button — same as TaskCard */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {claimers.length > 0 && (
            <div style={{ display: "flex" }}>
              {claimers.slice(0, 3).map(id => { const u = users.find(u => u.id === id); return u ? <AvatarC key={id} user={u} size={20} /> : null; })}
            </div>
          )}
          {currentUser && handleClaim && (
            <ClaimChip claimed={isClaimed} pipelineColor={pipelineColor} t={t} onClaim={() => handleClaim(key)} variant="subtask" />
          )}

        </div>
      </div>

      {visibleReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visibleReactions.map(([emoji, us]) => {
            const mine = currentUser ? us.includes(currentUser) : false;
            return (
              <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(key, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 12, padding: "0 8px", cursor: "pointer", fontSize: 13, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{us.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <ActionRow
        t={t}
        showReactPicker={showReactPicker}
        showCommentPopover={showCommentPopover}
        showAssignPicker={showAssignPicker}
        commentCount={cmts.length}
        assignee={assignee} assignees={assignees}
        users={users}
        onReactToggle={() => { setReactOpen(showReactPicker ? null : key); setCommentOpen(null); setAssignOpen(null); }}
        onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : key); setReactOpen(null); setAssignOpen(null); }}
        onAssignToggle={() => { setAssignOpen(showAssignPicker ? null : key); setReactOpen(null); setCommentOpen(null); }}
        onAssign={userId => { assignTask(key, userId); setAssignOpen(null); }}
        onEmoji={emoji => { handleReact(key, emoji); setReactOpen(null); }}
        onCopy={() => shareStage(key, `${taskSub.text} (subtask of ${parentStageName} · ${pipelineName})`)}
        copied={copied === key}
        showEditButton={isHovered}
      />

      {showCommentPopover && (
        <CommentPopover
          t={t}
          users={users}
          comments={cmts}
          inputValue={commentInput[key] || ""}
          onInputChange={v => setCommentInput(prev => ({ ...prev, [key]: v }))}
          onSend={() => addComment(key)}
        />
      )}
    </CardShell>
    </div>
  );
}

// ─── Subtask as first-class kanban item ──────────────────────────────────────

function SubtaskKanbanCard({
  sub, onDone, onRename, onDragSubtaskStart, onDragSubtaskEnd,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
  isAdmin,
}: {
  sub: SubtaskKanbanTask; isMine: boolean; onDone: () => void; onRename?: (taskId: number, text: string) => void;
  onDragSubtaskStart?: () => void; onDragSubtaskEnd?: () => void;
} & SharedCardProps) {
  const { handleClaim, claims, approvedSubtasks, approveSubtask } = useModel();
  const [isHovered, setIsHovered] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editVal, setEditVal] = useState("");
  const subtaskRef = useRef<HTMLDivElement>(null);

  const rxs = reactions[sub.key] || {};
  const cmts = comments[sub.key] || [];
  const showReactPicker = reactOpen === sub.key;
  const showCommentPopover = commentOpen === sub.key;
  const showAssignPicker = assignOpen === sub.key;

  // Click-outside should only run when this card actually has a popover open.
  // Otherwise sibling cards' handlers all fire on every click and close popovers immediately.
  const isAnyOpen = showReactPicker || showCommentPopover || showAssignPicker || editOpen;
  useEffect(() => {
    if (!isAnyOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (subtaskRef.current && !subtaskRef.current.contains(e.target as Node)) {
        setReactOpen(null);
        setCommentOpen(null);
        setAssignOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAnyOpen, setReactOpen, setCommentOpen, setAssignOpen]);
  const assigneeIds = assignments[sub.key] || [];
  const assignees = assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as UserType[];
  const assignee = assignees[0] || null;
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);
  const creator = users.find(u => u.id === sub.by);
  const isUnknownParent = !sub.pipelineName;
  const taskId = SubtaskKey.parse(sub.key as Parameters<typeof SubtaskKey.parse>[0])?.subtaskId ?? NaN;

  const commitEdit = () => {
    if (editVal.trim() && onRename) onRename(taskId, editVal.trim());
    setEditOpen(false);
  };

  return (
    <div ref={subtaskRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell
        t={t}
        borderColor={isUnknownParent ? t.amber + "55" : t.border}
        pipelineColor={sub.pipelineColor}
        draggable={!editOpen}
        onDragStart={e => { e.dataTransfer.setData("subtaskKey", sub.key); e.dataTransfer.effectAllowed = "move"; onDragSubtaskStart?.(); }}
        onDragEnd={onDragSubtaskEnd}
      >
        {/* Top row — same structure as TaskCard */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>
              <span style={{ color: sub.pipelineColor, marginRight: 4 }}>&#10551;</span>
              {editOpen
                ? <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditOpen(false); }}
                    onBlur={commitEdit}
                    onClick={e => e.stopPropagation()}
                    style={{ fontSize: 15, fontWeight: 700, color: t.text, background: t.accent + "08", border: `2px dashed ${t.accent}55`, borderRadius: 6, padding: "2px 6px", outline: "none", width: "100%", fontFamily: "inherit" }}
                  />
                : <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.text}</span>
              }
            </div>
            <div style={{ fontSize: 11, color: isUnknownParent ? t.amber : t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {isUnknownParent
                ? <span style={{ color: t.amber }}>⚠ unknown parent</span>
                : <>{sub.workspaceIcon && sub.workspaceName && <span style={{ marginRight: 3 }}>{sub.workspaceIcon} {sub.workspaceName} · </span>}{sub.pipelineIcon} {sub.parentStageName}</>}
              <span style={{ color: t.accent, fontWeight: 700, marginLeft: 4 }}>· {sub.points}pts</span>
              {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ""}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {(() => {
              const subClaimers = claims[sub.key] || [];
              const isClaimedByMe = currentUser ? subClaimers.includes(currentUser) : false;
              const isApproved = approvedSubtasks.includes(sub.key);
              const isPending = sub.done && !isApproved;
              return (
                <>
                  {subClaimers.slice(0, 2).map(id => { const u = users.find(u => u.id === id); return u ? <AvatarC key={id} user={u} size={18} /> : null; })}
                  {!sub.done && currentUser && (
                    <button onClick={e => { e.stopPropagation(); onDone(); }} style={btn(sub.pipelineColor, sub.pipelineColor + "18", sub.pipelineColor + "55")} title="Mark done — needs captain approval to award points">
                      ✓ done
                    </button>
                  )}
                  {isPending && isAdmin && (
                    <button onClick={e => { e.stopPropagation(); approveSubtask(sub.key); }} style={btn(t.green, t.green + "22", t.green + "88")} title="Captain approval — awards points to claimers">
                      ✓ approve
                    </button>
                  )}
                  {isPending && !isAdmin && (
                    <span style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "3px 8px", fontSize: 10, color: t.amber, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>⏳ pending</span>
                  )}
                  {isApproved && (
                    <span style={{ background: t.green + "22", border: `1px solid ${t.green}55`, borderRadius: 8, padding: "3px 8px", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>✓ approved</span>
                  )}
                  {currentUser && !sub.done && !isApproved && (
                    <ClaimChip claimed={isClaimedByMe} pipelineColor={sub.pipelineColor} t={t} onClaim={() => handleClaim(sub.key)} variant="subtask" small />
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Reactions strip */}
        {visibleReactions.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {visibleReactions.map(([emoji, us]) => {
              const mine = currentUser ? us.includes(currentUser) : false;
              return (
                <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(sub.key, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 12, padding: "0 8px", cursor: "pointer", fontSize: 13, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
                  <span>{emoji}</span><span style={{ fontSize: 10, fontWeight: 700 }}>{us.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Action row — identical to TaskCard */}
        <ActionRow
          t={t}
          showReactPicker={showReactPicker}
          showCommentPopover={showCommentPopover}
          showAssignPicker={showAssignPicker}
          commentCount={cmts.length}
          assignee={assignee} assignees={assignees}
          users={users}
          onReactToggle={() => { setReactOpen(showReactPicker ? null : sub.key); setCommentOpen(null); setAssignOpen(null); }}
          onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : sub.key); setReactOpen(null); setAssignOpen(null); }}
          onAssignToggle={() => { setAssignOpen(showAssignPicker ? null : sub.key); setReactOpen(null); setCommentOpen(null); }}
          onAssign={userId => { assignTask(sub.key, userId); setAssignOpen(null); }}
          onEmoji={emoji => { handleReact(sub.key, emoji); setReactOpen(null); }}
          onCopy={() => shareStage(sub.key, `${sub.text} (subtask · ${sub.pipelineName})`)}
          copied={copied === sub.key}
          showEditButton={isHovered || editOpen}
          showEditInput={editOpen}
          onEditToggle={() => { if (!editOpen) { setEditVal(sub.text); setReactOpen(null); setCommentOpen(null); setAssignOpen(null); } setEditOpen(!editOpen); }}
        />

        {showCommentPopover && (
          <CommentPopover
            t={t}
            users={users}
            comments={cmts}
            inputValue={commentInput[sub.key] || ""}
            onInputChange={v => setCommentInput(prev => ({ ...prev, [sub.key]: v }))}
            onSend={() => addComment(sub.key)}
          />
        )}
      </CardShell>
    </div>
  );
}

// ─── Shared micro-components ─────────────────────────────────────────────────

function CardShell({ t, borderColor, borderStyle, pipelineColor, compact, draggable: isDraggable, onDragStart, onDragEnd, children }: {
  t: T; borderColor: string; borderStyle?: "solid" | "dashed"; pipelineColor?: string; compact?: boolean;
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={e => e.stopPropagation()}
      style={{
        background: t.bgCard,
        border: `1px ${borderStyle || "solid"} ${borderColor}`,
        borderRadius: compact ? 10 : 12,
        padding: compact ? "10px 12px" : "14px 16px",
        display: "flex", flexDirection: "column", gap: compact ? 6 : 8,
        cursor: isDraggable ? "grab" : "default",
        userSelect: "none",
        transition: "border-color 0.15s, border-style 0.1s",
        position: "relative",
        boxShadow: pipelineColor ? `inset 3px 0 0 ${pipelineColor}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

function ActionRow({ t, showReactPicker, showCommentPopover, showAssignPicker, commentCount, assignee, assignees, users, onReactToggle, onCommentToggle, onAssignToggle, onAssign, onEmoji, onCopy, copied, onEditToggle, showEditInput, showEditButton, compact }: {
  t: T; showReactPicker: boolean; showCommentPopover: boolean; showAssignPicker: boolean;
  commentCount: number;
  /** primary assignee — first in the list, kept for backwards compat label/color */
  assignee: UserType | null | undefined;
  /** full assignee list (max 2) — used to render stacked avatars */
  assignees?: UserType[];
  users: UserType[];
  onReactToggle: () => void; onCommentToggle: () => void; onAssignToggle: () => void;
  /** toggle a userId in/out of the assignee list (max 2). null clears all. */
  onAssign: (userId: string | null) => void;
  onEmoji: (emoji: string) => void; onCopy: () => void; copied: boolean; onEditToggle?: () => void; showEditInput?: boolean; showEditButton?: boolean; compact?: boolean;
}) {
  const assigneeList = assignees && assignees.length > 0 ? assignees : (assignee ? [assignee] : []);
  const iconBtn: React.CSSProperties = {
    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8,
    padding: compact ? "3px 6px" : "3px 7px", cursor: "pointer",
    fontSize: compact ? 9 : 10, color: t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4,
    whiteSpace: "nowrap" as const,
  };

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", borderTop: `1px solid ${t.border}`, paddingTop: compact ? 6 : 8, marginTop: 0, flexWrap: "wrap" }}>
      <div style={{ position: "relative" }}>
        <button onClick={e => { e.stopPropagation(); onReactToggle(); }} style={iconBtn} title="Add reaction">
          😀 <span style={{ fontSize: 10 }}>+</span>
        </button>
        {showReactPicker && (
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100 }}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => onEmoji(emoji)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, padding: "4px 4px", borderRadius: 8 }}>{emoji}</button>
            ))}
          </div>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onCommentToggle(); }} style={iconBtn} title="Comments">
        💬 <span style={{ fontSize: 10 }}>{commentCount}</span>
      </button>
      <div style={{ position: "relative" }}>
        <button
          onClick={e => { e.stopPropagation(); onAssignToggle(); }}
          style={{
            ...iconBtn,
            color: assigneeList.length > 0 ? assigneeList[0].color : t.textMuted,
            borderColor: assigneeList.length > 0 ? assigneeList[0].color + "55" : t.border,
            paddingLeft: assigneeList.length > 0 ? 4 : (compact ? 6 : 7),
            gap: 5,
          }}
          title={assigneeList.length > 0 ? `Assigned: ${assigneeList.map(u => u.name).join(", ")}` : "Assign to someone"}
        >
          {assigneeList.length === 0 ? (
            <>
              <span style={{ fontSize: 11, opacity: 0.7 }}>👤</span>
              <span style={{ fontSize: 10 }}>assign</span>
            </>
          ) : (
            <>
              {/* Stacked avatars (overlap if 2) */}
              <span style={{ display: "inline-flex", marginRight: 2 }}>
                {assigneeList.slice(0, 2).map((u, i) => (
                  <span key={u.id} style={{ marginLeft: i === 0 ? 0 : -7, display: "inline-block", borderRadius: "50%", boxShadow: `0 0 0 1.5px ${t.bgCard}` }}>
                    <AvatarC user={u} size={16} />
                  </span>
                ))}
              </span>
              <span style={{ fontSize: 10 }}>
                {assigneeList.length === 1
                  ? assigneeList[0].name.toLowerCase()
                  : `${assigneeList[0].name.toLowerCase()} +${assigneeList.length - 1}`}
              </span>
            </>
          )}
        </button>
        {showAssignPicker && (
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100, minWidth: 200 }}>
            <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", padding: "4px 8px 2px", textTransform: "uppercase", letterSpacing: 0.5 }}>
              assign — up to 2 ({assigneeList.length}/2)
            </div>
            {users.map(u => {
              const isCurrent = assigneeList.some(a => a.id === u.id);
              const atCap = assigneeList.length >= 2 && !isCurrent;
              return (
                <button
                  key={u.id}
                  onClick={() => onAssign(u.id)}
                  disabled={atCap}
                  title={atCap ? "Max 2 assignees — remove one to add another" : undefined}
                  style={{
                    background: isCurrent ? u.color + "22" : "transparent",
                    border: "none",
                    cursor: atCap ? "not-allowed" : "pointer",
                    padding: "6px 8px",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: isCurrent ? u.color : t.text,
                    fontWeight: isCurrent ? 700 : 500,
                    fontFamily: "var(--font-dm-mono), monospace",
                    textAlign: "left",
                    opacity: atCap ? 0.4 : 1,
                  }}
                >
                  <AvatarC user={u} size={24} />
                  <span style={{ flex: 1 }}>{u.name}</span>
                  {isCurrent && <span style={{ fontSize: 10 }}>✓</span>}
                </button>
              );
            })}
            {assigneeList.length > 0 && (
              <button onClick={() => onAssign(null)} style={{ background: "transparent", border: `1px dashed ${t.border}`, cursor: "pointer", padding: "4px 8px", borderRadius: 8, fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 0 }}>× clear all</button>
            )}
          </div>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onCopy(); }} style={iconBtn} title="Copy">
        {copied ? "✓ copied" : "📋 copy"}
      </button>
      {onEditToggle && showEditButton && (
        <button
          onClick={e => { e.stopPropagation(); onEditToggle(); }}
          title={showEditInput ? "Exit edit mode" : "Edit"}
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            background: showEditInput ? t.accent + "22" : t.bgCard,
            border: `1px solid ${showEditInput ? t.accent + "88" : t.border}`,
            borderRadius: 8,
            width: 28,
            height: 28,
            cursor: "pointer",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: showEditInput ? t.accent : t.textMuted,
            transition: "all 0.15s",
            boxShadow: showEditInput ? `0 2px 8px ${t.accent}33` : "none",
          }}
        >
          &#9998;
        </button>
      )}
    </div>
  );
}

function CommentPopover({ t, users, comments, inputValue, onInputChange, onSend }: {
  t: T; users: UserType[]; comments: CommentItem[];
  inputValue: string; onInputChange: (v: string) => void; onSend: () => void;
}) {
  return (
    <div onClick={e => e.stopPropagation()} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 12, padding: 8, marginTop: 0 }}>
      {comments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
          {comments.slice(-5).map(c => {
            const u = users.find(u => u.id === c.by);
            return (
              <div key={c.id} style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                {u && <AvatarC user={u} size={18} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: u?.color || t.text, fontWeight: 700 }}>{u?.name || c.by}</div>
                  <div style={{ fontSize: 13, color: t.text, wordBreak: "break-word" }}>{c.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: 4 }}>
        <input
          value={inputValue}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
          placeholder="// add a comment..."
          style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
        />
        <button onClick={onSend} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>send</button>
      </div>
    </div>
  );
}

function btn(color: string, bg: string, borderColor: string, small = false): React.CSSProperties {
  return {
    background: bg, border: `1px solid ${borderColor}`, borderRadius: 8,
    padding: small ? "4px 10px" : "6px 12px", cursor: "pointer",
    fontSize: 10, color, fontWeight: 700,
    fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0,
  };
}

function badge(color: string): React.CSSProperties {
  return {
    fontSize: 10, color, background: color + "18", border: `1px solid ${color}44`,
    borderRadius: 8, padding: "4px 8px", fontWeight: 700,
    fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0,
  };
}
