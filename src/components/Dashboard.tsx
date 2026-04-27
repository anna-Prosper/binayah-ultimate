"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import BottomSheet from "@/components/ui/BottomSheet";
import { signOut } from "next-auth/react";
import { lsGet, lsSet, checkSchemaVersion, clearAllLsKeys } from "@/lib/storage";
import { mkTheme, THEME_OPTIONS } from "@/lib/themes";
import { pipelineData, stageDefaults, USERS_DEFAULT, REACTIONS, STATUS_ORDER, ADMIN_IDS, DEFAULT_WORKSPACE_ID, type UserType, type SubtaskItem, type CommentItem, type ActivityItem, type Workspace } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import { Chev, NB } from "@/components/ui/primitives";
import { AvatarStep6, FloatingBg } from "@/components/Onboarding";
import WelcomeModal from "@/components/WelcomeModal";
import SearchFilter from "@/components/SearchFilter";
import Stage from "@/components/Stage";
import { type ChatMsg } from "@/components/ChatPanel";
import { fetchState, patchState, pushMessage, pushComment, pushActivity } from "@/lib/apiSync";
import { ToastContainer, RecoveryToast, useToasts } from "@/components/ui/Toast";
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
const ChatPanel = dynamic(() => import("@/components/ChatPanel"), {
  ssr: false, // uses localStorage + browser APIs
});
const ActivityFeed = dynamic(() => import("@/components/ActivityFeed"), {
  ssr: false,
});
const TasksView = dynamic(() => import("@/components/TasksView"), {
  ssr: false,
});
const HomeView = dynamic(() => import("@/components/HomeView"), {
  ssr: false,
});
const CreateWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.CreateWorkspaceModal), { ssr: false });
const ManageWorkspaceModal = dynamic(() => import("@/components/WorkspaceAdmin").then(m => m.ManageWorkspaceModal), { ssr: false });
const KanbanView = dynamic(() => import("@/components/KanbanView"), {
  ssr: false, // drag-and-drop is browser-only
});
const OverviewPanel = dynamic(() => import("@/components/OverviewPanel"), {
  ssr: false,
});
const DocumentsPanel = dynamic(() => import("@/components/DocumentsPanel"), {
  ssr: false,
  loading: () => null,
});

type CustomPipeline = {
  id: string; name: string; desc: string; icon: string;
  colorKey: string; priority: string; totalHours: string; points: number; stages: string[];
};

// Always take name/role/avatar/color from USERS_DEFAULT — only preserve aiAvatar from saved state
function hydrateUsers(saved: UserType[], current: UserType[] = []): UserType[] {
  const savedMap = Object.fromEntries(saved.map(u => [u.id, u]));
  const currentMap = Object.fromEntries(current.map(u => [u.id, u]));
  return USERS_DEFAULT.map(def => ({
    ...def,
    // Local avatar wins over API — prevents poll from overwriting a freshly picked avatar
    avatar: currentMap[def.id]?.avatar || savedMap[def.id]?.avatar || "",
    aiAvatar: currentMap[def.id]?.aiAvatar || savedMap[def.id]?.aiAvatar,
  })) as UserType[];
}

const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;
const COLOR_OPTIONS = ["blue", "purple", "green", "amber", "cyan", "red", "orange", "lime", "slate"] as const;
const ICON_OPTIONS = ["\uD83D\uDD27", "\uD83D\uDE80", "\uD83D\uDCA1", "\uD83C\uDFAF", "\u26A1", "\uD83D\uDD25", "\uD83E\uDD16", "\uD83D\uDCA5", "\u2728", "\uD83D\uDCCA"];

export default function Dashboard({ initialUserId }: { initialUserId?: string }) {
  // Schema version recovery — runs synchronously before any state reads
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
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    // Session always wins — enforce match on init
    if (initialUserId) return initialUserId;
    return lsGet("currentUser", null);
  });
  const [users, setUsers] = useState(() => {
    // Always hydrate from USERS_DEFAULT so name/role/avatar changes take effect
    // without clearing cache. Only preserve aiAvatar (user-generated custom pfp).
    return hydrateUsers(lsGet("users", []) as UserType[]);
  });
  const [onboardStep] = useState(7); // legacy compat — always 7 now; identity from session
  // showWelcome: true on first login (localStorage key binayah_welcomed_<fixedUserId> is absent)
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === "undefined" || !initialUserId) return false;
    return !localStorage.getItem(`binayah_welcomed_${initialUserId}`);
  });

  // Sync session fixedUserId with localStorage on mount — session is authoritative
  useEffect(() => {
    if (initialUserId) {
      lsSet("currentUser", initialUserId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selUser, setSelUser] = useState<string | null>(null);
  const [selAvatar, setSelAvatar] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(() => lsGet("expanded", ["research"]));
  const [expS, setExpS] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>(() => lsGet("reactions", {}));
  const [claims, setClaims] = useState<Record<string, string[]>>(() => lsGet("claims", {}));
  const [assignments, setAssignments] = useState<Record<string, string>>(() => lsGet("assignments", {}));
  const [subtasks, setSubtasks] = useState<Record<string, SubtaskItem[]>>(() => lsGet("subtasks", {}));
  const [comments, setComments] = useState<Record<string, CommentItem[]>>(() => lsGet("comments", {}));
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [subtaskInput, setSubtaskInput] = useState<Record<string, string>>({});
  const [showMockup, setShowMockup] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [archivedStages, setArchivedStages] = useState<string[]>(() => lsGet("archivedStages", []));
  const [archivedPipelines, setArchivedPipelines] = useState<string[]>(() => lsGet("archivedPipelines", []));
  const [archivedSubtasks, setArchivedSubtasks] = useState<string[]>(() => lsGet("archivedSubtasks", []));
  const [showArchive, setShowArchive] = useState(false);
  const [claimAnim, setClaimAnim] = useState<{ stage: string; pts: number } | null>(null);
  const [toast, setToast] = useState<{ text: string; pts: string; color: string } | null>(null);
  const [liveNotifs, setLiveNotifs] = useState<Record<string, { comment?: string; reaction?: string }>>({});
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const viewingUserPopupRef = useRef<HTMLDivElement>(null);
  const [ptsFlash, setPtsFlash] = useState(false);
  const prevMyPtsRef = useRef(0);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [stageStatusOverrides, setStageStatusOverrides] = useState<Record<string, string>>(() => lsGet("stageStatusOverrides", {}));
  const [approvedStages, setApprovedStages] = useState<string[]>(() => lsGet("approvedStages", []));
  const [stageDescOverrides, setStageDescOverrides] = useState<Record<string, string>>(() => lsGet("stageDescOverrides", {}));
  const [stageNameOverrides, setStageNameOverrides] = useState<Record<string, string>>(() => lsGet("stageNameOverrides", {}));
  const [subtaskStages, setSubtaskStages] = useState<Record<string, string>>(() => lsGet("subtaskStages", {}));
  const [pipeDescOverrides, setPipeDescOverrides] = useState<Record<string, string>>(() => lsGet("pipeDescOverrides", {}));
  const [pipeMetaOverrides, setPipeMetaOverrides] = useState<Record<string, { name?: string; priority?: string }>>(() => lsGet("pipeMetaOverrides", {}));
  const [customStages, setCustomStages] = useState<Record<string, string[]>>(() => lsGet("customStages", {}));
  const [customPipelines, setCustomPipelines] = useState<CustomPipeline[]>(() => lsGet("customPipelines", []));
  // Workspaces: multi-tenant layer above pipelines. Each workspace owns its own pipelines, members, captains.
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => lsGet("workspaces", []));
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>(() => lsGet("currentWorkspaceId", DEFAULT_WORKSPACE_ID));
  const [workspaceModal, setWorkspaceModal] = useState<"create" | "manage" | null>(null);
  const [editingPipeDesc, setEditingPipeDesc] = useState<string | null>(null);
  const [editingPipeName, setEditingPipeName] = useState<string | null>(null);
  const [newStageInput, setNewStageInput] = useState<Record<string, string>>({});
  const [addingPipeline, setAddingPipeline] = useState(false);
  const [newPipeForm, setNewPipeForm] = useState({ name: "", desc: "", icon: "\uD83D\uDD27", colorKey: "blue", priority: "MEDIUM" });
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() => lsGet("activityLog", []));
  const [showActivity, setShowActivity] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatDefaultTab, setChatDefaultTab] = useState<"team" | "ai">("ai");
  const [view, setView] = useState<"list" | "kanban" | "overview">("list");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => lsGet("lastSeenActivity", 0));
  const [stageImages, setStageImages] = useState<Record<string, string[]>>(() => lsGet("stageImages", {}));
  // lockedPipelines: canonical list of locked pipeline IDs, persisted to MongoDB
  const [lockedPipelines, setLockedPipelines] = useState<string[]>(() => lsGet("lockedPipelines", []));
  // Pipeline lock removed in favor of explicit edit affordances.
  // Helper kept as a no-op for backward compatibility with callers.
  const isLocked = (_pipelineId: string) => false;
  const { toasts, showToast, dismissToast } = useToasts();
  const isMobile = useIsMobile(768);
  // Per-pipeline ⋮ menu open state for mobile header
  const [pipeMenuOpen, setPipeMenuOpen] = useState<string | null>(null);
  // Left sidebar nav — desktop only; persisted so user returns to where they left off
  const [activeNavItem, setActiveNavItem] = useState<NavItem>(() => {
    const saved = lsGet("binayah_activeNav", "home");
    // Migrate stale "now" → "home" (now tab was removed)
    const valid: NavItem[] = ["home", "pipelines", "documents", "activity", "chat"];
    return (valid.includes(saved as NavItem) ? saved : "home") as NavItem;
  });
  // Active pipeline in sidebar sub-list — remembers last selected pipeline
  const [activeSidebarPipeline, setActiveSidebarPipeline] = useState<string | null>(null);
  // Mobile documents sheet
  const [showDocumentsMobile, setShowDocumentsMobile] = useState(false);
  // Cmd+K search palette
  const [showPalette, setShowPalette] = useState(false);
  // Doc to open in DocumentsPanel (from palette routing)
  const [paletteDocId, setPaletteDocId] = useState<string | null>(null);

  // Schema version recovery — clear stale cache and reload
  useEffect(() => {
    if (!isRecovering) return;
    clearAllLsKeys();
    const timer = setTimeout(() => {
      window.location.reload();
    }, 2500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cmd+K / Ctrl+K global search palette trigger ──────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette(prev => !prev);
      }
      // S-1: Escape closes viewingUser popup
      if (e.key === "Escape") {
        setViewingUser(null);
        setShowThemePicker(false);
        setReactOpen(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // S-1: Click-outside detection for viewingUser popup
  useEffect(() => {
    if (!viewingUser) return;
    const handler = (e: MouseEvent) => {
      if (viewingUserPopupRef.current && !viewingUserPopupRef.current.contains(e.target as Node)) {
        setViewingUser(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [viewingUser]);

  // One-time migration: pre-themeV2 users default to dark going forward
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("binayah_themeV2")) {
      localStorage.setItem("binayah_themeV2", "1");
    }
  }, []);
  useEffect(() => { lsSet("isDark", isDark) }, [isDark]);
  useEffect(() => { lsSet("themeId", themeId) }, [themeId]);
  // Sync body background to match theme — fixes body bleeding through in areas outside Dashboard div
  useEffect(() => { document.body.style.background = mkTheme(themeId, isDark).bg; }, [isDark, themeId]);
  useEffect(() => { lsSet("currentUser", currentUser) }, [currentUser]);
  useEffect(() => { lsSet("users", users) }, [users]);
  // onboardStep is no longer dynamic — removed LS sync
  useEffect(() => { lsSet("reactions", reactions) }, [reactions]);
  useEffect(() => { lsSet("claims", claims) }, [claims]);
  useEffect(() => { lsSet("assignments", assignments) }, [assignments]);
  useEffect(() => { lsSet("subtasks", subtasks) }, [subtasks]);
  useEffect(() => { lsSet("comments", comments) }, [comments]);
  useEffect(() => { lsSet("stageStatusOverrides", stageStatusOverrides) }, [stageStatusOverrides]);
  useEffect(() => { lsSet("approvedStages", approvedStages) }, [approvedStages]);
  useEffect(() => { lsSet("stageImages", stageImages) }, [stageImages]);
  useEffect(() => { lsSet("lockedPipelines", lockedPipelines) }, [lockedPipelines]);

  // Deep-link: ?pipeline=<name>&stage=<name> from email CTAs
  // Expand the target pipeline, expand the stage card, and scroll to it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetPipeline = params.get("pipeline");
    const targetStage = params.get("stage");
    if (!targetPipeline && !targetStage) return;

    // Find the pipeline in static + custom data by name or id
    const allPipelines = [
      ...pipelineData,
      ...customPipelines.map(cp => ({ id: cp.id, name: cp.name, stages: cp.stages })),
    ];

    let pipelineId: string | null = null;
    if (targetPipeline) {
      const found = allPipelines.find(
        p => p.name === targetPipeline || p.id === targetPipeline
      );
      if (found) pipelineId = found.id;
    }

    // Expand the pipeline
    if (pipelineId) {
      setExpanded(prev => prev.includes(pipelineId!) ? prev : [...prev, pipelineId!]);
    }

    // Expand the stage card and scroll to it after a short delay (render cycle)
    if (targetStage) {
      setExpS(targetStage);
      setTimeout(() => {
        const el = document.getElementById(`stage-${CSS.escape(targetStage)}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  // Run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate pts counter when points increase
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

  // Points celebration — fires when a stage is ADMIN-APPROVED while currentUser is a claimer
  const prevApprovedRef = useRef<string[]>([]);
  useEffect(() => {
    if (!currentUser || !isInitializedRef.current) { prevApprovedRef.current = [...approvedStages]; return; }
    approvedStages.forEach(stage => {
      if (!prevApprovedRef.current.includes(stage)) {
        const claimers = claims[stage] || [];
        if (claimers.includes(currentUser)) {
          const pts = stageDefaults[stage]?.points || 10;
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
  useEffect(() => { lsSet("stageDescOverrides", stageDescOverrides) }, [stageDescOverrides]);
  useEffect(() => { lsSet("pipeDescOverrides", pipeDescOverrides) }, [pipeDescOverrides]);
  useEffect(() => { lsSet("pipeMetaOverrides", pipeMetaOverrides) }, [pipeMetaOverrides]);
  useEffect(() => { lsSet("customStages", customStages) }, [customStages]);
  useEffect(() => { lsSet("customPipelines", customPipelines) }, [customPipelines]);
  useEffect(() => { lsSet("workspaces", workspaces) }, [workspaces]);
  useEffect(() => { lsSet("archivedStages", archivedStages) }, [archivedStages]);
  useEffect(() => { lsSet("archivedPipelines", archivedPipelines) }, [archivedPipelines]);
  useEffect(() => { lsSet("archivedSubtasks", archivedSubtasks) }, [archivedSubtasks]);
  useEffect(() => { lsSet("currentWorkspaceId", currentWorkspaceId) }, [currentWorkspaceId]);

  // One-time workspace migration: seed "War Room" with all existing pipelines,
  // all users as members, Anna (ADMIN_IDS[0]) as captain.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (workspaces.length > 0) return;
    const allIds = [...pipelineData.map(p => p.id), ...customPipelines.map(p => p.id)];
    const warRoom: Workspace = {
      id: DEFAULT_WORKSPACE_ID,
      name: "Binayah AI",
      icon: "🤖",
      colorKey: "purple",
      members: USERS_DEFAULT.map(u => u.id),
      captains: [...ADMIN_IDS],
      firstMates: [],
      pipelineIds: allIds,
    };
    setWorkspaces([warRoom]);
    if (!currentWorkspaceId) setCurrentWorkspaceId(DEFAULT_WORKSPACE_ID);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Migrate existing users who already have the "War Room" workspace
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => prev.map(w =>
      w.name === "War Room" ? { ...w, name: "Binayah AI", icon: "🤖" } : w
    ));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { lsSet("expanded", expanded) }, [expanded]);
  useEffect(() => { lsSet("activityLog", activityLog) }, [activityLog]);
  useEffect(() => { lsSet("view", view) }, [view]);
  useEffect(() => { lsSet("binayah_activeNav", activeNavItem) }, [activeNavItem]);
  useEffect(() => { lsSet("lastSeenActivity", lastSeenActivity) }, [lastSeenActivity]);

  // --- Cross-device sync via Render API ---
  const isInitializedRef = useRef(false); // prevents writing stale localStorage over API on mount
  const isPollUpdateRef = useRef(false);  // prevents poll-triggered writes looping back to API
  const lastWriteRef = useRef<number>(0);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownMsgCount = useRef<number>(chatMessages.length);
  const [chatNotif, setChatNotif] = useState<{ name: string; text: string; isComment?: boolean; stage?: string; isReaction?: boolean; isClaim?: boolean } | null>(null);
  const knownCommentsRef = useRef<Record<string, number>>({});
  const prevClaimsRef = useRef<Record<string, string[]>>({});
  const prevReactionsRef = useRef<Record<string, Record<string, string[]>>>({});
  const prevStatusRef = useRef<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [isHydrating, setIsHydrating] = useState(true);

  const playNotifSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.25);
    } catch { /* AudioContext blocked in some contexts */ }
  }, []);

  // On mount: fetch API state first, THEN allow writes
  useEffect(() => {
    fetchState().then(s => {
      if (s && Object.keys(s).length > 0) {
        if (s.claims) { prevClaimsRef.current = s.claims as Record<string, string[]>; setClaims(s.claims); }
        if (s.reactions) { prevReactionsRef.current = s.reactions as Record<string, Record<string, string[]>>; setReactions(s.reactions); }
        if (s.activityLog) setActivityLog(s.activityLog);
        if (s.subtasks) setSubtasks(s.subtasks as Record<string, SubtaskItem[]>);
        if (s.comments) {
          setComments(s.comments as Record<string, CommentItem[]>);
          for (const [stage, msgs] of Object.entries(s.comments)) {
            knownCommentsRef.current[stage] = (msgs as CommentItem[]).length;
          }
        }
        if (s.stageStatusOverrides) setStageStatusOverrides(s.stageStatusOverrides);
        if (s.stageDescOverrides) setStageDescOverrides(s.stageDescOverrides);
        if (s.stageNameOverrides) setStageNameOverrides(s.stageNameOverrides);
        if (s.subtaskStages) setSubtaskStages(s.subtaskStages);
        if (s.pipeDescOverrides) setPipeDescOverrides(s.pipeDescOverrides);
        if (s.pipeMetaOverrides) setPipeMetaOverrides(s.pipeMetaOverrides as Record<string, { name?: string; priority?: string }>);
        if (s.customStages) setCustomStages(s.customStages);
        if (s.customPipelines) setCustomPipelines(s.customPipelines as CustomPipeline[]);
        if (s.lockedPipelines) setLockedPipelines(s.lockedPipelines as string[]);
        if (s.users) setUsers(prev => hydrateUsers(s.users as UserType[], prev));
        if (s.workspaces && Array.isArray(s.workspaces) && s.workspaces.length > 0) setWorkspaces(s.workspaces as Workspace[]);
        if (s.archivedStages) setArchivedStages(s.archivedStages as string[]);
        if (s.archivedPipelines) setArchivedPipelines(s.archivedPipelines as string[]);
        if (s.archivedSubtasks) setArchivedSubtasks(s.archivedSubtasks as string[]);
      }
      isInitializedRef.current = true;
      setSyncStatus("live");
      setIsHydrating(false);
    }).catch(() => {
      isInitializedRef.current = true;
      setSyncStatus("offline");
      setIsHydrating(false);
    });
    // Safety timeout: never block the UI for more than 3s
    const hydrationTimeout = setTimeout(() => setIsHydrating(false), 3000);
    return () => clearTimeout(hydrationTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 8 seconds — skip if we wrote in the last 2s to avoid self-overwrite
  useEffect(() => {
    const poll = () => {
      if (Date.now() - lastWriteRef.current < 2000) return;
      fetchState().then(s => {
        if (!s) { setSyncStatus("offline"); return; }
        setSyncStatus("live");
        isPollUpdateRef.current = true;
        if (s.claims) {
          const prev = prevClaimsRef.current;
          for (const [stage, claimers] of Object.entries(s.claims as Record<string, string[]>)) {
            const prevClaimers = prev[stage] || [];
            const newClaimers = claimers.filter(uid => !prevClaimers.includes(uid) && uid !== currentUser);
            if (newClaimers.length > 0) {
              const claimer = users.find(u => u.id === newClaimers[0]);
              setChatNotif({ name: claimer?.name || newClaimers[0], text: `claimed "${stage}"`, isClaim: true });
              playNotifSound();
              setTimeout(() => setChatNotif(null), 4000);
            }
          }
          prevClaimsRef.current = s.claims as Record<string, string[]>;
          setClaims(s.claims);
        }
        if (s.reactions) {
          const prev = prevReactionsRef.current;
          outer: for (const [stage, emojiMap] of Object.entries(s.reactions as Record<string, Record<string, string[]>>)) {
            const prevStage = prev[stage] || {};
            for (const [emoji, reactors] of Object.entries(emojiMap)) {
              const prevReactors = prevStage[emoji] || [];
              const newReactors = reactors.filter(uid => !prevReactors.includes(uid) && uid !== currentUser);
              if (newReactors.length > 0) {
                const reactor = users.find(u => u.id === newReactors[0]);
                setChatNotif({ name: reactor?.name || newReactors[0], text: `reacted ${emoji} on "${stage}"`, isReaction: true });
                playNotifSound();
                setTimeout(() => setChatNotif(null), 4000);
                // In-place reaction burst on the stage card
                setLiveNotifs(prev => ({ ...prev, [stage]: { ...prev[stage], reaction: emoji } }));
                setTimeout(() => setLiveNotifs(prev => { const n = { ...prev }; if (n[stage]) { delete n[stage].reaction; if (!Object.keys(n[stage]).length) delete n[stage]; } return n; }), 3500);
                break outer;
              }
            }
          }
          prevReactionsRef.current = s.reactions as Record<string, Record<string, string[]>>;
          setReactions(s.reactions);
        }
        if (s.activityLog) setActivityLog(s.activityLog);
        if (s.subtasks) setSubtasks(s.subtasks as Record<string, SubtaskItem[]>);
        if (s.comments) {
          let pendingCommentNotif: { name: string; text: string; isComment: true; stage: string } | null = null;
          let pendingLiveNotif: { stage: string; name: string } | null = null;
          setComments(prev => {
            const remote = s.comments as Record<string, CommentItem[]>;
            let changed = false;
            const merged: Record<string, CommentItem[]> = { ...prev };
            for (const [stage, msgs] of Object.entries(remote)) {
              const existing = prev[stage] || [];
              const existingIds = new Set(existing.map(m => m.id));
              const incoming = msgs.filter(m => !existingIds.has(m.id));
              if (incoming.length > 0) {
                merged[stage] = [...existing, ...incoming].sort((a, b) => a.id - b.id);
                changed = true;
                const foreign = incoming.find(m => m.by !== currentUser);
                if (foreign) {
                  const sender = users.find(u => u.id === foreign.by);
                  pendingCommentNotif = { name: sender?.name || foreign.by, text: foreign.text, isComment: true, stage };
                  pendingLiveNotif = { stage, name: sender?.name || foreign.by };
                }
                knownCommentsRef.current[stage] = merged[stage].length;
              }
            }
            return changed ? merged : prev;
          });
          if (pendingCommentNotif) {
            setChatNotif(pendingCommentNotif);
            playNotifSound();
            setTimeout(() => setChatNotif(null), 5000);
          }
          if (pendingLiveNotif) {
            const { stage: stg, name } = pendingLiveNotif;
            setLiveNotifs(prev => ({ ...prev, [stg]: { ...prev[stg], comment: name } }));
            setTimeout(() => setLiveNotifs(prev => { const n = { ...prev }; if (n[stg]) { delete n[stg].comment; if (!Object.keys(n[stg]).length) delete n[stg]; } return n; }), 4000);
          }
        }
        if (s.stageStatusOverrides) setStageStatusOverrides(s.stageStatusOverrides);
        if (s.stageDescOverrides) setStageDescOverrides(s.stageDescOverrides);
        if (s.stageNameOverrides) setStageNameOverrides(s.stageNameOverrides);
        if (s.subtaskStages) setSubtaskStages(s.subtaskStages);
        if (s.pipeDescOverrides) setPipeDescOverrides(s.pipeDescOverrides);
        if (s.pipeMetaOverrides) setPipeMetaOverrides(s.pipeMetaOverrides as Record<string, { name?: string; priority?: string }>);
        if (s.customStages) setCustomStages(s.customStages);
        if (s.customPipelines) setCustomPipelines(s.customPipelines as CustomPipeline[]);
        if (s.lockedPipelines) setLockedPipelines(s.lockedPipelines as string[]);
        if (s.users) setUsers(prev => hydrateUsers(s.users as UserType[], prev));
        if (s.workspaces && Array.isArray(s.workspaces) && s.workspaces.length > 0) setWorkspaces(s.workspaces as Workspace[]);
        // Reset flag after React has processed state updates
        setTimeout(() => { isPollUpdateRef.current = false; }, 50);
      });
    };
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  // Write shared state to API whenever it changes (debounced 800ms, only after init, not on poll updates)
  // NOTE: reactions are excluded here — handleReact owns its own direct patchState call to avoid double-write
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (isPollUpdateRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      lastWriteRef.current = Date.now();
      patchState({ claims, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides, subtaskStages, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines, users, workspaces, archivedStages, archivedPipelines, archivedSubtasks }).then(result => {
        if (!result.ok) {
          if ((result as { status?: number }).status === 423) {
            showToast("// pipeline is locked \u2014 unlock to make changes", t.amber);
            fetchState().then(s => { if (s?.lockedPipelines) setLockedPipelines(s.lockedPipelines as string[]); });
          } else {
            setSyncStatus("offline");
            showToast("// offline \u2014 changes saved locally", t.amber);
          }
        }
      });
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides, subtaskStages, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines, users]);

  // Auto-expand matching pipelines on search
  useEffect(() => {
    if (!searchQ) return;
    const q = searchQ.toLowerCase();
    const ids = [...pipelineData, ...customPipelines]
      .filter(p => p.name.toLowerCase().includes(q) || p.stages.some(s => s.toLowerCase().includes(q)))
      .map(p => p.id);
    setExpanded(prev => [...new Set([...prev, ...ids])]);
  }, [searchQ, customPipelines]);

  const getStatus = useCallback((name: string) => stageStatusOverrides[name] || stageDefaults[name]?.status || "concept", [stageStatusOverrides]);
  const logActivity = useCallback((type: string, target: string, detail: string) => {
    if (!currentUser) return;
    const entry = { type, user: currentUser, target, detail, time: Date.now() };
    setActivityLog(prev => [entry, ...prev.slice(0, 99)]);
    pushActivity(entry).then(result => {
      if (!result.ok) {
        setSyncStatus("offline");
      }
    });
  }, [currentUser]);

  const t = mkTheme(themeId, isDark);
  const sc: Record<string, { l: string; c: string }> = { active: { l: "live", c: t.green }, "in-progress": { l: "building", c: t.amber }, planned: { l: "planned", c: t.cyan || t.accent }, concept: { l: "concept", c: t.purple }, blocked: { l: "blocked", c: t.red } };
  const pr: Record<string, { c: string }> = { NOW: { c: t.red }, HIGH: { c: t.amber }, MEDIUM: { c: t.accent }, LOW: { c: t.textMuted } };
  const ck: Record<string, string> = { blue: t.accent, purple: t.purple, green: t.green, amber: t.amber, cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;
  // All pipelines that exist in the app (unscoped)
  const allPipelinesGlobal = [...pipelineData, ...customPipelines];
  // Pipelines scoped to the current workspace (fall back to all if workspaces haven't migrated yet)
  const allPipelines = currentWorkspace
    ? allPipelinesGlobal.filter(p => currentWorkspace.pipelineIds.includes(p.id))
    : allPipelinesGlobal;
  const myWorkspaces = workspaces.filter(w => currentUser ? w.members.includes(currentUser) : true);
  // Map stage name -> pipeline ID for lock checks
  const getPipelineForStage = (stageName: string): string | undefined => {
    for (const p of allPipelines) {
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      if (stages.includes(stageName)) return p.id;
    }
    return undefined;
  };
  const isStageInLockedPipeline = (stageName: string): boolean => {
    const pid = getPipelineForStage(stageName);
    return pid ? isLocked(pid) : false;
  };
  const allStages = [
    ...pipelineData.flatMap(p => p.stages),
    ...customPipelines.flatMap(p => p.stages),
    ...Object.values(customStages).flat(),
  ];
  const total = allStages.length;
  const bySt = (s: string) => allStages.filter(n => getStatus(n) === s).length;

  // Points only earned when stage is LIVE and admin-approved
  const getPoints = (uid: string) => {
    let p = 0;
    Object.entries(claims).forEach(([s, claimers]) => {
      if (claimers.includes(uid) && approvedStages.includes(s)) p += stageDefaults[s]?.points || 10;
    });
    Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if (r.includes(uid)) p += 2; }); });
    return p;
  };

  const isCaptainOfCurrent = !!currentUser && !!currentWorkspace && currentWorkspace.captains.includes(currentUser);
  const isFirstMateOfCurrent = !!currentUser && !!currentWorkspace && currentWorkspace.firstMates.includes(currentUser);
  const isOfficerOfCurrent = isCaptainOfCurrent || isFirstMateOfCurrent;
  // Legacy alias — kept for minimal refactor in downstream code. Treat as "can approve in current workspace".
  const isAdmin = isOfficerOfCurrent;
  const approveStage = (name: string) => {
    if (!isOfficerOfCurrent) { showToast("// only captain or first mate can approve", t.amber); return; }
    if (approvedStages.includes(name)) return;
    setApprovedStages(prev => [...prev, name]);
    logActivity("status", name, "→ approved");
  };

  // Per-user rank in current workspace — used for badges
  const userRankInCurrent = (uid: string): "captain" | "firstMate" | "crew" | null => {
    if (!currentWorkspace) return null;
    if (currentWorkspace.captains.includes(uid)) return "captain";
    if (currentWorkspace.firstMates.includes(uid)) return "firstMate";
    if (currentWorkspace.members.includes(uid)) return "crew";
    return null;
  };

  // ─── Workspace admin handlers ────────────────────────────────────────────
  // Archive handlers
  const archiveStage = (sid: string) => {
    setArchivedStages(prev => prev.includes(sid) ? prev : [...prev, sid]);
    showToast(`archived: ${stageNameOverrides[sid] || sid}`, t.textMuted);
    logActivity("claim", sid, "archived");
  };
  const restoreStage = (sid: string) => {
    setArchivedStages(prev => prev.filter(s => s !== sid));
    showToast(`restored: ${stageNameOverrides[sid] || sid}`, t.green);
  };
  const archivePipeline = (pid: string) => {
    setArchivedPipelines(prev => prev.includes(pid) ? prev : [...prev, pid]);
    showToast("pipeline archived", t.textMuted);
  };
  const restorePipeline = (pid: string) => {
    setArchivedPipelines(prev => prev.filter(p => p !== pid));
    showToast("pipeline restored", t.green);
  };
  const archiveSubtask = (key: string) => {
    setArchivedSubtasks(prev => prev.includes(key) ? prev : [...prev, key]);
  };
  const restoreSubtask = (key: string) => {
    setArchivedSubtasks(prev => prev.filter(k => k !== key));
  };

  const createWorkspace = (name: string, icon: string, colorKey: string) => {
    if (!currentUser) return;
    if (!workspaces.some(w => w.captains.includes(currentUser))) { showToast("// only a captain can create a workspace", t.amber); return; }
    const trimmed = name.trim();
    if (!trimmed) { showToast("// workspace needs a name", t.amber); return; }
    const id = `ws-${Date.now()}`;
    const newWs: Workspace = {
      id, name: trimmed, icon: icon || "🏴", colorKey: colorKey || "purple",
      members: [currentUser], captains: [currentUser], firstMates: [], pipelineIds: [],
    };
    setWorkspaces(prev => [...prev, newWs]);
    setCurrentWorkspaceId(id);
    setActiveSidebarPipeline(null);
    showToast(`// workspace "${trimmed}" created`, t.green);
    logActivity("claim", id, `created workspace ${trimmed}`);
  };

  const addMemberToWorkspace = (workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    const canManage = ws.captains.includes(currentUser) || ws.firstMates.includes(currentUser);
    if (!canManage) { showToast("// only captain/first mate can manage members", t.amber); return; }
    if (ws.members.includes(userId)) return;
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: [...w.members, userId] } : w));
  };

  const removeMemberFromWorkspace = (workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    const canManage = ws.captains.includes(currentUser) || ws.firstMates.includes(currentUser);
    if (!canManage) { showToast("// only captain/first mate can manage members", t.amber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId) { showToast("// can't remove the only captain", t.red); return; }
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? {
      ...w,
      members: w.members.filter(id => id !== userId),
      captains: w.captains.filter(id => id !== userId),
      firstMates: w.firstMates.filter(id => id !== userId),
    } : w));
  };

  const setMemberRank = (workspaceId: string, userId: string, rank: "captain" | "firstMate" | "crew") => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser)) { showToast("// only a captain can change ranks", t.amber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId && rank !== "captain") { showToast("// can't demote the only captain", t.red); return; }
    setWorkspaces(prev => prev.map(w => {
      if (w.id !== workspaceId) return w;
      const captains = w.captains.filter(id => id !== userId);
      const firstMates = w.firstMates.filter(id => id !== userId);
      if (rank === "captain") captains.push(userId);
      if (rank === "firstMate") firstMates.push(userId);
      return { ...w, captains, firstMates, members: w.members.includes(userId) ? w.members : [...w.members, userId] };
    }));
  };

  const deleteWorkspace = (workspaceId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser)) { showToast("// only a captain can delete", t.amber); return; }
    if (workspaces.length === 1) { showToast("// can't delete your last workspace", t.red); return; }
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    if (currentWorkspaceId === workspaceId) {
      const fallback = workspaces.find(w => w.id !== workspaceId && (currentUser ? w.members.includes(currentUser) : true));
      setCurrentWorkspaceId(fallback?.id || DEFAULT_WORKSPACE_ID);
    }
    showToast(`// workspace "${ws.name}" deleted`, t.amber);
  };

  const toggleExpand = (id: string) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const cyclePriority = (pid: string, cur: string) => {
    if (isLocked(pid)) { showToast("// pipeline is locked", t.amber); return; }
    const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(cur as typeof PRIORITY_CYCLE[number]) + 1) % PRIORITY_CYCLE.length];
    setPipeMetaOverrides(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), priority: next } }));
  };
  const addCustomStage = (pid: string) => {
    const val = newStageInput[pid]?.trim();
    if (!val) return;
    if (isLocked(pid)) { showToast("// pipeline is locked", t.amber); return; }
    setCustomStages(prev => ({ ...prev, [pid]: [...(prev[pid] || []), val] }));
    setNewStageInput(prev => ({ ...prev, [pid]: "" }));
  };
  const addCustomPipeline = () => {
    if (!newPipeForm.name.trim()) return;
    const id = `custom-${Date.now()}`;
    setCustomPipelines(prev => [...prev, { ...newPipeForm, id, totalHours: "?h", points: 0, stages: [] }]);
    if (currentWorkspaceId) {
      setWorkspaces(prev => prev.map(w => w.id === currentWorkspaceId && !w.pipelineIds.includes(id) ? { ...w, pipelineIds: [...w.pipelineIds, id] } : w));
    }
    setNewPipeForm({ name: "", desc: "", icon: "\uD83D\uDD27", colorKey: "blue", priority: "MEDIUM" });
    setAddingPipeline(false);
    setExpanded(prev => [...prev, id]);
  };
  const sendChat = (text: string) => {
    if (!currentUser) return;
    const msgId = Date.now();
    const msg: ChatMsg = { id: msgId, userId: currentUser, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    // Optimistic: add immediately
    setChatMessages(prev => [...prev, msg]);
    pushMessage(msg).then(result => {
      if (!result.ok) {
        // Rollback on failure
        setChatMessages(prev => prev.filter(m => m.id !== msgId));
        setSyncStatus("offline");
        showToast("// message lost \u2014 try again", t.red);
      }
    });
  };

    // SSE remote message handler — dedupe by id and append to chat messages state
  const handleRemoteMessage = useCallback((msg: ChatMsg) => {
    let pendingNotif: { name: string; text: string } | null = null;
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev; // already present (optimistic or poll)
      if (msg.userId !== currentUser) {
        const sender = users.find(u => u.id === msg.userId);
        pendingNotif = { name: sender?.name || msg.userId, text: msg.text };
      }
      return [...prev, msg].sort((a, b) => a.id - b.id);
    });
    if (pendingNotif) {
      setChatNotif(pendingNotif);
      playNotifSound();
      setTimeout(() => setChatNotif(null), 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  // Fetch initial messages on mount from persistent ChatMessage collection
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/pipeline-state/messages?limit=50")
      .then(r => r.json())
      .then((msgs: ChatMsg[]) => {
        if (Array.isArray(msgs)) setChatMessages(msgs);
      })
      .catch(() => {}); // offline — start empty
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreMessages = async () => {
    if (!hasMoreMessages || chatMessages.length === 0) return;
    const oldest = chatMessages[0];
    try {
      const res = await fetch(`/api/pipeline-state/messages?before=${oldest.id}&limit=50`);
      const older: ChatMsg[] = await res.json();
      if (!Array.isArray(older) || older.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      setChatMessages(prev => [...older, ...prev]);
      if (older.length < 50) setHasMoreMessages(false);
    } catch { /* ignore */ }
  };

  // Claim = take ownership. Points only granted when stage goes LIVE.
  const handleClaim = (sid: string) => {
    if (!currentUser) return;
    if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; }
    const alreadyClaimed = (claims[sid] || []).includes(currentUser);
    setClaims(prev => {
      const c = prev[sid] || [];
      if (c.includes(currentUser)) return { ...prev, [sid]: c.filter(u => u !== currentUser) };
      return { ...prev, [sid]: [...c, currentUser] };
    });
    if (!alreadyClaimed) {
      const pts = stageDefaults[sid]?.points || 10;
      const me2 = users.find((u: typeof USERS_DEFAULT[number]) => u.id === currentUser);
      setClaimAnim({ stage: sid, pts });
      setToast({ text: `${me2?.name} owns ${sid}`, pts: `earn +${pts}pts on live`, color: me2?.color || t.accent });
      logActivity("claim", sid, "took ownership");
      setTimeout(() => setClaimAnim(null), 1200);
      setTimeout(() => setToast(null), 2500);
    }
  };
  const assignTask = (sid: string, userId: string | null) => {
    if (!currentUser) return;
    setAssignments(prev => {
      const copy = { ...prev };
      if (!userId) { delete copy[sid]; return copy; }
      return { ...copy, [sid]: userId };
    });
    if (userId) {
      const assignee = users.find((u: typeof USERS_DEFAULT[number]) => u.id === userId);
      logActivity("assign", sid, `→ ${assignee?.name || userId}`);
    } else {
      logActivity("assign", sid, "unassigned");
    }
  };

  const handleReact = (sid: string, emoji: string) => {
    if (!currentUser) return;
    // Check lock for both stage reactions (sid = stage name) and pipeline reactions (sid = _pipe_<id>)
    if (sid.startsWith("_pipe_")) {
      const pid = sid.slice(6);
      if (isLocked(pid)) { showToast("// pipeline is locked", t.amber); return; }
    } else if (isStageInLockedPipeline(sid)) {
      showToast("// pipeline is locked", t.amber); return;
    }
    // Compute next reactions synchronously so we can pass it to patchState
    const prevReactions = reactions;
    const s = { ...(prevReactions[sid] || {}) };
    const u = [...(s[emoji] || [])];
    const i = u.indexOf(currentUser);
    if (i >= 0) u.splice(i, 1); else u.push(currentUser);
    s[emoji] = u;
    const nextReactions = { ...prevReactions, [sid]: s };
    setReactions(nextReactions);
    patchState({ reactions: nextReactions }).catch(() => {
      setReactions(prevReactions);
      showToast("// reaction didn’t land", t.amber);
    });
  };
  const MAX_SUBTASKS = 20;
  const MAX_SUBTASK_LEN = 200;
  const addSubtask = (sid: string) => {
    const val = subtaskInput[sid]?.trim();
    if (!val || !currentUser) return;
    if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; }
    if (val.length > MAX_SUBTASK_LEN) {
      showToast("// subtask too long — max 200 chars", t.red);
      return;
    }
    const current = subtasks[sid] || [];
    if (current.length >= MAX_SUBTASKS) {
      showToast("// max 20 subtasks per stage", t.amber);
      return;
    }
    const taskId = Date.now();
    const newTask = { id: taskId, text: val, done: false, by: currentUser };
    setSubtasks(prev => ({ ...prev, [sid]: [...(prev[sid] || []), newTask] }));
    setSubtaskInput(prev => ({ ...prev, [sid]: "" }));
  };
  const toggleSubtask = (sid: string, taskId: number) => { if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; } setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId && !t.locked ? { ...t, done: !t.done } : t) })); };
  const lockSubtask = (sid: string, taskId: number) => { if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; } setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, locked: !t.locked } : t) })); };
  const removeSubtask = (sid: string, taskId: number) => { if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; } setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).filter(t => t.id !== taskId || t.locked) })); };
  const addStageImage = (sid: string, dataUrl: string) => { if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; } setStageImages(prev => ({ ...prev, [sid]: [...(prev[sid] || []), dataUrl] })); };
  const removeStageImage = (sid: string, idx: number) => { setStageImages(prev => ({ ...prev, [sid]: (prev[sid] || []).filter((_, i) => i !== idx) })); };
  const MAX_COMMENT_LEN = 1000;
  const addComment = (sid: string) => {
    const val = commentInput[sid]?.trim();
    if (!val || !currentUser) return;
    if (isStageInLockedPipeline(sid)) { showToast("// pipeline is locked", t.amber); return; }
    if (val.length > MAX_COMMENT_LEN) {
      showToast("// comment too long — max 1000 chars", t.red);
      return;
    }
    const commentId = Date.now();
    const c = { id: commentId, text: val, by: currentUser, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    // Optimistic: add immediately
    setComments(prev => ({ ...prev, [sid]: [...(prev[sid] || []), c] }));
    setCommentInput(prev => ({ ...prev, [sid]: "" }));
    logActivity("comment", sid, val.slice(0, 100));
    pushComment(sid, c).then(result => {
      if (!result.ok) {
        // Rollback: remove the optimistic comment
        setComments(prev => ({
          ...prev,
          [sid]: (prev[sid] || []).filter(x => x.id !== commentId),
        }));
        if ((result as { status?: number }).status === 423) {
          showToast("// pipeline is locked — unlock to make changes", t.amber);
        } else {
          setSyncStatus("offline");
          showToast("// comment lost — try again", t.red);
        }
      }
    });
  };
  const cycleStatus = (name: string) => { if (isStageInLockedPipeline(name)) { showToast("// pipeline is locked", t.amber); return; } const cur = getStatus(name); const idx = STATUS_ORDER.indexOf(cur); const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]; setStageStatusOverrides(prev => ({ ...prev, [name]: next })); logActivity("status", name, `\u2192 ${next}`); };
  const shareStage = (name: string, text: string) => { navigator.clipboard?.writeText(text).catch(() => {}); setCopied(name); setTimeout(() => setCopied(null), 2000); };
  const sharePipeline = (pid: string, pname: string, pdesc: string, priority: string, hours: string, stageList: string[]) => {
    const stageLines = stageList.map(s => `  · ${s}  [${getStatus(s).toUpperCase()}]`).join("\n");
    const owners = [...new Set(stageList.flatMap(s => claims[s] || []))].map(uid => users.find((u: UserType) => u.id === uid)?.name).filter(Boolean);
    const lines: string[] = [
      "Binayah AI  //  Pipeline",
      "────────────────────────────────",
      pname,
      `Priority: ${priority}  ·  ${stageList.length} stages  ·  ${hours}`,
    ];
    if (pdesc) { lines.push(""); lines.push(pdesc); }
    lines.push(""); lines.push("Stages:"); lines.push(stageLines);
    if (owners.length) { lines.push(""); lines.push(`Owners: ${owners.join(", ")}`); }
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(`pipe-${pid}`); setTimeout(() => setCopied(null), 2000);
  };
  const setStageDescOverride = (name: string, val: string) => setStageDescOverrides(prev => ({ ...prev, [name]: val }));
  const setStageNameOverride = (name: string, val: string) => setStageNameOverrides(prev => ({ ...prev, [name]: val }));
  const setSubtaskStage = (key: string, status: string) => setSubtaskStages(prev => ({ ...prev, [key]: status }));
  const setStageStatusDirect = (name: string, status: string) => {
    setStageStatusOverrides(prev => ({ ...prev, [name]: status }));
    logActivity("status", name, `\u2192 ${status}`);
  };
  const onKanbanCardClick = (pipelineId: string, stageName: string) => {
    setView("list");
    setExpanded(prev => prev.includes(pipelineId) ? prev : [...prev, pipelineId]);
    const p = allPipelines.find(p => p.id === pipelineId);
    if (p) {
      const stages = [...p.stages, ...(customStages[pipelineId] || [])];
      const idx = stages.indexOf(stageName);
      if (idx >= 0) setExpS(`${pipelineId}-${idx}`);
    }
  };

  // ── Cmd+K palette navigation callbacks ──────────────────────────────────────
  const handlePaletteOpenStage = useCallback((pipelineId: string, stageName: string) => {
    // Switch to pipelines view, expand the pipeline, expand the stage card
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
    // Navigate to documents panel and open the doc
    setActiveNavItem("documents");
    if (isMobile) { setShowDocumentsMobile(true); }
    // Reset first so useEffect in DocumentsPanel fires even if same doc opened twice
    setPaletteDocId(null);
    requestAnimationFrame(() => setPaletteDocId(docId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const handlePaletteOpenPerson = useCallback((userId: string) => {
    // Open the user stats popup (viewingUser controls this in the team bar)
    setViewingUser(userId);
    // Scroll team bar into view
    setTimeout(() => {
      const el = document.querySelector("[data-user-id='" + userId + "']") as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WelcomeModal dismiss handler — persists avatar choice and marks user as welcomed
  const handleWelcomeDismiss = useCallback(({ avatar, aiAvatar }: { avatar: string | null; aiAvatar: string | null }) => {
    if (initialUserId) {
      try { localStorage.setItem(`binayah_welcomed_${initialUserId}`, Date.now().toString()); } catch { /* noop */ }
    }
    // Persist avatar selection if chosen
    if (avatar || aiAvatar) {
      setUsers(prev => prev.map(u =>
        u.id === currentUser
          ? { ...u, avatar: avatar || u.avatar, aiAvatar: aiAvatar || u.aiAvatar }
          : u
      ));
    }
    setShowWelcome(false);
  }, [initialUserId, currentUser]);

  // Schema version mismatch — show recovery toast and reload
  if (isRecovering) {
    return (
      <div style={{ background: t.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <RecoveryToast t={t} message="// cache cleared — fresh start" />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isHydrating) {
    return (
      <div style={{ background: t.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: t.accent, animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5 }}>LOADING</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // WelcomeModal is rendered OVER the dashboard (not instead of it) — rendered below in JSX

  const me = users.find((u: typeof USERS_DEFAULT[number]) => u.id === currentUser);
  if (!me) return (<div style={{ background: t.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 15, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>// session error — please sign out and back in</span></div>);

  const stageProps = { t, expS, setExpS, getStatus, sc, claims, reactions, subtasks, comments, users, currentUser, me, reactOpen, setReactOpen, showMockup, setShowMockup, copied, claimAnim, handleClaim, handleReact, cycleStatus, shareStage, subtaskInput, setSubtaskInput, commentInput, setCommentInput, addSubtask, toggleSubtask, lockSubtask, removeSubtask, addComment, stageDescOverrides, setStageDescOverride, liveNotifs, stageImages, addStageImage, removeStageImage, archiveStage };
  const unseen = activityLog.length - lastSeenActivity;

  // Shared button style for all header buttons — ensures uniform height
  const hBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 12px", cursor: "pointer", color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, gap: 4, minHeight: 44 };

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "var(--font-dm-sans), sans-serif", display: "flex", flexDirection: "row" }} onClick={() => { setShowThemePicker(false); setReactOpen(null); setViewingUser(null); setPipeMenuOpen(null); }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes claimPulse{0%,100%{box-shadow:0 0 16px var(--c,#bf5af2)33,0 2px 8px rgba(0,0,0,0.3)}50%{box-shadow:0 0 24px var(--c,#bf5af2)55,0 2px 12px rgba(0,0,0,0.4)}}@keyframes shimmer{0%{left:-100%}100%{left:200%}}@keyframes flyup{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}}@keyframes confetti0{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(40px,-50px) rotate(180deg)}}@keyframes confetti1{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-30px,-60px) rotate(-120deg)}}@keyframes confetti2{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(60px,-30px) rotate(90deg)}}@keyframes confetti3{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(-50px,-40px) rotate(-200deg)}}@keyframes ptsCount{0%{transform:scale(1)}30%{transform:scale(1.5);color:#ffcc00}70%{transform:scale(1.2)}100%{transform:scale(1)}}@keyframes emojiPop{0%{opacity:0;transform:scale(0.3) translateY(0)}40%{opacity:1;transform:scale(1.4) translateY(-8px)}70%{opacity:1;transform:scale(1.1) translateY(-14px)}100%{opacity:0;transform:scale(0.8) translateY(-22px)}}@keyframes commentPulse{0%,100%{box-shadow:none}30%,70%{box-shadow:0 0 0 2px #00ff8844}}*{box-sizing:border-box;}@media(max-width:768px){.bu-header{flex-wrap:wrap!important;gap:8px!important}.bu-header-btns{flex-wrap:wrap!important;gap:4px!important}.bu-pipe-right{display:none!important}.bu-search-row{flex-direction:column!important;gap:6px!important}.bu-view-toggle{justify-content:stretch!important}}@media(max-width:768px){.bu-pipe-left{width:100%!important}.bu-pipe-actions{flex-wrap:wrap!important;gap:4px!important}}@media(max-width:640px){.bu-stats{grid-template-columns:repeat(3,1fr)!important}.bu-team{overflow-x:auto!important;flex-wrap:nowrap!important;padding:8px 12px!important;gap:12px!important;-webkit-overflow-scrolling:touch}.bu-header{flex-direction:column!important;gap:8px!important}}@keyframes bottomSheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* LEFT SIDEBAR — desktop only, flush to viewport left edge */}
      {!isMobile && (
        <div style={{ position: "sticky", top: 0, height: "100vh", flexShrink: 0, overflowY: "auto" }}>
          <LeftSidebar
            t={t}
            activeNav={activeNavItem}
            onNavChange={(item) => {
              setActiveNavItem(item);
              if (item === "activity") { setShowActivity(true); setLastSeenActivity(activityLog.length); }
              else if (item === "chat") { setShowChat(false); setChatNotif(null); }
              else { setShowActivity(false); setShowChat(false); }
            }}
            pipelines={allPipelines as SidebarPipeline[]}
            activePipelineId={activeSidebarPipeline}
            onPipelineSelect={(id) => {
              setActiveSidebarPipeline(id);
              setExpanded(prev => prev.includes(id) ? prev : [...prev, id]);
              setActiveNavItem("pipelines");
            }}
            workspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, memberCount: w.members.length }))}
            currentWorkspaceId={currentWorkspaceId}
            onWorkspaceChange={(id) => { setCurrentWorkspaceId(id); setActiveSidebarPipeline(null); }}
            canCreateWorkspace={!!currentUser && workspaces.some(w => w.captains.includes(currentUser))}
            onCreateWorkspace={() => setWorkspaceModal("create")}
            canManageCurrentWorkspace={!!currentWorkspace && !!currentUser && currentWorkspace.members.includes(currentUser)}
            onManageCurrentWorkspace={() => setWorkspaceModal("manage")}
          />
        </div>
      )}

      {/* Right section: header + content, fills remaining width */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "hidden" }}>

      {activeNavItem === "chat" && !isMobile ? (
        <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
          <Suspense fallback={<ChatSkeleton t={t} />}>
            <ChatPanel
              fullScreen
              messages={chatMessages}
              onSend={sendChat}
              onRemoteMessage={handleRemoteMessage}
              users={users}
              currentUser={currentUser!}
              t={t}
              defaultTab="team"
              onLoadMore={loadMoreMessages}
              hasMore={hasMoreMessages}
              buildAiContext={() => {
                const me = users.find(u => u.id === currentUser);
                const lines: string[] = [];
                lines.push(`Current user: ${me?.name || currentUser} (id=${currentUser}, role=${me?.role || "?"}, points=${getPoints(currentUser!)})`);
                lines.push(`Team: ${users.map(u => `${u.name} (${u.id}, ${u.role}, ${getPoints(u.id)}pts)`).join("; ")}`);
                lines.push("");
                lines.push(`Pipelines (${allPipelines.length}):`);
                allPipelines.forEach((p, pi) => {
                  const pName = pipeMetaOverrides[p.id]?.name || p.name;
                  const pPrio = pipeMetaOverrides[p.id]?.priority || p.priority;
                  const pDesc = pipeDescOverrides[p.id] || p.desc;
                  const locked = isLocked(p.id) ? " [LOCKED]" : "";
                  const stages = [...p.stages, ...(customStages[p.id] || [])];
                  lines.push(`${pi + 1}. ${pName} — ${pPrio} — ${pDesc}${locked}`);
                  stages.forEach((s, si) => {
                    const st = getStatus(s);
                    const claimers = (claims[s] || []).map(id => users.find(u => u.id === id)?.name || id).join(", ") || "unclaimed";
                    const subN = (subtasks[s] || []).length;
                    const subDone = (subtasks[s] || []).filter(t => t.done).length;
                    const comN = (comments[s] || []).length;
                    const sDesc = stageDescOverrides[s] || "";
                    lines.push(`   ${pi + 1}.${si + 1} ${s} [${st}] — claimed by ${claimers}${subN ? ` — subtasks ${subDone}/${subN}` : ""}${comN ? ` — ${comN} comments` : ""}${sDesc ? ` — ${sDesc}` : ""}`);
                  });
                });
                const recent = activityLog.slice(0, 8);
                if (recent.length) {
                  lines.push("");
                  lines.push("Recent activity:");
                  recent.forEach(a => lines.push(`- ${a.user} ${a.type} ${a.target}${a.detail ? ` (${a.detail})` : ""}`));
                }
                return lines.join("\n");
              }}
            />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <>

      {/* Top section: header + team bar */}
      <div style={{ padding: isMobile ? "12px 12px 0" : (activeNavItem === "home" ? "12px 20px 0" : "24px 20px 0") }}>

        {/* HEADER */}
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

          {/* All header buttons — hidden on home (rendered inside HomeView workspace card instead) */}
          <div className="bu-header-btns" style={{ display: activeNavItem === "home" ? "none" : "flex", alignItems: "stretch", gap: 4 }}>
            {/* User card — clickable to open avatar picker */}
            {me && (
              <div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "0 12px", cursor: "pointer", transition: "border-color 0.2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border}
                title="Change avatar"
              >
                <AvatarC user={me} size={28} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{me.name}</div>
                  <div style={{ fontSize: 11, color: t.amber, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div>
                </div>
              </div>
            )}

            {/* Chat */}
            <button onClick={e => { e.stopPropagation(); setActiveNavItem("chat"); setShowChat(false); setChatNotif(null); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} title="Team chat" aria-label="Open team chat">
              <MessageSquare size={16} strokeWidth={1.8} />
              {chatNotif && activeNavItem !== "chat" && (
                <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}`, animation: "claimPulse 1s ease infinite" }} />
              )}
            </button>

            {/* Activity bell */}
            <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 15, position: "relative" }} title="Notifications" aria-label="View notifications">
              <Bell size={16} strokeWidth={1.8} />
              {unseen > 0 && <div style={{ position: "absolute", top: 6, right: 6, minWidth: 14, height: 14, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}
            </button>

            {/* Documents — mobile only (desktop uses sidebar) */}
            {isMobile && (
              <button onClick={e => { e.stopPropagation(); setShowDocumentsMobile(true); }} style={{ ...hBtn, fontSize: 15 }} title="Documents" aria-label="View documents">
                {"📄"}
              </button>
            )}



            {/* Theme picker */}
            <div style={{ position: "relative", display: "flex", alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 16, gap: 4 }} title="Change theme" aria-label="Change theme">
                {t.icon} <span style={{ fontSize: 10 }}>{"\u25BE"}</span>
              </button>
              {showThemePicker && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 8, zIndex: 200, width: "min(220px, calc(100vw - 32px))", boxShadow: `0 12px 40px rgba(0,0,0,0.5)`, animation: "fadeIn 0.15s ease" }}>
                  {THEME_OPTIONS.map(opt => (
                    <div key={opt.id} onClick={() => { setThemeId(opt.id); setShowThemePicker(false); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 12, cursor: "pointer", background: themeId === opt.id ? opt.color + "18" : "transparent", border: "none", marginBottom: 0, transition: "all 0.15s" }}>
                      <span style={{ fontSize: 20 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: themeId === opt.id ? opt.color : t.text }}>{opt.name}</div>
                        <div style={{ fontSize: 10, color: t.textMuted, lineHeight: 1.3 }}>{opt.desc}</div>
                      </div>
                      {themeId === opt.id && <span style={{ marginLeft: "auto", fontSize: 13, color: opt.color }}>{"\u2713"}</span>}
                    </div>
                  ))}
                  <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "center" }}>
                    <button onClick={() => setIsDark(!isDark)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 16px", cursor: "pointer", fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>
                      {isDark ? "\u2600\uFE0F light mode" : "\uD83C\uDF1A dark mode"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sign out — when session-authenticated, signs out via next-auth */}
            <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn }} title="Sign out">sign out</button>
          </div>
        </div>

        {/* TEAM BAR — hidden on home (HomeView shows the team inside the workspace header) */}
        <div className="bu-team" style={{ display: activeNavItem === "home" ? "none" : "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "12px 16px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, flexWrap: "wrap" }}>
          {users.map((u: typeof USERS_DEFAULT[number]) => {
            const isMe = u.id === currentUser;
            const uPts = getPoints(u.id);
            const claimedStages = Object.entries(claims).filter(([, cl]) => (cl as string[]).includes(u.id)).map(([s]) => s);
            const liveOwned = claimedStages.filter(s => getStatus(s) === "active");
            const rank = [...users].sort((a, b) => getPoints(b.id) - getPoints(a.id)).findIndex(x => x.id === u.id) + 1;
            const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
            return (
            <div key={u.id} style={{ position: "relative" }}>
              <div onClick={e => { e.stopPropagation(); setViewingUser(viewingUser === u.id ? null : u.id); }}
                style={{ display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s", cursor: "pointer", borderRadius: 12, padding: "4px 4px", margin: "-4px -6px" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = u.color + "12"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0, position: "relative" }}>
                  <AvatarC user={u} size={26} />
                  {userRankInCurrent(u.id) === "captain" && (
                    <span title={`Captain of ${currentWorkspace?.name || "workspace"}`} style={{ position: "absolute", bottom: -2, right: -4, fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>👑</span>
                  )}
                  {userRankInCurrent(u.id) === "firstMate" && (
                    <span title={`First Mate of ${currentWorkspace?.name || "workspace"}`} style={{ position: "absolute", bottom: -2, right: -4, fontSize: 13, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>⚓</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: isMe ? 900 : 800, color: isMe ? u.color : t.text, display: "flex", alignItems: "center", gap: 4 }}>
                    {u.name}
                    {userRankInCurrent(u.id) === "captain" && <span style={{ fontSize: 10, color: t.amber, background: t.amber + "22", border: `1px solid ${t.amber}55`, borderRadius: 8, padding: "0 4px", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5 }}>CAPTAIN</span>}
                    {userRankInCurrent(u.id) === "firstMate" && <span style={{ fontSize: 10, color: t.cyan || t.accent, background: (t.cyan || t.accent) + "22", border: `1px solid ${(t.cyan || t.accent)}55`, borderRadius: 8, padding: "0 4px", fontFamily: "var(--font-dm-mono), monospace", fontWeight: 700, letterSpacing: 0.5 }}>FIRST MATE</span>}
                  </div>
                  <div style={{ fontSize: 10, color: uPts > 0 ? t.amber : t.textDim, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash ? "ptsCount 0.6s ease" : "none" }}>{uPts}pts</div>
                </div>
              </div>

              {/* Stats popup — my stats (rich) or other user (read-only) */}
              {viewingUser === u.id && (
                <div ref={viewingUserPopupRef} onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 10px)", left: 0, zIndex: 200, background: t.bgCard, border: `1.5px solid ${u.color}44`, borderRadius: 16, padding: "16px 16px 16px 16px", minWidth: 210, maxWidth: "min(320px, calc(100vw - 32px))", boxShadow: t.shadowLg, animation: "fadeIn 0.15s ease" }}>

                  {/* × close button */}
                  <button onClick={() => setViewingUser(null)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 15, color: t.textDim, lineHeight: 1, padding: "0 4px", borderRadius: 8 }} aria-label="Close">×</button>

                  {/* Header */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                    <div style={{ borderRadius: "50%", padding: 0, background: `linear-gradient(135deg,${u.color},${u.color}66)`, flexShrink: 0 }}>
                      <AvatarC user={u} size={42} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: u.color, display: "flex", alignItems: "center", gap: 4 }}>
                        {u.name}
                        <span style={{ fontSize: 13 }}>{rankEmoji}</span>
                      </div>
                      <div style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>{u.role}</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
                    <div style={{ background: t.bgHover, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", animation: isMe && ptsFlash ? "ptsCount 0.6s ease" : "none" }}>{uPts}</div>
                      <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>pts</div>
                    </div>
                    <div style={{ background: t.bgHover, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>{claimedStages.length}</div>
                      <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>owned</div>
                    </div>
                    <div style={{ background: t.bgHover, borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: t.green, fontFamily: "var(--font-dm-mono), monospace" }}>{liveOwned.length}</div>
                      <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>live</div>
                    </div>
                  </div>

                  {/* Claimed stages list */}
                  {claimedStages.length > 0 && (
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
                  )}
                  {claimedStages.length === 0 && <div style={{ fontSize: 10, color: t.textDim, fontStyle: "italic", marginBottom: isMe ? 10 : 0 }}>no stages claimed yet</div>}

                  {/* Change avatar + notification prefs — own profile only */}
                  {isMe && (
                    <>
                      <button onClick={() => { setSelUser(u.id); setSelAvatar(u.avatar); setShowAvatarPicker(true); setViewingUser(null); }}
                        style={{ width: "100%", background: u.color + "18", border: `1px solid ${u.color}44`, borderRadius: 12, padding: "8px", cursor: "pointer", fontSize: 11, color: u.color, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>
                        change avatar →
                      </button>
                      <NotificationPrefs t={t} />
                    </>
                  )}
                </div>
              )}
            </div>
            );
          })}

        </div>
      </div>{/* end top-section maxWidth */}

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "0 12px 16px" : "0 20px 24px", overflowX: "hidden" }}>

        {/* Mobile: Activity Feed BottomSheet — unchanged */}
        {isMobile && (
          <BottomSheet open={showActivity} onClose={() => setShowActivity(false)} title="// activity feed" t={t}>
            <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
              <Suspense fallback={<ActivitySkeleton t={t} />}>
                <ActivityFeed activityLog={activityLog} users={users} t={t} />
              </Suspense>
            </ErrorBoundary>
          </BottomSheet>
        )}

        {/* Desktop: Documents panel when activeNavItem === 'documents' */}
        {!isMobile && activeNavItem === "documents" && (
          <ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}>
            <Suspense fallback={null}>
              <div style={{ marginTop: 16, height: "calc(100vh - 80px)" }}>
                <DocumentsPanel t={t} initialDocId={paletteDocId} />
              </div>
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Desktop: Activity inline when activeNavItem === 'activity' */}
        {!isMobile && activeNavItem === "activity" && (
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<ActivitySkeleton t={t} />}>
              <div style={{ marginTop: 16 }}>
                <ActivityFeed activityLog={activityLog} users={users} t={t} />
              </div>
            </Suspense>
          </ErrorBoundary>
        )}

        {/* Desktop: Home view — personal dashboard across workspaces */}
        {!isMobile && activeNavItem === "home" && me && (
          <ErrorBoundary onError={() => showToast("// home failed to load — refresh to retry", t.red)}>
            <Suspense fallback={null}>
              <HomeView
                t={t}
                me={me}
                users={users}
                myWorkspaces={myWorkspaces}
                allPipelinesGlobal={allPipelinesGlobal}
                customStages={customStages}
                pipeMetaOverrides={pipeMetaOverrides}
                claims={claims}
                reactions={reactions}
                comments={comments}
                subtasks={subtasks}
                assignments={assignments}
                approvedStages={approvedStages}
                copied={copied}
                commentInput={commentInput}
                setCommentInput={setCommentInput}
                getStatus={getStatus}
                sc={sc}
                ck={ck}
                currentUser={currentUser!}
                isCaptainOfAny={!!currentUser && workspaces.some(w => w.captains.includes(currentUser))}
                handleClaim={handleClaim}
                handleReact={handleReact}
                toggleSubtask={toggleSubtask}
                shareStage={shareStage}
                addComment={addComment}
                setStageStatus={setStageStatusDirect}
                approveStage={approveStage}
                assignTask={assignTask}
                isLocked={isLocked}
                currentWorkspaceId={currentWorkspaceId}
                onSwitchWorkspace={(id) => { setCurrentWorkspaceId(id); setActiveSidebarPipeline(null); }}
                stageNameOverrides={stageNameOverrides}
                setStageNameOverride={setStageNameOverride}
                subtaskStages={subtaskStages}
                setSubtaskStage={setSubtaskStage}
                editMode={editMode}
                archivedStages={archivedStages}
                navbarSlot={me ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "6px 10px", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border}>
                      <AvatarC user={me} size={24} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: t.text }}>{me.name}</div>
                        <div style={{ fontSize: 10, color: t.amber, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setActiveNavItem("chat"); }} style={{ ...hBtn, fontSize: 14 }} title="Team chat"><MessageSquare size={14} strokeWidth={1.8} /></button>
                    <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 14, position: "relative" }} title="Notifications">
                      <Bell size={14} strokeWidth={1.8} />
                      {unseen > 0 && <div style={{ position: "absolute", top: 4, right: 4, minWidth: 12, height: 12, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}
                    </button>
                    <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 14, gap: 3 }} title="Theme">{t.icon} <span style={{ fontSize: 9 }}>▾</span></button>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn, fontSize: 11 }}>sign out</button>
                  </div>
                ) : undefined}
              />
            </Suspense>
          </ErrorBoundary>
        )}



        {/* PIPELINES VIEW — shown when pipelines nav is active (or on mobile where sidebar is hidden) */}
        {(isMobile || activeNavItem === "pipelines") && (<div style={{ marginTop: 16 }}>

        {/* SEARCH + VIEW TOGGLE */}
        <div className="bu-search-row" style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "stretch" }}>
          <div style={{ flex: 1 }}>
            <SearchFilter searchQ={searchQ} setSearchQ={setSearchQ} statusFilter={statusFilter} setStatusFilter={setStatusFilter} t={t} />
          </div>
          {/* View toggle — icon-only on mobile, full labels on desktop */}
          <div className="bu-view-toggle" style={{ display: "flex", gap: 4, alignItems: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 4px" }}>
            {([["list", "\u2630 list", "\u2630"], ["kanban", "\u25A6 kanban", "\u25A6"], ["overview", "\u25A1 overview", "\u25A1"]] as const).map(([v, label, icon]) => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? t.accent + "22" : "transparent", border: `1px solid ${view === v ? t.accent + "55" : "transparent"}`, borderRadius: 8, padding: isMobile ? "10px 14px" : "5px 12px", minHeight: isMobile ? 44 : undefined, cursor: "pointer", fontSize: 11, color: view === v ? t.accent : t.textMuted, fontWeight: view === v ? 700 : 500, fontFamily: "var(--font-dm-mono), monospace", transition: "all 0.15s" }}>
                {isMobile ? icon : label}
              </button>
            ))}
          </div>
        </div>

        {/* OVERVIEW VIEW */}
        {view === "overview" && (
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<OverviewSkeleton t={t} />}>
              <OverviewPanel
                allPipelines={allPipelines} customStages={customStages} getStatus={getStatus}
                claims={claims} users={users} sc={sc} ck={ck}
                stageDescOverrides={stageDescOverrides} setStageDescOverride={setStageDescOverride}
                pipeDescOverrides={pipeDescOverrides} setPipeDescOverrides={setPipeDescOverrides}
                pipeMetaOverrides={pipeMetaOverrides} setPipeMetaOverrides={setPipeMetaOverrides}
                searchQ={searchQ} activityLog={activityLog} t={t}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* KANBAN VIEW */}
        {view === "kanban" && (
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<KanbanSkeleton t={t} />}>
              <KanbanView
                t={t} getStatus={getStatus} setStageStatusDirect={setStageStatusDirect}
                claims={claims} reactions={reactions} users={users} currentUser={currentUser}
                sc={sc} ck={ck} customStages={customStages} customPipelines={customPipelines}
                onCardClick={onKanbanCardClick} searchQ={searchQ} lockedPipelines={lockedPipelines}
              />
            </Suspense>
          </ErrorBoundary>
        )}

        {/* PIPELINES */}
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
              <div key={p.id} style={{ background: t.bgCard, border: `1px solid ${isLocked(p.id) ? t.amber + "33" : isO ? pC + "33" : t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: isO ? t.shadowLg : t.shadow, transition: "all 0.25s", opacity: isLocked(p.id) ? 0.82 : 1 }}>
                <div style={{ height: 2, background: t.surface }}>
                  <div style={{ width: `${Math.max(pct, 2)}%`, height: "100%", background: `linear-gradient(90deg,${pC},${pC}aa)`, transition: "width 0.5s" }} />
                </div>

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
                            <span onClick={e => { e.stopPropagation(); setEditingPipeName(p.id); }} style={{ fontSize: 15, fontWeight: 900, color: t.text, cursor: "text" }} title="Click to rename">
                              {pipeName} <span style={{ fontSize: 11, color: t.textDim, opacity: 0.4 }}>{"✎"}</span>
                            </span>
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
                            {!isLocked(p.id) && <span style={{ fontSize: 10, color: t.textDim, opacity: 0.4, flexShrink: 0 }}>{"\u270E"}</span>}
                          </p>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => sharePipeline(p.id, pipeName, pipeDesc, pipePriority, p.totalHours, allPStages)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: copied === `pipe-${p.id}` ? t.green : t.textMuted, fontWeight: 600, fontFamily: "var(--font-dm-mono), monospace" }}>
                            {copied === `pipe-${p.id}` ? "\u2713 copied" : "\uD83D\uDCCB copy"}
                          </button>

                          <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                            {reactOpen === pipeReactKey
                              ? <>{REACTIONS.map(r => { const us = pipeReactions[r] || []; const mine = us.includes(currentUser!); return (
                                  <button key={r} onClick={() => handleReact(pipeReactKey, r)} style={{ background: mine ? pC + "22" : us.length > 0 ? t.surface : "transparent", border: "none", borderRadius: 8, padding: "0 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit", opacity: us.length > 0 ? 1 : 0.4 }}>
                                    <span style={{ fontSize: us.length > 0 ? 12 : 10 }}>{r}</span>
                                    {us.length > 0 && <span style={{ fontSize: 10, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{us.length}</span>}
                                  </button>); })}
                                  <button onClick={() => setReactOpen(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "0 4px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>done</button></>
                              : <>{pipeReactExist.map(([emoji, arr]) => { const mine = arr.includes(currentUser!); return (
                                  <button key={emoji} onClick={() => handleReact(pipeReactKey, emoji)} style={{ background: mine ? pC + "18" : t.surface, border: "none", borderRadius: 8, padding: "0 4px", cursor: "pointer", display: "flex", alignItems: "center", gap: 0, fontFamily: "inherit" }}>
                                    <span style={{ fontSize: 13 }}>{emoji}</span><span style={{ fontSize: 10, color: mine ? pC : t.textMuted, fontWeight: 700 }}>{arr.length}</span>
                                  </button>); })}
                                  <button onClick={() => setReactOpen(pipeReactKey)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "0 8px", cursor: "pointer", fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>+ react</button></>
                            }
                          </div>

                          <button onClick={() => toggleExpand(p.id)} style={{ background: isO ? pC + "15" : "transparent", border: `1px solid ${isO ? pC + "44" : t.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: isO ? pC : t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>
                            {isO ? "\u25BE collapse" : "\u25B8 details"}
                          </button>

                          {!allPipelineClaimed ? (
                            <button onClick={() => { allPStages.forEach(s => { if (!(claims[s] || []).includes(currentUser!)) handleClaim(s); }); }} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: pC, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }}>
                              {"\uD83D\uDC80"} claim all
                            </button>
                          ) : (
                            <button onClick={() => { allPStages.forEach(s => { if ((claims[s] || []).includes(currentUser!)) handleClaim(s); }); }} style={{ background: t.green + "15", border: `1px solid ${t.green}44`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 10, color: t.green, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", display: "flex", alignItems: "center", gap: 4 }} title="Click to unclaim all">
                              {"\u2713"} all claimed
                            </button>
                          )}

                          {uClaim.length > 0 && <div style={{ display: "flex", marginLeft: 0 }}>{uClaim.slice(0, 5).map(uid => { const u = users.find((u: typeof USERS_DEFAULT[number]) => u.id === uid); return u ? <div key={uid} style={{ marginLeft: -4 }}><AvatarC user={u} size={16} /></div> : null; })}</div>}
                        </div>
                      </div>
                    </div>

                    {/* Mobile-only: lock toggle + ⋮ menu for secondary actions */}
                    {isMobile && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 4 }} onClick={e => e.stopPropagation()}>
                        {/* ⋮ menu for secondary actions */}
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={e => { e.stopPropagation(); setPipeMenuOpen(pipeMenuOpen === p.id ? null : p.id); }}
                            style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, cursor: "pointer", fontSize: 15, padding: "4px 8px", minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center", color: t.textMuted }}
                          >
                            ⋮
                          </button>
                          {pipeMenuOpen === p.id && (
                            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, zIndex: 50, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "fadeIn 0.15s ease" }}>
                              <button onClick={e => { e.stopPropagation(); setEditingPipeName(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>
                                ✎ rename pipeline
                              </button>
                              <button onClick={e => { e.stopPropagation(); setEditingPipeDesc(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>
                                ✎ edit description
                              </button>
                              <button onClick={e => { e.stopPropagation(); toggleExpand(p.id); setPipeMenuOpen(null); }} style={{ display: "block", width: "100%", background: "none", border: "none", textAlign: "left", padding: "8px 8px", cursor: "pointer", fontSize: 13, color: t.text, borderRadius: 8, fontFamily: "inherit" }}>
                                {isO ? "collapse" : "expand stages"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="bu-pipe-right" style={{ textAlign: "right", flexShrink: 0, marginLeft: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: pC, fontFamily: "var(--font-dm-mono), monospace" }}>{p.totalHours}</div>
                      </div>
                      <div style={{ display: "flex", gap: 0, justifyContent: "flex-end" }}>
                        {allPStages.map((s, i) => { const stC = sc[getStatus(s)] || { c: t.textDim }; return <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: stC.c + "33", border: `1px solid ${stC.c}` }} />; })}
                      </div>
                      <div style={{ fontSize: 10, color: t.amber, fontFamily: "var(--font-dm-mono), monospace" }}>{p.points}pts</div>
                    </div>
                  </div>

                  {!isO && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, paddingLeft: 20 }}>
                    {allPStages.map((s, i) => {
                      const stC = sc[getStatus(s)] || { c: t.textDim };
                      const isClaimed = (claims[s] || []).length > 0;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                          <span style={{ fontSize: 10, color: stC.c, background: stC.c + "0a", padding: "0 4px", borderRadius: 8, fontFamily: "var(--font-dm-mono), monospace", border: isClaimed ? `1px solid ${stC.c}22` : "1px solid transparent" }}>{s}</span>
                          {i < allPStages.length - 1 && <span style={{ color: t.textDim, fontSize: 10 }}>{"\u2192"}</span>}
                        </div>
                      );
                    })}
                  </div>}
                </div>

                {isO && (
                  <div style={{ padding: "0 16px 16px", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12 }}>
                      {allPStages.map((s, i) => <div key={`${p.id}-${s}`} id={`stage-${s}`}><Stage name={s} idx={i} tot={allPStages.length} pC={pC} pId={p.id} isLocked={isLocked(p.id)} isMobile={isMobile} {...stageProps} /></div>)}
                    </div>
                    {!isLocked(p.id) && (
                      <div style={{ display: "flex", gap: 4, marginTop: 8, paddingLeft: 24 }} onClick={e => e.stopPropagation()}>
                        <input value={newStageInput[p.id] || ""} onChange={e => setNewStageInput(prev => ({ ...prev, [p.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addCustomStage(p.id); }} placeholder="+ add stage..." style={{ flex: 1, background: "transparent", border: `1px dashed ${pC}33`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: t.text, fontFamily: "var(--font-dm-mono), monospace", outline: "none" }} />
                        <button onClick={() => addCustomStage(p.id)} style={{ background: pC + "15", border: `1px solid ${pC}33`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 11, color: pC, fontWeight: 700, fontFamily: "inherit" }}>add</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add new pipeline */}
          {!addingPipeline ? (
            <button onClick={() => setAddingPipeline(true)} style={{ background: "transparent", border: `2px dashed ${t.border}`, borderRadius: 16, padding: "16px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center", width: "100%" }}>
              + new pipeline
            </button>
          ) : (
            <div style={{ background: t.bgCard, border: `1px solid ${t.accent}33`, borderRadius: 16, padding: "20px" }}>
              <div style={{ fontSize: 11, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, fontFamily: "var(--font-dm-mono), monospace" }}>new pipeline</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                {ICON_OPTIONS.map(ico => (
                  <button key={ico} onClick={() => setNewPipeForm(p => ({ ...p, icon: ico }))} style={{ background: newPipeForm.icon === ico ? t.accent + "22" : "transparent", border: `1px solid ${newPipeForm.icon === ico ? t.accent + "66" : t.border}`, borderRadius: 8, padding: "4px 4px", cursor: "pointer", fontSize: 16 }}>{ico}</button>
                ))}
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
                <button onClick={addCustomPipeline} disabled={!newPipeForm.name.trim()} style={{ background: t.accent, border: "none", borderRadius: 12, padding: "8px 20px", cursor: newPipeForm.name.trim() ? "pointer" : "not-allowed", fontSize: 13, color: "#fff", fontWeight: 800, fontFamily: "var(--font-dm-mono), monospace", opacity: newPipeForm.name.trim() ? 1 : 0.45, transition: "opacity 0.15s" }}>create pipeline</button>
                <button onClick={() => setAddingPipeline(false)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace" }}>cancel</button>
              </div>
            </div>
          )}
        </div>}
        </div>)}{/* end pipelines wrapper */}

        {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: toast.color === t.green ? `linear-gradient(135deg,${t.bgCard},${t.green}18)` : t.bgCard, border: `1.5px solid ${toast.color}55`, borderRadius: 16, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 40px ${toast.color}22`, animation: "slideUp 0.3s ease", zIndex: 100, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: toast.color === t.green ? 20 : 13 }}>{toast.color === t.green ? "\u26A1" : "\uD83D\uDC80"}</span>
          <span style={{ fontSize: 13, color: toast.color === t.green ? toast.color : t.text, fontWeight: 800 }}>{toast.text}</span>
          <span style={{ fontSize: 13, color: t.textSec, fontWeight: 700 }}>{toast.pts}</span>
        </div>}

        {/* Activity notification toast */}
        {chatNotif && (
          <div style={{ position: "fixed", bottom: 80, right: 16, maxWidth: "min(300px, calc(100vw - 32px))", background: t.bgCard, border: `1px solid ${chatNotif.isClaim ? t.amber : chatNotif.isReaction ? t.green : t.accent}44`, borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 8, boxShadow: t.shadowLg, animation: "slideUp 0.25s ease", zIndex: 600, fontFamily: "var(--font-dm-mono), monospace" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>
              {chatNotif.isClaim ? "🤝" : chatNotif.isReaction ? "⚡" : chatNotif.isComment ? "💬" : "👀"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: chatNotif.isClaim ? t.amber : chatNotif.isReaction ? t.green : t.accent, marginBottom: 4 }}>{chatNotif.name}</div>
              <div style={{ fontSize: 13, color: t.text, lineHeight: 1.4, wordBreak: "break-word" }}>{chatNotif.text.length > 80 ? chatNotif.text.slice(0, 80) + "…" : chatNotif.text}</div>
              {chatNotif.isComment && chatNotif.stage && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4 }}>on {chatNotif.stage}</div>}
            </div>
            <button onClick={() => setChatNotif(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textDim, fontSize: 15, padding: 0, marginLeft: 4, flexShrink: 0 }}>×</button>
          </div>
        )}


        </div>{/* end main content area */}
        </>
      )}{/* end chat/normal conditional */}
      </div>{/* end right-section */}

      {/* WORKSPACE MODALS */}
      {workspaceModal === "create" && (
        <Suspense fallback={null}>
          <CreateWorkspaceModal
            t={t}
            users={users}
            ck={ck}
            onClose={() => setWorkspaceModal(null)}
            onCreate={(name, icon, colorKey) => createWorkspace(name, icon, colorKey)}
          />
        </Suspense>
      )}
      {workspaceModal === "manage" && currentWorkspace && currentUser && (
        <Suspense fallback={null}>
          <ManageWorkspaceModal
            t={t}
            users={users}
            ck={ck}
            workspace={currentWorkspace}
            currentUser={currentUser}
            onClose={() => setWorkspaceModal(null)}
            onAddMember={(uid) => addMemberToWorkspace(currentWorkspace.id, uid)}
            onRemoveMember={(uid) => removeMemberFromWorkspace(currentWorkspace.id, uid)}
            onSetRank={(uid, rank) => setMemberRank(currentWorkspace.id, uid, rank)}
            onDelete={() => deleteWorkspace(currentWorkspace.id)}
          />
        </Suspense>
      )}

      {/* AVATAR PICKER MODAL */}
      {showAvatarPicker && selUser && (() => {
        const pickerUser = users.find((u: typeof USERS_DEFAULT[number]) => u.id === selUser);
        if (!pickerUser) return null;
        const AnimBgPicker = () => <FloatingBg colors={[pickerUser.color, pickerUser.color + "88", t.accent + "44", pickerUser.color + "44"]} themeStyle={themeId} />;
        return (
          <AvatarStep6
            t={t} user={pickerUser as UserType} selAvatar={selAvatar} setSelAvatar={setSelAvatar}
            users={users} setUsers={setUsers} setCurrentUser={setCurrentUser}
            setOnboardStep={() => {}} selUser={selUser} AnimBg={AnimBgPicker}
            onClose={() => setShowAvatarPicker(false)}
            onConfirm={() => setShowAvatarPicker(false)}
          />
        );
      })()}

      {/* Documents BottomSheet — mobile only */}
      {isMobile && (
        <BottomSheet open={showDocumentsMobile} onClose={() => setShowDocumentsMobile(false)} title="// documents" t={t}>
          <ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}>
            <Suspense fallback={null}>
              <DocumentsPanel t={t} initialDocId={paletteDocId} />
            </Suspense>
          </ErrorBoundary>
        </BottomSheet>
      )}

      {/* CHAT — BottomSheet on mobile, fixed side-widget on desktop */}
      {isMobile ? (
        <BottomSheet open={showChat} onClose={() => setShowChat(false)} title="// team chat" t={t}>
          <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
            <Suspense fallback={<ChatSkeleton t={t} />}>
          <ChatPanel messages={chatMessages} onSend={sendChat} onRemoteMessage={handleRemoteMessage} users={users} currentUser={currentUser!} t={t} defaultTab={chatDefaultTab} onLoadMore={loadMoreMessages} hasMore={hasMoreMessages} buildAiContext={() => {
              const me = users.find(u => u.id === currentUser);
              const lines: string[] = [];
              lines.push(`Current user: ${me?.name || currentUser} (id=${currentUser}, role=${me?.role || "?"}, points=${getPoints(currentUser!)})`);
              lines.push(`Team: ${users.map(u => `${u.name} (${u.id}, ${u.role}, ${getPoints(u.id)}pts)`).join("; ")}`);
              lines.push("");
              lines.push(`Pipelines (${allPipelines.length}):`);
              allPipelines.forEach((p, pi) => {
                const pName = pipeMetaOverrides[p.id]?.name || p.name;
                const pPrio = pipeMetaOverrides[p.id]?.priority || p.priority;
                const pDesc = pipeDescOverrides[p.id] || p.desc;
                const locked = isLocked(p.id) ? " [LOCKED]" : "";
                const stages = [...p.stages, ...(customStages[p.id] || [])];
                lines.push(`${pi + 1}. ${pName} — ${pPrio} — ${pDesc}${locked}`);
                stages.forEach((s, si) => {
                  const st = getStatus(s);
                  const claimers = (claims[s] || []).map(id => users.find(u => u.id === id)?.name || id).join(", ") || "unclaimed";
                  const subN = (subtasks[s] || []).length;
                  const subDone = (subtasks[s] || []).filter(t => t.done).length;
                  const comN = (comments[s] || []).length;
                  const sDesc = stageDescOverrides[s] || "";
                  lines.push(`   ${pi + 1}.${si + 1} ${s} [${st}] — claimed by ${claimers}${subN ? ` — subtasks ${subDone}/${subN}` : ""}${comN ? ` — ${comN} comments` : ""}${sDesc ? ` — ${sDesc}` : ""}`);
                });
              });
              const recent = activityLog.slice(0, 8);
              if (recent.length) {
                lines.push("");
                lines.push("Recent activity:");
                recent.forEach(a => lines.push(`- ${a.user} ${a.type} ${a.target}${a.detail ? ` (${a.detail})` : ""}`));
              }
              return lines.join("\n");
            }} />
            </Suspense>
          </ErrorBoundary>
          </BottomSheet>
      ) : showChat ? (
        <div style={{ position: "fixed", bottom: 160, right: 16, width: "min(340px, calc(100vw - 32px))", zIndex: 500, animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowChat(false)}
              style={{ position: "absolute", top: 10, right: 12, zIndex: 10, background: "transparent", border: "none", cursor: "pointer", fontSize: 16, color: t.textMuted, lineHeight: 1, padding: 0 }}
              title="Close chat"
            >
              {"\u00D7"}
            </button>
            <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
              <Suspense fallback={<ChatSkeleton t={t} />}>
            <ChatPanel messages={chatMessages} onSend={sendChat} onRemoteMessage={handleRemoteMessage} users={users} currentUser={currentUser!} t={t} defaultTab={chatDefaultTab} onLoadMore={loadMoreMessages} hasMore={hasMoreMessages} buildAiContext={() => {
              const me = users.find(u => u.id === currentUser);
              const lines: string[] = [];
              lines.push(`Current user: ${me?.name || currentUser} (id=${currentUser}, role=${me?.role || "?"}, points=${getPoints(currentUser!)})`);
              lines.push(`Team: ${users.map(u => `${u.name} (${u.id}, ${u.role}, ${getPoints(u.id)}pts)`).join("; ")}`);
              lines.push("");
              lines.push(`Pipelines (${allPipelines.length}):`);
              allPipelines.forEach((p, pi) => {
                const pName = pipeMetaOverrides[p.id]?.name || p.name;
                const pPrio = pipeMetaOverrides[p.id]?.priority || p.priority;
                const pDesc = pipeDescOverrides[p.id] || p.desc;
                const locked = isLocked(p.id) ? " [LOCKED]" : "";
                const stages = [...p.stages, ...(customStages[p.id] || [])];
                lines.push(`${pi + 1}. ${pName} — ${pPrio} — ${pDesc}${locked}`);
                stages.forEach((s, si) => {
                  const st = getStatus(s);
                  const claimers = (claims[s] || []).map(id => users.find(u => u.id === id)?.name || id).join(", ") || "unclaimed";
                  const subN = (subtasks[s] || []).length;
                  const subDone = (subtasks[s] || []).filter(t => t.done).length;
                  const comN = (comments[s] || []).length;
                  const sDesc = stageDescOverrides[s] || "";
                  lines.push(`   ${pi + 1}.${si + 1} ${s} [${st}] — claimed by ${claimers}${subN ? ` — subtasks ${subDone}/${subN}` : ""}${comN ? ` — ${comN} comments` : ""}${sDesc ? ` — ${sDesc}` : ""}`);
                });
              });
              const recent = activityLog.slice(0, 8);
              if (recent.length) {
                lines.push("");
                lines.push("Recent activity:");
                recent.forEach(a => lines.push(`- ${a.user} ${a.type} ${a.target}${a.detail ? ` (${a.detail})` : ""}`));
              }
              return lines.join("\n");
            }} />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      ) : null}

            {/* FAB — Team chat trigger */}
      <button
        onClick={e => { e.stopPropagation(); setChatDefaultTab("team"); setShowChat(true); setChatNotif(null); }}
        title="Team chat"
        aria-label="Open team chat"
        style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 600,
          width: 48, height: 48, borderRadius: "50%",
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          boxShadow: `0 2px 12px rgba(0,0,0,0.25)`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
          transition: "all 0.2s",
        } as React.CSSProperties}
      >
        💬
        {chatNotif && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: t.accent, border: `2px solid ${t.bg}` }} />}
      </button>

            {/* FAB — AI chat trigger */}
      <button
        onClick={e => { e.stopPropagation(); setChatDefaultTab("ai"); setShowChat(prev => !prev); }}
        title={showChat && chatDefaultTab === "ai" ? "Close" : "Ask Binayah AI"}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 600,
          width: 54, height: 54, borderRadius: "50%",
          background: (showChat && chatDefaultTab === "ai")
            ? t.surface
            : `linear-gradient(135deg, ${t.accent}, ${t.purple || t.accent})`,
          border: `1px solid ${(showChat && chatDefaultTab === "ai") ? t.border : "transparent"}`,
          boxShadow: (showChat && chatDefaultTab === "ai")
            ? "none"
            : `0 4px 24px ${t.accent}55, 0 2px 8px rgba(0,0,0,0.3)`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: (showChat && chatDefaultTab === "ai") ? 20 : 22,
          transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          transform: (showChat && chatDefaultTab === "ai") ? "scale(0.9) rotate(90deg)" : "scale(1) rotate(0deg)",
          animation: (showChat && chatDefaultTab === "ai") ? "none" : "fabPulse 3s ease-in-out infinite",
        }}
      >
        {(showChat && chatDefaultTab === "ai") ? "×" : "🤖"}
      </button>

      <style>{`
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 4px 24px ${t.accent}55, 0 2px 8px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 4px 32px ${t.accent}88, 0 2px 12px rgba(0,0,0,0.4); }
        }
      `}</style>

      {/* Cmd+K Search Palette — global overlay */}
      <SearchPalette
        t={t}
        open={showPalette}
        onClose={() => setShowPalette(false)}
        onOpenStage={handlePaletteOpenStage}
        onOpenDocument={handlePaletteOpenDocument}
        onOpenPerson={handlePaletteOpenPerson}
      />

      {/* WELCOME MODAL — first login only (hosts the full multi-step onboarding) */}
      {showWelcome && initialUserId && me && (
        <WelcomeModal
          user={me}
          t={t}
          themeId={themeId}
          setThemeId={setThemeId}
          isDark={isDark}
          setIsDark={setIsDark}
          onDismiss={handleWelcomeDismiss}
        />
      )}

      {/* Error / action toast stack */}
      <ToastContainer t={t} toasts={toasts} onDismiss={dismissToast} />

      {/* Archive view toggle FAB */}
      {!isMobile && (
        <button
          onClick={() => setShowArchive(v => !v)}
          title={showArchive ? "Close archive" : "View archive"}
          style={{
            position: "fixed",
            bottom: 80,
            right: 28,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: showArchive ? t.amber + "22" : t.bgCard,
            border: `2px solid ${showArchive ? t.amber : t.border}`,
            color: showArchive ? t.amber : t.textMuted,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            transition: "all 0.2s",
            zIndex: 500,
          }}
        >
          📦
        </button>
      )}

      {/* Archive panel */}
      {showArchive && (
        <div style={{ position: "fixed", bottom: 132, right: 28, width: 340, maxHeight: "60vh", overflowY: "auto", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.25)", zIndex: 499, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: t.text, marginBottom: 4 }}>📦 archive</div>
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
