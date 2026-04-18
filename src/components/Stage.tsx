"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { REACTIONS, stageDefaults, stageLongDescs, type SubtaskItem, type CommentItem, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Chev } from "@/components/ui/primitives";
import mockups from "@/components/mockups/mockupsMap";

interface StageProps {
  name: string;
  idx: number;
  tot: number;
  pC: string;
  pId: string;
  t: T;
  expS: string | null;
  setExpS: (v: string | null) => void;
  getStatus: (name: string) => string;
  sc: Record<string, { l: string; c: string }>;
  claims: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  subtasks: Record<string, SubtaskItem[]>;
  comments: Record<string, CommentItem[]>;
  users: UserType[];
  currentUser: string | null;
  me: UserType;
  reactOpen: string | null;
  setReactOpen: (v: string | null) => void;
  showMockup: Record<string, boolean>;
  setShowMockup: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  copied: string | null;
  claimAnim: { stage: string; pts: number } | null;
  handleClaim: (sid: string) => void;
  handleReact: (sid: string, emoji: string) => void;
  cycleStatus: (name: string) => void;
  shareStage: (name: string, text: string) => void;
  subtaskInput: Record<string, string>;
  setSubtaskInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addSubtask: (sid: string) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  lockSubtask: (sid: string, taskId: number) => void;
  removeSubtask: (sid: string, taskId: number) => void;
  addComment: (sid: string) => void;
  stageDescOverrides: Record<string, string>;
  setStageDescOverride: (name: string, val: string) => void;
  liveNotifs: Record<string, { comment?: string; reaction?: string }>;
  stageImages: Record<string, string[]>;
  addStageImage: (name: string, dataUrl: string) => void;
  removeStageImage: (name: string, idx: number) => void;
}

export default function Stage({
  name, idx, tot, pC, pId, t, expS, setExpS, getStatus, sc,
  claims, reactions: rxns, subtasks, comments, users, currentUser, me,
  reactOpen, setReactOpen, showMockup, setShowMockup, copied, claimAnim,
  handleClaim, handleReact, cycleStatus, shareStage,
  subtaskInput, setSubtaskInput, commentInput, setCommentInput,
  addSubtask, toggleSubtask, lockSubtask, removeSubtask, addComment,
  stageDescOverrides, setStageDescOverride, liveNotifs,
  stageImages, addStageImage, removeStageImage,
}: StageProps) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [editingShortDesc, setEditingShortDesc] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const k = `${pId}-${idx}`;
  const isE = expS === k;

  // Fallback for custom stages not in stageDefaults
  const s = stageDefaults[name] ?? { desc: "", points: 10, status: "concept" };
  const effectiveStatus = getStatus(name);
  const st = sc[effectiveStatus] ?? { l: "concept", c: "#888" };
  const claimedBy = claims[name] || [];
  const mock = mockups[name] as ((t: T) => React.ReactNode) | undefined;
  const tasks = subtasks[name] || [];
  const cmts = comments[name] || [];
  const tasksDone = tasks.filter(x => x.done).length;
  const isMockOpen = showMockup[name];
  const currentDesc = stageDescOverrides[name] ?? s.desc;
  const aboutDesc = stageDescOverrides[name] ?? (stageLongDescs[name] || s.desc);

  const openPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpS(k);
    setShowMockup(prev => ({ ...prev, [name]: true }));
  };

  return (
    <div style={{ display: "flex" }}>
      {/* Timeline dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0, paddingTop: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${st.c}`, background: effectiveStatus === "active" ? st.c : "transparent", boxShadow: effectiveStatus === "active" ? `0 0 8px ${st.c}44` : "none", zIndex: 1 }} />
        {idx < tot - 1 && <div style={{ width: 1.5, flex: 1, background: `${st.c}22`, marginTop: 2 }} />}
      </div>

      {/* Card */}
      {(() => {
        const hasLive = !!(liveNotifs[name]?.comment || liveNotifs[name]?.reaction);
        const liveColor = liveNotifs[name]?.comment ? t.green : t.accent;
        return (
      <div onClick={e => { e.stopPropagation(); setExpS(isE ? null : k); }} style={{ flex: 1, background: isE ? t.bgHover : t.bgSoft, border: `1px solid ${hasLive ? liveColor + "66" : isE ? pC + "33" : t.border}`, borderRadius: 14, marginBottom: idx < tot - 1 ? 6 : 0, cursor: "pointer", transition: "border-color 0.4s, box-shadow 0.4s, background 0.2s", overflow: "hidden", boxShadow: hasLive ? `${isE ? t.shadowLg : t.shadow}, 0 0 16px ${liveColor}22` : isE ? t.shadowLg : t.shadow }}>

        {/* Header row */}
        <div style={{ padding: "10px 14px 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <Chev open={isE} color={pC} />
            <span style={{ fontSize: 12, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            <span onClick={e => { e.stopPropagation(); cycleStatus(name); }} style={{ fontSize: 7, fontWeight: 700, color: st.c, background: st.c + "12", padding: "2px 8px", borderRadius: 6, flexShrink: 0, cursor: "pointer" }} title="Click to cycle status">{st.l}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, position: "relative" }} onClick={e => e.stopPropagation()}>
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
                  <button key={r} onClick={() => handleReact(name, r)} style={{ background: mine ? t.accent + "22" : has ? t.surface : "transparent", border: "none", borderRadius: 10, padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "inherit", opacity: has ? 1 : 0.35, transform: mine ? "scale(1.15)" : "scale(1)" }}>
                    <span style={{ fontSize: has ? 13 : 11 }}>{r}</span>
                    {has && <span style={{ fontSize: 7, color: mine ? t.accent : t.textMuted, fontWeight: 700 }}>{us.length}</span>}
                  </button>); });
              }
              return existing.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (
                <button key={emoji} onClick={() => handleReact(name, emoji)} style={{ background: mine ? t.accent + "18" : t.surface, border: "none", borderRadius: 10, padding: "2px 6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 2, fontFamily: "inherit" }}>
                  <span style={{ fontSize: 12 }}>{emoji}</span>
                  <span style={{ fontSize: 7, color: mine ? t.accent : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                </button>); });
            })()}

            {/* React toggle */}
            <button onClick={() => setReactOpen(reactOpen === name ? null : name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "2px 6px", cursor: "pointer", fontSize: 9, color: t.textMuted, fontFamily: "inherit" }}>
              {"\uD83D\uDE00"}
            </button>

            {/* Preview badge — indicates stage has a mockup */}
            {mock && !isE && (
              <span style={{ fontSize: 7, color: pC, background: pC + "15", border: `1px solid ${pC}22`, borderRadius: 6, padding: "1px 6px", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, flexShrink: 0, opacity: 0.8 }}>▸</span>
            )}

            {claimedBy.length > 0 && <div style={{ display: "flex", marginLeft: 2 }}>{claimedBy.slice(0, 3).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={18} /></div> : null; })}</div>}
            {tasks.length > 0 && <span style={{ fontSize: 8, color: tasksDone === tasks.length ? t.green : t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{tasksDone}/{tasks.length}</span>}
            {cmts.length > 0 && <span style={{ fontSize: 8, color: t.textMuted }}>{"\uD83D\uDCAC"}{cmts.length}</span>}
            <span style={{ fontSize: 8, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>+{s.points}</span>
          </div>
        </div>

        {/* Description subtitle — one line, always visible, click to edit */}
        <div style={{ paddingLeft: 36, paddingRight: 14, paddingBottom: 8 }} onClick={e => e.stopPropagation()}>
          {editingShortDesc ? (
            <input
              autoFocus
              value={currentDesc}
              onChange={e => setStageDescOverride(name, e.target.value)}
              onBlur={() => setEditingShortDesc(false)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingShortDesc(false); }}
              placeholder="Short description..."
              style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${pC}44`, outline: "none", fontSize: 9, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", padding: "0 0 2px 0", lineHeight: 1.4 }}
            />
          ) : (
            <p
              onClick={() => setEditingShortDesc(true)}
              title="Click to edit"
              style={{ margin: 0, fontSize: 9, color: t.textSec, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.75, cursor: "text" }}
            >
              {currentDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>add description...</span>}
            </p>
          )}
        </div>

        {/* Expanded content */}
        {isE && (
          <div style={{ borderTop: `1px solid ${t.border}`, animation: "fadeIn 0.2s ease" }} onClick={e => e.stopPropagation()}>

            {/* Action bar */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
              {claimAnim?.stage === name && [...Array(16)].map((_, i) => (<div key={`conf-${i}`} style={{ position: "absolute", width: 4 + i % 3, height: 4 + i % 3, borderRadius: i % 2 === 0 ? "50%" : "1px", background: [me?.color || t.accent, t.green, t.amber, t.purple, t.cyan, "#ff69b4"][i % 6], left: "60px", top: "16px", animation: `confetti${i % 4} 0.8s ease-out forwards`, opacity: 0 }} />))}
              {claimAnim?.stage === name && <div style={{ position: "absolute", left: 70, top: 0, color: t.green, fontSize: 12, fontWeight: 900, fontFamily: "var(--font-dm-mono), monospace", animation: "flyup 1s ease-out forwards", opacity: 0, zIndex: 5 }}>{"\uD83D\uDC80"} owned!</div>}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {!claimedBy.includes(currentUser!) ? (
                  <button onClick={() => handleClaim(name)} style={{ background: `linear-gradient(135deg,${me?.color || t.accent},${me?.color || t.accent}aa)`, border: "none", borderRadius: 12, padding: "8px 20px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", textTransform: "lowercase", boxShadow: `0 0 20px ${me?.color || t.accent}44, 0 2px 8px rgba(0,0,0,0.4)`, display: "flex", alignItems: "center", gap: 8, animation: "claimPulse 2s ease-in-out infinite", position: "relative", overflow: "hidden", letterSpacing: 0.3 }}>
                    <span style={{ fontSize: 16 }}>{"\uD83D\uDC80"}</span>
                    <span>claim this</span>
                    <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "2px 8px", fontSize: 8 }}>earn +{s.points} on live</span>
                    <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)", animation: "shimmer 2.5s ease-in-out infinite" }} />
                  </button>
                ) : (
                  <button onClick={() => handleClaim(name)} title="Click to unclaim" style={{ background: t.green + "15", border: `1px solid ${t.green}44`, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 11, color: t.green, fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", textTransform: "lowercase", display: "flex", alignItems: "center", gap: 6, boxShadow: `0 0 12px ${t.green}18` }}>
                    <AvatarC user={me} size={20} />
                    <span>{"\u2713"} claimed</span>
                    <span style={{ fontSize: 8, color: t.textMuted, fontWeight: 500, opacity: 0.7 }}>· unclaim?</span>
                  </button>
                )}

                {claimedBy.filter(uid => uid !== currentUser).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
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
                }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 9, color: copied === name ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                  {copied === name ? "\u2713 copied" : "\uD83D\uDCCB copy"}
                </button>
              </div>
            </div>

            {/* Description — editable */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                about
                {!editingDesc && <span onClick={() => setEditingDesc(true)} style={{ fontSize: 9, color: t.textDim, cursor: "pointer", opacity: 0.45 }} title="Edit">{"\u270E"}</span>}
                {editingDesc && <span onClick={() => setEditingDesc(false)} style={{ fontSize: 7, color: t.green, cursor: "pointer", fontWeight: 700 }}>done</span>}
              </div>
              {editingDesc ? (
                <textarea
                  value={aboutDesc}
                  onChange={e => setStageDescOverride(name, e.target.value)}
                  autoFocus
                  rows={4}
                  style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.6 }}
                />
              ) : (
                <div onClick={() => setEditingDesc(true)} title="Click to edit" style={{ fontSize: 11, color: t.textSec, lineHeight: 1.6, cursor: "text", display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ flex: 1 }}>{aboutDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>Add a description...</span>}</span>
                </div>
              )}
            </div>

            {/* Subtasks + Comments */}
            <div style={{ display: "flex", gap: 0, minHeight: 80 }}>
              <div style={{ flex: 1, padding: "14px 16px", borderRight: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>subtasks {tasks.length > 0 && `(${tasksDone}/${tasks.length})`}</div>
                {tasks.map(task => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderRadius: 6, transition: "background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <div onClick={() => !task.locked && toggleSubtask(name, task.id)} style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${task.locked ? t.textDim + "55" : task.done ? t.green : t.border}`, background: task.done ? t.green + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: task.locked ? "default" : "pointer" }}>
                      {task.done && <span style={{ fontSize: 8, color: t.green }}>{"\u2713"}</span>}
                    </div>
                    <span style={{ fontSize: 9, color: task.locked ? t.textDim : task.done ? t.textDim : t.textSec, textDecoration: task.done ? "line-through" : "none", flex: 1, fontStyle: task.locked ? "italic" : "normal" }}>{task.text}</span>
                    <span style={{ fontSize: 7, color: t.textDim, marginRight: 2 }}>{users.find(u => u.id === task.by)?.name?.charAt(0)}</span>
                    <span onClick={() => lockSubtask(name, task.id)} title={task.locked ? "Unlock" : "Lock"} style={{ fontSize: 11, cursor: "pointer", opacity: task.locked ? 1 : 0.35, transition: "opacity 0.15s", color: task.locked ? t.amber : t.textDim }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = task.locked ? "1" : "0.35"; }}>
                      {task.locked ? "🔒" : "🔓"}
                    </span>
                    {!task.locked && <span onClick={() => removeSubtask(name, task.id)} title="Remove" style={{ fontSize: 10, cursor: "pointer", opacity: 0.3, color: t.red, transition: "opacity 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.3"; }}>
                      ×
                    </span>}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input value={subtaskInput[name] || ""} onChange={e => setSubtaskInput(prev => ({ ...prev, [name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addSubtask(name); }} placeholder="+ add subtask..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 9, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => addSubtask(name)} style={{ background: t.accent + "15", border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 9, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>+</button>
                </div>
              </div>

              <div style={{ flex: 1, padding: "14px 16px", borderRadius: "0 0 14px 0", transition: "box-shadow 0.3s", animation: liveNotifs[name]?.comment ? "commentPulse 1.5s ease-in-out 2" : "none" }}>
                <div style={{ fontSize: 8, color: liveNotifs[name]?.comment ? t.green : t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600, transition: "color 0.4s", display: "flex", alignItems: "center", gap: 5 }}>
                  comments {cmts.length > 0 && `(${cmts.length})`}
                  {liveNotifs[name]?.comment && <span style={{ fontSize: 8, color: t.green, fontWeight: 700, letterSpacing: 0 }}>· {liveNotifs[name].comment} just commented</span>}
                </div>
                <div style={{ maxHeight: 120, overflowY: "auto" }}>
                  {cmts.map(c => { const u = users.find(x => x.id === c.by); return (
                    <div key={c.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      {u && <AvatarC user={u} size={16} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                          <span style={{ fontSize: 7, color: t.textDim }}>{c.time}</span>
                        </div>
                        <div style={{ fontSize: 9, color: t.textSec, lineHeight: 1.4 }}>{c.text}</div>
                      </div>
                    </div>
                  ); })}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input value={commentInput[name] || ""} onChange={e => setCommentInput(prev => ({ ...prev, [name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addComment(name); }} placeholder="comment..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 9, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => addComment(name)} style={{ background: t.accent + "15", border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 9, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>{"\u21B5"}</button>
                </div>
              </div>
            </div>

            {/* Gallery panel — collapsible */}
            {(() => {
              const imgs = stageImages[name] || [];
              const hasMock = !!mock;
              const totalCount = (hasMock ? 1 : 0) + imgs.length;
              return (
                <div style={{ borderTop: `1px solid ${t.border}` }}>
                  {/* Header row — always visible, click to toggle */}
                  <div onClick={() => setGalleryOpen(o => !o)} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.bgHover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span style={{ fontSize: 8, color: t.textDim, transition: "transform 0.2s", display: "inline-block", transform: galleryOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                    <span style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
                      gallery {totalCount > 0 && `(${totalCount})`}
                    </span>
                    <label onClick={e => e.stopPropagation()} style={{ fontSize: 8, color: pC, cursor: "pointer", fontWeight: 700, background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                      ↑ upload
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
                            <div style={{ gridColumn: "1 / -1", borderRadius: 10, overflow: "hidden", border: `1px solid ${pC}33`, background: t.surface, padding: 12 }}>
                              <div style={{ fontSize: 7, color: pC, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, opacity: 0.8 }}>▸ live preview</div>
                              <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "117%" }}>{mock(t)}</div>
                            </div>
                          )}
                          {imgs.map((src, i) => (
                            <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${t.border}`, aspectRatio: "4/3", background: t.surface }}>
                              <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                              <button onClick={() => removeStageImage(name, i)} title="Remove" style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 9, color: t.textDim, fontStyle: "italic", textAlign: "center", padding: "8px 0" }}>no images yet — upload screenshots or mockups</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
        );
      })()}
    </div>
  );
}
