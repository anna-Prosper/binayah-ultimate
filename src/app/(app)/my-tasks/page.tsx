"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useModel } from "@/lib/contexts/ModelContext";
import { ADMIN_IDS } from "@/lib/data";
import TasksView from "@/components/TasksView";

export default function MyTasksPage() {
  const router = useRouter();
  const {
    allPipelinesGlobal,
    customStages,
    pipeMetaOverrides,
    getStatus,
    users,
    currentUser,
    ck,
    workspaces,
    isOfficerOfWorkspace,
    t,
  } = useModel();
  const [workspaceFilter, setWorkspaceFilter] = useState<string | null>(null);

  const myWorkspaces = useMemo(() => {
    if (!currentUser) return [];
    if (ADMIN_IDS.includes(currentUser)) return workspaces;
    return workspaces.filter(w => w.members.includes(currentUser) || w.captains.includes(currentUser));
  }, [currentUser, workspaces]);

  const visiblePipelineIds = useMemo(() => {
    const source = workspaceFilter
      ? myWorkspaces.filter(w => w.id === workspaceFilter)
      : myWorkspaces;
    return new Set(source.flatMap(w => w.pipelineIds));
  }, [myWorkspaces, workspaceFilter]);

  const visiblePipelines = useMemo(
    () => allPipelinesGlobal.filter(p => visiblePipelineIds.has(p.id)),
    [allPipelinesGlobal, visiblePipelineIds]
  );

  const pipelineWorkspaceMap = useMemo(() => {
    const out: Record<string, { id: string; name: string; icon: string }> = {};
    for (const ws of myWorkspaces) {
      for (const pid of ws.pipelineIds) {
        if (!out[pid]) out[pid] = { id: ws.id, name: ws.name, icon: ws.icon };
      }
    }
    return out;
  }, [myWorkspaces]);

  const pill = (active: boolean) => ({
    background: active ? t.accent + "18" : t.bgCard,
    border: `1.5px solid ${active ? t.accent : t.border}`,
    color: active ? t.accent : t.text,
    borderRadius: 16,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 850,
    fontFamily: "var(--font-dm-mono), monospace",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  } as const);

  const isAdmin = workspaceFilter
    ? isOfficerOfWorkspace(workspaceFilter)
    : myWorkspaces.some(w => isOfficerOfWorkspace(w.id));

  return (
    <div style={{ padding: "12px 20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" onClick={() => setWorkspaceFilter(null)} style={pill(workspaceFilter === null)}>
          <span>🌐</span> All
        </button>
        {myWorkspaces.map(ws => (
          <button key={ws.id} type="button" onClick={() => setWorkspaceFilter(ws.id)} style={pill(workspaceFilter === ws.id)}>
            <span>{ws.icon}</span> {ws.name}
          </button>
        ))}
      </div>
      <TasksView
        t={t}
        allPipelines={visiblePipelines}
        customStages={customStages}
        pipeMetaOverrides={pipeMetaOverrides}
        getStatus={getStatus}
        users={users}
        currentUser={currentUser}
        isAdmin={isAdmin}
        ck={ck}
        showMyAllFilter
        defaultMyAllFilter={currentUser === "anna" ? "all" : "my"}
        showConceptToggle
        defaultHideConcept
        pipelineWorkspaceMap={pipelineWorkspaceMap}
        currentWorkspaceId={workspaceFilter}
        availableWorkspaces={myWorkspaces}
        onPipelineClick={(pid) => router.push(`/pipelines/${encodeURIComponent(pid)}`)}
        readOnly={false}
      />
      {visiblePipelines.length === 0 && (
        <div style={{ marginTop: 12, color: t.textDim, fontSize: 12, fontFamily: "var(--font-dm-mono), monospace" }}>
          // no pipelines in this workspace
        </div>
      )}
    </div>
  );
}
