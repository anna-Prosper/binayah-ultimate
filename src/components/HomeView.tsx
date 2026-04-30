"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { T } from "@/lib/themes";
import { type UserType, type Workspace, ADMIN_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import UserPopup from "@/components/ui/UserPopup";
import { useModel } from "@/lib/contexts/ModelContext";

const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  me: UserType;
  users: UserType[];
  navbarSlot?: React.ReactNode;
  myWorkspaces: Workspace[];
  allPipelinesGlobal: Pipeline[];
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  currentUser: string;
  isCaptainOfAny: boolean;
  currentWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  editMode?: boolean;
  onPipelineClick?: (pipelineId: string) => void;
  onUserClick?: (userId: string) => void;
  viewingUser?: string | null;
  setViewingUser?: (id: string | null) => void;
  onChangeAvatar?: (userId: string, avatar: string) => void;
}

export default function HomeView({
  t, me, users, myWorkspaces, allPipelinesGlobal, pipeMetaOverrides,
  currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace,
  editMode, onPipelineClick, onUserClick, navbarSlot,
  viewingUser, setViewingUser, onChangeAvatar,
}: Props) {
  const {
    claims, reactions, approvedStages, customStages, getPoints: modelGetPoints,
    owners, assignments, subtasks,
    getStatus, ck,
  } = useModel();

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
    const ids = new Set<string>();
    if (homeWsFilter) {
      const ws = myWorkspaces.find(w => w.id === homeWsFilter);
      (ws?.pipelineIds || []).forEach(pid => ids.add(pid));
    } else {
      for (const w of myWorkspaces) for (const pid of w.pipelineIds) ids.add(pid);
    }
    // Also include pipelines that contain any stage/subtask the current user owns or is assigned to.
    // This guarantees the "mine" tab can never miss a user\'s items, even if a pipeline isn\'t
    // explicitly linked to one of their workspaces.
    if (currentUser) {
      const userInList = (key: string) =>
        (claims[key] || []).includes(currentUser) ||
        (assignments[key] || []).includes(currentUser) ||
        (owners[key] || []).includes(currentUser);
      for (const p of allPipelinesGlobal) {
        if (ids.has(p.id)) continue;
        const allStagesInPipe = [...p.stages, ...(customStages[p.id] || [])];
        const hasOwnedStage = allStagesInPipe.some(userInList);
        const hasOwnedSubtask = !hasOwnedStage && allStagesInPipe.some(s =>
          (subtasks[s] || []).some(sub => userInList(`${s}::${sub.id}`))
        );
        if (hasOwnedStage || hasOwnedSubtask) ids.add(p.id);
      }
    }
    return allPipelinesGlobal.filter(p => ids.has(p.id));
  }, [myWorkspaces, allPipelinesGlobal, homeWsFilter, currentUser, claims, assignments, owners, customStages, subtasks]);

  const greeting = `gm, ${me.name.toLowerCase()} 🫡`;

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
          {/* Workspace switcher row — "All" tab + per-workspace tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {/* "All" tab — selected when no workspace filter is active */}
            {(() => {
              const isAllActive = homeWsFilter === null;
              return (
                <button
                  key="__all__"
                  onClick={() => setHomeWsFilter(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isAllActive ? t.accent + "18" : "transparent",
                    border: isAllActive ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: isAllActive ? t.accent : t.textMuted,
                    fontSize: 12,
                    fontWeight: isAllActive ? 700 : 600,
                    fontFamily: "var(--font-dm-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isAllActive) el.style.color = t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isAllActive) el.style.color = t.textMuted;
                  }}
                >
                  <span style={{ fontSize: 14 }}>🌐</span>
                  <span>All</span>
                </button>
              );
            })()}
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

          {/* Summary card — shows aggregate "all" view when no workspace selected, or specific workspace when one is */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                // "All" mode: aggregate across every workspace the user is in
                if (homeWsFilter === null) {
                  const allPipelineIds = new Set<string>();
                  for (const w of myWorkspaces) for (const pid of w.pipelineIds) allPipelineIds.add(pid);
                  const allPipelines = allPipelinesGlobal.filter(p => allPipelineIds.has(p.id));
                  const totalStages = allPipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                  const allMemberIds = new Set<string>();
                  for (const w of myWorkspaces) for (const m of w.members) allMemberIds.add(m);
                  const allTeamMembers = users.filter(u => allMemberIds.has(u.id));
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>🌐</div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>All workspaces</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.accent }}>◆ {myWorkspaces.length} workspaces</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.green }}>● {allPipelines.length} pipelines</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.cyan || t.accent }}>• {totalStages} stages</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
                          team ({allTeamMembers.length})
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {allTeamMembers.map(u => {
                            const uPts = modelGetPoints(u.id);
                            const isMe = u.id === currentUser;
                            return (
                              <div key={u.id} style={{ position: "relative" }}>
                                <button
                                  type="button"
                                  data-testid="team-avatar"
                                  onClick={e => { e.stopPropagation(); onUserClick?.(u.id); }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.borderColor = u.color + "88"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = isMe ? t.accent + "44" : t.border; }}
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, border-color 0.15s" }}
                                >
                                  <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                    <AvatarC user={u} size={24} />
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{u.name.split(" ")[0]}</div>
                                    <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                                  </div>
                                </button>
                                {viewingUser === u.id && setViewingUser && (
                                  <UserPopup user={u} onClose={() => setViewingUser(null)} onChangeAvatar={onChangeAvatar} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                }

                // Specific workspace selected
                const activeWs = myWorkspaces.find(w => w.id === homeWsFilter);
                if (!activeWs) return null;
                const activePipelines = allPipelinesGlobal.filter(p => activeWs.pipelineIds.includes(p.id));
                const totalStages = activePipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                const wsMembers = activeWs.members;
                const wsTeamMembers = users.filter(u => wsMembers.includes(u.id));

                return (
                  <>
                    {/* Header: icon, name, stats */}
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
                          const uPts = modelGetPoints(u.id);
                          const isMe = u.id === currentUser;
                          const role: "root" | "operator" | null =
                            ADMIN_IDS.includes(u.id) ? "root"
                            : activeWs.captains.includes(u.id) ? "operator"
                            : null;
                          return (
                            <div key={u.id} style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onUserClick?.(u.id); }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.borderColor = u.color + "88"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = isMe ? t.accent + "44" : t.border; }}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, border-color 0.15s" }}
                              >
                                <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                  <AvatarC user={u} size={24} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: "flex", gap: 6, alignItems: "center" }}>
                                    {u.name.split(" ")[0]}
                                    {role && <span style={{ fontSize: 11, color: t.text, fontWeight: 800 }} title={role}>{role === "root" ? "🔑" : "⚡"}</span>}
                                  </div>
                                  <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                                </div>
                              </button>
                              {viewingUser === u.id && setViewingUser && (
                                <UserPopup user={u} onClose={() => setViewingUser(null)} onChangeAvatar={onChangeAvatar} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
        </div>
      )}

      <TasksView
        t={t}
        allPipelines={visiblePipelines}
        customStages={customStages}
        pipeMetaOverrides={pipeMetaOverrides}
        getStatus={getStatus}
        users={users}
        currentUser={currentUser}
        isAdmin={isCaptainOfAny}
        ck={ck}
        showMyAllFilter={true}
        defaultMyAllFilter={isCaptainOfAny ? "all" : "my"}
        pipelineWorkspaceMap={pipelineWorkspaceMap}
        headerLabel="🏠 home"
        editMode={editMode}
        onPipelineClick={onPipelineClick}
        currentWorkspaceId={homeWsFilter}
        availableWorkspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, pipelineIds: w.pipelineIds }))}
      />
    </div>
  );
}
