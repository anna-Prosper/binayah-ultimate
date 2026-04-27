"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Users, Zap } from "lucide-react";
import { T } from "@/lib/themes";
import { type UserType, type Workspace, type SubtaskItem, type CommentItem } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  me: UserType;
  users: UserType[];
  navbarSlot?: React.ReactNode;
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
  renameSubtask?: (sid: string, taskId: number, text: string) => void;
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
  editMode?: boolean;
  archivedStages?: string[];
  onPipelineClick?: (pipelineId: string) => void;
  onUserClick?: (userId: string) => void;
}

export default function HomeView({
  t, me, users, myWorkspaces, allPipelinesGlobal, customStages, pipeMetaOverrides,
  claims, reactions, comments, subtasks, assignments, approvedStages, copied,
  commentInput, setCommentInput, getStatus, sc, ck,
  currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace,
  handleClaim, handleReact, toggleSubtask, renameSubtask, shareStage, addComment, setStageStatus, approveStage, assignTask, isLocked,
  stageNameOverrides, setStageNameOverride, subtaskStages, setSubtaskStage,
  editMode, archivedStages, onPipelineClick, onUserClick, navbarSlot,
}: Props) {
  // null = show all workspaces; string = filter to specific workspace
  const [homeWsFilter, setHomeWsFilter] = useState<string | null>(null);

  // Build full pipeline→workspace map from ALL user's workspaces
  const pipelineWorkspaceMap = useMemo(() => {
    const m: Record<string, { id: string; name: string; icon: string }> = {};
    for (const w of myWorkspaces) {
      for (const pid of w.pipelineIds) {
        if (!m[pid]) m[pid] = { id: w.id, name: w.name, icon: w.icon };
      }
    }
    return m;
  }, [myWorkspaces]);

  // Pipelines visible based on homeWsFilter:
  // null = all pipelines linked to any of user's workspaces
  // set = only pipelines linked to that specific workspace
  const visiblePipelines = useMemo(() => {
    if (homeWsFilter) {
      const ws = myWorkspaces.find(w => w.id === homeWsFilter);
      const ids = new Set(ws?.pipelineIds || []);
      return allPipelinesGlobal.filter(p => ids.has(p.id));
    }
    // All pipelines from all user's workspaces
    const ids = new Set<string>();
    for (const w of myWorkspaces) for (const pid of w.pipelineIds) ids.add(pid);
    return allPipelinesGlobal.filter(p => ids.has(p.id));
  }, [myWorkspaces, allPipelinesGlobal, homeWsFilter]);

  const greeting = `gm, ${me.name.toLowerCase()} 🫡`;

  const getPoints = (uid: string) => {
    let p = 0;
    Object.entries(claims).forEach(([s, claimers]) => {
      if ((claimers as string[]).includes(uid) && approvedStages.includes(s)) p += 10;
    });
    Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if ((r as string[]).includes(uid)) p += 2; }); });
    return p;
  };

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
    <div>
      {/* Greeting + navbar on same line */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.5, lineHeight: 1.15 }}>{greeting}</div>
        {navbarSlot && <div style={{ flexShrink: 0 }}>{navbarSlot}</div>}
      </div>

      {/* Optimized workspace header */}
      {myWorkspaces.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          {/* Workspace switcher row — only shown when there are 2+ workspaces */}
          <div style={{ display: myWorkspaces.length > 1 ? "flex" : "none", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {myWorkspaces.map(w => {
              const isActive = w.id === homeWsFilter;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    const next = homeWsFilter === w.id ? null : w.id;
                    setHomeWsFilter(next);
                    if (next) onSwitchWorkspace(next);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isActive ? t.accent + "18" : "transparent",
                    border: isActive ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: isActive ? t.accent : t.textMuted,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 600,
                    fontFamily: "var(--font-dm-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isActive) el.style.color = t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isActive) el.style.color = t.textMuted;
                  }}
                >
                  <span style={{ fontSize: 14 }}>{w.icon}</span>
                  <span>{w.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active workspace header — reflects the selected tab (homeWsFilter), falls back to current workspace */}
          {(() => {
            const displayWsId = homeWsFilter || currentWorkspaceId;
            return myWorkspaces.find(w => w.id === displayWsId);
          })() && (
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                const displayWsId = homeWsFilter || currentWorkspaceId;
                const activeWs = myWorkspaces.find(w => w.id === displayWsId);
                if (!activeWs) return null;
                const activePipelines = allPipelinesGlobal.filter(p => activeWs.pipelineIds.includes(p.id));
                const totalStages = activePipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                const wsMembers = activeWs.members;
                const wsTeamMembers = users.filter(u => wsMembers.includes(u.id));

                return (
                  <>
                    {/* Header: icon, name, stats + navbar slot on the right */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>{activeWs.icon}</div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>{activeWs.name}</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.green }}>● {activePipelines.length} pipelines</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.cyan || t.accent }}>• {totalStages} stages</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team members section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
                        team ({wsTeamMembers.length})
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {wsTeamMembers.map((u) => {
                          const uPts = getPoints(u.id);
                          const isMe = u.id === currentUser;
                          const role = activeWs.captains.includes(u.id) ? "captain" : activeWs.firstMates.includes(u.id) ? "first mate" : null;
                          return (
                            <div key={u.id} onClick={() => onUserClick?.(u.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: onUserClick ? "pointer" : "default" }}>
                              <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                <AvatarC user={u} size={24} />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: "flex", gap: 6, alignItems: "center" }}>
                                  {u.name.split(" ")[0]}
                                  {role && <span style={{ fontSize: 9, color: role === "captain" ? t.amber : t.cyan || t.accent, background: (role === "captain" ? t.amber : t.cyan || t.accent) + "22", border: `1px solid ${(role === "captain" ? t.amber : t.cyan || t.accent)}44`, borderRadius: 6, padding: "0 4px", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{role === "captain" ? "👑" : "⚓"}</span>}
                                </div>
                                <div style={{ fontSize: 10, color: uPts > 0 ? t.amber : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
        renameSubtask={renameSubtask}
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
        editMode={editMode}
        archivedStages={archivedStages}
        onPipelineClick={onPipelineClick}
        hideConcept={true}
      />
    </div>
  );
}
