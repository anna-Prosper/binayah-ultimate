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
import { generatePipelineReport } from "@/lib/generatePDF";

export default function Dashboard() {
  const [isDark, setIsDark] = useState(() => lsGet("isDark", true));
  const [themeId, setThemeId] = useState(() => lsGet("themeId", "warroom"));
  const [currentUser, setCurrentUser] = useState<string | null>(() => lsGet("currentUser", null));
  const [users, setUsers] = useState(() => lsGet("users", USERS_DEFAULT));
  const [onboardStep, setOnboardStep] = useState(() => lsGet("onboardStep", 0));
  const [selUser, setSelUser] = useState<string | null>(null);
  const [selAvatar, setSelAvatar] = useState<string | null>(null);
  // Multi-expand: array of expanded pipeline IDs
  const [expanded, setExpanded] = useState<string[]>(() => lsGet("expanded", ["research"]));
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
  const [stageDescOverrides, setStageDescOverrides] = useState<Record<string, string>>(() => lsGet("stageDescOverrides", {}));
  const [pipeDescOverrides, setPipeDescOverrides] = useState<Record<string, string>>(() => lsGet("pipeDescOverrides", {}));
  const [editingPipeDesc, setEditingPipeDesc] = useState<string | null>(null);
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
  useEffect(() => { lsSet("stageDescOverrides", stageDescOverrides) }, [stageDescOverrides]);
  useEffect(() => { lsSet("pipeDescOverrides", pipeDescOverrides) }, [pipeDescOverrides]);
  useEffect(() => { lsSet("expanded", expanded) }, [expanded]);
  useEffect(() => { lsSet("activityLog", activityLog) }, [activityLog]);
  useEffect(() => { lsSet("lastSeenActivity", lastSeenActivity) }, [lastSeenActivity]);

  // Auto-expand matching pipelines on search
  useEffect(() => {
    if (!searchQ) return;
    const q = searchQ.toLowerCase();
    const ids = pipelineData
      .filter(p => p.name.toLowerCase().includes(q) || p.stages.some(s => s.toLowerCase().includes(q)))
      .map(p => p.id);
    setExpanded(prev => [...new Set([...prev, ...ids])]);
  }, [searchQ]);

  const getStatus = useCallback((name: string) => stageStatusOverrides[name] || stageDefaults[name]?.status || "concept", [stageStatusOverrides]);
  const logActivity = useCallback((type: string, target: string, detail: string) => {
    if (!currentUser) return;
    setActivityLog(prev => [{ type, user: currentUser, target, detail, time: Date.now() }, ...prev.slice(0, 99)]);
  }, [currentUser]);

  const t = mkTheme(themeId, isDark);
  const sc: Record<string, { l: string; c: string }> = { active: { l: "live", c: t.green }, "in-progress": { l: "building", c: t.amber }, planned: { l: "planned", c: t.cyan || t.accent }, concept: { l: "concept", c: t.purple } };
  const pr: Record<string, { c: string }> = { NOW: { c: t.red }, HIGH: { c: t.amber }, MEDIUM: { c: t.accent }, LOW: { c: t.textMuted } };
  const ck: Record<string, string> = { blue: t.accent, purple: t.purple, green: t.green, amber: t.amber, cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate };

  const allStages = pipelineData.flatMap(p => p.stages);
  const total = allStages.length;
  const bySt = (s: string) => allStages.filter(n => getStatus(n) === s).length;
  const getPoints = (uid: string) => { let p = 0; Object.entries(claims).forEach(([s, c]) => { if (c.includes(uid)) p += stageDefaults[s]?.points || 10; }); Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if (r.includes(uid)) p += 2; }); }); return p; };

  const toggleExpand = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleClaim = (sid: string) => { if (!currentUser) return; const alreadyClaimed = (claims[sid] || []).includes(currentUser); setClaims(prev => { const c = prev[sid] || []; if (c.includes(currentUser)) return { ...prev, [sid]: c.filter(u => u !== currentUser) }; return { ...prev, [sid]: [...c, currentUser] }; }); if (!alreadyClaimed) { const pts = stageDefaults[sid]?.points || 10; const me2 = users.find((u: typeof USERS_DEFAULT[number]) => u.id === currentUser); setClaimAnim({ stage: sid, pts }); setToast({ text: `${me2?.name} claimed ${sid}`, pts: `+${pts}pts`, color: me2?.color || t.accent }); logActivity("claim", sid, `+${pts}pts`); setTimeout(() => setClaimAnim(null), 1200); setTimeout(() => setToast(null), 2500); } };
  const handleReact = (sid: string, emoji: string) => { if (!currentUser) return; setReactions(prev => { const s = { ...(prev[sid] || {}) }; const u = [...(s[emoji] || [])]; const i = u.indexOf(currentUser); if (i >= 0) u.splice(i, 1); else u.push(currentUser); s[emoji] = u; return { ...prev, [sid]: s }; }); };
  const addSubtask = (sid: string) => { const val = subtaskInput[sid]?.trim(); if (!val || !currentUser) return; setSubtasks(prev => ({ ...prev, [sid]: [...(prev[sid] || []), { id: Date.now(), text: val, done: false, by: currentUser }] })); setSubtaskInput(prev => ({ ...prev, [sid]: "" })); };
  const toggleSubtask = (sid: string, taskId: number) => { setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t) })); };
  const addComment = (sid: string) => { const val = commentInput[sid]?.trim(); if (!val || !currentUser) return; setComments(prev => ({ ...prev, [sid]: [...(prev[sid] || []), { id: Date.now(), text: val, by: currentUser, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] })); logActivity("comment", sid, val); setCommentInput(prev => ({ ...prev, [sid]: "" })); };
  const cycleStatus = (name: string) => { const cur = getStatus(name); const idx = STATUS_ORDER.indexOf(cur); const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]; setStageStatusOverrides(prev => ({ ...prev, [name]: next })); logActivity("status", name, `\u2192 ${next}`); };
  const shareStage = (name: string) => { navigator.clipboard?.writeText(`Binayah AI \u2014 ${name}`).then(() => { setCopied(name); setTimeout(() => setCopied(null), 2000); }).catch(() => {}); setCopied(name); setTimeout(() => setCopied(null), 2000); };
  const sharePipeline = (pid: string, name: string) => { const text = `Binayah AI \u2014 ${name} Pipeline`; navigator.clipboard?.writeText(text).then(() => { setCopied(`pipe-${pid}`); setTimeout(() => setCopied(null), 2000); }).catch(() => {}); setCopied(`pipe-${pid}`); setTimeout(() => setCopied(null), 2000); };
  const setStageDescOverride = (name: string, val: string) => setStageDescOverrides(prev => ({ ...prev, [name]: val }));

  if (onboardStep < 7) {
    return <Onboarding t={t} themeId={themeId} setThemeId={setThemeId} onboardStep={onboardStep} setOnboardStep={setOnboardStep} users={users} selUser={selUser} setSelUser={setSelUser} selAvatar={selAvatar} setSelAvatar={setSelAvatar} setCurrentUser={setCurrentUser} setUsers={setUsers} />;
  }

  const me = users.find((u: typeof USERS_DEFAULT[number]) => u.id === currentUser);
  if (!me) return (<div style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-dm-sans), sans-serif" }}><button onClick={() => setOnboardStep(0)} style={{ background: t.accent, border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Start Over</button></div>);

  const stageProps = { t, expS, setExpS, getStatus, sc, claims, reactions, subtasks, comments, users, currentUser, me, reactOpen, setReactOpen, showMockup, setShowMockup, copied, claimAnim, handleClaim, handleReact, cycleStatus, shareStage, subtaskInput, setSubtaskInput, commentInput, setCommentInput, addSubtask, toggleSubtask, addComment, stageDescOverrides, setStageDescOverride };
  const unseen = activityLog.length - lastSeenActivity;

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes shimmer{0%{left:-100%}100%{left:200%}}@keyframes flyup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}}@keyframes confetti0{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(40px,-50px) rotate(180deg)}}@keyframes confetti1{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-30px,-60px) rotate(-120deg)}}@keyframes confetti2{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(60px,-30px) rotate(90deg)}}@keyframes confetti3{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-50px,-40px) rotate(-200deg)}}*{box-sizing:border-box;}@media(max-width:640px){.bu-stats{grid-template-columns:repeat(3,1fr)!important}.bu-team{display:none!important}.bu-header{flex-direction:column;gap:12px!important}}.pipe-desc-edit{cursor:text;}.pipe-desc-edit:hover .edit-hint{opacity:1!important}`}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* HEADER */}
        <div className="bu-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.green, boxShadow: `0 0 10px ${t.green}66` }} />
              <span style={{ fontSize: 9, letterSpacing: 3, color: t.textMuted, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>{pipelineData.length} pipelines \u00B7 {total} stages</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: t.text, letterSpacing: -0.5 }}>{t.icon} {t.name}</div>
            <div style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2 }}>{t.sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {me && <div style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "8px 14px" }}>
              <AvatarC user={me} size={28} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: t.text }}>{me.name}</div>
                <div style={{ fontSize: 9, color: t.amber, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div>
              </div>
            </div>}
            <button onClick={() => { setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 12px", color: t.textMuted, fontSize: 14, cursor: "pointer", position: "relative" }}>
              {"\uD83D\uDD14"}{unseen > 0 && <div style={{ position: "absolute", top: -3, right: -3, minWidth: 14, height: 14, borderRadius: 7, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}
            </button>
            <button onClick={() => generatePipelineReport({ themeId, claims, users, getStatus, getPoints, currentUser: currentUser! })} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 12px", color: t.textMuted, fontSize: 9, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }} title="Export PDF report">{"\uD83D\uDCC4"} PDF</button>
            <button onClick={() => setIsDark(!isDark)} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 12px", color: t.textMuted, fontSize: 14, cursor: "pointer" }}>{isDark ? "\u2600\uFE0F" : "\uD83C\uDF1A"}</button>
            <button onClick={() => { setOnboardStep(5); setCurrentUser(null); }} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 12px", color: t.textMuted, fontSize: 9, cursor: "pointer", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>switch</button>
          </div>
        </div>

        {/* TEAM BAR */}
        <div className="bu-team" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "12px 16px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14 }}>
          {users.map((u: typeof USERS_DEFAULT[number]) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 6, opacity: u.id === currentUser ? 1 : 0.45, transition: "opacity 0.2s" }}>
              <AvatarC user={u} size={26} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 800, color: t.text }}>{u.name}</div>
                <div style={{ fontSize: 8, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(u.id)}pts</div>
              </div>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 8, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>{Object.keys(claims).filter(k => (claims[k] || []).length > 0).length}/{total} claimed</div>
        </div>

        {/* ACTIVITY */}
        {showActivity && <ActivityFeed activityLog={activityLog} users={users} t={t} />}

        {/* SEARCH + FILTER + STATS */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <SearchFilter searchQ={searchQ} setSearchQ={setSearchQ} statusFilter={statusFilter} setStatusFilter={setStatusFilter} t={t} />
          </div>
          <div className="bu-stats" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, flex: "0 0 auto" }}>
            {[{ l: "total", v: total, c: t.text }, { l: "live", v: bySt("active"), c: t.green }, { l: "build", v: bySt("in-progress"), c: t.amber }, { l: "plan", v: bySt("planned"), c: t.cyan || t.accent }, { l: "idea", v: bySt("concept"), c: t.purple }].map(s => (
              <div key={s.l} style={{ background: t.bgCard, border: `1px solid ${t.border}`, padding: "8px 12px", textAlign: "center", borderRadius: 10, minWidth: 52 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 7, color: t.textMuted, letterSpacing: 1, fontFamily: "var(--font-dm-mono), monospace", textTransform: "uppercase" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PIPELINES */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{pipelineData.filter(p => {
          const q = searchQ.toLowerCase();
          const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.stages.some(s => s.toLowerCase().includes(q));
          const matchesFilter = !statusFilter || (statusFilter === "claimed" ? p.stages.some(s => (claims[s] || []).includes(currentUser!)) : p.stages.some(s => getStatus(s) === statusFilter));
          return matchesSearch && matchesFilter;
        }).map(p => {
          const isO = expanded.includes(p.id);
          const pC = ck[p.colorKey];
          const prC = pr[p.priority] || { c: t.textMuted };
          const statusWeight: Record<string, number> = { concept: 0, planned: 25, "in-progress": 60, active: 100 };
          const pct = Math.round(p.stages.reduce((sum, s) => sum + (statusWeight[getStatus(s)] || 0), 0) / p.stages.length);
          const uClaim = [...new Set(p.stages.flatMap(s => claims[s] || []))];
          const allPipelineClaimed = p.stages.every(s => (claims[s] || []).includes(currentUser!));
          const pipeReactKey = `_pipe_${p.id}`;
          const pipeReactions = reactions[pipeReactKey] || {};
          const pipeReactExist = Object.entries(pipeReactions).filter(([, v]) => v.length > 0);
          const pipeDesc = pipeDescOverrides[p.id] ?? p.desc;

          return (
            <div key={p.id} style={{ background: t.bgCard, border: `1px solid ${isO ? pC + "33" : t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: isO ? t.shadowLg : "none", transition: "all 0.25s" }}>
              {/* Progress bar */}
              <div style={{ height: 2, background: t.surface }}>
                <div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: `linear-gradient(90deg, ${pC}, ${pC}aa)`, transition: "width 0.5s" }} />
              </div>

              {/* Header — clicking the outer div toggles expand */}
              <div onClick={() => toggleExpand(p.id)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                    <Chev open={isO} color={pC} />
                    <div style={{ flex: 1 }}>
                      {/* Title row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                        <span style={{ fontSize: 16 }}>{p.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 900, color: t.text }}>{p.name}</span>
                        <span style={{ fontSize: 7, color: pC, background: pC + "12", padding: "2px 7px", borderRadius: 8, fontWeight: 700 }}>{p.stages.length}</span>
                        <span style={{ fontSize: 7, color: prC.c, background: prC.c + "12", padding: "2px 7px", borderRadius: 8, fontWeight: 800 }}>{p.priority}</span>
                        {pct > 0 && <span style={{ fontSize: 8, color: pC, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>{pct}%</span>}
                      </div>

                      {/* Description — click pencil icon to edit */}
                      {editingPipeDesc === p.id ? (
                        <textarea
                          value={pipeDesc}
                          onChange={e => setPipeDescOverrides(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onBlur={() => setEditingPipeDesc(null)}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          rows={2}
                          style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 6, padding: "4px 8px", fontSize: 10, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.5, marginBottom: 2 }}
                        />
                      ) : (
                        <p className="pipe-desc-edit" onClick={e => { e.stopPropagation(); setEditingPipeDesc(p.id); }} style={{ fontSize: 10, color: t.textSec, margin: "0 0 2px", lineHeight: 1.4, display: "flex", alignItems: "baseline", gap: 4, userSelect: "none" }}>
                          <span>{pipeDesc}</span>
                          <span className="edit-hint" style={{ fontSize: 9, color: t.textDim, opacity: 0.5, flexShrink: 0, transition: "opacity 0.15s" }}>{"\u270E"}</span>
                        </p>
                      )}

                      {/* Action row — ALWAYS visible (share, react, details/collapse, claim all) */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>

                        {/* Share */}
                        <button onClick={() => sharePipeline(p.id, p.name)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "3px 9px", cursor: "pointer", fontSize: 8, color: copied === `pipe-${p.id}` ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s", flexShrink: 0 }}>
                          {copied === `pipe-${p.id}` ? "\u2713 copied" : "\uD83D\uDCCB share"}
                        </button>

                        {/* React picker — toggle on click, not hover */}
                        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                          {reactOpen === pipeReactKey
                            ? <>
                                {REACTIONS.map(r => { const us = pipeReactions[r] || []; const mine = us.includes(currentUser!); return (
                                  <button key={r} onClick={() => handleReact(pipeReactKey, r)} style={{ background: mine ? pC + "22" : us.length > 0 ? t.surface : "transparent", border: "none", borderRadius: 8, padding: "2px 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontFamily: "inherit", opacity: us.length > 0 ? 1 : 0.4, transition: "all 0.1s" }}>
                                    <span style={{ fontSize: us.length > 0 ? 12 : 10 }}>{r}</span>
                                    {us.length > 0 && <span style={{ fontSize: 7, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{us.length}</span>}
                                  </button>); })}
                                <button onClick={() => setReactOpen(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "2px 6px", cursor: "pointer", fontSize: 7, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>done</button>
                              </>
                            : <>
                                {pipeReactExist.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (
                                  <button key={emoji} onClick={() => handleReact(pipeReactKey, emoji)} style={{ background: mine ? pC + "18" : t.surface, border: "none", borderRadius: 8, padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontFamily: "inherit" }}>
                                    <span style={{ fontSize: 11 }}>{emoji}</span>
                                    <span style={{ fontSize: 7, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                                  </button>); })}
                                <button onClick={() => setReactOpen(pipeReactKey)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 7, padding: "2px 7px", cursor: "pointer", fontSize: 8, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>+ react</button>
                              </>
                          }
                        </div>

                        {/* Details / Collapse toggle */}
                        <button onClick={() => toggleExpand(p.id)} style={{ background: isO ? pC + "15" : "transparent", border: `1px solid ${isO ? pC + "44" : t.border}`, borderRadius: 7, padding: "3px 9px", cursor: "pointer", fontSize: 8, color: isO ? pC : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s", flexShrink: 0 }}>
                          {isO ? "\u25BE collapse" : "\u25B8 details"}
                        </button>

                        {/* Claim all */}
                        {!allPipelineClaimed ? (
                          <button onClick={() => { p.stages.forEach(s => { if (!(claims[s] || []).includes(currentUser!)) handleClaim(s); }); }} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontSize: 8, color: pC, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 3, transition: "all 0.2s", flexShrink: 0 }}>
                            {"\uD83D\uDC80"} claim all
                          </button>
                        ) : (
                          <span style={{ fontSize: 8, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{"\u2713"} all claimed</span>
                        )}

                        {/* Owner avatars */}
                        {uClaim.length > 0 && <div style={{ display: "flex", marginLeft: 2 }}>{uClaim.slice(0, 5).map(uid => { const u = users.find((u: typeof USERS_DEFAULT[number]) => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={16} /></div> : null; })}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Right: hours + dots + pts */}
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: pC, fontFamily: "var(--font-dm-mono), monospace" }}>{p.totalHours}</div>
                    <div style={{ display: "flex", gap: 2, marginTop: 4, justifyContent: "flex-end" }}>
                      {p.stages.map((s, i) => { const stC = sc[getStatus(s)] || { c: t.textDim }; return <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: stC.c + "33", border: `1px solid ${stC.c}` }} />; })}
                    </div>
                    <div style={{ fontSize: 8, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", marginTop: 3 }}>{p.points}pts</div>
                  </div>
                </div>

                {/* Collapsed: stage pill list */}
                {!isO && <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 8, paddingLeft: 20 }}>
                  {p.stages.map((s, i) => {
                    const stC = sc[getStatus(s)] || { c: t.textDim };
                    const isClaimed = (claims[s] || []).length > 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 8, color: stC.c, background: stC.c + "0a", padding: "2px 6px", borderRadius: 5, fontFamily: "var(--font-dm-mono), monospace", border: isClaimed ? `1px solid ${stC.c}22` : "1px solid transparent" }}>{s}</span>
                        {i < p.stages.length - 1 && <span style={{ color: t.textDim, fontSize: 8 }}>{"\u2192"}</span>}
                      </div>
                    );
                  })}
                </div>}
              </div>

              {/* Expanded stage list */}
              {isO && <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>
                <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
                  {p.stages.map((s, i) => <Stage key={i} name={s} idx={i} tot={p.stages.length} pC={pC} pId={p.id} {...stageProps} />)}
                </div>
              </div>}
            </div>
          );
        })}</div>

        {/* Toast */}
        {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: t.bgCard, border: `1px solid ${toast.color}33`, borderRadius: 16, padding: "12px 24px", display: "flex", alignItems: "center", gap: 10, boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${toast.color}15`, animation: "slideUp 0.3s ease", zIndex: 100, fontFamily: "var(--font-dm-mono), monospace" }}>
          <span style={{ fontSize: 13 }}>{"\uD83D\uDD25"}</span>
          <span style={{ fontSize: 11, color: t.text, fontWeight: 600 }}>{toast.text}</span>
          <span style={{ fontSize: 11, color: t.green, fontWeight: 800 }}>{toast.pts}</span>
        </div>}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
          <p style={{ fontSize: 8, color: t.textDim, letterSpacing: 2, fontFamily: "var(--font-dm-mono), monospace" }}>BINAYAH.AI \u00B7 {total} STAGES \u00B7 SHIP IT \u00B7 2026</p>
        </div>
      </div>
    </div>
  );
}
