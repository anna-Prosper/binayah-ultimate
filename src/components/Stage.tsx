"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/themes";
import { SubtaskKey } from "@/lib/subtaskKey";
import { REACTIONS, stageDefaults, stageLongDescs, type SubtaskItem } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Chev } from "@/components/ui/primitives";
import ClaimChip from "@/components/ui/ClaimChip";
import mockupsMap from "@/components/mockups/mockupsMap";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import { useModel } from "@/lib/contexts/ModelContext";
import BottomSheet from "@/components/ui/BottomSheet";
import { lsGet, lsSet } from "@/lib/storage";

// ── Relative-time helper for activity tab ─────────────────────────────────────
function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = diff / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Activity type icon (text fallback) ───────────────────────────────────────
function actIcon(type: string): string {
  switch (type) {
    case "claim": return "✋";
    case "comment": return "💬";
    case "status": return "→";
    case "create": return "+";
    default: return "·";
  }
}

// ─── Full-featured subtask card (used inside Stage expanded / mobile views) ──
function StageSubtaskCard({
  task, stageId, pC, t,
  onToggle, onRemove,
}: {
  task: SubtaskItem; stageId: string; pC: string; t: T;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { users, currentUser, reactions, comments, claims, handleClaim, handleReact, addComment } = useModel();
  const { copied, setCopied } = useEphemeral();
  const key = SubtaskKey.make(stageId, task.id);
  const [reactOpen, setReactOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentInputVal, setCommentInputVal] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setReactOpen(false); setCommentOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const shareSubtask = (name: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(name); setTimeout(() => setCopied(null), 2000);
  };

  const rxs = reactions[key] || {};
  const cmts = comments[key] || [];
  const claimers = claims[key] || [];
  const isClaimed = currentUser ? claimers.includes(currentUser) : false;
  const creator = users.find(u => u.id === task.by);
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);

  const iconBtn: React.CSSProperties = {
    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "3px 8px", cursor: "pointer", fontSize: 10, color: t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4,
  };

  return (
    <div ref={ref} style={{ background: task.done ? t.green + "08" : t.bgCard, border: `1px solid ${task.done ? t.green + "33" : t.border}`, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div onClick={onToggle} style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${task.done ? t.green : t.border}`, background: task.done ? t.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", marginTop: 2 }}>
          {task.done && <span style={{ fontSize: 10, color: "#fff" }}>✓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: task.done ? t.textDim : t.text, textDecoration: task.done ? "line-through" : "none", lineHeight: 1.3 }}>{task.text}</div>
          {creator && <div style={{ fontSize: 10, color: t.textDim, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><AvatarC user={creator} size={12} /> {creator.name.split(" ")[0]}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {claimers.slice(0, 2).map(id => { const u = users.find(u => u.id === id); return u ? <AvatarC key={id} user={u} size={18} /> : null; })}
          <ClaimChip claimed={isClaimed} pipelineColor={pC} t={t} onClaim={() => handleClaim(key)} variant="subtask" small />
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: t.textDim, padding: "0 2px", opacity: 0.4 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; (e.currentTarget as HTMLElement).style.color = t.red; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.4"; (e.currentTarget as HTMLElement).style.color = t.textDim; }}>×</button>
        </div>
      </div>

      {/* Reaction pills */}
      {visibleReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visibleReactions.map(([emoji, us]) => {
            const mine = currentUser ? us.includes(currentUser) : false;
            return <button key={emoji} onClick={() => handleReact(key, emoji)} style={{ background: mine ? t.accent + "18" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 10, padding: "1px 8px", cursor: "pointer", fontSize: 12, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>{emoji} <span style={{ fontSize: 10, fontWeight: 700 }}>{us.length}</span></button>;
          })}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: "flex", gap: 4, borderTop: `1px solid ${t.border}`, paddingTop: 6 }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => { setReactOpen(v => !v); setCommentOpen(false); }} style={iconBtn}>😀 +</button>
          {reactOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100 }}>
              {REACTIONS.map(emoji => <button key={emoji} onClick={() => { handleReact(key, emoji); setReactOpen(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, padding: "4px 4px", borderRadius: 8 }}>{emoji}</button>)}
            </div>
          )}
        </div>
        <button onClick={() => { setCommentOpen(v => !v); setReactOpen(false); }} style={iconBtn}>💬 {cmts.length}</button>
        <button onClick={() => shareSubtask(key, `${task.text} (subtask)`)} style={iconBtn}>{copied === key ? "✓ copied" : "📋 copy"}</button>
      </div>

      {/* Comment box */}
      {commentOpen && (
        <div style={{ background: t.bgHover || t.bgSoft, border: `1px solid ${t.border}`, borderRadius: 10, padding: 8 }}>
          {cmts.length > 0 && (
            <div style={{ maxHeight: 100, overflowY: "auto", marginBottom: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {cmts.slice(-4).map(c => { const u = users.find(u => u.id === c.by); return <div key={c.id} style={{ display: "flex", gap: 4 }}>{u && <AvatarC user={u} size={14} />}<div style={{ flex: 1 }}><span style={{ fontSize: 10, fontWeight: 700, color: u?.color || t.text }}>{u?.name} </span><span style={{ fontSize: 11, color: t.text }}>{c.text}</span></div></div>; })}
            </div>
          )}
          <div style={{ display: "flex", gap: 4 }}>
            <input value={commentInputVal} onChange={e => setCommentInputVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addComment(key, commentInputVal, () => setCommentInputVal("")); setCommentOpen(false); } }} placeholder="comment..." style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 12, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }} />
            <button onClick={() => { addComment(key, commentInputVal, () => setCommentInputVal("")); setCommentOpen(false); }} style={{ background: t.accent, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 700 }}>↵</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StageProps {
  name: string;
  idx: number;
  tot: number;
  pC: string;
  pId: string;
  t: T;
  expS: string | null;
  setExpS: (v: string | null) => void;
  isMobile?: boolean;
  isTopClaim?: boolean;
}

export default function Stage({
  name, idx, tot, pC, pId, t, expS, setExpS,
  isMobile = false,
  isTopClaim = false,
}: StageProps) {
  const {
    claims, reactions: rxns, comments, subtasks, users, currentUser, me,
    stageDescOverrides, stageImages, liveNotifs, activityLog,
    handleClaim, handleReact, cycleStatus,
    addSubtask, toggleSubtask, lockSubtask, removeSubtask, addComment,
    setStageDescOverride, setStageNameOverride,
    addStageImage, removeStageImage, archiveStage,
    getStatus, sc,
  } = useModel();
  const { reactOpen, setReactOpen, copied, setCopied, claimAnim, setClaimAnim } = useEphemeral();

  const handleClaimWithAnim = (sid: string) => {
    const alreadyClaimed = currentUser ? (claims[sid] || []).includes(currentUser) : false;
    handleClaim(sid);
    if (!alreadyClaimed && currentUser) {
      setClaimAnim({ stage: sid, pts: s.points || 10 });
      setTimeout(() => setClaimAnim(null), 1200);
    }
  };

  // Local UI state (stage-specific, not shared)
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingShortDesc, setEditingShortDesc] = useState(false);
  const [stageEditMode, setStageEditMode] = useState(false);
  const [editingName, setEditingName] = useState(name);
  const [isHovered, setIsHovered] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showMockup, setShowMockup] = useState(false);
  const [subtaskInputVal, setSubtaskInputVal] = useState("");
  const [commentInputVal, setCommentInputVal] = useState("");
  // Activity tab state
  const [activeDetailTab, setActiveDetailTab] = useState<"comments" | "activity">("comments");
  // "Since you were here" — snapshot taken at expand time
  const [seenAtMount, setSeenAtMount] = useState<number | undefined>(undefined);
  // Ref to card for edit-mode click-outside
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset editing name when name prop changes (e.g. after rename is applied)
  useEffect(() => { setEditingName(name); }, [name]);
  const k = `${pId}-${idx}`;
  const isE = expS === k;

  // "Since you were here" — snapshot lastSeenComments on expand, update on collapse
  useEffect(() => {
    if (isE) {
      const stored = lsGet<Record<string, number>>("lastSeenComments", {});
      setSeenAtMount(stored[name]);
    } else {
      // On collapse: update lastSeen timestamp
      lsSet("lastSeenComments", {
        ...lsGet<Record<string, number>>("lastSeenComments", {}),
        [name]: Date.now(),
      });
    }
  }, [isE, name]);

  // Click-outside handler — exits edit mode when clicking outside the card
  const commitEditMode = useCallback(() => {
    if (editingName.trim() && editingName.trim() !== name) {
      setStageNameOverride(name, editingName.trim());
    }
    setStageEditMode(false);
    setEditingDesc(false);
    setEditingShortDesc(false);
  }, [editingName, name, setStageNameOverride]);

  useEffect(() => {
    if (!stageEditMode) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        commitEditMode();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") commitEditMode();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [stageEditMode, commitEditMode]);

  const shareStage = (stageName: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(stageName); setTimeout(() => setCopied(null), 2000);
  };

  // Fallback for custom stages not in stageDefaults
  const s = stageDefaults[name] ?? { desc: "", points: 10, status: "concept" };
  const effectiveStatus = getStatus(name);
  const st = sc[effectiveStatus] ?? { l: "concept", c: "#888" };
  const claimedBy = claims[name] || [];
  const claimedByMe = currentUser ? claimedBy.includes(currentUser) : false;
  const MockupComp = mockupsMap[name] ?? null;
  const tasks = subtasks[name] || [];
  const cmts = comments[name] || [];
  const tasksDone = tasks.filter(x => x.done).length;
  const isMockOpen = showMockup;
  void isMockOpen; // used implicitly via setShowMockup
  const currentDesc = stageDescOverrides[name] ?? s.desc;
  const aboutDesc = stageDescOverrides[name] ?? (stageLongDescs[name] || s.desc);

  const openPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpS(k);
    setShowMockup(true);
  };
  void openPreview; // available for mockup preview button if added

  return (
    <div style={{ display: "flex" }}>
      {/* Timeline dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0, paddingTop: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${st.c}`, background: effectiveStatus === "active" ? st.c : "transparent", boxShadow: effectiveStatus === "active" ? `0 0 8px ${st.c}44` : "none", zIndex: 1 }} />
        {idx < tot - 1 && <div style={{ width: 1.5, flex: 1, background: `${st.c}22`, marginTop: 0 }} />}
      </div>

      {/* Card */}
      {(() => {
        const hasLive = !!(liveNotifs[name]?.comment || liveNotifs[name]?.reaction);
        const liveColor = liveNotifs[name]?.comment ? t.green : t.accent;
        // On mobile, tapping opens a BottomSheet instead of inline-expanding
        const handleCardClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          // In edit mode, clicks within the card should not expand/collapse
          if (stageEditMode) return;
          if (isMobile) {
            setMobileSheetOpen(true);
          } else {
            setExpS(isE ? null : k);
          }
        };
        return (
      <div ref={cardRef} onClick={handleCardClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={{ flex: 1, background: stageEditMode ? t.bgCard : (isE ? t.bgHover : t.bgSoft), border: `1px solid ${hasLive ? liveColor + "66" : stageEditMode ? t.accent + "44" : claimedByMe ? pC + "55" : isE ? pC + "33" : t.border}`, borderRadius: 16, marginBottom: idx < tot - 1 ? 6 : 0, cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.3s, background 0.15s", overflow: "hidden", boxShadow: hasLive ? `inset 3px 0 0 ${pC}, ${isE ? t.shadowLg : t.shadow}, 0 0 16px ${liveColor}22` : (stageEditMode ? `inset 3px 0 0 ${pC}, inset 0 0 0 9999px ${t.accent}08, ${isE ? t.shadowLg : t.shadow}` : `inset 3px 0 0 ${pC}, ${isE ? t.shadowLg : t.shadow}`), position: "relative" }}>

        {/* Header row — on mobile: name+status on first line, meta on second */}
        <div style={{ padding: isMobile ? "10px 12px 4px" : "10px 14px 4px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 4 : 8 }}>
          {/* Line 1: chevron + name + status */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1, width: "100%" }}>
            <Chev open={isMobile ? mobileSheetOpen : isE} color={pC} />
            {stageEditMode ? (
              <input
                autoFocus
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onClick={e => e.stopPropagation()}
                onBlur={() => {
                  const trimmed = editingName.trim();
                  if (trimmed && trimmed !== name) setStageNameOverride(name, trimmed);
                  setStageEditMode(false);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    const trimmed = editingName.trim();
                    if (trimmed && trimmed !== name) setStageNameOverride(name, trimmed);
                    setStageEditMode(false);
                  } else if (e.key === "Escape") {
                    e.stopPropagation();
                    setEditingName(name);
                    setStageEditMode(false);
                  }
                }}
                style={{ fontSize: 13, fontWeight: 700, color: t.text, flex: 1, background: pC + "08", border: `2px dashed ${pC}55`, borderRadius: 6, padding: "0 4px", outline: "none", fontFamily: "inherit" }}
              />
            ) : (
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{name}</span>
            )}
            <span onClick={e => { e.stopPropagation(); cycleStatus(name); }} style={{ fontSize: 10, fontWeight: 700, color: st.c, background: st.c + "12", padding: "0 8px", borderRadius: 8, flexShrink: 0, cursor: "pointer" }} title="Click to cycle status">{st.l}</span>
          </div>

          {/* Line 2 (mobile) or inline (desktop): reactions + meta */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, position: "relative", flexWrap: "wrap", ...(isMobile ? { paddingLeft: 20 } : {}) }} onClick={e => e.stopPropagation()}>
            {/* Live reaction pop */}
            {liveNotifs[name]?.reaction && (
              <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 16, pointerEvents: "none", animation: "emojiPop 1.2s ease-out forwards", zIndex: 10 }}>
                {liveNotifs[name].reaction}
              </span>
            )}
            {/* Existing reactions */}
            {(() => {
              const sr = rxns[name] || {};
              const existing = Object.entries(sr).filter(([, v]) => v.length > 0);
              if (reactOpen === name) {
                return REACTIONS.map(r => { const us = sr[r] || []; const mine = us.includes(currentUser!); const has = us.length > 0; return (
                  <button key={r} onClick={() => handleReact(name, r)} style={{ background: mine ? t.accent + "22" : has ? t.surface : "transparent", border: "none", borderRadius: 12, padding: isMobile ? "6px 8px" : "4px 8px", minHeight: isMobile ? 44 : undefined, cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit", opacity: has ? 1 : 0.35, transform: mine ? "scale(1.15)" : "scale(1)" }}>
                    <span style={{ fontSize: has ? 13 : 11 }}>{r}</span>
                    {has && <span style={{ fontSize: 10, color: mine ? t.accent : t.textMuted, fontWeight: 700 }}>{us.length}</span>}
                  </button>); });
              }
              return existing.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (
                <button key={emoji} onClick={() => handleReact(name, emoji)} style={{ background: mine ? t.accent + "18" : t.surface, border: "none", borderRadius: 12, padding: isMobile ? "6px 8px" : "4px 8px", minHeight: isMobile ? 44 : undefined, cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit" }}>
                  <span style={{ fontSize: 13 }}>{emoji}</span>
                  <span style={{ fontSize: 10, color: mine ? t.accent : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                </button>); });
            })()}

            {/* React toggle */}
            <button onClick={() => setReactOpen(reactOpen === name ? null : name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: isMobile ? "8px 12px" : "4px 8px", minHeight: isMobile ? 44 : undefined, cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: "inherit" }}>
              {"😀"}
            </button>



            {claimedBy.length > 0 && <div style={{ display: "flex", marginLeft: 0 }}>{claimedBy.slice(0, 3).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={isMobile ? 24 : 18} /></div> : null; })}</div>}
            {tasks.length > 0 && <span style={{ fontSize: 10, color: tasksDone === tasks.length ? t.green : t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{tasksDone}/{tasks.length}</span>}
            {cmts.length > 0 && <span style={{ fontSize: 10, color: t.textMuted }}>{"💬"}{cmts.length}</span>}
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>+{s.points}</span>
          </div>
        </div>

        {/* Description subtitle — one line, always visible, click to edit */}
        <div style={{ paddingLeft: 32, paddingRight: 12, paddingBottom: 8 }} onClick={e => e.stopPropagation()}>
          {editingShortDesc ? (
            <input
              autoFocus
              value={currentDesc}
              onChange={e => setStageDescOverride(name, e.target.value)}
              onBlur={() => setEditingShortDesc(false)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingShortDesc(false); }}
              placeholder="Short description..."
              style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${pC}44`, outline: "none", fontSize: 11, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", padding: "0 0 0 0", lineHeight: 1.4 }}
            />
          ) : (
            <p
              onClick={e => { e.stopPropagation(); if (stageEditMode) setEditingShortDesc(true); }}
              title={stageEditMode ? "Click to edit" : ""}
              style={{ margin: 0, fontSize: 11, color: t.textSec, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.75, cursor: "text" }}
            >
              {currentDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>add description...</span>}
            </p>
          )}
        </div>

        {/* Edit mode pencil button — bottom-right, appears on hover */}
        {(isHovered || stageEditMode) && !isMobile && (
          <button
            onClick={e => {
              e.stopPropagation();
              const next = !stageEditMode;
              setStageEditMode(next);
              if (next) {
                setEditingShortDesc(true);
                setEditingDesc(true);
              } else {
                commitEditMode();
              }
            }}
            title={stageEditMode ? "Exit edit mode (Esc)" : "Edit this stage"}
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              width: 26,
              height: 26,
              borderRadius: 8,
              background: stageEditMode ? pC + "22" : t.bgCard,
              border: `1px solid ${stageEditMode ? pC + "88" : t.border}`,
              cursor: "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: stageEditMode ? pC : t.textMuted,
              transition: "all 0.15s",
            }}
          >&#9998;</button>
        )}

        {/* Archive button — only in edit mode */}
        {stageEditMode && !isMobile && archiveStage && (
          <button
            onClick={e => {
              e.stopPropagation();
              archiveStage(name);
              setStageEditMode(false);
            }}
            title="Archive this stage"
            style={{
              position: "absolute",
              bottom: 8,
              right: 40,
              height: 26,
              borderRadius: 8,
              background: "transparent",
              border: `1px solid ${t.amber}55`,
              cursor: "pointer",
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.amber,
              padding: "0 8px",
              fontFamily: "var(--font-dm-mono), monospace",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >📦 archive</button>
        )}

        {/* Expanded content */}
        <div style={{ overflow: "hidden", maxHeight: isE ? "2000px" : "0px", transition: "max-height 300ms ease" }} onClick={e => e.stopPropagation()}>
          <div style={{ borderTop: isE ? `1px solid ${t.border}` : "none" }}>

            {/* Action bar */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
              {claimAnim?.stage === name && [...Array(16)].map((_, i) => (<div key={`conf-${i}`} style={{ position: "absolute", width: 4 + i % 3, height: 4 + i % 3, borderRadius: i % 2 === 0 ? "50%" : "1px", background: [me?.color || t.accent, t.green, t.amber, t.purple, t.cyan, "#ff69b4"][i % 6], left: "60px", top: "16px", animation: `confetti${i % 4} 0.8s ease-out forwards`, opacity: 0 }} />))}
              {claimAnim?.stage === name && <div style={{ position: "absolute", left: 70, top: 0, color: t.green, fontSize: 13, fontWeight: 900, fontFamily: "var(--font-dm-mono), monospace", animation: "flyup 1s ease-out forwards", opacity: 0, zIndex: 5 }}>{"💀"} owned!</div>}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <ClaimChip claimed={claimedByMe} pipelineColor={pC} t={t} onClaim={() => handleClaimWithAnim(name)} pulse={isTopClaim} />

                {claimedBy.filter(uid => uid !== currentUser).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {claimedBy.filter(uid => uid !== currentUser).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid}><AvatarC user={u} size={18} /></div> : null; })}
                  </div>
                )}

                <button onClick={() => {
                  const sr = rxns[name] || {};
                  const owners = claimedBy.map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
                  const reacts = Object.entries(sr).filter(([, v]) => v.length > 0).map(([e, v]) => `${e} ×${v.length}`);
                  const lines: string[] = [
                    "Binayah AI  //  Stage",
                    "────────────────────────────────",
                    name,
                    `Status: ${effectiveStatus.toUpperCase()}  ·  +${s.points} pts`,
                  ];
                  if (currentDesc) { lines.push(""); lines.push(currentDesc); }
                  if (owners.length) { lines.push(""); lines.push(`Owned by: ${owners.join(", ")}`); }
                  if (reacts.length) { lines.push(`Reactions: ${reacts.join("  ")}`); }
                  shareStage(name, lines.join("\n"));
                }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: copied === name ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                  {copied === name ? "✓ copied" : "📋 copy"}
                </button>
                {archiveStage && (
                  <button onClick={() => archiveStage(name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = t.amber; (e.currentTarget as HTMLElement).style.color = t.amber; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.border; (e.currentTarget as HTMLElement).style.color = t.textMuted; }}
                    title="Archive this task">
                    📦 archive
                  </button>
                )}
              </div>
            </div>

            {/* Description — editable */}
            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                about
                {!editingDesc && <span onClick={() => setEditingDesc(true)} style={{ fontSize: 11, color: t.textDim, cursor: "pointer", opacity: 0.45 }} title="Edit">{"✎"}</span>}
                {editingDesc && <span onClick={() => setEditingDesc(false)} style={{ fontSize: 10, color: t.green, cursor: "pointer", fontWeight: 700 }}>done</span>}
              </div>
              {editingDesc ? (
                <textarea
                  value={aboutDesc}
                  onChange={e => setStageDescOverride(name, e.target.value)}
                  autoFocus
                  rows={4}
                  style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.6 }}
                />
              ) : (
                <div onClick={() => setEditingDesc(true)} title="Click to edit" style={{ fontSize: 13, color: t.textSec, lineHeight: 1.6, cursor: "text", display: "flex", alignItems: "flex-start", gap: 4 }}>
                  <span style={{ flex: 1 }}>{aboutDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>Add a description...</span>}</span>
                </div>
              )}
            </div>

            {/* Subtasks + Comments */}
            <div style={{ display: "flex", gap: 0, minHeight: 80 }}>
              <div style={{ flex: 1, padding: "12px 16px", borderRight: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>subtasks {tasks.length > 0 && `(${tasksDone}/${tasks.length})`}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map(task => (
                  <StageSubtaskCard
                    key={task.id}
                    task={task}
                    stageId={name}
                    pC={pC}
                    t={t}
                    onToggle={() => toggleSubtask(name, task.id)}
                    onRemove={() => removeSubtask(name, task.id)}
                  />
                ))}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input value={subtaskInputVal} onChange={e => setSubtaskInputVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addSubtask(name, subtaskInputVal, () => setSubtaskInputVal("")); } }} placeholder="+ add subtask..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => addSubtask(name, subtaskInputVal, () => setSubtaskInputVal(""))} style={{ background: t.accent + "15", border: `1px solid ${t.accent + "33"}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>+</button>
                </div>
              </div>

              <div style={{ flex: 1, padding: "12px 16px", borderRadius: "0 0 14px 0", transition: "box-shadow 0.3s", animation: liveNotifs[name]?.comment ? "commentPulse 1.5s ease-in-out 2" : "none" }}>
                {/* Tab toggle */}
                {(() => {
                  const stageActivity = activityLog.filter(e => {
                    if (e.target === name) return true;
                    const parsed = SubtaskKey.isValid(e.target) ? SubtaskKey.parse(e.target as Parameters<typeof SubtaskKey.parse>[0]) : null;
                    return parsed ? parsed.parentStageId === name : false;
                  });
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8, borderBottom: `1px solid ${t.border}`, paddingBottom: 6 }}>
                        <button
                          onClick={() => setActiveDetailTab("comments")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, fontWeight: activeDetailTab === "comments" ? 700 : 500, color: activeDetailTab === "comments" ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5, textTransform: "uppercase" as const, paddingRight: 10, borderRight: `1px solid ${t.border}`, marginRight: 10 }}
                        >
                          comments {cmts.length > 0 && `(${cmts.length})`}
                          {liveNotifs[name]?.comment && <span style={{ color: t.green, marginLeft: 4 }}>·</span>}
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("activity")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, fontWeight: activeDetailTab === "activity" ? 700 : 500, color: activeDetailTab === "activity" ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5, textTransform: "uppercase" as const }}
                        >
                          activity {stageActivity.length > 0 && `(${stageActivity.length})`}
                        </button>
                      </div>

                      {activeDetailTab === "comments" ? (
                        <>
                          {liveNotifs[name]?.comment && (
                            <div style={{ fontSize: 10, color: t.green, marginBottom: 4, fontWeight: 700 }}>{liveNotifs[name].comment} just commented</div>
                          )}
                          <div style={{ maxHeight: 120, overflowY: "auto" }}>
                            {cmts.map((c, idx) => {
                              const u = users.find(x => x.id === c.by);
                              // "Since you were here" divider — show above first unseen comment
                              const isFirstUnseen = seenAtMount !== undefined && c.id > seenAtMount && (idx === 0 || cmts[idx - 1].id <= seenAtMount);
                              return (
                                <div key={c.id}>
                                  {isFirstUnseen && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "6px 0" }}>
                                      <div style={{ flex: 1, height: 1, background: t.accent + "44" }} />
                                      <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" as const, flexShrink: 0 }}>// since you were here</span>
                                      <div style={{ flex: 1, height: 1, background: t.accent + "44" }} />
                                    </div>
                                  )}
                                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                                    {u && <AvatarC user={u} size={16} />}
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                                        <span style={{ fontSize: 10, color: t.textDim }}>{c.time}</span>
                                      </div>
                                      <div style={{ fontSize: 11, color: t.textSec, lineHeight: 1.4 }}>{c.text}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                            <input value={commentInputVal} onChange={e => setCommentInputVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addComment(name, commentInputVal, () => setCommentInputVal("")); } }} placeholder="comment..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.text, fontFamily: "inherit", outline: "none" }} />
                            <button onClick={() => addComment(name, commentInputVal, () => setCommentInputVal(""))} style={{ background: t.accent + "15", border: `1px solid ${t.accent + "33"}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>{"↵"}</button>
                          </div>
                        </>
                      ) : (
                        <div style={{ maxHeight: 160, overflowY: "auto" }}>
                          {stageActivity.length === 0 ? (
                            <div style={{ fontSize: 11, color: t.textDim, fontStyle: "italic", textAlign: "center" as const, padding: "8px 0" }}>// no activity yet</div>
                          ) : (
                            stageActivity.map((entry, i) => {
                              const u = users.find(u => u.id === entry.user);
                              return (
                                <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
                                  {u && <AvatarC user={u} size={16} />}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                                      <span style={{ fontSize: 10, color: t.textMuted, flexShrink: 0 }}>{actIcon(entry.type)}</span>
                                      <span style={{ fontSize: 11, color: t.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{entry.detail}</span>
                                    </div>
                                    <span style={{ fontSize: 10, color: t.textDim }}>{relTime(entry.time)}</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Gallery panel — collapsible */}
            {(() => {
              const imgs = stageImages[name] || [];
              const hasMock = !!MockupComp;
              const totalCount = (hasMock ? 1 : 0) + imgs.length;
              return (
                <div style={{ borderTop: `1px solid ${t.border}` }}>
                  {/* Header row — always visible, click to toggle */}
                  <div onClick={() => setGalleryOpen(o => !o)} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span style={{ fontSize: 10, color: t.textDim, transition: "transform 0.2s", display: "inline-block", transform: galleryOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                    <span style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>
                      gallery {totalCount > 0 && `(${totalCount})`}
                    </span>
                    <label onClick={e => { e.stopPropagation(); }} style={{ fontSize: 10, color: pC, cursor: "pointer", fontWeight: 700, background: pC + "15", border: `1px solid ${pC + "33"}`, borderRadius: 8, padding: "0 8px", display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                      {"↑ upload"}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => { if (ev.target?.result) { addStageImage(name, ev.target.result as string); setGalleryOpen(true); } };
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }} />
                    </label>
                  </div>
                  {/* Expandable content */}
                  {galleryOpen && (
                    <div style={{ padding: "0 16px 12px", animation: "fadeIn 0.15s ease" }}>
                      {(hasMock || imgs.length > 0) ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                          {hasMock && (
                            <div style={{ gridColumn: "1 / -1", borderRadius: 12, overflow: "hidden", border: `1px solid ${pC}33`, background: t.surface, padding: 12 }}>

                              <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "117%" }}>
                                <ErrorBoundary>
                                  {MockupComp && <MockupComp t={t} />}
                                </ErrorBoundary>
                              </div>
                            </div>
                          )}
                          {imgs.map((src, i) => (
                            <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${t.border}`, aspectRatio: "4/3", background: t.surface }}>
                              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              <button onClick={() => removeStageImage(name, i)} title="Remove" style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: t.textDim, fontStyle: "italic", textAlign: "center", padding: "8px 0" }}>no images yet — upload screenshots or mockups</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
        );
      })()}

      {/* Mobile BottomSheet — expanded stage detail */}
      {isMobile && (
        <BottomSheet
          open={mobileSheetOpen}
          onClose={() => setMobileSheetOpen(false)}
          title={name}
          t={t}
        >
          <div style={{ padding: "0 0 env(safe-area-inset-bottom, 0)" }}>
            {/* Action bar */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
              {claimAnim?.stage === name && [...Array(16)].map((_, i) => (<div key={`conf-${i}`} style={{ position: "absolute", width: 4 + i % 3, height: 4 + i % 3, borderRadius: i % 2 === 0 ? "50%" : "1px", background: [me?.color || t.accent, t.green, t.amber, t.purple, t.cyan, "#ff69b4"][i % 6], left: "60px", top: "16px", animation: `confetti${i % 4} 0.8s ease-out forwards`, opacity: 0 }} />))}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <ClaimChip claimed={claimedByMe} pipelineColor={pC} t={t} onClaim={() => handleClaimWithAnim(name)} />
              </div>
            </div>

            {/* Description */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>about</div>
              <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.6 }}>
                {aboutDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>No description</span>}
              </div>
            </div>

            {/* Subtasks */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>subtasks {tasks.length > 0 && `(${tasksDone}/${tasks.length})`}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
              {tasks.map(task => (
                <StageSubtaskCard
                  key={task.id}
                  task={task}
                  stageId={name}
                  pC={pC}
                  t={t}
                  onToggle={() => !task.locked && toggleSubtask(name, task.id)}
                  onRemove={() => removeSubtask(name, task.id)}
                />
              ))}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                <input value={subtaskInputVal} onChange={e => setSubtaskInputVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addSubtask(name, subtaskInputVal, () => setSubtaskInputVal("")); } }} placeholder="+ add subtask..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none", minHeight: 44 }} />
                <button onClick={() => addSubtask(name, subtaskInputVal, () => setSubtaskInputVal(""))} style={{ background: t.accent + "15", border: `1px solid ${t.accent + "33"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontSize: 15, color: t.accent, fontWeight: 700, fontFamily: "inherit", minHeight: 44, minWidth: 44 }}>+</button>
              </div>
            </div>

            {/* Comments */}
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>comments {cmts.length > 0 && `(${cmts.length})`}</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
                {cmts.map(c => { const u = users.find(x => x.id === c.by); return (
                  <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {u && <AvatarC user={u} size={22} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                        <span style={{ fontSize: 11, color: t.textDim }}>{c.time}</span>
                      </div>
                      <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.5, marginTop: 0 }}>{c.text}</div>
                    </div>
                  </div>
                ); })}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <input value={commentInputVal} onChange={e => setCommentInputVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { addComment(name, commentInputVal, () => setCommentInputVal("")); } }} placeholder="comment..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none", minHeight: 44 }} />
                <button onClick={() => addComment(name, commentInputVal, () => setCommentInputVal(""))} style={{ background: t.accent + "15", border: `1px solid ${t.accent + "33"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontSize: 15, color: t.accent, fontWeight: 700, fontFamily: "inherit", minHeight: 44, minWidth: 44 }}>{"↵"}</button>
              </div>
            </div>

            {/* Mockup (if available) — lazy-loaded component */}
            {MockupComp && (
              <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${t.border}` }}>

                <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${pC}33`, background: t.surface, padding: 12 }}>
                  <ErrorBoundary>
                    <MockupComp t={t} />
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
