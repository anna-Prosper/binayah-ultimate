"use client";

import { useState } from "react";
import { stageDefaults } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { type T } from "@/lib/themes";

type Pipeline = {
  id: string; name: string; desc: string; icon: string;
  colorKey: string; priority: string; totalHours: string; points: number; stages: string[];
};

type UserType = { id: string; name: string; role: string; avatar: string; color: string };

interface Props {
  allPipelines: Pipeline[];
  customStages: Record<string, string[]>;
  getStatus: (name: string) => string;
  claims: Record<string, string[]>;
  users: UserType[];
  sc: Record<string, { l: string; c: string }>;
  ck: Record<string, string>;
  stageDescOverrides: Record<string, string>;
  setStageDescOverride: (name: string, val: string) => void;
  pipeDescOverrides: Record<string, string>;
  setPipeDescOverrides: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  setPipeMetaOverrides: (fn: (prev: Record<string, { name?: string; priority?: string }>) => Record<string, { name?: string; priority?: string }>) => void;
  searchQ: string;
  t: T;
}

const STATUS_WEIGHT: Record<string, number> = { concept: 0, planned: 25, "in-progress": 60, active: 100 };
const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;

export default function OverviewPanel({
  allPipelines, customStages, getStatus, claims, users, sc, ck,
  stageDescOverrides, setStageDescOverride, pipeDescOverrides, setPipeDescOverrides,
  pipeMetaOverrides, setPipeMetaOverrides, searchQ, t,
}: Props) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [editingStageDesc, setEditingStageDesc] = useState<string | null>(null);

  const q = searchQ.toLowerCase();

  const filtered = allPipelines.filter(p => {
    if (!q) return true;
    const stages = [...p.stages, ...(customStages[p.id] || [])];
    return p.name.toLowerCase().includes(q) || stages.some(s => s.toLowerCase().includes(q));
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.2s ease" }}>
      <style>{`
        @media (max-width: 768px) {
          .bu-ov-desc { display: none !important; }
          .bu-ov-name { min-width: 0 !important; flex: 1 !important; max-width: none !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .bu-ov-row  { padding: 9px 12px !important; gap: 8px !important; }
          /* Full-width progress bar on mobile */
          .bu-ov-progress { width: 100% !important; flex-direction: row !important; align-items: center !important; gap: 10px !important; }
          .bu-ov-progress-bar { flex: 1 !important; width: auto !important; }
          .bu-ov-header-right { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; margin-top: 8px !important; }
          .bu-ov-card-header { flex-wrap: wrap !important; }
          /* Leaderboard tap targets */
          .bu-ov-leader-row { min-height: 44px !important; padding: 10px 16px !important; }
        }
      `}</style>
      {filtered.map(p => {
        const pC = ck[p.colorKey] || t.accent;
        const meta = pipeMetaOverrides[p.id] || {};
        const pipeName = meta.name ?? p.name;
        const pipePriority = meta.priority ?? p.priority;
        const pipeDesc = pipeDescOverrides[p.id] ?? p.desc;
        const stages = [...p.stages, ...(customStages[p.id] || [])];
        const pct = stages.length > 0
          ? Math.round(stages.reduce((s, n) => s + (STATUS_WEIGHT[getStatus(n)] || 0), 0) / stages.length)
          : 0;

        const liveCt = stages.filter(s => getStatus(s) === "active").length;
        const buildCt = stages.filter(s => getStatus(s) === "in-progress").length;

        return (
          <div key={p.id} style={{ background: t.bgCard, borderRadius: 18, border: `1px solid ${t.border}`, boxShadow: t.shadow, overflow: "hidden" }}>
            {/* Colored top strip */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${pC}, ${pC}66)` }} />

            {/* Pipeline header */}
            <div style={{ padding: "16px 20px 12px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Editable pipeline name */}
                    {editingName === p.id ? (
                      <input
                        value={pipeName}
                        onChange={e => setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), name: e.target.value } }))}
                        onBlur={() => setEditingName(null)}
                        onKeyDown={e => { if (e.key === "Enter") setEditingName(null); }}
                        autoFocus
                        style={{ fontSize: 17, fontWeight: 800, color: t.text, background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "2px 10px", outline: "none", fontFamily: "inherit", width: "100%" }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{pipeName}</span>
                        <button
                          onClick={() => setEditingName(p.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: t.textDim, padding: "1px 3px", opacity: 0.5, lineHeight: 1 }}
                          title="Rename"
                        >{"\u270E"}</button>
                      </div>
                    )}

                    {/* Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                      <span
                        onClick={() => {
                          const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(pipePriority as typeof PRIORITY_CYCLE[number]) + 1) % PRIORITY_CYCLE.length];
                          setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), priority: next } }));
                        }}
                        style={{ fontSize: 8, fontWeight: 800, color: pC, background: pC + "14", border: `1px solid ${pC}30`, padding: "2px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}
                        title="Click to cycle priority"
                      >{pipePriority}</span>
                      <span style={{ fontSize: 8, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{stages.length} stages · {p.totalHours}</span>
                      {liveCt > 0 && <span style={{ fontSize: 8, color: t.green, fontFamily: "var(--font-dm-mono), monospace" }}>{liveCt} live</span>}
                      {buildCt > 0 && <span style={{ fontSize: 8, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>{buildCt} building</span>}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="bu-ov-progress" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: pct === 100 ? t.green : pC, fontFamily: "var(--font-dm-mono), monospace" }}>{pct}%</span>
                  <div className="bu-ov-progress-bar" style={{ width: 80, height: 4, background: t.surface, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: pct === 100 ? t.green : pC, borderRadius: 2, transition: "width 0.4s" }} />
                  </div>
                </div>
              </div>

              {/* Editable description */}
              <div style={{ marginTop: 10 }}>
                {editingDesc === p.id ? (
                  <textarea
                    value={pipeDesc}
                    onChange={e => setPipeDescOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                    onBlur={() => setEditingDesc(null)}
                    autoFocus
                    rows={2}
                    style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}33`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.6 }}
                  />
                ) : (
                  <p
                    onClick={() => setEditingDesc(p.id)}
                    style={{ fontSize: 11, color: t.textSec, lineHeight: 1.6, margin: 0, cursor: "text", padding: "4px 0" }}
                    title="Click to edit"
                  >
                    {pipeDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>add a description...</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Stage rows */}
            <div style={{ borderTop: `1px solid ${t.border}` }}>
              {stages.map((name, i) => {
                const status = getStatus(name);
                const col = sc[status]?.c || t.textDim;
                const label = sc[status]?.l || status;
                const s = stageDefaults[name] ?? { desc: "", points: 10 };
                const desc = stageDescOverrides[name] ?? s.desc ?? "";
                const owners = (claims[name] || []).map(uid => users.find(u => u.id === uid)).filter(Boolean) as UserType[];
                const isEvenRow = i % 2 === 0;

                return (
                  <div
                    key={name}
                    className="bu-ov-row"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "9px 20px",
                      background: isEvenRow ? "transparent" : t.surface + "40",
                      borderBottom: i < stages.length - 1 ? `1px solid ${t.border}40` : "none",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Status dot */}
                    <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: status === "active" ? `0 0 6px ${col}88` : "none" }} />

                    {/* Status label */}
                    <span style={{ fontSize: 7, fontWeight: 800, color: col, fontFamily: "var(--font-dm-mono), monospace", textTransform: "uppercase", letterSpacing: 1, flexShrink: 0, width: 46 }}>{label}</span>

                    {/* Stage name */}
                    <span className="bu-ov-name" style={{ fontSize: 12, fontWeight: 700, color: t.text, flexShrink: 0, minWidth: 120, maxWidth: 200 }}>{name}</span>

                    {/* Stage description — editable */}
                    <div className="bu-ov-desc" style={{ flex: 1, minWidth: 0 }}>
                      {editingStageDesc === name ? (
                        <input
                          value={desc}
                          onChange={e => setStageDescOverride(name, e.target.value)}
                          onBlur={() => setEditingStageDesc(null)}
                          onKeyDown={e => { if (e.key === "Enter") setEditingStageDesc(null); }}
                          autoFocus
                          style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}33`, borderRadius: 6, padding: "3px 8px", fontSize: 10, color: t.textSec, fontFamily: "inherit", outline: "none" }}
                        />
                      ) : (
                        <span
                          onClick={() => setEditingStageDesc(name)}
                          style={{ fontSize: 10, color: t.textSec, cursor: "text", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                          title={desc || "click to add description"}
                        >
                          {desc || <span style={{ color: t.textDim, fontStyle: "italic" }}>—</span>}
                        </span>
                      )}
                    </div>

                    {/* Owners */}
                    <div style={{ display: "flex", alignItems: "center", gap: -3, flexShrink: 0 }}>
                      {owners.length === 0
                        ? <span style={{ fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>—</span>
                        : owners.map((u, j) => (
                          <div key={u.id} style={{ marginLeft: j === 0 ? 0 : -6, zIndex: owners.length - j }}>
                            <AvatarC user={u} size={18} />
                          </div>
                        ))
                      }
                    </div>

                    {/* Points */}
                    <span style={{ fontSize: 9, fontWeight: 700, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0, minWidth: 36, textAlign: "right" }}>
                      {s.points}pt
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11 }}>
          no initiatives match &quot;{searchQ}&quot;
        </div>
      )}
    </div>
  );
}
