"use client";

import { useMemo, useState } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { SubtaskKey } from "@/lib/subtaskKey";
import { CheckCircle2, Archive } from "lucide-react";

export default function ArchiveView({ fullPage = false }: { fullPage?: boolean }) {
  const { archived, stageNameOverrides, pipeMetaOverrides, allPipelinesGlobal, subtasks, restoreStage, restorePipeline, restoreSubtask, activityLog, users, t } = useModel();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"archive" | "completed">("completed");
  const mono = "var(--font-dm-mono), monospace";
  const archivedStages = Array.from(new Set(archived.stages));
  const archivedPipelines = Array.from(new Set(archived.pipelines));
  const archivedSubtasks = Array.from(new Set(archived.subtasks));

  const archiveMeta = useMemo(() => {
    const map = new Map<string, string>();
    activityLog.filter(e => e.type === "archive").forEach(e => {
      const by = users.find(u => u.id === e.user)?.name || e.user;
      map.set(e.target, `${by} · ${new Date(e.time).toLocaleDateString()}`);
    });
    return map;
  }, [activityLog, users]);

  // Resolve archived subtask keys back to their text + parent stage for display
  const resolvedSubtasks = archivedSubtasks.map(key => {
    const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
    const parentStageId = parsed?.parentStageId || "";
    const subtaskId = parsed?.subtaskId;
    const sub = parentStageId && subtaskId !== undefined
      ? (subtasks[parentStageId] || []).find(s => s.id === subtaskId)
      : undefined;
    return {
      key,
      parentStageId,
      parentStageName: stageNameOverrides[parentStageId] || parentStageId || "(unknown)",
      text: sub?.text || "(text unavailable)",
    };
  });

  // Completed tasks: all done=true subtasks across every stage, grouped by pipeline
  const completedByPipeline = useMemo(() => {
    const groups: { pipeline: typeof allPipelinesGlobal[number]; stage: string; tasks: { id: number; text: string; by: string }[] }[] = [];
    for (const [stageId, items] of Object.entries(subtasks)) {
      const done = (items as { id: number; text: string; done: boolean; by: string }[]).filter(s => s.done);
      if (done.length === 0) continue;
      const pipeline = allPipelinesGlobal.find(p => p.stages?.includes(stageId));
      const stageName = stageNameOverrides[stageId] || stageId;
      const existing = groups.find(g => g.pipeline?.id === pipeline?.id && g.stage === stageName);
      if (existing) { existing.tasks.push(...done.map(d => ({ id: d.id, text: d.text, by: d.by }))); }
      else groups.push({ pipeline: pipeline as typeof allPipelinesGlobal[number], stage: stageName, tasks: done.map(d => ({ id: d.id, text: d.text, by: d.by })) });
    }
    return groups.sort((a, b) => (a.pipeline?.name || "").localeCompare(b.pipeline?.name || ""));
  }, [subtasks, allPipelinesGlobal, stageNameOverrides]);

  const totalCompleted = completedByPipeline.reduce((acc, g) => acc + g.tasks.length, 0);

  const q = query.trim().toLowerCase();
  const filteredStages = archivedStages.filter(sid => !q || `${stageNameOverrides[sid] || sid} ${archiveMeta.get(sid) || ""}`.toLowerCase().includes(q));
  const filteredPipelines = archivedPipelines.filter(pid => {
    const p = allPipelinesGlobal.find(p => p.id === pid);
    return !q || `${pipeMetaOverrides[pid]?.name || p?.name || pid} ${archiveMeta.get(pid) || ""}`.toLowerCase().includes(q);
  });
  const filteredSubtasks = resolvedSubtasks.filter(s => !q || `${s.text} ${s.parentStageName} ${archiveMeta.get(s.key) || ""}`.toLowerCase().includes(q));
  const nothingArchived = archivedStages.length === 0 && archivedPipelines.length === 0 && resolvedSubtasks.length === 0;
  const nothingFiltered = filteredStages.length === 0 && filteredPipelines.length === 0 && filteredSubtasks.length === 0;

  const filteredCompleted = q
    ? completedByPipeline.map(g => ({ ...g, tasks: g.tasks.filter(t => t.text.toLowerCase().includes(q) || g.stage.toLowerCase().includes(q) || (g.pipeline?.name || "").toLowerCase().includes(q)) })).filter(g => g.tasks.length > 0)
    : completedByPipeline;

  const tabBtn = (tab: "archive" | "completed", icon: React.ReactNode, label: string, count: number) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: activeTab === tab ? t.accent + "18" : "transparent",
        border: `1px solid ${activeTab === tab ? t.accent + "55" : t.border}`,
        borderRadius: 10, padding: "7px 14px", cursor: "pointer",
        fontSize: 13, color: activeTab === tab ? t.accent : t.textMuted,
        fontWeight: activeTab === tab ? 700 : 400,
        fontFamily: mono,
      }}
    >
      {icon}
      {label}
      <span style={{ background: activeTab === tab ? t.accent + "22" : t.bgHover, borderRadius: 6, padding: "1px 6px", fontSize: 11, fontWeight: 700 }}>{count}</span>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, alignItems: fullPage ? "flex-end" : "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>archive</div>
          <div style={{ fontSize: fullPage ? 24 : 13, fontWeight: 900, color: t.text }}>
            {activeTab === "completed" ? "completed tasks" : "restorable work"}
          </div>
        </div>
        {fullPage && <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search..." style={{ width: 240, maxWidth: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 13 }} />}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {tabBtn("completed", <CheckCircle2 size={13} />, "completed tasks", totalCompleted)}
        {tabBtn("archive", <Archive size={13} />, "archive", archivedStages.length + resolvedSubtasks.length + archivedPipelines.length)}
      </div>

      {/* Completed Tasks Tab */}
      {activeTab === "completed" && (
        totalCompleted === 0 ? (
          <div style={{ fontSize: 13, color: t.textDim, fontFamily: mono, lineHeight: 1.6 }}>
            // no completed tasks yet. Mark subtasks as done ✓ and they will appear here permanently.
          </div>
        ) : filteredCompleted.length === 0 ? (
          <div style={{ fontSize: 12, color: t.textDim, fontFamily: mono, border: `1px dashed ${t.border}`, borderRadius: 12, padding: 24 }}>// no completed tasks match this search</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {filteredCompleted.map((group, gi) => (
              <div key={gi}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 13 }}>{group.pipeline?.icon || "📋"}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.accent, fontFamily: mono }}>{group.pipeline?.name || "General"}</span>
                  <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>› {group.stage}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: t.textDim, fontFamily: mono }}>{group.tasks.length} done</span>
                </div>
                {group.tasks.map(task => {
                  const u = users.find(u => u.id === task.by);
                  return (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: t.bgCard, marginBottom: 3, border: `1px solid ${t.border}` }}>
                      <CheckCircle2 size={13} style={{ color: t.green, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.text}</span>
                      {u && <span style={{ fontSize: 11, color: t.textDim, fontFamily: mono, flexShrink: 0 }}>{u.name.split(" ")[0]}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )
      )}

      {/* Archive Tab */}
      {activeTab === "archive" && (
        nothingArchived ? (
          <div style={{ fontSize: 13, color: t.textDim, fontFamily: mono, lineHeight: 1.6 }}>
            // nothing archived yet.<br />Archive is a restore list, not a timed trash bin.
          </div>
        ) : nothingFiltered ? (
          <div style={{ fontSize: 12, color: t.textDim, fontFamily: mono, border: `1px dashed ${t.border}`, borderRadius: 12, padding: 24 }}>// no archived items match this search</div>
        ) : (
          <>
            {filteredStages.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: mono, marginBottom: 6 }}>tasks ({filteredStages.length})</div>
                {filteredStages.map(sid => (
                  <div key={sid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stageNameOverrides[sid] || sid}</div>
                      {archiveMeta.get(sid) && <div style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>{archiveMeta.get(sid)}</div>}
                    </div>
                    <button onClick={() => restoreStage(sid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 700, fontFamily: mono }}>restore</button>
                  </div>
                ))}
              </div>
            )}
            {filteredSubtasks.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: mono, marginBottom: 6 }}>subtasks ({filteredSubtasks.length})</div>
                {filteredSubtasks.map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⤷ {s.text}</div>
                      <div style={{ fontSize: 11, color: t.textDim, fontFamily: mono }}>under: {s.parentStageName}{archiveMeta.get(s.key) ? ` · ${archiveMeta.get(s.key)}` : ""}</div>
                    </div>
                    <button onClick={() => restoreSubtask(s.key)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 700, fontFamily: mono }}>restore</button>
                  </div>
                ))}
              </div>
            )}
            {filteredPipelines.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: mono, marginBottom: 6 }}>pipelines ({filteredPipelines.length})</div>
                {filteredPipelines.map(pid => {
                  const p = allPipelinesGlobal.find(p => p.id === pid);
                  return (
                    <div key={pid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 13, color: t.text }}>{p?.icon} {pipeMetaOverrides[pid]?.name || p?.name || pid}</span>
                      <button onClick={() => restorePipeline(pid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 700, fontFamily: mono }}>restore</button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
