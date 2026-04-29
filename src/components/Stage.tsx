"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { T } from "@/lib/themes";
import { SubtaskKey } from "@/lib/subtaskKey";
import { REACTIONS, stageDefaults, stageLongDescs, type SubtaskItem, USERS_DEFAULT, ADMIN_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Chev } from "@/components/ui/primitives";
import ClaimChip from "@/components/ui/ClaimChip";
import mockupsMap from "@/components/mockups/mockupsMap";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import { useModel, useRole, commentTypingState } from "@/lib/contexts/ModelContext";
import { deriveStageDisplayPoints, DEFAULT_SUBTASK_POINTS } from "@/lib/points";
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
// Structurally parallel to TasksView's TaskCard: same claim-chip / assign-with-avatars /
// pencil-edit-mode pattern, just compact and nested under the parent stage.
function StageSubtaskCard({
  task, stageId, pC, t, onRemove,
}: {
  task: SubtaskItem; stageId: string; pC: string; t: T;
  onRemove: () => void;
}) {
  const {
    users, currentUser, reactions, comments, claims, assignments,
    handleClaim, handleReact, addComment, assignTask, renameSubtask, setSubtaskPoints,
    approvedSubtasks, approveSubtask, workspaces,
    getSubtaskStatus, cycleSubtaskStatus, sc,
  } = useModel();
  const { copied, setCopied } = useEphemeral();
  const key = SubtaskKey.make(stageId, task.id);
  const [reactOpen, setReactOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editVal, setEditVal] = useState(task.text);
  const [commentInputVal, setCommentInputVal] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const isAnyOpen = reactOpen || commentOpen || assignOpen || editOpen;
  useEffect(() => {
    if (!isAnyOpen) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setReactOpen(false); setCommentOpen(false); setAssignOpen(false);
        if (editOpen) {
          // commit on outside click
          if (editVal.trim() && editVal.trim() !== task.text) {
            renameSubtask(stageId, task.id, editVal.trim());
          }
          setEditOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isAnyOpen, editOpen, editVal, task.text, task.id, stageId, renameSubtask]);

  const shareSubtask = (k: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(k); setTimeout(() => setCopied(null), 2000);
  };

  const rxs = reactions[key] || {};
  const cmts = comments[key] || [];
  const claimers = claims[key] || [];
  const isClaimed = currentUser ? claimers.includes(currentUser) : false;
  const creator = users.find(u => u.id === task.by);
  const visibleReactions = Object.entries(rxs).filter(([, us]) => us.length > 0);
  const assigneeIds = assignments[key] || [];
  const assigneeList = assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean) as Array<NonNullable<ReturnType<typeof users.find>>>;
  const points = task.points ?? DEFAULT_SUBTASK_POINTS;
  // Approval + status — mirrors the stage TaskCard flow
  const isApproved = approvedSubtasks.includes(key);
  const isPending = task.done && !isApproved;
  const canApprove = currentUser ? (ADMIN_IDS.includes(currentUser) || workspaces.some(w => w.captains.includes(currentUser))) : false;
  const subStatus = getSubtaskStatus(key);
  const stPill = sc[subStatus] ?? { l: subStatus, c: t.textMuted };

  const iconBtn: React.CSSProperties = {
    background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8,
    padding: "3px 8px", cursor: "pointer", fontSize: 10, color: t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4,
  };

  return (
    <div ref={ref} style={{ position: "relative", background: isApproved ? t.green + "08" : isPending ? t.amber + "08" : t.bgCard, border: `1px solid ${isApproved ? t.green + "33" : isPending ? t.amber + "55" : isClaimed ? pC + "55" : t.border}`, boxShadow: `inset 3px 0 0 ${pC}`, borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editOpen ? (
            <input
              autoFocus
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (editVal.trim() && editVal.trim() !== task.text) renameSubtask(stageId, task.id, editVal.trim());
                  setEditOpen(false);
                } else if (e.key === "Escape") {
                  setEditVal(task.text); setEditOpen(false);
                }
              }}
              style={{ width: "100%", fontSize: 13, fontWeight: 700, color: t.text, border: `2px dashed ${t.accent}55`, borderRadius: 6, padding: "2px 6px", outline: "none", background: t.accent + "08", fontFamily: "inherit" }}
            />
          ) : (
            <div style={{ fontSize: 13, fontWeight: 700, color: isApproved ? t.textDim : t.text, textDecoration: isApproved ? "line-through" : "none", lineHeight: 1.3 }}>{task.text}</div>
          )}
          <div style={{ fontSize: 10, color: t.textDim, marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {creator && <><AvatarC user={creator} size={12} /><span>{creator.name.split(" ")[0]}</span></>}
            <span style={{ color: t.accent, fontWeight: 700 }}>· {points}pts</span>
            {assigneeList[0] && <span style={{ color: assigneeList[0].color, fontWeight: 700 }}>→ {assigneeList[0].name}{assigneeList.length > 1 ? ` +${assigneeList.length - 1}` : ""}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {claimers.slice(0, 2).map(id => { const u = users.find(u => u.id === id); return u ? <AvatarC key={id} user={u} size={18} /> : null; })}
          {/* Status pill — always visible so user can cycle back from "live" too. Mirrors stage TaskCard pill. */}
          <span
            onClick={e => { e.stopPropagation(); cycleSubtaskStatus(key); }}
            style={{ fontSize: 10, fontWeight: 700, color: stPill.c, background: stPill.c + "15", padding: "2px 8px", borderRadius: 8, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}
            title={`Status: ${stPill.l} · click to cycle (concept → planned → in-progress → live → blocked)`}
          >{stPill.l}</span>
          {isPending && canApprove && (
            <button
              onClick={e => { e.stopPropagation(); approveSubtask(key); }}
              style={{ background: t.green + "22", border: `1px solid ${t.green}55`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}
              title="Captain approval — awards points to claimers"
            >✓ approve</button>
          )}
          {isPending && !canApprove && (
            <span style={{ background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "3px 8px", fontSize: 10, color: t.amber, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>⏳ pending</span>
          )}
          {isApproved && (
            <span style={{ background: t.green + "22", border: `1px solid ${t.green}55`, borderRadius: 8, padding: "3px 8px", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>✓ approved</span>
          )}
          {/* ClaimChip — same gating as TaskCard: hidden only when (pending && admin shows approve) or already approved */}
          {currentUser && !(isPending && canApprove) && !isApproved && (
            <ClaimChip claimed={isClaimed} pipelineColor={pC} t={t} onClaim={() => handleClaim(key)} variant="subtask" small />
          )}
        </div>
      </div>

      {/* Edit-mode: points editor + archive */}
      {editOpen && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>pts:</span>
          <input
            type="number"
            defaultValue={String(points)}
            min={1}
            onClick={e => e.stopPropagation()}
            onBlur={e => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n > 0 && n !== points) setSubtaskPoints(stageId, task.id, n);
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                const n = parseInt((e.target as HTMLInputElement).value, 10);
                if (!isNaN(n) && n > 0 && n !== points) setSubtaskPoints(stageId, task.id, n);
              }
            }}
            style={{ width: 50, background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 6, padding: "2px 6px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
          />
          <button
            onClick={e => { e.stopPropagation(); onRemove(); setEditOpen(false); }}
            style={{ background: "transparent", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", fontSize: 10, color: t.amber, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace" }}
          >
            📦 archive subtask
          </button>
        </div>
      )}

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
      <div style={{ display: "flex", gap: 4, borderTop: `1px solid ${t.border}`, paddingTop: 6, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <button onClick={() => { setReactOpen(v => !v); setCommentOpen(false); setAssignOpen(false); }} style={iconBtn}>😀 +</button>
          {reactOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100 }}>
              {REACTIONS.map(emoji => <button key={emoji} onClick={() => { handleReact(key, emoji); setReactOpen(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 15, padding: "4px 4px", borderRadius: 8 }}>{emoji}</button>)}
            </div>
          )}
        </div>
        <button onClick={() => { setCommentOpen(v => !v); setReactOpen(false); setAssignOpen(false); }} style={iconBtn}>💬 {cmts.length}</button>
        {/* Assign chip — same pattern as TaskCard: avatars stacked, name + " +1" if 2 */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setAssignOpen(v => !v); setReactOpen(false); setCommentOpen(false); }}
            style={{
              ...iconBtn,
              color: assigneeList[0]?.color || t.textMuted,
              borderColor: assigneeList[0] ? assigneeList[0].color + "55" : t.border,
              paddingLeft: assigneeList.length > 0 ? 4 : 8,
              gap: 5,
            }}
            title={assigneeList.length > 0 ? `Assigned: ${assigneeList.map(u => u.name).join(", ")}` : "Assign"}
          >
            {assigneeList.length === 0 ? (
              <><span style={{ fontSize: 11, opacity: 0.7 }}>👤</span><span style={{ fontSize: 10 }}>assign</span></>
            ) : (
              <>
                <span style={{ display: "inline-flex" }}>
                  {assigneeList.slice(0, 2).map((u, i) => (
                    <span key={u.id} style={{ marginLeft: i === 0 ? 0 : -7, display: "inline-block", borderRadius: "50%", boxShadow: `0 0 0 1.5px ${t.bgCard}` }}>
                      <AvatarC user={u} size={14} />
                    </span>
                  ))}
                </span>
                <span style={{ fontSize: 10 }}>{assigneeList.length === 1 ? assigneeList[0].name.toLowerCase() : `${assigneeList[0].name.toLowerCase()} +${assigneeList.length - 1}`}</span>
              </>
            )}
          </button>
          {assignOpen && (
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, display: "flex", flexDirection: "column", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 100, minWidth: 200 }}>
              <div style={{ fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", padding: "4px 8px 2px", textTransform: "uppercase", letterSpacing: 0.5 }}>
                assign — up to 2 ({assigneeList.length}/2)
              </div>
              {users.map(u => {
                const isCurrent = assigneeList.some(a => a.id === u.id);
                const atCap = assigneeList.length >= 2 && !isCurrent;
                return (
                  <button
                    key={u.id}
                    onClick={() => assignTask(key, u.id)}
                    disabled={atCap}
                    style={{ background: isCurrent ? u.color + "22" : "transparent", border: "none", cursor: atCap ? "not-allowed" : "pointer", padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: isCurrent ? u.color : t.text, fontWeight: isCurrent ? 700 : 500, fontFamily: "var(--font-dm-mono), monospace", textAlign: "left", opacity: atCap ? 0.4 : 1 }}
                  >
                    <AvatarC user={u} size={20} />
                    <span style={{ flex: 1 }}>{u.name}</span>
                    {isCurrent && <span style={{ fontSize: 10 }}>✓</span>}
                  </button>
                );
              })}
              {assigneeList.length > 0 && (
                <button onClick={() => assignTask(key, null)} style={{ background: "transparent", border: `1px dashed ${t.border}`, cursor: "pointer", padding: "4px 8px", borderRadius: 8, fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>× clear all</button>
              )}
            </div>
          )}
        </div>
        <button onClick={() => shareSubtask(key, `${task.text} (subtask)`)} style={iconBtn}>{copied === key ? "✓ copied" : "📋 copy"}</button>

        {/* Pencil — bottom-right edit toggle, same pattern as TaskCard */}
        <button
          onClick={e => { e.stopPropagation(); if (!editOpen) setEditVal(task.text); setEditOpen(v => !v); setReactOpen(false); setCommentOpen(false); setAssignOpen(false); }}
          title={editOpen ? "Exit edit mode" : "Edit"}
          style={{
            marginLeft: "auto",
            background: editOpen ? t.accent + "22" : "transparent",
            border: `1px solid ${editOpen ? t.accent + "88" : t.border}`,
            borderRadius: 8, width: 24, height: 24, cursor: "pointer", fontSize: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: editOpen ? t.accent : t.textMuted,
            transition: "all 0.15s",
          }}
        >
          &#9998;
        </button>
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
    addSubtask, toggleSubtask, lockSubtask, archiveSubtask, addComment,
    setStageDescOverride, setStageNameOverride,
    addStageImage, removeStageImage, archiveStage,
    getStatus, sc,
    commentReactions, handleCommentReact,
    pendingNewComments, flushPendingComments,
    stagePointsOverride, setStagePointsOverride,
    archivedSubtasks,
  } = useModel();
  const { workspaces } = useModel();
  const stageWorkspaceId = workspaces.find(w => w.pipelineIds.includes(pId))?.id;
  const role = useRole(stageWorkspaceId);
  const canArchive = role === "operator" || role === "root";
  const { reactOpen, setReactOpen, copied, setCopied, claimAnim, setClaimAnim } = useEphemeral();

  const handleClaimWithAnim = (sid: string) => {
    const alreadyClaimed = currentUser ? (claims[sid] || []).includes(currentUser) : false;
    handleClaim(sid);
    if (!alreadyClaimed && currentUser) {
      setClaimAnim({ stage: sid, pts: derivedPoints || 10 });
      setTimeout(() => setClaimAnim(null), 1200);
    }
  };

  // Local UI state (stage-specific, not shared)
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingShortDesc, setEditingShortDesc] = useState(false);
  const [stageEditMode, setStageEditMode] = useState(false);
  const [editingName, setEditingName] = useState(name);
  const [isHovered, setIsHovered] = useState(false);
  // Leaf-stage points override input — only meaningful when stage has no subtasks
  const [editingPoints, setEditingPoints] = useState<string>("");
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
  // Comment list scroll ref (for flush-to-bottom)
  const commentListRef = useRef<HTMLDivElement>(null);
  // Emoji picker open state for comment reactions (commentId → boolean)
  const [commentReactPickerOpen, setCommentReactPickerOpen] = useState<number | null>(null);

  // @mention autocomplete state
  const [mentionDropdown, setMentionDropdown] = useState<{
    query: string; matches: typeof USERS_DEFAULT; selectedIdx: number;
  } | null>(null);

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

  // ── @mention autocomplete helpers ─────────────────────────────────────────
  const detectMention = useCallback((val: string): { query: string; start: number } | null => {
    // Detect `@` preceded by space or start-of-string, followed by word chars
    const match = val.match(/(^|\s)@(\w*)$/);
    if (!match) return null;
    const query = match[2] || "";
    return { query, start: val.lastIndexOf("@") };
  }, []);

  const handleCommentInputChange = useCallback((val: string) => {
    setCommentInputVal(val);
    // Update typing state for anti-jump buffering
    commentTypingState.openStageId = name;
    commentTypingState.hasInput[name] = val.trim().length > 0;
    // Auto-flush pending if input becomes empty
    if (val.trim().length === 0 && (pendingNewComments[name] || []).length > 0) {
      flushPendingComments(name);
    }
    // Mention detection
    const mention = detectMention(val);
    if (mention) {
      const q = mention.query.toLowerCase();
      const matches = USERS_DEFAULT.filter(u =>
        u.name.split(" ")[0].toLowerCase().startsWith(q)
      ).slice(0, 6);
      setMentionDropdown({ query: q, matches, selectedIdx: 0 });
    } else {
      setMentionDropdown(null);
    }
  }, [name, pendingNewComments, flushPendingComments, detectMention]);

  const insertMention = useCallback((user: typeof USERS_DEFAULT[number]) => {
    const firstName = user.name.split(" ")[0];
    const mention = detectMention(commentInputVal);
    if (mention) {
      const before = commentInputVal.slice(0, mention.start);
      const newVal = `${before}@${firstName} `;
      setCommentInputVal(newVal);
      commentTypingState.hasInput[name] = newVal.trim().length > 0;
    }
    setMentionDropdown(null);
  }, [commentInputVal, detectMention, name]);

  // On collapse: clear typing state
  useEffect(() => {
    if (!isE) {
      // Flush pending on close
      if ((pendingNewComments[name] || []).length > 0) flushPendingComments(name);
      commentTypingState.openStageId = null;
      commentTypingState.hasInput[name] = false;
      setMentionDropdown(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isE, name]);

  const pendingCount = (pendingNewComments[name] || []).length;

  // Precomputed list of visible comment reactions for memoization
  const getCommentReactions = useMemo(() => (commentId: number) => {
    const key = `${name}::${commentId}`;
    return commentReactions[key] || {};
  }, [name, commentReactions]);

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
  const allTasks = subtasks[name] || [];
  const tasks = allTasks.filter(x => !(archivedSubtasks || []).includes(SubtaskKey.make(name, x.id)));
  const cmts = comments[name] || [];
  const tasksDone = tasks.filter(x => x.done).length;

  // Derived points: sum of live subtasks (ledger) when present; else override/default (leaf)
  const archivedSubtaskKeySet = useMemo(() => new Set(archivedSubtasks), [archivedSubtasks]);
  const derivedPoints = useMemo(
    () => deriveStageDisplayPoints(name, tasks, archivedSubtaskKeySet, s.points, stagePointsOverride),
    [name, tasks, archivedSubtaskKeySet, s.points, stagePointsOverride]
  );
  const hasLiveSubtasks = tasks.length > 0;
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
                  // Save name on blur but keep edit mode open — user may be clicking
                  // another field within the card (textarea, priority cycler, etc.)
                  const trimmed = editingName.trim();
                  if (trimmed && trimmed !== name) setStageNameOverride(name, trimmed);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    const trimmed = editingName.trim();
                    if (trimmed && trimmed !== name) setStageNameOverride(name, trimmed);
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
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>+{derivedPoints}</span>
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
              style={{ margin: 0, fontSize: 11, color: t.textSec, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.75, cursor: stageEditMode ? "text" : "default" }}
            >
              {currentDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>add description...</span>}
            </p>
          )}
        </div>

        {/* Edit mode: points — editable when stage is leaf, computed when decomposed */}
        {stageEditMode && !isMobile && (
          <div style={{ paddingLeft: 32, paddingRight: 48, paddingBottom: 4, paddingTop: 4, display: "flex", flexDirection: "column", gap: 4 }} onClick={e => e.stopPropagation()}>
            {hasLiveSubtasks ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>pts:</span>
                <span style={{ fontSize: 11, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>{derivedPoints}</span>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontStyle: "italic" }}>· sum of subtasks — edit each subtask to adjust</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }}>pts:</span>
                <input
                  type="number"
                  value={editingPoints}
                  onChange={e => setEditingPoints(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(editingPoints, 10);
                    if (!isNaN(n) && n > 0) setStagePointsOverride(name, n);
                    else if (editingPoints === "") setStagePointsOverride(name, null);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const n = parseInt(editingPoints, 10);
                      if (!isNaN(n) && n > 0) setStagePointsOverride(name, n);
                      else if (editingPoints === "") setStagePointsOverride(name, null);
                    }
                  }}
                  placeholder={String(derivedPoints)}
                  style={{ width: 54, background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 6, padding: "2px 6px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }}
                />
                <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontStyle: "italic" }}>· add subtasks to score by ledger</span>
              </div>
            )}
          </div>
        )}

        {/* Edit mode: archive row — only visible in edit mode, bottom of header */}
        {stageEditMode && !isMobile && archiveStage && canArchive && (
          <div style={{ paddingLeft: 32, paddingRight: 12, paddingBottom: 8, display: "flex", alignItems: "center", borderTop: `1px solid ${t.border}`, marginTop: 2, paddingTop: 6 }} onClick={e => e.stopPropagation()}>
            <button
              onClick={e => {
                e.stopPropagation();
                archiveStage(name);
                setStageEditMode(false);
              }}
              title="Archive this stage"
              style={{
                background: "transparent",
                border: `1px solid ${t.amber}55`,
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: t.amber,
                padding: "2px 8px",
                fontFamily: "var(--font-dm-mono), monospace",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.amber + "15"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >📦 archive</button>
          </div>
        )}

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
                // Pre-fill points input with current override if set
                setEditingPoints(stagePointsOverride[name] !== undefined ? String(stagePointsOverride[name]) : "");
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
                    `Status: ${effectiveStatus.toUpperCase()}  ·  +${derivedPoints} pts`,
                  ];
                  if (currentDesc) { lines.push(""); lines.push(currentDesc); }
                  if (owners.length) { lines.push(""); lines.push(`Owned by: ${owners.join(", ")}`); }
                  if (reacts.length) { lines.push(`Reactions: ${reacts.join("  ")}`); }
                  shareStage(name, lines.join("\n"));
                }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: copied === name ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                  {copied === name ? "✓ copied" : "📋 copy"}
                </button>
                {archiveStage && canArchive && (
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
                {stageEditMode && !editingDesc && <span onClick={() => setEditingDesc(true)} style={{ fontSize: 11, color: t.textDim, cursor: "pointer", opacity: 0.45 }} title="Edit">{"✎"}</span>}
                {stageEditMode && editingDesc && <span onClick={() => setEditingDesc(false)} style={{ fontSize: 10, color: t.green, cursor: "pointer", fontWeight: 700 }}>done</span>}
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
                <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 4 }}>
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
                    onRemove={() => archiveSubtask(SubtaskKey.make(name, task.id))}
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
                          <div ref={commentListRef} style={{ maxHeight: 140, overflowY: "auto" }}>
                            {cmts.map((c, idx) => {
                              const u = users.find(x => x.id === c.by);
                              // "Since you were here" divider
                              const isFirstUnseen = seenAtMount !== undefined && c.id > seenAtMount && (idx === 0 || cmts[idx - 1].id <= seenAtMount);
                              const cRxs = getCommentReactions(c.id);
                              const cRxEntries = Object.entries(cRxs).filter(([, arr]) => arr.length > 0);
                              return (
                                <div key={c.id} style={{ marginBottom: 6 }}>
                                  {isFirstUnseen && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "6px 0" }}>
                                      <div style={{ flex: 1, height: 1, background: t.accent + "44" }} />
                                      <span style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" as const, flexShrink: 0 }}>// since you were here</span>
                                      <div style={{ flex: 1, height: 1, background: t.accent + "44" }} />
                                    </div>
                                  )}
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {u && <AvatarC user={u} size={16} />}
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                                        <span style={{ fontSize: 10, color: t.textDim }}>{c.time}</span>
                                      </div>
                                      <div style={{ fontSize: 11, color: t.textSec, lineHeight: 1.4 }}>{c.text}</div>
                                    </div>
                                  </div>
                                  {/* Comment-level reactions */}
                                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", paddingLeft: 20, marginTop: 3, alignItems: "center", position: "relative" }}>
                                    {cRxEntries.map(([emoji, arr]) => {
                                      const mine = currentUser ? arr.includes(currentUser) : false;
                                      return (
                                        <button
                                          key={emoji}
                                          onClick={() => handleCommentReact(name, c.id, emoji)}
                                          style={{ background: mine ? t.accent + "20" : t.bgHover || t.bgSoft, border: `1px solid ${mine ? t.accent + "55" : t.border}`, borderRadius: 8, padding: "1px 5px", cursor: "pointer", fontSize: 10, color: mine ? t.accent : t.textMuted, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 2, lineHeight: 1 }}
                                        >
                                          {emoji} <span style={{ fontSize: 9, fontWeight: 700 }}>{arr.length}</span>
                                        </button>
                                      );
                                    })}
                                    {/* + button for emoji picker */}
                                    <div style={{ position: "relative" }}>
                                      <button
                                        onClick={() => setCommentReactPickerOpen(commentReactPickerOpen === c.id ? null : c.id)}
                                        style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "1px 5px", cursor: "pointer", fontSize: 9, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1 }}
                                      >+</button>
                                      {commentReactPickerOpen === c.id && (
                                        <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: 4, display: "flex", gap: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 200 }}>
                                          {REACTIONS.map(emoji => (
                                            <button
                                              key={emoji}
                                              onClick={() => { handleCommentReact(name, c.id, emoji); setCommentReactPickerOpen(null); }}
                                              style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 14, padding: "3px 4px", borderRadius: 6 }}
                                            >{emoji}</button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Anti-jump pending pill */}
                          {pendingCount > 0 && (
                            <button
                              onClick={() => { flushPendingComments(name); setTimeout(() => { if (commentListRef.current) commentListRef.current.scrollTop = commentListRef.current.scrollHeight; }, 30); }}
                              style={{ display: "block", width: "100%", background: t.accent, border: "none", borderRadius: 8, padding: "4px 0", cursor: "pointer", fontSize: 10, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" as const, marginTop: 4, marginBottom: 2, transition: "opacity 0.15s" }}
                            >↓ {pendingCount} new — show</button>
                          )}

                          {/* Comment input with @mention autocomplete */}
                          <div style={{ position: "relative", marginTop: 8 }}>
                            {/* @mention dropdown */}
                            {mentionDropdown && mentionDropdown.matches.length > 0 && (
                              <div style={{ position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 200 }}>
                                {mentionDropdown.matches.map((u, i) => (
                                  <div
                                    key={u.id}
                                    onMouseDown={e => { e.preventDefault(); insertMention(u); }}
                                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", cursor: "pointer", background: i === mentionDropdown.selectedIdx ? t.accent + "22" : "transparent", fontSize: 12, color: t.text }}
                                  >
                                    <AvatarC user={u} size={16} />
                                    <span style={{ fontWeight: 600 }}>{u.name.split(" ")[0]}</span>
                                    <span style={{ fontSize: 10, color: t.textDim }}>{u.role}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 4 }}>
                              <input
                                value={commentInputVal}
                                onChange={e => handleCommentInputChange(e.target.value)}
                                onKeyDown={e => {
                                  if (mentionDropdown && mentionDropdown.matches.length > 0) {
                                    if (e.key === "ArrowDown") {
                                      e.preventDefault();
                                      setMentionDropdown(d => d ? { ...d, selectedIdx: Math.min(d.selectedIdx + 1, d.matches.length - 1) } : d);
                                      return;
                                    }
                                    if (e.key === "ArrowUp") {
                                      e.preventDefault();
                                      setMentionDropdown(d => d ? { ...d, selectedIdx: Math.max(d.selectedIdx - 1, 0) } : d);
                                      return;
                                    }
                                    if (e.key === "Tab" || (e.key === "Enter" && mentionDropdown.matches.length > 0)) {
                                      e.preventDefault();
                                      const selected = mentionDropdown.matches[mentionDropdown.selectedIdx];
                                      if (selected) insertMention(selected);
                                      return;
                                    }
                                    if (e.key === "Escape") {
                                      e.preventDefault();
                                      setMentionDropdown(null);
                                      return;
                                    }
                                  }
                                  if (e.key === "Enter" && !mentionDropdown) {
                                    addComment(name, commentInputVal, () => {
                                      setCommentInputVal("");
                                      commentTypingState.hasInput[name] = false;
                                    });
                                  }
                                }}
                                placeholder="comment... (@name to mention)"
                                style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.text, fontFamily: "inherit", outline: "none" }}
                              />
                              <button
                                onClick={() => {
                                  addComment(name, commentInputVal, () => {
                                    setCommentInputVal("");
                                    commentTypingState.hasInput[name] = false;
                                  });
                                  setMentionDropdown(null);
                                }}
                                style={{ background: t.accent + "15", border: `1px solid ${t.accent + "33"}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 11, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}
                              >{"↵"}</button>
                            </div>
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
                  onRemove={() => archiveSubtask(SubtaskKey.make(name, task.id))}
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
