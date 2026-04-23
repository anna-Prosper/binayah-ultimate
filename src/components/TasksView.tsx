"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { type SubtaskItem, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  allPipelines: Pipeline[];
  customStages: Record<string, string[]>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  subtasks: Record<string, SubtaskItem[]>;
  claims: Record<string, string[]>;
  getStatus: (name: string) => string;
  sc: Record<string, { l: string; c: string }>;
  users: UserType[];
  currentUser: string | null;
  handleClaim: (sid: string) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  isLocked: (pipelineId: string) => boolean;
  setStageStatus: (name: string, status: string) => void;
  ck: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any; // absorb extra stageProps without TS errors
}

const ACTIONABLE = new Set(["active", "in-progress", "planned"]);
const STATUS_ORDER: Record<string, number> = { active: 0, "in-progress": 1, planned: 2 };
const COLS = [
  { status: "active",      label: "live" },
  { status: "in-progress", label: "building" },
  { status: "planned",     label: "planned" },
];

export default function TasksView({ t, allPipelines, customStages, pipeMetaOverrides, subtasks, claims, getStatus, sc, users, currentUser, handleClaim, toggleSubtask, isLocked, setStageStatus, ck }: Props) {
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [dragOver, setDragOver] = useState<string | null>(null);

  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
    locked: isLocked(p.id),
  }));

  const stageTasks = pipelines.flatMap(p =>
    p.allStages
      .filter(s => ACTIONABLE.has(getStatus(s)))
      .map(s => ({ kind: "stage" as const, id: s, label: s, sub: `${p.icon} ${p.displayName}`, status: getStatus(s), claimers: claims[s] || [], pipelineId: p.id, pipelineColor: p.color, locked: p.locked }))
  ).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  const openSubtasks = pipelines.flatMap(p =>
    p.allStages.flatMap(s =>
      (subtasks[s] || []).filter(sub => !sub.done).map(sub => ({ kind: "subtask" as const, id: `${s}::${sub.id}`, label: sub.text, sub: `${p.icon} ${p.displayName} → ${s}`, stageId: s, taskId: sub.id, pipelineColor: p.color }))
    )
  );

  const isMine = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  const handleDrop = (targetStatus: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const stageId = e.dataTransfer.getData("stageId");
    if (stageId && getStatus(stageId) !== targetStatus) {
      setStageStatus(stageId, targetStatus);
    }
  };

  const viewBtn = (active: boolean): React.CSSProperties => ({
    background: active ? t.accent + "22" : "transparent",
    border: `1px solid ${active ? t.accent + "55" : t.border}`,
    borderRadius: 8, padding: "3px 12px", cursor: "pointer",
    fontSize: 8, color: active ? t.accent : t.textMuted,
    fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace",
  });

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1 }}>🔥 now</div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {stageTasks.map(task => (
            <NowCard key={task.id} item={task} t={t} sc={sc} users={users} currentUser={currentUser} isMine={isMine(task.id)} onClaim={() => handleClaim(task.id)} />
          ))}
          {openSubtasks.length > 0 && <>
            <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginTop: 12, marginBottom: 4 }}>open subtasks</div>
            {openSubtasks.map(sub => (
              <NowCard key={sub.id} item={sub} t={t} sc={sc} users={users} currentUser={currentUser} isMine={false} onClaim={() => toggleSubtask(sub.stageId, sub.taskId)} claimLabel="done →" />
            ))}
          </>}
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
                style={{ flex: "1 1 260px", minWidth: 220, background: isOver ? t.accent + "0a" : "transparent", borderRadius: 14, transition: "background 0.15s", padding: 2 }}
                onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => handleDrop(col.status, e)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 4px", borderBottom: `1px solid ${stColor}33` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
                  <span style={{ fontSize: 8, fontWeight: 700, color: stColor, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                  <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({colTasks.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {colTasks.length === 0
                    ? <div style={{ border: `1.5px dashed ${isOver ? t.accent + "88" : t.border}`, borderRadius: 10, padding: "20px 10px", textAlign: "center", fontSize: 8, color: isOver ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>drop here</div>
                    : colTasks.map(task => (
                        <NowCard key={task.id} item={task} t={t} sc={sc} users={users} currentUser={currentUser} isMine={isMine(task.id)} onClaim={() => handleClaim(task.id)} draggable={!task.locked} />
                      ))
                  }
                </div>
              </div>
            );
          })}
          {/* Subtasks column */}
          <div style={{ flex: "1 1 220px", minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 4px", borderBottom: `1px solid ${t.accent}33` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: t.accent, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>subtasks</span>
              <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({openSubtasks.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {openSubtasks.length === 0
                ? <div style={{ border: `1px dashed ${t.border}`, borderRadius: 10, padding: "20px 10px", textAlign: "center", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all done ✓</div>
                : openSubtasks.map(sub => (
                    <NowCard key={sub.id} item={sub} t={t} sc={sc} users={users} currentUser={currentUser} isMine={false} onClaim={() => toggleSubtask(sub.stageId, sub.taskId)} claimLabel="done →" />
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unified compact card ─────────────────────────────────────────────────────

type CardItem =
  | { kind: "stage"; id: string; label: string; sub: string; status: string; claimers: string[]; pipelineColor: string; locked: boolean }
  | { kind: "subtask"; id: string; label: string; sub: string; stageId: string; taskId: number; pipelineColor: string };

function NowCard({ item, t, sc, users, currentUser, isMine, onClaim, claimLabel, draggable: isDraggable }: {
  item: CardItem; t: T; sc: Record<string, { l: string; c: string }>;
  users: UserType[]; currentUser: string | null;
  isMine: boolean; onClaim: () => void;
  claimLabel?: string; draggable?: boolean;
}) {
  const isStage = item.kind === "stage";
  const st = isStage ? sc[item.status] : null;
  const mine = isStage && isMine;

  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable && isStage ? e => { e.dataTransfer.setData("stageId", item.id); e.dataTransfer.effectAllowed = "move"; } : undefined}
      style={{
        background: t.bgCard,
        border: `1px solid ${mine ? item.pipelineColor + "55" : t.border}`,
        borderRadius: 10,
        padding: "9px 12px",
        display: "flex", alignItems: "center", gap: 8,
        cursor: isDraggable ? "grab" : "default",
        userSelect: "none",
        transition: "border-color 0.15s",
      }}
    >
      {/* Status pill / checkbox */}
      {isStage && st ? (
        <span style={{ fontSize: 7, fontWeight: 700, color: st.c, background: st.c + "18", border: `1px solid ${st.c}33`, borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap", fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }}>{st.l}</span>
      ) : (
        <div style={{ width: 13, height: 13, borderRadius: 4, border: `1.5px solid ${t.border}`, flexShrink: 0 }} />
      )}

      {/* Label + breadcrumb */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
        <div style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sub}</div>
      </div>

      {/* Claimers (stage only) */}
      {isStage && item.claimers.length > 0 && (
        <div style={{ display: "flex" }}>
          {item.claimers.slice(0, 2).map(id => {
            const u = users.find(u => u.id === id);
            return u ? <AvatarC key={id} user={u} size={18} /> : null;
          })}
        </div>
      )}

      {/* Claim / done button */}
      {currentUser && (
        <button
          onClick={e => { e.stopPropagation(); onClaim(); }}
          style={{ background: mine ? t.green + "18" : "transparent", border: `1px solid ${mine ? t.green + "44" : t.border}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 7, color: mine ? t.green : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {mine ? "✓ claimed" : (claimLabel || "claim")}
        </button>
      )}
    </div>
  );
}
