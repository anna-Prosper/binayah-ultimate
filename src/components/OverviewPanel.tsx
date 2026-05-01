"use client";

import { useState } from "react";
import { stageDefaults } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { type T } from "@/lib/themes";

type Pipeline = {
  id: string; name: string; desc: string; icon: string;
  colorKey: string; priority: string; totalHours?: string; points: number; stages: string[];
};

type UserType = { id: string; name: string; role: string; avatar: string; color: string; aiAvatar?: string };

type ActivityEntry = {
  type: string;
  user: string;
  target: string;
  detail: string;
  pipeline?: string;
  time: number;
};

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
  activityLog: ActivityEntry[];
  t: T;
  readOnly?: boolean;
}

const STATUS_WEIGHT: Record<string, number> = { concept: 0, planned: 25, "in-progress": 60, active: 100 };
const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusColor(status: string, t: T): string {
  switch (status) {
    case "active": return t.green;
    case "in-progress": return t.cyan;
    case "planned": return t.amber;
    default: return t.textMuted;
  }
}

function StatusSwatch({ status, t }: { status: string; t: T }) {
  const color = statusColor(status, t);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700, color,
      fontFamily: "var(--font-geist-mono), monospace",
      letterSpacing: 0.5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {status}
    </span>
  );
}

export default function OverviewPanel({
  allPipelines, customStages, getStatus, claims, users, sc, ck,
  stageDescOverrides, setStageDescOverride, pipeDescOverrides, setPipeDescOverrides,
  pipeMetaOverrides, setPipeMetaOverrides, searchQ, activityLog, t, readOnly = false,
}: Props) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const [editingStageDesc, setEditingStageDesc] = useState<string | null>(null);
  const [panelView, setPanelView] = useState<"metrics" | "timeline">("metrics");
  // For timeline: selected pipeline (default to first pipeline)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const q = searchQ.toLowerCase();

  const filtered = allPipelines.filter(p => {
    if (!q) return true;
    const stages = [...p.stages, ...(customStages[p.id] || [])];
    return p.name.toLowerCase().includes(q) || stages.some(s => s.toLowerCase().includes(q));
  });

  // Determine which pipeline to show in timeline
  const activePipeline = selectedPipelineId
    ? allPipelines.find(p => p.id === selectedPipelineId) ?? filtered[0]
    : filtered[0];

  // Filter activity log to status_change entries for selected pipeline
  const timelineEntries = activityLog.filter(
    a => a.type === "status_change" && (!activePipeline || a.pipeline === activePipeline.id)
  );

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

      {/* View toggle */}
      <div style={{ display: "flex", gap: 0, padding: "0", background: t.surface, borderRadius: 12, border: `1px solid ${t.border}`, width: "fit-content", alignSelf: "flex-end" }}>
        {(["metrics", "timeline"] as const).map(v => (
          <button
            key={v}
            onClick={() => setPanelView(v)}
            style={{
              padding: "4px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: 0.8,
              transition: "background 0.15s, color 0.15s",
              background: panelView === v ? t.bgCard : "transparent",
              color: panelView === v ? t.text : t.textMuted,
              boxShadow: panelView === v ? t.shadow : "none",
            }}
          >
            {v === "metrics" ? "// metrics" : "// timeline"}
          </button>
        ))}
      </div>

      {/* TIMELINE VIEW */}
      {panelView === "timeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Pipeline selector */}
          {filtered.length > 1 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {filtered.map(p => {
                const pC = ck[p.colorKey] || t.accent;
                const isActive = (selectedPipelineId ?? filtered[0]?.id) === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPipelineId(p.id)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 16,
                      border: `1px solid ${isActive ? pC : t.border}`,
                      background: isActive ? `${pC}14` : "transparent",
                      color: isActive ? pC : t.textMuted,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-geist-mono), monospace",
                      transition: "all 0.15s",
                    }}
                  >
                    {p.icon} {pipeMetaOverrides[p.id]?.name ?? p.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Timeline card */}
          <div style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, boxShadow: t.shadow, overflow: "hidden" }}>
            {activePipeline && (
              <>
                {/* Card header */}
                <div style={{ padding: "12px 20px 8px", borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{activePipeline.icon}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>
                      {pipeMetaOverrides[activePipeline.id]?.name ?? activePipeline.name}
                    </span>
                    <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-geist-mono), monospace", marginLeft: 4 }}>
                      // status history
                    </span>
                  </div>
                </div>

                {/* Timeline entries */}
                {timelineEntries.length === 0 ? (
                  <div style={{ padding: "40px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>⚡</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, fontFamily: "var(--font-geist-mono), monospace", marginBottom: 4 }}>
                      // no moves yet
                    </div>
                    <div style={{ fontSize: 13, color: t.textDim, fontFamily: "var(--font-geist-mono), monospace" }}>
                      stake something — change a stage status to start the clock
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "4px 0" }}>
                    {timelineEntries.map((entry, i) => {
                      const actor = users.find(u => u.id === entry.user);
                      // Parse "from → to" from detail field
                      const parts = entry.detail.split(" → ");
                      const fromStatus = parts[0] ?? "concept";
                      const toStatus = parts[1] ?? entry.detail;
                      const isLast = i === timelineEntries.length - 1;

                      return (
                        <div key={`${entry.time}-${i}`} style={{ display: "flex", gap: 0, position: "relative" }}>
                          {/* Vertical rail */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0, paddingTop: 12 }}>
                            {/* Node dot */}
                            <div style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: statusColor(toStatus, t),
                              boxShadow: `0 0 6px ${statusColor(toStatus, t)}66`,
                              flexShrink: 0, zIndex: 1,
                            }} />
                            {/* Connector line */}
                            {!isLast && (
                              <div style={{
                                width: 1, flex: 1, minHeight: 20,
                                background: `${t.border}`,
                                marginTop: 0,
                              }} />
                            )}
                          </div>

                          {/* Row content */}
                          <div style={{
                            flex: 1, padding: "8px 16px 8px 4px",
                            borderBottom: !isLast ? `1px solid ${t.border}30` : "none",
                            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                          }}>
                            {/* Stage name */}
                            <span style={{
                              fontSize: 13, fontWeight: 700, color: t.text,
                              minWidth: 100, maxWidth: 180,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}>
                              {entry.target}
                            </span>

                            {/* Transition swatches */}
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              <StatusSwatch status={fromStatus} t={t} />
                              <span style={{ fontSize: 11, color: t.textDim }}>→</span>
                              <StatusSwatch status={toStatus} t={t} />
                            </div>

                            {/* Spacer */}
                            <div style={{ flex: 1 }} />

                            {/* Actor avatar + time */}
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                              {actor && (
                                <>
                                  <AvatarC user={actor} size={18} />
                                  <span style={{ fontSize: 11, color: t.textSec, fontFamily: "var(--font-geist-mono), monospace" }}>
                                    {actor.name.split(" ")[0]}
                                  </span>
                                </>
                              )}
                              <span style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-geist-mono), monospace" }} title={new Date(entry.time).toLocaleString()}>
                                {relativeTime(entry.time)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* METRICS VIEW */}
      {panelView === "metrics" && (
        <>
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
              <div key={p.id} style={{ background: t.bgCard, borderRadius: 16, border: `1px solid ${t.border}`, boxShadow: t.shadow, overflow: "hidden" }}>
                {/* Colored top strip */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${pC}, ${pC}66)` }} />

                {/* Pipeline header */}
                <div style={{ padding: "16px 20px 12px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 0 }}>{p.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Editable pipeline name */}
                        {editingName === p.id ? (
                          <input
                            value={pipeName}
                            onChange={e => setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), name: e.target.value } }))}
                            onBlur={() => setEditingName(null)}
                            onKeyDown={e => { if (e.key === "Enter") setEditingName(null); }}
                            autoFocus
                            style={{ fontSize: 17, fontWeight: 800, color: t.text, background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "0 8px", outline: "none", fontFamily: "inherit", width: "100%" }}
                          />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 17, fontWeight: 800, color: t.text, lineHeight: 1.2 }}>{pipeName}</span>
                            {!readOnly && (
                              <button
                                onClick={() => setEditingName(p.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: t.textDim, padding: "0 4px", opacity: 0.5, lineHeight: 1 }}
                                title="Rename"
                              >{"✎"}</button>
                            )}
                          </div>
                        )}

                        {/* Badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                          <span
                            onClick={() => {
                              if (readOnly) return;
                              const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(pipePriority as typeof PRIORITY_CYCLE[number]) + 1) % PRIORITY_CYCLE.length];
                              setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), priority: next } }));
                            }}
                            style={{ fontSize: 10, fontWeight: 800, color: pC, background: pC + "14", border: `1px solid ${pC}30`, padding: "0 8px", borderRadius: 8, cursor: readOnly ? "default" : "pointer", fontFamily: "var(--font-dm-mono), monospace" }}
                            title={readOnly ? "Priority" : "Click to cycle priority"}
                          >{pipePriority}</span>
                          <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{stages.length} stages</span>
                          {liveCt > 0 && <span style={{ fontSize: 10, color: t.green, fontFamily: "var(--font-dm-mono), monospace" }}>{liveCt} live</span>}
                          {buildCt > 0 && <span style={{ fontSize: 10, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>{buildCt} building</span>}
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
                  <div style={{ marginTop: 8 }}>
                    {editingDesc === p.id ? (
                      <textarea
                        value={pipeDesc}
                        onChange={e => setPipeDescOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onBlur={() => setEditingDesc(null)}
                        autoFocus
                        rows={2}
                        style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.6 }}
                      />
                    ) : (
                      <p
                        onClick={() => { if (!readOnly) setEditingDesc(p.id); }}
                        style={{ fontSize: 13, color: t.textSec, lineHeight: 1.6, margin: 0, cursor: readOnly ? "default" : "text", padding: "4px 0" }}
                        title={readOnly ? pipeDesc : "Click to edit"}
                      >
                        {pipeDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>add a description...</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stage rows */}
                <div style={{ borderTop: `1px solid ${t.border}` }}>
                  {stages.length === 0 && (
                    <div style={{ padding: "20px 24px", textAlign: "center", fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontStyle: "italic" }}>
                      // no stages yet — add some to this pipeline
                    </div>
                  )}
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
                          padding: "8px 20px",
                          background: isEvenRow ? "transparent" : t.surface + "40",
                          borderBottom: i < stages.length - 1 ? `1px solid ${t.border}40` : "none",
                          transition: "background 0.15s",
                        }}
                      >
                        {/* Status dot */}
                        <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: col, boxShadow: status === "active" ? `0 0 6px ${col}88` : "none" }} />

                        {/* Status label */}
                        <span style={{ fontSize: 10, fontWeight: 800, color: col, fontFamily: "var(--font-dm-mono), monospace", textTransform: "uppercase", letterSpacing: 0.5, flexShrink: 0, width: 46 }}>{label}</span>

                        {/* Stage name */}
                        <span className="bu-ov-name" style={{ fontSize: 13, fontWeight: 700, color: t.text, flexShrink: 0, minWidth: 120, maxWidth: 200 }}>{name}</span>

                        {/* Stage description — editable */}
                        <div className="bu-ov-desc" style={{ flex: 1, minWidth: 0 }}>
                          {editingStageDesc === name ? (
                            <input
                              value={desc}
                              onChange={e => setStageDescOverride(name, e.target.value)}
                              onBlur={() => setEditingStageDesc(null)}
                              onKeyDown={e => { if (e.key === "Enter") setEditingStageDesc(null); }}
                              autoFocus
                              style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.textSec, fontFamily: "inherit", outline: "none" }}
                            />
                          ) : (
                            <span
                              onClick={() => { if (!readOnly) setEditingStageDesc(name); }}
                              style={{ fontSize: 13, color: t.textSec, cursor: readOnly ? "default" : "text", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                              title={desc || (readOnly ? "" : "click to add description")}
                            >
                              {desc || <span style={{ color: t.textDim, fontStyle: "italic" }}>—</span>}
                            </span>
                          )}
                        </div>

                        {/* Owners */}
                        <div style={{ display: "flex", alignItems: "center", gap: -3, flexShrink: 0 }}>
                          {owners.length === 0
                            ? <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>—</span>
                            : owners.map((u, j) => (
                              <div key={u.id} style={{ marginLeft: j === 0 ? 0 : -6, zIndex: owners.length - j }}>
                                <AvatarC user={u} size={18} />
                              </div>
                            ))
                          }
                        </div>

                        {/* Points */}
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0, minWidth: 36, textAlign: "right" }}>
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
            <div style={{ textAlign: "center", padding: "48px 0", color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontSize: 13 }}>
              no initiatives match &quot;{searchQ}&quot;
            </div>
          )}
        </>
      )}
    </div>
  );
}
