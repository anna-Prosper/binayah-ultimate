"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomSheet from "@/components/ui/BottomSheet";
import { signOut } from "next-auth/react";
import { lsGet, lsSet, checkSchemaVersion, clearAllLsKeys } from "@/lib/storage";
import { EphemeralProvider, useEphemeral } from "@/lib/contexts/EphemeralContext";
import { ModelProvider, useModel } from "@/lib/contexts/ModelContext";
import { mkTheme, THEME_OPTIONS } from "@/lib/themes";
import { pipelineData, USERS_DEFAULT, REACTIONS, type UserType, type Workspace } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Chev } from "@/components/ui/primitives";
import { AvatarStep6, FloatingBg } from "@/components/Onboarding";
import WelcomeModal from "@/components/WelcomeModal";
import SearchFilter from "@/components/SearchFilter";
import Stage from "@/components/Stage";
import { ToastContainer, RecoveryToast, useToasts, type ToastItem } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  ChatSkeleton,
  ActivitySkeleton,
  KanbanSkeleton,
  OverviewSkeleton,
} from "@/components/ui/Skeletons";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import NotificationPrefs from "@/components/NotificationPrefs";
import LeftSidebar, { type NavItem, type SidebarPipeline } from "@/components/LeftSidebar";
import SearchPalette from "@/components/SearchPalette";
import { MessageSquare, Bell } from "lucide-react";

// Lazy-loaded heavy panels — each becomes its own JS chunk
const ChatPanel = dynamic(() => import("@/components/ChatPanel"), { ssr: false });
const ActivityFeed = dynamic(() => import("@/components/ActivityFeed"), { ssr: false });
const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });
const HomeView = dynamic(() => import("@/components/HomeView"), { ssr: false });
const CreateWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.CreateWorkspaceModal), { ssr: false });
const ManageWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.ManageWorkspaceModal), { ssr: false });
const KanbanView = dynamic(() => import("@/components/KanbanView"), { ssr: false });
const OverviewPanel = dynamic(() => import("@/components/OverviewPanel"), { ssr: false });
const DocumentsPanel = dynamic(() => import("@/components/DocumentsPanel"), { ssr: false, loading: () => null });

const COLOR_OPTIONS = ["blue", "purple", "green", "amber", "cyan", "red", "orange", "lime", "slate"] as const;
const ICON_OPTIONS = ["🔧", "🚀", "💡", "🎯", "⚡", "🔥", "🤖", "💥", "✨", "📊"];
const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;

// ── Outer wrapper — provides EphemeralContext, then theme+toast state, then ModelContext ───────────
export default function Dashboard({ initialUserId }: { initialUserId?: string }) {
  return (
    <EphemeralProvider>
      <DashboardShell initialUserId={initialUserId} />
    </EphemeralProvider>
  );
}

// ── DashboardShell: owns theme state + useToasts, provides ModelProvider ────────────────────────
function DashboardShell({ initialUserId }: { initialUserId?: string }) {
  const [isRecovering, setIsRecovering] = useState(() => {
    if (typeof window === "undefined") return false;
    return !checkSchemaVersion();
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    if (!localStorage.getItem("binayah_themeV2")) return true;
    return lsGet("isDark", true);
  });
  const [themeId, setThemeId] = useState(() => lsGet("themeId", "warroom"));
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => lsGet("currentWorkspaceId", "war-room"));

  const { toasts, showToast, dismissToast } = useToasts();

  // One-time migration: pre-themeV2 users default to dark going forward
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("binayah_themeV2")) localStorage.setItem("binayah_themeV2", "1");
  }, []);
  useEffect(() => { lsSet("isDark", isDark); }, [isDark]);
  useEffect(() => { lsSet("themeId", themeId); }, [themeId]);
  useEffect(() => { lsSet("currentWorkspaceId", currentWorkspaceId); }, [currentWorkspaceId]);
  useEffect(() => { document.body.style.background = mkTheme(themeId, isDark).bg; }, [isDark, themeId]);

  // Schema version recovery
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
    <ModelProvider
      initialUserId={initialUserId}
      themeId={themeId}
      isDark={isDark}
      showToast={showToast}
      currentWorkspaceId={currentWorkspaceId}
    >
      <DashboardInner
        initialUserId={initialUserId}
        isDark={isDark}
        setIsDark={setIsDark}
        themeId={themeId}
        setThemeId={setThemeId}
        currentWorkspaceId={currentWorkspaceId}
        setCurrentWorkspaceId={setCurrentWorkspaceId}
        showToast={showToast}
        toasts={toasts}
        dismissToast={dismissToast}
      />
    </ModelProvider>
  );
}

// ── DashboardInner: navigation state + render tree. Reads model from useModel() ─────────────────
function DashboardInner({
  initialUserId,
  isDark, setIsDark, themeId, setThemeId,
  currentWorkspaceId, setCurrentWorkspaceId,
  showToast, toasts, dismissToast,
}: {
  initialUserId?: string;
  isDark: boolean; setIsDark: (v: boolean) => void;
  themeId: string; setThemeId: (v: string) => void;
  currentWorkspaceId: string; setCurrentWorkspaceId: (v: string) => void;
  showToast: (msg: string, color: string) => void;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
}) {
  // ── Context reads ───────────────────────────────────────────────────────
  const {
    users, setUsers, currentUser, setCurrentUser, me,
    claims, reactions, comments, subtasks, assignments,
    stageStatusOverrides, approvedStages, stageDescOverrides, stageNameOverrides,
    subtaskStages, pipeDescOverrides, setPipeDescOverrides, pipeMetaOverrides, setPipeMetaOverrides,
    customStages, customPipelines, workspaces, setWorkspaces, activityLog,
    archivedStages, archivedPipelines, stageImages,
    chatMessages, hasMoreMessages, chatNotif, setChatNotif, liveNotifs,
    syncStatus, getStatus, getPoints, sc, ck, pr, allPipelinesGlobal,
    handleClaim, handleReact, addComment, addSubtask, toggleSubtask, renameSubtask,
    lockSubtask, removeSubtask,
    archiveStage, restoreStage, archivePipeline, restorePipeline,
    setStageDescOverride, setStageNameOverride, setSubtaskStage, assignTask,
    setStageStatusDirect, cycleStatus, approveStage,
    addCustomStage, addCustomPipeline, cyclePriority,
    addStageImage, removeStageImage, sendChat, handleRemoteMessage, loadMoreMessages, logActivity,
    createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace,
    isOfficerOfWorkspace, t,
  } = useModel();
  const { reactOpen, setReactOpen, copied, setCopied } = useEphemeral();

  // ── Navigation state ────────────────────────────────────────────────────
  const [activeNavItem, setActiveNavItem] = useState<NavItem>(() => {
    const saved = lsGet("binayah_activeNav", "home");
    const valid: NavItem[] = ["home", "pipelines", "documents", "activity", "chat"];
    return (valid.includes(saved as NavItem) ? saved : "home") as NavItem;
  });
  const [activeSidebarPipeline, setActiveSidebarPipeline] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban" | "overview">("list");
  const [expanded, setExpanded] = useState<string[]>(() => lsGet("expanded", ["research"]));
  const [expS, setExpS] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────
  const [isHydrating, setIsHydrating] = useState(true);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selUser, setSelUser] = useState<string | null>(null);
  const [selAvatar, setSelAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const viewingUserPopupRef = useRef<HTMLDivElement>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatDefaultTab, setChatDefaultTab] = useState<"team" | "ai">("ai");
  const [showDocumentsMobile, setShowDocumentsMobile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteDocId, setPaletteDocId] = useState<string | null>(null);
  const [workspaceModal, setWorkspaceModal] = useState<"create" | "manage" | null>(null);
  const [editingPipeDesc, setEditingPipeDesc] = useState<string | null>(null);
  const [editingPipeName, setEditingPipeName] = useState<string | null>(null);
  const [newStageInput, setNewStageInput] = useState<Record<string, string>>({});
  const [addingPipeline, setAddingPipeline] = useState(false);
  const [newPipeForm, setNewPipeForm] = useState({ name: "", desc: "", icon: "🔧", colorKey: "blue", priority: "MEDIUM" });
  const [pipeMenuOpen, setPipeMenuOpen] = useState<string | null>(null);
  const [claimAnim, setClaimAnim] = useState<{ stage: string; pts: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; pts: string; color: string } | null>(null);
  const [ptsFlash, setPtsFlash] = useState(false);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => lsGet("lastSeenActivity", 0));
  const [showArchive, setShowArchive] = useState(false);
  const [editMode] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined" || !initialUserId) return false;
    return !localStorage.getItem(`binayah_welcomed_${initialUserId}`);
  });
  const [subtaskInput, setSubtaskInput] = useState<Record<string, string>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [showMockup, setShowMockup] = useState<Record<string, boolean>>({});
  const prevMyPtsRef = useRef(0);
  const prevApprovedRef = useRef<string[]>([]);

  const isMobile = useIsMobile(768);

  // ── LocalStorage persistence (navigation) ───────────────────────────────
  useEffect(() => { lsSet("expanded", expanded); }, [expanded]);
  useEffect(() => { lsSet("view", view); }, [view]);
  useEffect(() => { lsSet("binayah_activeNav", activeNavItem); }, [activeNavItem]);
  useEffect(() => { lsSet("lastSeenActivity", lastSeenActivity); }, [lastSeenActivity]);

  // ── Hydration: mark done when model is ready ────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (syncStatus !== "connecting") setIsHydrating(false);
  }, [syncStatus]);

  // ── Cmd+K / Escape handlers ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowPalette(prev => !prev); }
      if (e.key === "Escape") { setViewingUser(null); setShowThemePicker(false); setReactOpen(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setReactOpen]);

  // ── Click-outside: viewingUser popup ────────────────────────────────────
  useEffect(() => {
    if (!viewingUser) return;
    const handler = (e: MouseEvent) => {
      if (viewingUserPopupRef.current && !viewingUserPopupRef.current.contains(e.target as Node)) setViewingUser(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [viewingUser]);

  // ── Deep-link: ?pipeline=<name>&stage=<name> ────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetPipeline = params.get("pipeline");
    const targetStage = params.get("stage");
    if (!targetPipeline && !targetStage) return;
    const allPipelines = [...pipelineData, ...customPipelines];
    let pipelineId: string | null = null;
    if (targetPipeline) {
      const found = allPipelines.find(p => p.name === targetPipeline || p.id === targetPipeline);
      if (found) pipelineId = found.id;
    }
    if (pipelineId) setExpanded(prev => prev.includes(pipelineId!) ? prev : [...prev, pipelineId!]);
    if (targetStage) {
      setExpS(targetStage);
      setTimeout(() => {
        const el = document.getElementById(`stage-${CSS.escape(targetStage)}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-expand pipelines on search ─────────────────────────────────────
  useEffect(() => {
    if (!searchQ) return;
    const q = searchQ.toLowerCase();
    const ids = [...pipelineData, ...customPipelines]
      .filter(p => p.name.toLowerCase().includes(q) || p.stages.some(s => s.toLowerCase().includes(q)))
      .map(p => p.id);
    setExpanded(prev => [...new Set([...prev, ...ids])]);
  }, [searchQ, customPipelines]);

  // ── Points flash ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const myPts = getPoints(currentUser);
    if (myPts > prevMyPtsRef.current && prevMyPtsRef.current > 0) {
      setPtsFlash(true);
      setTimeout(() => setPtsFlash(false), 1800);
    }
    prevMyPtsRef.current = myPts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageStatusOverrides, claims]);

  // ── Approval animation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) { prevApprovedRef.current = [...approvedStages]; return; }
    approvedStages.forEach(stage => {
      if (!prevApprovedRef.current.includes(stage)) {
        const claimers = claims[stage] || [];
        if (claimers.includes(currentUser)) {
          const pts = (stageStatusOverrides as Record<string, string>)[stage] ? 10 : 10;
          setToast({ text: `🎉 ${stage} approved!`, pts: `+${pts}pts earned`, color: t.green });
          setClaimAnim({ stage, pts });
          setTimeout(() => setClaimAnim(null), 1400);
          setTimeout(() => setToast(null), 3500);
        }
      }
    });
    prevApprovedRef.current = [...approvedStages];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvedStages]);

  // ── shareStage / sharePipeline (use both model state + ephemeral copied) ─
  const shareStage = useCallback((name: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  }, [setCopied]);

  const sharePipeline = useCallback((pid: string, pname: string, pdesc: string, priority: string, hours: string, stageList: string[]) => {
    const stageLines = stageList.map(s => `  · ${s}  [${getStatus(s).toUpperCase()}]`).join("\n");
    const owners = [...new Set(stageList.flatMap(s => claims[s] || []))].map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
    const lines: string[] = ["Binayah AI  //  Pipeline", "────────────────────────────────", pname, `Priority: ${priority}  ·  ${stageList.length} stages  ·  ${hours}`];
    if (pdesc) { lines.push(""); lines.push(pdesc); }
    lines.push(""); lines.push("Stages:"); lines.push(stageLines);
    if (owners.length) { lines.push(""); lines.push(`Owners: ${owners.join(", ")}`); }
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopied(`pipe-${pid}`);
    setTimeout(() => setCopied(null), 2000);
  }, [setCopied, getStatus, claims, users]);

  // ── Wrappers that bridge old per-state commentInput/subtaskInput → new API
  const addCommentWrapped = useCallback((sid: string) => {
    const val = commentInput[sid]?.trim();
    if (!val) return;
    addComment(sid, val, () => setCommentInput(prev => ({ ...prev, [sid]: "" })));
  }, [commentInput, addComment]);

  const addSubtaskWrapped = useCallback((sid: string) => {
    const val = subtaskInput[sid]?.trim();
    if (!val) return;
    addSubtask(sid, val, () => setSubtaskInput(prev => ({ ...prev, [sid]: "" })));
  }, [subtaskInput, addSubtask]);

  // ── handleClaim with animation ────────────────────────────────────────────
  const handleClaimWithAnim = useCallback((sid: string) => {
    const alreadyClaimed = currentUser ? (claims[sid] || []).includes(currentUser) : false;
    handleClaim(sid);
    if (!alreadyClaimed && currentUser) {
      const pts = 10;
      const meUser = users.find(u => u.id === currentUser);
      setClaimAnim({ stage: sid, pts });
      setToast({ text: `${meUser?.name} owns ${sid}`, pts: `earn +${pts}pts on live`, color: meUser?.color || t.accent });
      setTimeout(() => setClaimAnim(null), 1200);
      setTimeout(() => setToast(null), 2500);
    }
  }, [handleClaim, claims, currentUser, users, t.accent]);

  // ── Palette navigation callbacks ──────────────────────────────────────────
  const allPipelines = currentWorkspaceId
    ? (() => {
        const ws = workspaces.find(w => w.id === currentWorkspaceId);
        return ws ? allPipelinesGlobal.filter(p => ws.pipelineIds.includes(p.id)) : allPipelinesGlobal;
      })()
    : allPipelinesGlobal;

  const handlePaletteOpenStage = useCallback((pipelineId: string, stageName: string) => {
    setActiveNavItem("pipelines");
    setView("list");
    setExpanded(prev => prev.includes(pipelineId) ? prev : [...prev, pipelineId]);
    const p = allPipelines.find(pl => pl.id === pipelineId);
    if (p) {
      const stages = [...p.stages, ...(customStages[pipelineId] || [])];
      const idx = stages.indexOf(stageName);
      if (idx >= 0) setExpS(`${pipelineId}-${idx}`);
      setTimeout(() => {
        const el = document.getElementById(`stage-${CSS.escape(stageName)}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPipelines, customStages]);

  const handlePaletteOpenDocument = useCallback((docId: string) => {
    setActiveNavItem("documents");
    if (isMobile) setShowDocumentsMobile(true);
    setPaletteDocId(null);
    requestAnimationFrame(() => setPaletteDocId(docId));
  }, [isMobile]);

  const handlePaletteOpenPerson = useCallback((userId: string) => {
    setViewingUser(userId);
    setTimeout(() => {
      const el = document.querySelector("[data-user-id='" + userId + "']") as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  const handleWelcomeDismiss = useCallback(({ avatar, aiAvatar }: { avatar: string | null; aiAvatar: string | null }) => {
    if (initialUserId) {
      try { localStorage.setItem(`binayah_welcomed_${initialUserId}`, Date.now().toString()); } catch { /* noop */ }
    }
    if (avatar || aiAvatar) {
      setUsers(prev => prev.map(u =>
        u.id === currentUser ? { ...u, avatar: avatar || u.avatar, aiAvatar: aiAvatar || u.aiAvatar } : u
      ));
    }
    setShowWelcome(false);
  }, [initialUserId, currentUser, setUsers]);

  // ── Kanban card click ─────────────────────────────────────────────────────
  const onKanbanCardClick = (pipelineId: string, stageName: string) => {
    setView("list");
    setExpanded(prev => prev.includes(pipelineId) ? prev : [...prev, pipelineId]);
    const p = allPipelines.find(p => p.id === pipelineId);
    if (p) {
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      const idx = stages.indexOf(stageName);
      if (idx >= 0) setExpS(`${pipelineId}-${idx}`);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;
  const myWorkspaces = workspaces.filter(w => currentUser ? w.members.includes(currentUser) : true);
  const isAdmin = isOfficerOfWorkspace(currentWorkspaceId);
  const isCaptainOfCurrent = !!currentUser && !!currentWorkspace && currentWorkspace.captains.includes(currentUser);
  const isFirstMateOfCurrent = !!currentUser && !!currentWorkspace && currentWorkspace.firstMates.includes(currentUser);

  const userRankInCurrent = (uid: string): "captain" | "firstMate" | "crew" | null => {
    if (!currentWorkspace) return null;
    if (currentWorkspace.captains.includes(uid)) return "captain";
    if (currentWorkspace.firstMates.includes(uid)) return "firstMate";
    if (currentWorkspace.members.includes(uid)) return "crew";
    return null;
  };

  const allStages = [...pipelineData.flatMap(p => p.stages), ...customPipelines.flatMap(p => p.stages), ...Object.values(customStages).flat()];
  const total = allStages.length;
  const unseen = activityLog.length - lastSeenActivity;

  // Build AI context string for ChatPanel
  const buildAiContext = () => {
    const lines: string[] = [];
    lines.push(`Current user: ${me?.name || currentUser} (id=${currentUser}, role=${me?.role || "?"}, points=${getPoints(currentUser!)})`);
    lines.push(`Team: ${users.map(u => `${u.name} (${u.id}, ${u.role}, ${getPoints(u.id)}pts)`).join("; ")}`);
    lines.push(""); lines.push(`Pipelines (${allPipelines.length}):`);
    allPipelines.forEach((p, pi) => {
      const pName = pipeMetaOverrides[p.id]?.name || p.name;
      const pPrio = pipeMetaOverrides[p.id]?.priority || p.priority;
      const pDesc = pipeDescOverrides[p.id] || p.desc;
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      lines.push(`${pi + 1}. ${pName} — ${pPrio} — ${pDesc}`);
      stages.forEach((s, si) => {
        const st = getStatus(s);
        const claimers = (claims[s] || []).map(id => users.find(u => u.id === id)?.name || id).join(", ") || "unclaimed";
        const subN = (subtasks[s] || []).length;
        const subDone = (subtasks[s] || []).filter(sub => sub.done).length;
        const comN = (comments[s] || []).length;
        const sDesc = stageDescOverrides[s] || "";
        lines.push(`   ${pi + 1}.${si + 1} ${s} [${st}] — claimed by ${claimers}${subN ? ` — subtasks ${subDone}/${subN}` : ""}${comN ? ` — ${comN} comments` : ""}${sDesc ? ` — ${sDesc}` : ""}`);
      });
    });
    const recent = activityLog.slice(0, 8);
    if (recent.length) { lines.push(""); lines.push("Recent activity:"); recent.forEach(a => lines.push(`- ${a.user} ${a.type} ${a.target}${a.detail ? ` (${a.detail})` : ""}`)); }
    return lines.join("\n");
  };

  // ── Hydrating state ───────────────────────────────────────────────────────
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

  if (!me) return (<div style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 15, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>// session error — please sign out and back in</span></div>);

  // Compute top claim stage (first unclaimed actionable stage)
  const topClaimStageName = (() => {
    if (!currentUser) return null;
    const actionableStatuses = new Set(["planned", "in-progress", "active"]);
    for (const p of allPipelines) {
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      for (const s of stages) {
        if (actionableStatuses.has(getStatus(s)) && !(claims[s] || []).includes(currentUser)) return s;
      }
    }
    return null;
  })();

  const stageProps = {
    t, expS, setExpS, getStatus, sc, claims, reactions, subtasks, comments, users,
    currentUser, me, showMockup, setShowMockup, claimAnim,
    handleClaim: handleClaimWithAnim, handleReact, cycleStatus, shareStage,
    subtaskInput, setSubtaskInput, commentInput, setCommentInput,
    addSubtask: addSubtaskWrapped, toggleSubtask, lockSubtask, removeSubtask,
    addComment: addCommentWrapped,
    stageDescOverrides, setStageDescOverride, setStageNameOverride, liveNotifs,
    stageImages, addStageImage, removeStageImage, archiveStage,
  };

  const hBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 12px", cursor: "pointer", color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, gap: 4, minHeight: 44 };
  const toggleExpand = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const addCustomStageLocal = (pid: string) => { const val = newStageInput[pid]?.trim(); if (!val) return; addCustomStage(pid, val); setNewStageInput(prev => ({ ...prev, [pid]: "" })); };
  const addCustomPipelineLocal = () => {
    if (!newPipeForm.name.trim()) return;
    const id = addCustomPipeline(newPipeForm);
    if (id) { setNewPipeForm({ name: "", desc: "", icon: "🔧", colorKey: "blue", priority: "MEDIUM" }); setAddingPipeline(false); setExpanded(prev => [...prev, id]); }
  };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", flexDirection: "row" }} onClick={() => { setShowThemePicker(false); setReactOpen(null); setViewingUser(null); setPipeMenuOpen(null); }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes shimmer{0%{left:-100%}100%{left:200%}}@keyframes flyup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}}@keyframes confetti0{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(40px,-50px) rotate(180deg)}}@keyframes confetti1{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-30px,-60px) rotate(-120deg)}}@keyframes confetti2{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(60px,-30px) rotate(90deg)}}@keyframes confetti3{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-50px,-40px) rotate(-200deg)}}@keyframes ptsCount{0%{transform:scale(1)}30%{transform:scale(1.5);color:#ffcc00}70%{transform:scale(1.2)}100%{transform:scale(1)}}@keyframes emojiPop{0%{opacity:0;transform:scale(0.3) translateY(0)}40%{opacity:1;transform:scale(1.4) translateY(-8px)}70%{opacity:1;transform:scale(1.1) translateY(-14px)}100%{opacity:0;transform:scale(0.8) translateY(-22px)}}@keyframes commentPulse{0%,100%{box-shadow:none}30%,70%{box-shadow:0 0 0 2px #00ff8844}}*{box-sizing:border-box;}@media(max-width:768px){.bu-header{flex-wrap:wrap!important;gap:8px!important}.bu-header-btns{flex-wrap:wrap!important;gap:4px!important}.bu-pipe-right{display:none!important}.bu-search-row{flex-direction:column!important;gap:6px!important}.bu-view-toggle{justify-content:stretch!important}}@media(max-width:768px){.bu-pipe-left{width:100%!important}.bu-pipe-actions{flex-wrap:wrap!important;gap:4px!important}}@media(max-width:640px){.bu-stats{grid-template-columns:repeat(3,1fr)!important}.bu-team{overflow-x:auto!important;flex-wrap:nowrap!important;padding:8px 12px!important;gap:12px!important;-webkit-overflow-scrolling:touch}.bu-header{flex-direction:column!important;gap:8px!important}}@keyframes bottomSheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* LEFT SIDEBAR */}
      {!isMobile && (
        <div style={{ position: "sticky", top: 0, height: "100vh", flexShrink: 0, overflowY: "auto" }}>
          <LeftSidebar
            t={t} activeNav={activeNavItem}
            onNavChange={(item) => {
              setActiveNavItem(item);
              if (item === "activity") { setShowActivity(true); setLastSeenActivity(activityLog.length); }
              else if (item === "chat") { setShowChat(false); setChatNotif(null); }
              else { setShowActivity(false); setShowChat(false); }
            }}
            pipelines={allPipelines as SidebarPipeline[]}
            activePipelineId={activeSidebarPipeline}
            onPipelineSelect={(id) => { setActiveSidebarPipeline(id); setExpanded(prev => prev.includes(id) ? prev : [...prev, id]); setActiveNavItem("pipelines"); }}
            workspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, memberCount: w.members.length }))}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={(id) => { setCurrentWorkspaceId(id); setActiveSidebarPipeline(null); }}
            canCreateWorkspace={!!currentUser && workspaces.some(w => w.captains.includes(currentUser!))}
            onCreateWorkspace={() => setWorkspaceModal("create")}
            canManageCurrentWorkspace={!!currentWorkspace && !!currentUser && currentWorkspace.members.includes(currentUser!)}
            onManageCurrentWorkspace={() => setWorkspaceModal("manage")}
          />
        </div>
      )}

      {/* Right section */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "hidden" }}>

      {activeNavItem === "chat" && !isMobile ? (
        <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
          <Suspense fallback={<ChatSkeleton t={t} />}>
            <ChatPanel fullScreen messages={chatMessages} onSend={sendChat} onRemoteMessage={handleRemoteMessage} users={users} currentUser={currentUser!} t={t} defaultTab="team" onLoadMore={loadMoreMessages} hasMore={hasMoreMessages} buildAiContext={buildAiContext} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <>
        {/* Header + team bar */}
        <div style={{ padding: isMobile ? "12px 12px 0" : (activeNavItem === "home" ? "12px 20px 0" : "24px 20px 0") }}>
          <div className="bu-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
            {activeNavItem !== "home" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: -0.3 }}>Binayah AI</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: syncStatus === "live" ? t.green : syncStatus === "connecting" ? t.amber : t.red, transition: "all 0.3s" }} title={`sync: ${syncStatus}`} />
                  <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{allPipelines.length} pipelines · {total} stages{syncStatus === "offline" ? " · offline" : ""}</span>
                </div>
              </div>
            )}
            <div className="bu-header-btns" style={{ display: activeNavItem === "home" ? "none" : "flex", alignItems: "stretch", gap: 4 }}>
              {me && (
                <div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "0 12px", cursor: "pointer", transition: "border-color 0.2s" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border} title="Change avatar">
                  <AvatarC user={me} size={28} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{me.name}</div>
                    <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div>
                  </div>
                </div>
              )}
              <button onClick={e => { e.stopPropagation(); setActiveNavItem("chat"); setShowChat(false); setChatNotif(null); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} title="Team chat" aria-label="Open team chat">
                <MessageSquare size={16} strokeWidth={1.8} />
                {chatNotif && activeNavItem !== "chat" && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}`, animation: "claimPulse 1s ease infinite" }} />}
              </button>
              <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} title="Notifications" aria-label="View notifications">
                <Bell size={16} strokeWidth={1.8} />
                {unseen > 0 && <div style={{ position: "absolute", top: 6, right: 6, minWidth: 14, height: 14, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}
              </button>
              {isMobile && <button onClick={e => { e.stopPropagation(); setShowDocumentsMobile(true); }} style={{ ...hBtn, fontSize: 15 }} title="Documents" aria-label="View documents">{"📄"}</button>}
              <div style={{ position: "relative", display: "flex", alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 16, gap: 4 }} title="Change theme" aria-label="Change theme">{t.icon} <span style={{ fontSize: 10 }}>{"▾"}</span></button>
                {showThemePicker && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 8, zIndex: 200, width: "min(220px, calc(100vw - 32px))", boxShadow: `0 12px 40px rgba(0,0,0,0.5)`, animation: "fadeIn 0.15s ease" }}>
                    {THEME_OPTIONS.map(opt => (
                      <div key={opt.id} onClick={() => { setThemeId(opt.id); setShowThemePicker(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 12, cursor: "pointer", background: themeId === opt.id ? opt.color + "18" : "transparent", border: "none", marginBottom: 0, transition: "all 0.15s" }}>
                        <span style={{ fontSize: 20 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: themeId === opt.id ? opt.color : t.text }}>{opt.name}</div>
                          <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.3 }}>{opt.desc}</div>
                        </div>
                        {themeId === opt.id && <span style={{ marginLeft: "auto", fontSize: 13, color: opt.color }}>{"✓"}</span>}
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "center" }}>
                      <button onClick={() => setIsDark(!isDark)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 16px", cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>
                        {isDark ? "☀️ light mode" : "🌚 dark mode"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn }} title="Sign out">sign out</button>
            </div>
          </div>

          {/* TEAM BAR */}
          <div className="bu-team" style={{ display: activeNavItem === "home" ? "none" : "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "12px 16px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, flexWrap: "wrap" }}>
            {users.map((u: UserType) => {
              const isMe = u.id === currentUser;
              const uPts = getPoints(u.id);
              const claimedStages = Object.entries(claims).filter(([, cl]) => (cl as string[]).includes(u.id)).map(([s]) => s);
              const liveOwned = claimedStages.filter(s => getStatus(s) === "active");
              const rank = [...users].sort((a, b) => getPoints(b.id) - getPoints(a.id)).findIndex(x => x.id === u.id) + 1;
              const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
              return (
                <div key={u.id} style={{ position: "relative" }}>
                  <div onClick={e => { e.stopPropagation(); setViewingUser(viewingUser === u.id ? null : u.id); }} style={{ display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s", cursor: "pointer", borderRadius: 12, padding: "4px 4px", margin: "-4px -6px" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = u.color + "12"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0, position: "relative" }}>
                      <AvatarC user={u} size={26} />
                      {userRankInCurrent(u.id) === "captain" && <span title={`Captain of ${currentWorkspace?.name || "workspace"}`} style={{ position: "absolute", bottom: -2, right: -4, fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>👑</span>}
                      {userRankInCurrent(u.id) === "firstMate" && <span title={`First Mate of ${currentWorkspace?.name || "workspace"}`} style={{ position: "absolute", bottom: -2, right: -4, fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>⚓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: isMe ? 900 : 800, color: isMe ? u.color : t.text, display: "flex", alignItems: "center", gap: 4 }}>
                        {u.name}
                        {userRankInCurrent(u.id) === "captain" && <span style={{ fontSize: 10, color: t.text, fontWeight: 800 }}>👑</span>}
                        {userRankInCurrent(u.id) === "firstMate" && <span style={{ fontSize: 10, color: t.text, fontWeight: 800 }}>⚓</span>}
                      </div>
                      <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash ? "ptsCount 0.6s ease" : "none" }}>{uPts}pts</div>
                    </div>
                  </div>
                  {viewingUser === u.id && (
                    <div ref={viewingUserPopupRef} onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 200, background: t.bgCard, border: `1.5px solid ${u.color}44`, borderRadius: 16, padding: "16px 16px 16px 16px", minWidth: 210, maxWidth: "min(320px, calc(100vw - 32px))", boxShadow: t.shadowLg, animation: "fadeIn 0.15s ease" }}>
                      <button onClick={() => setViewingUser(null)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textDim, lineHeight: 1, padding: "0 4px", borderRadius: 8 }} aria-label="Close">×</button>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                        <div style={{ borderRadius: "50%", padding: 0, background: `linear-gradient(135deg,${u.color},${u.color}66)`, flexShrink: 0 }}><AvatarC user={u} size={42} /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 900, color: u.color, display: "flex", alignItems: "center", gap: 4 }}>{u.name}<span style={{ fontSize: 13 }}>{rankEmoji}</span></div>
                          <div style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
                        {[{ val: uPts, label: "pts", color: t.accent }, { val: claimedStages.length, label: "owned", color: t.accent }, { val: liveOwned.length, label: "live", color: t.green }].map(({ val, label, color }) => (
                          <div key={label} style={{ background: t.bgHover, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                            <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash && label === "pts" ? "ptsCount 0.6s ease" : "none" }}>{val}</div>
                            <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      {claimedStages.length > 0 ? (
                        <div style={{ marginBottom: isMe ? 10 : 0 }}>
                          <div style={{ fontSize: 10, color: t.textDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>owned stages</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {claimedStages.map(s => {
                              const st = sc[getStatus(s)] ?? { l: "concept", c: "#888" };
                              return (
                                <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: t.textSec }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.c, flexShrink: 0, boxShadow: getStatus(s) === "active" ? `0 0 6px ${st.c}` : "none" }} />
                                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s}</span>
                                  <span style={{ fontSize: 10, color: st.c, fontWeight: 700 }}>{st.l}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : <div style={{ fontSize: 10, color: t.textDim, fontStyle: "italic", marginBottom: isMe ? 10 : 0 }}>no stages claimed yet</div>}
                      {isMe && (
                        <>
                          <button onClick={() => { setSelUser(u.id); setSelAvatar(u.avatar); setShowAvatarPicker(true); setViewingUser(null); }} style={{ width: "100%", background: u.color + "18", border: `1px solid ${u.color}44`, borderRadius: 12, padding: "8px", cursor: "pointer", fontSize: 11, color: u.color, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>change avatar →</button>
                          <NotificationPrefs t={t} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "0 12px 16px" : "0 20px 24px", overflowX: "hidden" }}>
          {isMobile && (
            <BottomSheet open={showActivity} onClose={() => setShowActivity(false)} title="// activity feed" t={t}>
              <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
                <Suspense fallback={<ActivitySkeleton t={t} />}><ActivityFeed activityLog={activityLog} users={users} t={t} /></Suspense>
              </ErrorBoundary>
            </BottomSheet>
          )}

          {!isMobile && activeNavItem === "documents" && (
            <ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}>
              <Suspense fallback={null}><div style={{ marginTop: 16, height: "calc(100vh - 80px)" }}><DocumentsPanel t={t} initialDocId={paletteDocId} /></div></Suspense>
            </ErrorBoundary>
          )}

          {!isMobile && activeNavItem === "activity" && (
            <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
              <Suspense fallback={<ActivitySkeleton t={t} />}><div style={{ marginTop: 16 }}><ActivityFeed activityLog={activityLog} users={users} t={t} /></div></Suspense>
            </ErrorBoundary>
          )}

          {!isMobile && activeNavItem === "home" && me && (
            <ErrorBoundary onError={() => showToast("// home failed to load — refresh to retry", t.red)}>
              <Suspense fallback={null}>
                <HomeView
                  t={t} me={me} users={users} myWorkspaces={myWorkspaces} allPipelinesGlobal={allPipelinesGlobal}
                  customStages={customStages} pipeMetaOverrides={pipeMetaOverrides}
                  claims={claims} reactions={reactions} comments={comments} subtasks={subtasks}
                  assignments={assignments} approvedStages={approvedStages}
                  commentInput={commentInput} setCommentInput={setCommentInput}
                  getStatus={getStatus} sc={sc} ck={ck} currentUser={currentUser!}
                  isCaptainOfAny={!!currentUser && workspaces.some(w => w.captains.includes(currentUser!))}
                  handleClaim={handleClaimWithAnim} handleReact={handleReact}
                  toggleSubtask={toggleSubtask} renameSubtask={renameSubtask} shareStage={shareStage}
                  addComment={addCommentWrapped} setStageStatus={setStageStatusDirect} approveStage={approveStage}
                  assignTask={assignTask} currentWorkspaceId={currentWorkspaceId}
                  onSwitchWorkspace={(id) => { setCurrentWorkspaceId(id); setActiveSidebarPipeline(null); }}
                  stageNameOverrides={stageNameOverrides} setStageNameOverride={setStageNameOverride}
                  subtaskStages={subtaskStages} setSubtaskStage={setSubtaskStage}
                  editMode={editMode} archivedStages={archivedStages}
                  onPipelineClick={(pid) => { setActiveNavItem("pipelines"); setActiveSidebarPipeline(pid); }}
                  onUserClick={(uid) => setViewingUser(viewingUser === uid ? null : uid)}
                  navbarSlot={me ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "6px 10px", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border}>
                        <AvatarC user={me} size={24} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: t.text }}>{me.name}</div>
                          <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setActiveNavItem("chat"); }} style={{ ...hBtn, fontSize: 14 }} title="Team chat"><MessageSquare size={14} strokeWidth={1.8} /></button>
                      <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 14, position: "relative" }} title="Notifications">
                        <Bell size={14} strokeWidth={1.8} />
                        {unseen > 0 && <div style={{ position: "absolute", top: 4, right: 4, minWidth: 12, height: 12, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}
                      </button>
                      <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 14, gap: 3 }} title="Theme">{t.icon} <span style={{ fontSize: 11 }}>▾</span></button>
                      <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn, fontSize: 11 }}>sign out</button>
                    </div>
                  ) : undefined}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {(isMobile || activeNavItem === "pipelines") && (<div style={{ marginTop: 16 }}>
            <div className="bu-search-row" style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "stretch" }}>
              <div style={{ flex: 1 }}><SearchFilter searchQ={searchQ} setSearchQ={setSearchQ} statusFilter={statusFilter} setStatusFilter={setStatusFilter} t={t} /></div>
              <div className="bu-view-toggle" style={{ display: "flex", gap: 4, alignItems: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 4px" }}>
                {([["list", "☰ list", "☰"], ["kanban", "⊞ kanban", "⊞"], ["overview", "□ overview", "□"]] as const).map(([v, label, icon]) => (
                  <button key={v} onClick={() => setView(v)} style={{ background: view === v ? t.accent + "22" : "transparent", border: `1px solid ${view === v ? t.accent + "55" : "transparent"}`, borderRadius: 8, padding: isMobile ? "10px 14px" : "5px 12px", minHeight: isMobile ? 44 : undefined, cursor: "pointer", fontSize: 11, color: view === v ? t.accent : t.textMuted, fontWeight: view === v ? 700 : 500, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>{isMobile ? icon : label}</button>
                ))}
              </div>
            </div>

            {view === "overview" && (
              <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
                <Suspense fallback={<OverviewSkeleton t={t} />}>
                  <OverviewPanel allPipelines={allPipelines} customStages={customStages} getStatus={getStatus} claims={claims} users={users} sc={sc} ck={ck} stageDescOverrides={stageDescOverrides} setStageDescOverride={setStageDescOverride} pipeDescOverrides={pipeDescOverrides} setPipeDescOverrides={setPipeDescOverrides} pipeMetaOverrides={pipeMetaOverrides} setPipeMetaOverrides={setPipeMetaOverrides} searchQ={searchQ} activityLog={activityLog} t={t} />
                </Suspense>
              </ErrorBoundary>
            )}

            {view === "kanban" && (
              <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
                <Suspense fallback={<KanbanSkeleton t={t} />}>
                  <TasksView t={t} allPipelines={allPipelines} customStages={customStages} pipeMetaOverrides={pipeMetaOverrides} subtasks={subtasks} claims={claims} reactions={reactions} comments={comments} getStatus={getStatus} sc={sc} users={users} currentUser={currentUser} handleClaim={handleClaimWithAnim} handleReact={handleReact} toggleSubtask={toggleSubtask} renameSubtask={renameSubtask} shareStage={shareStage} addComment={addCommentWrapped} commentInput={commentInput} setCommentInput={setCommentInput} setStageStatus={setStageStatusDirect} approvedStages={approvedStages} approveStage={approveStage} isAdmin={isAdmin} assignments={assignments} assignTask={assignTask} ck={ck} stageNameOverrides={stageNameOverrides} setStageNameOverride={setStageNameOverride} subtaskStages={subtaskStages} setSubtaskStage={setSubtaskStage} archivedStages={archivedStages} onPipelineClick={(pid) => setActiveSidebarPipeline(pid)} showMyAllFilter={true} defaultMyAllFilter={isAdmin ? "all" : "my"} pipelineWorkspaceMap={Object.fromEntries(allPipelines.map(p => [p.id, { id: currentWorkspaceId || "", name: currentWorkspace?.name || "", icon: currentWorkspace?.icon || "" }]))} />
                </Suspense>
              </ErrorBoundary>
            )}

            {view === "list" && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allPipelines.filter(p => {
                const q = searchQ.toLowerCase();
                const allPStages = [...p.stages, ...(customStages[p.id] || [])];
                const matchesSearch = !q || p.name.toLowerCase().includes(q) || allPStages.some(s => s.toLowerCase().includes(q));
                const matchesFilter = !statusFilter || (statusFilter === "claimed" ? allPStages.some(s => (claims[s] || []).includes(currentUser!)) : allPStages.some(s => getStatus(s) === statusFilter));
                return matchesSearch && matchesFilter;
              }).map(p => {
                const isO = expanded.includes(p.id);
                const pipeMeta = pipeMetaOverrides[p.id] || {};
                const pipeName = pipeMeta.name ?? p.name;
                const pipePriority = pipeMeta.priority ?? p.priority;
                const pipeDesc = pipeDescOverrides[p.id] ?? p.desc;
                const allPStages = [...p.stages, ...(customStages[p.id] || [])];
                const pC = ck[p.colorKey] || t.accent;
                const prC = pr[pipePriority as keyof typeof pr] || { c: t.textMuted };
                const statusWeight: Record<string, number> = { concept: 0, planned: 25, "in-progress": 60, active: 100 };
                const pct = allPStages.length > 0 ? Math.round(allPStages.reduce((sum, s) => sum + (statusWeight[getStatus(s)] || 0), 0) / allPStages.length) : 0;
                const uClaim = [...new Set(allPStages.flatMap(s => claims[s] || []))];
                const allPipelineClaimed = allPStages.length > 0 && allPStages.every(s => (claims[s] || []).includes(currentUser!));
                const pipeReactKey = `_pipe_${p.id}`;
                const pipeReactions = reactions[pipeReactKey] || {};
                const pipeReactExist = Object.entries(pipeReactions).filter(([, v]) => v.length > 0);
                return (
                  <div key={p.id} style={{ background: t.bgCard, border: `1px solid ${isO ? pC + "33" : t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: isO ? t.shadowLg : t.shadow, transition: "all 0.25s" }}>
                    <div style={{ height: 2, background: t.surface }}><div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: `linear-gradient(90deg,${pC},${pC}aa)`, transition: "width 0.5s" }} /></div>
                    <div onClick={() => toggleExpand(p.id)} style={{ padding: "12px 16px", cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1 }}>
                          <Chev open={isO} color={pC} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                              <span style={{ fontSize: 16 }}>{p.icon}</span>
                              {editingPipeName === p.id ? (
                                <input value={pipeName} onChange={e => setPipeMetaOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), name: e.target.value } }))} onBlur={() => setEditingPipeName(null)} onKeyDown={e => { if (e.key === "Enter") setEditingPipeName(null); }} autoFocus onClick={e => e.stopPropagation()} style={{ fontSize: 15, fontWeight: 900, color: t.text, background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "0 8px", outline: "none", fontFamily: "inherit" }} />
                              ) : (
                                <span style={{ fontSize: 15, fontWeight: 900, color: t.text }}>{pipeName}</span>
                              )}
                              <span style={{ fontSize: 10, color: pC, background: pC + "12", padding: "0 8px", borderRadius: 8, fontWeight: 700 }}>{allPStages.length}</span>
                              <span onClick={e => { e.stopPropagation(); cyclePriority(p.id, pipePriority); }} style={{ fontSize: 10, color: prC.c, background: prC.c + "12", padding: "0 8px", borderRadius: 8, fontWeight: 800, cursor: "pointer" }} title="Click to cycle">{pipePriority}</span>
                              {pct > 0 && <span style={{ fontSize: 10, color: pC, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700 }}>{pct}%</span>}
                            </div>
                            {editingPipeDesc === p.id ? (
                              <textarea value={pipeDesc} onChange={e => setPipeDescOverrides(prev => ({ ...prev, [p.id]: e.target.value }))} onBlur={() => setEditingPipeDesc(null)} autoFocus onClick={e => e.stopPropagation()} rows={2} style={{ width: "100%", background: t.bgHover, border: `1px solid ${pC}44`, borderRadius: 8, padding: "4px 8px", fontSize: 13, color: t.textSec, fontFamily: "var(--font-dm-sans), sans-serif", outline: "none", resize: "none", lineHeight: 1.5, marginBottom: 0 }} />
                            ) : (
                              <p onClick={e => { e.stopPropagation(); setEditingPipeDesc(p.id); }} style={{ fontSize: 13, color: t.textSec, margin: "0 0 0", lineHeight: 1.4, cursor: "text", display: "flex", alignItems: "baseline", gap: 4 }}>
                                <span>{pipeDesc || <span style={{ fontStyle: "italic", opacity: 0.5 }}>Add description...</span>}</span>
                                <span style={{ fontSize: 10, color: t.textDim, opacity: 0.4, flexShrink: 0 }}>{"✎"}</span>
                              </p>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => sharePipeline(p.id, pipeName, pipeDesc, pipePriority, p.totalHours, allPStages)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: copied === `pipe-${p.id}` ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace" }}>{copied === `pipe-${p.id}` ? "✓ copied" : "📋 copy"}</button>
                              <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                                {reactOpen === pipeReactKey
                                  ? <>{REACTIONS.map(r => { const us = pipeReactions[r] || []; const mine = us.includes(currentUser!); return (<button key={r} onClick={() => handleReact(pipeReactKey, r)} style={{ background: mine ? pC + "22" : us.length > 0 ? t.surface : "transparent", border: "none", borderRadius: 8, padding: "0 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit", opacity: us.length > 0 ? 1 : 0.4 }}><span style={{ fontSize: us.length > 0 ? 12 : 10 }}>{r}</span>{us.length > 0 && <span style={{ fontSize: 10, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{us.length}</span>}</button>); })}<button onClick={() => setReactOpen(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "0 4px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>done</button></>
                                  : <>{pipeReactExist.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (<button key={emoji} onClick={() => handleReact(pipeReactKey, emoji)} style={{ background: mine ? pC + "18" : t.surface, border: "none", borderRadius: 8, padding: "0 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit" }}><span style={{ fontSize: 13 }}>{emoji}</span><span style={{ fontSize: 10, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{arr.length}</span></button>); })}
                                  <button onClick={() => setReactOpen(pipeReactKey)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "0 8px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>+ react</button></>
                                }
                              </div>
                              <button onClick={() => toggleExpand(p.id)} style={{ background: isO ? pC + "15" : "transparent", border: `1px solid ${isO ? pC + "44" : t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: isO ? pC : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{isO ? "▾ collapse" : "▸ details"}</button>
                              {!allPipelineClaimed ? (
                                <button onClick={() => { allPStages.forEach(s => { if (!(claims[s] || []).includes(currentUser!)) handleClaimWithAnim(s); }); }} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: pC, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>{"💀"} claim all</button>
                              ) : (
                                <button onClick={() => { allPStages.forEach(s => { if ((claims[s] || []).includes(currentUser!)) handleClaimWithAnim(s); }); }} style={{ background: t.green + "15", border: `1px solid ${t.green}44`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }} title="Click to unclaim all">{"✓"} all claimed</button>
                              )}
                              {uClaim.length > 0 && <div style={{ display: "flex", marginLeft: 0 }}>{uClaim.slice(0, 5).map(uid => { const u = users.find(u => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={16} /></div> : null; })}</div>}
                            </div>
                          </div>
                        </div>
                        {isMobile && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
                            <div style={{ position: "relative" }}>
                              <button onClick={e => { e.stopPropagation(); setPipeMenuOpen(pipeMenuOpen === p.id ? null : p.id); }} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, padding: "4px 8px", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}>⋮</button>
                              {pipeMenuOpen === p.id && (
                                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, zIndex: 50, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "fadeIn 0.15s ease" }}>
                                  <button onClick={e => { e.stopPropagation(); setEditingPipeName(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>✎ rename pipeline</button>
                                  <button onClick={e => { e.stopPropagation(); setEditingPipeDesc(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>✎ edit description</button>
                                  <button onClick={e => { e.stopPropagation(); toggleExpand(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>{isO ? "collapse" : "expand stages"}</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="bu-pipe-right" style={{ textAlign: "right", flexShrink: 0, marginLeft: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: pC, fontFamily: "var(--font-dm-mono), monospace" }}>{p.totalHours}</div>
                          </div>
                          <div style={{ display: "flex", gap: 0, justifyContent: "flex-end" }}>{allPStages.map((s, i) => { const stC = sc[getStatus(s)] || { c: t.textDim }; return <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: stC.c + "33", border: `1px solid ${stC.c}` }} />; })}</div>
                          <div style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>{p.points}pts</div>
                        </div>
                      </div>
                      {!isO && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, paddingLeft: 20 }}>
                        {allPStages.map((s, i) => {
                          const stC = sc[getStatus(s)] || { c: t.textDim };
                          const isClaimed = (claims[s] || []).length > 0;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                              <span style={{ fontSize: 10, color: stC.c, background: stC.c + "0a", padding: "0 4px", borderRadius: 8, fontFamily: "var(--font-dm-mono), monospace", border: isClaimed ? `1px solid ${stC.c}22` : "1px solid transparent" }}>{s}</span>
                              {i < allPStages.length - 1 && <span style={{ color: t.textDim, fontSize: 10 }}>{"→"}</span>}
                            </div>
                          );
                        })}
                      </div>}
                    </div>
                    {isO && (
                      <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>
                        <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
                          {allPStages.map((s, i) => <div key={`${p.id}-${s}`} id={`stage-${s}`}><Stage name={s} idx={i} tot={allPStages.length} pC={pC} pId={p.id} isMobile={isMobile} isTopClaim={s === topClaimStageName} {...stageProps} /></div>)}
                        </div>
                        <div style={{ display: "flex", gap: 4, marginTop: 8, paddingLeft: 24 }} onClick={e => e.stopPropagation()}>
                          <input value={newStageInput[p.id] || ""} onChange={e => setNewStageInput(prev => ({ ...prev, [p.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addCustomStageLocal(p.id); }} placeholder="+ add stage..." style={{ flex: 1, background: "transparent", border: `1px dashed ${pC}33`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }} />
                          <button onClick={() => addCustomStageLocal(p.id)} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: pC, fontWeight: 700, fontFamily: "inherit" }}>add</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!addingPipeline ? (
                <button onClick={() => setAddingPipeline(true)} style={{ background: "transparent", border: `2px dashed ${t.border}`, borderRadius: 16, padding: "16px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center", width: "100%" }}>+ new pipeline</button>
              ) : (
                <div style={{ background: t.bgCard, border: `1px solid ${t.accent}33`, borderRadius: 16, padding: "20px" }}>
                  <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "var(--font-dm-mono), monospace" }}>new pipeline</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {ICON_OPTIONS.map(ico => (<button key={ico} onClick={() => setNewPipeForm(p => ({ ...p, icon: ico }))} style={{ background: newPipeForm.icon === ico ? t.accent + "22" : "transparent", border: `1px solid ${newPipeForm.icon === ico ? t.accent + "66" : t.border}`, borderRadius: 8, padding: "4px 4px", cursor: "pointer", fontSize: 16 }}>{ico}</button>))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <input value={newPipeForm.name} onChange={e => setNewPipeForm(p => ({ ...p, name: e.target.value }))} placeholder="Pipeline name *" autoFocus style={{ flex: "1 1 200px", background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none", fontWeight: 700 }} />
                    <input value={newPipeForm.desc} onChange={e => setNewPipeForm(p => ({ ...p, desc: e.target.value }))} placeholder="Short description" style={{ flex: "2 1 280px", background: t.bgHover, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: t.text, fontFamily: "inherit", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>PRIORITY:</span>
                    {PRIORITY_CYCLE.map(p => <button key={p} onClick={() => setNewPipeForm(prev => ({ ...prev, priority: p }))} style={{ background: newPipeForm.priority === p ? (pr[p]?.c || t.accent) + "22" : "transparent", border: `1px solid ${newPipeForm.priority === p ? (pr[p]?.c || t.accent) + "55" : t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: newPipeForm.priority === p ? pr[p]?.c || t.accent : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{p}</button>)}
                    <span style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginLeft: 8 }}>COLOR:</span>
                    {COLOR_OPTIONS.map(c => <div key={c} onClick={() => setNewPipeForm(p => ({ ...p, colorKey: c }))} style={{ width: 14, height: 14, borderRadius: "50%", background: ck[c], cursor: "pointer", border: newPipeForm.colorKey === c ? `2px solid ${t.text}` : "2px solid transparent", flexShrink: 0 }} />)}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={addCustomPipelineLocal} disabled={!newPipeForm.name.trim()} style={{ background: t.accent, border: "none", borderRadius: 12, padding: "8px 20px", cursor: newPipeForm.name.trim() ? "pointer" : "not-allowed", fontSize: 13, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", opacity: newPipeForm.name.trim() ? 1 : 0.45, transition: "opacity 0.15s" }}>create pipeline</button>
                    <button onClick={() => setAddingPipeline(false)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>cancel</button>
                  </div>
                </div>
              )}
            </div>}
          </div>)}

          {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.color === t.green ? `linear-gradient(135deg,${t.bgCard},${t.green}18)` : t.bgCard, border: `1.5px solid ${toast.color}55`, borderRadius: 16, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 40px ${toast.color}22`, animation: "slideUp 0.3s ease", zIndex: 100, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: toast.color === t.green ? 20 : 13 }}>{toast.color === t.green ? "⚡" : "💀"}</span>
            <span style={{ fontSize: 13, color: toast.color === t.green ? toast.color : t.text, fontWeight: 800 }}>{toast.text}</span>
            <span style={{ fontSize: 13, color: t.textSec, fontWeight: 700 }}>{toast.pts}</span>
          </div>}

          {chatNotif && (
            <div style={{ position: "fixed", bottom: 80, right: 16, maxWidth: "min(300px, calc(100vw - 32px))", background: t.bgCard, border: `1px solid ${chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent}44`, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8, boxShadow: t.shadowLg, animation: "slideUp 0.25s ease", zIndex: 600, fontFamily: "var(--font-dm-mono), monospace" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{chatNotif.isClaim ? "🤝" : chatNotif.isReaction ? "⚡" : chatNotif.isComment ? "💬" : "👀"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: chatNotif.isClaim ? t.accent : chatNotif.isReaction ? t.green : t.accent, marginBottom: 4 }}>{chatNotif.name}</div>
                <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, wordBreak: "break-word" }}>{chatNotif.text.length > 80 ? chatNotif.text.slice(0, 80) + "…" : chatNotif.text}</div>
                {chatNotif.isComment && chatNotif.stage && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>on {chatNotif.stage}</div>}
              </div>
              <button onClick={() => setChatNotif(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textDim, fontSize: 15, padding: 0, marginLeft: 4, flexShrink: 0 }}>×</button>
            </div>
          )}
        </div>
        </>
      )}
      </div>

      {/* WORKSPACE MODALS */}
      {workspaceModal === "create" && (
        <Suspense fallback={null}>
          <CreateWorkspaceModal t={t} users={users} ck={ck} onClose={() => setWorkspaceModal(null)} onCreate={(name, icon, colorKey) => createWorkspace(name, icon, colorKey)} />
        </Suspense>
      )}
      {workspaceModal === "manage" && currentWorkspace && currentUser && (
        <Suspense fallback={null}>
          <ManageWorkspaceModal t={t} users={users} ck={ck} workspace={currentWorkspace} currentUser={currentUser} onClose={() => setWorkspaceModal(null)} onAddMember={(uid) => addMemberToWorkspace(currentWorkspace.id, uid)} onRemoveMember={(uid) => removeMemberFromWorkspace(currentWorkspace.id, uid)} onSetRank={(uid, rank) => setMemberRank(currentWorkspace.id, uid, rank)} onDelete={() => deleteWorkspace(currentWorkspace.id)} />
        </Suspense>
      )}

      {/* AVATAR PICKER */}
      {showAvatarPicker && selUser && (() => {
        const pickerUser = users.find(u => u.id === selUser);
        if (!pickerUser) return null;
        const AnimBgPicker = () => <FloatingBg colors={[pickerUser.color, pickerUser.color + "88", t.accent + "44", pickerUser.color + "44"]} themeStyle={themeId} />;
        return (
          <AvatarStep6 t={t} user={pickerUser as UserType} selAvatar={selAvatar} setSelAvatar={setSelAvatar} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} setOnboardStep={() => {}} selUser={selUser} AnimBg={AnimBgPicker} onClose={() => setShowAvatarPicker(false)} onConfirm={() => setShowAvatarPicker(false)} />
        );
      })()}

      {/* Documents BottomSheet — mobile only */}
      {isMobile && (
        <BottomSheet open={showDocumentsMobile} onClose={() => setShowDocumentsMobile(false)} title="// documents" t={t}>
          <ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}>
            <Suspense fallback={null}><DocumentsPanel t={t} initialDocId={paletteDocId} /></Suspense>
          </ErrorBoundary>
        </BottomSheet>
      )}

      {/* CHAT */}
      {isMobile ? (
        <BottomSheet open={showChat} onClose={() => setShowChat(false)} title="// team chat" t={t}>
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<ChatSkeleton t={t} />}>
              <ChatPanel messages={chatMessages} onSend={sendChat} onRemoteMessage={handleRemoteMessage} users={users} currentUser={currentUser!} t={t} defaultTab={chatDefaultTab} onLoadMore={loadMoreMessages} hasMore={hasMoreMessages} buildAiContext={buildAiContext} />
            </Suspense>
          </ErrorBoundary>
        </BottomSheet>
      ) : showChat ? (
        <div style={{ position: "fixed", bottom: 160, right: 16, width: "min(340px, calc(100vw - 32px))", zIndex: 500, animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowChat(false)} style={{ position: "absolute", top: 10, right: 12, zIndex: 10, background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: t.textMuted, lineHeight: 1, padding: 0 }} title="Close chat">{"×"}</button>
            <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
              <Suspense fallback={<ChatSkeleton t={t} />}>
                <ChatPanel messages={chatMessages} onSend={sendChat} onRemoteMessage={handleRemoteMessage} users={users} currentUser={currentUser!} t={t} defaultTab={chatDefaultTab} onLoadMore={loadMoreMessages} hasMore={hasMoreMessages} buildAiContext={buildAiContext} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      ) : null}

      {/* FAB — Team chat */}
      <button onClick={e => { e.stopPropagation(); setChatDefaultTab("team"); setShowChat(true); setChatNotif(null); }} title="Team chat" aria-label="Open team chat" style={{ position: "fixed", bottom: 88, right: 24, zIndex: 600, width: 48, height: 48, borderRadius: "50%", background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: `0 2px 12px rgba(0,0,0,0.25)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.2s" } as React.CSSProperties}>
        💬
        {chatNotif && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}` }} />}
      </button>

      {/* FAB — AI chat */}
      <button onClick={e => { e.stopPropagation(); setChatDefaultTab("ai"); setShowChat(prev => !prev); }} title={showChat && chatDefaultTab === "ai" ? "Close" : "Ask Binayah AI"} style={{ position: "fixed", bottom: 24, right: 24, zIndex: 600, width: 54, height: 54, borderRadius: "50%", background: (showChat && chatDefaultTab === "ai") ? t.surface : `linear-gradient(135deg, ${t.accent}, ${t.purple || t.accent})`, border: `1px solid ${(showChat && chatDefaultTab === "ai") ? t.border : "transparent"}`, boxShadow: (showChat && chatDefaultTab === "ai") ? "none" : `0 4px 24px ${t.accent}55, 0 2px 8px rgba(0,0,0,0.3)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: (showChat && chatDefaultTab === "ai") ? 20 : 22, transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)", transform: (showChat && chatDefaultTab === "ai") ? "scale(0.9) rotate(90deg)" : "scale(1) rotate(0deg)", animation: (showChat && chatDefaultTab === "ai") ? "none" : "fabPulse 3s ease-in-out infinite" }}>
        {(showChat && chatDefaultTab === "ai") ? "×" : "🤖"}
      </button>
      <style>{`@keyframes fabPulse { 0%, 100% { box-shadow: 0 4px 24px ${t.accent}55, 0 2px 8px rgba(0,0,0,0.3); } 50% { box-shadow: 0 4px 32px ${t.accent}88, 0 2px 12px rgba(0,0,0,0.4); } }`}</style>

      {/* Cmd+K Search Palette */}
      <SearchPalette t={t} open={showPalette} onClose={() => setShowPalette(false)} onOpenStage={handlePaletteOpenStage} onOpenDocument={handlePaletteOpenDocument} onOpenPerson={handlePaletteOpenPerson} />

      {/* WELCOME MODAL */}
      {showWelcome && initialUserId && me && (
        <WelcomeModal user={me} t={t} themeId={themeId} setThemeId={setThemeId} isDark={isDark} setIsDark={setIsDark} onDismiss={handleWelcomeDismiss} />
      )}

      {/* Error toast stack */}
      <ToastContainer t={t} toasts={toasts} onDismiss={dismissToast} />

      {/* Archive FAB */}
      {!isMobile && (
        <button onClick={() => setShowArchive(v => !v)} title={showArchive ? "Close archive" : "View archive"} style={{ position: "fixed", bottom: 80, right: 28, width: 44, height: 44, borderRadius: "50%", background: showArchive ? t.amber + "22" : t.bgCard, border: `2px solid ${showArchive ? t.amber : t.border}`, color: showArchive ? t.amber : t.textMuted, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", transition: "all 0.2s", zIndex: 500 }}>📦</button>
      )}

      {/* Archive panel */}
      {showArchive && (
        <div style={{ position: "fixed", bottom: 132, right: 28, width: 340, maxHeight: "60vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 499, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>📦 archive</div></div>
          {archivedStages.length === 0 && archivedPipelines.length === 0 ? (
            <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>nothing archived yet</div>
          ) : (
            <>
              {archivedStages.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 6 }}>tasks ({archivedStages.length})</div>
                  {archivedStages.map(sid => (
                    <div key={sid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stageNameOverrides[sid] || sid}</span>
                      <button onClick={() => restoreStage(sid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
                    </div>
                  ))}
                </div>
              )}
              {archivedPipelines.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace", marginBottom: 6 }}>pipelines ({archivedPipelines.length})</div>
                  {archivedPipelines.map(pid => {
                    const p = allPipelinesGlobal.find(p => p.id === pid);
                    return (
                      <div key={pid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: t.bgHover, marginBottom: 4 }}>
                        <span style={{ flex: 1, fontSize: 12, color: t.text }}>{p?.icon} {pipeMetaOverrides[pid]?.name || p?.name || pid}</span>
                        <button onClick={() => restorePipeline(pid)} style={{ background: t.green + "18", border: `1px solid ${t.green}44`, borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>restore</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
