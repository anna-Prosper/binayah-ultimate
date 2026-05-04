"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode,
} from "react";
import { useUndoStack, type UndoOp } from "@/lib/hooks/useUndoStack";
import { lsGet, lsSet } from "@/lib/storage";
import { deriveStageDisplayPoints } from "@/lib/points";
import {
  pipelineData, stageDefaults, USERS_DEFAULT, STATUS_ORDER,
  ADMIN_IDS, DEFAULT_WORKSPACE_ID,
	  type UserType, type SubtaskItem, type CommentItem, type ActivityItem, type Workspace, type ExecProposal, type ReminderItem, type NoteItem, type BugItem, type BugSeverity, type BugStatus, type BugType,
	} from "@/lib/data";
import { mkTheme, type T } from "@/lib/themes";
import { SubtaskKey } from "@/lib/subtaskKey";
import { deleteComment as deleteCommentRemote, patchState, pushMessage, pushComment, pushActivity, pushCommentReaction, type ChatAttachment, type SharedState } from "@/lib/apiSync";
import { useSync, type SyncStatus } from "@/lib/hooks/useSync";
import { type ChatMsg } from "@/components/ChatPanel";

export type CustomPipeline = {
  id: string; name: string; desc: string; icon: string;
  colorKey: string; priority: string; totalHours?: string; points: number; stages: string[];
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
  /** Canonical ownership map. Each entry is the union of self-claims + admin assignments. */
  owners: Record<string, string[]>;
  /** @deprecated alias of `owners` — every owner counts as a claimer. New code should use `owners`. */
  claims: Record<string, string[]>;
  /** @deprecated empty record — assignments collapsed into `owners`. */
  assignments: Record<string, string[]>;
  reactions: Record<string, Record<string, string[]>>;
  comments: Record<string, CommentItem[]>;
  subtasks: Record<string, SubtaskItem[]>;
  ownership: Record<string, { claimedBy: string[]; assignedTo: string[] }>;
  stageStatusOverrides: Record<string, string>;
  approvedStages: string[];
  approvedSubtasks: string[];
  /** Pipelines that have already paid the +25% completion bonus. */
  approvedPipelines: string[];
  stageDescOverrides: Record<string, string>;
  stageDueDates: Record<string, string>;
  setStageDueDate: (name: string, val: string | null) => void;
  stageNameOverrides: Record<string, string>;
  stagePointsOverride: Record<string, number>;
  setStagePointsOverride: (stageId: string, pts: number | null) => void;
  subtaskStages: Record<string, string>;
  subtaskDescOverrides: Record<string, string>;
  setSubtaskDescOverride: (key: string, desc: string | null) => void;
  subtaskDueDates: Record<string, string>;
  setSubtaskDueDate: (key: string, val: string | null) => void;
  pipeDescOverrides: Record<string, string>;
  setPipeDescOverrides: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  setPipeMetaOverrides: React.Dispatch<React.SetStateAction<Record<string, { name?: string; priority?: string }>>>;
  customStages: Record<string, string[]>;
  customPipelines: CustomPipeline[];
  workspaces: Workspace[];
  setWorkspaces: React.Dispatch<React.SetStateAction<Workspace[]>>;
  activityLog: ActivityItem[];
	  reminders: ReminderItem[];
	  addReminder: (input: { title: string; body: string; recipientIds: string[]; remindAt: string }) => void;
	  dismissReminder: (id: number) => void;
	  notes: NoteItem[];
	  addNote: (input: { title: string; body: string; pinnedTo?: string; color?: string }) => void;
	  updateNote: (id: number, patch: Partial<Pick<NoteItem, "title" | "body" | "pinnedTo" | "color">>) => void;
	  deleteNote: (id: number) => void;
  bugs: BugItem[];
  addBug: (input: { title: string; body?: string; steps?: string; expected?: string; actual?: string; type: BugType; severity: BugSeverity; status?: BugStatus; ownerId?: string; linkedTask?: string }) => void;
  updateBug: (id: number, patch: Partial<Pick<BugItem, "title" | "body" | "steps" | "expected" | "actual" | "type" | "severity" | "status" | "ownerId" | "linkedTask">>) => void;
  deleteBug: (id: number) => void;
  execProposals: ExecProposal[];
  addExecProposal: (title: string, body: string) => void;
  requestWorkChange: (input: { kind: "edit" | "archive" | "assign"; target: string; title: string; body: string; requestedAction: string; requestedValue?: string | null; requestedUserId?: string | null }) => void;
  updateExecProposalStatus: (id: number, status: "reviewed" | "rejected" | "canceled") => void;
  applyExecProposal: (id: number) => void;
  cancelExecProposal: (id: number) => void;
  deleteExecProposal: (id: number) => void;
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
	  deleteComment: (sid: string, commentId: number) => void;
  addSubtask: (sid: string, val: string, clearInput: () => void) => number | null;
  toggleSubtask: (sid: string, taskId: number) => void;
  renameSubtask: (sid: string, taskId: number, text: string) => void;
  lockSubtask: (sid: string, taskId: number) => void;
  removeSubtask: (sid: string, taskId: number) => void;
  setSubtaskPoints: (sid: string, taskId: number, points: number) => void;
  archiveStage: (sid: string) => void;
  restoreStage: (sid: string) => void;
  archivePipeline: (pid: string) => void;
  restorePipeline: (pid: string) => void;
  archiveSubtask: (key: string) => void;
  restoreSubtask: (key: string) => void;
  setStageDescOverride: (name: string, val: string) => void;
  setStageNameOverride: (name: string, val: string) => void;
  setSubtaskStage: (key: string, status: string) => void;
  getSubtaskStatus: (key: string) => string;
  cycleSubtaskStatus: (key: string) => void;
  assignTask: (sid: string, userId: string | null) => void;
  setStageStatusDirect: (name: string, status: string) => void;
  cycleStatus: (name: string) => void;
  approveStage: (name: string) => void;
  approveSubtask: (key: string) => void;
  addCustomStage: (pid: string, val: string) => void;
  addCustomPipeline: (form: { name: string; desc: string; icon: string; colorKey: string; priority: string }) => string | null;
  addUnparentedStage: (title: string) => Promise<string | null>;
  moveStageToPipeline: (stageName: string, fromPid: string, toPid: string) => void;
  cyclePriority: (pid: string, cur: string) => void;
  addStageImage: (sid: string, dataUrl: string) => void;
  removeStageImage: (sid: string, idx: number) => void;
	  sendChat: (text: string, opts?: { threadId?: string; attachments?: ChatAttachment[] }) => void;
  handleRemoteMessage: (msg: ChatMsg) => void;
  loadMoreMessages: () => Promise<void>;
  logActivity: (type: string, target: string, detail: string, notifyTo?: string[]) => void;

  // Subtask migration
  migrateSubtask: (oldKey: SubtaskKey, newParentStageId: string) => void;

  // Workspace handlers
  createWorkspace: (name: string, icon: string, colorKey: string) => void;
  addMemberToWorkspace: (workspaceId: string, userId: string) => void;
  removeMemberFromWorkspace: (workspaceId: string, userId: string) => void;
  setMemberRank: (workspaceId: string, userId: string, rank: "operator" | "agent") => void;
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
// Sentinel pipeline ID for orphan / unparented stages — created via "+ new task"
// and rendered as a virtual "Inbox" pipeline until the user assigns a real one in edit mode.
export const INBOX_PIPELINE_ID_CONST = "__inbox__";
export { INBOX_PIPELINE_ID_CONST as INBOX_PIPELINE_ID };

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

const noopToast: Required<Pick<ModelProviderProps, "showToast">>["showToast"] = () => {};

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
  // owners is the canonical ownership field. Replaces the old claims+assignments
  // split — both are now ways IN to the same list. Hydrate-merges any legacy
  // localStorage values from claims/assignments into owners on first load.
  const [owners, setOwners] = useState<Record<string, string[]>>(() => {
    const fromOwners = lsGet("owners", {} as Record<string, unknown>);
    const fromClaims = lsGet("claims", {} as Record<string, unknown>);
    const fromAssign = lsGet("assignments", {} as Record<string, unknown>);
    const merged: Record<string, string[]> = {};
    const addList = (key: string, raw: unknown) => {
      const list = Array.isArray(raw)
        ? (raw as unknown[]).filter(x => typeof x === "string") as string[]
        : typeof raw === "string" && raw ? [raw] : [];
      if (list.length === 0) return;
      merged[key] = Array.from(new Set([...(merged[key] || []), ...list]));
    };
    for (const [k, v] of Object.entries(fromOwners)) addList(k, v);
    for (const [k, v] of Object.entries(fromClaims)) addList(k, v);
    for (const [k, v] of Object.entries(fromAssign)) addList(k, v);
    return merged;
  });
  const [subtasks, setSubtasks] = useState<Record<string, SubtaskItem[]>>(() => lsGet("subtasks", {}));
  const [comments, setComments] = useState<Record<string, CommentItem[]>>(() => lsGet("comments", {}));
  const [stageStatusOverrides, setStageStatusOverrides] = useState<Record<string, string>>(() => lsGet("stageStatusOverrides", {}));
  const [approvedStages, setApprovedStages] = useState<string[]>(() => lsGet("approvedStages", []));
  const [approvedSubtasks, setApprovedSubtasks] = useState<string[]>(() => lsGet("approvedSubtasks", []));
  // Pipelines that have already paid out the +25% completion bonus. Idempotent —
  // a pipeline only ever pays once even if its last stage gets re-approved.
  const [approvedPipelines, setApprovedPipelines] = useState<string[]>(() => lsGet("approvedPipelines", []));
  const [stageDescOverrides, setStageDescOverrides] = useState<Record<string, string>>(() => lsGet("stageDescOverrides", {}));
  const [stageDueDates, setStageDueDates] = useState<Record<string, string>>(() => lsGet("stageDueDates", {}));
  const [stageNameOverrides, setStageNameOverrides] = useState<Record<string, string>>(() => lsGet("stageNameOverrides", {}));
  const [subtaskStages, setSubtaskStages] = useState<Record<string, string>>(() => lsGet("subtaskStages", {}));
  const [subtaskDescOverrides, setSubtaskDescOverrides] = useState<Record<string, string>>(() => lsGet("subtaskDescOverrides", {}));
  const [subtaskDueDates, setSubtaskDueDates] = useState<Record<string, string>>(() => lsGet("subtaskDueDates", {}));
  const [pipeDescOverrides, setPipeDescOverrides] = useState<Record<string, string>>(() => lsGet("pipeDescOverrides", {}));
  const [pipeMetaOverrides, setPipeMetaOverrides] = useState<Record<string, { name?: string; priority?: string }>>(() => lsGet("pipeMetaOverrides", {}));
  const [customStages, setCustomStages] = useState<Record<string, string[]>>(() => lsGet("customStages", {}));
  const [customPipelines, setCustomPipelines] = useState<CustomPipeline[]>(() => lsGet("customPipelines", []));
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => lsGet("workspaces", []));
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() => lsGet("activityLog", []));
  const [reminders, setReminders] = useState<ReminderItem[]>(() => lsGet("reminders", []));
  const [notes, setNotes] = useState<NoteItem[]>(() => lsGet("notes", []));
  const [bugs, setBugs] = useState<BugItem[]>(() => lsGet("bugs", []));
  const [execProposals, setExecProposals] = useState<ExecProposal[]>(() => lsGet("execProposals", []));
  const [archivedStages, setArchivedStages] = useState<string[]>(() => lsGet("archivedStages", []));
  const [archivedPipelines, setArchivedPipelines] = useState<string[]>(() => lsGet("archivedPipelines", []));
  const [archivedSubtasks, setArchivedSubtasks] = useState<string[]>(() => lsGet("archivedSubtasks", []));
  const [stageImages, setStageImages] = useState<Record<string, string[]>>(() => lsGet("stageImages", {}));
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [stagePointsOverride, setStagePointsOverrideState] = useState<Record<string, number>>(() => lsGet("stagePointsOverride", {}));
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
  // True during the initial hydrate call — suppress claim/reaction notifications on load
  const isInitialHydrateRef = useRef(true);
  // pendingReactions: tracks in-flight reaction toggles so poll merges don't overwrite them
  const pendingReactionsRef = useRef<Set<string>>(new Set());
  // localWrites: timestamps of recent optimistic writes by slice — poll merges skip slices written within the window
  // Window must comfortably exceed the scheduleWrite debounce (1.5s) + server round-trip (~500ms) so writes survive merge.
  const localWritesRef = useRef<Record<string, number>>({});
  const LOCAL_WRITE_PROTECT_MS = 4000;
  const markLocalWrite = useCallback((slice: string) => {
    localWritesRef.current[slice] = Date.now();
  }, []);
  const isProtected = (slice: string) => {
    const t = localWritesRef.current[slice];
    return t !== undefined && Date.now() - t < LOCAL_WRITE_PROTECT_MS;
  };

  // ── LocalStorage persistence ──────────────────────────────────────────────
  useEffect(() => { lsSet("currentUser", currentUser) }, [currentUser]);
  useEffect(() => { lsSet("users", users) }, [users]);
  useEffect(() => { lsSet("reactions", reactions) }, [reactions]);
  useEffect(() => { lsSet("owners", owners) }, [owners]);
  useEffect(() => { lsSet("approvedPipelines", approvedPipelines) }, [approvedPipelines]);
  useEffect(() => { lsSet("subtasks", subtasks) }, [subtasks]);
  useEffect(() => { lsSet("comments", comments) }, [comments]);
  useEffect(() => { lsSet("stageStatusOverrides", stageStatusOverrides) }, [stageStatusOverrides]);
  useEffect(() => { lsSet("approvedStages", approvedStages) }, [approvedStages]);
  useEffect(() => { lsSet("approvedSubtasks", approvedSubtasks) }, [approvedSubtasks]);
  useEffect(() => { lsSet("stageImages", stageImages) }, [stageImages]);
  useEffect(() => { lsSet("stageDescOverrides", stageDescOverrides) }, [stageDescOverrides]);
  useEffect(() => { lsSet("stageDueDates", stageDueDates) }, [stageDueDates]);
  useEffect(() => { lsSet("subtaskDescOverrides", subtaskDescOverrides) }, [subtaskDescOverrides]);
  useEffect(() => { lsSet("subtaskDueDates", subtaskDueDates) }, [subtaskDueDates]);
  useEffect(() => { lsSet("pipeDescOverrides", pipeDescOverrides) }, [pipeDescOverrides]);
  useEffect(() => { lsSet("pipeMetaOverrides", pipeMetaOverrides) }, [pipeMetaOverrides]);
  useEffect(() => { lsSet("customStages", customStages) }, [customStages]);
  useEffect(() => { lsSet("customPipelines", customPipelines) }, [customPipelines]);
  useEffect(() => { lsSet("workspaces", workspaces) }, [workspaces]);
  useEffect(() => { lsSet("archivedStages", archivedStages) }, [archivedStages]);
  useEffect(() => { lsSet("archivedPipelines", archivedPipelines) }, [archivedPipelines]);
  useEffect(() => { lsSet("archivedSubtasks", archivedSubtasks) }, [archivedSubtasks]);
  useEffect(() => { lsSet("activityLog", activityLog) }, [activityLog]);
  useEffect(() => { lsSet("reminders", reminders) }, [reminders]);
  useEffect(() => { lsSet("notes", notes) }, [notes]);
  useEffect(() => { lsSet("bugs", bugs) }, [bugs]);
  useEffect(() => { lsSet("execProposals", execProposals) }, [execProposals]);
  useEffect(() => { lsSet("stagePointsOverride", stagePointsOverride) }, [stagePointsOverride]);

  // One-time workspace migration
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (workspaces.length > 0) return;
    const allIds = [...pipelineData.map(p => p.id), ...customPipelines.map(p => p.id)];
    const warRoom: Workspace = {
      id: DEFAULT_WORKSPACE_ID, name: "Binayah AI", icon: "🤖", colorKey: "purple",
      members: USERS_DEFAULT.map(u => u.id), captains: [...ADMIN_IDS], pipelineIds: allIds,
    };
    setWorkspaces([warRoom]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => prev.map(w => w.name === "War Room" ? { ...w, name: "Binayah AI", icon: "🤖" } : w));
  }, []);

  // Self-heal + legacy migration:
  //   1. Drop the obsolete `firstMates` rank — merge any holdouts into `captains` (operators).
  //   2. ADMIN_IDS (root) is auto-operator of every workspace, even after a server sync clears it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => {
      let changed = false;
      const next = prev.map(w => {
        const legacy = (w as unknown as { firstMates?: string[] }).firstMates;
        const hasLegacy = Array.isArray(legacy) && legacy.length > 0;
        const captainsAfterMerge = hasLegacy
          ? Array.from(new Set([...w.captains, ...legacy!]))
          : w.captains;
        const missing = ADMIN_IDS.filter(uid => !captainsAfterMerge.includes(uid));
        if (!hasLegacy && missing.length === 0 && !("firstMates" in w)) return w;
        changed = true;
        const { ...rest } = w as Workspace & { firstMates?: string[] };
        delete (rest as { firstMates?: string[] }).firstMates;
        return {
          ...rest,
          captains: [...captainsAfterMerge, ...missing],
          members: Array.from(new Set([...w.members, ...missing])),
        };
      });
      if (changed) markLocalWrite("workspaces");
      return changed ? next : prev;
    });
  }, [workspaces.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const setSyncStatusRef = useRef<(status: string) => void>(() => {});
  const logActivity = useCallback((type: string, target: string, detail: string, notifyTo?: string[]) => {
    if (!currentUser) return;
    const entry: ActivityItem = { type, user: currentUser, target, detail, time: Date.now(), workspaceId: currentWorkspaceId };
    if (notifyTo?.length) entry.notifyTo = Array.from(new Set(notifyTo));
    setActivityLog(prev => [entry, ...prev.slice(0, 99)]);
    pushActivity(entry).then(result => { if (!result.ok) setSyncStatusRef.current("offline"); });
  }, [currentUser, currentWorkspaceId]);

  const mentionedUserIds = useCallback((text: string) => {
    const lower = text.toLowerCase();
    return users
      .filter(u => lower.includes(`@${u.id.toLowerCase()}`) || lower.includes(`@${u.name.split(" ")[0].toLowerCase()}`))
      .map(u => u.id);
  }, [users]);

  // ── useSync: mergePatch callback (handles both initial hydrate + poll updates) ──
  const mergePatch = useCallback((s: SharedState) => {
    if (!s || !Object.keys(s).length) return;
    isPollUpdateRef.current = true;
    // Server may send `owners` (new) and/or `claims`/`assignments` (legacy).
    // Merge any present fields into a single owners map and apply once.
    if (s.owners || s.claims || s.assignments) {
      const merged: Record<string, string[]> = {};
      const addList = (key: string, list: string[]) => {
        merged[key] = Array.from(new Set([...(merged[key] || []), ...list]));
      };
      for (const [k, v] of Object.entries(s.owners || {})) addList(k, v as string[]);
      for (const [k, v] of Object.entries(s.claims || {})) addList(k, v as string[]);
      for (const [k, v] of Object.entries(s.assignments || {})) addList(k, v as string[]);

      const prev = prevClaimsRef.current;
      if (!isInitialHydrateRef.current) {
        for (const [stage, ownersList] of Object.entries(merged)) {
          const prevOwners = prev[stage] || [];
          const newOwners = ownersList.filter(uid => !prevOwners.includes(uid) && uid !== currentUser);
          if (newOwners.length > 0) {
            const owner = users.find(u => u.id === newOwners[0]);
            setChatNotif({ name: owner?.name || newOwners[0], text: `joined "${stage}"`, isClaim: true });
            playNotifSound();
            setTimeout(() => setChatNotif(null), 4000);
          }
        }
      }
      prevClaimsRef.current = merged;
      if (!isProtected("owners")) setOwners(merged);
    }
    if (s.reactions) {
      const prev = prevReactionsRef.current;
      if (!isInitialHydrateRef.current) {
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
      }
      prevReactionsRef.current = s.reactions as Record<string, Record<string, string[]>>;
      // Don't overwrite reactions if there are in-flight optimistic toggles pending
      if (pendingReactionsRef.current.size === 0) {
        setReactions(s.reactions);
      }
    }
    if (s.activityLog) setActivityLog(s.activityLog);
    if (s.reminders && !isProtected("reminders")) setReminders(s.reminders as ReminderItem[]);
    if (s.notes && !isProtected("notes")) setNotes(s.notes as NoteItem[]);
    if (s.bugs && !isProtected("bugs")) setBugs(s.bugs as BugItem[]);
    if (s.execProposals && !isProtected("execProposals")) setExecProposals(s.execProposals as ExecProposal[]);
    if (s.subtasks && !isProtected("subtasks")) setSubtasks(s.subtasks as Record<string, SubtaskItem[]>);
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
	          const remoteIds = new Set(msgs.map(m => m.id));
	          const hasDeletion = existing.some(m => !remoteIds.has(m.id));
	          const incoming = msgs.filter(m => !existingIds.has(m.id));
	          if (incoming.length > 0 || hasDeletion) {
	            // Anti-jump: if user is currently typing in this stage's comment box, buffer the incoming
	            const isTypingHere =
	              commentTypingState.openStageId === stage &&
	              commentTypingState.hasInput[stage];
	            if (isTypingHere && incoming.length > 0) {
	              newPending[stage] = incoming;
	            } else {
	              merged[stage] = hasDeletion ? [...msgs].sort((a, b) => a.id - b.id) : [...existing, ...incoming].sort((a, b) => a.id - b.id);
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
    if (s.stageStatusOverrides && !isProtected("stageStatusOverrides")) setStageStatusOverrides(s.stageStatusOverrides);
    if (s.stageDescOverrides && !isProtected("stageDescOverrides")) setStageDescOverrides(s.stageDescOverrides);
    if (s.stageDueDates && !isProtected("stageDueDates")) setStageDueDates(s.stageDueDates);
    if (s.stageNameOverrides && !isProtected("stageNameOverrides")) setStageNameOverrides(s.stageNameOverrides);
    if (s.subtaskStages && !isProtected("subtaskStages")) setSubtaskStages(s.subtaskStages);
    if (s.subtaskDescOverrides && !isProtected("subtaskDescOverrides")) setSubtaskDescOverrides(s.subtaskDescOverrides as Record<string, string>);
    if (s.subtaskDueDates && !isProtected("subtaskDueDates")) setSubtaskDueDates(s.subtaskDueDates as Record<string, string>);
    if (s.pipeDescOverrides && !isProtected("pipeDescOverrides")) setPipeDescOverrides(s.pipeDescOverrides);
    if (s.pipeMetaOverrides && !isProtected("pipeMetaOverrides")) setPipeMetaOverrides(s.pipeMetaOverrides as Record<string, { name?: string; priority?: string }>);
    if (s.customStages && !isProtected("customStages")) setCustomStages(s.customStages);
    if (s.customPipelines && !isProtected("customPipelines")) setCustomPipelines(s.customPipelines as CustomPipeline[]);
    if (s.users) setUsers(prev => hydrateUsers(s.users as UserType[], prev));
    if (s.workspaces && Array.isArray(s.workspaces) && s.workspaces.length > 0 && !isProtected("workspaces")) setWorkspaces(s.workspaces as Workspace[]);
    if (s.archivedStages && !isProtected("archivedStages")) setArchivedStages(Array.from(new Set(s.archivedStages as string[])));
    if (s.archivedPipelines && !isProtected("archivedPipelines")) setArchivedPipelines(Array.from(new Set(s.archivedPipelines as string[])));
    if (s.archivedSubtasks && !isProtected("archivedSubtasks")) setArchivedSubtasks(Array.from(new Set(s.archivedSubtasks as string[])));
    if (s.stagePointsOverride && !isProtected("stagePointsOverride")) setStagePointsOverrideState(s.stagePointsOverride as Record<string, number>);
    if (s.approvedStages && !isProtected("approvedStages")) setApprovedStages(s.approvedStages as string[]);
    if (s.approvedSubtasks && !isProtected("approvedSubtasks")) setApprovedSubtasks(s.approvedSubtasks as string[]);
    if (s.approvedPipelines && !isProtected("approvedPipelines")) setApprovedPipelines(s.approvedPipelines as string[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((s as any).streakByUser) setStreakByUser((s as any).streakByUser as Record<string, number>);
    setTimeout(() => { isPollUpdateRef.current = false; }, 50);
    // Mark initial hydrate complete — subsequent calls will fire claim/reaction notifications
    isInitialHydrateRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  const getCurrentState = useCallback((): Partial<SharedState> => ({
    owners,
    approvedStages, approvedSubtasks, approvedPipelines,
    reminders,
    notes,
    bugs,
    execProposals,
    subtasks, stageStatusOverrides, stageDescOverrides, stageDueDates, stageNameOverrides,
    subtaskStages, subtaskDescOverrides, subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
    users, workspaces, archivedStages, archivedPipelines, archivedSubtasks,
    stagePointsOverride,
  }), [owners, approvedStages, approvedSubtasks, approvedPipelines, reminders, notes, bugs, execProposals,
       subtasks, stageStatusOverrides, stageDescOverrides, stageDueDates, stageNameOverrides,
       subtaskStages, subtaskDescOverrides, subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
       users, workspaces, archivedStages, archivedPipelines, archivedSubtasks,
       stagePointsOverride]);

  const { status: syncStatus, scheduleWrite, setOffline } = useSync({ onPatch: mergePatch, getPatch: getCurrentState });
  // Alias so handlers can signal offline state (argument ignored — always sets offline)
  const setSyncStatus: (status: string) => void = useCallback(() => setOffline(), [setOffline]);
  setSyncStatusRef.current = setSyncStatus;

  // ── Debounced write — delegate to useSync's scheduleWrite ────────────────
  useEffect(() => {
    if (isPollUpdateRef.current) return;
    scheduleWrite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owners, approvedStages, approvedSubtasks, approvedPipelines, reminders, notes, bugs, execProposals, subtasks, stageStatusOverrides, stageDescOverrides, stageDueDates, stageNameOverrides, subtaskStages, subtaskDescOverrides, subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines, users, archivedStages, archivedPipelines, archivedSubtasks, stagePointsOverride, workspaces]);

  // ── Fetch initial chat messages ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const wsParam = currentWorkspaceId ? `&workspaceId=${encodeURIComponent(currentWorkspaceId)}` : "";
    fetch(`/api/pipeline-state/messages?limit=50${wsParam}`)
      .then(r => r.json())
      .then((msgs: ChatMsg[]) => { if (Array.isArray(msgs)) setChatMessages(msgs); })
      .catch(() => {});
  }, [currentWorkspaceId]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const getStatus = useCallback((name: string) => stageStatusOverrides[name] || stageDefaults[name]?.status || "concept", [stageStatusOverrides]);

  const getPoints = useCallback((uid: string) => {
    const archivedSubtaskKeySet = new Set(archivedSubtasks);
    const approvedSubtaskKeySet = new Set(approvedSubtasks);
    let p = 0;
    Object.entries(owners).forEach(([key, ownersList]) => {
      if (!ownersList.includes(uid)) return;
      const ownerCount = Math.max(ownersList.length, 1);

      // Subtask — key is "stageId::subtaskId"
      if (SubtaskKey.isValid(key)) {
        if (!approvedSubtaskKeySet.has(key)) return;
        const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
        if (!parsed) return;
        const sub = (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId);
        if (!sub) return;
        // Split subtask points among owners. Use Math.floor so totals are stable
        // and never exceed the headline number on the card.
        p += Math.floor((sub.points ?? 5) / ownerCount);
        return;
      }
      // Stage — only awards stage-level points when stage is a leaf (no live subtasks).
      // Stages with live subtasks earn their points via the subtask branch above.
      if (!approvedStages.includes(key)) return;
      const liveSubs = (subtasks[key] || []).filter(s => !archivedSubtaskKeySet.has(`${key}::${s.id}`));
      if (liveSubs.length > 0) return;
      const stageDefaultPts = stageDefaults[key]?.points || 10;
      const stagePts = deriveStageDisplayPoints(key, undefined, archivedSubtaskKeySet, stageDefaultPts, stagePointsOverride);
      p += Math.floor(stagePts / ownerCount);
    });

    // Pipeline-completion bonus: +25% of the pipeline's total stage points,
    // split equally among the union of owners across the pipeline's stages.
    // Each pipeline pays exactly once (idempotent via approvedPipelines).
    if (approvedPipelines.length > 0) {
      const allPipes = [...pipelineData, ...customPipelines];
      for (const pipelineId of approvedPipelines) {
        const pipe = allPipes.find(pp => pp.id === pipelineId);
        if (!pipe) continue;
        const allStages = [...pipe.stages, ...(customStages[pipelineId] || [])];
        const ownersUnion = new Set<string>();
        for (const stage of allStages) {
          (owners[stage] || []).forEach(o => ownersUnion.add(o));
        }
        if (ownersUnion.size === 0 || !ownersUnion.has(uid)) continue;
        const total = allStages.reduce((sum, s) => sum + (stageDefaults[s]?.points ?? stagePointsOverride[s] ?? 10), 0);
        const bonus = Math.floor(total * 0.25);
        p += Math.floor(bonus / ownersUnion.size);
      }
    }

    Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if (r.includes(uid)) p += 2; }); });
    return p;
  }, [owners, approvedStages, approvedSubtasks, approvedPipelines, reactions, subtasks, archivedSubtasks, stagePointsOverride, customPipelines, customStages]);

  const sc: Record<string, { l: string; c: string }> = {
    active: { l: "live", c: t.green }, "in-progress": { l: "building", c: t.amber },
    planned: { l: "planned", c: t.cyan || t.accent }, concept: { l: "concept", c: t.purple }, blocked: { l: "blocked", c: t.red },
  };
  const ck: Record<string, string> = { blue: t.accent, purple: t.purple, green: t.green, amber: t.amber, cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate };
  const pr: Record<string, { c: string }> = { NOW: { c: t.orange }, HIGH: { c: t.textMuted }, MEDIUM: { c: t.cyan || t.accent }, LOW: { c: t.textDim } };

  // Backwards-compat aliases — every owner counts as both "claimer" and "assignee"
  // for legacy consumers (they used to be separate). New code should read `owners`
  // directly; these are derived views only.
  const claims = owners;
  const assignments: Record<string, string[]> = useMemo(() => ({}), []);

  const ownership = useMemo(() => {
    const map: Record<string, { claimedBy: string[]; assignedTo: string[] }> = {};
    for (const [k, v] of Object.entries(owners)) map[k] = { claimedBy: v, assignedTo: v };
    return map;
  }, [owners]);

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
    if (ADMIN_IDS.includes(currentUser)) return true;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return false;
    return ws.captains.includes(currentUser);
  }, [workspaces, currentUser]);
  const canMutateDirectly = useCallback(() => {
    if (!currentUser) return false;
    if (ADMIN_IDS.includes(currentUser)) return true;
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    return !!ws && ws.captains.includes(currentUser);
  }, [currentUser, currentWorkspaceId, workspaces]);

  const requestWorkChange = useCallback((input: { kind: "edit" | "archive" | "assign"; target: string; title: string; body: string; requestedAction: string; requestedValue?: string | null; requestedUserId?: string | null }) => {
    if (!currentUser) return;
    markLocalWrite("execProposals");
    const proposal: ExecProposal = {
      id: Date.now(),
      title: input.title.slice(0, 120),
      body: input.body.slice(0, 1200),
      by: currentUser,
      status: "pending",
      createdAt: Date.now(),
      kind: input.kind,
      target: input.target,
      requestedAction: input.requestedAction,
      requestedValue: input.requestedValue ?? null,
      requestedUserId: input.requestedUserId ?? null,
    };
    setExecProposals(prev => [proposal, ...prev].slice(0, 100));
    logActivity("request", input.target, input.requestedAction, ADMIN_IDS);
    showToast("// request sent to Anna", t.green);
  }, [currentUser, logActivity, markLocalWrite, showToast, t.green]);

  const requestInsteadOfMutate = useCallback((kind: "edit" | "archive" | "assign", target: string, requestedAction: string, detail: string, meta?: { requestedValue?: string | null; requestedUserId?: string | null }) => {
    if (canMutateDirectly()) return false;
    requestWorkChange({
      kind,
      target,
      requestedAction,
      title: `${kind}: ${target}`,
      body: detail,
      requestedValue: meta?.requestedValue ?? null,
      requestedUserId: meta?.requestedUserId ?? null,
    });
    return true;
  }, [canMutateDirectly, requestWorkChange]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClaim = (sid: string) => {
    if (!currentUser) return;
    const alreadyOwner = (owners[sid] || []).includes(currentUser);
    markLocalWrite("owners");
    setOwners(prev => {
      const c = prev[sid] || [];
      if (c.includes(currentUser)) {
        const next = c.filter(u => u !== currentUser);
        const out = { ...prev };
        if (next.length === 0) delete out[sid]; else out[sid] = next;
        return out;
      }
      return { ...prev, [sid]: [...c, currentUser] };
    });
    if (!alreadyOwner) logActivity("claim", sid, "took ownership", ADMIN_IDS);
  };

  // assignTask: admin-driven path to add/remove an owner. Same underlying
  // `owners` state as claim — claim and assign are two doors into one list.
  // Cap at 2 owners *via this action* — admin assigning to more than 2 dilutes
  // accountability; if more people want in they can self-claim. The cap does
  // NOT apply to claims (anyone helping should count).
  const ASSIGN_CAP = 2;
  const assignTask = (sid: string, userId: string | null) => {
    if (!currentUser) return;
    const assignee = userId ? users.find(u => u.id === userId) : null;
    if (requestInsteadOfMutate(
      "assign",
      sid,
      userId ? `assign ${assignee?.name || userId}` : "clear assignees",
      userId ? `Assign "${sid}" to ${assignee?.name || userId}.` : `Clear all assignees from "${sid}".`,
      { requestedUserId: userId },
    )) return;
    const isSubtask = SubtaskKey.isValid(sid);
    markLocalWrite("owners");
    setOwners(prev => {
      const copy: Record<string, string[]> = { ...prev };
      const prevList = copy[sid] || [];

      if (!userId) {
        delete copy[sid];
      } else {
        const isCurrentlyAssigned = prevList.includes(userId);
        let next: string[];
        if (isCurrentlyAssigned) {
          next = prevList.filter(u => u !== userId);
        } else {
          // Append; if at cap, drop the oldest (FIFO)
          next = [...prevList, userId].slice(-ASSIGN_CAP);
        }
        if (next.length === 0) delete copy[sid]; else copy[sid] = next;
      }

      // Cascade to subtasks: when a stage's primary assignee is set/cleared, propagate to
      // any subtask that has no explicit assignment (i.e., was inheriting parent's).
      if (!isSubtask && !sid.startsWith("_")) {
        const taskSubtasks = subtasks[sid] || [];
        const newPrimaryList = copy[sid] || [];
        for (const sub of taskSubtasks) {
          const subKey = SubtaskKey.make(sid, sub.id);
          const subList = copy[subKey] || [];
          // Inherit only if subtask was unassigned OR subtask's list exactly matched the
          // OLD parent list (i.e., truly inherited, not customised).
          const wasInheriting = subList.length === 0 ||
            (subList.length === prevList.length && subList.every(u => prevList.includes(u)));
          if (wasInheriting) {
            if (newPrimaryList.length === 0) delete copy[subKey];
            else copy[subKey] = [...newPrimaryList];
          }
        }
      }
      return copy;
    });

    if (userId) {
      logActivity("assign", sid, `toggled ${assignee?.name || userId}`);
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
  const addSubtask = (sid: string, val: string, clearInput: () => void): number | null => {
    if (!val || !currentUser) return null;
    const trimmed = val.trim();
    if (trimmed.length > MAX_SUBTASK_LEN) { showToast("// subtask too long — max 200 chars", t.red); return null; }
    if ((subtasks[sid] || []).length >= MAX_SUBTASKS) { showToast("// max 20 subtasks per stage", t.amber); return null; }
    const taskId = Date.now();
    markLocalWrite("subtasks");
    setSubtasks(prev => ({ ...prev, [sid]: [...(prev[sid] || []), { id: taskId, text: trimmed, done: false, by: currentUser }] }));
    clearInput();
    logActivity("create", sid, `added subtask ${trimmed}`, ADMIN_IDS);
    // Fire-and-forget LLM points suggestion — falls back to DEFAULT_SUBTASK_POINTS if it fails
    fetch("/api/suggest-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "subtask", title: trimmed, context: sid }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { points?: number } | null) => {
        if (data && typeof data.points === "number") {
          markLocalWrite("subtasks");
          setSubtasks(prev => ({
            ...prev,
            [sid]: (prev[sid] || []).map(s => s.id === taskId ? { ...s, points: data.points! } : s),
          }));
        }
      })
      .catch(() => { /* silent — leaves subtask without explicit points (uses default) */ });
    return taskId;
  };

  const setSubtaskPoints = (sid: string, taskId: number, points: number) => {
    markLocalWrite("subtasks");
    setSubtasks(prev => ({
      ...prev,
      [sid]: (prev[sid] || []).map(s => s.id === taskId ? { ...s, points } : s),
    }));
  };

  const toggleSubtask = (sid: string, taskId: number) => {
    markLocalWrite("subtasks");
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId && !t.locked ? { ...t, done: !t.done } : t) }));
  };
  const renameSubtask = (sid: string, taskId: number, text: string) => {
    const key = SubtaskKey.make(sid, taskId);
    if (requestInsteadOfMutate("edit", key, "rename subtask", `Rename subtask under "${sid}" to "${text}".`, { requestedValue: text })) return;
    markLocalWrite("subtasks");
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, text } : t) }));
  };
  const lockSubtask = (sid: string, taskId: number) => {
    markLocalWrite("subtasks");
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId ? { ...t, locked: !t.locked } : t) }));
  };
  const removeSubtask = (sid: string, taskId: number) => {
    markLocalWrite("subtasks");
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

    setOwners(prev => {
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
    logActivity("comment", sid, val.slice(0, 100), mentionedUserIds(val));
    pushComment(sid, c).then(result => {
      if (!result.ok) {
        setComments(prev => ({ ...prev, [sid]: (prev[sid] || []).filter(x => x.id !== commentId) }));
        setSyncStatus("offline");
        showToast("// comment lost — try again", t.red);
      }
    });
  };

  const deleteComment = (sid: string, commentId: number) => {
    if (!currentUser) return;
    const existing = comments[sid] || [];
    const comment = existing.find(c => c.id === commentId);
    if (!comment) return;
    if (comment.by !== currentUser && !ADMIN_IDS.includes(currentUser)) {
      showToast("// you can only delete your own comment", t.amber);
      return;
    }
    setComments(prev => ({ ...prev, [sid]: (prev[sid] || []).filter(c => c.id !== commentId) }));
    setCommentReactions(prev => {
      const next = { ...prev };
      delete next[`${sid}::${commentId}`];
      return next;
    });
    deleteCommentRemote(sid, commentId).then(result => {
      if (!result.ok) {
        setComments(prev => ({ ...prev, [sid]: existing }));
        setSyncStatus("offline");
        showToast("// delete failed — refresh and try again", t.red);
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
    if (requestInsteadOfMutate("archive", sid, "archive task", `Archive "${stageNameOverrides[sid] || sid}".`)) return;
    const label = `archived "${stageNameOverrides[sid] || sid}"`;
    const op = undoStack.push({
      label,
      inverse: () => { markLocalWrite("archivedStages"); setArchivedStages(prev => prev.filter(s => s !== sid)); },
    });
    markLocalWrite("archivedStages");
    setArchivedStages(prev => Array.from(new Set([...prev, sid])));
    logActivity("archive", sid, "archived");
    showToast(label, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); { markLocalWrite("archivedStages"); setArchivedStages(prev => prev.filter(s => s !== sid)); }; },
    });
  };
  const restoreStage = (sid: string) => { { markLocalWrite("archivedStages"); setArchivedStages(prev => Array.from(new Set(prev)).filter(s => s !== sid)); }; showToast(`restored: ${stageNameOverrides[sid] || sid}`, t.green); };
  const archivePipeline = (pid: string) => {
    if (archivedPipelines.includes(pid)) return;
    const label = `archived pipeline "${pid}"`;
    const op = undoStack.push({
      label,
      inverse: () => setArchivedPipelines(prev => prev.filter(p => p !== pid)),
    });
    markLocalWrite("archivedPipelines");
    setArchivedPipelines(prev => Array.from(new Set([...prev, pid])));
    showToast(label, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); setArchivedPipelines(prev => prev.filter(p => p !== pid)); },
    });
  };
  const restorePipeline = (pid: string) => { markLocalWrite("archivedPipelines"); setArchivedPipelines(prev => Array.from(new Set(prev)).filter(p => p !== pid)); showToast("pipeline restored", t.green); };
  const archiveSubtask = (key: string) => {
    if (archivedSubtasks.includes(key)) return;
    if (requestInsteadOfMutate("archive", key, "archive subtask", `Archive subtask "${key}".`)) return;
    const op = undoStack.push({
      label: `archived subtask`,
      inverse: () => setArchivedSubtasks(prev => prev.filter(k => k !== key)),
    });
    markLocalWrite("archivedSubtasks");
    setArchivedSubtasks(prev => Array.from(new Set([...prev, key])));
    showToast(`archived subtask`, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); setArchivedSubtasks(prev => prev.filter(k => k !== key)); },
    });
  };
  const restoreSubtask = (key: string) => { markLocalWrite("archivedSubtasks"); setArchivedSubtasks(prev => Array.from(new Set(prev)).filter(k => k !== key)); };

  const setStageDescOverride = (name: string, val: string) => {
    if (requestInsteadOfMutate("edit", name, "edit task description", `Change description for "${name}" to:\n\n${val}`, { requestedValue: val })) return;
    markLocalWrite("stageDescOverrides"); setStageDescOverrides(prev => ({ ...prev, [name]: val }));
  };
  const setStageDueDate = (name: string, val: string | null) => {
    if (requestInsteadOfMutate("edit", name, "set due date", val ? `Set due date for "${name}" to ${val}.` : `Clear due date for "${name}".`, { requestedValue: val })) return;
    markLocalWrite("stageDueDates");
    setStageDueDates(prev => {
      const next = { ...prev };
      if (!val) delete next[name]; else next[name] = val;
      return next;
    });
  };
  const setSubtaskDescOverride = (key: string, desc: string | null) => {
    if (requestInsteadOfMutate("edit", key, "edit subtask description", `Change description for "${key}" to:\n\n${desc || "(empty)"}`, { requestedValue: desc || "" })) return;
    markLocalWrite("subtaskDescOverrides");
    setSubtaskDescOverrides(prev => { const next = { ...prev }; if (desc === null) delete next[key]; else next[key] = desc; return next; });
  };
  const setSubtaskDueDate = (key: string, val: string | null) => {
    if (requestInsteadOfMutate("edit", key, "set subtask due date", val ? `Set due date for "${key}" to ${val}.` : `Clear due date for "${key}".`, { requestedValue: val })) return;
    markLocalWrite("subtaskDueDates");
    setSubtaskDueDates(prev => {
      const next = { ...prev };
      if (!val) delete next[key]; else next[key] = val;
      return next;
    });
  };
  const setStageNameOverride = (name: string, val: string) => {
    if (requestInsteadOfMutate("edit", name, "rename task", `Rename "${name}" to "${val}".`, { requestedValue: val })) return;
    markLocalWrite("stageNameOverrides"); setStageNameOverrides(prev => ({ ...prev, [name]: val }));
  };
  const setStagePointsOverride = (stageId: string, pts: number | null) => {
    markLocalWrite("stagePointsOverride");
    setStagePointsOverrideState(prev => {
      const next = { ...prev };
      if (pts === null) { delete next[stageId]; } else { next[stageId] = pts; }
      return next;
    });
  };
  // Couples subtask kanban status with sub.done + approval:
  //   - Setting status to "active" marks sub.done = true (entering pending state).
  //   - Moving away from "active" clears sub.done AND any prior approval.
  const setSubtaskStage = (key: string, status: string) => {
    const parsed = SubtaskKey.isValid(key)
      ? SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0])
      : null;
    const prevStatus = subtaskStages[key] || "planned";
    markLocalWrite("subtaskStages");
    setSubtaskStages(prev => ({ ...prev, [key]: status }));
    if (parsed && prevStatus !== status) {
      const becameActive = status === "active";
      const leftActive = prevStatus === "active" && status !== "active";
      if (becameActive || leftActive) {
        markLocalWrite("subtasks");
        setSubtasks(prev => ({
          ...prev,
          [parsed.parentStageId]: (prev[parsed.parentStageId] || []).map(s =>
            s.id === parsed.subtaskId ? { ...s, done: becameActive } : s
          ),
        }));
        if (leftActive && approvedSubtasks.includes(key)) {
          setApprovedSubtasks(prev => prev.filter(k => k !== key));
        }
      }
    }
  };

  const getSubtaskStatus = useCallback((key: string) => subtaskStages[key] || "planned", [subtaskStages]);

  const cycleSubtaskStatus = (key: string) => {
    const cur = subtaskStages[key] || "planned";
    const idx = STATUS_ORDER.indexOf(cur);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setSubtaskStage(key, next);
  };

  const setStageStatusDirect = (name: string, status: string) => {
    markLocalWrite("stageStatusOverrides");
    setStageStatusOverrides(prev => ({ ...prev, [name]: status }));
    logActivity("status", name, `→ ${status}`, ADMIN_IDS);
  };

  const cycleStatus = (name: string) => {
    const cur = getStatus(name);
    const idx = STATUS_ORDER.indexOf(cur);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    markLocalWrite("stageStatusOverrides");
    setStageStatusOverrides(prev => ({ ...prev, [name]: next }));
    logActivity("status", name, `→ ${next}`, ADMIN_IDS);
  };

  const approveStage = (name: string) => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    if (!currentUser || !ws || !(ws.captains.includes(currentUser) || ADMIN_IDS.includes(currentUser))) {
      showToast("// only an operator can approve", t.amber); return;
    }
    if (approvedStages.includes(name)) return;
    const nextApprovedStages = [...approvedStages, name];
    setApprovedStages(nextApprovedStages);
    logActivity("status", name, "→ approved");

    // Pipeline-completion check — award the +25% bonus the moment the LAST
    // stage of a pipeline is approved. Idempotent (gated by approvedPipelines).
    const allPipes = [...pipelineData, ...customPipelines];
    const owningPipe = allPipes.find(pp => {
      const stages = [...pp.stages, ...(customStages[pp.id] || [])];
      return stages.includes(name);
    });
    if (!owningPipe) return;
    if (approvedPipelines.includes(owningPipe.id)) return;
    const allStages = [...owningPipe.stages, ...(customStages[owningPipe.id] || [])]
      .filter(s => !archivedStages.includes(s));
    if (allStages.length === 0) return;
    const allApproved = allStages.every(s => nextApprovedStages.includes(s));
    if (!allApproved) return;
    setApprovedPipelines(prev => [...prev, owningPipe.id]);
    const total = allStages.reduce((sum, s) => sum + (stageDefaults[s]?.points ?? stagePointsOverride[s] ?? 10), 0);
    const bonus = Math.floor(total * 0.25);
    logActivity("status", owningPipe.id, `pipeline complete · +${bonus} bonus`);
    showToast(`// ${owningPipe.name || owningPipe.id} complete — +${bonus}pts bonus shared`, t.green);
  };

  const approveSubtask = (key: string) => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    if (!currentUser || !ws || !(ws.captains.includes(currentUser) || ADMIN_IDS.includes(currentUser))) {
      showToast("// only an operator can approve", t.amber); return;
    }
    if (approvedSubtasks.includes(key)) return;
    setApprovedSubtasks(prev => [...prev, key]);
    const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
    const subText = parsed ? (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId)?.text : undefined;
    logActivity("status", subText || key, "→ approved");
  };

  const addCustomStage = (pid: string, val: string) => {
    if (!val) return;
    markLocalWrite("customStages");
    setCustomStages(prev => ({ ...prev, [pid]: [...(prev[pid] || []), val] }));
    logActivity("create", val, `added task to ${pid}`, ADMIN_IDS);
  };

  // Inbox sentinel — used inline (also exported at module top for cross-file imports)
  const INBOX_PIPELINE_ID = INBOX_PIPELINE_ID_CONST;

  // Add a task with no parent pipeline. Calls /api/suggest-points with the title to derive
  // an LLM-suggested point value, stored as stagePointsOverride. Optimistic — if the LLM
  // call fails the stage still gets created with the default point fallback.
  const addUnparentedStage = useCallback(async (title: string): Promise<string | null> => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    // Use trimmed title as the stage name (which is also the stage ID — names are IDs in this dashboard)
    markLocalWrite("customStages");
    setCustomStages(prev => ({
      ...prev,
      [INBOX_PIPELINE_ID]: [...(prev[INBOX_PIPELINE_ID] || []), trimmed],
    }));
    logActivity("create", trimmed, "added to inbox", ADMIN_IDS);
    // Fire-and-forget LLM points suggestion
    fetch("/api/suggest-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "stage", title: trimmed }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { points?: number } | null) => {
        if (data && typeof data.points === "number") {
          markLocalWrite("stagePointsOverride");
          setStagePointsOverrideState(prev => ({ ...prev, [trimmed]: data.points! }));
        }
      })
      .catch(() => { /* silent — fallback to default points */ });
    return trimmed;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move a stage between pipelines (e.g., from inbox to a real pipeline). Doesn't touch
  // the stage's per-key state (claims/comments/etc.) since those are keyed by stage NAME,
  // which doesn't change.
  const moveStageToPipeline = useCallback((stageName: string, fromPid: string, toPid: string) => {
    if (fromPid === toPid) return;
    markLocalWrite("customStages");
    setCustomStages(prev => {
      const next = { ...prev };
      next[fromPid] = (next[fromPid] || []).filter(s => s !== stageName);
      if (next[fromPid].length === 0) delete next[fromPid];
      next[toPid] = [...(next[toPid] || []), stageName];
      return next;
    });
    logActivity("status", stageName, `→ moved to ${toPid}`, ADMIN_IDS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCustomPipeline = (form: { name: string; desc: string; icon: string; colorKey: string; priority: string }): string | null => {
    if (!form.name.trim()) return null;
    const id = `custom-${Date.now()}`;
    markLocalWrite("customPipelines");
    setCustomPipelines(prev => [...prev, { ...form, id, points: 0, stages: [] }]);
    if (currentWorkspaceId) {
      markLocalWrite("workspaces");
      setWorkspaces(prev => prev.map(w => w.id === currentWorkspaceId && !w.pipelineIds.includes(id) ? { ...w, pipelineIds: [...w.pipelineIds, id] } : w));
    }
    return id;
  };

  const cyclePriority = (pid: string, cur: string) => {
    const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(cur as typeof PRIORITY_CYCLE[number]) + 1) % PRIORITY_CYCLE.length];
    markLocalWrite("pipeMetaOverrides");
    setPipeMetaOverrides(prev => ({ ...prev, [pid]: { ...(prev[pid] || {}), priority: next } }));
  };

  const addStageImage = (sid: string, dataUrl: string) => { setStageImages(prev => ({ ...prev, [sid]: [...(prev[sid] || []), dataUrl] })); };
  const removeStageImage = (sid: string, idx: number) => { setStageImages(prev => ({ ...prev, [sid]: (prev[sid] || []).filter((_, i) => i !== idx) })); };

  // ── Chat handlers ─────────────────────────────────────────────────────────
  const sendChat = (text: string, opts?: { threadId?: string; attachments?: ChatAttachment[] }) => {
    if (!currentUser) return;
    const msgId = Date.now();
    const msg: ChatMsg = {
      id: msgId,
      userId: currentUser,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      workspaceId: currentWorkspaceId,
      threadId: opts?.threadId || "team",
      attachments: opts?.attachments || [],
    };
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
      const wsParam = currentWorkspaceId ? `&workspaceId=${encodeURIComponent(currentWorkspaceId)}` : "";
      const threadParam = oldest.threadId ? `&threadId=${encodeURIComponent(oldest.threadId)}` : "";
      const res = await fetch(`/api/pipeline-state/messages?before=${oldest.id}&limit=50${wsParam}${threadParam}`);
      const older: ChatMsg[] = await res.json();
      if (!Array.isArray(older) || older.length === 0) { setHasMoreMessages(false); return; }
      setChatMessages(prev => [...older, ...prev]);
      if (older.length < 50) setHasMoreMessages(false);
    } catch { /* ignore */ }
  };

  // ── Workspace handlers ────────────────────────────────────────────────────
  const createWorkspace = (name: string, icon: string, colorKey: string) => {
    if (!currentUser) return;
    if (!ADMIN_IDS.includes(currentUser)) { showToast("// only root can create a workspace", t.amber); return; }
    const trimmed = name.trim();
    if (!trimmed) { showToast("// workspace needs a name", t.amber); return; }
    const id = `ws-${Date.now()}`;
    markLocalWrite("workspaces");
    setWorkspaces(prev => [...prev, { id, name: trimmed, icon: icon || "🏴", colorKey: colorKey || "purple", members: [currentUser], captains: [currentUser], pipelineIds: [] }]);
    showToast(`// workspace "${trimmed}" created`, t.green);
    logActivity("claim", id, `created workspace ${trimmed}`);
  };

  const addMemberToWorkspace = (workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ADMIN_IDS.includes(currentUser)) { showToast("// only an operator can manage members", t.amber); return; }
    if (ws.members.includes(userId)) return;
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: [...w.members, userId] } : w));
  };

  const removeMemberFromWorkspace = (workspaceId: string, userId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ADMIN_IDS.includes(currentUser)) { showToast("// only an operator can manage members", t.amber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId) { showToast("// can't remove the only operator", t.red); return; }
    setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, members: w.members.filter(id => id !== userId), captains: w.captains.filter(id => id !== userId) } : w));
  };

  const setMemberRank = (workspaceId: string, userId: string, rank: "operator" | "agent") => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ws.captains.includes(currentUser) && !ADMIN_IDS.includes(currentUser)) { showToast("// only an operator can change ranks", t.amber); return; }
    if (ws.captains.length === 1 && ws.captains[0] === userId && rank !== "operator") { showToast("// can't demote the only operator", t.red); return; }
    setWorkspaces(prev => prev.map(w => {
      if (w.id !== workspaceId) return w;
      const captains = w.captains.filter(id => id !== userId);
      if (rank === "operator") captains.push(userId);
      return { ...w, captains, members: w.members.includes(userId) ? w.members : [...w.members, userId] };
    }));
  };

  const deleteWorkspace = (workspaceId: string) => {
    if (!currentUser) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    if (!ADMIN_IDS.includes(currentUser)) { showToast("// only root can delete a workspace", t.amber); return; }
    if (workspaces.length === 1) { showToast("// can't delete your last workspace", t.red); return; }
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    showToast(`// workspace "${ws.name}" deleted`, t.amber);
  };

  const addExecProposal = (title: string, body: string) => {
    if (!currentUser) return;
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    if (!cleanTitle || !cleanBody) {
      showToast("// proposal needs a title and detail", t.amber);
      return;
    }
    markLocalWrite("execProposals");
    const proposal: ExecProposal = {
      id: Date.now(),
      title: cleanTitle.slice(0, 120),
      body: cleanBody.slice(0, 1200),
      by: currentUser,
      status: "pending",
      createdAt: Date.now(),
      kind: "strategy",
    };
    setExecProposals(prev => [proposal, ...prev].slice(0, 80));
    logActivity("proposal", proposal.title, "submitted executive request");
    showToast("// proposal sent to Anna", t.green);
  };

  const addReminder = (input: { title: string; body: string; recipientIds: string[]; remindAt: string }) => {
    if (!currentUser) return;
    const title = input.title.trim();
    const body = input.body.trim();
    const recipients = Array.from(new Set(input.recipientIds.filter(Boolean)));
    const due = Date.parse(input.remindAt);
    if (!title || recipients.length === 0 || !Number.isFinite(due)) {
      showToast("// reminder needs title, date, and recipient", t.amber);
      return;
    }
    const reminder: ReminderItem = {
      id: Date.now(),
      title: title.slice(0, 140),
      body: body.slice(0, 1000),
      createdBy: currentUser,
      recipientIds: recipients,
      remindAt: new Date(due).toISOString(),
      createdAt: Date.now(),
      emailedTo: [],
      dismissedBy: [],
    };
    markLocalWrite("reminders");
    setReminders(prev => [reminder, ...prev].slice(0, 200));
    logActivity("reminder", reminder.title, `scheduled for ${new Date(reminder.remindAt).toLocaleString()}`, recipients);
    showToast("// reminder scheduled", t.green);
  };

  const dismissReminder = (id: number) => {
    if (!currentUser) return;
    markLocalWrite("reminders");
    setReminders(prev => prev.map(r => r.id === id
      ? { ...r, dismissedBy: Array.from(new Set([...(r.dismissedBy || []), currentUser])) }
      : r
    ));
  };

  const addNote = (input: { title: string; body: string; pinnedTo?: string; color?: string }) => {
    if (!currentUser) return;
    const title = input.title.trim() || "Untitled note";
    const body = input.body.trim();
    if (!body && !input.title.trim()) return;
    const now = Date.now();
    const note: NoteItem = {
      id: now,
      title: title.slice(0, 120),
      body: body.slice(0, 5000),
      by: currentUser,
      createdAt: now,
      updatedAt: now,
      workspaceId: currentWorkspaceId,
      pinnedTo: input.pinnedTo?.trim() || undefined,
      color: input.color,
    };
    markLocalWrite("notes");
    setNotes(prev => [note, ...prev].slice(0, 300));
    logActivity("note", note.title, "created note");
  };

  const updateNote = (id: number, patch: Partial<Pick<NoteItem, "title" | "body" | "pinnedTo" | "color">>) => {
    if (!currentUser) return;
    markLocalWrite("notes");
    setNotes(prev => prev.map(note => {
      if (note.id !== id) return note;
      if (note.by !== currentUser && !ADMIN_IDS.includes(currentUser)) return note;
      return {
        ...note,
        ...patch,
        title: patch.title !== undefined ? patch.title.slice(0, 120) : note.title,
        body: patch.body !== undefined ? patch.body.slice(0, 5000) : note.body,
        pinnedTo: patch.pinnedTo !== undefined ? (patch.pinnedTo.trim() || undefined) : note.pinnedTo,
        updatedAt: Date.now(),
      };
    }));
  };

  const deleteNote = (id: number) => {
    if (!currentUser) return;
    markLocalWrite("notes");
    setNotes(prev => prev.filter(note => note.id !== id || (note.by !== currentUser && !ADMIN_IDS.includes(currentUser))));
  };

  const addBug = (input: { title: string; body?: string; steps?: string; expected?: string; actual?: string; type: BugType; severity: BugSeverity; status?: BugStatus; ownerId?: string; linkedTask?: string }) => {
    if (!currentUser) return;
    const title = input.title.trim();
    if (!title) {
      showToast("// bug/test needs a title", t.amber);
      return;
    }
    const now = Date.now();
    const bug: BugItem = {
      id: now,
      title: title.slice(0, 160),
      body: (input.body || "").trim().slice(0, 2000),
      steps: input.steps?.trim().slice(0, 2000) || undefined,
      expected: input.expected?.trim().slice(0, 1000) || undefined,
      actual: input.actual?.trim().slice(0, 1000) || undefined,
      type: input.type,
      severity: input.severity,
      status: input.status || "open",
      ownerId: input.ownerId || undefined,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
      workspaceId: currentWorkspaceId,
      linkedTask: input.linkedTask?.trim() || undefined,
    };
    markLocalWrite("bugs");
    setBugs(prev => [bug, ...prev].slice(0, 300));
    logActivity("bug", bug.title, `${bug.type} · ${bug.severity}`, bug.ownerId ? [bug.ownerId] : undefined);
    showToast("// tracker item added", t.green);
  };

  const updateBug = (id: number, patch: Partial<Pick<BugItem, "title" | "body" | "steps" | "expected" | "actual" | "type" | "severity" | "status" | "ownerId" | "linkedTask">>) => {
    if (!currentUser) return;
    markLocalWrite("bugs");
    setBugs(prev => prev.map(item => {
      if (item.id !== id) return item;
      const canEdit = ADMIN_IDS.includes(currentUser) || item.createdBy === currentUser || item.ownerId === currentUser;
      if (!canEdit) return item;
      return {
        ...item,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim().slice(0, 160) || item.title : item.title,
        body: patch.body !== undefined ? patch.body.trim().slice(0, 2000) : item.body,
        steps: patch.steps !== undefined ? patch.steps.trim().slice(0, 2000) || undefined : item.steps,
        expected: patch.expected !== undefined ? patch.expected.trim().slice(0, 1000) || undefined : item.expected,
        actual: patch.actual !== undefined ? patch.actual.trim().slice(0, 1000) || undefined : item.actual,
        ownerId: patch.ownerId !== undefined ? patch.ownerId || undefined : item.ownerId,
        linkedTask: patch.linkedTask !== undefined ? patch.linkedTask.trim() || undefined : item.linkedTask,
        updatedAt: Date.now(),
      };
    }));
  };

  const deleteBug = (id: number) => {
    if (!currentUser) return;
    markLocalWrite("bugs");
    setBugs(prev => prev.filter(item => item.id !== id || (item.createdBy !== currentUser && item.ownerId !== currentUser && !ADMIN_IDS.includes(currentUser))));
  };

  const applyExecProposalAction = (proposal: ExecProposal): boolean => {
    const target = proposal.target || "";
    const value = proposal.requestedValue ?? null;
    if (!target || proposal.kind === "strategy") return true;
    if (proposal.kind === "archive") {
        if (SubtaskKey.isValid(target)) {
          markLocalWrite("archivedSubtasks");
          setArchivedSubtasks(prev => prev.includes(target) ? prev : [...prev, target]);
        } else {
          markLocalWrite("archivedStages");
          setArchivedStages(prev => prev.includes(target) ? prev : [...prev, target]);
        }
        logActivity("archive", target, "approved archive request");
      return true;
    }
    if (proposal.kind === "assign") {
        const clearAssign = /^clear/i.test(proposal.requestedAction || "");
        const resolvedUserId = proposal.requestedUserId || (() => {
          const haystack = `${proposal.requestedAction || ""} ${proposal.body || ""}`.toLowerCase();
          return users.find(u =>
            haystack.includes(u.id.toLowerCase()) ||
            haystack.includes(u.name.toLowerCase()) ||
            haystack.includes(u.name.split(" ")[0].toLowerCase())
          )?.id || null;
        })();
        if (!resolvedUserId && !clearAssign) {
          showToast("// assign request is missing who to assign", t.amber);
          return false;
        }
        markLocalWrite("owners");
        setOwners(prev => {
          const next = { ...prev };
          if (!resolvedUserId) {
            delete next[target];
            return next;
          }
          const current = next[target] || [];
          next[target] = current.includes(resolvedUserId)
            ? current
            : [...current, resolvedUserId].slice(-ASSIGN_CAP);
          return next;
        });
        logActivity("assign", target, resolvedUserId ? `approved assignment to ${resolvedUserId}` : "approved unassign");
      return true;
    }
    if (proposal.kind === "edit") {
        if (proposal.requestedAction === "rename task" && value) {
          markLocalWrite("stageNameOverrides");
          setStageNameOverrides(prev => ({ ...prev, [target]: value }));
        } else if (proposal.requestedAction === "edit task description") {
          markLocalWrite("stageDescOverrides");
          setStageDescOverrides(prev => ({ ...prev, [target]: value || "" }));
        } else if (proposal.requestedAction === "set due date") {
          markLocalWrite("stageDueDates");
          setStageDueDates(prev => {
            const next = { ...prev };
            if (!value) delete next[target]; else next[target] = value;
            return next;
          });
        } else if (proposal.requestedAction === "rename subtask" && value) {
          const parsed = SubtaskKey.parse(target as Parameters<typeof SubtaskKey.parse>[0]);
          if (parsed) {
            markLocalWrite("subtasks");
            setSubtasks(prev => ({
              ...prev,
              [parsed.parentStageId]: (prev[parsed.parentStageId] || []).map(s => s.id === parsed.subtaskId ? { ...s, text: value } : s),
            }));
          }
        } else if (proposal.requestedAction === "edit subtask description") {
          markLocalWrite("subtaskDescOverrides");
          setSubtaskDescOverrides(prev => ({ ...prev, [target]: value || "" }));
        } else if (proposal.requestedAction === "set subtask due date") {
          markLocalWrite("subtaskDueDates");
          setSubtaskDueDates(prev => {
            const next = { ...prev };
            if (!value) delete next[target]; else next[target] = value;
            return next;
          });
        }
        logActivity("edit", target, `approved ${proposal.requestedAction || "edit request"}`);
      return true;
    }
    return true;
  };

  const updateExecProposalStatus = (id: number, status: "reviewed" | "rejected" | "canceled") => {
    if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
      showToast("// only Anna can close executive requests", t.amber);
      return;
    }
    const proposal = execProposals.find(p => p.id === id);
    if (proposal && status === "reviewed" && proposal.status === "pending" && !applyExecProposalAction(proposal)) return;
    markLocalWrite("execProposals");
    setExecProposals(prev => prev.map(p => p.id === id ? {
      ...p,
      status,
      reviewedAt: Date.now(),
      reviewedBy: currentUser,
    } : p));
  };

  const applyExecProposal = (id: number) => {
    if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
      showToast("// only Anna can apply requests", t.amber);
      return;
    }
    const proposal = execProposals.find(p => p.id === id);
    if (!proposal) return;
    if (applyExecProposalAction(proposal)) showToast("// request action applied", t.green);
  };

  const cancelExecProposal = (id: number) => {
    if (!currentUser) return;
    markLocalWrite("execProposals");
    setExecProposals(prev => prev.map(p => p.id === id && p.by === currentUser && p.status === "pending" ? {
      ...p,
      status: "canceled",
      reviewedAt: Date.now(),
      reviewedBy: currentUser,
    } : p));
  };

  const deleteExecProposal = (id: number) => {
    if (!currentUser || !ADMIN_IDS.includes(currentUser)) {
      showToast("// only Anna can delete requests", t.amber);
      return;
    }
    markLocalWrite("execProposals");
    setExecProposals(prev => prev.filter(p => !(p.id === id && p.status !== "pending")));
  };

  const value: ModelContextValue = {
    users, setUsers, currentUser, setCurrentUser, me,
    streakByUser,
    owners,
    claims, reactions, comments, subtasks, assignments, ownership,
    commentReactions, handleCommentReact,
    pendingNewComments, flushPendingComments,
    stageStatusOverrides, approvedStages, approvedSubtasks, approvedPipelines, stageDescOverrides, stageDueDates, setStageDueDate, stageNameOverrides,
    stagePointsOverride, setStagePointsOverride,
    subtaskStages, subtaskDescOverrides, setSubtaskDescOverride, subtaskDueDates, setSubtaskDueDate, pipeDescOverrides, setPipeDescOverrides, pipeMetaOverrides, setPipeMetaOverrides,
    customStages, customPipelines, workspaces, setWorkspaces, activityLog,
    reminders, addReminder, dismissReminder,
    notes, addNote, updateNote, deleteNote,
    bugs, addBug, updateBug, deleteBug,
    execProposals, addExecProposal, requestWorkChange, updateExecProposalStatus, applyExecProposal, cancelExecProposal, deleteExecProposal,
    archivedStages, archivedPipelines, archivedSubtasks, archived, stageImages,
    chatMessages, setChatMessages, hasMoreMessages, chatNotif, setChatNotif, liveNotifs,
    syncStatus,
    getStatus, getPoints, sc, ck, pr,
    allPipelinesGlobal,
    handleClaim, handleReact, addComment, deleteComment, addSubtask, toggleSubtask, renameSubtask,
    lockSubtask, removeSubtask, setSubtaskPoints,
    archiveStage, restoreStage, archivePipeline, restorePipeline, archiveSubtask, restoreSubtask,
    setStageDescOverride, setStageNameOverride, setSubtaskStage, getSubtaskStatus, cycleSubtaskStatus, assignTask,
    setStageStatusDirect, cycleStatus, approveStage, approveSubtask,
    addCustomStage, addCustomPipeline, addUnparentedStage, moveStageToPipeline, cyclePriority,
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
    assignedTo: assignments[stageId] || [],
  }), [claims, reactions, comments, subtasks, stageStatusOverrides, stageDescOverrides, stageNameOverrides, assignments, stageId]);
}

export function usePipeline(pipelineId: string) {
  const { pipeMetaOverrides, pipeDescOverrides, customStages } = useModel();
  return useMemo(() => ({
    nameOverride: pipeMetaOverrides[pipelineId]?.name,
    descOverride: pipeDescOverrides[pipelineId],
    priority: pipeMetaOverrides[pipelineId]?.priority,
    customStages: customStages[pipelineId] || [],
  }), [pipeMetaOverrides, pipeDescOverrides, customStages, pipelineId]);
}

export function useOwnership(stageId: string) {
  const { ownership, currentUser } = useModel();
  return useMemo(() => {
    const entry = ownership[stageId] || { claimedBy: [], assignedTo: [] };
    return {
      claimedBy: entry.claimedBy,
      isMine: currentUser ? entry.claimedBy.includes(currentUser) : false,
      assignedTo: entry.assignedTo, // string[]
      isAssignedToMe: currentUser ? entry.assignedTo.includes(currentUser) : false,
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
 * "root" | "operator" | "agent" | null (null = not a member)
 */
export function useRole(workspaceId?: string): "root" | "operator" | "agent" | null {
  const { workspaces, currentUser } = useModel();
  return useMemo(() => {
    if (!workspaceId || !currentUser) return null;
    if (ADMIN_IDS.includes(currentUser)) return "root";
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return null;
    if (ws.captains.includes(currentUser)) return "operator";
    if (ws.members.includes(currentUser)) return "agent";
    return null;
  }, [workspaceId, workspaces, currentUser]);
}
