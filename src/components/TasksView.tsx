"use client";

import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { T } from "@/lib/themes";
import { type SubtaskItem, type UserType, type CommentItem } from "@/lib/data";

const Stage = dynamic(() => import("@/components/Stage"), { ssr: false });

interface Pipeline {
  id: string;
  name: string;
  icon: string;
  colorKey: string;
  stages: string[];
}

// Mirrors stageProps shape from Dashboard
interface StageProps {
  t: T;
  expS: string | null;
  setExpS: (v: string | null) => void;
  getStatus: (name: string) => string;
  sc: Record<string, { l: string; c: string }>;
  claims: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  subtasks: Record<string, SubtaskItem[]>;
  comments: Record<string, CommentItem[]>;
  users: UserType[];
  currentUser: string | null;
  me: UserType;
  reactOpen: string | null;
  setReactOpen: (v: string | null) => void;
  showMockup: Record<string, boolean>;
  setShowMockup: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  copied: string | null;
  claimAnim: { stage: string; pts: number } | null;
  handleClaim: (sid: string) => void;
  handleReact: (sid: string, emoji: string) => void;
  cycleStatus: (name: string) => void;
  shareStage: (name: string, text: string) => void;
  subtaskInput: Record<string, string>;
  setSubtaskInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addSubtask: (sid: string) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  lockSubtask: (sid: string, taskId: number) => void;
  removeSubtask: (sid: string, taskId: number) => void;
  addComment: (sid: string) => void;
  stageDescOverrides: Record<string, string>;
  setStageDescOverride: (name: string, val: string) => void;
  liveNotifs: Record<string, { comment?: string; reaction?: string }>;
  stageImages: Record<string, string[]>;
  addStageImage: (name: string, dataUrl: string) => void;
  removeStageImage: (name: string, idx: number) => void;
}

interface Props extends StageProps {
  allPipelines: Pipeline[];
  customStages: Record<string, string[]>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  isLocked: (pipelineId: string) => boolean;
  isMobile: boolean;
  ck: Record<string, string>;
}

const ACTIONABLE = new Set(["active", "in-progress", "planned"]);
const STATUS_ORDER: Record<string, number> = { active: 0, "in-progress": 1, planned: 2 };
const COLS = [
  { status: "active",      label: "live" },
  { status: "in-progress", label: "building" },
  { status: "planned",     label: "planned" },
];

export default function TasksView({
  allPipelines, customStages, pipeMetaOverrides, isLocked, isMobile, ck,
  ...sp
}: Props) {
  const { t, getStatus, sc, subtasks } = sp;
  const [view, setView] = useState<"list" | "kanban">("kanban");

  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
  }));

  // Enriched stage task list: (pipelineId, pipelineColor, stageId, status)
  const stageTasks = pipelines.flatMap(p =>
    p.allStages
      .filter(s => ACTIONABLE.has(getStatus(s)))
      .map((s, i) => ({
        stageId: s,
        idx: i,
        tot: p.allStages.filter(x => ACTIONABLE.has(getStatus(x))).length,
        pId: p.id,
        pC: p.color,
        status: getStatus(s),
        locked: isLocked(p.id),
      }))
  ).sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  // Open subtasks across all stages (quick-check without expanding)
  const openSubtasks = pipelines.flatMap(p =>
    p.allStages.flatMap(s =>
      (subtasks[s] || [])
        .filter(sub => !sub.done)
        .map(sub => ({ taskId: sub.id, text: sub.text, stageId: s, pipelineName: p.displayName, pipelineIcon: p.icon }))
    )
  );

  const total = stageTasks.length;
  const totalSubs = openSubtasks.length;

  const viewBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? t.accent + "22" : "transparent",
    border: `1px solid ${active ? t.accent + "55" : t.border}`,
    borderRadius: 8, padding: "3px 12px", cursor: "pointer",
    fontSize: 8, color: active ? t.accent : t.textMuted,
    fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace",
  });

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1 }}>🔥 now</div>
          <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3 }}>
            {total} stages in flight {"·"} {totalSubs} open subtasks
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={viewBtnStyle(view === "list")} onClick={() => setView("list")}>≡ list</button>
          <button style={viewBtnStyle(view === "kanban")} onClick={() => setView("kanban")}>⊞ kanban</button>
        </div>
      </div>

      {total === 0 && totalSubs === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all clear — nothing in flight</div>
        </div>
      ) : view === "list" ? (
        <ListView stageTasks={stageTasks} openSubtasks={openSubtasks} sp={sp} isMobile={isMobile} t={t} sc={sc} onSubtaskToggle={sp.toggleSubtask} />
      ) : (
        <KanbanView stageTasks={stageTasks} openSubtasks={openSubtasks} sp={sp} isMobile={isMobile} t={t} sc={sc} onSubtaskToggle={sp.toggleSubtask} />
      )}
    </div>
  );
}

// ─── Shared types ─────────────────────────────────────────────────────────────

interface StageTask { stageId: string; idx: number; tot: number; pId: string; pC: string; status: string; locked: boolean; }
interface OpenSub { taskId: number; text: string; stageId: string; pipelineName: string; pipelineIcon: string; }
interface ViewProps {
  stageTasks: StageTask[];
  openSubtasks: OpenSub[];
  sp: StageProps;
  isMobile: boolean;
  t: T;
  sc: Record<string, { l: string; c: string }>;
  onSubtaskToggle: (stageId: string, taskId: number) => void;
}

function StageSlot({ task, sp, isMobile }: { task: StageTask; sp: StageProps; isMobile: boolean }) {
  return (
    <Suspense fallback={null}>
      <Stage name={task.stageId} idx={task.idx} tot={task.tot} pC={task.pC} pId={task.pId} isLocked={task.locked} isMobile={isMobile} {...sp} />
    </Suspense>
  );
}

function SubRow({ sub, t, onSubtaskToggle }: { sub: OpenSub; t: T; onSubtaskToggle: (s: string, id: number) => void }) {
  return (
    <div onClick={() => onSubtaskToggle(sub.stageId, sub.taskId)} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div style={{ width: 13, height: 13, borderRadius: 4, border: `1.5px solid ${t.border}`, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.text}</div>
        <div style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>{sub.pipelineIcon} {sub.pipelineName} → {sub.stageId}</div>
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({ stageTasks, openSubtasks, sp, isMobile, t, onSubtaskToggle }: ViewProps) {
  return (
    <>
      {stageTasks.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 10 }}>stages in flight</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stageTasks.map(task => <StageSlot key={task.stageId} task={task} sp={sp} isMobile={isMobile} />)}
          </div>
        </section>
      )}
      {openSubtasks.length > 0 && (
        <section>
          <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 8 }}>open subtasks</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {openSubtasks.map(sub => <SubRow key={`${sub.stageId}-${sub.taskId}`} sub={sub} t={t} onSubtaskToggle={onSubtaskToggle} />)}
          </div>
        </section>
      )}
    </>
  );
}

// ─── Kanban view ──────────────────────────────────────────────────────────────

function KanbanView({ stageTasks, openSubtasks, sp, isMobile, t, sc, onSubtaskToggle }: ViewProps) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 16 }}>
      {COLS.map(col => {
        const colTasks = stageTasks.filter(s => s.status === col.status);
        const stColor = sc[col.status]?.c || t.textDim;
        return (
          <div key={col.status} style={{ flex: "1 1 300px", minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${stColor}33` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: stColor }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: stColor, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
              <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({colTasks.length})</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {colTasks.length === 0
                ? <div style={{ background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 12, padding: "16px 12px", textAlign: "center", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// empty</div>
                : colTasks.map(task => <StageSlot key={task.stageId} task={task} sp={sp} isMobile={isMobile} />)
              }
            </div>
          </div>
        );
      })}

      {/* Subtasks column */}
      <div style={{ flex: "1 1 240px", minWidth: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${t.accent}33` }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.accent }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: t.accent, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>subtasks</span>
          <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>({openSubtasks.length})</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {openSubtasks.length === 0
            ? <div style={{ background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 10, padding: "16px 12px", textAlign: "center", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all done ✓</div>
            : openSubtasks.map(sub => <SubRow key={`${sub.stageId}-${sub.taskId}`} sub={sub} t={t} onSubtaskToggle={onSubtaskToggle} />)
          }
        </div>
      </div>
    </div>
  );
}
