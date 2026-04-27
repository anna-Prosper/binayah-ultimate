"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Users, Zap } from "lucide-react";
import { T } from "@/lib/themes";
import { type UserType, type Workspace, type SubtaskItem, type CommentItem } from "@/lib/data";

const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  me: UserType;
  users: UserType[];
  myWorkspaces: Workspace[];
  allPipelinesGlobal: Pipeline[];
  customStages: Record<string, string[]>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  claims: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  comments: Record<string, CommentItem[]>;
  subtasks: Record<string, SubtaskItem[]>;
  assignments: Record<string, string>;
  approvedStages: string[];
  copied: string | null;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  getStatus: (name: string) => string;
  sc: Record<string, { l: string; c: string }>;
  ck: Record<string, string>;
  currentUser: string;
  isCaptainOfAny: boolean;
  currentWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  // Handlers (route through to current workspace's actions; the underlying state is global by stageId)
  handleClaim: (sid: string) => void;
  handleReact: (sid: string, emoji: string) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  shareStage: (name: string, text: string) => void;
  addComment: (sid: string) => void;
  setStageStatus: (name: string, status: string) => void;
  approveStage: (name: string) => void;
  assignTask: (sid: string, userId: string | null) => void;
  isLocked: (pipelineId: string) => boolean;
  stageNameOverrides?: Record<string, string>;
  setStageNameOverride?: (name: string, val: string) => void;
  subtaskStages?: Record<string, string>;
  setSubtaskStage?: (key: string, status: string) => void;
}

export default function HomeView({
  t, me, users, myWorkspaces, allPipelinesGlobal, customStages, pipeMetaOverrides,
  claims, reactions, comments, subtasks, assignments, approvedStages, copied,
  commentInput, setCommentInput, getStatus, sc, ck,
  currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace,
  handleClaim, handleReact, toggleSubtask, shareStage, addComment, setStageStatus, approveStage, assignTask, isLocked,
  stageNameOverrides, setStageNameOverride, subtaskStages, setSubtaskStage,
}: Props) {
  // All pipelines visible to this user across their workspaces
  const visiblePipelines = useMemo(() => {
    const ids = new Set<string>();
    for (const w of myWorkspaces) for (const pid of w.pipelineIds) ids.add(pid);
    return allPipelinesGlobal.filter(p => ids.has(p.id));
  }, [myWorkspaces, allPipelinesGlobal]);

  // Map: pipelineId → workspace info for breadcrumb
  const pipelineWorkspaceMap = useMemo(() => {
    const m: Record<string, { id: string; name: string; icon: string }> = {};
    for (const w of myWorkspaces) {
      for (const pid of w.pipelineIds) m[pid] = { id: w.id, name: w.name, icon: w.icon };
    }
    return m;
  }, [myWorkspaces]);

  const greeting = `gm, ${me.name.toLowerCase()} 🫡`;

  const ACTIONABLE = new Set(["planned", "in-progress", "active", "blocked"]);
  const visibleStages = useMemo(() => {
    const wsMap = new Map<string, Workspace>();
    for (const w of myWorkspaces) for (const pid of w.pipelineIds) wsMap.set(pid, w);
    const out: { stageId: string; wsId: string }[] = [];
    for (const p of visiblePipelines) {
      const ws = wsMap.get(p.id); if (!ws) continue;
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      for (const s of stages) {
        if (ACTIONABLE.has(getStatus(s))) out.push({ stageId: s, wsId: ws.id });
      }
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePipelines, myWorkspaces, customStages, getStatus]);

  const totalMyTasks = visibleStages.filter(s => (claims[s.stageId] || []).includes(currentUser)).length;

  return (
    <div style={{ paddingTop: 20 }}>
      {/* ── Page header: greeting + workspace context on one line ── */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.5, lineHeight: 1.15 }}>{greeting}</div>

        {/* Workspace meta row — flat, inline */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {myWorkspaces.map(w => {
            const isActive = w.id === currentWorkspaceId;
            const role = w.captains.includes(currentUser) ? "captain" : w.firstMates.includes(currentUser) ? "first mate" : "crew";
            const roleColor = role === "captain" ? t.amber : role === "first mate" ? (t.cyan || t.accent) : t.textMuted;
            const wMyCount = visibleStages.filter(s => s.wsId === w.id && (claims[s.stageId] || []).includes(currentUser)).length;
            return (
              <button
                key={w.id}
                onClick={() => onSwitchWorkspace(w.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "transparent", border: "none",
                  padding: 0, cursor: "pointer",
                  borderBottom: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
                  paddingBottom: 2, transition: "border-color 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{w.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? t.accent : t.text }}>{w.name}</span>
                <span style={{ fontSize: 10, color: roleColor, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{role}</span>
                <span style={{ fontSize: 10, color: t.textDim, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Users size={12} strokeWidth={2} /> {w.members.length}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Zap size={12} strokeWidth={2} /> {w.pipelineIds.length}
                  </span>
                  {wMyCount > 0 && <span style={{ marginLeft: 3 }}>· {wMyCount} yours</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <TasksView
        t={t}
        allPipelines={visiblePipelines}
        customStages={customStages}
        pipeMetaOverrides={pipeMetaOverrides}
        subtasks={subtasks}
        claims={claims}
        reactions={reactions}
        comments={comments}
        getStatus={getStatus}
        sc={sc}
        users={users}
        currentUser={currentUser}
        handleClaim={handleClaim}
        handleReact={handleReact}
        toggleSubtask={toggleSubtask}
        shareStage={shareStage}
        addComment={addComment}
        commentInput={commentInput}
        setCommentInput={setCommentInput}
        copied={copied}
        isLocked={isLocked}
        setStageStatus={setStageStatus}
        approvedStages={approvedStages}
        approveStage={approveStage}
        isAdmin={isCaptainOfAny}
        assignments={assignments}
        assignTask={assignTask}
        ck={ck}
        showMyAllFilter={true}
        defaultMyAllFilter={isCaptainOfAny ? "all" : "my"}
        pipelineWorkspaceMap={pipelineWorkspaceMap}
        headerLabel="🏠 home"
        stageNameOverrides={stageNameOverrides}
        setStageNameOverride={setStageNameOverride}
        subtaskStages={subtaskStages}
        setSubtaskStage={setSubtaskStage}
      />
    </div>
  );
}
