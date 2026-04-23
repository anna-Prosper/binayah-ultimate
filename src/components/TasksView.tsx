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
  sc: Record<string, { l: string; c: string }>;
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
  ck: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

const ACTIONABLE = new Set(["active", "in-progress", "planned"]);
const STATUS_ORDER: Record<string, number> = { active: 0, "in-progress": 1, planned: 2 };
const COLS = [
  { status: "active",      label: "live · pending approval" },
  { status: "in-progress", label: "building" },
  { status: "planned",     label: "planned" },
];

export default function TasksView(props: Props) {
  const { t, allPipelines, customStages, pipeMetaOverrides, subtasks, claims, reactions, comments, getStatus, sc, users, currentUser, handleClaim, handleReact, toggleSubtask, shareStage, addComment, commentInput, setCommentInput, copied, isLocked, setStageStatus, approvedStages, approveStage, isAdmin, ck } = props;

  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);

  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
    locked: isLocked(p.id),
  }));

  // Stages that are actionable AND not yet approved (approved = fully done, leaves the now tab)
  const stageTasks = pipelines.flatMap(p =>
    p.allStages
      .filter(s => ACTIONABLE.has(getStatus(s)) && !approvedStages.includes(s))
      .map(s => ({
        kind: "stage" as const, id: s, label: s, sub: `${p.icon} ${p.displayName}`,
        status: getStatus(s), claimers: claims[s] || [], pipelineId: p.id,
        pipelineColor: p.color, locked: p.locked,
      }))
  ).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  // Subtasks that aren't done AND whose parent stage is NOT live (live stages = done, all their subtasks are implicitly done)
  const openSubtasks = pipelines.flatMap(p =>
    p.allStages
      .filter(s => getStatus(s) !== "active") // parent not live
      .flatMap(s =>
        (subtasks[s] || []).filter(sub => !sub.done).map(sub => ({
          kind: "subtask" as const, id: `${s}::${sub.id}`, label: sub.text,
          sub: `${p.icon} ${p.displayName} → ${s}`, stageId: s, taskId: sub.id,
          pipelineColor: p.color,
        }))
      )
  );

  const isMine = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  const handleDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const stageId = e.dataTransfer.getData("stageId");
    if (stageId && getStatus(stageId) !== targetStatus) setStageStatus(stageId, targetStatus);
  };

  const viewBtn = (active: boolean): React.CSSProperties => ({
    background: active ? t.accent + "22" : "transparent",
    border: `1px solid ${active ? t.accent + "55" : t.border}`,
    borderRadius: 8, padding: "3px 12px", cursor: "pointer",
    fontSize: 8, color: active ? t.accent : t.textMuted,
    fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace",
  });

  const cardShared = {
    t, users, currentUser, reactions, comments,
    reactOpen, setReactOpen, commentOpen, setCommentOpen,
    handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
    isAdmin, approveStage,
  };

  const pendingCount = stageTasks.filter(s => s.status === "active").length;

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
            🔥 now
            {pendingCount > 0 && isAdmin && (
              <span style={{ fontSize: 8, color: t.amber, background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 5, padding: "2px 6px", fontWeight: 700, letterSpacing: 1 }}>
                {pendingCount} AWAITING APPROVAL
              </span>
            )}
          </div>
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3 }}>
            {stageTasks.length} stages in flight {"·"} {openSubtasks.length} open subtasks
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={viewBtn(view === "list")} onClick={() => setView("list")}>≡ list</button>
          <button style={viewBtn(view === "kanban")} onClick={() => setView("kanban")}>⊞ kanban</button>
        </div>
      </div>

      {stageTasks.length === 0 && openSubtasks.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all clear — nothing in flight</div>
        </div>
      ) : view === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stageTasks.map(task => <NowCard key={task.id} item={task} isMine={isMine(task.id)} onClaim={() => handleClaim(task.id)} {...cardShared} />)}
          {openSubtasks.map(sub => <NowCard key={sub.id} item={sub} isMine={false} onClaim={() => toggleSubtask(sub.stageId, sub.taskId)} claimLabel="mark done →" {...cardShared} />)}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 16 }}>
          {COLS.map(col => {
            const colTasks = stageTasks.filter(s => s.status === col.status);
            const stColor = sc[col.status]?.c || t.textDim;
            const isOver = dragOver === col.status;
            return (
              <div
                key={col.status}
                style={{ flex: "1 1 280px", minWidth: 240, background: isOver ? t.accent + "0a" : "transparent", borderRadius: 14, transition: "background 0.15s", padding: 2 }}
                onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(col.status, e)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 4px", borderBottom: `1px solid ${stColor}33` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: stColor, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                  <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({colTasks.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {colTasks.length === 0
                    ? <div style={{ border: `1.5px dashed ${isOver ? t.accent + "88" : t.border}`, borderRadius: 10, padding: "24px 12px", textAlign: "center", fontSize: 8, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>drop here</div>
                    : colTasks.map(task => <NowCard key={task.id} item={task} isMine={isMine(task.id)} onClaim={() => handleClaim(task.id)} draggable={!task.locked} {...cardShared} />)
                  }
                </div>
              </div>
            );
          })}
          <div style={{ flex: "1 1 240px", minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 4px", borderBottom: `1px solid ${t.accent}33` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: t.accent, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>subtasks</span>
              <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({openSubtasks.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {openSubtasks.length === 0
                ? <div style={{ border: `1px dashed ${t.border}`, borderRadius: 10, padding: "24px 12px", textAlign: "center", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all done ✓</div>
                : openSubtasks.map(sub => <NowCard key={sub.id} item={sub} isMine={false} onClaim={() => toggleSubtask(sub.stageId, sub.taskId)} claimLabel="mark done →" {...cardShared} />)
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unified card ─────────────────────────────────────────────────────────────

type CardItem =
  | { kind: "stage"; id: string; label: string; sub: string; status: string; claimers: string[]; pipelineColor: string; locked: boolean }
  | { kind: "subtask"; id: string; label: string; sub: string; stageId: string; taskId: number; pipelineColor: string };

interface CardProps {
  item: CardItem;
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
  isMine: boolean;
  onClaim: () => void;
  claimLabel?: string;
  draggable?: boolean;
  isAdmin: boolean;
  approveStage: (name: string) => void;
}

function NowCard({
  item, t, users, currentUser, reactions, comments,
  reactOpen, setReactOpen, commentOpen, setCommentOpen,
  handleReact, shareStage, addComment, commentInput, setCommentInput, copied,
  isMine, onClaim, claimLabel, draggable: isDraggable,
  isAdmin, approveStage,
}: CardProps) {
  const isStage = item.kind === "stage";
  const isPending = isStage && item.status === "active"; // live = pending approval (un-approved ones are filtered in)
  // Use item.id as the key for reactions/comments — works for both stages (stage name) and subtasks (composite "stage::id")
  const rxs = reactions[item.id] || {};
  const cmts = comments[item.id] || [];
  const showReactPicker = reactOpen === item.id;
  const showCommentPopover = commentOpen === item.id;

  const iconBtn: React.CSSProperties = {
    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7,
    padding: "4px 8px", cursor: "pointer", fontSize: 10, color: t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4,
    transition: "all 0.15s",
  };

  const onCopy = () => {
    const text = isStage ? `${item.label} — ${item.sub}` : `${item.label} (${item.sub})`;
    shareStage(item.id, text);
  };

  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable && isStage ? e => { e.dataTransfer.setData("stageId", item.id); e.dataTransfer.effectAllowed = "move"; } : undefined}
      onClick={e => e.stopPropagation()}
      style={{
        background: t.bgCard,
        border: `1px solid ${isPending ? t.amber + "55" : isMine ? item.pipelineColor + "55" : t.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 8,
        cursor: isDraggable ? "grab" : "default",
        userSelect: "none",
        transition: "border-color 0.15s",
        position: "relative",
      }}
    >
      {/* Top row: title + claimers + claim btn */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sub}</div>
        </div>
        {isStage && item.claimers.length > 0 && (
          <div style={{ display: "flex", gap: -4 }}>
            {item.claimers.slice(0, 3).map(id => {
              const u = users.find(u => u.id === id);
              return u ? <AvatarC key={id} user={u} size={22} /> : null;
            })}
          </div>
        )}
        {/* Admin approve button — shown on live/pending stages for admins */}
        {isStage && isPending && isAdmin && (
          <button
            onClick={e => { e.stopPropagation(); approveStage(item.id); }}
            style={{ background: t.green + "22", border: `1px solid ${t.green}88`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 9, color: t.green, fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0 }}
            title="Approve this completion — awards points to claimers"
          >
            ✓ approve
          </button>
        )}
        {/* Pending approval badge — shown to non-admins on live stages */}
        {isStage && isPending && !isAdmin && (
          <span style={{ fontSize: 8, color: t.amber, background: t.amber + "18", border: `1px solid ${t.amber}44`, borderRadius: 6, padding: "4px 8px", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0 }}>
            ⏳ pending
          </span>
        )}
        {/* Claim button (stages) / done button (subtasks) — not shown if stage is pending for admin (admin has approve instead) */}
        {currentUser && !(isStage && isPending && isAdmin) && (
          <button
            onClick={e => { e.stopPropagation(); onClaim(); }}
            style={{ background: isMine ? t.green + "18" : item.pipelineColor + "15", border: `1px solid ${isMine ? t.green + "55" : item.pipelineColor + "55"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 9, color: isMine ? t.green : item.pipelineColor, fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {isMine ? "✓ claimed" : (claimLabel || "claim")}
          </button>
        )}
      </div>

      {/* Reactions row */}
      {visibleReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visibleReactions.map(([emoji, us]) => {
            const mine = currentUser ? us.includes(currentUser) : false;
            return (
              <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(item.id, emoji); }} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 12, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{emoji}</span>
                <span style={{ fontSize: 8, fontWeight: 700 }}>{us.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Actions row — same for stages and subtasks */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", borderTop: `1px solid ${t.border}`, paddingTop: 8, marginTop: 2 }}>
        <div style={{ position: "relative" }}>
          <button onClick={e => { e.stopPropagation(); setReactOpen(showReactPicker ? null : item.id); setCommentOpen(null); }} style={iconBtn} title="Add reaction">
            😀 <span style={{ fontSize: 8 }}>+</span>
          </button>
          {showReactPicker && (
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 4, display: "flex", gap: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100 }}>
              {REACTIONS.map(emoji => (
                <button key={emoji} onClick={() => { handleReact(item.id, emoji); setReactOpen(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: "4px 6px", borderRadius: 6 }}>{emoji}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); setCommentOpen(showCommentPopover ? null : item.id); setReactOpen(null); }} style={iconBtn} title="Comments">
          💬 <span style={{ fontSize: 8 }}>{cmts.length}</span>
        </button>
        <button onClick={e => { e.stopPropagation(); onCopy(); }} style={iconBtn} title="Copy">
          {copied === item.id ? "✓ copied" : "📋 copy"}
        </button>
      </div>

      {showCommentPopover && (
        <div onClick={e => e.stopPropagation()} style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: 10, marginTop: 2 }}>
          {cmts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
              {cmts.slice(-5).map(c => {
                const u = users.find(u => u.id === c.by);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    {u && <AvatarC user={u} size={18} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 8, color: u?.color || t.text, fontWeight: 700 }}>{u?.name || c.by}</div>
                      <div style={{ fontSize: 10, color: t.text, wordBreak: "break-word" }}>{c.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <input
              value={commentInput[item.id] || ""}
              onChange={e => setCommentInput(prev => ({ ...prev, [item.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addComment(item.id); } }}
              placeholder="// add a comment..."
              style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 7, padding: "6px 10px", fontSize: 10, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
            />
            <button onClick={() => addComment(item.id)} style={{ background: t.accent, border: "none", borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 10, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>send</button>
          </div>
        </div>
      )}
    </div>
  );
}
