"use client";

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
}

export default function Stage({
  name, idx, tot, pC, pId, t, expS, setExpS, getStatus, sc,
  claims, reactions: rxns, subtasks, comments, users, currentUser, me,
  reactOpen, setReactOpen, showMockup, setShowMockup, copied, claimAnim,
  handleClaim, handleReact, cycleStatus, shareStage,
  subtaskInput, setSubtaskInput, commentInput, setCommentInput,
  addSubtask, toggleSubtask, addComment,
}: StageProps) {
  const k = `${pId}-${idx}`;
  const isE = expS === k;
  const s = stageDefaults[name];
  if (!s) return null;
  const effectiveStatus = getStatus(name);
  const st = sc[effectiveStatus];
  const claimedBy = claims[name] || [];
  const mock = mockups[name] as ((t: T) => React.ReactNode) | undefined;
  const tasks = subtasks[name] || [];
  const cmts = comments[name] || [];
  const tasksDone = tasks.filter(x => x.done).length;
  const isMockOpen = showMockup[name];

  return (
    <div style={{ display: "flex" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 26, flexShrink: 0, paddingTop: 3 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${st.c}`, background: effectiveStatus === "active" ? st.c : "transparent", boxShadow: effectiveStatus === "active" ? `0 0 8px ${st.c}44` : "none", zIndex: 1 }} />
        {idx < tot - 1 && <div style={{ width: 1.5, flex: 1, background: `${st.c}22`, marginTop: 1 }} />}
      </div>
      <div onClick={e => { e.stopPropagation(); setExpS(isE ? null : k); }} style={{ flex: 1, background: isE ? t.bgHover : t.bgSoft, border: `1px solid ${isE ? pC + "33" : t.border}`, borderRadius: 12, marginBottom: idx < tot - 1 ? 4 : 0, cursor: "pointer", transition: "all 0.2s", overflow: "hidden" }}>
        <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 6 }}
          onMouseEnter={() => setReactOpen(name)} onMouseLeave={() => setReactOpen(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flexShrink: 1 }}>
            <Chev open={isE} color={pC} />
            <span style={{ fontSize: 11, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
            <span onClick={e => { e.stopPropagation(); cycleStatus(name); }} style={{ fontSize: 6, fontWeight: 700, color: st.c, background: st.c + "12", padding: "1.5px 6px", borderRadius: 6, flexShrink: 0, cursor: "pointer", transition: "all 0.15s" }} title="Click to change status">{st.l}</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }} onClick={e => e.stopPropagation()}>
            {(() => {
              const sr = rxns[name] || {};
              const existing = Object.entries(sr).filter(([, v]) => v.length > 0);
              const isHover = reactOpen === name;
              if (isHover) {
                return REACTIONS.map(r => { const us = sr[r] || []; const mine = us.includes(currentUser!); const has = us.length > 0; return (
                  <button key={r} onClick={() => handleReact(name, r)} style={{ background: mine ? t.accent + "22" : has ? t.surface : "transparent", border: "none", borderRadius: 10, padding: "2px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontFamily: "inherit", transition: "all 0.12s", opacity: has ? 1 : 0.35, transform: mine ? "scale(1.15)" : "scale(1)" }}>
                    <span style={{ fontSize: has ? 12 : 10 }}>{r}</span>
                    {has && <span style={{ fontSize: 6, color: mine ? t.accent : t.textMuted, fontWeight: 700 }}>{us.length}</span>}
                  </button>); });
              }
              return existing.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (
                <button key={emoji} onClick={() => handleReact(name, emoji)} style={{ background: mine ? t.accent + "18" : t.surface, border: "none", borderRadius: 10, padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontFamily: "inherit", transition: "all 0.1s" }}>
                  <span style={{ fontSize: 11 }}>{emoji}</span>
                  <span style={{ fontSize: 6, color: mine ? t.accent : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                </button>); });
            })()}
            {claimedBy.length > 0 && <div style={{ display: "flex", marginLeft: 2 }}>{claimedBy.slice(0, 3).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={16} /></div> : null; })}</div>}
            {tasks.length > 0 && <span style={{ fontSize: 7, color: tasksDone === tasks.length ? t.green : t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{tasksDone}/{tasks.length}</span>}
            {cmts.length > 0 && <span style={{ fontSize: 7, color: t.textMuted }}>&#x1F4AC;{cmts.length}</span>}
            <span style={{ fontSize: 6.5, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>+{s.points}</span>
          </div>
        </div>

        {isE && (
          <div style={{ borderTop: `1px solid ${t.border}`, animation: "fadeIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "8px 12px", borderBottom: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
              {claimAnim?.stage === name && [...Array(16)].map((_, i) => (<div key={`conf-${i}`} style={{ position: "absolute", width: 4 + i % 3, height: 4 + i % 3, borderRadius: i % 2 === 0 ? "50%" : "1px", background: [me?.color || t.accent, t.green, t.amber, t.purple, t.cyan, "#ff69b4"][i % 6], left: "60px", top: "16px", animation: `confetti${i % 4} 0.8s ease-out forwards`, opacity: 0 }} />))}
              {claimAnim?.stage === name && <div style={{ position: "absolute", left: 70, top: 0, color: t.green, fontSize: 12, fontWeight: 900, fontFamily: "var(--font-dm-mono), monospace", animation: "flyup 1s ease-out forwards", opacity: 0, zIndex: 5 }}>+{claimAnim.pts}pts</div>}

              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                {!claimedBy.includes(currentUser!) ? (
                  <button onClick={() => handleClaim(name)} style={{ background: `linear-gradient(135deg,${me?.color || t.accent},${me?.color || t.accent}aa)`, border: "none", borderRadius: 10, padding: "7px 18px", cursor: "pointer", fontSize: 10, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", textTransform: "lowercase", boxShadow: `0 0 20px ${me?.color || t.accent}44, 0 2px 8px rgba(0,0,0,0.4)`, display: "flex", alignItems: "center", gap: 6, animation: "claimPulse 2s ease-in-out infinite", position: "relative", overflow: "hidden", letterSpacing: 0.3 }}>
                    <span style={{ fontSize: 14 }}>&#x1F480;</span>
                    <span style={{ color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>claim this</span>
                    <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "1px 6px", fontSize: 8, color: "#fff" }}>+{s.points}pts</span>
                    <div style={{ position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)", animation: "shimmer 2.5s ease-in-out infinite" }} />
                  </button>
                ) : (
                  <button onClick={() => handleClaim(name)} style={{ background: t.green + "20", border: `1px solid ${t.green}55`, borderRadius: 10, padding: "7px 14px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", textTransform: "lowercase", display: "flex", alignItems: "center", gap: 5, boxShadow: `0 0 12px ${t.green}18` }}>
                    <AvatarC user={me} size={18} />
                    <span style={{ color: t.green }}>&#x2713; claimed</span>
                  </button>
                )}

                {claimedBy.filter(uid => uid !== currentUser).length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {claimedBy.filter(uid => uid !== currentUser).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid}><AvatarC user={u} size={16} /></div> : null; })}
                  </div>
                )}

                <button onClick={() => shareStage(name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 8, color: copied === name ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                  {copied === name ? "&#x2713; copied" : "&#x1F4CB; share"}
                </button>
                {mock && <button onClick={() => setShowMockup(prev => ({ ...prev, [name]: !prev[name] }))} style={{ background: isMockOpen ? pC + "20" : pC + "0a", border: `1px solid ${isMockOpen ? pC + "55" : pC + "25"}`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 8.5, color: isMockOpen ? pC : pC + "cc", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s", boxShadow: isMockOpen ? `0 0 8px ${pC}15` : "none" }}>
                  {isMockOpen ? "&#x25BE; hide details" : "&#x1F4CB; details"}
                </button>}
              </div>
            </div>

            <div style={{ display: "flex", gap: 0, minHeight: 60 }}>
              <div style={{ flex: 1, padding: "8px 12px", borderRight: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>subtasks {tasks.length > 0 && `(${tasksDone}/${tasks.length})`}</div>
                {tasks.map(task => (
                  <div key={task.id} onClick={() => toggleSubtask(name, task.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 0", cursor: "pointer" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${task.done ? t.green : t.border}`, background: task.done ? t.green + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {task.done && <span style={{ fontSize: 7, color: t.green }}>&#x2713;</span>}
                    </div>
                    <span style={{ fontSize: 8, color: task.done ? t.textDim : t.textSec, textDecoration: task.done ? "line-through" : "none", flex: 1 }}>{task.text}</span>
                    <span style={{ fontSize: 6, color: t.textDim }}>{users.find(u => u.id === task.by)?.name?.charAt(0)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  <input value={subtaskInput[name] || ""} onChange={e => setSubtaskInput(prev => ({ ...prev, [name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addSubtask(name); }} placeholder="+ add subtask..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 6px", fontSize: 7.5, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => addSubtask(name)} style={{ background: t.accent + "18", border: `1px solid ${t.accent}33`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 7, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>+</button>
                </div>
              </div>

              <div style={{ flex: 1, padding: "8px 12px" }}>
                <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>comments {cmts.length > 0 && `(${cmts.length})`}</div>
                <div style={{ maxHeight: 100, overflowY: "auto" }}>
                  {cmts.map(c => { const u = users.find(x => x.id === c.by); return (
                    <div key={c.id} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {u && <AvatarC user={u} size={14} />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                          <span style={{ fontSize: 7, fontWeight: 700, color: u?.color || t.text }}>{u?.name}</span>
                          <span style={{ fontSize: 6, color: t.textDim }}>{c.time}</span>
                        </div>
                        <div style={{ fontSize: 8, color: t.textSec, lineHeight: 1.35 }}>{c.text}</div>
                      </div>
                    </div>
                  ); })}
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  <input value={commentInput[name] || ""} onChange={e => setCommentInput(prev => ({ ...prev, [name]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addComment(name); }} placeholder="comment..." style={{ flex: 1, background: "transparent", border: `1px solid ${t.border}`, borderRadius: 6, padding: "3px 6px", fontSize: 7.5, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => addComment(name)} style={{ background: t.accent + "18", border: `1px solid ${t.accent}33`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 7, color: t.accent, fontWeight: 700, fontFamily: "inherit" }}>&#x21B5;</button>
                </div>
              </div>
            </div>

            {mock && isMockOpen && (
              <div style={{ borderTop: `1px solid ${t.border}`, padding: "12px 12px", animation: "fadeIn 0.2s ease" }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>about</div>
                  <div style={{ fontSize: 9.5, color: t.textSec, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <div style={{ background: t.surface, borderRadius: 8, padding: "5px 10px", flex: "1 1 80px" }}><div style={{ fontSize: 6, color: t.textDim, letterSpacing: 1, textTransform: "uppercase" }}>points</div><div style={{ fontSize: 11, fontWeight: 800, color: t.amber }}>{s.points}</div></div>
                  <div style={{ background: t.surface, borderRadius: 8, padding: "5px 10px", flex: "1 1 80px" }}><div style={{ fontSize: 6, color: t.textDim, letterSpacing: 1, textTransform: "uppercase" }}>status</div><div style={{ fontSize: 11, fontWeight: 800, color: st.c }}>{st.l}</div></div>
                  <div style={{ background: t.surface, borderRadius: 8, padding: "5px 10px", flex: "1 1 80px" }}><div style={{ fontSize: 6, color: t.textDim, letterSpacing: 1, textTransform: "uppercase" }}>owners</div><div style={{ display: "flex", gap: 2, marginTop: 2 }}>{claimedBy.length > 0 ? claimedBy.map(uid => { const u = users.find(u => u.id === uid); return u ? <AvatarC key={uid} user={u} size={16} /> : null; }) : (<span style={{ fontSize: 9, color: t.textDim }}>unclaimed</span>)}</div></div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>preview</div>
                  <div style={{ maxWidth: 360, margin: "0 auto" }}>{mock(t)}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
