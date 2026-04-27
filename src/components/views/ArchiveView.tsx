"use client";

import { useModel } from "@/lib/contexts/ModelContext";

export default function ArchiveView() {
  const { archived, stageNameOverrides, pipeMetaOverrides, allPipelinesGlobal, restoreStage, restorePipeline, t } = useModel();
  const { stages: archivedStages, pipelines: archivedPipelines } = archived;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>📦 archive</div>
      </div>
      {archivedStages.length === 0 && archivedPipelines.length === 0 ? (
        <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>// nothing archived yet</div>
      ) : (
        <>
          {archivedStages.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 6 }}>tasks ({archivedStages.length})</div>
              {archivedStages.map(sid => (
                <div key={sid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stageNameOverrides[sid] || sid}</span>
                  <button onClick={() => restoreStage(sid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
                </div>
              ))}
            </div>
          )}
          {archivedPipelines.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 6 }}>pipelines ({archivedPipelines.length})</div>
              {archivedPipelines.map(pid => {
                const p = allPipelinesGlobal.find(p => p.id === pid);
                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 12, color: t.text }}>{p?.icon} {pipeMetaOverrides[pid]?.name || p?.name || pid}</span>
                    <button onClick={() => restorePipeline(pid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
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
