"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { pipelineData, stageDefaults, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

const COLS = [
  { id: "concept",     label: "CONCEPT",  emoji: "💡" },
  { id: "planned",     label: "PLANNED",  emoji: "📋" },
  { id: "in-progress", label: "BUILDING", emoji: "⚡" },
  { id: "active",      label: "LIVE",     emoji: "🔥" },
];

interface Props {
  t: T;
  getStatus: (name: string) => string;
  setStageStatusDirect: (name: string, status: string) => void;
  claims: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  users: UserType[];
  currentUser: string | null;
  sc: Record<string, { l: string; c: string }>;
  ck: Record<string, string>;
  customStages: Record<string, string[]>;
  customPipelines: { id: string; name: string; icon: string; colorKey: string; stages: string[] }[];
  onCardClick: (pipelineId: string, stageName: string) => void;
  searchQ: string;
  lockedPipelines?: string[];
}

export default function KanbanView({ t, getStatus, setStageStatusDirect, claims, reactions, users, currentUser, sc, ck, customStages, customPipelines, onCardClick, searchQ, lockedPipelines = [] }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const allPipelines = [...pipelineData, ...customPipelines];
  const allStages = allPipelines.flatMap(p =>
    [...p.stages, ...(customStages[p.id] || [])].map(name => ({
      name,
      pipelineId: p.id,
      pipelineName: p.name,
      pipelineIcon: p.icon,
      pipelineColor: ck[p.colorKey] || t.accent,
    }))
  );

  const q = searchQ.toLowerCase();
  const visible = q ? allStages.filter(s => s.name.toLowerCase().includes(q) || s.pipelineName.toLowerCase().includes(q)) : allStages;

  return (
    <>
      <style>{`
        .bu-kb-board {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
          animation: fadeIn 0.2s ease;
        }
        .bu-kb-col { min-height: 420px; }
        .bu-kb-empty::after { content: "drag here"; }
        @media (max-width: 768px) {
          .bu-kb-board {
            display: flex;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
            gap: 10px;
            padding-bottom: 12px;
            margin-left: -20px;
            margin-right: -20px;
            padding-left: 20px;
            padding-right: 20px;
          }
          .bu-kb-board::-webkit-scrollbar { display: none; }
          .bu-kb-col {
            flex: 0 0 260px;
            min-width: 260px;
            min-height: 300px;
            scroll-snap-align: start;
          }
          .bu-kb-card-name { font-size: 13px !important; }
          .bu-kb-card-desc { font-size: 10px !important; }
          .bu-kb-card-tag  { font-size: 9px !important; }
          .bu-kb-empty::after { content: "tap a card to move"; }
        }
      `}</style>
      <div className="bu-kb-board">
        {COLS.map(col => {
          const stages = visible.filter(s => getStatus(s.name) === col.id);
          const stc = sc[col.id] || { l: col.label.toLowerCase(), c: t.textMuted };

          return (
            <div
              key={col.id}
              className="bu-kb-col"
              onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
              onDrop={e => { e.preventDefault(); if (dragging) { const draggedStage = visible.find(s => s.name === dragging); if (draggedStage && !lockedPipelines.includes(draggedStage.pipelineId)) setStageStatusDirect(dragging, col.id); } setDragging(null); setDragOver(null); }}
              style={{ background: dragOver === col.id ? stc.c + "0c" : t.bgSoft, border: `2px solid ${dragOver === col.id ? stc.c + "55" : t.border}`, borderRadius: 16, padding: "12px 10px", transition: "all 0.15s" }}
            >
              {/* Column header */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "0 2px" }}>
                <span style={{ fontSize: 14 }}>{col.emoji}</span>
                <span style={{ fontSize: 8, fontWeight: 800, color: stc.c, letterSpacing: 2, fontFamily: "var(--font-dm-mono), monospace" }}>{col.label}</span>
                <div style={{ marginLeft: "auto", background: stc.c + "18", border: `1px solid ${stc.c}33`, borderRadius: 10, padding: "1px 8px" }}>
                  <span style={{ fontSize: 9, color: stc.c, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>{stages.length}</span>
                </div>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stages.map(s => {
                  const def = stageDefaults[s.name] ?? { desc: "", points: 10, status: "concept" };
                  const claimedBy = claims[s.name] || [];
                  const rxTotal = Object.values(reactions[s.name] || {}).reduce((sum, arr) => sum + arr.length, 0);

                  return (
                    <div
                      key={s.name}
                      draggable={!lockedPipelines.includes(s.pipelineId)}
                      onDragStart={e => { if (lockedPipelines.includes(s.pipelineId)) { e.preventDefault(); return; } setDragging(s.name); e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => onCardClick(s.pipelineId, s.name)}
                      style={{ background: t.bgCard, border: `1px solid ${lockedPipelines.includes(s.pipelineId) ? t.amber + "33" : dragging === s.name ? stc.c + "66" : t.border}`, borderLeft: `3px solid ${s.pipelineColor}`, borderRadius: 12, padding: "10px 12px", cursor: lockedPipelines.includes(s.pipelineId) ? "default" : "pointer", opacity: dragging === s.name ? 0.4 : lockedPipelines.includes(s.pipelineId) ? 0.75 : 1, transition: "all 0.15s", boxShadow: t.shadow, userSelect: "none" }}
                    >
                      {/* Pipeline tag */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                        <span style={{ fontSize: 9 }}>{s.pipelineIcon}</span>
                        <span className="bu-kb-card-tag" style={{ fontSize: 7, color: s.pipelineColor, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, background: s.pipelineColor + "15", padding: "1px 6px", borderRadius: 5, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.pipelineName}</span>
                      </div>
                      {/* Name */}
                      <div className="bu-kb-card-name" style={{ fontSize: 11, fontWeight: 700, color: t.text, marginBottom: 4, lineHeight: 1.3 }}>{s.name}</div>
                      {/* Desc */}
                      {def.desc && <div className="bu-kb-card-desc" style={{ fontSize: 8, color: t.textSec, lineHeight: 1.4, marginBottom: 7, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{def.desc}</div>}
                      {/* Footer */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                        {claimedBy.length > 0
                          ? <div style={{ display: "flex" }}>{claimedBy.slice(0, 3).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -3 }}><AvatarC user={u} size={18} /></div> : null; })}</div>
                          : <span style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>unowned</span>
                        }
                        <span style={{ marginLeft: "auto", fontSize: 7, fontFamily: "var(--font-dm-mono), monospace", fontWeight: col.id === "active" ? 700 : 400, color: col.id === "active" ? t.amber : t.textDim }}>+{def.points}pts</span>
                        {rxTotal > 0 && <span style={{ fontSize: 8, color: t.textMuted }}>· {rxTotal}</span>}
                      </div>
                    </div>
                  );
                })}

                {stages.length === 0 && (
                  <div className="bu-kb-empty" style={{ textAlign: "center", padding: "40px 8px", color: t.textDim, fontSize: 8, fontFamily: "var(--font-dm-mono), monospace", borderRadius: 10, border: `2px dashed ${t.border}` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
