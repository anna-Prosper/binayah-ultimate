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
  currentUser, isCaptainOfAny,
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

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginTop: 20 }}>{greeting}</div>
      <div style={{ fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>
        // {myWorkspaces.length} workspace{myWorkspaces.length === 1 ? "" : "s"} · cross-workspace board below
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
