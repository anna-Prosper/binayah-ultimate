"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/constants";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomSheet from "@/components/ui/BottomSheet";
import { signOut } from "next-auth/react";
import { lsGet, lsSet, checkSchemaVersion, clearAllLsKeys } from "@/lib/storage";
import { EphemeralProvider, useEphemeral } from "@/lib/contexts/EphemeralContext";
import { ModelProvider, useModel } from "@/lib/contexts/ModelContext";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { AppShellProvider, type AppShellContextValue } from "@/lib/contexts/AppShellContext";
import { mkTheme, THEME_OPTIONS } from "@/lib/themes";
import { type UserType, ADMIN_IDS, EXEC_IDS, DEFAULT_WORKSPACE_ID } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { ToastContainer, RecoveryToast, useToasts, type ToastItem } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ActivitySkeleton } from "@/components/ui/Skeletons";
import { TooltipPortal } from "@/components/ui/TooltipPortal";
import dynamic from "next/dynamic";
import LeftSidebar, { type NavItem, navItemFromPathname } from "@/components/LeftSidebar";
import { ChromeShell } from "@/components/ChromeShell";
import { MessageSquare, Bell, RotateCcw, Bot, Zap, Handshake, Eye, X, Settings as SettingsIcon, Home, ListTodo, Bug, Table2, Link2, FileText, StickyNote, Target } from "lucide-react";
const AvatarStep6 = dynamic(() => import("@/components/Onboarding").then(m => m.AvatarStep6), { ssr: false, loading: () => null });
const FloatingBg = dynamic(() => import("@/components/Onboarding").then(m => m.FloatingBg), { ssr: false, loading: () => null });
const WelcomeModal = dynamic(() => import("@/components/WelcomeModal"), { ssr: false, loading: () => null });
const SettingsView = dynamic(() => import("@/components/views/SettingsView"), { ssr: false, loading: () => null });
const CallSummaryModal = dynamic(() => import("@/components/CallSummaryModal"), { ssr: false, loading: () => null });
const ArchiveView = dynamic(() => import("@/components/views/ArchiveView"), { ssr: false, loading: () => null });
const ActivityView = dynamic(() => import("@/components/views/ActivityView"), { ssr: false, loading: () => null });
const ChatView = dynamic(() => import("@/components/views/ChatView"), { ssr: false, loading: () => null });
const WhileAwayDigest = dynamic(() => import("@/components/WhileAwayDigest"), { ssr: false, loading: () => null });
const TeamBar = dynamic(() => import("@/components/views/TeamBar"), { ssr: false, loading: () => null });
const CreateWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.CreateWorkspaceModal), { ssr: false });
const ManageWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.ManageWorkspaceModal), { ssr: false });
const DocumentsPanel = dynamic(() => import("@/components/DocumentsPanel"), { ssr: false, loading: () => null });
const SearchPalette = dynamic(() => import("@/components/SearchPalette"), { ssr: false, loading: () => null });
const QuickAddModal = dynamic(() => import("@/components/QuickAddModal"), { ssr: false, loading: () => null });

/**
 * AppShell — the persistent chrome around all (app)/* route pages.
 *
 * Replaces the legacy Dashboard.tsx single-page-app. Mounts the
 * EphemeralProvider + ModelProvider, renders the sidebar/header/FABs/modals,
 * and wraps {children} so each route renders its own view inside the shell.
 *
 * Active nav state is derived from usePathname() — no more activeNavItem
 * useState. Navigation goes through <Link>/router.push() so browser
 * back/forward and refresh-keeps-place all work.
 */
export default function AppShell({
  initialUserId,
  children,
}: {
  initialUserId?: string;
  children: React.ReactNode;
}) {
  return (
    <EphemeralProvider>
      <ShellWithTheme initialUserId={initialUserId}>{children}</ShellWithTheme>
    </EphemeralProvider>
  );
}

// ── Theme + toasts + ModelProvider ────────────────────────────────────────────
function ShellWithTheme({ initialUserId, children }: { initialUserId?: string; children: React.ReactNode }) {
  const [isRecovering] = useState(() => {
    if (typeof window === "undefined") return false;
    return !checkSchemaVersion();
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    if (!localStorage.getItem("binayah_themeV2")) return false;
    return lsGet("isDark", false);
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
      <ShellInner
        initialUserId={initialUserId}
        isDark={isDark} setIsDark={setIsDark}
        themeId={themeId} setThemeId={setThemeId}
        currentWorkspaceId={currentWorkspaceId} setCurrentWorkspaceId={setCurrentWorkspaceId}
        showToast={showToast} toasts={toasts} dismissToast={dismissToast}
      >
        {children}
      </ShellInner>
    </ModelProvider>
  );
}

// ── Chrome (sidebar, header, FABs, modals) + AppShellProvider ─────────────────
function ShellInner({
  initialUserId, isDark, setIsDark, themeId, setThemeId,
  currentWorkspaceId, setCurrentWorkspaceId,
  showToast, toasts, dismissToast,
  children,
}: {
  initialUserId?: string;
  isDark: boolean; setIsDark: (v: boolean) => void;
  themeId: string; setThemeId: (v: string) => void;
  currentWorkspaceId: string; setCurrentWorkspaceId: (v: string) => void;
  showToast: (msg: string, color: string, durationMs?: number, action?: { label: string; onClick: () => void }) => void;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const activeNavItem: NavItem = navItemFromPathname(pathname);

  const { users, setUsers, currentUser, me, claims, approvedStages, customStages, workspaces, activityLog, chatNotif, setChatNotif, syncStatus, getPoints, ck, allPipelinesGlobal, archivedPipelines, handleClaim, addCustomStage, createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace, updateWorkspaceHiddenTabs, undo, peek, stackLen, t } = useModel();
  const { setReactOpen, setClaimAnim } = useEphemeral();

  // Hover/UI state — no more activeNavItem; that lives in the URL
  const [isHydrating, setIsHydrating] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selUser, setSelUser] = useState<string | null>(null);
  const [selAvatar, setSelAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const viewingUserPopupRef = useRef<HTMLDivElement>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatDefaultTab, setChatDefaultTab] = useState<"team" | "dm" | "ai">("ai");
  const [dmDefaultUser, setDmDefaultUser] = useState<string>("");
  const [chatSize, setChatSize] = useState(() => lsGet("chatSize", { width: 360, height: 420 }));
  const [showDocumentsMobile, setShowDocumentsMobile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteDocId, setPaletteDocId] = useState<string | null>(null);
  const [workspaceModal, setWorkspaceModal] = useState<"create" | "manage" | null>(null);
  const [ptsFlash, setPtsFlash] = useState(false);
  const [showCallSummary, setShowCallSummary] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [digestLastSession, setDigestLastSession] = useState(0);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => lsGet("lastSeenActivity", 0));
  const [showArchive, setShowArchive] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => { if (typeof window === "undefined" || !initialUserId) return false; return !localStorage.getItem(`binayah_welcomed_${initialUserId}`); });
  const prevMyPtsRef = useRef(0);
  const prevApprovedRef = useRef<string[]>([]);
  const approvalToastReadyRef = useRef(false);
  const isMobile = useIsMobile(768);

  // Refs for reading current overlay state inside the keyboard handler closure (which has [] deps)
  const showSettingsRef = useRef(showSettings);
  const showActivityRef = useRef(showActivity);
  const showChatRef = useRef(showChat);
  const showThemePickerRef = useRef(showThemePicker);
  const viewingUserRef = useRef(viewingUser);
  // Keep refs in sync with state on every render
  showSettingsRef.current = showSettings;
  showActivityRef.current = showActivity;
  showChatRef.current = showChat;
  showThemePickerRef.current = showThemePicker;
  viewingUserRef.current = viewingUser;

  useEffect(() => { lsSet("lastSeenActivity", lastSeenActivity); }, [lastSeenActivity]);
  // On first ever visit, mark everything as seen so the badge doesn't show "200+" to a brand-new user.
  useEffect(() => {
    if (lastSeenActivity === 0 && activityLog.length > 0) setLastSeenActivity(activityLog.length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityLog.length]);
  useEffect(() => { const t = setTimeout(() => setIsHydrating(false), 3000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (syncStatus !== "hydrating") setIsHydrating(false); }, [syncStatus]);
  // Only surface the "not saved" banner when a save has been failing for a few
  // seconds — a transient 409 (normal optimistic contention) recovers well within
  // that window and shouldn't flash an alarming banner. A persistent offline state
  // means a real problem the user should see.
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  useEffect(() => {
    if (syncStatus === "offline") {
      const timer = setTimeout(() => setShowSyncBanner(true), 4000);
      return () => clearTimeout(timer);
    }
    setShowSyncBanner(false);
  }, [syncStatus]);
  useEffect(() => { lsSet("chatSize", chatSize); }, [chatSize]);

  // "While you were away" digest
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser || activityLog.length === 0) return;
    const lsKey = `binayah_lastSession_${currentUser}`;
    const raw = localStorage.getItem(lsKey);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    const last = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    const TWELVE_HOURS = 12 * 60 * 60 * 1000;
    if (last !== null && Date.now() - last > TWELVE_HOURS) {
      setDigestLastSession(last);
      setShowDigest(true);
    }
    const writeNow = () => { try { localStorage.setItem(lsKey, String(Date.now())); } catch { /* quota */ } };
    writeNow();
    const interval = setInterval(writeNow, HEARTBEAT_INTERVAL_MS);
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
      if (e.key === "Escape") {
        if (showSettingsRef.current) { setShowSettings(false); return; }
        if (showActivityRef.current) { setShowActivity(false); return; }
        if (showChatRef.current) { setShowChat(false); return; }
        if (showThemePickerRef.current) { setShowThemePicker(false); return; }
        if (viewingUserRef.current) { setViewingUser(null); return; }
        setReactOpen(null);
      }
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

  // Points flash
  useEffect(() => {
    if (!currentUser) return;
    const myPts = getPoints(currentUser);
    if (myPts > prevMyPtsRef.current && prevMyPtsRef.current > 0) { setPtsFlash(true); setTimeout(() => setPtsFlash(false), 1800); }
    prevMyPtsRef.current = myPts;
  }, [approvedStages, claims, currentUser, getPoints]);

  // Approval animation
  useEffect(() => {
    if (!currentUser) {
      approvalToastReadyRef.current = false;
      prevApprovedRef.current = [...approvedStages];
      return;
    }
    if (!approvalToastReadyRef.current) {
      approvalToastReadyRef.current = true;
      prevApprovedRef.current = [...approvedStages];
      return;
    }
    approvedStages.forEach(stage => {
      if (!prevApprovedRef.current.includes(stage) && (claims[stage] || []).includes(currentUser)) {
        showToast(`// ${stage} approved · +10pts earned`, t.green, 3500);
        setClaimAnim({ stage, pts: 10 });
        setTimeout(() => setClaimAnim(null), 1400);
      }
    });
    prevApprovedRef.current = [...approvedStages];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedStages]);

  // sharePipeline (kept here in case future pages need to share — currently unused at shell level)
  // const sharePipeline ... (lives in PipelinesView via its own props from the page)

  // Claim with animation
  const handleClaimWithAnim = useCallback((sid: string) => {
    const alreadyClaimed = currentUser ? (claims[sid] || []).includes(currentUser) : false;
    handleClaim(sid);
    if (!alreadyClaimed && currentUser) {
      const meUser = users.find(u => u.id === currentUser);
      setClaimAnim({ stage: sid, pts: 10 });
      showToast(`// ${meUser?.name} owns ${sid} · +10pts on live`, meUser?.color || t.accent, 2500);
      setTimeout(() => setClaimAnim(null), 1200);
    }
  }, [handleClaim, claims, currentUser, users, t.accent, setClaimAnim, showToast]);

  const openDm = useCallback((userId: string) => {
    setDmDefaultUser(userId);
    setChatDefaultTab("dm");
    setShowChat(true);
  }, []);

  // Palette callbacks — navigation now goes via router.push
  const handlePaletteOpenStage = useCallback((pipelineId: string, stageName: string) => {
    router.push(`/pipelines?expand=${encodeURIComponent(pipelineId)}&stage=${encodeURIComponent(stageName)}`);
    setTimeout(() => { const el = document.getElementById(`stage-${CSS.escape(stageName)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 400);
  }, [router]);

  const handlePaletteOpenDocument = useCallback((docId: string) => {
    router.push("/documents");
    if (isMobile) setShowDocumentsMobile(true);
    setPaletteDocId(null); requestAnimationFrame(() => setPaletteDocId(docId));
  }, [router, isMobile]);

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
  const isExec = !!currentUser && EXEC_IDS.includes(currentUser);
  const activePipelinesGlobal = useMemo(
    () => allPipelinesGlobal.filter(p => !(archivedPipelines || []).includes(p.id)),
    [allPipelinesGlobal, archivedPipelines],
  );
  const allPipelines = useMemo(() => {
    if (!currentWorkspaceId) return activePipelinesGlobal;
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    return ws ? activePipelinesGlobal.filter(p => ws.pipelineIds.includes(p.id)) : activePipelinesGlobal;
  }, [activePipelinesGlobal, currentWorkspaceId, workspaces]);
  const binayahAiWorkspace = useMemo(
    () => workspaces.find(w => w.id === DEFAULT_WORKSPACE_ID),
    [workspaces],
  );
  const canSeeCalls = !!currentUser && (isExec || !!binayahAiWorkspace?.members.includes(currentUser));
  const isRoot = !!currentUser && ADMIN_IDS.includes(currentUser);
  const myWorkspaces = useMemo(
    () => workspaces.filter(w => currentUser ? (isRoot || isExec || w.members.includes(currentUser)) : true),
    [currentUser, isRoot, isExec, workspaces],
  );

  // If user lands on /calls without permission, bounce home
  useEffect(() => {
    if (!canSeeCalls && activeNavItem === "calls") router.replace("/");
  }, [activeNavItem, canSeeCalls, router]);

  // Auto-select first available workspace if current selection isn't one the user belongs to
  useEffect(() => {
    if (myWorkspaces.length > 0 && !myWorkspaces.find(w => w.id === currentWorkspaceId)) {
      setCurrentWorkspaceId(myWorkspaces[0].id);
    }
  }, [myWorkspaces, currentWorkspaceId, setCurrentWorkspaceId]);

  const currentWorkspace = useMemo(
    () => myWorkspaces.find(w => w.id === currentWorkspaceId) || null,
    [currentWorkspaceId, myWorkspaces],
  );
  // const isAdmin = isOfficerOfWorkspace(currentWorkspaceId);  // moved to PipelinesView page
  // Workspace-scoped stage count — uses allPipelines (already filtered to currentWorkspace)
  const allStages = useMemo(
    () => allPipelines.flatMap(p => [...p.stages, ...(customStages[p.id] || [])]),
    [allPipelines, customStages],
  );
  // Bell badge now reflects the role-aware notifications panel: count of
  // action-required items + count of unread updates. The legacy `unseen`
  // (raw activityLog length minus lastSeenActivity) drove a number that
  // didn't match what the panel showed — see useNotifications for the
  // authoritative tally.
  const { totalAttentionCount } = useNotifications();
  const unseen = totalAttentionCount;

  const hBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 12px", cursor: "pointer", color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" as const, gap: 4, minHeight: 44 };

  // Build context value for downstream pages — memoized so rendering pages
  // don't re-render unnecessarily on every shell tick.
  const shellContextValue: AppShellContextValue = useMemo(() => ({
    showToast,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    viewingUser, setViewingUser,
    selUser, setSelUser,
    selAvatar, setSelAvatar,
    setShowAvatarPicker,
    showActivity, setShowActivity,
    setLastSeenActivity,
    unseen,
    showThemePicker, setShowThemePicker,
    themeId, setThemeId,
    isDark, setIsDark,
    handleClaimWithAnim,
    paletteDocId,
    openDm,
  }), [
    showToast, currentWorkspaceId, setCurrentWorkspaceId,
    viewingUser, selUser, selAvatar,
    showActivity, unseen,
    showThemePicker, themeId, isDark,
    handleClaimWithAnim, paletteDocId,
    setIsDark, setThemeId,
    openDm,
  ]);

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

  // Compose sidebar — Links handle navigation; onNavClick fires side effects.
  const sidebarNode = !isMobile ? (
    <div style={{ position: "sticky", top: 0, height: "100vh", flexShrink: 0, overflowY: "auto" }}>
      <LeftSidebar
        t={t}
        onNavClick={(item) => {
          if (item === "activity") { setShowActivity(true); setLastSeenActivity(activityLog.length); }
          else if (item === "chat") { setShowChat(false); setChatNotif(null); }
          else { setShowActivity(false); setShowChat(false); }
        }}
        workspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, memberCount: w.members.length, callsLabel: w.callsLabel }))}
        currentWorkspaceId={currentWorkspaceId}
        onWorkspaceChange={(id) => { setCurrentWorkspaceId(id); }}
        canCreateWorkspace={!!currentUser && ADMIN_IDS.includes(currentUser!)}
        onCreateWorkspace={() => setWorkspaceModal("create")}
        canManageCurrentWorkspace={!!currentWorkspace && !!currentUser && currentWorkspace.members.includes(currentUser!)}
        onManageCurrentWorkspace={() => setWorkspaceModal("manage")}
        hiddenNavItems={[
          ...(canSeeCalls ? [] : ["calls" as NavItem]),
          ...((currentWorkspace?.hiddenTabs ?? []) as NavItem[]),
          // Marketing tabs live only inside the Marketing Hub workspace.
          ...(currentWorkspaceId === "marketing" ? [] : (["campaigns", "content-calendar"] as NavItem[])),
        ]}
      />
    </div>
  ) : null;

  const headerNode = activeNavItem === "chat" && !isMobile ? null : (
    <div style={{ padding: isMobile ? "12px 12px 0" : (activeNavItem === "home" ? "12px 20px 0" : "24px 20px 0") }}>
      <div className="bu-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        {activeNavItem !== "home" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "inline-flex", alignItems: "center", color: t.accent }}><Bot size={20} /></span>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: -0.3 }}>{currentWorkspace?.name ?? "Binayah AI"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncStatus === "live" ? t.green : syncStatus === "hydrating" ? t.amber : t.red, transition: "all 0.3s" }} data-tooltip={`sync: ${syncStatus}`} />
              <span style={{ fontSize: 12, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{allPipelines.length} pipelines · {allStages.length} stages{syncStatus === "offline" ? " · offline" : ""}</span>
            </div>
          </div>
        )}
        <div className="bu-header-btns" style={{ display: activeNavItem === "home" ? "none" : "flex", alignItems: "stretch", gap: 4 }}>
          {me && (<div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "0 12px", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border} data-tooltip="Change avatar"><AvatarC user={me} size={28} /><div><div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{me.name}</div><div style={{ fontSize: 12, color: t.accent, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div></div></div>)}
          <button
            onClick={e => { e.stopPropagation(); undo(); }}
            disabled={stackLen === 0}
            data-tooltip={peek ? `undo: ${peek.label}` : "nothing to undo"}
            style={{ ...hBtn, opacity: stackLen === 0 ? 0.35 : 1, cursor: stackLen === 0 ? "default" : "pointer" }}
          >
            <RotateCcw size={14} strokeWidth={2} />
          </button>
          <button onClick={e => { e.stopPropagation(); setChatDefaultTab("team"); setShowChat(!showChat); setChatNotif(null); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} data-tooltip="Team chat"><MessageSquare size={16} strokeWidth={1.8} />{chatNotif && !showChat && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}`, animation: "claimPulse 1s ease infinite" }} />}</button>
          <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} data-tooltip="Notifications"><Bell size={16} strokeWidth={1.8} />{unseen > 0 && <div style={{ position: "absolute", top: 6, right: 6, minWidth: 14, height: 14, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}</button>
          <button onClick={e => { e.stopPropagation(); setShowSettings(v => !v); }} style={{ ...hBtn, fontSize: 15 }} data-tooltip="Notification settings"><SettingsIcon size={16} strokeWidth={1.8} /></button>
          {isMobile && <button onClick={e => { e.stopPropagation(); setShowDocumentsMobile(true); }} style={{ ...hBtn, fontSize: 15 }} data-tooltip="Documents">{"📄"}</button>}
          <div style={{ position: "relative", display: "flex", alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 16, gap: 4 }} data-tooltip="Change theme">{t.icon} <span style={{ fontSize: 11 }}>▾</span></button>
            {showThemePicker && (<div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 8, zIndex: 200, width: "min(220px, calc(100vw - 32px))", boxShadow: `0 12px 40px rgba(0,0,0,0.5)`, animation: "fadeIn 0.15s ease" }}>{THEME_OPTIONS.map(opt => (<div key={opt.id} onClick={() => { setThemeId(opt.id); setShowThemePicker(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 12, cursor: "pointer", background: themeId === opt.id ? opt.color + "18" : "transparent", transition: "all 0.15s" }}><span style={{ fontSize: 20 }}>{opt.icon}</span><div><div style={{ fontSize: 13, fontWeight: 700, color: themeId === opt.id ? opt.color : t.text }}>{opt.name}</div><div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.3 }}>{opt.desc}</div></div>{themeId === opt.id && <span style={{ marginLeft: "auto", fontSize: 13, color: opt.color }}>✓</span>}</div>))}<div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "center" }}><button onClick={() => setIsDark(!isDark)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 16px", cursor: "pointer", fontSize: 12, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{isDark ? "☀️ light mode" : "🌚 dark mode"}</button></div></div>)}
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn }}>sign out</button>
        </div>
      </div>
      {/* TEAM BAR */}
      {activeNavItem !== "home" && <TeamBar ptsFlash={ptsFlash} viewingUser={viewingUser} setViewingUser={setViewingUser} currentWorkspaceId={currentWorkspaceId} onAvatarClick={(uid, avatar) => { setSelUser(uid); setSelAvatar(avatar); setShowAvatarPicker(true); }} />}
    </div>
  );

  const mobileNavItems = ([
    { id: "home", label: "Home", icon: <Home size={17} strokeWidth={1.9} />, action: () => router.push("/") },
    { id: "my-tasks", label: "Tasks", icon: <ListTodo size={17} strokeWidth={1.9} />, action: () => router.push("/my-tasks") },
    { id: "pipelines", label: "Pipes", icon: <Zap size={17} strokeWidth={1.9} />, action: () => router.push("/pipelines") },
    { id: "documents", label: "Docs", icon: <FileText size={17} strokeWidth={1.9} />, action: () => { router.push("/documents"); setShowDocumentsMobile(true); } },
    { id: "notes", label: "Notes", icon: <StickyNote size={17} strokeWidth={1.9} />, action: () => router.push("/notes") },
    { id: "bugs", label: "Bugs", icon: <Bug size={17} strokeWidth={1.9} />, action: () => router.push("/bugs") },
    { id: "databases", label: "DBs", icon: <Table2 size={17} strokeWidth={1.9} />, action: () => router.push("/databases") },
    { id: "campaigns", label: "Campaigns", icon: <Target size={17} strokeWidth={1.9} />, action: () => router.push("/campaigns") },
    { id: "links", label: "Links", icon: <Link2 size={17} strokeWidth={1.9} />, action: () => router.push("/links") },
    { id: "activity", label: "Alerts", icon: <Bell size={17} strokeWidth={1.9} />, action: () => { router.push("/activity"); setShowActivity(true); setLastSeenActivity(activityLog.length); } },
    { id: "chat", label: "Chat", icon: <MessageSquare size={17} strokeWidth={1.9} />, action: () => { router.push("/chat"); setChatDefaultTab("team"); setShowChat(true); setChatNotif(null); } },
  ] satisfies { id: NavItem; label: string; icon: React.ReactNode; action: () => void }[]).filter(item => {
    if (item.id === "bugs" && currentWorkspace?.hiddenTabs?.includes("bugs")) return false;
    if (item.id === "databases" && currentWorkspace?.hiddenTabs?.includes("databases")) return false;
    if (item.id === "campaigns" && (currentWorkspaceId !== "marketing" || currentWorkspace?.hiddenTabs?.includes("campaigns"))) return false;
    if (item.id === "documents" && currentWorkspace?.hiddenTabs?.includes("documents")) return false;
    if (item.id === "notes" && currentWorkspace?.hiddenTabs?.includes("notes")) return false;
    return true;
  });

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "var(--font-dm-sans), sans-serif" }} onClick={() => { setShowThemePicker(false); setReactOpen(null); setViewingUser(null); setShowArchive(false); setShowChat(false); setShowActivity(false); setShowSettings(false); }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes ptsCount{0%{transform:scale(1)}30%{transform:scale(1.5);color:#ffcc00}70%{transform:scale(1.2)}100%{transform:scale(1)}}*{box-sizing:border-box;}@media(max-width:768px){.bu-header{flex-wrap:wrap!important;gap:8px!important}.bu-header-btns{width:100%!important;flex-wrap:nowrap!important;gap:6px!important;overflow-x:auto!important;padding-bottom:2px!important;-webkit-overflow-scrolling:touch}.bu-header-btns>*{flex:0 0 auto!important}.bu-pipe-right{display:none!important}.bu-search-row{flex-direction:column!important;gap:6px!important}.bu-view-toggle{justify-content:stretch!important}.bu-mobile-nav{display:flex!important}}@media(max-width:640px){.bu-team{overflow-x:auto!important;flex-wrap:nowrap!important;padding:8px 12px!important;gap:12px!important;-webkit-overflow-scrolling:touch}.bu-header{flex-direction:column!important;align-items:stretch!important;gap:8px!important}.bu-header>div:first-child{min-width:0!important}.bu-header>div:first-child span+div+div span{display:none!important}}@keyframes bottomSheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes fabPulse{0%,100%{box-shadow:0 4px 24px ${t.accent}55,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 4px 32px ${t.accent}88,0 2px 12px rgba(0,0,0,0.4)}}@keyframes urgentPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.7)}}`}</style>

      {showSyncBanner && (
        <div
          role="status"
          aria-live="assertive"
          data-tooltip="The app keeps retrying automatically — your changes are safe locally and will save when the connection recovers."
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
            background: t.red, color: "#fff", textAlign: "center",
            padding: "8px 14px", fontSize: 13, fontWeight: 800,
            fontFamily: "var(--font-dm-mono), monospace", letterSpacing: -0.2,
            boxShadow: "0 2px 10px rgba(0,0,0,0.35)", animation: "fadeIn 0.2s ease",
          }}
        >
          ⚠ changes not saved yet — retrying… (don’t close the tab)
        </div>
      )}

      <ChromeShell
        sidebar={sidebarNode}
        header={headerNode}
        outerStyle={
          activeNavItem === "chat" && !isMobile
            ? { height: "100vh", overflow: "hidden" }
            : { minHeight: "100vh" }
        }
        contentStyle={
          activeNavItem === "chat" && !isMobile
            ? { padding: 0, display: "flex", flexDirection: "column", minHeight: 0 }
            : { padding: isMobile ? "0 10px calc(112px + env(safe-area-inset-bottom))" : "0 20px 24px" }
        }
      >
        <AppShellProvider value={shellContextValue}>
          {children}
        </AppShellProvider>

        {/* Mobile activity bottom sheet — independent of route */}
        {isMobile && (<BottomSheet open={showActivity} onClose={() => setShowActivity(false)} title="// activity feed" t={t}><ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}><Suspense fallback={<ActivitySkeleton t={t} />}><ActivityView showToast={showToast} currentWorkspaceId={currentWorkspaceId} onNavigate={() => setShowActivity(false)} /></Suspense></ErrorBoundary></BottomSheet>)}

        {/* Toasts */}
        {chatNotif && (<div style={{ position: "fixed", bottom: 80, right: 16, maxWidth: "min(300px, calc(100vw - 32px))", background: t.bgCard, border: `1px solid ${chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent}44`, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8, boxShadow: t.shadowLg, animation: "slideUp 0.25s ease", zIndex: 600, fontFamily: "var(--font-dm-mono), monospace" }}><span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, color: chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent }}>{chatNotif.isClaim ? <Handshake size={16} /> : chatNotif.isReaction ? <Zap size={16} /> : chatNotif.isComment ? <MessageSquare size={16} /> : <Eye size={16} />}</span><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 800, color: chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent, marginBottom: 4 }}>{chatNotif.name}</div><div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, wordBreak: "break-word" }}>{chatNotif.text.length > 80 ? chatNotif.text.slice(0, 80) + "…" : chatNotif.text}</div>{chatNotif.isComment && chatNotif.stage && <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>on {chatNotif.stage}</div>}</div><button onClick={() => setChatNotif(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textDim, padding: 0, marginLeft: 4, display: "inline-flex", alignItems: "center" }}><X size={15} /></button></div>)}
      </ChromeShell>

      {isMobile && (
        <nav
          className="bu-mobile-nav"
          onClick={e => e.stopPropagation()}
          style={{ position: "fixed", left: 8, right: 8, bottom: 8, zIndex: 650, display: "none", alignItems: "center", justifyContent: "flex-start", gap: 4, padding: "6px 7px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 18, boxShadow: "0 12px 36px rgba(0,0,0,0.22)", backdropFilter: "blur(14px)" }}
          aria-label="Mobile navigation"
        >
          {mobileNavItems.map(item => {
            const active = activeNavItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setShowActivity(false);
                  setShowChat(false);
                  setShowSettings(false);
                  item.action();
                }}
                style={{ flex: "0 0 64px", minWidth: 64, height: 52, border: `1px solid ${active ? t.accent + "55" : "transparent"}`, background: active ? t.accent + "18" : "transparent", color: active ? t.accent : t.textMuted, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontFamily: "var(--font-dm-mono), monospace", fontSize: 10, fontWeight: active ? 900 : 750, cursor: "pointer", scrollSnapAlign: "center" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center" }}>{item.icon}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* WORKSPACE MODALS */}
      {workspaceModal === "create" && <Suspense fallback={null}><CreateWorkspaceModal t={t} users={users} ck={ck} onClose={() => setWorkspaceModal(null)} onCreate={(name, icon, colorKey) => createWorkspace(name, icon, colorKey)} /></Suspense>}
      {workspaceModal === "manage" && currentWorkspace && currentUser && <Suspense fallback={null}><ManageWorkspaceModal t={t} users={users} ck={ck} workspace={currentWorkspace} currentUser={currentUser!} onClose={() => setWorkspaceModal(null)} onAddMember={(uid) => addMemberToWorkspace(currentWorkspace.id, uid)} onRemoveMember={(uid) => removeMemberFromWorkspace(currentWorkspace.id, uid)} onSetRank={(uid, rank) => setMemberRank(currentWorkspace.id, uid, rank)} onDelete={() => deleteWorkspace(currentWorkspace.id)} onUpdateHiddenTabs={(hiddenTabs) => updateWorkspaceHiddenTabs(currentWorkspaceId, hiddenTabs)} /></Suspense>}

      {/* AVATAR PICKER */}
      {showAvatarPicker && selUser && (() => { const pickerUser = users.find(u => u.id === selUser); if (!pickerUser) return null; const AnimBg = () => <FloatingBg colors={[pickerUser.color, pickerUser.color + "88", t.accent + "44", pickerUser.color + "44"]} themeStyle={themeId} />; return <AvatarStep6 t={t} user={pickerUser as UserType} selAvatar={selAvatar} setSelAvatar={setSelAvatar} users={users} setUsers={setUsers} setCurrentUser={() => {}} setOnboardStep={() => {}} selUser={selUser} AnimBg={AnimBg} onClose={() => setShowAvatarPicker(false)} onConfirm={() => setShowAvatarPicker(false)} />; })()}

      {/* Mobile overlays */}
      {isMobile && (<BottomSheet open={showDocumentsMobile} onClose={() => setShowDocumentsMobile(false)} title="// documents" t={t}><ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}><Suspense fallback={null}><DocumentsPanel t={t} initialDocId={paletteDocId} workspacePipelineIds={currentWorkspace?.pipelineIds ?? []} /></Suspense></ErrorBoundary></BottomSheet>)}
      {isMobile ? (<BottomSheet open={showChat} onClose={() => setShowChat(false)} title="// team chat" t={t}><ChatView showToast={showToast} currentWorkspaceId={currentWorkspaceId} defaultTab={chatDefaultTab} defaultDmUserId={dmDefaultUser} /></BottomSheet>) : showChat ? (
        <div style={{ position: "fixed", bottom: 160, right: 16, width: `min(${chatSize.width}px, calc(100vw - 32px))`, height: chatSize.height, minWidth: 300, minHeight: 320, maxHeight: "75vh", resize: "both", overflow: "hidden", zIndex: 500, animation: "slideUp 0.2s ease", background: t.bgCard, borderRadius: 16, display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()} onMouseUp={e => { const rect = e.currentTarget.getBoundingClientRect(); setChatSize({ width: Math.round(rect.width), height: Math.round(rect.height) }); }}>
          <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <button onClick={() => setShowChat(false)} style={{ position: "absolute", top: 10, right: 12, zIndex: 10, background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: t.textMuted, padding: 0 }}>×</button>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}><ChatView showToast={showToast} currentWorkspaceId={currentWorkspaceId} defaultTab={chatDefaultTab} defaultDmUserId={dmDefaultUser} fullScreen /></div>
          </div>
        </div>
      ) : null}

      {/* FABs */}
      {!isMobile && <button onClick={e => { e.stopPropagation(); setChatDefaultTab("team"); setShowChat(true); setChatNotif(null); }} data-tooltip="Team chat" style={{ position: "fixed", bottom: 88, right: 24, zIndex: 600, width: 48, height: 48, borderRadius: "50%", background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: `0 2px 12px rgba(0,0,0,0.25)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: t.text } as React.CSSProperties}><MessageSquare size={20} />{chatNotif && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}` }} />}</button>}
      <button onClick={e => { e.stopPropagation(); setChatDefaultTab("ai"); setShowChat(prev => !prev); }} data-tooltip={showChat && chatDefaultTab === "ai" ? "Close" : "Ask Binayah AI"} style={{ position: "fixed", bottom: isMobile ? 82 : 24, right: isMobile ? 14 : 24, zIndex: 600, width: isMobile ? 48 : 54, height: isMobile ? 48 : 54, borderRadius: "50%", background: (showChat && chatDefaultTab === "ai") ? t.surface : `linear-gradient(135deg, ${t.accent}, ${t.purple || t.accent})`, border: `1px solid ${(showChat && chatDefaultTab === "ai") ? t.border : "transparent"}`, boxShadow: (showChat && chatDefaultTab === "ai") ? "none" : `0 4px 24px ${t.accent}55`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: (showChat && chatDefaultTab === "ai") ? 20 : 22, transform: (showChat && chatDefaultTab === "ai") ? "scale(0.9) rotate(90deg)" : "scale(1)", animation: (showChat && chatDefaultTab === "ai") ? "none" : "fabPulse 3s ease-in-out infinite" }}>
        <span style={{ color: "#fff", display: "inline-flex", alignItems: "center" }}>{(showChat && chatDefaultTab === "ai") ? <X size={20} /> : <Bot size={22} />}</span>
      </button>

      {/* Archive FAB + panel — operators only */}
      {!isMobile && currentUser && (ADMIN_IDS.includes(currentUser) || workspaces.some(w => w.captains.includes(currentUser))) && (<button onClick={e => { e.stopPropagation(); setShowArchive(v => !v); }} data-tooltip="Archive" style={{ position: "fixed", bottom: 70, left: 28, width: 44, height: 44, borderRadius: "50%", background: showArchive ? t.amber + "22" : t.bgCard, border: `2px solid ${showArchive ? t.amber : t.border}`, color: showArchive ? t.amber : t.textMuted, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", zIndex: 500 }}>📦</button>)}
      {showArchive && (<div onClick={e => e.stopPropagation()} style={{ position: "fixed", bottom: 122, left: 28, width: 340, maxHeight: "60vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 499, padding: 16 }}><ArchiveView /></div>)}

      {/* Activity (notification bell) panel — desktop only; mobile uses BottomSheet.
          Renders regardless of route so the bell works as a quick-peek widget
          even when the user is already on the /activity page. */}
      {!isMobile && showActivity && (
        <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: 70, right: 16, width: 360, maxHeight: "70vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 499 }}>
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<ActivitySkeleton t={t} />}>
              <ActivityView showToast={showToast} currentWorkspaceId={currentWorkspaceId} onNavigate={() => setShowActivity(false)} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Settings popover (gear in header). Admin sees their own + an opt-in
          team-overrides section; non-admin only sees their own prefs (the
          SettingsView component already enforces the role split). Closes on
          outside-click via the body onClick handler at the top. */}
      {showSettings && (
        <div
          onClick={e => e.stopPropagation()}
          style={
            isMobile
              ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: t.bg, zIndex: 600, overflowY: "auto", padding: "16px 12px 24px" }
              : { position: "fixed", top: 70, right: 16, width: "min(640px, calc(100vw - 32px))", maxHeight: "82vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 600, padding: "8px 16px 16px" }
          }
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, paddingTop: 4 }}>
            <div style={{ fontSize: 11, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 850, letterSpacing: 0.7, textTransform: "uppercase" }}>settings</div>
            <button type="button" onClick={() => setShowSettings(false)} aria-label="close settings" style={{ background: "transparent", border: "none", color: t.textDim, cursor: "pointer", padding: 4, display: "inline-flex", alignItems: "center" }}><X size={16} /></button>
          </div>
          <Suspense fallback={null}>
            <SettingsView />
          </Suspense>
        </div>
      )}

      {/* Search Palette */}
      {showPalette && (
        <SearchPalette
          t={t}
          open={showPalette}
          onClose={() => setShowPalette(false)}
          onOpenStage={handlePaletteOpenStage}
          onOpenDocument={handlePaletteOpenDocument}
          onOpenPerson={handlePaletteOpenPerson}
        />
      )}

      {/* Welcome Modal */}
      {showWelcome && initialUserId && me && (<WelcomeModal user={me} t={t} themeId={themeId} setThemeId={setThemeId} isDark={isDark} setIsDark={setIsDark} onDismiss={handleWelcomeDismiss} />)}

      {showCallSummary && (
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
      )}

      {showQuickAdd && (
        <QuickAddModal
          open={showQuickAdd}
          onClose={() => setShowQuickAdd(false)}
          t={t}
          pipelines={allPipelines.map(p => ({ id: p.id, name: p.name, icon: p.icon }))}
          onAdd={(pid, title) => { addCustomStage(pid, title); showToast(`// ${title} added`, t.green); }}
        />
      )}

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
      {/* Portal tooltip — renders into document.body, immune to overflow:hidden clipping */}
      <TooltipPortal />
    </div>
  );
}
