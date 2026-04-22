"use client";

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

export default function TasksView({
  t, allPipelines, customStages, pipeMetaOverrides, subtasks, claims,
  getStatus, sc, users, currentUser, onClaim, onSubtaskToggle,
}: Props) {
  const ck: Record<string, string> = {
    blue: t.accent, purple: t.purple, green: t.green, amber: t.amber,
    cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate,
  };

  // Build enriched pipeline list
  const pipelines = allPipelines.map(p => ({
    ...p,
    displayName: pipeMetaOverrides[p.id]?.name || p.name,
    allStages: [...p.stages, ...(customStages[p.id] || [])],
    color: ck[p.colorKey] || t.accent,
  }));

  // Stage tasks: actionable stages across all pipelines
  const stageTasks = pipelines.flatMap(p =>
    p.allStages
      .filter(s => ACTIONABLE.has(getStatus(s)))
      .map(s => ({
        stageId: s,
        pipelineId: p.id,
        pipelineName: p.displayName,
        pipelineIcon: p.icon,
        pipelineColor: p.color,
        status: getStatus(s),
        claimers: claims[s] || [],
        stageSubtasks: subtasks[s] || [],
        subtaskDone: (subtasks[s] || []).filter(t => t.done).length,
        subtaskTotal: (subtasks[s] || []).length,
      }))
  );

  // Sort stage tasks: active first, then in-progress, then planned
  const statusOrder: Record<string, number> = { active: 0, "in-progress": 1, planned: 2 };
  stageTasks.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  // Open subtasks: undone subtasks across all pipelines/stages
  const openSubtasks = pipelines.flatMap(p =>
    p.allStages.flatMap(s =>
      (subtasks[s] || [])
        .filter(sub => !sub.done)
        .map(sub => ({
          taskId: sub.id,
          text: sub.text,
          stageId: s,
          by: sub.by,
          pipelineName: p.displayName,
          pipelineIcon: p.icon,
          pipelineColor: p.color,
        }))
    )
  );

  const isMyClaim = (stageId: string) => currentUser ? (claims[stageId] || []).includes(currentUser) : false;

  return (
    <div style={{ padding: "20px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 1 }}>// tasks</div>
        <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3 }}>
          {stageTasks.length} active stages · {openSubtasks.length} open subtasks
        </div>
      </div>

      {/* Stage tasks */}
      {stageTasks.length === 0 && openSubtasks.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// all clear — nothing in flight</div>
        </div>
      ) : (
        <>
          {stageTasks.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 10 }}>stages in flight</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stageTasks.map(task => {
                  const mine = isMyClaim(task.stageId);
                  const st = sc[task.status];
                  return (
                    <div key={task.stageId} style={{ background: t.bgCard, border: `1px solid ${mine ? task.pipelineColor + "44" : t.border}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Status pill */}
                      <span style={{ fontSize: 7, fontWeight: 700, color: st?.c || t.textDim, background: (st?.c || t.textDim) + "18", border: `1px solid ${(st?.c || t.textDim)}33`, borderRadius: 6, padding: "2px 7px", whiteSpace: "nowrap", fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }}>
                        {st?.l || task.status}
                      </span>

                      {/* Stage name + pipeline breadcrumb */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.stageId}</div>
                        <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>
                          {task.pipelineIcon} {task.pipelineName}
                          {task.subtaskTotal > 0 && (
                            <span style={{ marginLeft: 8, color: task.subtaskDone === task.subtaskTotal ? t.green : t.textDim }}>
                              {task.subtaskDone}/{task.subtaskTotal} subtasks
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Claimers */}
                      {task.claimers.length > 0 && (
                        <div style={{ display: "flex", gap: -4 }}>
                          {task.claimers.slice(0, 3).map(id => {
                            const u = users.find(u => u.id === id);
                            return u ? <AvatarC key={id} user={u} size={20} /> : null;
                          })}
                        </div>
                      )}

                      {/* Claim button */}
                      {currentUser && (
                        <button
                          onClick={() => onClaim(task.stageId)}
                          style={{ background: mine ? t.green + "18" : t.bgSoft || t.surface, border: `1px solid ${mine ? t.green + "44" : t.border}`, borderRadius: 8, padding: "3px 10px", cursor: "pointer", fontSize: 8, color: mine ? t.green : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                          {mine ? "claimed ✓" : "claim"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Open subtasks */}
          {openSubtasks.length > 0 && (
            <section>
              <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 10 }}>open subtasks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {openSubtasks.map(sub => (
                  <div
                    key={`${sub.stageId}-${sub.taskId}`}
                    style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => onSubtaskToggle(sub.stageId, sub.taskId)}
                  >
                    {/* Checkbox */}
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${t.border}`, background: "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }} />

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.text}</div>
                      <div style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 1 }}>
                        {sub.pipelineIcon} {sub.pipelineName} → {sub.stageId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
