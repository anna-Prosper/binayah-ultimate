"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode,
} from "react";
import { useUndoStack, type UndoOp } from "@/lib/hooks/useUndoStack";
import { lsGet, lsSet } from "@/lib/storage";
import {
  pipelineData, stageDefaults, USERS_DEFAULT, STATUS_ORDER,
  ADMIN_IDS, DEFAULT_WORKSPACE_ID,
  type UserType, type SubtaskItem, type CommentItem, type ActivityItem, type Workspace,
} from "@/lib/data";
import { mkTheme, type T } from "@/lib/themes";
import { SubtaskKey } from "@/lib/subtaskKey";
import { patchState, pushMessage, pushComment, pushActivity, pushCommentReaction, type SharedState } from "@/lib/apiSync";
import { useSync, type SyncStatus } from "@/lib/hooks/useSync";
import { type ChatMsg } from "@/components/ChatPanel";

export type CustomPipeline = {
  id: string; name: string; desc: string; icon: string;
  colorKey: string; priority: string; totalHours: string; points: number; stages: string[];
};

// Always take name/role/avatar/color from USERS_DEFAULT — only preserve aiAvatar from saved state
export function hydrateUsers(saved: UserType[], current: UserType[] = []): UserType[] {
  const savedMap = Object.fromEntries(saved.map(u => [u.id, u]));
  const currentMap = Object.fromEntries(current.map(u => [u.id, u]));
  return USERS_DEFAULT.map(def => ({
    ...def,
    avatar: currentMap[def.id]?.avatar || savedMap[def.id]?.avatar || "",
    aiAvatar: currentMap[def.id]?.aiAvatar || savedMap[def.id]?.aiAvatar,
  })) as UserType[];
}

const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;

interface ModelContextValue {
  // Users / identity
  users: UserType[];
  setUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
  currentUser: string | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<string | null>>;
  me: UserType | undefined;

  // Streaks (server-derived, never client-written)
  streakByUser: Record<string, number>;

  // Model state
  claims: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  comments: Record<string, CommentItem[]>;
  subtasks: Record<string, SubtaskItem[]>;
  assignments: Record<string, string>;
  ownership: Record<string, { claimedBy: string[]; assignedTo?: string }>;
  stageStatusOverrides: Record<string, string>;
  approvedStages: string[];
  stageDescOverrides: Record<string, string>;
  stageNameOverrides: Record<string, string>;
  subtaskStages: Record<string, string>;
  pipeDescOverrides: Record<string, string>;
  setPipeDescOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  setPipeMetaOverrides: React.Dispatch<React.SetStateAction<Record<string, { name?: string; priority?: string }>>>;
  customStages: Record<string, string[]>;
  customPipelines: CustomPipeline[];
  workspaces: Workspace[];
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  activityLog: ActivityItem[];
  archivedStages: string[];
  archivedPipelines: string[];
  archivedSubtasks: string[];
  archived: { stages: string[]; pipelines: string[]; subtasks: string[] };
  stageImages: Record<string, string[]>;

  // Comment reactions: key = `${stageId}::${commentId}`, value = emoji → userIds[]
  commentReactions: Record<string, Record<string, string[]>>;
  handleCommentReact: (stageId: string, commentId: number, emoji: string) => void;

  // Anti-jump pending comments (buffered when user is typing)
  pendingNewComments: Record<string, CommentItem[]>;
  flushPendingComments: (stageId: string) => void;

  // Chat state
  chatMessages: ChatMsg[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
  hasMoreMessages: boolean;
  chatNotif: { name: string; text: string; isComment?: boolean; stage?: string; isReaction?: boolean; isClaim?: boolean } | null;
  setChatNotif: React.Dispatch<React.SetStateAction<{ name: string; text: string; isComment?: boolean; stage?: string; isReaction?: boolean; isClaim?: boolean } | null>>;

  // Live notifs (in-place stage card notification bursts)
  liveNotifs: Record<string, { comment?: string; reaction?: string }>;

  // Sync status
  syncStatus: SyncStatus;

  // Computed
  getStatus: (name: string) => string;
  getPoints: (uid: string) => number;
  sc: Record<string, { l: string; c: string }>;
  ck: Record<string, string>;
  pr: Record<string, { c: string }>;

  // All pipelines (static + custom)
  allPipelinesGlobal: (typeof pipelineData[number] | CustomPipeline)[];

  // Handlers
  handleClaim: (sid: string) => void;
  handleReact: (sid: string, emoji: string) => void;
  addComment: (sid: string, val: string, clearInput: () => void) => void;
  addSubtask: (sid: string, val: string, clearInput: () => void) => void;
  toggleSubtask: (sid: string, taskId: number) => void;
  renameSubtask: (sid: string, taskId: number, text: string) => void;
  lockSubtask: (sid: string, taskId: number) => void;
  removeSubtask: (sid: string, taskId: number) => void;
  archiveStage: (sid: string) => void;
  restoreStage: (sid: string) => void;
  archivePipeline: (pid: string) => void;
  restorePipeline: (pid: string) => void;
  archiveSubtask: (key: string) => void;
  restoreSubtask: (key: string) => void;
  setStageDescOverride: (name: string, val: string) => void;
  setStageNameOverride: (name: string, val: string) => void;
  setSubtaskStage: (key: string, status: string) => void;
  assignTask: (sid: string, userId: string | null) => void;
  setStageStatusDirect: (name: string, status: string) => void;
  cycleStatus: (name: string) => void;
  approveStage: (name: string) => void;
  addCustomStage: (pid: string, val: string) => void;
  addCustomPipeline: (form: { name: string; desc: string; icon: string; colorKey: string; priority: string }) => string | null;
  cyclePriority: (pid: string, cur: string) => void;
  addStageImage: (sid: string, dataUrl: string) => void;
  removeStageImage: (sid: string, idx: number) => void;
  sendChat: (text: string) => void;
  handleRemoteMessage: (msg: ChatMsg) => void;
  loadMoreMessages: () => Promise<void>;
  logActivity: (type: string, target: string, detail: string) => void;

  // Subtask migration
  migrateSubtask: (oldKey: SubtaskKey, newParentStageId: string) => void;

  // Workspace handlers
  createWorkspace: (name: string, icon: string, colorKey: string) => void;
  addMemberToWorkspace: (workspaceId: string, userId: string) => void;
  removeMemberFromWorkspace: (workspaceId: string, userId: string) => void;
  setMemberRank: (workspaceId: string, userId: string, rank: "captain" | "firstMate" | "crew") => void;
  deleteWorkspace: (workspaceId: string) => void;
  isOfficerOfWorkspace: (workspaceId: string) => boolean;

  // Undo stack
  undo: () => void;
  peek: UndoOp | null;
  stackLen: number;

  // Theme (re-exported so consumers don't need separate theme prop)
  t: T;
}

// Module-level mutable ref: stageId → whether user is actively typing in that stage's comment box.
// Updated by the comment input onChange handler so the poll merge can check without circular deps.
export const commentTypingState: { openStageId: string | null; hasInput: Record<string, boolean> } = {
  openStageId: null,
  hasInput: {},
};

const ModelContext = createContext<ModelContextValue | null>(null);

interface ModelProviderProps {
  children: ReactNode;
  initialUserId?: string;
  themeId: string;
  isDark: boolean;
  showToast?: (msg: string, color: string, durationMs?: number, action?: { label: string; onClick: () => void }) => void;
  currentWorkspaceId: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopToast = (_msg: string, _color: string, _durationMs?: number, _action?: { label: string; onClick: () => void }) => {};

export function ModelProvider({
  children,
  initialUserId,
  themeId,
  isDark,
  showToast = noopToast,
  currentWorkspaceId,
}: ModelProviderProps) {
  const t = mkTheme(themeId, isDark);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (initialUserId) return initialUserId;
    return lsGet("currentUser", null);
  });
  const [users, setUsers] = useState(() => hydrateUsers(lsGet("users", []) as UserType[]));

  useEffect(() => {
    if (initialUserId) {
      lsSet("currentUser", initialUserId);
      setCurrentUser(initialUserId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Model state ───────────────────────────────────────────────────────────
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>(() => lsGet("reactions", {}));
  const [claims, setClaims] = useState<Record<string, string[]>>(() => lsGet("claims", {}));
  const [assignments, setAssignments] = useState<Record<string, string>>(() => lsGet("assignments", {}));
  const [subtasks, setSubtasks] = useState<Record<string, SubtaskItem[]>>(() => lsGet("subtasks", {}));
  const [comments, setComments] = useState<Record<string, CommentItem[]>>(() => lsGet("comments", {}));
  const [stageStatusOverrides, setStageStatusOverrides] = useState<Record<string, string>>(() => lsGet("stageStatusOverrides", {}));
  const [approvedStages, setApprovedStages] = useState<string[]>(() => lsGet("approvedStages", []));
  const [stageDescOverrides, setStageDescOverrides] = useState<Record<string, string>>(() => lsGet("stageDescOverrides", {}));
  const [stageNameOverrides, setStageNameOverrides] = useState<Record<string, string>>(() => lsGet("stageNameOverrides", {}));
  const [subtaskStages, setSubtaskStages] = useState<Record<string, string>>(() => lsGet("subtaskStages", {}));
  const [pipeDescOverrides, setPipeDescOverrides] = useState<Record<string, string>>(() => lsGet("pipeDescOverrides", {}));
  const [pipeMetaOverrides, setPipeMetaOverrides] = useState<Record<string, { name?: string; priority?: string }>>(() => lsGet("pipeMetaOverrides", {}));
  const [customStages, setCustomStages] = useState<Record<string, string[]>>(() => lsGet("customStages", {}));
  const [customPipelines, setCustomPipelines] = useState<CustomPipeline[]>(() => lsGet("customPipelines", []));
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => lsGet("workspaces", []));
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() => lsGet("activityLog", []));
  const [archivedStages, setArchivedStages] = useState<string[]>(() => lsGet("archivedStages", []));
  const [archivedPipelines, setArchivedPipelines] = useState<string[]>(() => lsGet("archivedPipelines", []));
  const [archivedSubtasks, setArchivedSubtasks] = useState<string[]>(() => lsGet("archivedSubtasks", []));
  const [stageImages, setStageImages] = useState<Record<string, string[]>>(() => lsGet("stageImages", {}));
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [pendingNewComments, setPendingNewComments] = useState<Record<string, CommentItem[]>>({});

  // Streaks — server-derived, set via mergePatch from GET response
  const [streakByUser, setStreakByUser] = useState<Record<string, number>>({});

  // ── Chat state ────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [chatNotif, setChatNotif] = useState<{ name: string; text: string; isComment?: boolean; stage?: string; isReaction?: boolean; isClaim?: boolean } | null>(null);
  const [liveNotifs, setLiveNotifs] = useState<Record<string, { comment?: string; reaction?: string }>>({});

  // ── Sync refs (kept for poll-merge logic) ─────────────────────────────────
  const isPollUpdateRef = useRef(false);
  const knownCommentsRef = useRef<Record<string, number>>({});
  const prevClaimsRef = useRef<Record<string, string[]>>({});
  const prevReactionsRef = useRef<Record<string, Record<string, string[]>>>({});
  // pendingReactions: tracks in-flight reaction toggles so poll merges don't overwrite them
  const pendingReactionsRef = useRef<Set<string>>(new Set());

  // ── LocalStorage persistence ──────────────────────────────────────────────
  useEffect(() => { lsSet("currentUser", currentUser) }, [currentUser]);
  useEffect(() => { lsSet("users", users) }, [users]);
  useEffect(() => { lsSet("reactions", reactions) }, [reactions]);
  useEffect(() => { lsSet("claims", claims) }, [claims]);
  useEffect(() => { lsSet("assignments", assignments) }, [assignments]);
  useEffect(() => { lsSet("subtasks", subtasks) }, [subtasks]);
  useEffect(() => { lsSet("comments", comments) }, [comments]);
  useEffect(() => { lsSet("stageStatusOverrides", stageStatusOverrides) }, [stageStatusOverrides]);
  useEffect(() => { lsSet("approvedStages", approvedStages) }, [approvedStages]);
  useEffect(() => { lsSet("stageImages", stageImages) }, [stageImages]);
  useEffect(() => { lsSet("stageDescOverrides", stageDescOverrides) }, [stageDescOverrides]);
  useEffect(() => { lsSet("pipeDescOverrides", pipeDescOverrides) }, [pipeDescOverrides]);
  useEffect(() => { lsSet("pipeMetaOverrides", pipeMetaOverrides) }, [pipeMetaOverrides]);
  useEffect(() => { lsSet("customStages", customStages) }, [customStages]);
  useEffect(() => { lsSet("customPipelines", customPipelines) }, [customPipelines]);
  useEffect(() => { lsSet("workspaces", workspaces) }, [workspaces]);
  useEffect(() => { lsSet("archivedStages", archivedStages) }, [archivedStages]);
  useEffect(() => { lsSet("archivedPipelines", archivedPipelines) }, [archivedPipelines]);
  useEffect(() => { lsSet("archivedSubtasks", archivedSubtasks) }, [archivedSubtasks]);
  useEffect(() => { lsSet("activityLog", activityLog) }, [activityLog]);

  // One-time workspace migration
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (workspaces.length > 0) return;
    const allIds = [...pipelineData.map(p => p.id), ...customPipelines.map(p => p.id)];
    const warRoom: Workspace = {
      id: DEFAULT_WORKSPACE_ID, name: "Binayah AI", icon: "🤖", colorKey: "purple",
      members: USERS_DEFAULT.map(u => u.id), captains: [...ADMIN_IDS], firstMates: [], pipelineIds: allIds,
    };
    setWorkspaces([warRoom]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => prev.map(w => w.name === "War Room" ? { ...w, name: "Binayah AI", icon: "🤖" } : w));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notification sound ────────────────────────────────────────────────────
  const playNotifSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.25);
    } catch { /* blocked */ }
  }, []);

  // ── Activity log ──────────────────────────────────────────────────────────
  const logActivity = useCallback((type: string, target: string, detail: string) => {
    if (!currentUser) return;
    const entry = { type, user: currentUser, target, detail, time: Date.now() };
    setActivityLog(prev => [entry, ...prev.slice(0, 99)]);
    pushActivity(entry).then(result => { if (!result.ok) setSyncStatus("offline"); });
  }, [currentUser]);

  // ── useSync: mergePatch callback (handles both initial hydrate + poll updates) ──
  const mergePatch = useCallback((s: SharedState) => {
    if (!s || !Object.keys(s).length) return;
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
            setLiveNotifs(prev => ({ ...prev, [stage]: { ...prev[stage], reaction: emoji } }));
            setTimeout(() => setLiveNotifs(prev => { const n = { ...prev }; if (n[stage]) { delete n[stage].reaction; if (!Object.keys(n[stage]).length) delete n[stage]; } return n; }), 3500);
            break outer;
          }
        }
      }
      prevReactionsRef.current = s.reactions as Record<string, Record<string, string[]>>;
      // Don't overwrite reactions if there are in-flight optimistic toggles pending
      if (pendingReactionsRef.current.size === 0) {
        setReactions(s.reactions);
      }
    }
    if (s.activityLog) setActivityLog(s.activityLog);
    if (s.subtasks) setSubtasks(s.subtasks as Record<string, SubtaskItem[]>);
    if (s.comments) {
      let pendingCommentNotif: { name: string; text: string; isComment: true; stage: string } | null = null;
      let pendingLiveNotif: { stage: string; name: string } | null = null;
      const newPending: Record<string, CommentItem[]> = {};
      setComments(prev => {
        const remote = s.comments as Record<string, CommentItem[]>;
        let changed = false;
        const merged: Record<string, CommentItem[]> = { ...prev };
        for (const [stage, msgs] of Object.entries(remote)) {
          const existing = prev[stage] || [];
          const existingIds = new Set(existing.map(m => m.id));
          const incoming = msgs.filter(m => !existingIds.has(m.id));
          if (incoming.length > 0) {
            // Anti-jump: if user is currently typing in this stage's comment box, buffer the incoming
            const isTypingHere =
              commentTypingState.openStageId === stage &&
              commentTypingState.hasInput[stage];
            if (isTypingHere) {
              newPending[stage] = incoming;
            } else {
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
        }
        return changed ? merged : prev;
      });
      // Buffer pending for stages where user is typing
      if (Object.keys(newPending).length > 0) {
        setPendingNewComments(prev => {
          const next = { ...prev };
          for (const [stage, incoming] of Object.entries(newPending)) {
            const prevPending = prev[stage] || [];
            const prevIds = new Set(prevPending.map(m => m.id));
            const fresh = incoming.filter(m => !prevIds.has(m.id));
            if (fresh.length > 0) next[stage] = [...prevPending, ...fresh];
          }
          return next;
        });
      }
      if (pendingCommentNotif) { setChatNotif(pendingCommentNotif); playNotifSound(); setTimeout(() => setChatNotif(null), 5000); }
      if (pendingLiveNotif) {
        const { stage: stg, name } = pendingLiveNotif;
        setLiveNotifs(prev => ({ ...prev, [stg]: { ...prev[stg], comment: name } }));
        setTimeout(() => setLiveNotifs(prev => { const n = { ...prev }; if (n[stg]) { delete n[stg].comment; if (!Object.keys(n[stg]).length) delete n[stg]; } return n; }), 4000);
      }
    }
    if (s.commentReactions) {
      setCommentReactions(s.commentReactions as Record<string, Record<string, string[]>>);
    }
    if (s.stageStatusOverrides) setStageStatusOverrides(s.stageStatusOverrides);
    if (s.stageDescOverrides) setStageDescOverrides(s.stageDescOverrides);
    if (s.stageNameOverrides) setStageNameOverrides(s.stageNameOverrides);
    if (s.subtaskStages) setSubtaskStages(s.subtaskStages);
    if (s.pipeDescOverrides) setPipeDescOverrides(s.pipeDescOverrides);
    if (s.pipeMetaOverrides) setPipeMetaOverrides(s.pipeMetaOverrides as Record<string, { name?: string; priority?: string }>);
    if (s.customStages) setCustomStages(s.customStages);
    if (s.customPipelines) setCustomPipelines(s.customPipelines as CustomPipeline[]);
    if (s.users) setUsers(prev => hydrateUsers(s.users as UserType[], prev));
    if (s.workspaces && Array.isArray(s.workspaces) && s.workspaces.length > 0) setWorkspaces(s.workspaces as Workspace[]);
    if (s.archivedStages) setArchivedStages(s.archivedStages as string[]);
    if (s.archivedPipelines) setArchivedPipelines(s.archivedPipelines as string[]);
    if (s.archivedSubtasks) setArchivedSubtasks(s.archivedSubtasks as string[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((s as any).streakByUser) setStreakByUser((s as any).streakByUser as Record<string, number>);
    setTimeout(() => { isPollUpdateRef.current = false; }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  const getCurrentState = useCallback((): Partial<SharedState> => ({
    claims, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides,
    subtaskStages, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
    users, workspaces, archivedStages, archivedPipelines, archivedSubtasks,
  }), [claims, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides,
       subtaskStages, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
       users, workspaces, archivedStages, archivedPipelines, archivedSubtasks]);

  const { status: syncStatus, scheduleWrite, setOffline } = useSync({ onPatch: mergePatch, getPatch: getCurrentState });
  // Alias so handlers can signal offline state (argument ignored — always sets offline)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setSyncStatus = (_s: string) => setOffline();

  // ── Debounced write — delegate to useSync's scheduleWrite ────────────────
  useEffect(() => {
    if (isPollUpdateRef.current) return;
    scheduleWrite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides, subtaskStages, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines, users, archivedStages, archivedPipelines, archivedSubtasks]);

  // ── Fetch initial chat messages ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/pipeline-state/messages?limit=50")
      .then(r => r.json())
      .then((msgs: ChatMsg[]) => { if (Array.isArray(msgs)) setChatMessages(msgs); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const getStatus = useCallback((name: string) => stageStatusOverrides[name] || stageDefaults[name]?.status || "concept", [stageStatusOverrides]);

  const getPoints = useCallback((uid: string) => {
    let p = 0;
    Object.entries(claims).forEach(([s, claimers]) => {
      if (claimers.includes(uid) && approvedStages.includes(s)) p += stageDefaults[s]?.points || 10;
    });
    Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if (r.includes(uid)) p += 2; }); });
    return p;
  }, [claims, approvedStages, reactions]);

  const sc: Record<string, { l: string; c: string }> = {
    active: { l: "live", c: t.green }, "in-progress": { l: "building", c: t.amber },
    planned: { l: "planned", c: t.cyan || t.accent }, concept: { l: "concept", c: t.purple }, blocked: { l: "blocked", c: t.red },
  };
  const ck: Record<string, string> = { blue: t.accent, purple: t.purple, green: t.green, amber: t.amber, cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate };
  const pr: Record<string, { c: string }> = { NOW: { c: t.orange }, HIGH: { c: t.textMuted }, MEDIUM: { c: t.cyan || t.accent }, LOW: { c: t.textDim } };

  const ownership = useMemo(() => {
    const map: Record<string, { claimedBy: string[]; assignedTo?: string }> = {};
    for (const [k, v] of Object.entries(claims)) map[k] = { claimedBy: v };
    for (const [k, v] of Object.entries(assignments)) {
      if (!map[k]) map[k] = { claimedBy: [] };
      map[k].assignedTo = v;
    }
    return map;
  }, [claims, assignments]);

  const archived = useMemo(() => ({
    stages: archivedStages,
    pipelines: archivedPipelines,
    subtasks: archivedSubtasks,
  }), [archivedStages, archivedPipelines, archivedSubtasks]);

  const me = users.find(u => u.id === currentUser);
  const allPipelinesGlobal = [...pipelineData, ...customPipelines];

  // ── Undo stack ────────────────────────────────────────────────────────────
  const undoStack = useUndoStack();

  // ── isOfficerOfWorkspace ──────────────────────────────────────────────────
  const isOfficerOfWorkspace = useCallback((workspaceId: string) => {
    if (!currentUser) return false;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return false;
    return ws.captains.includes(currentUser) || ws.firstMates.includes(currentUser);
  }, [workspaces, currentUser]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClaim = (sid: string) => {
    if (!currentUser) return;
    const alreadyClaimed = (claims[sid] || []).includes(currentUser);
    setClaims(prev => {
      const c = prev[sid] || [];
      if (c.includes(currentUser)) return { ...prev, [sid]: c.filter(u => u !== currentUser) };
      return { ...prev, [sid]: [...c, currentUser] };
    });
    if (!alreadyClaimed) logActivity("claim", sid, "took ownership");
  };

  const assignTask = (sid: string, userId: string | null) => {
    if (!currentUser) return;
    const isSubtask = SubtaskKey.isValid(sid);
    setAssignments(prev => {
      const copy = { ...prev };
      const prevTaskAssignee = copy[sid] || null;
      if (!userId) { delete copy[sid]; } else { copy[sid] = userId; }
      if (!isSubtask && !sid.startsWith("_")) {
        const taskSubtasks = subtasks[sid] || [];
        for (const sub of taskSubtasks) {
          const subKey = SubtaskKey.make(sid, sub.id);
          const subAssignee = copy[subKey] || null;
          if (!subAssignee || subAssignee === prevTaskAssignee) {
            if (!userId) { delete copy[subKey]; } else { copy[subKey] = userId; }
          }
        }
      }
      return copy;
    });
    if (userId) {
      const assignee = users.find(u => u.id === userId);
      logActivity("assign", sid, `→ ${assignee?.name || userId}`);
    } else {
      logActivity("assign", sid, "unassigned");
    }
  };

  const handleReact = (sid: string, emoji: string) => {
    if (!currentUser) return;
    const prev = reactions;
    const s = { ...(prev[sid] || {}) };
    const u = [...(s[emoji] || [])];
    const i = u.indexOf(currentUser);
    if (i >= 0) u.splice(i, 1); else u.push(currentUser);
    s[emoji] = u;
    const next = { ...prev, [sid]: s };
    const pendingKey = `${sid}::${emoji}`;
    pendingReactionsRef.current.add(pendingKey);
    setReactions(next);
    patchState({ reactions: next }).then(result => {
      pendingReactionsRef.current.delete(pendingKey);
      if (!result.ok) {
        if (result.status === 423) {
          showToast("// pipeline locked — can't react", t.amber);
        } else {
          setReactions(prev);
          showToast("// reaction didn't land", t.amber);
        }
      }
    }).catch(() => {
      pendingReactionsRef.current.delete(pendingKey);
      setReactions(prev);
      showToast("// reaction didn't land", t.amber);
    });
  };

  const MAX_SUBTASKS = 20; const MAX_SUBTASK_LEN = 200;
  const addSubtask = (sid: string, val: string, clearInput: () => void) => {
    if (!val || !currentUser) return;
    if (val.length > MAX_SUBTASK_LEN) { showToast("// subtask too long — max 200 chars", t.red); return; }
    if ((subtasks[sid] || []).length >= MAX_SUBTASKS) { showToast("// max 20 subtasks per stage", t.amber); return; }
    const taskId = Date.now();
    setSubtasks(prev => ({ ...prev, [sid]: [...(prev[sid] || []), { id: taskId, text: val, done: false, by: currentUser }] }));
    clearInput();
  };

  const toggleSubtask = (sid: string, taskId: number) => {
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId && !t.locked ? { ...t, done: !t.done } : t) }));
  };
  const renameSubtask = (sid: string, taskId: number, text: string) => {
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, text } : t) }));
  };
  const lockSubtask = (sid: string, taskId: number) => {
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, locked: !t.locked } : t) }));
  };
  const removeSubtask = (sid: string, taskId: number) => {
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).filter(t => t.id !== taskId || t.locked) }));
  };

  const migrateSubtask = useCallback((oldKey: SubtaskKey, newParentStageId: string) => {
    const parsed = SubtaskKey.parse(oldKey);
    if (!parsed) return;
    const { parentStageId: oldParent, subtaskId } = parsed;
    if (oldParent === newParentStageId) return; // no-op

    const newKey = SubtaskKey.make(newParentStageId, subtaskId);

    // Atomic local state updates
    setSubtasks(prev => {
      const oldList = prev[oldParent] || [];
      const moving = oldList.find(s => s.id === subtaskId);
      if (!moving) return prev;
      const newOldList = oldList.filter(s => s.id !== subtaskId);
      const newNewList = [...(prev[newParentStageId] || []), moving];
      return { ...prev, [oldParent]: newOldList, [newParentStageId]: newNewList };
    });

    setReactions(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    setSubtaskStages(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    setAssignments(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    // Push to undo stack
    undoStack.push({
      label: `moved subtask to ${newParentStageId}`,
      inverse: () => migrateSubtask(newKey as SubtaskKey, oldParent),
    });

    logActivity("subtask_migrated", newParentStageId, `subtask moved from ${oldParent}`);

    // Schedule a server write after React has flushed the state batches
    setTimeout(() => { scheduleWrite(); }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, logActivity]);

  const MAX_COMMENT_LEN = 1000;
  const addComment = (sid: string, val: string, clearInput: () => void) => {
    if (!val || !currentUser) return;
    if (val.length > MAX_COMMENT_LEN) { showToast("// comment too long — max 1000 chars", t.red); return; }
    const commentId = Date.now();
    const c = { id: commentId, text: val, by: currentUser, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setComments(prev => ({ ...prev, [sid]: [...(prev[sid] || []), c] }));
    clearInput();
    logActivity("comment", sid, val.slice(0, 100));
    pushComment(sid, c).then(result => {
      if (!result.ok) {
        setComments(prev => ({ ...prev, [sid]: (prev[sid] || []).filter(x => x.id !== commentId) }));
        setSyncStatus("offline");
        showToast("// comment lost — try again", t.red);
      }
    });
  };

  // ── flushPendingComments — merge buffered comments into main list ──────────
  const flushPendingComments = useCallback((stageId: string) => {
    setPendingNewComments(prev => {
      const pending = prev[stageId];
      if (!pending || pending.length === 0) return prev;
      setComments(c => {
        const existing = c[stageId] || [];
        const existingIds = new Set(existing.map(m => m.id));
        const fresh = pending.filter(m => !existingIds.has(m.id));
        if (fresh.length === 0) return c;
        return { ...c, [stageId]: [...existing, ...fresh].sort((a, b) => a.id - b.id) };
      });
      const next = { ...prev };
      delete next[stageId];
      return next;
    });
  }, []);

  // ── handleCommentReact — optimistic toggle + server sync ──────────────────
  const handleCommentReact = useCallback((stageId: string, commentId: number, emoji: string) => {
    if (!currentUser) return;
    const key = `${stageId}::${commentId}`;
    // Capture the pre-toggle snapshot synchronously inside the updater so it is
    // never stale regardless of when React batches or schedules this callback.
    let snapshot: Record<string, Record<string, string[]>> | null = null;
    setCommentReactions(prev => {
      snapshot = prev; // exact state at the moment of this update
      const entry = { ...(prev[key] || {}) };
      const arr = [...(entry[emoji] || [])];
      const idx = arr.indexOf(currentUser);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(currentUser);
      entry[emoji] = arr;
      return { ...prev, [key]: entry };
    });
    pushCommentReaction({ stageId, commentId, emoji }).then(result => {
      if (!result.ok) {
        // Restore the snapshot captured at toggle time (not a closure variable)
        setCommentReactions(snapshot!);
        showToast("// reaction failed", t.amber);
      }
    });
  }, [currentUser, t.amber, showToast]);

  const archiveStage = (sid: string) => {
    if (archivedStages.includes(sid)) return;
    const label = `archived "${stageNameOverrides[sid] || sid}"`;
    const op = undoStack.push({
      label,
      inverse: () => setArchivedStages(prev => prev.filter(s => s !== sid)),
    });
    setArchivedStages(prev => [...prev, sid]);
    logActivity("claim", sid, "archived");
    showToast(label, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); setArchivedStages(prev => prev.filter(s => s !== sid)); },
    });
  };
  const restoreStage = (sid: string) => { setArchivedStages(prev => prev.filter(s => s !== sid)); showToast(`restored: ${stageNameOverrides[sid] || sid}`, t.green); };
  const archivePipeline = (pid: string) => {
    if (archivedPipelines.includes(pid)) return;
    const label = `archived pipeline "${pid}"`;
    const op = undoStack.push({
      label,
      inverse: () => setArchivedPipelines(prev => prev.filter(p => p !== pid)),
    });
    setArchivedPipelines(prev => [...prev, pid]);
    showToast(label, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); setArchivedPipelines(prev => prev.filter(p => p !== pid)); },
    });
  };
  const restorePipeline = (pid: string) => { setArchivedPipelines(prev => prev.filter(p => p !== pid)); showToast("pipeline restored", t.green); };
  const archiveSubtask = (key: string) => {
    if (archivedSubtasks.includes(key)) return;
    const op = undoStack.push({
      label: `archived subtask`,
      inverse: () => setArchivedSubtasks(prev => prev.filter(k => k !== key)),
    });
    setArchivedSubtasks(prev => [...prev, key]);
    showToast(`archived subtask`, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); setArchivedSubtasks(prev => prev.filter(k => k !== key)); },
    });
  };
  const restoreSubtask = (key: string) => { setArchivedSubtasks(prev => prev.filter(k => k !== key)); };

  const setStageDescOverride = (name: string, val: string) => setStageDescOverrides(prev => ({ ...prev, [name]: val }));
  const setStageNameOverride = (name: string, val: string) => setStageNameOverrides(prev => ({ ...prev, [name]: val }));
  const setSubtaskStage = (key: string, status: string) => setSubtaskStages(prev => ({ ...prev, [key]: status }));

  const setStageStatusDirect = (name: string, status: string) => {
    setStageStatusOverrides(prev => ({ ...prev, [name]: status }));
    logActivity("status", name, `→ ${status}`);
  };

  const cycleStatus = (name: string) => {
    const cur = getStatus(name);
    const idx = STATUS_ORDER.indexOf(cur);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setStageStatusOverrides(prev => ({ ...prev, [name]: next }));
    logActivity("status", name, `→ ${next}`);
  };

  const approveStage = (name: string) => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    if (!currentUser || !ws || !(ws.captains.includes(currentUser) || ws.firstMates.includes(currentUser))) {
      showToast("// only captain or first mate can approve", t.amber); return;
    }
    if (approvedStages.includes(name)) return;
    setApprovedStages(prev => [...prev, name]);
    logActivity("status", name, "→ approved");
  };

  const addCustomStage = (pid: string, val: string) => {
    if (!val) return;
    setCustomStages(prev => ({ ...prev, [pid]: [...(prev[pid] || []), val] }));
  };

  const addCustomPipeline = (form: { name: string; desc: string; icon: string; colorKey: string; priority: string }): string | null => {
    if (!form.name.trim()) return null;
    const id = `custom-${Date.now()}`;
    setCustomPipelines(prev => [...prev, { ...form, id, totalHours: "?h", points: 0, stages: [] }]);
    if (currentWorkspaceId) {
      setWorkspaces(prev => prev.map(w => w.id === currentWorkspaceId && !w.pipelineIds.includes(id) ? { ...w, pipelineIds: [...w.pipelineIds, id] } : w));
    }
    return id;
  };

  const cyclePriority = (pid: string, cur: string) => {
    const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(cur as typeof PRIORITY_CYCLE[number]) + 1) % PRIORITY_CYCLE.length];
    setPipeMetaOverrides(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), priority: next } }));
  };

  const addStageImage = (sid: string, dataUrl: string) => { setStageImages(prev => ({ ...prev, [sid]: [...(prev[sid] || []), dataUrl] })); };
  const removeStageImage = (sid: string, idx: number) => { setStageImages(prev => ({ ...prev, [sid]: (prev[sid] || []).filter((_, i) => i !== idx) })); };

  // ── Chat handlers ─────────────────────────────────────────────────────────
  const sendChat = (text: string) => {
    if (!currentUser) return;
    const msgId = Date.now();
    const msg: ChatMsg = { id: msgId, userId: currentUser, text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setChatMessages(prev => [...prev, msg]);
    pushMessage(msg).then(result => {
      if (!result.ok) {
        setChatMessages(prev => prev.filter(m => m.id !== msgId));
        setSyncStatus("offline");
        showToast("// message lost — try again", t.red);
      }
    });
  };

  const handleRemoteMessage = useCallback((msg: ChatMsg) => {
    let pendingNotif: { name: string; text: string } | null = null;
    setChatMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev;
      if (msg.userId !== currentUser) {
        const sender = users.find(u => u.id === msg.userId);
        pendingNotif = { name: sender?.name || msg.userId, text: msg.text };
      }
      return [...prev, msg].sort((a, b) => a.id - b.id);
    });
    if (pendingNotif) { setChatNotif(pendingNotif); playNotifSound(); setTimeout(() => setChatNotif(null), 4000); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  const loadMoreMessages = async () => {
    if (!hasMoreMessages || chatMessages.length === 0) return;
    const oldest = chatMessages[0];
    try {
      const res = await fetch(`/api/pipeline-state/messages?before=${oldest.id}&limit=50`);
      const older: ChatMsg[] = await res.json();
      if (!Array.isArray(older) || older.length === 0) { setHasMoreMessages(false); return; }
      setChatMessages(prev => [...older, ...prev]);
      if (older.length < 50) setHasMoreMessages(false);
    } catch { /* ignore */ }
  };

  // ── Workspace handlers ────────────────────────────────────────────────────
  const createWorkspace = (name: string, icon: string, colorKey: string) => {
    if (!currentUser) return;
    if (!workspaces.some(w => w.captains.includes(currentUser))) { showToast("// only a captain can create a workspace", t.amber); return; }
    const trimmed = name.trim();
    if (!trimmed) { showToast("// workspace needs a name", t.amber); return; }
    const id = `ws-${Date.now()}`;
    setWorkspaces(prev => [...prev, { id, name: trimmed, icon: icon || "🏴", colorKey: colorKey || "purple", members: [currentUser], captains: [currentUser], firstMates: [], pipelineIds: [] }]);
    showToast(`// workspace "${trimmed}" created`, t.green);
    logActivity("claim", id, `created workspace ${trimmed}`);
  };

  const addMemberToWorkspace = (workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ws.firstMates.includes(currentUser)) { showToast("// only captain/first mate can manage members", t.amber); return; }
    if (ws.members.includes(userId)) return;
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: [...w.members, userId] } : w));
  };

  const removeMemberFromWorkspace = (workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ws.firstMates.includes(currentUser)) { showToast("// only captain/first mate can manage members", t.amber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId) { showToast("// can't remove the only captain", t.red); return; }
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: w.members.filter(id => id !== userId), captains: w.captains.filter(id => id !== userId), firstMates: w.firstMates.filter(id => id !== userId) } : w));
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
    showToast(`// workspace "${ws.name}" deleted`, t.amber);
  };

  const value: ModelContextValue = {
    users, setUsers, currentUser, setCurrentUser, me,
    streakByUser,
    claims, reactions, comments, subtasks, assignments, ownership,
    commentReactions, handleCommentReact,
    pendingNewComments, flushPendingComments,
    stageStatusOverrides, approvedStages, stageDescOverrides, stageNameOverrides,
    subtaskStages, pipeDescOverrides, setPipeDescOverrides, pipeMetaOverrides, setPipeMetaOverrides,
    customStages, customPipelines, workspaces, setWorkspaces, activityLog,
    archivedStages, archivedPipelines, archivedSubtasks, archived, stageImages,
    chatMessages, setChatMessages, hasMoreMessages, chatNotif, setChatNotif, liveNotifs,
    syncStatus,
    getStatus, getPoints, sc, ck, pr,
    allPipelinesGlobal,
    handleClaim, handleReact, addComment, addSubtask, toggleSubtask, renameSubtask,
    lockSubtask, removeSubtask,
    archiveStage, restoreStage, archivePipeline, restorePipeline, archiveSubtask, restoreSubtask,
    setStageDescOverride, setStageNameOverride, setSubtaskStage, assignTask,
    setStageStatusDirect, cycleStatus, approveStage,
    addCustomStage, addCustomPipeline, cyclePriority,
    addStageImage, removeStageImage, sendChat, handleRemoteMessage, loadMoreMessages, logActivity,
    migrateSubtask,
    createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace,
    isOfficerOfWorkspace,
    undo: undoStack.undo,
    peek: undoStack.peek,
    stackLen: undoStack.stack.length,
    t,
  };

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

// ── Memoized per-stage selectors ─────────────────────────────────────────────

export function useStage(stageId: string) {
  const { claims, reactions, comments, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides, assignments } = useModel();
  return useMemo(() => ({
    claimers: claims[stageId] || [],
    reactions: reactions[stageId] || {},
    comments: comments[stageId] || [],
    subtasks: subtasks[stageId] || [],
    status: stageStatusOverrides?.[stageId],
    desc: stageDescOverrides?.[stageId],
    displayName: stageNameOverrides?.[stageId] || stageId,
    assignedTo: assignments[stageId],
  }), [claims, reactions, comments, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides, assignments, stageId]);
}

export function usePipeline(pipelineId: string) {
  const { customPipelines, pipeMetaOverrides, pipeDescOverrides, customStages } = useModel();
  return useMemo(() => ({
    nameOverride: pipeMetaOverrides[pipelineId]?.name,
    descOverride: pipeDescOverrides[pipelineId],
    priority: pipeMetaOverrides[pipelineId]?.priority,
    customStages: customStages[pipelineId] || [],
  }), [customPipelines, pipeMetaOverrides, pipeDescOverrides, customStages, pipelineId]);
}

export function useOwnership(stageId: string) {
  const { ownership, currentUser } = useModel();
  return useMemo(() => {
    const entry = ownership[stageId] || { claimedBy: [] };
    return {
      claimedBy: entry.claimedBy,
      isMine: currentUser ? entry.claimedBy.includes(currentUser) : false,
      assignedTo: entry.assignedTo || null,
      isAssignedToMe: currentUser ? entry.assignedTo === currentUser : false,
    };
  }, [ownership, currentUser, stageId]);
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
}

/**
 * Returns the current user's role in the given workspace.
 * "captain" | "firstMate" | "crew" | null (null = not a member)
 */
export function useRole(workspaceId?: string): "captain" | "firstMate" | "crew" | null {
  const { workspaces, currentUser } = useModel();
  return useMemo(() => {
    if (!workspaceId || !currentUser) return null;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return null;
    if (ws.captains.includes(currentUser)) return "captain";
    if (ws.firstMates.includes(currentUser)) return "firstMate";
    if (ws.members.includes(currentUser)) return "crew";
    return null;
  }, [workspaceId, workspaces, currentUser]);
}
