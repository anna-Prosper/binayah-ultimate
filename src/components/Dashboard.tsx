"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomSheet from "@/components/ui/BottomSheet";
import { signOut } from "next-auth/react";
import { lsGet, lsSet, checkSchemaVersion, clearAllLsKeys } from "@/lib/storage";
import { EphemeralProvider, useEphemeral } from "@/lib/contexts/EphemeralContext";
import { ModelProvider, useModel } from "@/lib/contexts/ModelContext";
import { mkTheme, THEME_OPTIONS } from "@/lib/themes";
import { pipelineData, type UserType, ADMIN_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { AvatarStep6, FloatingBg } from "@/components/Onboarding";
import WelcomeModal from "@/components/WelcomeModal";
import { ToastContainer, RecoveryToast, useToasts, type ToastItem } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ActivitySkeleton } from "@/components/ui/Skeletons";
import dynamic from "next/dynamic";
import LeftSidebar, { type NavItem, type SidebarPipeline } from "@/components/LeftSidebar";
import SearchPalette from "@/components/SearchPalette";
import { ChromeShell } from "@/components/ChromeShell";
import { MessageSquare, Bell, RotateCcw, Phone } from "lucide-react";
import CallSummaryModal from "@/components/CallSummaryModal";
import PipelinesView from "@/components/views/PipelinesView";
import ArchiveView from "@/components/views/ArchiveView";
import ActivityView from "@/components/views/ActivityView";
import ChatView from "@/components/views/ChatView";
import HomeViewRoute from "@/components/views/HomeViewRoute";
import TeamBar from "@/components/views/TeamBar";
import WhileAwayDigest from "@/components/WhileAwayDigest";
const CreateWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.CreateWorkspaceModal), { ssr: false });
const ManageWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.ManageWorkspaceModal), { ssr: false });
const DocumentsPanel = dynamic(() => import("@/components/DocumentsPanel"), { ssr: false, loading: () => null });
const CallsView = dynamic(() => import("@/components/views/CallsView"), { ssr: false, loading: () => null });
import QuickAddModal from "@/components/QuickAddModal";

// ── Outer wrapper ──────────────────────────────────────────────────────────────
export default function Dashboard({ initialUserId }: { initialUserId?: string }) {
  return (
    <EphemeralProvider>
      <DashboardShell initialUserId={initialUserId} />
    </EphemeralProvider>
  );
}

// ── DashboardShell: theme state + useToasts → ModelProvider ───────────────────
function DashboardShell({ initialUserId }: { initialUserId?: string }) {
  const [isRecovering] = useState(() => {
    if (typeof window === "undefined") return false;
    return !checkSchemaVersion();
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    if (!localStorage.getItem("binayah_themeV2")) return true;
    return lsGet("isDark", true);
  });
  const [themeId, setThemeId] = useState<string>(() => {
    const stored = lsGet<string>("themeId", "warroom");
    if (stored === "engine" || stored === "phosphor") return "matrix"; // migrate retired themes
    return stored;
  });
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => lsGet("currentWorkspaceId", "war-room"));
  const { toasts, showToast, dismissToast } = useToasts();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("binayah_themeV2")) localStorage.setItem("binayah_themeV2", "1");
  }, []);
  useEffect(() => { lsSet("isDark", isDark); }, [isDark]);
  useEffect(() => { lsSet("themeId", themeId); }, [themeId]);
  useEffect(() => { lsSet("currentWorkspaceId", currentWorkspaceId); }, [currentWorkspaceId]);
  useEffect(() => { document.body.style.background = mkTheme(themeId, isDark).bg; }, [isDark, themeId]);

  // Schema version recovery — clear stale cache and reload
  useEffect(() => {
    if (!isRecovering) return;
    clearAllLsKeys();
    const timer = setTimeout(() => window.location.reload(), 2500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = mkTheme(themeId, isDark);
  if (isRecovering) {
    return (
      <div style={{ background: t.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <RecoveryToast t={t} message="// cache cleared — fresh start" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ModelProvider initialUserId={initialUserId} themeId={themeId} isDark={isDark} showToast={showToast} currentWorkspaceId={currentWorkspaceId}>
      <DashboardInner
        initialUserId={initialUserId}
        isDark={isDark} setIsDark={setIsDark}
        themeId={themeId} setThemeId={setThemeId}
        currentWorkspaceId={currentWorkspaceId} setCurrentWorkspaceId={setCurrentWorkspaceId}
        showToast={showToast} toasts={toasts} dismissToast={dismissToast}
      />
    </ModelProvider>
  );
}

// ── DashboardInner: navigation state + Chrome (sidebar, header) + route switch ──
function DashboardInner({
  initialUserId, isDark, setIsDark, themeId, setThemeId,
  currentWorkspaceId, setCurrentWorkspaceId,
  showToast, toasts, dismissToast,
}: {
  initialUserId?: string;
  isDark: boolean; setIsDark: (v: boolean) => void;
  themeId: string; setThemeId: (v: string) => void;
  currentWorkspaceId: string; setCurrentWorkspaceId: (v: string) => void;
  showToast: (msg: string, color: string, durationMs?: number, action?: { label: string; onClick: () => void }) => void;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
}) {
  const { users, setUsers, currentUser, me, claims, reactions, comments, subtasks, assignments, stageStatusOverrides, approvedStages, stageDescOverrides, stageNameOverrides, subtaskStages, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines, workspaces, activityLog, archivedStages, stageImages, chatMessages, hasMoreMessages, chatNotif, setChatNotif, liveNotifs, syncStatus, getStatus, getPoints, sc, ck, allPipelinesGlobal, handleClaim, handleReact, toggleSubtask, renameSubtask, lockSubtask, removeSubtask, archiveStage, setStageDescOverride, setStageNameOverride, setSubtaskStage, assignTask, setStageStatusDirect, cycleStatus, approveStage, addCustomStage, addCustomPipeline, sendChat, handleRemoteMessage, loadMoreMessages, createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace, addStageImage, removeStageImage, isOfficerOfWorkspace, undo, peek, stackLen, t } = useModel();
  const { reactOpen, setReactOpen, copied, setCopied, setClaimAnim } = useEphemeral();

  // Navigation — always start at "home" on each page load (per user request)
  const [activeNavItem, setActiveNavItem] = useState<NavItem>("home");
  const [activeSidebarPipeline, setActiveSidebarPipeline] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban" | "overview">("list");
  const [expanded, setExpanded] = useState<string[]>(() => lsGet("expanded", ["research"]));
  const [expS, setExpS] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState(""); const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true); const [showThemePicker, setShowThemePicker] = useState(false);
  const [selUser, setSelUser] = useState<string | null>(null); const [selAvatar, setSelAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false); const [viewingUser, setViewingUser] = useState<string | null>(null);
  const viewingUserPopupRef = useRef<HTMLDivElement>(null);
  const [showActivity, setShowActivity] = useState(false); const [showChat, setShowChat] = useState(false); const [chatDefaultTab, setChatDefaultTab] = useState<"team" | "ai">("ai");
  const [showDocumentsMobile, setShowDocumentsMobile] = useState(false); const [showPalette, setShowPalette] = useState(false); const [paletteDocId, setPaletteDocId] = useState<string | null>(null);
  const [workspaceModal, setWorkspaceModal] = useState<"create" | "manage" | null>(null);
  const [toast, setToast] = useState<{ text: string; pts: string; color: string } | null>(null); const [ptsFlash, setPtsFlash] = useState(false);
  const [showCallSummary, setShowCallSummary] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [digestLastSession, setDigestLastSession] = useState(0);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => lsGet("lastSeenActivity", 0)); const [showArchive, setShowArchive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => { if (typeof window === "undefined" || !initialUserId) return false; return !localStorage.getItem(`binayah_welcomed_${initialUserId}`); });
  const prevMyPtsRef = useRef(0); const prevApprovedRef = useRef<string[]>([]);
  const isMobile = useIsMobile(768);

  useEffect(() => { lsSet("expanded", expanded); }, [expanded]);
  useEffect(() => { lsSet("view", view); }, [view]);
  useEffect(() => { lsSet("lastSeenActivity", lastSeenActivity); }, [lastSeenActivity]);
  // On first ever visit (lastSeenActivity === 0 and activityLog loaded), mark everything as seen
  // so the badge doesn't show "200+" to a new team member logging in for the first time.
  useEffect(() => {
    if (lastSeenActivity === 0 && activityLog.length > 0) setLastSeenActivity(activityLog.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog.length]);
  useEffect(() => { const t = setTimeout(() => setIsHydrating(false), 3000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (syncStatus !== "hydrating") setIsHydrating(false); }, [syncStatus]);

  // "While you were away" digest: check on mount, heartbeat while active, persist on unmount
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser || activityLog.length === 0) return;
    const lsKey = `binayah_lastSession_${currentUser}`;
    const raw = localStorage.getItem(lsKey);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    const last = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    // Only open digest when we have a *real* prior timestamp AND it's been >12h.
    // First-time-on-this-device users have nothing to summarize — skip silently.
    if (last !== null && Date.now() - last > TWELVE_HOURS) {
      setDigestLastSession(last);
      setShowDigest(true);
    }
    // Heartbeat — write current time every 60s so closing the tab unexpectedly
    // (force quit, crash, Safari ITP) still leaves a recent marker.
    const writeNow = () => { try { localStorage.setItem(lsKey, String(Date.now())); } catch { /* quota */ } };
    writeNow();
    const interval = setInterval(writeNow, 60_000);
    const onBeforeUnload = () => writeNow();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onBeforeUnload);
      writeNow();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowPalette(prev => !prev); }
      if (e.key === "Escape") { setViewingUser(null); setShowThemePicker(false); setReactOpen(null); }
      // Undo: Cmd/Ctrl+Z — don't fire when focus is in an input/textarea
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setReactOpen, undo]);

  // Quick-add shortcut: N key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowQuickAdd(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Click-outside viewingUser
  useEffect(() => {
    if (!viewingUser) return;
    const handler = (e: MouseEvent) => { if (viewingUserPopupRef.current && !viewingUserPopupRef.current.contains(e.target as Node)) setViewingUser(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [viewingUser]);

  // Deep-link
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetPipeline = params.get("pipeline"); const targetStage = params.get("stage");
    if (!targetPipeline && !targetStage) return;
    const all = [...pipelineData, ...customPipelines];
    if (targetPipeline) { const found = all.find(p => p.name === targetPipeline || p.id === targetPipeline); if (found) setExpanded(prev => prev.includes(found.id) ? prev : [...prev, found.id]); }
    if (targetStage) { setExpS(targetStage); setTimeout(() => { const el = document.getElementById(`stage-${CSS.escape(targetStage)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 400); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-expand on search
  useEffect(() => {
    if (!searchQ) return;
    const q = searchQ.toLowerCase();
    const ids = [...pipelineData, ...customPipelines].filter(p => p.name.toLowerCase().includes(q) || p.stages.some(s => s.toLowerCase().includes(q))).map(p => p.id);
    setExpanded(prev => [...new Set([...prev, ...ids])]);
  }, [searchQ, customPipelines]);

  // Points flash
  useEffect(() => {
    if (!currentUser) return;
    const myPts = getPoints(currentUser);
    if (myPts > prevMyPtsRef.current && prevMyPtsRef.current > 0) { setPtsFlash(true); setTimeout(() => setPtsFlash(false), 1800); }
    prevMyPtsRef.current = myPts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageStatusOverrides, claims]);

  // Approval animation
  useEffect(() => {
    if (!currentUser) { prevApprovedRef.current = [...approvedStages]; return; }
    approvedStages.forEach(stage => {
      if (!prevApprovedRef.current.includes(stage) && (claims[stage] || []).includes(currentUser)) {
        setToast({ text: `🎉 ${stage} approved!`, pts: `+10pts earned`, color: t.green });
        setClaimAnim({ stage, pts: 10 });
        setTimeout(() => setClaimAnim(null), 1400);
        setTimeout(() => setToast(null), 3500);
      }
    });
    prevApprovedRef.current = [...approvedStages];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedStages]);

  // sharePipeline uses model state + ephemeral copied
  const sharePipeline = useCallback((pid: string, pname: string, pdesc: string, priority: string, stageList: string[]) => {
    const stageLines = stageList.map(s => `  · ${s}  [${getStatus(s).toUpperCase()}]`).join("\n");
    const owners = [...new Set(stageList.flatMap(s => claims[s] || []))].map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
    const lines = ["Binayah AI  //  Pipeline", "────────────────────────────────", pname, `Priority: ${priority}  ·  ${stageList.length} stages`];
    if (pdesc) { lines.push(""); lines.push(pdesc); }
    lines.push(""); lines.push("Stages:"); lines.push(stageLines);
    if (owners.length) { lines.push(""); lines.push(`Owners: ${owners.join(", ")}`); }
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopied(`pipe-${pid}`); setTimeout(() => setCopied(null), 2000);
  }, [setCopied, getStatus, claims, users]);

  // Claim with animation
  const handleClaimWithAnim = useCallback((sid: string) => {
    const alreadyClaimed = currentUser ? (claims[sid] || []).includes(currentUser) : false;
    handleClaim(sid);
    if (!alreadyClaimed && currentUser) {
      const meUser = users.find(u => u.id === currentUser);
      setClaimAnim({ stage: sid, pts: 10 });
      setToast({ text: `${meUser?.name} owns ${sid}`, pts: `earn +10pts on live`, color: meUser?.color || t.accent });
      setTimeout(() => setClaimAnim(null), 1200); setTimeout(() => setToast(null), 2500);
    }
  }, [handleClaim, claims, currentUser, users, t.accent]);

  // Workspace-scoped pipelines
  const allPipelines = currentWorkspaceId ? (() => { const ws = workspaces.find(w => w.id === currentWorkspaceId); return ws ? allPipelinesGlobal.filter(p => ws.pipelineIds.includes(p.id)) : allPipelinesGlobal; })() : allPipelinesGlobal;

  // Palette callbacks
  const handlePaletteOpenStage = useCallback((pipelineId: string, stageName: string) => {
    setActiveNavItem("pipelines"); setView("list");
    setExpanded(prev => prev.includes(pipelineId) ? prev : [...prev, pipelineId]);
    const p = allPipelines.find(pl => pl.id === pipelineId);
    if (p) { const stages = [...p.stages, ...(customStages[pipelineId] || [])]; const idx = stages.indexOf(stageName); if (idx >= 0) setExpS(`${pipelineId}-${idx}`); setTimeout(() => { const el = document.getElementById(`stage-${CSS.escape(stageName)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPipelines, customStages]);

  const handlePaletteOpenDocument = useCallback((docId: string) => {
    setActiveNavItem("documents"); if (isMobile) setShowDocumentsMobile(true);
    setPaletteDocId(null); requestAnimationFrame(() => setPaletteDocId(docId));
  }, [isMobile]);

  const handlePaletteOpenPerson = useCallback((userId: string) => {
    setViewingUser(userId); setTimeout(() => { const el = document.querySelector(`[data-user-id='${userId}']`) as HTMLElement | null; if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 100);
  }, []);

  const handleDigestDismiss = useCallback(() => {
    if (typeof window !== "undefined" && currentUser) {
      try { localStorage.setItem(`binayah_lastSession_${currentUser}`, String(Date.now())); } catch { /* quota */ }
    }
    setShowDigest(false);
  }, [currentUser]);

  const handleWelcomeDismiss = useCallback(({ avatar, aiAvatar }: { avatar: string | null; aiAvatar: string | null }) => {
    if (initialUserId) { try { localStorage.setItem(`binayah_welcomed_${initialUserId}`, Date.now().toString()); } catch { /* noop */ } }
    if (avatar || aiAvatar) setUsers(prev => prev.map(u => u.id === currentUser ? { ...u, avatar: avatar || u.avatar, aiAvatar: aiAvatar || u.aiAvatar } : u));
    setShowWelcome(false);
  }, [initialUserId, currentUser, setUsers]);

  // Computed
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;
  const myWorkspaces = workspaces.filter(w => currentUser ? w.members.includes(currentUser!) : true);
  const isAdmin = isOfficerOfWorkspace(currentWorkspaceId);
  const allStages = [...pipelineData.flatMap(p => p.stages), ...customPipelines.flatMap(p => p.stages), ...Object.values(customStages).flat()];
  const unseen = activityLog.length - lastSeenActivity;

  const hBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 12px", cursor: "pointer", color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, gap: 4, minHeight: 44 };

  if (isHydrating) {
    return (
      <div style={{ background: t.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>
        <style>{`@keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }`}</style>
        <span style={{ fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.3 }}>
          // connecting to command...<span style={{ animation: "blink 1s step-end infinite" }}>_</span>
        </span>
      </div>
    );
  }
  if (!me) return <div style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 15, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>// session error — please sign out and back in</span></div>;

  const pipelinesViewProps = { view, setView, expanded, setExpanded, expS, setExpS, searchQ, setSearchQ, statusFilter, setStatusFilter, isMobile, currentWorkspaceId, currentWorkspace, isAdmin, showToast, handleClaimWithAnim, sharePipeline, onPipelineClick: (pid: string) => setActiveSidebarPipeline(pid) };

  // Compose sidebar and header nodes for ChromeShell
  const sidebarNode = !isMobile ? (
    <div style={{ position: "sticky", top: 0, height: "100vh", flexShrink: 0, overflowY: "auto" }}>
      <LeftSidebar t={t} activeNav={activeNavItem} onNavChange={(item) => { setActiveNavItem(item); if (item === "activity") { setShowActivity(true); setLastSeenActivity(activityLog.length); } else if (item === "chat") { setShowChat(false); setChatNotif(null); } else { setShowActivity(false); setShowChat(false); } }} pipelines={allPipelines as SidebarPipeline[]} activePipelineId={activeSidebarPipeline} onPipelineSelect={(id) => { setActiveSidebarPipeline(id); setExpanded(prev => prev.includes(id) ? prev : [...prev, id]); setActiveNavItem("pipelines"); }} workspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, memberCount: w.members.length }))} currentWorkspaceId={currentWorkspaceId} onWorkspaceChange={(id) => { setCurrentWorkspaceId(id); setActiveSidebarPipeline(null); }} canCreateWorkspace={!!currentUser && ADMIN_IDS.includes(currentUser!)} onCreateWorkspace={() => setWorkspaceModal("create")} canManageCurrentWorkspace={!!currentWorkspace && !!currentUser && currentWorkspace.members.includes(currentUser!)} onManageCurrentWorkspace={() => setWorkspaceModal("manage")} />
    </div>
  ) : null;

  const headerNode = activeNavItem === "chat" && !isMobile ? null : (
    <div style={{ padding: isMobile ? "12px 12px 0" : (activeNavItem === "home" ? "12px 20px 0" : "24px 20px 0") }}>
      <div className="bu-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        {activeNavItem !== "home" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: -0.3 }}>Binayah AI</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncStatus === "live" ? t.green : syncStatus === "hydrating" ? t.amber : t.red, transition: "all 0.3s" }} title={`sync: ${syncStatus}`} />
              <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{allPipelines.length} pipelines · {allStages.length} stages{syncStatus === "offline" ? " · offline" : ""}</span>
            </div>
          </div>
        )}
        <div className="bu-header-btns" style={{ display: activeNavItem === "home" ? "none" : "flex", alignItems: "stretch", gap: 4 }}>
          {me && (<div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "0 12px", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border} title="Change avatar"><AvatarC user={me} size={28} /><div><div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{me.name}</div><div style={{ fontSize: 11, color: t.accent, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div></div></div>)}
          <button
            onClick={e => { e.stopPropagation(); undo(); }}
            disabled={stackLen === 0}
            title={peek ? `undo: ${peek.label}` : "nothing to undo"}
            style={{ ...hBtn, opacity: stackLen === 0 ? 0.35 : 1, cursor: stackLen === 0 ? "default" : "pointer" }}
          >
            <RotateCcw size={14} strokeWidth={2} />
          </button>
          <button onClick={e => { e.stopPropagation(); setShowCallSummary(true); }} style={{ ...hBtn, fontSize: 15 }} title="Call summary → tasks"><Phone size={15} strokeWidth={1.8} /></button>
          <button onClick={e => { e.stopPropagation(); setActiveNavItem("chat"); setShowChat(false); setChatNotif(null); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} title="Team chat"><MessageSquare size={16} strokeWidth={1.8} />{chatNotif && activeNavItem !== "chat" && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}`, animation: "claimPulse 1s ease infinite" }} />}</button>
          <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} title="Notifications"><Bell size={16} strokeWidth={1.8} />{unseen > 0 && <div style={{ position: "absolute", top: 6, right: 6, minWidth: 14, height: 14, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}</button>
          {isMobile && <button onClick={e => { e.stopPropagation(); setShowDocumentsMobile(true); }} style={{ ...hBtn, fontSize: 15 }} title="Documents">{"📄"}</button>}
          <div style={{ position: "relative", display: "flex", alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 16, gap: 4 }} title="Change theme">{t.icon} <span style={{ fontSize: 10 }}>▾</span></button>
            {showThemePicker && (<div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 8, zIndex: 200, width: "min(220px, calc(100vw - 32px))", boxShadow: `0 12px 40px rgba(0,0,0,0.5)`, animation: "fadeIn 0.15s ease" }}>{THEME_OPTIONS.map(opt => (<div key={opt.id} onClick={() => { setThemeId(opt.id); setShowThemePicker(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 12, cursor: "pointer", background: themeId === opt.id ? opt.color + "18" : "transparent", transition: "all 0.15s" }}><span style={{ fontSize: 20 }}>{opt.icon}</span><div><div style={{ fontSize: 13, fontWeight: 700, color: themeId === opt.id ? opt.color : t.text }}>{opt.name}</div><div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.3 }}>{opt.desc}</div></div>{themeId === opt.id && <span style={{ marginLeft: "auto", fontSize: 13, color: opt.color }}>✓</span>}</div>))}<div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "center" }}><button onClick={() => setIsDark(!isDark)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 16px", cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{isDark ? "☀️ light mode" : "🌚 dark mode"}</button></div></div>)}
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn }}>sign out</button>
        </div>
      </div>
      {/* TEAM BAR */}
      {activeNavItem !== "home" && <TeamBar ptsFlash={ptsFlash} viewingUser={viewingUser} setViewingUser={setViewingUser} currentWorkspaceId={currentWorkspaceId} onAvatarClick={(uid, avatar) => { setSelUser(uid); setSelAvatar(avatar); setShowAvatarPicker(true); }} />}
    </div>
  );

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "var(--font-dm-sans), sans-serif" }} onClick={() => { setShowThemePicker(false); setReactOpen(null); setViewingUser(null); setShowArchive(false); setShowChat(false); setShowActivity(false); }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes ptsCount{0%{transform:scale(1)}30%{transform:scale(1.5);color:#ffcc00}70%{transform:scale(1.2)}100%{transform:scale(1)}}*{box-sizing:border-box;}@media(max-width:768px){.bu-header{flex-wrap:wrap!important;gap:8px!important}.bu-header-btns{flex-wrap:wrap!important;gap:4px!important}.bu-pipe-right{display:none!important}.bu-search-row{flex-direction:column!important;gap:6px!important}.bu-view-toggle{justify-content:stretch!important}}@media(max-width:640px){.bu-team{overflow-x:auto!important;flex-wrap:nowrap!important;padding:8px 12px!important;gap:12px!important;-webkit-overflow-scrolling:touch}.bu-header{flex-direction:column!important;gap:8px!important}}@keyframes bottomSheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes fabPulse{0%,100%{box-shadow:0 4px 24px ${t.accent}55,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 4px 32px ${t.accent}88,0 2px 12px rgba(0,0,0,0.4)}}`}</style>

      <ChromeShell
        sidebar={sidebarNode}
        header={headerNode}
        outerStyle={{ minHeight: "100vh" }}
        contentStyle={{ padding: isMobile ? "0 12px 16px" : "0 20px 24px" }}
      >
        {activeNavItem === "chat" && !isMobile ? (
          <ChatView showToast={showToast} currentWorkspaceId={currentWorkspaceId} fullScreen defaultTab="team" />
        ) : (
          <>
            {isMobile && (<BottomSheet open={showActivity} onClose={() => setShowActivity(false)} title="// activity feed" t={t}><ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}><Suspense fallback={<ActivitySkeleton t={t} />}><ActivityView showToast={showToast} /></Suspense></ErrorBoundary></BottomSheet>)}
            {!isMobile && activeNavItem === "documents" && (<ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}><Suspense fallback={null}><div style={{ marginTop: 16, height: "calc(100vh - 80px)" }}><DocumentsPanel t={t} initialDocId={paletteDocId} /></div></Suspense></ErrorBoundary>)}
            {!isMobile && activeNavItem === "activity" && <ActivityView showToast={showToast} />}
            {!isMobile && activeNavItem === "home" && me && (
              <HomeViewRoute showToast={showToast} currentWorkspaceId={currentWorkspaceId} setCurrentWorkspaceId={setCurrentWorkspaceId} setActiveSidebarPipeline={setActiveSidebarPipeline} setActiveNavItem={setActiveNavItem} viewingUser={viewingUser} setViewingUser={setViewingUser} showActivity={showActivity} setShowActivity={setShowActivity} setLastSeenActivity={setLastSeenActivity} showThemePicker={showThemePicker} setShowThemePicker={setShowThemePicker} selUser={selUser} setSelUser={setSelUser} selAvatar={selAvatar} setSelAvatar={setSelAvatar} setShowAvatarPicker={setShowAvatarPicker} handleClaimWithAnim={handleClaimWithAnim} unseen={unseen} themeId={themeId} isDark={isDark} setThemeId={setThemeId} setIsDark={setIsDark} />
            )}
            {(isMobile || activeNavItem === "pipelines") && <PipelinesView {...pipelinesViewProps} />}
            {!isMobile && activeNavItem === "calls" && <CallsView t={t} />}

            {/* Toasts */}
            {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.color === t.green ? `linear-gradient(135deg,${t.bgCard},${t.green}18)` : t.bgCard, border: `1.5px solid ${toast.color}55`, borderRadius: 16, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 8px 40px rgba(0,0,0,0.5)`, animation: "slideUp 0.3s ease", zIndex: 100, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}><span style={{ fontSize: toast.color === t.green ? 20 : 13 }}>{toast.color === t.green ? "⚡" : "💀"}</span><span style={{ fontSize: 13, color: toast.color === t.green ? toast.color : t.text, fontWeight: 800 }}>{toast.text}</span><span style={{ fontSize: 13, color: t.textSec, fontWeight: 700 }}>{toast.pts}</span></div>}
            {chatNotif && (<div style={{ position: "fixed", bottom: 80, right: 16, maxWidth: "min(300px, calc(100vw - 32px))", background: t.bgCard, border: `1px solid ${chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent}44`, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8, boxShadow: t.shadowLg, animation: "slideUp 0.25s ease", zIndex: 600, fontFamily: "var(--font-dm-mono), monospace" }}><span style={{ fontSize: 16, flexShrink: 0 }}>{chatNotif.isClaim ? "🤝" : chatNotif.isReaction ? "⚡" : chatNotif.isComment ? "💬" : "👀"}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 800, color: chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent, marginBottom: 4 }}>{chatNotif.name}</div><div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, wordBreak: "break-word" }}>{chatNotif.text.length > 80 ? chatNotif.text.slice(0, 80) + "…" : chatNotif.text}</div>{chatNotif.isComment && chatNotif.stage && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>on {chatNotif.stage}</div>}</div><button onClick={() => setChatNotif(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textDim, fontSize: 15, padding: 0, marginLeft: 4 }}>×</button></div>)}
          </>
        )}
      </ChromeShell>

      {/* WORKSPACE MODALS */}
      {workspaceModal === "create" && <Suspense fallback={null}><CreateWorkspaceModal t={t} users={users} ck={ck} onClose={() => setWorkspaceModal(null)} onCreate={(name, icon, colorKey) => createWorkspace(name, icon, colorKey)} /></Suspense>}
      {workspaceModal === "manage" && currentWorkspace && currentUser && <Suspense fallback={null}><ManageWorkspaceModal t={t} users={users} ck={ck} workspace={currentWorkspace} currentUser={currentUser!} onClose={() => setWorkspaceModal(null)} onAddMember={(uid) => addMemberToWorkspace(currentWorkspace.id, uid)} onRemoveMember={(uid) => removeMemberFromWorkspace(currentWorkspace.id, uid)} onSetRank={(uid, rank) => setMemberRank(currentWorkspace.id, uid, rank)} onDelete={() => deleteWorkspace(currentWorkspace.id)} /></Suspense>}

      {/* AVATAR PICKER */}
      {showAvatarPicker && selUser && (() => { const pickerUser = users.find(u => u.id === selUser); if (!pickerUser) return null; const AnimBg = () => <FloatingBg colors={[pickerUser.color, pickerUser.color + "88", t.accent + "44", pickerUser.color + "44"]} themeStyle={themeId} />; return <AvatarStep6 t={t} user={pickerUser as UserType} selAvatar={selAvatar} setSelAvatar={setSelAvatar} users={users} setUsers={setUsers} setCurrentUser={() => {}} setOnboardStep={() => {}} selUser={selUser} AnimBg={AnimBg} onClose={() => setShowAvatarPicker(false)} onConfirm={() => setShowAvatarPicker(false)} />; })()}

      {/* Mobile overlays */}
      {isMobile && (<BottomSheet open={showDocumentsMobile} onClose={() => setShowDocumentsMobile(false)} title="// documents" t={t}><ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}><Suspense fallback={null}><DocumentsPanel t={t} initialDocId={paletteDocId} /></Suspense></ErrorBoundary></BottomSheet>)}
      {isMobile ? (<BottomSheet open={showChat} onClose={() => setShowChat(false)} title="// team chat" t={t}><ChatView showToast={showToast} currentWorkspaceId={currentWorkspaceId} defaultTab={chatDefaultTab} /></BottomSheet>) : showChat ? (<div style={{ position: "fixed", bottom: 160, right: 16, width: "min(340px, calc(100vw - 32px))", zIndex: 500, animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()}><div style={{ position: "relative" }}><button onClick={() => setShowChat(false)} style={{ position: "absolute", top: 10, right: 12, zIndex: 10, background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: t.textMuted, padding: 0 }}>×</button><ChatView showToast={showToast} currentWorkspaceId={currentWorkspaceId} defaultTab={chatDefaultTab} /></div></div>) : null}

      {/* FABs */}
      <button onClick={e => { e.stopPropagation(); setChatDefaultTab("team"); setShowChat(true); setChatNotif(null); }} title="Team chat" style={{ position: "fixed", bottom: 88, right: 24, zIndex: 600, width: 48, height: 48, borderRadius: "50%", background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: `0 2px 12px rgba(0,0,0,0.25)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 } as React.CSSProperties}>💬{chatNotif && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}` }} />}</button>
      <button onClick={e => { e.stopPropagation(); setChatDefaultTab("ai"); setShowChat(prev => !prev); }} title={showChat && chatDefaultTab === "ai" ? "Close" : "Ask Binayah AI"} style={{ position: "fixed", bottom: 24, right: 24, zIndex: 600, width: 54, height: 54, borderRadius: "50%", background: (showChat && chatDefaultTab === "ai") ? t.surface : `linear-gradient(135deg, ${t.accent}, ${t.purple || t.accent})`, border: `1px solid ${(showChat && chatDefaultTab === "ai") ? t.border : "transparent"}`, boxShadow: (showChat && chatDefaultTab === "ai") ? "none" : `0 4px 24px ${t.accent}55`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: (showChat && chatDefaultTab === "ai") ? 20 : 22, transform: (showChat && chatDefaultTab === "ai") ? "scale(0.9) rotate(90deg)" : "scale(1)", animation: (showChat && chatDefaultTab === "ai") ? "none" : "fabPulse 3s ease-in-out infinite" }}>
        {(showChat && chatDefaultTab === "ai") ? "×" : "🤖"}
      </button>

      {/* Archive FAB + panel — bottom-left, away from chat FABs on the right.
          Only operators (or root) see this. */}
      {!isMobile && currentUser && (ADMIN_IDS.includes(currentUser) || workspaces.some(w => w.captains.includes(currentUser))) && (<button onClick={e => { e.stopPropagation(); setShowArchive(v => !v); }} title="Archive" style={{ position: "fixed", bottom: 28, left: 28, width: 44, height: 44, borderRadius: "50%", background: showArchive ? t.amber + "22" : t.bgCard, border: `2px solid ${showArchive ? t.amber : t.border}`, color: showArchive ? t.amber : t.textMuted, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", zIndex: 500 }}>📦</button>)}
      {showArchive && (<div onClick={e => e.stopPropagation()} style={{ position: "fixed", bottom: 80, left: 28, width: 340, maxHeight: "60vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 499, padding: 16 }}><ArchiveView /></div>)}

      {/* Activity (notification bell) panel — desktop only; mobile uses BottomSheet */}
      {!isMobile && showActivity && activeNavItem !== "activity" && (
        <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: 70, right: 16, width: 360, maxHeight: "70vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 499 }}>
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<ActivitySkeleton t={t} />}>
              <ActivityView showToast={showToast} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Search Palette */}
      <SearchPalette t={t} open={showPalette} onClose={() => setShowPalette(false)} onOpenStage={handlePaletteOpenStage} onOpenDocument={handlePaletteOpenDocument} onOpenPerson={handlePaletteOpenPerson} />

      {/* Welcome Modal */}
      {showWelcome && initialUserId && me && (<WelcomeModal user={me} t={t} themeId={themeId} setThemeId={setThemeId} isDark={isDark} setIsDark={setIsDark} onDismiss={handleWelcomeDismiss} />)}

      <CallSummaryModal
        open={showCallSummary}
        onClose={() => setShowCallSummary(false)}
        t={t}
        pipelines={allPipelinesGlobal.map(p => ({
          id: p.id,
          name: p.name,
          icon: p.icon,
          stages: [...p.stages, ...(customStages[p.id] ?? [])],
        }))}
        onAddTask={(pipelineId, stageName) => {
          addCustomStage(pipelineId, stageName);
          showToast(`// stage added to pipeline`, t.green);
        }}
      />

      <QuickAddModal
        open={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        t={t}
        pipelines={allPipelines.map(p => ({ id: p.id, name: p.name, icon: p.icon }))}
        onAdd={(pid, title) => { addCustomStage(pid, title); showToast(`// ${title} added`, t.green); }}
      />

      {/* While You Were Away Digest */}
      {showDigest && currentUser && me && !showWelcome && (
        <WhileAwayDigest
          t={t}
          currentUser={currentUser}
          users={users}
          activityLog={activityLog}
          claims={claims}
          lastSession={digestLastSession}
          onDismiss={handleDigestDismiss}
        />
      )}

      {/* Toast stack */}
      <ToastContainer t={t} toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
