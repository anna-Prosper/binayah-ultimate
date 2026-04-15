"use client";

import { useState, useEffect, useCallback } from "react";
import { lsGet, lsSet } from "@/lib/storage";
import { mkTheme } from "@/lib/themes";
import { pipelineData, stageDefaults, USERS_DEFAULT, REACTIONS, STATUS_ORDER, type SubtaskItem, type CommentItem, type ActivityItem } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Chev, NB } from "@/components/ui/primitives";
import Onboarding from "@/components/Onboarding";
import ActivityFeed from "@/components/ActivityFeed";
import SearchFilter from "@/components/SearchFilter";
import Stage from "@/components/Stage";

export default function Dashboard() {
  const [isDark, setIsDark] = useState(() => lsGet("isDark", true));
  const [themeId, setThemeId] = useState(() => lsGet("themeId", "warroom"));
  const [currentUser, setCurrentUser] = useState<string | null>(() => lsGet("currentUser", null));
  const [users, setUsers] = useState(() => lsGet("users", USERS_DEFAULT));
  const [onboardStep, setOnboardStep] = useState(() => lsGet("onboardStep", 0));
  const [selUser, setSelUser] = useState<string | null>(null);
  const [selAvatar, setSelAvatar] = useState<string | null>(null);
  const [exp, setExp] = useState<string | null>("research");
  const [expS, setExpS] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>(() => lsGet("reactions", {}));
  const [claims, setClaims] = useState<Record<string, string[]>>(() => lsGet("claims", {}));
  const [subtasks, setSubtasks] = useState<Record<string, SubtaskItem[]>>(() => lsGet("subtasks", {}));
  const [comments, setComments] = useState<Record<string, CommentItem[]>>(() => lsGet("comments", {}));
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [subtaskInput, setSubtaskInput] = useState<Record<string, string>>({});
  const [showMockup, setShowMockup] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [claimAnim, setClaimAnim] = useState<{ stage: string; pts: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; pts: string; color: string } | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [stageStatusOverrides, setStageStatusOverrides] = useState<Record<string, string>>(() => lsGet("stageStatusOverrides", {}));
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() => lsGet("activityLog", []));
  const [showActivity, setShowActivity] = useState(false);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => lsGet("lastSeenActivity", 0));

  useEffect(() => { lsSet("isDark", isDark) }, [isDark]);
  useEffect(() => { lsSet("themeId", themeId) }, [themeId]);
  useEffect(() => { lsSet("currentUser", currentUser) }, [currentUser]);
  useEffect(() => { lsSet("users", users) }, [users]);
  useEffect(() => { lsSet("onboardStep", onboardStep) }, [onboardStep]);
  useEffect(() => { lsSet("reactions", reactions) }, [reactions]);
  useEffect(() => { lsSet("claims", claims) }, [claims]);
  useEffect(() => { lsSet("subtasks", subtasks) }, [subtasks]);
  useEffect(() => { lsSet("comments", comments) }, [comments]);
  useEffect(() => { lsSet("stageStatusOverrides", stageStatusOverrides) }, [stageStatusOverrides]);
  useEffect(() => { lsSet("activityLog", activityLog) }, [activityLog]);
  useEffect(() => { lsSet("lastSeenActivity", lastSeenActivity) }, [lastSeenActivity]);

  const getStatus = useCallback((name: string) => stageStatusOverrides[name] || stageDefaults[name]?.status || "concept", [stageStatusOverrides]);
  const logActivity = useCallback((type: string, target: string, detail: string) => {
    if (!currentUser) return;
    setActivityLog(prev => [{ type, user: currentUser, target, detail, time: Date.now() }, ...prev.slice(0, 99)]);
  }, [currentUser]);

  const t = mkTheme(themeId, isDark);
  const sc: Record<string, { l: string; c: string }> = { active: { l: "live", c: t.green }, "in-progress": { l: "building", c: t.amber }, planned: { l: "planned", c: t.cyan || t.accent }, concept: { l: "concept", c: t.purple } };
  const pr: Record<string, { c: string }> = { NOW: { c: t.red }, HIGH: { c: t.amber }, MEDIUM: { c: t.accent } };
  const ck: Record<string, string> = { blue: t.accent, purple: t.purple, green: t.green, amber: t.amber, cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate };

  const allStages = pipelineData.flatMap(p => p.stages);
  const total = allStages.length;
  const bySt = (s: string) => allStages.filter(n => getStatus(n) === s).length;
  const getPoints = (uid: string) => { let p = 0; Object.entries(claims).forEach(([s, c]) => { if (c.includes(uid)) p += stageDefaults[s]?.points || 10; }); Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if (r.includes(uid)) p += 2; }); }); return p; };

  const handleClaim = (sid: string) => { if (!currentUser) return; const alreadyClaimed = (claims[sid] || []).includes(currentUser); setClaims(prev => { const c = prev[sid] || []; if (c.includes(currentUser)) return { ...prev, [sid]: c.filter(u => u !== currentUser) }; return { ...prev, [sid]: [...c, currentUser] }; }); if (!alreadyClaimed) { const pts = stageDefaults[sid]?.points || 10; const me2 = users.find((u: typeof USERS_DEFAULT[number]) => u.id === currentUser); setClaimAnim({ stage: sid, pts }); setToast({ text: `${me2?.name} claimed ${sid}`, pts: `+${pts}pts`, color: me2?.color || t.accent }); logActivity("claim", sid, `+${pts}pts`); setTimeout(() => setClaimAnim(null), 1200); setTimeout(() => setToast(null), 2500); } };
  const handleReact = (sid: string, emoji: string) => { if (!currentUser) return; setReactions(prev => { const s = { ...(prev[sid] || {}) }; const u = [...(s[emoji] || [])]; const i = u.indexOf(currentUser); if (i >= 0) u.splice(i, 1); else u.push(currentUser); s[emoji] = u; return { ...prev, [sid]: s }; }); };

  const addSubtask = (sid: string) => { const val = subtaskInput[sid]?.trim(); if (!val || !currentUser) return; setSubtasks(prev => ({ ...prev, [sid]: [...(prev[sid] || []), { id: Date.now(), text: val, done: false, by: currentUser }] })); setSubtaskInput(prev => ({ ...prev, [sid]: "" })); };
  const toggleSubtask = (sid: string, taskId: number) => { setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t) })); };
  const addComment = (sid: string) => { const val = commentInput[sid]?.trim(); if (!val || !currentUser) return; setComments(prev => ({ ...prev, [sid]: [...(prev[sid] || []), { id: Date.now(), text: val, by: currentUser, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] })); logActivity("comment", sid, val); setCommentInput(prev => ({ ...prev, [sid]: "" })); };
  const cycleStatus = (name: string) => { const cur = getStatus(name); const idx = STATUS_ORDER.indexOf(cur); const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]; setStageStatusOverrides(prev => ({ ...prev, [name]: next })); logActivity("status", name, `→ ${next}`); };
  const shareStage = (name: string) => { navigator.clipboard?.writeText(`Binayah AI — ${name}`).then(() => { setCopied(name); setTimeout(() => setCopied(null), 2000); }).catch(() => {}); setCopied(name); setTimeout(() => setCopied(null), 2000); };

  // === ONBOARDING ===
  if (onboardStep < 7) {
    return <Onboarding t={t} themeId={themeId} setThemeId={setThemeId} onboardStep={onboardStep} setOnboardStep={setOnboardStep} users={users} selUser={selUser} setSelUser={setSelUser} selAvatar={selAvatar} setSelAvatar={setSelAvatar} setCurrentUser={setCurrentUser} setUsers={setUsers} />;
  }

  // === DASHBOARD ===
  const me = users.find((u: typeof USERS_DEFAULT[number]) => u.id === currentUser);
  if (!me) return (<div style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-dm-sans), sans-serif" }}><button onClick={() => setOnboardStep(0)} style={{ background: t.accent, border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Start Over</button></div>);

  const stageProps = { t, expS, setExpS, getStatus, sc, claims, reactions, subtasks, comments, users, currentUser, me, reactOpen, setReactOpen, showMockup, setShowMockup, copied, claimAnim, handleClaim, handleReact, cycleStatus, shareStage, subtaskInput, setSubtaskInput, commentInput, setCommentInput, addSubtask, toggleSubtask, addComment };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes shimmer{0%{left:-100%}100%{left:200%}}@keyframes flyup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}}@keyframes confetti0{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(40px,-50px) rotate(180deg)}}@keyframes confetti1{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-30px,-60px) rotate(-120deg)}}@keyframes confetti2{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(60px,-30px) rotate(90deg)}}@keyframes confetti3{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-50px,-40px) rotate(-200deg)}}*{box-sizing:border-box;}@media(max-width:640px){.bu-stats{grid-template-columns:repeat(3,1fr)!important}.bu-team-row{flex-wrap:wrap;gap:6px!important}.bu-header{flex-direction:column;gap:10px!important}.bu-search-row{flex-direction:column}.bu-pipe-hours{display:none!important}}`}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 18px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div><div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: t.green, boxShadow: `0 0 8px ${t.green}66` }} /><span style={{ fontSize: 8, letterSpacing: 3, color: t.textMuted, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{pipelineData.length} pipelines · {total} stages</span></div><div style={{ fontSize: 24, fontWeight: 900, color: t.text, textShadow: `0 0 8px ${t.accent}33` }}>{t.icon} {t.name}</div><div style={{ fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{t.sub}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {me && <NB color={me.color} style={{ background: t.bgCard, padding: "6px 12px", display: "flex", alignItems: "center", gap: 8, borderRadius: 12 }}><AvatarC user={me} size={24} /><div><div style={{ fontSize: 10, fontWeight: 800, color: t.text }}>{me.name}</div><div style={{ fontSize: 8, color: t.amber, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div></div></NB>}
            <button onClick={() => { setShowActivity(!showActivity); setLastSeenActivity(activityLog.length); }} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "6px 10px", color: t.textMuted, fontSize: 12, cursor: "pointer", position: "relative" }}>&#x1F514;{activityLog.length > lastSeenActivity && <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: t.red, border: `1.5px solid ${t.bgCard}` }} />}</button>
            <button onClick={() => setIsDark(!isDark)} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "6px 10px", color: t.textMuted, fontSize: 12, cursor: "pointer" }}>{isDark ? "&#x2600;&#xFE0F;" : "&#x1F31A;"}</button>
            <button onClick={() => { setOnboardStep(5); setCurrentUser(null); }} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "6px 10px", color: t.textMuted, fontSize: 8, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace" }}>switch</button>
          </div>
        </div>

        {/* TEAM */}
        <NB color={t.accent} style={{ background: t.bgCard, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", gap: 12 }}>{users.map((u: typeof USERS_DEFAULT[number]) => (<div key={u.id} style={{ display: "flex", alignItems: "center", gap: 5, opacity: u.id === currentUser ? 1 : 0.5 }}><AvatarC user={u} size={24} /><div><div style={{ fontSize: 8, fontWeight: 800, color: t.text }}>{u.name}</div><div style={{ fontSize: 7, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(u.id)}pts</div></div></div>))}</div><div style={{ fontSize: 7, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{Object.keys(claims).filter(k => (claims[k] || []).length > 0).length}/{total} claimed</div></NB>

        {/* CLAIMED OVERVIEW */}
        {(() => { const claimedStages = Object.entries(claims).filter(([, v]) => v.length > 0); if (claimedStages.length === 0) return null; const byUser: Record<string, string[]> = {}; claimedStages.forEach(([stage, claimers]) => { claimers.forEach(uid => { if (!byUser[uid]) byUser[uid] = []; byUser[uid].push(stage); }); }); return (
          <NB color={t.accent} style={{ background: t.bgCard, padding: "10px 14px", marginBottom: 8, borderRadius: 14 }}>
            <div style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--font-dm-mono), monospace" }}>claimed territories</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.entries(byUser).map(([uid, stages]) => { const u = users.find((u: typeof USERS_DEFAULT[number]) => u.id === uid); if (!u) return null; return (
                <div key={uid} style={{ display: "flex", alignItems: "flex-start", gap: 5, minWidth: 0 }}>
                  <AvatarC user={u} size={20} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: u.color }}>{u.name}</div>
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 2 }}>
                      {stages.slice(0, 4).map(s => (<span key={s} style={{ fontSize: 6.5, color: t.textMuted, background: t.surface, padding: "1px 4px", borderRadius: 3, whiteSpace: "nowrap" }}>{s}</span>))}
                      {stages.length > 4 && <span style={{ fontSize: 6.5, color: t.textDim }}>+{stages.length - 4}</span>}
                    </div>
                  </div>
                </div>
              ); })}
            </div>
          </NB>
        ); })()}

        {/* ACTIVITY PANEL */}
        {showActivity && <ActivityFeed activityLog={activityLog} users={users} t={t} />}

        {/* SEARCH & FILTER */}
        <SearchFilter searchQ={searchQ} setSearchQ={setSearchQ} statusFilter={statusFilter} setStatusFilter={setStatusFilter} t={t} />

        {/* STATS */}
        <div className="bu-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginBottom: 12 }}>{[{ l: "total", v: total, c: t.text }, { l: "live", v: bySt("active"), c: t.green }, { l: "building", v: bySt("in-progress"), c: t.amber }, { l: "planned", v: bySt("planned"), c: t.cyan || t.accent }, { l: "concept", v: bySt("concept"), c: t.purple }].map(s => (<NB key={s.l} color={s.c} style={{ background: t.bgCard, padding: "8px 4px", textAlign: "center", borderRadius: 10 }}><div style={{ fontSize: 18, fontWeight: 900, color: s.c, textShadow: `0 0 8px ${s.c}33` }}>{s.v}</div><div style={{ fontSize: 6.5, color: t.textMuted, letterSpacing: 1.5, fontFamily: "var(--font-dm-mono), monospace" }}>{s.l}</div></NB>))}</div>

        {/* PIPELINES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{pipelineData.filter(p => {
          const q = searchQ.toLowerCase();
          const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.stages.some(s => s.toLowerCase().includes(q));
          const matchesFilter = !statusFilter || (statusFilter === "claimed" ? p.stages.some(s => (claims[s] || []).includes(currentUser!)) : p.stages.some(s => getStatus(s) === statusFilter));
          return matchesSearch && matchesFilter;
        }).map(p => {
          const isO = exp === p.id || !!searchQ; const pC = ck[p.colorKey]; const prC = pr[p.priority];
          const statusWeight: Record<string, number> = { concept: 0, planned: 25, "in-progress": 60, active: 100 };
          const pct = Math.round(p.stages.reduce((sum, s) => sum + (statusWeight[getStatus(s)] || 0), 0) / p.stages.length);
          const uClaim = [...new Set(p.stages.flatMap(s => claims[s] || []))];
          const allPipelineClaimed = p.stages.every(s => (claims[s] || []).includes(currentUser!));
          const pipeReactions = reactions[`_pipe_${p.id}`] || {};
          const pipeReactExist = Object.entries(pipeReactions).filter(([, v]) => v.length > 0);
          return (<NB key={p.id} color={isO ? pC : t.border} style={{ background: t.bgCard, overflow: "hidden", boxShadow: isO ? t.shadowLg : t.shadow, transition: "all 0.25s" }}><div style={{ height: 2, background: t.surface }}><div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: pC, boxShadow: `0 0 6px ${pC}33`, transition: "width 0.5s" }} /></div><div onClick={() => setExp(isO ? null : p.id)} style={{ padding: "12px 14px", cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "flex-start", gap: 6, flex: 1 }}><Chev open={isO} color={pC} /><div><div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}><span style={{ fontSize: 14 }}>{p.icon}</span><span style={{ fontSize: 13, fontWeight: 900, color: t.text, textShadow: `0 0 6px ${pC}22` }}>{p.name}</span><span style={{ fontSize: 6.5, color: pC, background: pC + "10", padding: "1.5px 6px", borderRadius: 7, fontWeight: 600 }}>{p.stages.length}</span><span style={{ fontSize: 6, color: prC.c, background: prC.c + "15", padding: "1.5px 6px", borderRadius: 7, fontWeight: 800 }}>{p.priority}</span><span style={{ fontSize: 6.5, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>{p.points}pts</span></div><p style={{ fontSize: 9.5, color: t.textSec, margin: 0 }}>{p.desc}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
              {!allPipelineClaimed ? (
                <button onClick={() => { p.stages.forEach(s => { if (!(claims[s] || []).includes(currentUser!)) handleClaim(s); }); }} style={{ background: `linear-gradient(135deg,${pC},${pC}aa)`, border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 8, color: "#fff", fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textTransform: "lowercase", boxShadow: `0 0 12px ${pC}33`, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10 }}>&#x1F480;</span> claim all
                </button>
              ) : (
                <span style={{ fontSize: 8, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>&#x2713; all claimed</span>
              )}
              <div style={{ display: "flex", gap: 2 }} onMouseEnter={() => setReactOpen(`_pipe_${p.id}`)} onMouseLeave={() => setReactOpen(null)}>
                {reactOpen === `_pipe_${p.id}` ? REACTIONS.map(r => { const us = pipeReactions[r] || []; const mine = us.includes(currentUser!); return (
                  <button key={r} onClick={() => handleReact(`_pipe_${p.id}`, r)} style={{ background: mine ? pC + "22" : us.length > 0 ? t.surface : "transparent", border: "none", borderRadius: 8, padding: "1px 3px", cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontFamily: "inherit", opacity: us.length > 0 ? 1 : 0.35, transform: mine ? "scale(1.1)" : "scale(1)", transition: "all 0.1s" }}>
                    <span style={{ fontSize: us.length > 0 ? 11 : 9 }}>{r}</span>
                    {us.length > 0 && <span style={{ fontSize: 6, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{us.length}</span>}
                  </button>); })
                : pipeReactExist.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (
                  <button key={emoji} onClick={() => handleReact(`_pipe_${p.id}`, emoji)} style={{ background: mine ? pC + "18" : t.surface, border: "none", borderRadius: 8, padding: "1px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontFamily: "inherit" }}>
                    <span style={{ fontSize: 10 }}>{emoji}</span>
                    <span style={{ fontSize: 6, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                  </button>); })}
              </div>
              {uClaim.length > 0 && <div style={{ display: "flex", marginLeft: 2 }}>{uClaim.slice(0, 5).map(uid => { const u = users.find((u: typeof USERS_DEFAULT[number]) => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -3 }}><AvatarC user={u} size={17} /></div> : null; })}</div>}
            </div></div></div><div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}><div style={{ fontSize: 11, fontWeight: 900, color: pC, fontFamily: "var(--font-dm-mono), monospace", textShadow: `0 0 6px ${pC}22` }}>{p.totalHours}</div><div style={{ display: "flex", gap: 1.5, marginTop: 3, justifyContent: "flex-end" }}>{p.stages.map((s, i) => { const stC = sc[getStatus(s)] || { c: t.textDim }; return <div key={i} style={{ width: 5, height: 5, borderRadius: 1.5, background: stC.c + "33", border: `1px solid ${stC.c}` }} />; })}</div></div></div>{!isO && <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 6, paddingLeft: 18 }}>{p.stages.map((s, i) => { const stC = sc[getStatus(s)] || { c: t.textDim }; return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 1.5 }}><span style={{ fontSize: 6.5, color: stC.c, background: stC.c + "0a", padding: "1px 4px", borderRadius: 4, fontFamily: "var(--font-dm-mono), monospace" }}>{s}</span>{i < p.stages.length - 1 && <span style={{ color: t.textDim, fontSize: 7 }}>&rarr;</span>}</div>); })}</div>}</div>{isO && <div style={{ padding: "0 14px 14px", animation: "fadeIn 0.2s ease" }}><div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>{p.stages.map((s, i) => <Stage key={i} name={s} idx={i} tot={p.stages.length} pC={pC} pId={p.id} {...stageProps} />)}</div></div>}</NB>);
        })}</div>

        {/* Toast notification */}
        {toast && <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: t.bgCard, border: `1px solid ${toast.color}44`, borderRadius: 14, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 16px ${toast.color}22`, animation: "slideUp 0.3s ease", zIndex: 100, fontFamily: "var(--font-dm-mono), monospace" }}><span style={{ fontSize: 11 }}>&#x1F525;</span><span style={{ fontSize: 10, color: t.text, fontWeight: 600 }}>{toast.text}</span><span style={{ fontSize: 10, color: t.green, fontWeight: 800 }}>{toast.pts}</span></div>}
        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 8, borderTop: `1px solid ${t.border}` }}><p style={{ fontSize: 7, color: t.textDim, letterSpacing: 2, fontFamily: "var(--font-dm-mono), monospace" }}>BINAYAH.AI · {total} STAGES · SHIP IT · 2026</p></div>
      </div>
    </div>
  );
}
