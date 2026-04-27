"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
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
}

export default function HomeView({
  t, me, users, myWorkspaces, allPipelinesGlobal, customStages, pipeMetaOverrides,
  claims, reactions, comments, subtasks, assignments, approvedStages, copied,
  commentInput, setCommentInput, getStatus, sc, ck,
  currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace,
  handleClaim, handleReact, toggleSubtask, shareStage, addComment, setStageStatus, approveStage, assignTask, isLocked,
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

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginTop: 20 }}>{greeting}</div>
      <div style={{ fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4, marginBottom: 20 }}>
        // {myWorkspaces.length} workspace{myWorkspaces.length === 1 ? "" : "s"} · cross-workspace board below
      </div>

      {/* Workspace cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        {myWorkspaces.map(w => {
          const isActive = w.id === currentWorkspaceId;
          const role = w.captains.includes(currentUser) ? "captain" : w.firstMates.includes(currentUser) ? "first mate" : "crew";
          const roleColor = role === "captain" ? t.amber : role === "first mate" ? (t.cyan || t.accent) : t.textMuted;
          const wTaskCount = visibleStages.filter(s => s.wsId === w.id).length;
          const wMyCount = visibleStages.filter(s => s.wsId === w.id && (claims[s.stageId] || []).includes(currentUser)).length;
          return (
            <button
              key={w.id}
              onClick={() => onSwitchWorkspace(w.id)}
              style={{
                background: isActive ? t.accent + "10" : t.bgCard,
                border: `1px solid ${isActive ? t.accent + "55" : t.border}`,
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                textAlign: "left",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = t.accent + "33"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{w.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? t.accent : t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name}</div>
                  <span style={{ fontSize: 10, color: roleColor, background: roleColor + "18", borderRadius: 8, padding: "2px 8px", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, display: "inline-block", marginTop: 4 }}>{role}</span>
                </div>
                {isActive && <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>●</span>}
              </div>
              <div style={{ display: "flex", gap: 12, fontFamily: "var(--font-dm-mono), monospace" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{w.members.length}</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>members</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{w.pipelineIds.length}</span>
                  <span style={{ fontSize: 10, color: t.textMuted }}>pipelines</span>
                </div>
                {wTaskCount > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: wMyCount > 0 ? t.accent : t.text }}>{wMyCount > 0 ? wMyCount : wTaskCount}</span>
                    <span style={{ fontSize: 10, color: t.textMuted }}>{wMyCount > 0 ? "yours" : "tasks"}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
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
      />
    </div>
  );
}
