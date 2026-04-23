"use client";

import { useState, useMemo } from "react";
import { T } from "@/lib/themes";
import { type UserType, type Workspace } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }

interface Props {
  t: T;
  me: UserType;
  users: UserType[];
  workspaces: Workspace[];            // all workspaces (used to filter to user's)
  myWorkspaces: Workspace[];          // workspaces user is a member of
  allPipelinesGlobal: Pipeline[];     // unscoped pipelines across all workspaces
  customStages: Record<string, string[]>;
  claims: Record<string, string[]>;
  assignments: Record<string, string>;
  subtasks: Record<string, { id: number; done: boolean; text: string; by: string }[]>;
  getStatus: (name: string) => string;
  sc: Record<string, { l: string; c: string }>;
  approvedStages: string[];
  currentUser: string;
  isCaptainOfAny: boolean;
  currentWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  onNavigateToNow: () => void;
  ck: Record<string, string>;
}

const ACTIONABLE = new Set(["planned", "in-progress", "active", "blocked"]);

export default function HomeView({
  t, me, users, workspaces, myWorkspaces, allPipelinesGlobal, customStages, claims, assignments, subtasks, getStatus, sc, approvedStages, currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace, onNavigateToNow, ck,
}: Props) {
  const [filter, setFilter] = useState<"my" | "all">(isCaptainOfAny ? "all" : "my");

  // Build lookup: stageId → which workspace owns it (via its pipeline)
  const pipelineWorkspace = useMemo(() => {
    const m = new Map<string, Workspace>();
    for (const w of myWorkspaces) {
      for (const pid of w.pipelineIds) m.set(pid, w);
    }
    return m;
  }, [myWorkspaces]);

  // All stages in the user's workspaces that are actionable
  const visibleStages = useMemo(() => {
    const out: { stageId: string; pipeline: Pipeline; workspace: Workspace; status: string; color: string; }[] = [];
    for (const p of allPipelinesGlobal) {
      const ws = pipelineWorkspace.get(p.id);
      if (!ws) continue; // pipeline not in any workspace user belongs to
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      for (const s of stages) {
        const status = getStatus(s);
        if (!ACTIONABLE.has(status)) continue;
        if (status === "active" && approvedStages.includes(s)) continue; // hide approved
        out.push({ stageId: s, pipeline: p, workspace: ws, status, color: ck[p.colorKey] || t.accent });
      }
    }
    return out;
  }, [allPipelinesGlobal, pipelineWorkspace, customStages, getStatus, approvedStages, ck, t.accent]);

  const myStages = useMemo(() =>
    visibleStages.filter(s => (claims[s.stageId] || []).includes(currentUser) || assignments[s.stageId] === currentUser)
  , [visibleStages, claims, assignments, currentUser]);

  const displayedStages = filter === "my" ? myStages : visibleStages;

  // Open subtasks across my workspaces assigned/owned by me
  const myOpenSubtasks = useMemo(() => {
    const out: { key: string; stageId: string; taskId: number; text: string; pipeline: Pipeline; workspace: Workspace }[] = [];
    for (const p of allPipelinesGlobal) {
      const ws = pipelineWorkspace.get(p.id);
      if (!ws) continue;
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      for (const s of stages) {
        if (getStatus(s) === "active") continue;
        for (const sub of (subtasks[s] || [])) {
          if (sub.done) continue;
          const key = `${s}::${sub.id}`;
          const claimedByMe = (claims[key] || []).includes(currentUser);
          const assignedToMe = assignments[key] === currentUser;
          if (filter === "my" && !claimedByMe && !assignedToMe && sub.by !== currentUser) continue;
          out.push({ key, stageId: s, taskId: sub.id, text: sub.text, pipeline: p, workspace: ws });
        }
      }
    }
    return out;
  }, [allPipelinesGlobal, pipelineWorkspace, customStages, subtasks, claims, assignments, getStatus, currentUser, filter]);

  // Pending approval queue: unapproved active stages in workspaces where I'm captain or first-mate
  const pendingQueue = useMemo(() => {
    const out: typeof visibleStages = [];
    for (const p of allPipelinesGlobal) {
      const ws = pipelineWorkspace.get(p.id);
      if (!ws) continue;
      const isOfficer = ws.captains.includes(currentUser) || ws.firstMates.includes(currentUser);
      if (!isOfficer) continue;
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      for (const s of stages) {
        if (getStatus(s) === "active" && !approvedStages.includes(s)) {
          out.push({ stageId: s, pipeline: p, workspace: ws, status: "active", color: ck[p.colorKey] || t.accent });
        }
      }
    }
    return out;
  }, [allPipelinesGlobal, pipelineWorkspace, customStages, approvedStages, getStatus, currentUser, ck, t.accent]);

  const filterBtn = (active: boolean): React.CSSProperties => ({
    background: active ? t.accent + "22" : "transparent",
    border: `1px solid ${active ? t.accent + "55" : t.border}`,
    borderRadius: 10, padding: "6px 14px", cursor: "pointer",
    fontSize: 10, color: active ? t.accent : t.textMuted,
    fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace",
  });

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Greeting + toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>gm, {me.name.toLowerCase()} 🫡</div>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 4 }}>
            // {myWorkspaces.length} workspace{myWorkspaces.length === 1 ? "" : "s"} · {myStages.length} of your tasks · {myOpenSubtasks.length} open subtasks
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={filterBtn(filter === "my")} onClick={() => setFilter("my")}>🧑 my tasks</button>
          <button style={filterBtn(filter === "all")} onClick={() => setFilter("all")}>🌍 all tasks</button>
        </div>
      </div>

      {/* Pending approval — only shown to officers */}
      {pendingQueue.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, color: t.amber, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 10, fontWeight: 700 }}>
            👑 awaiting your approval ({pendingQueue.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendingQueue.map(s => (
              <button
                key={s.stageId}
                onClick={() => { onSwitchWorkspace(s.workspace.id); onNavigateToNow(); }}
                style={{ background: t.bgCard, border: `1px solid ${t.amber}55`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
              >
                <span style={{ fontSize: 7, fontWeight: 700, color: t.amber, background: t.amber + "18", border: `1px solid ${t.amber}33`, borderRadius: 5, padding: "2px 6px", fontFamily: "var(--font-dm-mono), monospace" }}>⏳ pending</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{s.stageId}</div>
                  <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2 }}>{s.workspace.icon} {s.workspace.name} · {s.pipeline.icon} {s.pipeline.name}</div>
                </div>
                <span style={{ fontSize: 9, color: t.textDim }}>→</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Your workspaces */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 9, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 10, fontWeight: 700 }}>
          your workspaces
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {myWorkspaces.map(w => {
            const isActive = w.id === currentWorkspaceId;
            const wStages = visibleStages.filter(s => s.workspace.id === w.id);
            const wMyStages = myStages.filter(s => s.workspace.id === w.id);
            const wPending = pendingQueue.filter(s => s.workspace.id === w.id);
            const role = w.captains.includes(currentUser) ? "CAPTAIN" : w.firstMates.includes(currentUser) ? "FIRST MATE" : "CREW";
            const roleColor = role === "CAPTAIN" ? t.amber : role === "FIRST MATE" ? (t.cyan || t.accent) : t.textDim;
            return (
              <button
                key={w.id}
                onClick={() => onSwitchWorkspace(w.id)}
                style={{ background: t.bgCard, border: `1px solid ${isActive ? t.accent + "55" : t.border}`, borderRadius: 12, padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, textAlign: "left", transition: "border-color 0.15s" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{w.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
                    <div style={{ fontSize: 7, color: roleColor, background: roleColor + "18", border: `1px solid ${roleColor}44`, borderRadius: 4, padding: "1px 5px", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 1, display: "inline-block", marginTop: 3 }}>{role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span>{w.members.length} members</span>
                  <span>{w.pipelineIds.length} pipelines</span>
                  <span>{wStages.length} tasks</span>
                  {wMyStages.length > 0 && <span style={{ color: t.accent, fontWeight: 700 }}>{wMyStages.length} yours</span>}
                  {wPending.length > 0 && <span style={{ color: t.amber, fontWeight: 700 }}>{wPending.length} pending</span>}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Your tasks / all tasks */}
      <section style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>
            {filter === "my" ? "your tasks" : "all tasks across your workspaces"} ({displayedStages.length})
          </div>
          <button onClick={onNavigateToNow} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 9, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>open kanban →</button>
        </div>
        {displayedStages.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
              {filter === "my" ? "// no tasks on your plate — enjoy it" : "// no tasks across your workspaces"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {displayedStages.slice(0, 20).map(s => {
              const st = sc[s.status];
              const mine = (claims[s.stageId] || []).includes(currentUser);
              const assigneeId = assignments[s.stageId];
              const assignee = assigneeId ? users.find(u => u.id === assigneeId) : null;
              return (
                <button
                  key={s.stageId}
                  onClick={() => { onSwitchWorkspace(s.workspace.id); onNavigateToNow(); }}
                  style={{ background: t.bgCard, border: `1px solid ${mine ? s.color + "55" : t.border}`, borderRadius: 10, padding: "9px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
                >
                  {st && <span style={{ fontSize: 7, fontWeight: 700, color: st.c, background: st.c + "18", border: `1px solid ${st.c}33`, borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap", fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }}>{st.l}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.stageId}</div>
                    <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>
                      {s.workspace.icon} {s.workspace.name} · {s.pipeline.icon} {s.pipeline.name}
                      {assignee && <span style={{ marginLeft: 8, color: assignee.color, fontWeight: 700 }}>→ {assignee.name}</span>}
                    </div>
                  </div>
                  {(claims[s.stageId] || []).slice(0, 2).map(uid => {
                    const u = users.find(u => u.id === uid);
                    return u ? <AvatarC key={uid} user={u} size={18} /> : null;
                  })}
                </button>
              );
            })}
            {displayedStages.length > 20 && (
              <button onClick={onNavigateToNow} style={{ background: "transparent", border: `1px dashed ${t.border}`, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 9, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2 }}>
                + {displayedStages.length - 20} more — open kanban →
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
