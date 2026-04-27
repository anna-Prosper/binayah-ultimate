"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { T } from "@/lib/themes";
import { REACTIONS, type SubtaskItem, type UserType, type CommentItem } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  allPipelines: Pipeline[];
  customStages: Record<string, string[]>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  subtasks: Record<string, SubtaskItem[]>;
  claims: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  comments: Record<string, CommentItem[]>;
  getStatus: (name: string) => string;
  users: UserType[];
  currentUser: string | null;
  handleClaim: (sid: string) => void;
  handleReact: (sid: string, emoji: string) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  shareStage: (name: string, text: string) => void;
  addComment: (sid: string) => void;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  copied: string | null;
  isLocked: (pipelineId: string) => boolean;
  setStageStatus: (name: string, status: string) => void;
  approvedStages: string[];
  approveStage: (name: string) => void;
  isAdmin: boolean;
  assignments: Record<string, string>;
  assignTask: (sid: string, userId: string | null) => void;
  ck: Record<string, string>;
  // Optional cross-workspace mode props
  showMyAllFilter?: boolean;
  defaultMyAllFilter?: "my" | "all";
  pipelineWorkspaceMap?: Record<string, { id: string; name: string; icon: string }>;
  headerLabel?: string;
  // Optional name/stage editing props
  stageNameOverrides?: Record<string, string>;
  setStageNameOverride?: (name: string, val: string) => void;
  subtaskStages?: Record<string, string>;
  setSubtaskStage?: (key: string, status: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

// Columns in the now-tab kanban — these map 1:1 to stage statuses
const COLS = [
  { status: "planned",     label: "planned",     colorKey: "cyan"  },
  { status: "in-progress", label: "in progress", colorKey: "amber" },
  { status: "active",      label: "done",        colorKey: "green" },
  { status: "blocked",     label: "blocked",     colorKey: "red"   },
];

export default function TasksView(props: Props) {
  const { t, allPipelines, customStages, pipeMetaOverrides, subtasks, claims, reactions, comments, getStatus, users, currentUser, handleClaim, handleReact, toggleSubtask, shareStage, addComment, commentInput, setCommentInput, copied, isLocked, setStageStatus, approvedStages, approveStage, isAdmin, assignments, assignTask, ck, showMyAllFilter, defaultMyAllFilter, pipelineWorkspaceMap, headerLabel, stageNameOverrides, setStageNameOverride, subtaskStages, setSubtaskStage } = props;

  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [myAllFilter, setMyAllFilter] = useState<"my" | "all">(defaultMyAllFilter || "all");
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState("");

  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
    locked: isLocked(p.id),
  }));

  // Every non-concept stage becomes a task
  const allStageTasks = pipelines.flatMap(p => {
    const ws = pipelineWorkspaceMap?.[p.id];
    return p.allStages
      .filter(s => getStatus(s) !== "concept")
      .map(s => ({
        stageId: s,
        displayName: stageNameOverrides?.[s] || s,
        pipelineName: p.displayName,
        pipelineIcon: p.icon,
        pipelineColor: p.color,
        status: getStatus(s),
        claimers: claims[s] || [],
        locked: p.locked,
        workspaceIcon: ws?.icon,
        workspaceName: ws?.name,
      }));
  });

  // Apply my/all filter when in cross-workspace mode
  const stageTasks = (showMyAllFilter && myAllFilter === "my")
    ? allStageTasks.filter(s => currentUser ? (s.claimers.includes(currentUser) || assignments[s.stageId] === currentUser) : false)
    : allStageTasks;

  // Build virtual subtask kanban tasks
  const subtaskKanbanTasks = useMemo(() => {
    const tasks: SubtaskKanbanTask[] = [];
    for (const [parentStageId, subtaskList] of Object.entries(subtasks || {})) {
      for (const sub of subtaskList) {
        if (sub.done) continue; // Skip done subtasks
        const key = `${parentStageId}::${sub.id}`;
        // Find parent stage info
        let parentStageName = stageNameOverrides?.[parentStageId] || parentStageId;
        let pipelineIcon = "";
        let pipelineName = "";
        let pipelineColor = "";
        // Find which pipeline this stage belongs to
        for (const p of pipelines) {
          if (p.allStages.includes(parentStageId)) {
            pipelineIcon = p.icon;
            pipelineName = p.displayName;
            pipelineColor = p.color;
            break;
          }
        }
        // Get subtask stage status from subtaskStages or default to "planned"
        const status = subtaskStages?.[key] || "planned";
        tasks.push({
          key,
          text: sub.text,
          parentStageId,
          parentStageName,
          pipelineIcon,
          pipelineName,
          pipelineColor,
          status,
          done: sub.done,
          by: sub.by,
          locked: sub.locked || false,
        });
      }
    }
    return tasks;
  }, [subtasks, subtaskStages, stageNameOverrides, pipelines]);

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

  const cardShared = {
    t, users, currentUser, reactions, comments,
    reactOpen, setReactOpen, commentOpen, setCommentOpen,
    assignOpen, setAssignOpen, assignments, assignTask,
    handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
    isAdmin, approveStage, approvedStages, toggleSubtask, subtasks,
    editingStage, setEditingStage: setEditingStage, editingVal, setEditingVal,
    setStageNameOverride,
    handleClaim, claims,
  };

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
          <div style={{ fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// no tasks yet</div>
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
                style={{ flex: "1 1 280px", minWidth: 260, background: isOver ? t.accent + "0a" : "transparent", borderRadius: 16, transition: "background 0.15s", padding: 0 }}
                onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(col.status, e)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, padding: "4px 4px", borderBottom: `1px solid ${stColor}33` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: stColor, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                  <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({totalCount})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {totalCount === 0
                    ? <div style={{ border: `1.5px dashed ${isOver ? t.accent + "88" : t.border}`, borderRadius: 12, padding: "24px 12px", textAlign: "center", fontSize: 10, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>drop here</div>
                    : <>
                        {colTasks.map(task => <TaskWithSubtasks key={task.stageId} task={task} isMine={isMine(task.stageId)} onClaim={() => handleClaim(task.stageId)} draggable={!task.locked} subtaskStages={subtaskStages} {...cardShared} />)}
                        {colSubtasks.map(sub => <SubtaskKanbanCard key={sub.key} sub={sub} isMine={currentUser ? (assignments[sub.key] === currentUser) : false} onDone={() => toggleSubtask(sub.parentStageId, parseInt(sub.key.split("::")[1]))} {...cardShared} />)}
                      </>
                  }
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
  status: string; claimers: string[]; locked: boolean;
  workspaceIcon?: string; workspaceName?: string;
}

interface SubtaskKanbanTask {
  key: string;
  text: string;
  parentStageId: string;
  parentStageName: string;
  pipelineIcon: string;
  pipelineName: string;
  pipelineColor: string;
  status: string;
  done: boolean;
  by: string;
  locked: boolean;
}

interface SharedCardProps {
  t: T;
  users: UserType[];
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
  assignments: Record<string, string>;
  assignTask: (sid: string, userId: string | null) => void;
}

function TaskWithSubtasks({ task, isMine, onClaim, draggable: isDraggable, ...shared }: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps & { subtaskStages?: Record<string, string> }) {
  const { subtasks, toggleSubtask, subtaskStages } = shared as SharedCardProps & { subtaskStages?: Record<string, string> };
  const taskSubs = (subtasks[task.stageId] || []).filter(s => !s.done && !subtaskStages?.[`${task.stageId}::${s.id}`]);
  // Don't show subtasks under "done" stages — completion is implied
  const showSubs = task.status !== "active";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <TaskCard task={task} isMine={isMine} onClaim={onClaim} draggable={isDraggable} {...shared} />
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
  editingStage, setEditingStage, editingVal, setEditingVal, setStageNameOverride,
}: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps & { editingStage?: string | null; setEditingStage?: (v: string | null) => void; editingVal?: string; setEditingVal?: (v: string) => void; setStageNameOverride?: (name: string, val: string) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [setReactOpen, setCommentOpen, setAssignOpen]);

  const isDone = task.status === "active";
  const isApproved = approvedStages.includes(task.stageId);
  const isPending = isDone && !isApproved;
  const rxs = reactions[task.stageId] || {};
  const cmts = comments[task.stageId] || [];
  const showReactPicker = reactOpen === task.stageId;
  const showCommentPopover = commentOpen === task.stageId;
  const showAssignPicker = assignOpen === task.stageId;
  const assigneeId = assignments[task.stageId];
  const assignee = assigneeId ? users.find(u => u.id === assigneeId) : null;
  const subCount = (subtasks[task.stageId] || []).length;
  const subDone = (subtasks[task.stageId] || []).filter(s => s.done).length;
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);

  return (
    <div ref={cardRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell
        t={t}
        borderColor={isPending ? t.amber + "55" : isMine ? task.pipelineColor + "55" : t.border}
        draggable={isDraggable}
        onDragStart={isDraggable ? e => { e.dataTransfer.setData("stageId", task.stageId); e.dataTransfer.effectAllowed = "move"; } : undefined}
      >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, border: editOpen ? `2px solid ${t.accent}55` : "none", borderRadius: editOpen ? 8 : 0, padding: editOpen ? 6 : 0, marginLeft: editOpen ? -6 : 0, marginRight: editOpen ? -6 : 0, marginTop: editOpen ? -6 : 0 }}>
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
                }
              }}
              onBlur={() => {
                if (editingVal && editingVal !== (task.displayName || task.stageId)) {
                  setStageNameOverride?.(task.stageId, editingVal);
                }
                setEditingStage?.(null);
              }}
              style={{ fontSize: 15, fontWeight: 700, color: t.text, border: `2px solid ${t.accent}`, borderRadius: 6, padding: "2px 4px", width: "100%", fontFamily: "inherit" }}
            />
          ) : (
            <div title={task.stageId} style={{ fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3, border: editOpen ? `2px solid ${t.accent}33` : "none", borderRadius: editOpen ? 6 : 0, padding: editOpen ? "2px 4px" : 0, marginLeft: editOpen ? -2 : 0, marginRight: editOpen ? -2 : 0 }}>{task.displayName}</div>
          )}
          <div title={`${task.workspaceName ? task.workspaceName + " · " : ""}${task.pipelineName}`} style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3, border: editOpen ? `2px solid ${t.accent}33` : "none", borderRadius: editOpen ? 6 : 0, padding: editOpen ? "2px 4px" : 0, marginLeft: editOpen ? -2 : 0, marginRight: editOpen ? -2 : 0 }}>
            {task.workspaceIcon && task.workspaceName && <>{task.workspaceIcon} {task.workspaceName} · </>}
            {task.pipelineIcon} {task.pipelineName}
            {subCount > 0 && <span style={{ color: subDone === subCount ? t.green : t.textDim, marginLeft: 4 }}>{subDone}/{subCount}</span>}
            {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}</span>}
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
          {isPending && isAdmin && (
            <button onClick={e => { e.stopPropagation(); approveStage(task.stageId); }} style={btn(t.green, t.green + "22", t.green + "88")} title="Captain approval — awards points to claimers">
              ✓ approve
            </button>
          )}
          {isPending && !isAdmin && <span style={badge(t.amber)}>⏳ pending</span>}
          {isDone && isApproved && <span style={badge(t.green)}>✓ approved</span>}
          {currentUser && !(isPending && isAdmin) && !isApproved && (
            <button onClick={e => { e.stopPropagation(); onClaim(); }} style={btn(isMine ? t.green : task.pipelineColor, isMine ? t.green + "18" : task.pipelineColor + "15", isMine ? t.green + "55" : task.pipelineColor + "55")}>
              {isMine ? "✓ claimed" : "claim"}
            </button>
          )}
        </div>
      </div>

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
        assignee={assignee}
        users={users}
        onReactToggle={() => { setReactOpen(showReactPicker ? null : task.stageId); setCommentOpen(null); setAssignOpen(null); setEditOpen(false); }}
        onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : task.stageId); setReactOpen(null); setAssignOpen(null); setEditOpen(false); }}
        onAssignToggle={() => { setAssignOpen(showAssignPicker ? null : task.stageId); setReactOpen(null); setCommentOpen(null); setEditOpen(false); }}
        onAssign={userId => { assignTask(task.stageId, userId); setAssignOpen(null); }}
        onEmoji={emoji => { handleReact(task.stageId, emoji); setReactOpen(null); }}
        onCopy={() => shareStage(task.stageId, `${task.stageId} — ${task.pipelineIcon} ${task.pipelineName}`)}
        copied={copied === task.stageId}
        onEditToggle={() => { setEditOpen(!editOpen); setReactOpen(null); setCommentOpen(null); setAssignOpen(null); setEditingStage?.(null); }}
        showEditButton={true}
        showEditInput={editOpen}
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subtaskRef.current && !subtaskRef.current.contains(e.target as Node)) {
        setReactOpen(null);
        setCommentOpen(null);
        setAssignOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setReactOpen, setCommentOpen, setAssignOpen]);

  const key = `${stageId}::${taskSub.id}`;
  const rxs = reactions[key] || {};
  const cmts = comments[key] || [];
  const showReactPicker = reactOpen === key;
  const showCommentPopover = commentOpen === key;
  const showAssignPicker = assignOpen === key;
  const assigneeId = assignments[key];
  const assignee = assigneeId ? users.find(u => u.id === assigneeId) : null;
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);
  const creator = users.find(u => u.id === taskSub.by);
  const isClaimed = (claims?.[key] || []).includes(currentUser || "");
  const claimers = claims?.[key] || [];

  return (
    <div ref={subtaskRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell t={t} borderColor={pipelineColor + "33"} compact={false}>
      {/* Header with visual indicator */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, paddingBottom: 4, borderBottom: `1px solid ${pipelineColor}22` }}>
        <div style={{ fontSize: 14, color: pipelineColor, fontWeight: 700 }}>⤷</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div title={taskSub.text} style={{ fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>{taskSub.text}</div>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
            <span>{pipelineIcon} {parentStageName}</span>
            {assignee && <span style={{ color: assignee.color, fontWeight: 700 }}>→ {assignee.name}</span>}
          </div>
        </div>
      </div>

      {/* Bottom row: creator + claim/assign actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "space-between", paddingTop: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
          {creator && (
            <AvatarC user={creator} size={18} />
          )}
          {claimers.length > 0 && (
            <div style={{ display: "flex", gap: -4 }}>
              {claimers.slice(0, 2).map(id => {
                const u = users.find(u => u.id === id);
                return u ? <AvatarC key={id} user={u} size={16} /> : null;
              })}
            </div>
          )}
          {visibleReactions.length > 0 && (
            <div style={{ display: "flex", gap: 2 }}>
              {visibleReactions.slice(0, 2).map(([emoji]) => (
                <span key={emoji} style={{ fontSize: 11 }}>{emoji}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          {currentUser && handleClaim && (
            <button onClick={e => { e.stopPropagation(); handleClaim(key); }} style={btn(isClaimed ? pipelineColor : pipelineColor, isClaimed ? pipelineColor + "18" : pipelineColor + "15", isClaimed ? pipelineColor + "55" : pipelineColor + "55", true)}>
              {isClaimed ? "✓" : "+"}
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); setAssignOpen(showAssignPicker ? null : key); }} style={btn(assignee ? assignee.color : pipelineColor, assignee ? assignee.color + "18" : pipelineColor + "15", assignee ? assignee.color + "55" : pipelineColor + "55", true)} title={assignee ? `Assigned to ${assignee.name}` : "Assign"}>
            👤
          </button>
          {currentUser && (
            <button onClick={e => { e.stopPropagation(); onToggle(); }} style={btn(pipelineColor, pipelineColor + "15", pipelineColor + "55", true)} title="Mark done">
              ✓
            </button>
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
        assignee={assignee}
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
  sub, isMine, onDone,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
}: {
  sub: SubtaskKanbanTask; isMine: boolean; onDone: () => void;
} & SharedCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const subtaskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subtaskRef.current && !subtaskRef.current.contains(e.target as Node)) {
        setReactOpen(null);
        setCommentOpen(null);
        setAssignOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setReactOpen, setCommentOpen, setAssignOpen]);

  const rxs = reactions[sub.key] || {};
  const cmts = comments[sub.key] || [];
  const showReactPicker = reactOpen === sub.key;
  const showCommentPopover = commentOpen === sub.key;
  const showAssignPicker = assignOpen === sub.key;
  const assigneeId = assignments[sub.key];
  const assignee = assigneeId ? users.find(u => u.id === assigneeId) : null;
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);
  const creator = users.find(u => u.id === sub.by);
  const isUnknownParent = !sub.pipelineName;

  return (
    <div ref={subtaskRef} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <CardShell
        t={t}
        borderColor={isUnknownParent ? t.amber + "44" : sub.pipelineColor + "22"}
        compact
        draggable
        onDragStart={e => { e.dataTransfer.setData("subtaskKey", sub.key); e.dataTransfer.effectAllowed = "move"; }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div title={sub.text} style={{ fontSize: 14, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>⤷ {sub.text}</div>
            <div style={{ fontSize: 10, color: isUnknownParent ? t.amber : t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3 }}>
              {isUnknownParent ? <span style={{ color: t.amber }}>⚠ unknown parent</span> : <>{sub.pipelineIcon} {sub.parentStageName}</>}
              {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            {creator && <AvatarC user={creator} size={18} />}
            {currentUser && (
              <button onClick={e => { e.stopPropagation(); onDone(); }} style={btn(sub.pipelineColor, sub.pipelineColor + "15", sub.pipelineColor + "55", true)}>
                ✓
              </button>
            )}
          </div>
        </div>

        {visibleReactions.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {visibleReactions.map(([emoji, us]) => {
              const mine = currentUser ? us.includes(currentUser) : false;
              return (
                <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(sub.key, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 10, padding: "0 6px", cursor: "pointer", fontSize: 11, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 11 }}>{emoji}</span>
                  <span style={{ fontSize: 8, fontWeight: 700 }}>{us.length}</span>
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
          assignee={assignee}
          users={users}
          onReactToggle={() => { setReactOpen(showReactPicker ? null : sub.key); setCommentOpen(null); setAssignOpen(null); }}
          onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : sub.key); setReactOpen(null); setAssignOpen(null); }}
          onAssignToggle={() => { setAssignOpen(showAssignPicker ? null : sub.key); setReactOpen(null); setCommentOpen(null); }}
          onAssign={userId => { assignTask(sub.key, userId); setAssignOpen(null); }}
          onEmoji={emoji => { handleReact(sub.key, emoji); setReactOpen(null); }}
          onCopy={() => shareStage(sub.key, `${sub.text} (subtask · ${sub.pipelineName})`)}
          copied={copied === sub.key}
          compact
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

function CardShell({ t, borderColor, compact, draggable: isDraggable, onDragStart, children }: {
  t: T; borderColor: string; compact?: boolean;
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onClick={e => e.stopPropagation()}
      style={{
        background: t.bgCard,
        border: `1px solid ${borderColor}`,
        borderRadius: compact ? 10 : 12,
        padding: compact ? "10px 12px" : "14px 16px",
        display: "flex", flexDirection: "column", gap: compact ? 6 : 8,
        cursor: isDraggable ? "grab" : "default",
        userSelect: "none",
        transition: "border-color 0.15s",
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function ActionRow({ t, showReactPicker, showCommentPopover, showAssignPicker, commentCount, assignee, users, onReactToggle, onCommentToggle, onAssignToggle, onAssign, onEmoji, onCopy, copied, onEditToggle, showEditInput, showEditButton, compact }: {
  t: T; showReactPicker: boolean; showCommentPopover: boolean; showAssignPicker: boolean;
  commentCount: number; assignee: UserType | null | undefined; users: UserType[];
  onReactToggle: () => void; onCommentToggle: () => void; onAssignToggle: () => void;
  onAssign: (userId: string | null) => void;
  onEmoji: (emoji: string) => void; onCopy: () => void; copied: boolean; onEditToggle?: () => void; showEditInput?: boolean; showEditButton?: boolean; compact?: boolean;
}) {
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
        <button onClick={e => { e.stopPropagation(); onAssignToggle(); }} style={{ ...iconBtn, color: assignee ? assignee.color : t.textMuted, borderColor: assignee ? assignee.color + "55" : t.border }} title={assignee ? `Assigned to ${assignee.name}` : "Assign to someone"}>
          👤 <span style={{ fontSize: 10 }}>{assignee ? assignee.name.toLowerCase() : "assign"}</span>
        </button>
        {showAssignPicker && (
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100, minWidth: 160 }}>
            {users.map(u => {
              const isCurrent = assignee?.id === u.id;
              return (
                <button key={u.id} onClick={() => onAssign(isCurrent ? null : u.id)} style={{ background: isCurrent ? u.color + "22" : "transparent", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: isCurrent ? u.color : t.text, fontWeight: isCurrent ? 700 : 500, fontFamily: "var(--font-dm-mono), monospace", textAlign: "left" }}>
                  <AvatarC user={u} size={24} />
                  <span style={{ flex: 1 }}>{u.name}</span>
                  {isCurrent && <span style={{ fontSize: 10 }}>✓</span>}
                </button>
              );
            })}
            {assignee && (
              <button onClick={() => onAssign(null)} style={{ background: "transparent", border: `1px dashed ${t.border}`, cursor: "pointer", padding: "4px 8px", borderRadius: 8, fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 0 }}>× clear</button>
            )}
          </div>
        )}
      </div>
      <button onClick={e => { e.stopPropagation(); onCopy(); }} style={iconBtn} title="Copy">
        {copied ? "✓ copied" : "📋 copy"}
      </button>
      {onEditToggle && showEditButton && (
        <button onClick={e => { e.stopPropagation(); onEditToggle(); }} style={{ ...iconBtn, background: showEditInput ? t.accent + "18" : "transparent", borderColor: showEditInput ? t.accent + "55" : t.border, color: showEditInput ? t.accent : t.textMuted, fontWeight: showEditInput ? 700 : 500 }} title="Edit mode">
          ✏️ edit
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
    fontSize: small ? 8 : 9, color, fontWeight: 800,
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
