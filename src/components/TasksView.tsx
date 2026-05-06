"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { T } from "@/lib/themes";
import { REACTIONS, stageDefaults, type SubtaskItem, type UserType, type CommentItem, ADMIN_IDS } from "@/lib/data";
import { deriveStageDisplayPoints } from "@/lib/points";
import { AvatarC } from "@/components/ui/Avatar";
import ClaimChip from "@/components/ui/ClaimChip";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import ConfirmModal from "@/components/ui/ConfirmModal";
import ClaimerPills from "@/components/ui/ClaimerPills";
import { useModel, INBOX_PIPELINE_ID } from "@/lib/contexts/ModelContext";
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
  /** Workspace context for kanban creation. null = cross-workspace mode (force user to pick one). */
  currentWorkspaceId?: string | null;
  /** All workspaces the user can target when creating items in cross-workspace mode. */
  availableWorkspaces?: { id: string; name: string; icon: string; pipelineIds: string[] }[];
  /** Read-only executive/founder mode: view work, hide mutation controls. */
  readOnly?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

// Columns in the now-tab kanban — these map 1:1 to stage statuses
const ALL_COLS = [
  { status: "concept",     label: "concept",     colorKey: "slate" },
  { status: "planned",     label: "planned",     colorKey: "cyan"  },
  { status: "in-progress", label: "in progress", colorKey: "amber" },
  { status: "blocked",     label: "blocked",     colorKey: "red"   },
  { status: "active",      label: "done",        colorKey: "green" },
];

function formatDueDate(iso: string): string {
  // "2026-05-07" → "May 7" (or "May 7, 2025" if different year from now)
  const d = new Date(`${iso}T23:59:59`);
  if (isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", sameYear ? { month: "long", day: "numeric" } : { month: "long", day: "numeric", year: "numeric" });
}

function resolveCommentUser(users: UserType[], by: string): UserType {
  const normalized = by.toLowerCase();
  return users.find(u =>
    u.id.toLowerCase() === normalized ||
    u.name.toLowerCase() === normalized ||
    u.name.split(" ")[0].toLowerCase() === normalized
  ) ?? {
    id: by,
    name: by || "Unknown",
    role: "Team",
    avatar: "",
    color: "#8b5cf6",
  };
}

export default function TasksView(props: Props) {
  const { t, allPipelines, customStages, pipeMetaOverrides, getStatus, users, currentUser, ck, isAdmin, showMyAllFilter, defaultMyAllFilter, pipelineWorkspaceMap, editMode, onPipelineClick, hideConcept, currentWorkspaceId, availableWorkspaces, readOnly = false } = props;
  const {
    claims, reactions, comments, subtasks, assignments, owners, approvedStages, getPoints,
    handleClaim, handleReact, toggleSubtask, renameSubtask,
    setStageStatusDirect: setStageStatus, approveStage, assignTask,
    stageNameOverrides, setStageNameOverride, stageDueDates, setStageDueDate, subtaskStages, setSubtaskStage, subtaskDueDates, setSubtaskDueDate,
    archivedStages, archivedSubtasks, stagePointsOverride,
    addComment: modelAddComment, deleteComment,
    addSubtask: modelAddSubtask,
    addCustomStage: modelAddCustomStage,
    addUnparentedStage,
    migrateSubtask,
    workspaces, setWorkspaces,
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "soon" | "none">("all");
  const [filterNow] = useState(() => Date.now());
  // ── Kanban dynamic creation form ─────────────────────────────────────────────
  // none selected → orphan; pipeline only → task; pipeline+stage → subtask.
  // In cross-workspace mode, workspace must be picked first (drives pipeline list + scope).
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubDueDate, setNewSubDueDate] = useState("");
  const [newSubWsId, setNewSubWsId] = useState<string>(""); // workspace for cross-workspace mode
  const [newSubPipeId, setNewSubPipeId] = useState<string>(""); // "" = orphan
  const [newSubParentStage, setNewSubParentStage] = useState<string>(""); // "" = no parent (task-level)

  // Workspace context: explicit prop > user pick > auto-pick if only 1 available
  const formWsId = currentWorkspaceId
    || newSubWsId
    || (availableWorkspaces?.length === 1 ? availableWorkspaces[0].id : "");
  // Picker only needed when 2+ workspaces available and none is auto-implied
  const needsWorkspacePick = !currentWorkspaceId && (availableWorkspaces?.length || 0) > 1;
  // Display label for the auto/implicit workspace (shown read-only in form)
  const formWsLabel = formWsId
    ? availableWorkspaces?.find(w => w.id === formWsId)?.name
      || workspaces.find(w => w.id === formWsId)?.name
      || ""
    : "";

  const resetNewSub = useCallback(() => {
    setNewTaskCol(null); setNewSubTitle(""); setNewSubDueDate(""); setNewSubWsId(""); setNewSubPipeId(""); setNewSubParentStage("");
  }, []);

  const submitNewItem = useCallback(async (colStatus: string) => {
    if (readOnly) return;
    const title = newSubTitle.trim();
    if (!title) return;
    if (needsWorkspacePick && !newSubWsId) return; // must pick workspace first
    if (newSubPipeId && newSubParentStage) {
      // Subtask
      const taskId = modelAddSubtask(newSubParentStage, title, () => {});
      if (taskId !== null) {
        const key = `${newSubParentStage}::${taskId}`;
        if (newSubDueDate) setSubtaskDueDate(key, newSubDueDate);
        if (colStatus !== "planned") setSubtaskStage(key, colStatus);
        if (currentUser) handleClaim(key);
      }
    } else if (newSubPipeId) {
      // Task in a pipeline
      modelAddCustomStage(newSubPipeId, title);
      if (newSubDueDate) setStageDueDate(title, newSubDueDate);
      if (colStatus !== "planned") setStageStatus(title, colStatus);
      if (currentUser) handleClaim(title);
    } else {
      // Orphan task. Goes to inbox pipeline. If a workspace is in scope, ensure
      // inbox pipeline is in that workspace's pipelineIds so user sees it later.
      const stageName = await addUnparentedStage(title);
      if (stageName) {
        if (colStatus !== "planned") setStageStatus(stageName, colStatus);
        if (newSubDueDate) setStageDueDate(stageName, newSubDueDate);
        if (currentUser) handleClaim(stageName);
        if (formWsId) {
          setWorkspaces(prev => prev.map(w =>
            w.id === formWsId && !w.pipelineIds.includes(INBOX_PIPELINE_ID)
              ? { ...w, pipelineIds: [...w.pipelineIds, INBOX_PIPELINE_ID] }
              : w
          ));
        }
      }
    }
    resetNewSub();
  }, [newSubTitle, newSubDueDate, newSubWsId, newSubPipeId, newSubParentStage, needsWorkspacePick, formWsId, currentUser, handleClaim, modelAddSubtask, modelAddCustomStage, addUnparentedStage, setStageDueDate, setStageStatus, setSubtaskDueDate, setSubtaskStage, setWorkspaces, resetNewSub, readOnly]);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");

  // Build set of all stages explicitly placed via customStages in ANY pipeline.
  // Static stages that appear in another pipeline's customStages have been "moved" —
  // exclude them from their original static pipeline to avoid duplication.
  const allCustomStageSet = useMemo(
    () => new Set(Object.values(customStages).flat()),
    [customStages]
  );
  const pipelines = allPipelines.map(p => {
    const ownCustom = new Set(customStages[p.id] || []);
    const deduped = p.stages.filter(s => !allCustomStageSet.has(s) || ownCustom.has(s));
    // Dedupe by stage name — names are IDs, so duplicates would render the same
    // task multiple times (all pointing at the same state). Earlier writes via
    // addCustomStage didn't enforce uniqueness, leaving repeated entries in
    // customStages that we silently fold here.
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const s of [...deduped, ...(customStages[p.id] || [])]) {
      if (seen.has(s)) continue;
      seen.add(s);
      merged.push(s);
    }
    return {
      ...p,
      displayName: pipeMetaOverrides[p.id]?.name || p.name,
      allStages: merged,
      color: ck[p.colorKey] || t.accent,
    };
  });

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
  const baseStageTasks = (showMyAllFilter && myAllFilter === "my")
    ? allStageTasks.filter(s => {
        if (!currentUser) return false;
        if (s.claimers.includes(currentUser)) return true;
        if ((assignments[s.stageId] || []).includes(currentUser)) return true;
        if ((owners[s.stageId] || []).includes(currentUser)) return true;
        return false;
      })
    : allStageTasks;

  // Same filter applied to virtual subtask kanban tasks below — declared after the useMemo
  const dueMatches = (due?: string) => {
    if (dueFilter === "all") return true;
    if (dueFilter === "none") return !due;
    if (!due) return false;
    const time = new Date(`${due}T23:59:59`).getTime();
    const now = filterNow;
    if (dueFilter === "overdue") return time < now;
    return time >= now && time <= now + 3 * 24 * 60 * 60 * 1000;
  };

  const stageTasks = baseStageTasks.filter(task => {
    const taskOwners = owners[task.stageId] || assignments[task.stageId] || [];
    if (assigneeFilter !== "all" && !taskOwners.includes(assigneeFilter)) return false;
    return dueMatches(stageDueDates[task.stageId]);
  });

  // For the kanban subtask list we use allPipelinesGlobal so subtasks whose parent
  // pipeline is outside the current workspace still appear — no disappearing on sync.
  const subtaskKanbanTasks = useMemo(() => {
    const tasks: SubtaskKanbanTask[] = [];
    for (const [parentStageId, subtaskList] of Object.entries(subtasks || {})) {
      // Show ALL non-archived subtasks in kanban — no workspace/pipeline filter.
      // This is the core fix: subtasks should be independent of their parent's visibility.
      for (const sub of subtaskList) {
        const key = SubtaskKey.make(parentStageId, sub.id);
        if (archivedSubtaskKeySet.has(key)) continue;
        const parentStageName = stageNameOverrides?.[parentStageId] || parentStageId;
        let pipelineId = "";
        let pipelineIcon = "";
        let pipelineName = "";
        let pipelineColor = "";
        // Look up pipeline from ALL pipelines, not just workspace-visible ones
        for (const p of [...pipelines, ...(allPipelines || []).filter(ap => !pipelines.find(vp => vp.id === ap.id))]) {
          const pCustom = customStages[p.id] || [];
          const pStages = [...(p.stages || []), ...pCustom];
          if (pStages.includes(parentStageId)) {
            pipelineId = p.id;
            pipelineIcon = p.icon;
            pipelineName = (p as { displayName?: string }).displayName || p.name;
            pipelineColor = ck[p.colorKey] || t.accent;
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
  }, [subtasks, subtaskStages, stageNameOverrides, pipelines, allPipelines, customStages, ck, t, archivedSubtaskKeySet, pipelineWorkspaceMap]);

  // Filter subtasks by mine when active — matches stage task filter so the "mine" tab shows owned/assigned subtasks too
  const filteredSubtaskKanbanTasksBase = (showMyAllFilter && myAllFilter === "my" && currentUser)
    ? subtaskKanbanTasks.filter(s => {
        return (claims[s.key] || []).includes(currentUser)
          || (assignments[s.key] || []).includes(currentUser)
          || (owners[s.key] || []).includes(currentUser);
      })
    : subtaskKanbanTasks;
  const filteredSubtaskKanbanTasks = filteredSubtaskKanbanTasksBase.filter(sub => {
    const subOwners = [...(owners[sub.key] || []), ...(assignments[sub.key] || []), ...(claims[sub.key] || [])];
    if (assigneeFilter !== "all" && !subOwners.includes(assigneeFilter)) return false;
    return dueMatches(subtaskDueDates[sub.key]);
  });

  const statusColor = (status: string) => {
    const col = COLS.find(c => c.status === status);
    return col ? (ck[col.colorKey] || t.accent) : t.textDim;
  };

  const isMine = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  const handleDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    if (readOnly) return;
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
    if (readOnly) return;
    if (!e.dataTransfer.types.includes("subtaskkey")) return;
    e.preventDefault();
    setStageDropOver(stageId);
  }, [readOnly]);
  const handleStageDragLeave = useCallback((stageId: string) => {
    setStageDropOver(prev => prev === stageId ? null : prev);
  }, []);
  const handleStageDrop = useCallback((stageId: string, targetStatus: string, e: React.DragEvent) => {
    if (readOnly) return;
    setStageDropOver(null);
    // Subtask-into-stage migration
    const subtaskKey = e.dataTransfer.getData("subtaskKey");
    if (subtaskKey && SubtaskKey.isValid(subtaskKey)) {
      e.preventDefault();
      e.stopPropagation();
      migrateSubtask(subtaskKey as Parameters<typeof migrateSubtask>[0], stageId);
      const parsed = SubtaskKey.parse(subtaskKey as Parameters<typeof SubtaskKey.parse>[0]);
      const statusKey = parsed ? SubtaskKey.make(stageId, parsed.subtaskId) : subtaskKey;
      setSubtaskStage(statusKey, targetStatus);
      return;
    }
    // Stage-onto-stage drop: move the dragged stage into the target column's status.
    // Without this, dropping over another card relied entirely on event bubbling
    // reaching the column's onDrop, which intermittently failed in Chrome.
    const draggedStageId = e.dataTransfer.getData("stageId");
    if (draggedStageId && draggedStageId !== stageId) {
      e.preventDefault();
      e.stopPropagation();
      if (getStatus(draggedStageId) !== targetStatus) {
        setStageStatus(draggedStageId, targetStatus);
      }
    }
  }, [migrateSubtask, setSubtaskStage, readOnly, getStatus, setStageStatus]);

  const cardShared = {
    t, users, currentUser, reactions, comments,
    reactOpen, setReactOpen, commentOpen, setCommentOpen,
    assignOpen, setAssignOpen, assignments, assignTask,
    handleReact: readOnly ? (() => {}) : handleReact, shareStage, addComment, deleteComment, commentInput, setCommentInput, copied,
    isAdmin, approveStage, approvedStages, toggleSubtask, subtasks,
    editingStage, setEditingStage: setEditingStage, editingVal, setEditingVal,
    setStageNameOverride,
    editMode, onPipelineClick,
    handleClaim, claims,
    getPoints,
    // Stage migration drop target props
    draggingSubtaskKey, stageDropOver,
    onStageDragOver: handleStageDragOver,
    onStageDragLeave: handleStageDragLeave,
    onStageDrop: handleStageDrop,
    availablePipelines: pipelines
      .filter(p => p.id !== INBOX_PIPELINE_ID)
      .map(p => ({ id: p.id, name: p.displayName, icon: p.icon })),
    readOnly,
  };

  // Mobile today view: filter to claimed/assigned, sort by status priority
  const STATUS_PRIORITY: Record<string, number> = {
    "in-progress": 0, "planned": 1, "active": 2, "concept": 3, "blocked": 4,
  };

  if (isMobile) {
    const todayStages = allStageTasks
      .filter(s => {
        if (!currentUser) return false;
        return (claims[s.stageId] || []).includes(currentUser)
          || (assignments[s.stageId] || []).includes(currentUser)
          || (owners[s.stageId] || []).includes(currentUser);
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
          <button style={flatBtn(filterOpen || assigneeFilter !== "all" || dueFilter !== "all")} onClick={() => setFilterOpen(v => !v)}>⌕ filters</button>
        </div>
      </div>
      {filterOpen && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12, padding: 8, border: `1px solid ${t.border}`, borderRadius: 12, background: t.bgCard }}>
          <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 8px", color: t.text, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11 }}>
            <option value="all">all assignees</option>
            {users.filter(u => u.id !== "ai").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={dueFilter} onChange={e => setDueFilter(e.target.value as typeof dueFilter)} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 8px", color: t.text, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11 }}>
            <option value="all">all due dates</option>
            <option value="overdue">overdue</option>
            <option value="soon">due soon</option>
            <option value="none">no due date</option>
          </select>
          <button onClick={() => { setAssigneeFilter("all"); setDueFilter("all"); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 8px", color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, cursor: "pointer" }}>clear</button>
        </div>
      )}

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
        <div style={{ display: "flex", gap: 12, alignItems: "stretch", overflowX: "auto", paddingBottom: 16, minHeight: "calc(100vh - 190px)" }}>
          {COLS.map(col => {
            const colTasks = stageTasks.filter(s => s.status === col.status);
            const colSubtasks = filteredSubtaskKanbanTasks.filter(s => s.status === col.status);
            const totalCount = colTasks.length + colSubtasks.length;
            if (totalCount === 0 && col.status === "blocked") return null;
            const stColor = statusColor(col.status);
            const isOver = dragOver === col.status;
            return (
              <div
                key={col.status}
                style={{ flex: "1 1 280px", minWidth: 260, minHeight: "calc(100vh - 210px)", background: isOver ? t.accent + "0a" : "transparent", border: `1px solid ${isOver ? t.accent + "55" : "transparent"}`, borderRadius: 16, transition: "all 0.15s", padding: 4, display: "flex", flexDirection: "column" }}
                onDragEnter={e => {
                  if (readOnly) return;
                  e.preventDefault(); setDragOver(col.status);
                }}
                onDragOver={e => {
                  if (readOnly) return;
                  e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(col.status);
                }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null); }}
                onDrop={e => handleDrop(col.status, e)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, padding: "4px 4px", borderBottom: `1px solid ${stColor}33` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: stColor, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                  <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({totalCount})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {totalCount === 0
                    ? <div
                        onDragOver={e => { if (readOnly) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(col.status); }}
                        onDrop={e => handleDrop(col.status, e)}
                        style={{ border: `1.5px dashed ${isOver ? t.accent + "88" : t.border}`, borderRadius: 12, padding: "24px 12px", textAlign: "center", fontSize: 10, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}
                      >{readOnly ? "// no items" : "// drop to move"}</div>
                    : <>
                        {colTasks.map(task => <TaskWithSubtasks key={task.stageId} task={task} isMine={isMine(task.stageId)} onClaim={() => handleClaim(task.stageId)} draggable={!readOnly} hideSubs subtaskStages={subtaskStages} {...cardShared} />)}
                        {colSubtasks.map(sub => <SubtaskKanbanCard key={sub.key} sub={sub} isMine={currentUser ? (assignments[sub.key] || []).includes(currentUser) : false} onRename={(taskId, text) => renameSubtask?.(sub.parentStageId, taskId, text)} onDragSubtaskStart={() => { if (!readOnly) setDraggingSubtaskKey(sub.key); }} onDragSubtaskEnd={() => { setDraggingSubtaskKey(null); setStageDropOver(null); }} {...cardShared} />)}
                      </>
                  }
                  {/* Drop zone at bottom so dragging over the last card still highlights the column */}
	                  {!readOnly && <div
	                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(col.status); }}
	                    onDrop={e => handleDrop(col.status, e)}
	                    style={{ flex: 1, minHeight: 120, borderRadius: 10, border: `1.5px dashed ${isOver ? t.accent + "88" : t.border + "22"}`, background: isOver ? t.accent + "08" : "transparent", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}
	                  >drop here</div>}
                  {!readOnly && newTaskCol === col.status ? (
                    /* Dynamic creation form — workspace (if cross-ws) → optional pipeline → optional parent task */
                    <div style={{ border: `1.5px dashed ${t.accent}88`, borderRadius: 12, padding: 8, background: t.accent + "08", display: "flex", flexDirection: "column", gap: 6 }} data-no-close>
	                      <input
                        autoFocus
                        value={newSubTitle}
                        onChange={e => setNewSubTitle(e.target.value)}
                        placeholder="title…"
                        onKeyDown={e => {
                          if (e.key === "Escape") resetNewSub();
                          if (e.key === "Enter" && newSubTitle.trim() && !(needsWorkspacePick && !newSubWsId)) submitNewItem(col.status);
                        }}
                        onBlur={() => { if (!newSubTitle.trim() && !newSubPipeId && !newSubParentStage && !newSubWsId) resetNewSub(); }}
                        data-no-close
	                        style={{ background: t.bgCard, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "6px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none", width: "100%" }}
	                      />
	                      <input
	                        type="date"
	                        value={newSubDueDate}
	                        onChange={e => setNewSubDueDate(e.target.value)}
	                        data-no-close
	                        style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", outline: "none", width: "100%" }}
	                      />
                      {/* Workspace picker — visible when 2+ workspaces; otherwise show implicit ws label */}
                      {needsWorkspacePick ? (
                        <>
                          <div style={{ fontSize: 9, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5 }}>
                            {newSubWsId
                              ? `workspace: ${availableWorkspaces?.find(w => w.id === newSubWsId)?.name || newSubWsId}`
                              : "// pick workspace (required)"}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(availableWorkspaces || []).map(w => {
                              const sel = newSubWsId === w.id;
                              return (
                                <button key={w.id} onMouseDown={e => { e.preventDefault(); setNewSubWsId(sel ? "" : w.id); setNewSubPipeId(""); setNewSubParentStage(""); }} data-no-close
                                  style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? t.accent : t.text, fontFamily: "var(--font-dm-mono), monospace", fontWeight: sel ? 700 : 400 }}>
                                  {w.icon} {w.name}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : formWsLabel && (
                        <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5 }}>
                          → workspace: {formWsLabel}
                        </div>
                      )}
                      {/* Pipeline picker — optional, gated on workspace pick if cross-ws */}
                      {(!needsWorkspacePick || newSubWsId) && (() => {
                        const wsPipeIds = formWsId
                          ? new Set(availableWorkspaces?.find(w => w.id === formWsId)?.pipelineIds || workspaces.find(w => w.id === formWsId)?.pipelineIds || [])
                          : null;
                        const pipesToShow = allPipelines.filter(p =>
                          p.id !== INBOX_PIPELINE_ID && (!wsPipeIds || wsPipeIds.has(p.id))
                        );
                        return (
                          <>
                            <div style={{ fontSize: 9, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5 }}>
                              {newSubPipeId
                                ? `pipeline: ${allPipelines.find(p => p.id === newSubPipeId)?.name || newSubPipeId}`
                                : "// pipeline (optional)"}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {newSubPipeId && (
                                <button onMouseDown={e => { e.preventDefault(); setNewSubPipeId(""); setNewSubParentStage(""); }} data-no-close
                                  style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>
                                  ✕ clear pipeline
                                </button>
                              )}
                              {pipesToShow.map(p => {
                                const sel = newSubPipeId === p.id;
                                return (
                                  <button key={p.id} onMouseDown={e => { e.preventDefault(); setNewSubPipeId(sel ? "" : p.id); if (newSubParentStage && !([...p.stages, ...(customStages[p.id] || [])].includes(newSubParentStage))) setNewSubParentStage(""); }} data-no-close
                                    style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? t.accent : t.text, fontFamily: "var(--font-dm-mono), monospace", fontWeight: sel ? 700 : 400 }}>
                                    {p.icon} {(p as { displayName?: string }).displayName || p.name}
                                  </button>
                                );
                              })}
                              {pipesToShow.length === 0 && <span style={{ fontSize: 9, color: t.textDim, fontStyle: "italic" }}>no pipelines in this workspace</span>}
                            </div>
                          </>
                        );
                      })()}
                      {/* Parent task picker — optional, only shown when pipeline selected */}
                      {newSubPipeId && (() => {
                        const pipe = allPipelines.find(p => p.id === newSubPipeId);
                        const stagesInPipe = [...(pipe?.stages || []), ...(customStages[newSubPipeId] || [])].filter(s => !(archivedStages || []).includes(s));
                        return (
                          <>
                            <div style={{ fontSize: 9, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5 }}>
                              {newSubParentStage ? `parent task: ${stageNameOverrides?.[newSubParentStage] || newSubParentStage}` : "// parent task (optional — skip to create as task)"}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {newSubParentStage && (
                                <button onMouseDown={e => { e.preventDefault(); setNewSubParentStage(""); }} data-no-close
                                  style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>
                                  ✕ clear parent
                                </button>
                              )}
                              {stagesInPipe.map(s => {
                                const sel = newSubParentStage === s;
                                return (
                                  <button key={s} onMouseDown={e => { e.preventDefault(); setNewSubParentStage(sel ? "" : s); }} data-no-close
                                    style={{ background: sel ? t.accent + "22" : t.bgHover || t.bgSoft, border: `1px solid ${sel ? t.accent + "88" : t.accent + "33"}`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? t.accent : t.text, fontFamily: "var(--font-dm-mono), monospace", fontWeight: sel ? 700 : 400 }}>
                                    {stageNameOverrides?.[s] || s}
                                  </button>
                                );
                              })}
                              {stagesInPipe.length === 0 && <span style={{ fontSize: 9, color: t.textDim, fontStyle: "italic" }}>no tasks in this pipeline</span>}
                            </div>
                          </>
                        );
                      })()}
                      {/* Status line + action */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
                          {needsWorkspacePick && !newSubWsId
                            ? <span style={{ color: t.amber }}>// pick a workspace first</span>
                            : <>{newSubPipeId && newSubParentStage ? "→ subtask" : newSubPipeId ? "→ task" : "→ orphan task"}{" · "}↵ or click create</>}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onMouseDown={resetNewSub} data-no-close
                            style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
                            cancel
                          </button>
                          <button
                            disabled={!newSubTitle.trim() || (needsWorkspacePick && !newSubWsId)}
                            onMouseDown={e => { e.preventDefault(); if (!newSubTitle.trim()) return; if (needsWorkspacePick && !newSubWsId) return; submitNewItem(col.status); }}
                            data-no-close
                            style={{
                              background: (!newSubTitle.trim() || (needsWorkspacePick && !newSubWsId)) ? t.bgHover || t.bgSoft : t.accent + "22",
                              border: `1px solid ${(!newSubTitle.trim() || (needsWorkspacePick && !newSubWsId)) ? t.border : t.accent + "88"}`,
                              borderRadius: 6, padding: "2px 8px",
                              cursor: (!newSubTitle.trim() || (needsWorkspacePick && !newSubWsId)) ? "not-allowed" : "pointer",
                              fontSize: 10,
                              color: (!newSubTitle.trim() || (needsWorkspacePick && !newSubWsId)) ? t.textDim : t.accent,
                              fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700,
                              opacity: (!newSubTitle.trim() || (needsWorkspacePick && !newSubWsId)) ? 0.5 : 1,
                            }}>
                            create
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : !readOnly ? (
                    <button
                      onClick={() => { setNewTaskCol(col.status); setNewSubTitle(""); setNewSubWsId(""); setNewSubPipeId(""); setNewSubParentStage(""); }}
                      style={{ border: `1.5px dashed ${t.border}`, background: "transparent", borderRadius: 12, padding: "10px 12px", textAlign: "center", fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent + "88"; e.currentTarget.style.color = t.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textDim; }}
                    >+ new</button>
                  ) : null}
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
	  deleteComment: (sid: string, commentId: number) => void;
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
  onStageDrop?: (stageId: string, targetStatus: string, e: React.DragEvent) => void;
  // For orphan task pipeline picker — shown only when task is in inbox
  availablePipelines?: { id: string; name: string; icon: string }[];
  getPoints?: (uid: string) => number;
  readOnly?: boolean;
}

function TaskWithSubtasks({ task, isMine, onClaim, draggable: isDraggable, hideSubs, ...shared }: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean; hideSubs?: boolean } & SharedCardProps & { subtaskStages?: Record<string, string> }) {
  const { subtasks, toggleSubtask, subtaskStages } = shared as SharedCardProps & { subtaskStages?: Record<string, string> };
  const taskSubs = (subtasks[task.stageId] || []).filter(s => !s.done && !subtaskStages?.[SubtaskKey.make(task.stageId, s.id)]);
  // Don't show subtasks under "done" stages — completion is implied
  // Show subtasks even when parent stage is done — user may need to change assignment / archive
  const showSubs = !hideSubs;

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
  handleReact, shareStage, addComment, deleteComment, commentInput, setCommentInput, copied,
  isAdmin, approveStage, approvedStages, subtasks,
  editingStage, setEditingStage, editingVal, setEditingVal, setStageNameOverride, onPipelineClick,
  draggingSubtaskKey, stageDropOver, onStageDragOver, onStageDragLeave, onStageDrop,
  availablePipelines, getPoints, readOnly,
}: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps & { editingStage?: string | null; setEditingStage?: (v: string | null) => void; editingVal?: string; setEditingVal?: (v: string) => void; setStageNameOverride?: (name: string, val: string) => void }) {
  const { stageDescOverrides, setStageDescOverride, stageDueDates, setStageDueDate, stagePriorities, setStagePriority, archiveStage, pipeMetaOverrides, cyclePriority, moveStageToPipeline } = useModel();
  const stagePriority = stagePriorities[task.stageId];
  const canArchive = !readOnly && !!currentUser;
  const [editOpen, setEditOpen] = useState(false);
  const [descDraft, setDescDraft] = useState(stageDescOverrides[task.stageId] || "");
  const [dueDraft, setDueDraft] = useState(stageDueDates[task.stageId] || "");
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  // Re-initialize drafts only when entering edit mode or switching cards.
  // Excluding stageDescOverrides/stageDueDates from deps prevents external
  // updates (e.g. from sync) from wiping out the user's mid-edit input —
  // the previous behaviour caused due-date entries to "go back to not set".
  useEffect(() => {
    setDescDraft(stageDescOverrides[task.stageId] || "");
    setDueDraft(stageDueDates[task.stageId] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen, task.stageId]);

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
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Ignore clicks on body/html — happens after a native <select> dropdown closes
      // (the OS-level dropdown reports the click as outside the document tree).
      if (target.tagName === "HTML" || target.tagName === "BODY") return;
      // Ignore clicks on or inside elements opted-out via data-no-close
      if (target.closest?.("[data-no-close]")) return;
      if (cardRef.current && !cardRef.current.contains(target as Node)) {
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
      // The card is an explicit drop target for both stage and subtask drags.
      // Without this, drops on card content relied on event bubbling reaching
      // the column's onDrop — which Chrome misses ~50% of the time when the
      // event lands on a deeply nested child.
      onDragOver={(e) => {
        if (isStageDropTarget) { onStageDragOver?.(task.stageId, e); return; }
        if (e.dataTransfer.types.includes("stageid")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDragLeave={isStageDropTarget ? () => onStageDragLeave?.(task.stageId) : undefined}
      onDrop={(e) => onStageDrop?.(task.stageId, task.status, e)}
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
            <span
              onClick={onPipelineClick ? e => { e.stopPropagation(); onPipelineClick(task.pipelineId); } : undefined}
              style={{ cursor: onPipelineClick ? "pointer" : "default", color: onPipelineClick ? t.accent : t.textDim, display: "flex", alignItems: "center", gap: 3 }}
              title={onPipelineClick ? `Go to ${task.pipelineName}` : task.pipelineName}
            >
              {task.pipelineIcon} {task.pipelineName}
            </span>
            {subCount > 0 && <span style={{ color: subDone === subCount ? t.green : t.textDim }}>· {subDone}/{subCount}</span>}
            <span style={{ color: t.accent, fontWeight: 700 }} title="points (sum of subtasks, or override)">· {task.points}pts</span>
            {stagePriority && (() => {
              const cfg = stagePriority === "NOW"
                ? { color: t.red, icon: "🔥", label: "NOW" }
                : stagePriority === "HIGH"
                ? { color: t.amber, icon: "⬆", label: "HIGH" }
                : stagePriority === "MEDIUM"
                ? { color: t.cyan || t.accent, icon: "→", label: "MED" }
                : { color: t.textDim, icon: "⬇", label: "LOW" };
              const isUrgent = stagePriority === "NOW";
              return <span style={{
                background: isUrgent ? cfg.color : cfg.color + "22",
                color: isUrgent ? "#fff" : cfg.color,
                border: `1px solid ${isUrgent ? cfg.color : cfg.color + "88"}`,
                borderRadius: 6,
                padding: "1px 7px",
                fontSize: 9,
                fontWeight: 900,
                letterSpacing: 0.6,
                marginLeft: 4,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                boxShadow: isUrgent ? `0 0 8px ${cfg.color}66` : "none",
                animation: isUrgent ? "claimPulse 2s ease-in-out infinite" : "none",
              }}>
                <span style={{ fontSize: 9 }}>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </span>;
            })()}
            {stageDueDates[task.stageId] && (() => {
              const due = new Date(`${stageDueDates[task.stageId]}T23:59:59`);
              const now = new Date();
              const ms = due.getTime() - now.getTime();
              const soon = ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
              const expired = ms < 0;
              const color = expired ? t.red : soon ? t.amber : t.textDim;
              return <span style={{ color, fontWeight: expired || soon ? 800 : 500 }}>· due {formatDueDate(stageDueDates[task.stageId])}</span>;
            })()}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, flexWrap: "wrap" }}>
          {/* Owner display: bare avatars (no name pill — saves space) */}
          <ClaimerPills claimerIds={task.claimers} users={users} getPoints={getPoints} t={t} variant="avatar" size={22} />
          {isPending && isAdmin && (
            <button onClick={e => { e.stopPropagation(); approveStage(task.stageId); }} style={btn(t.green, t.green + "22", t.green + "88")} title="Captain approval — awards points to claimers">
              ✓ approve
            </button>
          )}
          {isPending && !isAdmin && <span style={badge(t.amber)}>⏳ pending</span>}
          {isDone && isApproved && <span style={badge(t.green)}>✓ approved</span>}
          {/* Claim button only when no owner yet — once claimed, the avatar carries that signal */}
          {currentUser && !readOnly && !(isPending && isAdmin) && !isApproved && (isMine || task.claimers.length === 0) && (
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

      {/* Edit-mode extra fields: description + priority + pipeline */}
      {editOpen && !readOnly && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }} onClick={e => e.stopPropagation()}>
          <textarea
            value={descDraft}
            onChange={e => setDescDraft(e.target.value)}
            onBlur={() => {
              const current = stageDescOverrides[task.stageId] || "";
              if (descDraft !== current) setStageDescOverride(task.stageId, descDraft);
            }}
            placeholder="Stage description..."
            rows={2}
            style={{ width: "100%", background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "4px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.5 }}
          />
          <input
            type="date"
            value={dueDraft}
            onChange={e => setDueDraft(e.target.value)}
            onBlur={() => {
              const current = stageDueDates[task.stageId] || "";
              if (dueDraft !== current) setStageDueDate(task.stageId, dueDraft || null);
            }}
            style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
          />
          {(() => {
            // Per-stage priority cycler
            const PRIORITY_VALS = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;
            type Pri = typeof PRIORITY_VALS[number];
            const cur: Pri | undefined = stagePriority;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>priority:</span>
                {PRIORITY_VALS.map(p => {
                  const sel = cur === p;
                  const color = p === "NOW" ? t.red : p === "HIGH" ? t.amber : p === "MEDIUM" ? (t.cyan || t.accent) : t.textDim;
                  return (
                    <button
                      key={p}
                      onClick={(e) => { e.stopPropagation(); setStagePriority(task.stageId, sel ? null : p); }}
                      style={{ background: sel ? color + "22" : "transparent", border: `1px solid ${sel ? color + "88" : t.border}`, borderRadius: 6, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: sel ? color : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: sel ? 800 : 600 }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {(() => {
            // Pipeline priority cycler — kept for pipelines that have one set
            const pipePriority = pipeMetaOverrides[task.pipelineId]?.priority;
            if (!pipePriority) return null;
            const PRIORITY_CYCLE_VALS = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>pipeline priority:</span>
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
          {/* Pipeline switcher for tasks — select which pipeline this task belongs to */}
          {availablePipelines && availablePipelines.length > 0 && (
            <div data-no-close style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 10px", background: t.accent + "08", border: `1px dashed ${t.accent}55`, borderRadius: 10, marginTop: 4 }}>
              <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>// pipeline</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {availablePipelines.map(p => {
                  const isCurrent = p.id === task.pipelineId;
                  return (
                    <button
                      key={p.id}
                      onMouseDown={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isCurrent) return;
                        moveStageToPipeline(task.stageId, task.pipelineId, p.id);
                      }}
                      data-no-close
                      title={isCurrent ? "current pipeline" : `move to ${p.name}`}
                      style={{
                        background: isCurrent ? t.accent + "22" : t.bgHover || t.bgSoft,
                        border: `1px solid ${isCurrent ? t.accent + "88" : t.accent + "55"}`,
                        borderRadius: 8,
                        padding: "3px 8px",
                        cursor: isCurrent ? "default" : "pointer",
                        fontSize: 11,
                        color: isCurrent ? t.accent : t.text,
                        fontFamily: "var(--font-dm-mono), monospace",
                        fontWeight: isCurrent ? 700 : 500,
                      }}
                    >{isCurrent ? "✓ " : ""}{p.icon} {p.name}</button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Destructive: archive lives inside edit so it can't be hit accidentally */}
          {canArchive && (
            <button
              onClick={e => { e.stopPropagation(); archiveStage(task.stageId); setEditOpen(false); setEditingStage?.(null); }}
              title="Archive this task"
              style={{ alignSelf: "flex-start", marginTop: 4, background: "transparent", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.amber + "18"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              📦 archive task
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
        onReactToggle={() => { if (readOnly) return; setReactOpen(showReactPicker ? null : task.stageId); setCommentOpen(null); setAssignOpen(null); setEditOpen(false); }}
        onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : task.stageId); setReactOpen(null); setAssignOpen(null); setEditOpen(false); }}
        onAssignToggle={() => { if (readOnly) return; setAssignOpen(showAssignPicker ? null : task.stageId); setReactOpen(null); setCommentOpen(null); setEditOpen(false); }}
        onAssign={userId => { assignTask(task.stageId, userId); setAssignOpen(null); }}
        onEmoji={emoji => { if (readOnly) return; handleReact(task.stageId, emoji); setReactOpen(null); }}
        onCopy={() => shareStage(task.stageId, `${task.stageId} — ${task.pipelineIcon} ${task.pipelineName}`)}
        copied={copied === task.stageId}
        isHovered={isHovered || isAnyOpen}
        onEditToggle={() => {
          const next = !editOpen;
          setEditOpen(next);
          setReactOpen(null); setCommentOpen(null); setAssignOpen(null);
          if (next) {
            setEditingStage?.(task.stageId);
            setEditingVal?.(task.displayName || task.stageId);
          } else {
            const currentDesc = stageDescOverrides[task.stageId] || "";
            const currentDue = stageDueDates[task.stageId] || "";
            if (descDraft !== currentDesc) setStageDescOverride(task.stageId, descDraft);
            if (dueDraft !== currentDue) setStageDueDate(task.stageId, dueDraft || null);
            if (editingStage === task.stageId && editingVal && editingVal !== (task.displayName || task.stageId)) {
              setStageNameOverride?.(task.stageId, editingVal);
            }
            setEditingStage?.(null);
          }
        }}
        showEditButton={!readOnly}
        showEditInput={editOpen || editingStage === task.stageId}
        readOnly={readOnly}
      />

      {showCommentPopover && (
        <CommentPopover
          t={t}
          users={users}
          comments={cmts}
          currentUser={currentUser}
          inputValue={commentInput[task.stageId] || ""}
          onInputChange={v => setCommentInput(prev => ({ ...prev, [task.stageId]: v }))}
          onSend={() => addComment(task.stageId)}
          onDelete={(commentId) => deleteComment(task.stageId, commentId)}
          readOnly={false}
        />
      )}

    </CardShell>
    </div>
  );
}

// ─── Subtask card (smaller, no description/preview) ──────────────────────────

function SubtaskCard({
  taskSub, stageId, parentStageName, pipelineColor, pipelineIcon, pipelineName,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, deleteComment, commentInput, setCommentInput, copied,
  handleClaim, claims, getPoints, readOnly,
}: {
  taskSub: SubtaskItem; stageId: string; parentStageName: string;
  pipelineColor: string; pipelineIcon: string; pipelineName: string;
  onToggle: () => void;
} & SharedCardProps & { handleClaim?: (sid: string) => void; claims?: Record<string, string[]> }) {
  const [, setIsHovered] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editVal, setEditVal] = useState("");
  const { renameSubtask, archiveSubtask, migrateSubtask, allPipelinesGlobal, customStages: allCustomStages, stageNameOverrides, archivedStages, subtaskDescOverrides, setSubtaskDescOverride, subtaskDueDates, setSubtaskDueDate } = useModel();
  const subtaskRef = useRef<HTMLDivElement>(null);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [descVal, setDescVal] = useState("");
  const [dueVal, setDueVal] = useState("");
  const [renderNow] = useState(() => Date.now());
  const [moveToStageSSC, setMoveToStageSSC] = useState<string>(""); // selected pipeline for 2-step move

  const key = SubtaskKey.make(stageId, taskSub.id);
  const dueDate = subtaskDueDates[key];

  const commitRenameSSC = () => {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== taskSub.text) renameSubtask(stageId, taskSub.id, trimmed);
  };
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
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "HTML" || target.tagName === "BODY") return;
      if (target.closest?.("[data-no-close]")) return;
      if (subtaskRef.current && !subtaskRef.current.contains(target as Node)) {
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
  const isClaimed = (claims?.[key] || []).includes(currentUser || "");
  const claimers = claims?.[key] || [];

  return (
    <div ref={subtaskRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell t={t} borderColor={t.border} pipelineColor={pipelineColor}>
      {/* Top row — identical structure to TaskCard */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.3, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: pipelineColor }}>⤷</span>
            {editOpen
              ? <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { commitRenameSSC(); setEditOpen(false); } if (e.key === "Escape") setEditOpen(false); }}
                  onBlur={commitRenameSSC}
                  onClick={e => e.stopPropagation()}
                  data-no-close
                  style={{ flex: 1, fontSize: 15, fontWeight: 700, color: t.text, background: t.accent + "08", border: `2px dashed ${t.accent}55`, borderRadius: 6, padding: "2px 6px", outline: "none", fontFamily: "inherit" }}
                />
              : <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{taskSub.text}</span>
            }
          </div>
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pipelineIcon} {parentStageName}
            {dueDate && (() => {
              const due = new Date(`${dueDate}T23:59:59`);
              const ms = due.getTime() - renderNow;
              const soon = ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
              const expired = ms < 0;
              const color = expired ? t.red : soon ? t.amber : t.textDim;
              return <span style={{ color, fontWeight: expired || soon ? 800 : 500, marginLeft: 4 }}>· due {formatDueDate(dueDate)}</span>;
            })()}
            {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ""}</span>}
          </div>
          {subtaskDescOverrides[key] && (
            <div style={{ fontSize: 11, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", lineHeight: 1.45, marginTop: 2 }}>{subtaskDescOverrides[key]}</div>
          )}
        </div>
        {/* Right side: claimer avatars + claim button — same as TaskCard */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <ClaimerPills claimerIds={claimers} users={users} getPoints={getPoints} t={t} variant="pill" size={16} />
          {currentUser && handleClaim && !readOnly && (
            <ClaimChip claimed={isClaimed} pipelineColor={pipelineColor} t={t} onClaim={() => handleClaim(key)} variant="subtask" />
          )}

        </div>
      </div>

      {visibleReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visibleReactions.map(([emoji, us]) => {
            const mine = currentUser ? us.includes(currentUser) : false;
            return (
              <button key={emoji} onClick={e => { e.stopPropagation(); if (!readOnly) handleReact(key, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 12, padding: "0 8px", cursor: readOnly ? "default" : "pointer", fontSize: 13, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
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
        onReactToggle={() => { if (readOnly) return; setReactOpen(showReactPicker ? null : key); setCommentOpen(null); setAssignOpen(null); }}
        onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : key); setReactOpen(null); setAssignOpen(null); }}
        onAssignToggle={() => { if (readOnly) return; setAssignOpen(showAssignPicker ? null : key); setReactOpen(null); setCommentOpen(null); }}
        onAssign={userId => { assignTask(key, userId); setAssignOpen(null); }}
        onEmoji={emoji => { if (readOnly) return; handleReact(key, emoji); setReactOpen(null); }}
        onCopy={() => shareStage(key, `${taskSub.text} (subtask of ${parentStageName} · ${pipelineName})`)}
        copied={copied === key}
        onArchive={readOnly ? undefined : () => setArchiveConfirm(true)}
        archiveLabel="archive"
        showEditButton={!readOnly}
        showEditInput={editOpen}
        onEditToggle={() => {
          if (!editOpen) {
            setEditVal(taskSub.text); setDescVal(subtaskDescOverrides[key] || ""); setDueVal(dueDate || ""); setMoveToStageSSC(""); setReactOpen(null); setCommentOpen(null); setAssignOpen(null);
          } else {
            commitRenameSSC();
            if (descVal !== (subtaskDescOverrides[key] || "")) setSubtaskDescOverride(key, descVal.trim() || null);
            if (dueVal !== (dueDate || "")) setSubtaskDueDate(key, dueVal || null);
          }
          setEditOpen(!editOpen);
        }}
        readOnly={readOnly}
      />
      {editOpen && !readOnly && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", background: t.accent + "08", border: `1px dashed ${t.accent}55`, borderRadius: 10, marginTop: 4 }} data-no-close>
          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>// description</span>
            <textarea
              value={descVal}
              onChange={e => setDescVal(e.target.value)}
              onBlur={() => { setSubtaskDescOverride(key, descVal.trim() || null); }}
              placeholder="Add a description..."
              rows={2}
              data-no-close
              style={{ fontSize: 11, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 6px", resize: "none" as const, outline: "none", fontFamily: "var(--font-dm-sans), sans-serif", lineHeight: 1.5 }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>// due date</span>
            <input
              type="date"
              value={dueVal}
              onChange={e => setDueVal(e.target.value)}
              onBlur={() => { if (dueVal !== (dueDate || "")) setSubtaskDueDate(key, dueVal || null); }}
              data-no-close
              style={{ fontSize: 11, color: t.textMuted, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 6px", outline: "none", fontFamily: "var(--font-dm-mono), monospace" }}
            />
          </div>
          {/* Move to a different parent stage */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{moveToStageSSC === "" ? "// move to → pick pipeline" : "// move to → pick parent task"}</span>
            {moveToStageSSC === "" ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(allPipelinesGlobal || []).map((p: { id: string; name: string; icon: string }) => (
                  <button
                    key={p.id}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setMoveToStageSSC(p.id); }}
                    data-no-close
                    style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}
                  >{p.icon} {p.name}</button>
                ))}
              </div>
            ) : (() => {
              const pipe = allPipelinesGlobal.find((p: { id: string }) => p.id === moveToStageSSC);
              const pipeStages = pipe ? [...(pipe as { stages: string[] }).stages, ...(allCustomStages[moveToStageSSC] || [])].filter((s: string) => !(archivedStages || []).includes(s) && s !== stageId) : [];
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                  <button
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setMoveToStageSSC(""); }}
                    data-no-close
                    style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}
                  >← back</button>
                  {pipeStages.length === 0 && <span style={{ fontSize: 10, color: t.textDim, fontStyle: "italic" }}>no stages in this pipeline</span>}
                  {pipeStages.map((s: string) => (
                    <button
                      key={s}
                      onMouseDown={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        migrateSubtask(key as Parameters<typeof migrateSubtask>[0], s);
                        setMoveToStageSSC("");
                        setEditOpen(false);
                      }}
                      data-no-close
                      style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}
                    >{stageNameOverrides?.[s] || s}</button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      <ConfirmModal
        open={archiveConfirm}
        title="archive this subtask?"
        body="This subtask will be moved to the archive."
        confirmLabel="archive"
        danger={true}
        onConfirm={() => { archiveSubtask(key); setEditOpen(false); setArchiveConfirm(false); }}
        onCancel={() => setArchiveConfirm(false)}
        t={t}
      />

      {showCommentPopover && (
        <CommentPopover
          t={t}
          users={users}
          comments={cmts}
          currentUser={currentUser}
          inputValue={commentInput[key] || ""}
          onInputChange={v => setCommentInput(prev => ({ ...prev, [key]: v }))}
          onSend={() => addComment(key)}
          onDelete={(commentId) => deleteComment(key, commentId)}
          readOnly={false}
        />
      )}
    </CardShell>
    </div>
  );
}

// ─── Subtask as first-class kanban item ──────────────────────────────────────

function SubtaskKanbanCard({
  sub, onRename, onDragSubtaskStart, onDragSubtaskEnd,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, deleteComment, commentInput, setCommentInput, copied,
  isAdmin, getPoints, readOnly,
}: {
  sub: SubtaskKanbanTask; isMine: boolean; onRename?: (taskId: number, text: string) => void;
  onDragSubtaskStart?: () => void; onDragSubtaskEnd?: () => void;
} & SharedCardProps) {
  const { handleClaim, claims, approvedSubtasks, approveSubtask, archiveSubtask, migrateSubtask, allPipelinesGlobal, customStages, stageNameOverrides, archivedStages, subtaskDescOverrides, setSubtaskDescOverride, subtaskDueDates, setSubtaskDueDate } = useModel();
  const [, setIsHovered] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editVal, setEditVal] = useState("");
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [moveToStage, setMoveToStage] = useState<string>(""); // selected pipeline for 2-step move
  const [descVal, setDescVal] = useState("");
  const [renderNow] = useState(() => Date.now());
  const [dueVal, setDueVal] = useState("");
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
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === "HTML" || target.tagName === "BODY") return;
      if (target.closest?.("[data-no-close]")) return;
      if (subtaskRef.current && !subtaskRef.current.contains(target as Node)) {
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
  const isUnknownParent = !sub.pipelineName;
  const dueDate = subtaskDueDates[sub.key];
  const taskId = SubtaskKey.parse(sub.key as Parameters<typeof SubtaskKey.parse>[0])?.subtaskId ?? NaN;

  const commitRename = () => {
    const trimmed = editVal.trim();
    if (trimmed && onRename) onRename(taskId, trimmed);
  };

  return (
    <div ref={subtaskRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell
        t={t}
        borderColor={isUnknownParent ? t.amber + "55" : t.border}
        pipelineColor={sub.pipelineColor}
        draggable={!readOnly}
        onDragStart={!readOnly ? e => { e.dataTransfer.setData("subtaskKey", sub.key); e.dataTransfer.effectAllowed = "move"; onDragSubtaskStart?.(); } : undefined}
        onDragEnd={!readOnly ? onDragSubtaskEnd : undefined}
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
                    onKeyDown={e => { if (e.key === "Enter") { commitRename(); setEditOpen(false); } if (e.key === "Escape") setEditOpen(false); }}
                    onBlur={commitRename}
                    onClick={e => e.stopPropagation()}
                    data-no-close
                    style={{ fontSize: 15, fontWeight: 700, color: t.text, background: t.accent + "08", border: `2px dashed ${t.accent}55`, borderRadius: 6, padding: "2px 6px", outline: "none", width: "100%", fontFamily: "inherit" }}
                  />
                : <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.text}</span>
              }
            </div>
            <div style={{ fontSize: 11, color: isUnknownParent ? t.amber : t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {isUnknownParent
                ? <span style={{ color: t.amber }}>⚠ unknown parent</span>
                : <>{sub.pipelineIcon} {sub.parentStageName}</>}
              <span style={{ color: t.accent, fontWeight: 700, marginLeft: 4 }}>· {sub.points}pts</span>
              {dueDate && (() => {
                const due = new Date(`${dueDate}T23:59:59`);
                const ms = due.getTime() - renderNow;
                const soon = ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
                const expired = ms < 0;
                const color = expired ? t.red : soon ? t.amber : t.textDim;
                return <span style={{ color, fontWeight: expired || soon ? 800 : 500, marginLeft: 4 }}>· due {formatDueDate(dueDate)}</span>;
              })()}
              {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ""}</span>}
            </div>
            {subtaskDescOverrides[sub.key] && (
              <div style={{ fontSize: 11, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", lineHeight: 1.45, marginTop: 2 }}>{subtaskDescOverrides[sub.key]}</div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {(() => {
              const subClaimers = claims[sub.key] || [];
              const isClaimedByMe = currentUser ? subClaimers.includes(currentUser) : false;
              const isApproved = approvedSubtasks.includes(sub.key);
              const isPending = sub.done && !isApproved;
              return (
                <>
                  <ClaimerPills claimerIds={subClaimers} users={users} getPoints={getPoints} t={t} variant="pill" size={16} />
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
                  {/* ClaimChip — same gating as TaskCard: hidden only when (pending && admin) or already approved */}
                  {currentUser && !readOnly && !(isPending && isAdmin) && !isApproved && (
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
              <button key={emoji} onClick={e => { e.stopPropagation(); if (!readOnly) handleReact(sub.key, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 12, padding: "0 8px", cursor: readOnly ? "default" : "pointer", fontSize: 13, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
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
          onReactToggle={() => { if (readOnly) return; setReactOpen(showReactPicker ? null : sub.key); setCommentOpen(null); setAssignOpen(null); }}
          onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : sub.key); setReactOpen(null); setAssignOpen(null); }}
          onAssignToggle={() => { if (readOnly) return; setAssignOpen(showAssignPicker ? null : sub.key); setReactOpen(null); setCommentOpen(null); }}
          onAssign={userId => { assignTask(sub.key, userId); setAssignOpen(null); }}
          onEmoji={emoji => { if (readOnly) return; handleReact(sub.key, emoji); setReactOpen(null); }}
          onCopy={() => shareStage(sub.key, `${sub.text} (subtask · ${sub.pipelineName})`)}
          copied={copied === sub.key}
          onArchive={readOnly ? undefined : () => setArchiveConfirm(true)}
          archiveLabel="archive"
          showEditButton={!readOnly}
          showEditInput={editOpen}
          onEditToggle={() => {
            if (!editOpen) {
              setEditVal(sub.text); setDescVal(subtaskDescOverrides[sub.key] || ""); setDueVal(dueDate || ""); setMoveToStage(""); setReactOpen(null); setCommentOpen(null); setAssignOpen(null);
            } else {
              commitRename();
              if (descVal !== (subtaskDescOverrides[sub.key] || "")) setSubtaskDescOverride(sub.key, descVal.trim() || null);
              if (dueVal !== (dueDate || "")) setSubtaskDueDate(sub.key, dueVal || null);
            }
            setEditOpen(!editOpen);
          }}
          readOnly={readOnly}
        />
        {editOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px", background: t.accent + "08", border: `1px dashed ${t.accent}55`, borderRadius: 10, marginTop: 4 }} data-no-close>
            {/* Description */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>// description</span>
              <textarea
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                onBlur={() => { setSubtaskDescOverride(sub.key, descVal.trim() || null); }}
                placeholder="Add a description..."
                rows={2}
                data-no-close
                style={{ fontSize: 11, color: t.text, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 6px", resize: "none" as const, outline: "none", fontFamily: "var(--font-dm-sans), sans-serif", lineHeight: 1.5 }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>// due date</span>
              <input
                type="date"
                value={dueVal}
                onChange={e => setDueVal(e.target.value)}
                onBlur={() => { if (dueVal !== (dueDate || "")) setSubtaskDueDate(sub.key, dueVal || null); }}
                data-no-close
                style={{ fontSize: 11, color: t.textMuted, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 6px", outline: "none", fontFamily: "var(--font-dm-mono), monospace" }}
              />
            </div>
            {/* Move to a different parent stage — button-based to avoid native-select click-outside issues */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{moveToStage === "" ? "// move to → pick pipeline" : "// move to → pick parent task"}</span>
              {moveToStage === "" ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(allPipelinesGlobal || []).length === 0 && <span style={{ fontSize: 10, color: t.textDim, fontStyle: "italic" }}>no pipelines available</span>}
                  {(allPipelinesGlobal || []).map((p: { id: string; name: string; icon: string }) => (
                    <button
                      key={p.id}
                      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setMoveToStage(p.id); }}
                      data-no-close
                      style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}
                    >{p.icon} {p.name}</button>
                  ))}
                </div>
              ) : (() => {
                const pipe = allPipelinesGlobal.find((p: { id: string }) => p.id === moveToStage);
                const pipeStages = pipe ? [...(pipe as { stages: string[] }).stages, ...(customStages[moveToStage] || [])].filter((s: string) => !(archivedStages || []).includes(s) && s !== sub.parentStageId) : [];
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                    <button
                      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setMoveToStage(""); }}
                      data-no-close
                      style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "2px 6px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}
                    >← back</button>
                    {pipeStages.length === 0 && <span style={{ fontSize: 10, color: t.textDim, fontStyle: "italic" }}>no stages in this pipeline</span>}
                    {pipeStages.map((s: string) => (
                      <button
                        key={s}
                        onMouseDown={e => {
                          e.stopPropagation();
                          e.preventDefault();
                          migrateSubtask(sub.key as Parameters<typeof migrateSubtask>[0], s);
                          setMoveToStage("");
                          setEditOpen(false);
                        }}
                        data-no-close
                        style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.accent}55`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}
                      >{stageNameOverrides?.[s] || s}</button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        <ConfirmModal
          open={archiveConfirm}
          title="archive this subtask?"
          body="This subtask will be moved to the archive."
          confirmLabel="archive"
          danger={true}
          onConfirm={() => { archiveSubtask(sub.key); setEditOpen(false); setArchiveConfirm(false); }}
          onCancel={() => setArchiveConfirm(false)}
          t={t}
        />

        {showCommentPopover && (
          <CommentPopover
            t={t}
            users={users}
            comments={cmts}
            currentUser={currentUser}
            inputValue={commentInput[sub.key] || ""}
            onInputChange={v => setCommentInput(prev => ({ ...prev, [sub.key]: v }))}
            onSend={() => addComment(sub.key)}
            onDelete={(commentId) => deleteComment(sub.key, commentId)}
            readOnly={false}
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

function ActionRow({ t, showReactPicker, showCommentPopover, showAssignPicker, commentCount, assignee, assignees, users, onReactToggle, onCommentToggle, onAssignToggle, onAssign, onEmoji, onCopy, copied, onArchive, archiveLabel, onEditToggle, showEditInput, showEditButton, compact, readOnly, isHovered }: {
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
  onEmoji: (emoji: string) => void; onCopy: () => void; copied: boolean; onArchive?: () => void; archiveLabel?: string; onEditToggle?: () => void; showEditInput?: boolean; showEditButton?: boolean; compact?: boolean; readOnly?: boolean;
  /** parent card hover state — controls fade-in of secondary actions (copy/archive) */
  isHovered?: boolean;
}) {
  const assigneeList = assignees && assignees.length > 0 ? assignees : (assignee ? [assignee] : []);
  const iconBtn: React.CSSProperties = {
    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8,
    padding: compact ? "3px 6px" : "3px 7px", cursor: "pointer",
    fontSize: compact ? 9 : 10, color: t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4,
    whiteSpace: "nowrap" as const,
    minHeight: compact ? 26 : 30,
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
  };
  const activeBtn = (active: boolean, color = t.accent): React.CSSProperties => ({
    ...iconBtn,
    background: active ? color + "16" : "transparent",
    borderColor: active ? color + "66" : t.border,
    color: active ? color : t.textMuted,
  });

  // Secondary (rarely-used) actions fade in on hover — opacity stays clickable for touch
  const secondaryStyle: React.CSSProperties = {
    opacity: isHovered ? 1 : 0.35,
    transition: "opacity 0.18s",
  };
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", paddingTop: compact ? 8 : 10, marginTop: 0, flexWrap: "wrap" }}>
      {!readOnly && <div style={{ position: "relative" }}>
        <button onClick={e => { e.stopPropagation(); onReactToggle(); }} style={activeBtn(showReactPicker)} title="Add reaction">
          😀 <span style={{ fontSize: 10 }}>+</span>
        </button>
        {showReactPicker && (
          <div data-no-close onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 200 }}>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => onEmoji(emoji)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, padding: "4px 4px", borderRadius: 8 }}>{emoji}</button>
            ))}
          </div>
        )}
      </div>}
      <button onClick={e => { e.stopPropagation(); onCommentToggle(); }} style={activeBtn(showCommentPopover)} title="Comments">
        💬 <span style={{ fontSize: 10 }}>{commentCount}</span>
      </button>
      {!readOnly && <div style={{ position: "relative" }}>
        <button
          onClick={e => { e.stopPropagation(); onAssignToggle(); }}
          style={{
            ...activeBtn(showAssignPicker, assigneeList[0]?.color || t.accent),
            color: assigneeList.length > 0 ? assigneeList[0].color : (showAssignPicker ? t.accent : t.textMuted),
            borderColor: assigneeList.length > 0 ? assigneeList[0].color + "55" : (showAssignPicker ? t.accent + "66" : t.border),
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
          <div data-no-close onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 200, minWidth: 200 }}>
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
      </div>}
      <button onClick={e => { e.stopPropagation(); onCopy(); }} style={iconBtn} title={copied ? "Copied" : "Copy link"}>
        {copied ? "✓" : "📋"}
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
            width: showEditInput ? "auto" : 28,
            height: 28,
            padding: showEditInput ? "0 9px" : 0,
            cursor: "pointer",
            fontSize: showEditInput ? 10 : 13,
            fontFamily: "var(--font-dm-mono), monospace",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: showEditInput ? t.accent : t.textMuted,
            transition: "all 0.15s",
            boxShadow: showEditInput ? `0 2px 8px ${t.accent}33` : "none",
          }}
        >
          {showEditInput ? "✓ save" : "✎"}
        </button>
      )}
    </div>
  );
}

function CommentPopover({ t, users, comments, currentUser, inputValue, onInputChange, onSend, onDelete, readOnly }: {
  t: T; users: UserType[]; comments: CommentItem[];
  currentUser: string | null; inputValue: string; onInputChange: (v: string) => void; onSend: () => void; onDelete: (commentId: number) => void; readOnly?: boolean;
}) {
  // @mention autocomplete: detect "@word" at cursor and surface user matches
  const mentionMatch = inputValue.match(/(^|\s)@([\w-]*)$/);
  const mentionQuery = mentionMatch ? (mentionMatch[2] || "").toLowerCase() : null;
  const mentionMatches = mentionQuery !== null
    ? users.filter(u => {
        const firstName = u.name.split(" ")[0].toLowerCase();
        return firstName.startsWith(mentionQuery) || u.id.toLowerCase().startsWith(mentionQuery);
      }).slice(0, 6)
    : [];
  const insertMention = (u: UserType) => {
    if (!mentionMatch) return;
    const firstName = u.name.split(" ")[0];
    const idx = inputValue.lastIndexOf("@");
    const before = inputValue.slice(0, idx);
    onInputChange(`${before}@${firstName} `);
  };
  return (
    <div data-no-close onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 12, padding: 8, marginTop: 0 }}>
      <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginBottom: 6, textTransform: "uppercase" as const }}>
        comments ({comments.length})
      </div>
      {comments.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
          {comments.slice(-5).map(c => {
            const u = resolveCommentUser(users, c.by);
            return (
              <div key={c.id} style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                <AvatarC user={u} size={18} />
	                <div style={{ flex: 1, minWidth: 0 }}>
	                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
	                    <div style={{ fontSize: 10, color: u.color, fontWeight: 700, flex: 1 }}>{u.name}</div>
	                    {(c.by === currentUser || ADMIN_IDS.includes(currentUser!)) && (
	                      <button type="button" onClick={() => onDelete(c.id)} style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", fontSize: 10, fontFamily: "var(--font-dm-mono), monospace" }}>delete</button>
	                    )}
	                  </div>
	                  <div style={{ fontSize: 13, color: t.text, wordBreak: "break-word" }}>{c.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: t.textDim, fontStyle: "italic", marginBottom: 8 }}>no comments yet</div>
      )}
      {!readOnly && <div style={{ position: "relative" as const }}>
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div data-no-close onMouseDown={e => e.stopPropagation()} style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 250 }}>
            {mentionMatches.map(u => (
              <div
                key={u.id}
                data-no-close
                onMouseDown={e => { e.preventDefault(); e.stopPropagation(); insertMention(u); }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12, color: t.text }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.accent + "22"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <AvatarC user={u} size={16} />
                <span style={{ fontWeight: 600 }}>{u.name.split(" ")[0]}</span>
                <span style={{ fontSize: 10, color: t.textDim }}>{u.role}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 4 }}>
          <input
            data-no-close
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && mentionQuery !== null && mentionMatches.length > 0) {
                e.preventDefault();
                insertMention(mentionMatches[0]);
                return;
              }
              if (e.key === "Enter") { e.preventDefault(); onSend(); }
            }}
            placeholder="// add a comment... (@name to mention)"
            style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
          />
          <button data-no-close onMouseDown={e => e.stopPropagation()} onClick={onSend} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>send</button>
        </div>
      </div>}
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
