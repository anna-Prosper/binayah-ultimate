"use client";

import { useState } from "react";
import { T } from "@/lib/themes";
import { REACTIONS, stageDefaults, type SubtaskItem, type CommentItem, type UserType } from "@/lib/data";
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
  shareStage: (name: string) => void;
  subtaskInput: Record<string, string>;
  setSubtaskInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commentInput: Record<string, string>;
  setCommentInput: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addSubtask: (sid: string) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  addComment: (sid: string) => void;
  stageDescOverrides: Record<string, string>;
  setStageDescOverride: (name: string, val: string) => void;
}

export default function Stage({
  name, idx, tot, pC, pId, t, expS, setExpS, getStatus, sc,
  claims, reactions: rxns, subtasks, comments, users, currentUser, me,
  reactOpen, setReactOpen, showMockup, setShowMockup, copied, claimAnim,
  handleClaim, handleReact, cycleStatus, shareStage,
  subtaskInput, setSubtaskInput, commentInput, setCommentInput,
  addSubtask, toggleSubtask, addComment,
  stageDescOverrides, setStageDescOverride,
}: StageProps) {
  const [editingDesc, setEditingDesc] = useState(false);
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
      <div onClick={e => { e.stopPropagation(); setExpS(isE ? null : k); }} style={{ flex: 1, background: isE ? t.bgHover : t.bgSoft, border: `1px solid ${isE ? pC + "33" : t.border}`, borderRadius: 14, marginBottom: idx < tot - 1 ? 6 : 0, cursor: "pointer", transition: "all 0.2s", overflow: "hidden" }}>

        {/* Header row */}
        <div style={{ padding: "10px 14px 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <Chev open={isE} color={pC} />
            <span style={{ fontSize: 12, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            <span onClick={e => { e.stopPropagation(); cycleStatus(name); }} style={{ fontSize: 7, fontWeight: 700, color: st.c, background: st.c + "12", padding: "2px 8px", borderRadius: 6, flexShrink: 0, cursor: "pointer" }} title="Click to cycle status">{st.l}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
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
            <button onClick={() => setReactOpen(reactOpen === name ? null : name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "2px 6px", cursor: "pointer", fontSize: 9, color: t.textDim, fontFamily: "inherit", opacity: 0.6 }}>
              {"\uD83D\uDE00"}
            </button>

            {/* Quick preview — for stages with mockups, collapsed only */}
            {mock && !isE && (
              <button onClick={openPreview} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "2px 7px", cursor: "pointer", fontSize: 8, color: pC, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }} title="Quick preview">
                {"\uD83D\uDC41"} preview
              </button>
            )}

            {claimedBy.length > 0 && <div style={{ display: "flex", marginLeft: 2 }}>{claimedBy.slice(0, 3).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={18} /></div> : null; })}</div>}
            {tasks.length > 0 && <span style={{ fontSize: 8, color: tasksDone === tasks.length ? t.green : t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{tasksDone}/{tasks.length}</span>}
            {cmts.length > 0 && <span style={{ fontSize: 8, color: t.textMuted }}>{"\uD83D\uDCAC"}{cmts.length}</span>}
            <span style={{ fontSize: 8, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>+{s.points}</span>
          </div>
        </div>

        {/* Description subtitle — one line, always visible */}
        {currentDesc ? (
          <div style={{ paddingLeft: 36, paddingRight: 14, paddingBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 9, color: t.textSec, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.75 }}>{currentDesc}</p>
          </div>
        ) : (
          <div style={{ paddingLeft: 36, paddingBottom: 6 }} />
        )}

        {/* Expanded content */}
        {isE && (
          <div style={{ borderTop: `1px solid ${t.border}`, animation: "fadeIn 0.2s ease" }} onClick={e => e.stopPropagation()}>

            {/* Description — editable, shown without needing to open preview */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                about
                {!editingDesc && <span onClick={() => setEditingDesc(true)} style={{ fontSize: 9, color: t.textDim, cursor: "pointer", opacity: 0.45 }} title="Edit">{"\u270E"}</span>}
                {editingDesc && <span onClick={() => setEditingDesc(false)} style={{ fontSize: 7, color: t.green, cursor: "pointer", fontWeight: 700 }}>done</span>}
              </div>
              {editingDesc ? (
                <textarea
                  value={currentDesc}
                  onChange={e => setStageDescOverride(name, e.target.value)}
                  autoFocus
                  rows={2}
                  style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.5 }}
                />
              ) : (
                <div onClick={() => setEditingDesc(true)} title="Click to edit" style={{ fontSize: 11, color: t.textSec, lineHeight: 1.5, cursor: "text", display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <span style={{ flex: 1 }}>{currentDesc || <span style={{ color: t.textDim, fontStyle: "italic" }}>Add a description...</span>}</span>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
              {claimAnim?.stage === name && [...Array(16)].map((_, i) => (<div key={`conf-${i}`} style={{ position: "absolute", width: 4 + i % 3, height: 4 + i % 3, borderRadius: i % 2 === 0 ? "50%" : "1px", background: [me?.color || t.accent, t.green, t.amber, t.purple, t.cyan, "#ff69b4"][i % 6], left: "60px", top: "16px", animation: `confetti${i % 4} 0.8s ease-out forwards`, opacity: 0 }} />))}
              {claimAnim?.stage === name && <div style={{ position: "absolute", left: 70, top: 0, color: t.green, fontSize: 14, fontWeight: 900, fontFamily: "var(--font-dm-mono), monospace", animation: "flyup 1s ease-out forwards", opacity: 0, zIndex: 5 }}>+{claimAnim.pts}pts</div>}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {!claimedBy.includes(currentUser!) ? (
                  <button onClick={() => handleClaim(name)} style={{ background: `linear-gradient(135deg,${me?.color || t.accent},${me?.color || t.accent}aa)`, border: "none", borderRadius: 12, padding: "8px 20px", cursor: "pointer", fontSize: 11, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", textTransform: "lowercase", boxShadow: `0 0 20px ${me?.color || t.accent}44, 0 2px 8px rgba(0,0,0,0.4)`, display: "flex", alignItems: "center", gap: 8, animation: "claimPulse 2s ease-in-out infinite", position: "relative", overflow: "hidden", letterSpacing: 0.3 }}>
                    <span style={{ fontSize: 16 }}>{"\uD83D\uDC80"}</span>
                    <span>claim this</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "2px 8px", fontSize: 9 }}>+{s.points}pts</span>
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

                <button onClick={() => shareStage(name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 9, color: copied === name ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                  {copied === name ? "\u2713 copied" : "\uD83D\uDCCB share"}
                </button>
                {mock && <button onClick={() => setShowMockup(prev => ({ ...prev, [name]: !prev[name] }))} style={{ background: isMockOpen ? pC + "18" : "transparent", border: `1px solid ${isMockOpen ? pC + "44" : pC + "22"}`, borderRadius: 10, padding: "6px 14px", cursor: "pointer", fontSize: 9, color: isMockOpen ? pC : pC + "aa", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                  {isMockOpen ? "\u25BE hide preview" : "\u25B8 show preview"}
                </button>}
              </div>
            </div>

            {/* Subtasks + Comments */}
            <div style={{ display: "flex", gap: 0, minHeight: 80 }}>
              <div style={{ flex: 1, padding: "14px 16px", borderRight: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>subtasks {tasks.length > 0 && `(${tasksDone}/${tasks.length})`}</div>
                {tasks.map(task => (
                  <div key={task.id} onClick={() => toggleSubtask(name, task.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${task.done ? t.green : t.border}`, background: task.done ? t.green + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {task.done && <span style={{ fontSize: 8, color: t.green }}>{"\u2713"}</span>}
                    </div>
                    <span style={{ fontSize: 9, color: task.done ? t.textDim : t.textSec, textDecoration: task.done ? "line-through" : "none", flex: 1 }}>{task.text}</span>
                    <span style={{ fontSize: 7, color: t.textDim }}>{users.find(u => u.id === task.by)?.name?.charAt(0)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                  <input value={subtaskInput[name] || ""} onChange={e => setSubtaskInput(prev => ({ ...prev, [name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addSubtask(name); }} placeholder="+ add subtask..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 9, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => addSubtask(name)} style={{ background: t.accent + "15", border: `1px solid ${t.accent}33`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 9, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>+</button>
                </div>
              </div>

              <div style={{ flex: 1, padding: "14px 16px" }}>
                <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>comments {cmts.length > 0 && `(${cmts.length})`}</div>
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

            {/* Mockup preview panel */}
            {isMockOpen && mock && (
              <div style={{ borderTop: `1px solid ${t.border}`, padding: "16px", animation: "fadeIn 0.2s ease" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ background: t.surface, borderRadius: 10, padding: "8px 14px", flex: "1 1 80px" }}>
                    <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>points</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.amber }}>{s.points}</div>
                  </div>
                  <div style={{ background: t.surface, borderRadius: 10, padding: "8px 14px", flex: "1 1 80px" }}>
                    <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>status</div>
                    <div onClick={() => cycleStatus(name)} style={{ fontSize: 14, fontWeight: 800, color: st.c, cursor: "pointer" }} title="Click to cycle">{st.l}</div>
                  </div>
                  <div style={{ background: t.surface, borderRadius: 10, padding: "8px 14px", flex: "1 1 80px" }}>
                    <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 }}>owners</div>
                    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>{claimedBy.length > 0 ? claimedBy.map(uid => { const u = users.find(u => u.id === uid); return u ? <AvatarC key={uid} user={u} size={18} /> : null; }) : (<span style={{ fontSize: 10, color: t.textDim }}>unclaimed</span>)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, fontWeight: 600 }}>preview</div>
                <div style={{ maxWidth: 400, margin: "0 auto" }}>{mock(t)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
