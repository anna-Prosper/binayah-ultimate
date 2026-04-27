"use client";

import { useState } from "react";
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
  const { t, allPipelines, customStages, pipeMetaOverrides, subtasks, claims, reactions, comments, getStatus, users, currentUser, handleClaim, handleReact, toggleSubtask, shareStage, addComment, commentInput, setCommentInput, copied, isLocked, setStageStatus, approvedStages, approveStage, isAdmin, assignments, assignTask, ck, showMyAllFilter, defaultMyAllFilter, pipelineWorkspaceMap, headerLabel } = props;

  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [myAllFilter, setMyAllFilter] = useState<"my" | "all">(defaultMyAllFilter || "all");

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

  const statusColor = (status: string) => {
    const col = COLS.find(c => c.status === status);
    return col ? (ck[col.colorKey] || t.accent) : t.textDim;
  };

  const isMine = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  const handleDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const stageId = e.dataTransfer.getData("stageId");
    if (stageId && getStatus(stageId) !== targetStatus) setStageStatus(stageId, targetStatus);
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    background: active ? t.bgCard : "transparent",
    border: "none",
    borderRadius: 12,
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    color: active ? t.text : t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace",
    letterSpacing: 0.3,
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
    transition: "all 0.18s ease",
    whiteSpace: "nowrap" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  });

  const pendingCount = stageTasks.filter(s => s.status === "active" && !approvedStages.includes(s.stageId)).length;

  const cardShared = {
    t, users, currentUser, reactions, comments,
    reactOpen, setReactOpen, commentOpen, setCommentOpen,
    assignOpen, setAssignOpen, assignments, assignTask,
    handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
    isAdmin, approveStage, approvedStages, toggleSubtask, subtasks,
  };

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {headerLabel || "🔥 now"}
            {pendingCount > 0 && isAdmin && (
              <span style={{ fontSize: 10, color: t.amber, background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "0 4px", fontWeight: 700, letterSpacing: 0.5 }}>
                {pendingCount} AWAITING APPROVAL
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>
            {stageTasks.length} tasks {"·"} drag between columns to change status
          </div>
        </div>
        {/* Right-side controls: one unified card, two segmented rows */}
        <div style={{
          background: t.bgSoft,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: `0 1px 3px rgba(0,0,0,0.06)`,
          minWidth: 200,
        }}>
          {showMyAllFilter && (
            <div style={{ display: "flex", padding: "4px 4px", borderBottom: `1px solid ${t.border}` }}>
              <button style={pillBtn(myAllFilter === "my")} onClick={() => setMyAllFilter("my")}>
                <span>🐱</span><span>mine</span>
              </button>
              <button style={pillBtn(myAllFilter === "all")} onClick={() => setMyAllFilter("all")}>
                <span>🌍</span><span>all</span>
              </button>
            </div>
          )}
          <div style={{ display: "flex", padding: "4px 4px" }}>
            <button style={pillBtn(view === "kanban")} onClick={() => setView("kanban")}>
              <span>⊞</span><span>kanban</span>
            </button>
            <button style={pillBtn(view === "list")} onClick={() => setView("list")}>
              <span>≡</span><span>list</span>
            </button>
          </div>
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
                  <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({colTasks.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {colTasks.length === 0
                    ? <div style={{ border: `1.5px dashed ${isOver ? t.accent + "88" : t.border}`, borderRadius: 12, padding: "24px 12px", textAlign: "center", fontSize: 10, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>drop here</div>
                    : colTasks.map(task => <TaskWithSubtasks key={task.stageId} task={task} isMine={isMine(task.stageId)} onClaim={() => handleClaim(task.stageId)} draggable={!task.locked} {...cardShared} />)
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
  stageId: string; pipelineName: string; pipelineIcon: string; pipelineColor: string;
  status: string; claimers: string[]; locked: boolean;
  workspaceIcon?: string; workspaceName?: string;
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

function TaskWithSubtasks({ task, isMine, onClaim, draggable: isDraggable, ...shared }: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps) {
  const { subtasks, toggleSubtask } = shared;
  const taskSubs = (subtasks[task.stageId] || []).filter(s => !s.done);
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
}: { task: StageTask; isMine: boolean; onClaim: () => void; draggable?: boolean } & SharedCardProps) {
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
    <CardShell
      t={t}
      borderColor={isPending ? t.amber + "55" : isMine ? task.pipelineColor + "55" : t.border}
      draggable={isDraggable}
      onDragStart={isDraggable ? e => { e.dataTransfer.setData("stageId", task.stageId); e.dataTransfer.effectAllowed = "move"; } : undefined}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div title={task.stageId} style={{ fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{task.stageId}</div>
          <div title={`${task.workspaceName ? task.workspaceName + " · " : ""}${task.pipelineName}`} style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
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
        onReactToggle={() => { setReactOpen(showReactPicker ? null : task.stageId); setCommentOpen(null); setAssignOpen(null); }}
        onCommentToggle={() => { setCommentOpen(showCommentPopover ? null : task.stageId); setReactOpen(null); setAssignOpen(null); }}
        onAssignToggle={() => { setAssignOpen(showAssignPicker ? null : task.stageId); setReactOpen(null); setCommentOpen(null); }}
        onAssign={userId => { assignTask(task.stageId, userId); setAssignOpen(null); }}
        onEmoji={emoji => { handleReact(task.stageId, emoji); setReactOpen(null); }}
        onCopy={() => shareStage(task.stageId, `${task.stageId} — ${task.pipelineIcon} ${task.pipelineName}`)}
        copied={copied === task.stageId}
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
  );
}

// ─── Subtask card (smaller, no description/preview) ──────────────────────────

function SubtaskCard({
  taskSub, stageId, parentStageName, pipelineColor, pipelineIcon, pipelineName, onToggle,
  t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  assignOpen, setAssignOpen, assignments, assignTask,
  handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
}: {
  taskSub: SubtaskItem; stageId: string; parentStageName: string;
  pipelineColor: string; pipelineIcon: string; pipelineName: string;
  onToggle: () => void;
} & SharedCardProps) {
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

  return (
    <CardShell t={t} borderColor={t.border}>
      {/* Top row — mirrors TaskCard structure: title + breadcrumb + creator avatar + done button */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div title={taskSub.text} style={{ fontSize: 15, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>{taskSub.text}</div>
          <div title={`subtask of ${parentStageName}`} style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
            ↳ subtask of {pipelineIcon} {parentStageName}
            {assignee && <span style={{ color: assignee.color, fontWeight: 700, marginLeft: 4 }}>→ {assignee.name}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {creator && (
            <div title={`added by ${creator.name}`}>
              <AvatarC user={creator} size={20} />
            </div>
          )}
          {currentUser && (
            <button onClick={e => { e.stopPropagation(); onToggle(); }} style={btn(pipelineColor, pipelineColor + "15", pipelineColor + "55")}>
              done →
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

function ActionRow({ t, showReactPicker, showCommentPopover, showAssignPicker, commentCount, assignee, users, onReactToggle, onCommentToggle, onAssignToggle, onAssign, onEmoji, onCopy, copied, compact }: {
  t: T; showReactPicker: boolean; showCommentPopover: boolean; showAssignPicker: boolean;
  commentCount: number; assignee: UserType | null | undefined; users: UserType[];
  onReactToggle: () => void; onCommentToggle: () => void; onAssignToggle: () => void;
  onAssign: (userId: string | null) => void;
  onEmoji: (emoji: string) => void; onCopy: () => void; copied: boolean; compact?: boolean;
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
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100, minWidth: 140 }}>
            {users.map(u => {
              const isCurrent = assignee?.id === u.id;
              return (
                <button key={u.id} onClick={() => onAssign(isCurrent ? null : u.id)} style={{ background: isCurrent ? u.color + "22" : "transparent", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: isCurrent ? u.color : t.text, fontWeight: isCurrent ? 700 : 500, fontFamily: "var(--font-dm-mono), monospace", textAlign: "left" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: u.color, flexShrink: 0 }} />
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
