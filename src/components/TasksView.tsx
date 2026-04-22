"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { type SubtaskItem, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

interface Pipeline {
  id: string;
  name: string;
  icon: string;
  colorKey: string;
  stages: string[];
}

interface Props {
  t: T;
  allPipelines: Pipeline[];
  customStages: Record<string, string[]>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  subtasks: Record<string, SubtaskItem[]>;
  claims: Record<string, string[]>;
  getStatus: (stageId: string) => string;
  sc: Record<string, { l: string; c: string }>;
  users: UserType[];
  currentUser: string | null;
  onClaim: (stageId: string) => void;
  onSubtaskToggle: (stageId: string, taskId: number) => void;
}

const ACTIONABLE = new Set(["active", "in-progress", "planned"]);
const STATUS_ORDER: Record<string, number> = { active: 0, "in-progress": 1, planned: 2 };
const COLS = [
  { status: "active",     label: "live" },
  { status: "in-progress", label: "building" },
  { status: "planned",    label: "planned" },
];

export default function TasksView({
  t, allPipelines, customStages, pipeMetaOverrides, subtasks, claims,
  getStatus, sc, users, currentUser, onClaim, onSubtaskToggle,
}: Props) {
  const [view, setView] = useState<"list" | "kanban">("list");

  const ck: Record<string, string> = {
    blue: t.accent, purple: t.purple, green: t.green, amber: t.amber,
    cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate,
  };

  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
  }));

  const stageTasks = pipelines.flatMap(p =>
    p.allStages
      .filter(s => ACTIONABLE.has(getStatus(s)))
      .map(s => ({
        stageId: s,
        pipelineName: p.displayName,
        pipelineIcon: p.icon,
        pipelineColor: p.color,
        status: getStatus(s),
        claimers: claims[s] || [],
        subtaskDone: (subtasks[s] || []).filter(x => x.done).length,
        subtaskTotal: (subtasks[s] || []).length,
      }))
  ).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  const openSubtasks = pipelines.flatMap(p =>
    p.allStages.flatMap(s =>
      (subtasks[s] || [])
        .filter(sub => !sub.done)
        .map(sub => ({ taskId: sub.id, text: sub.text, stageId: s, pipelineName: p.displayName, pipelineIcon: p.icon, pipelineColor: p.color }))
    )
  );

  const isMyClaim = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  const viewBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? t.accent + "22" : "transparent",
    border: `1px solid ${active ? t.accent + "55" : t.border}`,
    borderRadius: 8, padding: "3px 12px", cursor: "pointer",
    fontSize: 8, color: active ? t.accent : t.textMuted,
    fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace",
  });

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1 }}>// now</div>
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3 }}>
            {stageTasks.length} stages in flight {"·"} {openSubtasks.length} open subtasks
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={viewBtnStyle(view === "list")} onClick={() => setView("list")}>≡ list</button>
          <button style={viewBtnStyle(view === "kanban")} onClick={() => setView("kanban")}>⊞ kanban</button>
        </div>
      </div>

      {stageTasks.length === 0 && openSubtasks.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all clear — nothing in flight</div>
        </div>
      ) : view === "list" ? (
        <ListView stageTasks={stageTasks} openSubtasks={openSubtasks} t={t} sc={sc} users={users} currentUser={currentUser} isMyClaim={isMyClaim} onClaim={onClaim} onSubtaskToggle={onSubtaskToggle} />
      ) : (
        <KanbanView stageTasks={stageTasks} openSubtasks={openSubtasks} t={t} sc={sc} users={users} currentUser={currentUser} isMyClaim={isMyClaim} onClaim={onClaim} onSubtaskToggle={onSubtaskToggle} />
      )}
    </div>
  );
}

// ─── Shared card props ────────────────────────────────────────────────────────

interface StageTask { stageId: string; pipelineName: string; pipelineIcon: string; pipelineColor: string; status: string; claimers: string[]; subtaskDone: number; subtaskTotal: number; }
interface OpenSubtask { taskId: number; text: string; stageId: string; pipelineName: string; pipelineIcon: string; pipelineColor: string; }
interface SharedProps {
  t: T; sc: Record<string, { l: string; c: string }>;
  users: UserType[]; currentUser: string | null;
  isMyClaim: (id: string) => boolean;
  onClaim: (id: string) => void;
  onSubtaskToggle: (stageId: string, taskId: number) => void;
  stageTasks: StageTask[];
  openSubtasks: OpenSubtask[];
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ task, t, sc, users, currentUser, isMyClaim, onClaim, compact = false }: { task: StageTask; compact?: boolean } & Omit<SharedProps, "stageTasks" | "openSubtasks" | "onSubtaskToggle">) {
  const mine = isMyClaim(task.stageId);
  const st = sc[task.status];
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${mine ? task.pipelineColor + "44" : t.border}`, borderRadius: 12, padding: compact ? "8px 10px" : "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 7, fontWeight: 700, color: st?.c || t.textDim, background: (st?.c || t.textDim) + "18", border: `1px solid ${(st?.c || t.textDim)}33`, borderRadius: 6, padding: "2px 6px", whiteSpace: "nowrap", fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }}>
        {st?.l || task.status}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? 9 : 11, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.stageId}</div>
        <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>
          {task.pipelineIcon} {task.pipelineName}
          {task.subtaskTotal > 0 && <span style={{ marginLeft: 6, color: task.subtaskDone === task.subtaskTotal ? t.green : t.textDim }}>{task.subtaskDone}/{task.subtaskTotal}</span>}
        </div>
      </div>
      {task.claimers.slice(0, 2).map(id => {
        const u = users.find(u => u.id === id);
        return u ? <AvatarC key={id} user={u} size={18} /> : null;
      })}
      {currentUser && (
        <button onClick={() => onClaim(task.stageId)} style={{ background: mine ? t.green + "18" : "transparent", border: `1px solid ${mine ? t.green + "44" : t.border}`, borderRadius: 7, padding: "2px 8px", cursor: "pointer", fontSize: 7, color: mine ? t.green : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0 }}>
          {mine ? "✓" : "claim"}
        </button>
      )}
    </div>
  );
}

// ─── Subtask row ──────────────────────────────────────────────────────────────

function SubtaskRow({ sub, t, onSubtaskToggle, compact = false }: { sub: OpenSubtask; t: T; onSubtaskToggle: (s: string, id: number) => void; compact?: boolean }) {
  return (
    <div onClick={() => onSubtaskToggle(sub.stageId, sub.taskId)} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: compact ? "6px 10px" : "8px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div style={{ width: 13, height: 13, borderRadius: 4, border: `1.5px solid ${t.border}`, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.text}</div>
        <div style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>{sub.pipelineIcon} {sub.pipelineName} → {sub.stageId}</div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView(props: SharedProps) {
  const { stageTasks, openSubtasks, t } = props;
  return (
    <>
      {stageTasks.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 8 }}>stages in flight</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {stageTasks.map(task => <StageCard key={task.stageId} task={task} {...props} />)}
          </div>
        </section>
      )}
      {openSubtasks.length > 0 && (
        <section>
          <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 8 }}>open subtasks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {openSubtasks.map(sub => <SubtaskRow key={`${sub.stageId}-${sub.taskId}`} sub={sub} t={t} onSubtaskToggle={props.onSubtaskToggle} />)}
          </div>
        </section>
      )}
    </>
  );
}

// ─── Kanban view ─────────────────────────────────────────────────────────────

function KanbanView(props: SharedProps) {
  const { stageTasks, openSubtasks, t, sc } = props;

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", overflowX: "auto", paddingBottom: 12 }}>
      {COLS.map(col => {
        const colTasks = stageTasks.filter(s => s.status === col.status);
        const stColor = sc[col.status]?.c || t.textDim;
        return (
          <div key={col.status} style={{ flex: "1 1 220px", minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor, flexShrink: 0 }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: stColor, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
              <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({colTasks.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {colTasks.length === 0 ? (
                <div style={{ background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 12, padding: "14px 10px", textAlign: "center", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// empty</div>
              ) : (
                colTasks.map(task => <StageCard key={task.stageId} task={task} compact {...props} />)
              )}
            </div>
          </div>
        );
      })}

      {/* Subtasks column */}
      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: t.accent, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>subtasks</span>
          <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({openSubtasks.length})</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {openSubtasks.length === 0 ? (
            <div style={{ background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 10, padding: "14px 10px", textAlign: "center", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all done ✓</div>
          ) : (
            openSubtasks.map(sub => <SubtaskRow key={`${sub.stageId}-${sub.taskId}`} sub={sub} t={t} onSubtaskToggle={props.onSubtaskToggle} compact />)
          )}
        </div>
      </div>
    </div>
  );
}
