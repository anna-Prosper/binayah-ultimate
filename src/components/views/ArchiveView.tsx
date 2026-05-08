"use client";

import { useMemo, useState } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { SubtaskKey } from "@/lib/subtaskKey";

export default function ArchiveView({ fullPage = false }: { fullPage?: boolean }) {
  const { archived, stageNameOverrides, pipeMetaOverrides, allPipelinesGlobal, subtasks, restoreStage, restorePipeline, restoreSubtask, activityLog, users, t } = useModel();
  const [query, setQuery] = useState("");
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

  const q = query.trim().toLowerCase();
  const filteredStages = archivedStages.filter(sid => !q || `${stageNameOverrides[sid] || sid} ${archiveMeta.get(sid) || ""}`.toLowerCase().includes(q));
  const filteredPipelines = archivedPipelines.filter(pid => {
    const p = allPipelinesGlobal.find(p => p.id === pid);
    return !q || `${pipeMetaOverrides[pid]?.name || p?.name || pid} ${archiveMeta.get(pid) || ""}`.toLowerCase().includes(q);
  });
  const filteredSubtasks = resolvedSubtasks.filter(s => !q || `${s.text} ${s.parentStageName} ${archiveMeta.get(s.key) || ""}`.toLowerCase().includes(q));
  const nothingArchived = archivedStages.length === 0 && archivedPipelines.length === 0 && resolvedSubtasks.length === 0;
  const nothingFiltered = filteredStages.length === 0 && filteredPipelines.length === 0 && filteredSubtasks.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: fullPage ? "flex-end" : "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: mono, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.7 }}>archive</div>
          <div style={{ fontSize: fullPage ? 24 : 13, fontWeight: 900, color: t.text }}>restorable work</div>
          {fullPage && (
            <div style={{ marginTop: 4, color: t.textDim, fontSize: 13, fontFamily: mono, lineHeight: 1.5 }}>
              {archivedStages.length} tasks · {resolvedSubtasks.length} subtasks · {archivedPipelines.length} pipelines
              <br />Archive does not auto-empty. Items leave only when restored or when old local-only data is replaced by the shared server state.
            </div>
          )}
        </div>
        {fullPage && <input value={query} onChange={e => setQuery(e.target.value)} placeholder="search archive..." style={{ width: 260, maxWidth: "100%", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "9px 11px", color: t.text, outline: "none", fontFamily: mono, fontSize: 13 }} />}
      </div>
      {nothingArchived ? (
        <div style={{ fontSize: 13, color: t.textDim, fontFamily: mono, lineHeight: 1.6 }}>
          // nothing archived in shared state right now.
          <br />Archive is a restore list, not a timed trash bin.
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
                  <button onClick={() => restoreStage(sid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
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
                    <div style={{ fontSize: 11, color: t.textDim, fontFamily: mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>under: {s.parentStageName}{archiveMeta.get(s.key) ? ` · ${archiveMeta.get(s.key)}` : ""}</div>
                  </div>
                  <button onClick={() => restoreSubtask(s.key)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
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
                    <button onClick={() => restorePipeline(pid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
