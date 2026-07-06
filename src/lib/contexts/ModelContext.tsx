"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode,
} from "react";
import { useUndoStack, type UndoOp } from "@/lib/hooks/useUndoStack";
import { lsGet, lsSet } from "@/lib/storage";
import {
  LOCAL_WRITE_PROTECT_MS as _LOCAL_WRITE_PROTECT_MS,
  NOTIF_DISMISS_MS, COMMENT_NOTIF_DISMISS_MS, CONFLICT_TOAST_THROTTLE_MS,
} from "@/lib/constants";
import { deriveStageDisplayPoints } from "@/lib/points";
import {
  pipelineData, stageDefaults, USERS_DEFAULT, STATUS_ORDER, normalizeStageStatus, DEFAULT_USEFUL_LINKS,
  ADMIN_IDS, DEFAULT_WORKSPACE_ID,
	  type UserType, type SubtaskItem, type CommentItem, type ActivityItem, type Workspace, type ExecProposal, type ReminderItem, type TimelineEvent, type TimelineEventStatus, type TimelineEventTier, type NoteItem, type BugItem, type BugAttachment, type BugSeverity, type BugStatus, type BugType, type UsefulLinkItem, type UsefulLinkIcon, type WorkspaceDb, type DbColumn,
	} from "@/lib/data";
import { mkTheme, type T } from "@/lib/themes";
import { SubtaskKey } from "@/lib/subtaskKey";
import { beaconPatchState, deleteComment as deleteCommentRemote, patchComment as patchCommentRemote, patchState, pushComment, pushActivity, pushCommentReaction, type ChatAttachment, type SharedState, type PatchEnvelope } from "@/lib/apiSync";
import { useSync, type SyncStatus } from "@/lib/hooks/useSync";
import { type ChatMsg } from "@/components/ChatPanel";
import { useChatHandlers } from "@/lib/hooks/useChatHandlers";
import { useWorkspaceHandlers } from "@/lib/hooks/useWorkspaceHandlers";
import { useContentHandlers } from "@/lib/hooks/useContentHandlers";

export type CustomPipeline = {
  id: string; name: string; desc: string; icon: string;
  colorKey: string; priority: string; totalHours?: string; points: number; stages: string[];
};

// Take name/role/color from USERS_DEFAULT — preserve avatar/aiAvatar from saved state.
// Use `||` (not `??`) so an empty-string avatar from the server doesn't clobber a
// user's chosen avatar in local state. Without this, picking an avatar would briefly
// stick, then revert as soon as a sync poll merged a server users array where that
// user's avatar hadn't been persisted yet.
export function hydrateUsers(saved: UserType[], current: UserType[] = []): UserType[] {
  const savedMap = Object.fromEntries(saved.map(u => [u.id, u]));
  const currentMap = Object.fromEntries(current.map(u => [u.id, u]));
  return USERS_DEFAULT.map(def => ({
    ...def,
    avatar: savedMap[def.id]?.avatar || currentMap[def.id]?.avatar || "",
    aiAvatar: savedMap[def.id]?.aiAvatar || currentMap[def.id]?.aiAvatar,
  })) as UserType[];
}

const PRIORITY_CYCLE = ["NOW", "HIGH", "MEDIUM", "LOW"] as const;


interface ModelContextValue {
  // Users / identity
  users: UserType[];
  workspaceUsers: UserType[];
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
  stagePriorities: Record<string, "NOW" | "HIGH" | "MEDIUM" | "LOW">;
  setStagePriority: (stageId: string, val: "NOW" | "HIGH" | "MEDIUM" | "LOW" | null) => void;
  // Maps an unparented "Inbox" stage id -> the workspace it belongs to, so Inbox
  // tasks are scoped per-workspace instead of shown globally to everyone.
  inboxStageWorkspace: Record<string, string>;
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
	  addReminder: (input: { title: string; body: string; recipientIds: string[]; remindAt: string; workspaceId?: string }) => void;
	  dismissReminder: (id: number) => void;
  timelineEvents: TimelineEvent[];
  addTimelineEvent: (input: { title: string; group: string; status: TimelineEventStatus; tier?: TimelineEventTier; date?: string; label?: string; notes?: string; responsibleId?: string; url?: string }) => void;
  updateTimelineEvent: (id: number, patch: Partial<Pick<TimelineEvent, "title" | "group" | "status" | "tier" | "date" | "label" | "notes" | "responsibleId" | "url">>) => void;
  deleteTimelineEvent: (id: number) => void;
	  notes: NoteItem[];
	  addNote: (input: { title: string; body: string; pinnedTo?: string; color?: string }) => void;
	  updateNote: (id: number, patch: Partial<Pick<NoteItem, "title" | "body" | "pinnedTo" | "color">>) => void;
	  deleteNote: (id: number) => void;
  bugs: BugItem[];
  addBug: (input: { title: string; body?: string; steps?: string; expected?: string; actual?: string; type: BugType; severity: BugSeverity; status?: BugStatus; ownerId?: string; linkedTask?: string; attachments?: BugAttachment[] }) => void;
  updateBug: (id: number, patch: Partial<Pick<BugItem, "title" | "body" | "steps" | "expected" | "actual" | "type" | "severity" | "status" | "ownerId" | "linkedTask" | "attachments" | "comments">>) => void;
  deleteBug: (id: number) => void;
  usefulLinks: UsefulLinkItem[];
  addUsefulLink: (input: Omit<UsefulLinkItem, "id" | "createdBy" | "createdAt" | "updatedAt">) => void;
  updateUsefulLink: (id: number, patch: Partial<Pick<UsefulLinkItem, "group" | "eyebrow" | "title" | "label" | "href" | "icon" | "badge" | "description" | "credentials">>) => void;
  deleteUsefulLink: (id: number) => void;
  execProposals: ExecProposal[];
  addExecProposal: (title: string, body: string) => void;
  requestWorkChange: (input: { kind: "edit" | "archive" | "assign"; target: string; title: string; body: string; requestedAction: string; requestedValue?: string | null; requestedUserId?: string | null }) => void;
  updateExecProposalStatus: (id: number, status: "reviewed" | "rejected" | "canceled") => void;
  applyExecProposal: (id: number) => void;
  cancelExecProposal: (id: number) => void;
  completeExecProposal: (id: number) => void;
  deleteExecProposal: (id: number) => void;
  archivedStages: string[];
  archivedPipelines: string[];
  archivedSubtasks: string[];
  archived: { stages: string[]; pipelines: string[]; subtasks: string[] };
  stageImages: Record<string, string[]>;

  // Comment reactions: key = `${stageId}::${commentId}`, value = emoji → userIds[]
  commentReactions: Record<string, Record<string, string[]>>;
  handleCommentReact: (stageId: string, commentId: number, emoji: string) => void;

  // Per-user notification read state (server-synced, not localStorage-only).
  // notifReads: userId → ms timestamp of "mark all updates read".
  // notifDismissed: userId → list of dismissed notif item ids.
  notifReads: Record<string, number>;
  notifDismissed: Record<string, string[]>;
  notifReadIds: Record<string, string[]>;
  /** Mark all visible notifications as read. If `ids` is supplied, those ids are
   *  added to notifReadIds (so action-required items dim too); always stamps the
   *  notifReads cutoff for time-based unread tracking. */
  markAllNotifsRead: (ids?: string[]) => void;
  markNotifRead: (id: string) => void;
  dismissNotif: (id: string) => void;

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
	  editComment: (sid: string, commentId: number, text: string) => void;
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
  addCustomPipeline: (form: { name: string; desc: string; icon: string; colorKey: string; priority: string }, workspaceId?: string) => string | null;
  addUnparentedStage: (title: string, workspaceId?: string | null) => Promise<string | null>;
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
  pinCallSeries: (workspaceId: string, topic: string) => void;
  unpinCallSeries: (workspaceId: string, topic: string) => void;
  setWorkspaceCallsLabel: (workspaceId: string, label: string) => void;
  updateWorkspaceHiddenTabs: (workspaceId: string, hiddenTabs: string[]) => void;
  currentWorkspaceId: string | null;

  // Database (Notion-style tables)
  databases: WorkspaceDb[];
  createDatabase: (workspaceId: string, name: string, icon: string) => void;
  updateDatabase: (id: number, patch: Partial<Pick<WorkspaceDb, "name" | "icon" | "columns" | "rows" | "views">>) => void;
  deleteDatabase: (id: number) => void;
  addDbRow: (dbId: number, values?: Record<string, string>) => void;
  updateDbRow: (dbId: number, rowId: number, values: Record<string, string>) => void;
  deleteDbRow: (dbId: number, rowId: number) => void;
  addDbColumn: (dbId: number, col: Omit<DbColumn, "id">) => void;

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
  const t = useMemo(() => mkTheme(themeId, isDark), [themeId, isDark]);

  // ── Identity ──────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (initialUserId) return initialUserId;
    return lsGet("currentUser", null);
  });
  const [users, setUsersInternal] = useState(() => hydrateUsers(lsGet("users", []) as UserType[]));
  // Wrap setUsers to mark a local-write protection window so a poll merge during
  // the 1.5s scheduleWrite debounce can't clobber a fresh avatar pick. The
  // protection is read in mergePatch's `s.users` branch.
  const setUsers: React.Dispatch<React.SetStateAction<UserType[]>> = useCallback((updater) => {
    localWritesRef.current["users"] = Date.now();
    setUsersInternal(updater);
  }, []);

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
  const [stagePriorities, setStagePriorities] = useState<Record<string, "NOW" | "HIGH" | "MEDIUM" | "LOW">>(() => lsGet("stagePriorities", {}));
  const [inboxStageWorkspace, setInboxStageWorkspace] = useState<Record<string, string>>(() => lsGet("inboxStageWorkspace", {}));
  const [stageNameOverrides, setStageNameOverrides] = useState<Record<string, string>>(() => lsGet("stageNameOverrides", {}));
  const [subtaskStages, setSubtaskStages] = useState<Record<string, string>>(() => lsGet("subtaskStages", {}));
  const [subtaskDescOverrides, setSubtaskDescOverrides] = useState<Record<string, string>>(() => lsGet("subtaskDescOverrides", {}));
  const [subtaskDueDates, setSubtaskDueDates] = useState<Record<string, string>>(() => lsGet("subtaskDueDates", {}));
  const [pipeDescOverrides, setPipeDescOverrides] = useState<Record<string, string>>(() => lsGet("pipeDescOverrides", {}));
  const [pipeMetaOverrides, setPipeMetaOverrides] = useState<Record<string, { name?: string; priority?: string }>>(() => lsGet("pipeMetaOverrides", {}));
  const [customStages, setCustomStages] = useState<Record<string, string[]>>(() => {
    const raw = lsGet("customStages", {}) as Record<string, string[]>;
    // One-time self-heal: dedupe any pre-existing duplicate stage names per pipeline.
    // Stage names are the IDs, so duplicates produced phantom cards aliased onto the
    // same state. Earlier addCustomStage didn't guard against re-adding the same name.
    const cleaned: Record<string, string[]> = {};
    for (const [pid, stages] of Object.entries(raw)) {
      if (!Array.isArray(stages)) continue;
      const seen = new Set<string>();
      const out: string[] = [];
      for (const s of stages) {
        const t = (s ?? "").trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
      }
      cleaned[pid] = out;
    }
    return cleaned;
  });
  const [customPipelines, setCustomPipelines] = useState<CustomPipeline[]>(() => lsGet("customPipelines", []));
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => lsGet("workspaces", []));
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() => lsGet("activityLog", []));
  const [reminders, setReminders] = useState<ReminderItem[]>(() => lsGet("reminders", []));
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(() => lsGet("timelineEvents", []));
  const [notes, setNotes] = useState<NoteItem[]>(() => lsGet("notes", []));
  const [bugs, setBugs] = useState<BugItem[]>(() => lsGet("bugs", []));
  const [usefulLinks, setUsefulLinks] = useState<UsefulLinkItem[]>(() => lsGet("usefulLinks", []));
  const [execProposals, setExecProposals] = useState<ExecProposal[]>(() => lsGet("execProposals", []));
  const [databases, setDatabases] = useState<WorkspaceDb[]>(() => lsGet("databases", []));
  const usefulLinksSeededRef = useRef(false);
  const workspaceContentMigrationRef = useRef(false);
  const [archivedStages, setArchivedStages] = useState<string[]>(() => lsGet("archivedStages", []));
  const [archivedPipelines, setArchivedPipelines] = useState<string[]>(() => lsGet("archivedPipelines", []));
  const [archivedSubtasks, setArchivedSubtasks] = useState<string[]>(() => lsGet("archivedSubtasks", []));
  const [stageImages, setStageImages] = useState<Record<string, string[]>>(() => lsGet("stageImages", {}));
  const [commentReactions, setCommentReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [stagePointsOverride, setStagePointsOverrideState] = useState<Record<string, number>>(() => lsGet("stagePointsOverride", {}));
  const [pendingNewComments, setPendingNewComments] = useState<Record<string, CommentItem[]>>({});
  // Per-user notification state — synced via the same MAP_SLICES merge path so
  // multi-device read tracking actually works (localStorage-only would mean a
  // user marking notifs read on phone wouldn't dim them on desktop).
  const [notifReads, setNotifReads] = useState<Record<string, number>>(() => lsGet("notifReads", {}));
  const [notifDismissed, setNotifDismissed] = useState<Record<string, string[]>>(() => lsGet("notifDismissed", {}));
  const [notifReadIds, setNotifReadIds] = useState<Record<string, string[]>>(() => lsGet("notifReadIds", {}));

  // Streaks — server-derived, set via mergePatch from GET response
  const [streakByUser, setStreakByUser] = useState<Record<string, number>>({});

  // ── Chat state ────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [chatNotif, setChatNotif] = useState<{ name: string; text: string; isComment?: boolean; stage?: string; isReaction?: boolean; isClaim?: boolean } | null>(null);
  const [liveNotifs, setLiveNotifs] = useState<Record<string, { comment?: string; reaction?: string }>>({});

  // ── Sync refs (kept for poll-merge logic) ─────────────────────────────────
  // Counter bumped on every user-driven slice change. The scheduleWrite useEffect
  // compares against `lastWrittenActionRef` and only fires when the counter has
  // advanced — so poll-driven setX calls (which don't bump the counter) never
  // trigger an echo write, while user actions always do, even when their state
  // change batches with a poll merge in the same React commit.
  const userActionCounterRef = useRef(0);
  const lastWrittenActionRef = useRef(0);
  // Set by high-value actions (task/stage creation, approvals) that need their
  // write flushed immediately instead of on the 1.5s debounce. Consumed by the
  // autosave effect below, which runs AFTER React commits the state change — so
  // writeNow reads the fresh, committed state. The old `setTimeout(writeNow, 0)`
  // pattern could fire before commit and ship a stale envelope, dropping the
  // just-added slice (e.g. a new customStages entry) → the task flash-disappears
  // until the server self-heal re-registers its stage.
  const flushImmediatelyRef = useRef(false);
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
  const dirtyMapKeysRef = useRef<Record<string, Set<string>>>({});
  const LOCAL_WRITE_PROTECT_MS = _LOCAL_WRITE_PROTECT_MS;

  // Diff-based delete tracking. The server merges every slice instead of
  // wholesale-replacing it (per-key for maps, by-id for arrays-of-objects,
  // set-union for set-like arrays). To delete a key/item we must send a
  // `_deletes` envelope. We compute it by diffing current local state against
  // `serverKeysRef` — the last membership we know exists on the server.
  const MAP_SLICES = useMemo(() => [
    "owners", "stageStatusOverrides", "stageDescOverrides", "stageDueDates",
    "stageNameOverrides", "stagePriorities", "stagePointsOverride",
    "subtaskStages", "subtaskDescOverrides", "subtaskDueDates",
    "pipeDescOverrides", "pipeMetaOverrides", "customStages",
    "notifReads", "notifDismissed", "notifReadIds", "inboxStageWorkspace",
  ] as const, []);
  const ARRAY_BY_ID_SLICES = useMemo(() => [
    "execProposals", "reminders", "timelineEvents", "notes", "bugs", "usefulLinks", "customPipelines", "databases",
  ] as const, []);
  const SET_SLICES = useMemo(() => [
    "approvedStages", "approvedSubtasks", "approvedPipelines",
    "archivedStages", "archivedPipelines", "archivedSubtasks",
  ] as const, []);
  const serverKeysRef = useRef<Record<string, Set<string>>>({});
  // Track subtask members per stage as `${stage}::${id}` so we can detect deletes.
  const serverSubtaskKeysRef = useRef<Set<string>>(new Set());
  // Track database rows the server knows as `${dbId}::${rowId}`. Databases now
  // merge row-by-row on the server (keep-existing), so a row REMOVAL only
  // propagates via an explicit `_deletes` key — this ref lets us diff local vs
  // server rows to compute those keys, exactly like serverSubtaskKeysRef.
  const serverDbRowKeysRef = useRef<Set<string>>(new Set());

  const recordServerKeys = useCallback((s: Partial<SharedState>) => {
    for (const slice of MAP_SLICES) {
      const v = (s as Record<string, unknown>)[slice];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        serverKeysRef.current[slice] = new Set(Object.keys(v as Record<string, unknown>));
      }
    }
    for (const slice of ARRAY_BY_ID_SLICES) {
      const v = (s as Record<string, unknown>)[slice];
      if (Array.isArray(v)) {
        serverKeysRef.current[slice] = new Set((v as { id: number | string }[]).map(i => String(i.id)));
      }
    }
    for (const slice of SET_SLICES) {
      const v = (s as Record<string, unknown>)[slice];
      if (Array.isArray(v)) {
        serverKeysRef.current[slice] = new Set(v as string[]);
      }
    }
    // owners merges legacy claims/assignments — record their keys too.
    const ownerKeys = new Set<string>(serverKeysRef.current.owners ?? []);
    for (const legacy of ["claims", "assignments"] as const) {
      const v = (s as Record<string, unknown>)[legacy];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const k of Object.keys(v as Record<string, unknown>)) ownerKeys.add(k);
      }
    }
    if (ownerKeys.size > 0) serverKeysRef.current.owners = ownerKeys;

    // Subtasks: per (stage, subtaskId) so a stale tab can't drop another tab's add.
    if (s.subtasks && typeof s.subtasks === "object") {
      const set = new Set<string>();
      for (const [stage, list] of Object.entries(s.subtasks as Record<string, { id: number }[]>)) {
        if (Array.isArray(list)) for (const item of list) set.add(`${stage}::${item.id}`);
      }
      serverSubtaskKeysRef.current = set;
      // Stage-level keys for `subtasks` map — needed if user removes the whole stage.
      serverKeysRef.current.subtasks = new Set(Object.keys(s.subtasks));
    }

    // Databases: per (dbId, rowId) so a stale tab can't drop another tab's row.
    if (Array.isArray((s as Record<string, unknown>).databases)) {
      const set = new Set<string>();
      for (const db of (s as { databases: { id: number | string; rows?: { id: number | string }[] }[] }).databases) {
        if (Array.isArray(db.rows)) for (const r of db.rows) set.add(`${db.id}::${r.id}`);
      }
      serverDbRowKeysRef.current = set;
    }
  }, [MAP_SLICES, ARRAY_BY_ID_SLICES, SET_SLICES]);
  const markLocalWrite = useCallback((slice: string, key?: string) => {
    localWritesRef.current[slice] = Date.now();
    if (key) {
      const keys = dirtyMapKeysRef.current[slice] ?? new Set<string>();
      keys.add(key);
      dirtyMapKeysRef.current[slice] = keys;
    }
    userActionCounterRef.current += 1;
  }, []);
  const protectLocalSlice = useCallback((slice: string) => {
    localWritesRef.current[slice] = Date.now();
  }, []);
  const persistPipeDescOverrides = useCallback<React.Dispatch<React.SetStateAction<Record<string, string>>>>((next) => {
    markLocalWrite("pipeDescOverrides");
    setPipeDescOverrides(prev => {
      const val = typeof next === "function" ? next(prev) : next;
      lsSet("pipeDescOverrides", val);
      return val;
    });
  }, [markLocalWrite]);
  const persistPipeMetaOverrides = useCallback<React.Dispatch<React.SetStateAction<Record<string, { name?: string; priority?: string }>>>>((next) => {
    markLocalWrite("pipeMetaOverrides");
    setPipeMetaOverrides(prev => {
      const val = typeof next === "function" ? next(prev) : next;
      lsSet("pipeMetaOverrides", val);
      return val;
    });
  }, [markLocalWrite]);
  const isProtected = (slice: string) => {
    const t = localWritesRef.current[slice];
    return t !== undefined && Date.now() - t < LOCAL_WRITE_PROTECT_MS;
  };

  // ── LocalStorage persistence (batched) ────────────────────────────────────
  // Replaces 30+ individual useEffect+lsSet pairs. Tracks previous values via a
  // ref; on any state change we debounce 300ms and flush ONLY the keys whose
  // value reference actually changed since the last flush. This trims a 30-key
  // bulk-render storm down to a single setTimeout + N writes for keys that
  // really moved.
  const lsPrevRef = useRef<Record<string, unknown>>({});
  const lsFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const snapshot: Record<string, unknown> = {
      currentUser, users, reactions, owners, approvedPipelines, subtasks, comments,
      stageStatusOverrides, approvedStages, approvedSubtasks, stageImages,
      stageDescOverrides, stageDueDates, stagePriorities, subtaskDescOverrides,
      subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
      workspaces, archivedStages, archivedPipelines, archivedSubtasks,
      activityLog, reminders, timelineEvents, notes, bugs, usefulLinks, execProposals, stagePointsOverride,
      notifReads, notifDismissed, notifReadIds, databases,
      subtaskStages, stageNameOverrides, inboxStageWorkspace,
    };
    if (lsFlushTimerRef.current) clearTimeout(lsFlushTimerRef.current);
    lsFlushTimerRef.current = setTimeout(() => {
      const prev = lsPrevRef.current;
      for (const [key, val] of Object.entries(snapshot)) {
        if (!Object.is(prev[key], val)) {
          lsSet(key, val);
          prev[key] = val;
        }
      }
    }, 300);
    return () => { if (lsFlushTimerRef.current) clearTimeout(lsFlushTimerRef.current); };
  }, [
    currentUser, users, reactions, owners, approvedPipelines, subtasks, comments,
    stageStatusOverrides, approvedStages, approvedSubtasks, stageImages,
    stageDescOverrides, stageDueDates, stagePriorities, subtaskDescOverrides,
    subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
    workspaces, archivedStages, archivedPipelines, archivedSubtasks,
    activityLog, reminders, timelineEvents, notes, bugs, usefulLinks, execProposals, stagePointsOverride,
    notifReads, notifDismissed, notifReadIds, databases,
    subtaskStages, stageNameOverrides, inboxStageWorkspace,
  ]);

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
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => {
      let changed = false;
      const next = prev.map(w => {
        if (w.name !== "Digital Marketing") return w;
        changed = true;
        return { ...w, name: "Binayah Properties" };
      });
      if (changed) markLocalWrite("workspaces");
      return changed ? next : prev;
    });
  }, [markLocalWrite]);
  // Migrate: ensure "Binayah Properties" workspace always has all pipeline IDs
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => {
      const allIds = [...pipelineData.map(p => p.id), ...customPipelines.map(p => p.id)];
      let changed = false;
      const next = prev.map(w => {
        if (w.name !== "Binayah Properties") return w;
        const missing = allIds.filter(id => !w.pipelineIds.includes(id));
        if (missing.length === 0) return w;
        changed = true;
        return { ...w, pipelineIds: [...w.pipelineIds, ...missing] };
      });
      if (changed) markLocalWrite("workspaces");
      return changed ? next : prev;
    });
  }, [customPipelines, markLocalWrite]);

  // Ensure the marketing workspace exists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    setWorkspaces(prev => {
      if (prev.some(w => w.id === "marketing")) return prev;
      const marketingWs: Workspace = {
        id: "marketing", name: "Marketing Hub", icon: "📣", colorKey: "green",
        members: [...ADMIN_IDS], captains: [...ADMIN_IDS], pipelineIds: [],
      };
      markLocalWrite("workspaces");
      return [...prev, marketingWs];
    });
  }, [markLocalWrite]);

  // Remove revoked users from workspace member lists.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const revoked = new Set(["nida", "zahaib"]);
    setWorkspaces(prev => {
      let changed = false;
      const next = prev.map(w => {
        const filtered = (w.members ?? []).filter(id => !revoked.has(id));
        if (filtered.length === (w.members ?? []).length) return w;
        changed = true;
        return { ...w, members: filtered };
      });
      if (changed) markLocalWrite("workspaces");
      return changed ? next : prev;
    });
  }, [markLocalWrite]);

  const timelineSeededRef = useRef(false);

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
  const notifyDescriptionMentions = useCallback((target: string, nextText: string, previousText: string, label: string) => {
    if (!currentUser) return;
    const previousMentioned = new Set(mentionedUserIds(previousText || ""));
    const newlyMentioned = mentionedUserIds(nextText || "").filter(id => !previousMentioned.has(id));
    if (newlyMentioned.length === 0) return;
    const mentionText = nextText.slice(0, 600);
    logActivity("mention", target, `updated description for "${label}" and mentioned ${newlyMentioned.map(id => `@${id}`).join(", ")}: ${mentionText.slice(0, 120)}`, newlyMentioned);
    void patchState({
      notificationEvents: [{
        eventType: "mentioned",
        stageKey: target,
        userIds: newlyMentioned,
        detail: `${users.find(u => u.id === currentUser)?.name || currentUser} mentioned you in the description for "${label}".`,
        commentText: mentionText,
      }],
    });
  }, [currentUser, logActivity, mentionedUserIds, users]);

  // Throttle conflict toasts so a busy team doesn't spam the user.
  const lastConflictToastRef = useRef(0);
  // Live mirror of state values mergePatch needs to read. Refs let us avoid
  // re-creating mergePatch on every render while still observing fresh values.
  const stateMirrorRef = useRef({
    owners, stageStatusOverrides, stageDueDates, stagePriorities,
    stageDescOverrides, subtaskStages, subtaskDescOverrides,
  });
  useEffect(() => {
    stateMirrorRef.current = { owners, stageStatusOverrides, stageDueDates, stagePriorities, stageDescOverrides, subtaskStages, subtaskDescOverrides };
  }, [owners, stageStatusOverrides, stageDueDates, stagePriorities, stageDescOverrides, subtaskStages, subtaskDescOverrides]);
  // ── useSync: mergePatch callback (handles both initial hydrate + poll updates) ──
  const mergePatch = useCallback((s: SharedState) => {
    if (!s || !Object.keys(s).length) return;
    // Snapshot what keys exist on the server right now — used to detect
    // local deletions on the next scheduleWrite.
    recordServerKeys(s);

    // Conflict detection: if any protected slice has incoming server keys whose
    // values differ from our local values, a teammate edited the same place
    // we're working in. Don't apply (protect window already prevents that),
    // but surface a toast so the user knows their pending write will overwrite.
    if (!isInitialHydrateRef.current && Date.now() - lastConflictToastRef.current > CONFLICT_TOAST_THROTTLE_MS) {
      const mirror = stateMirrorRef.current;
      const conflictSlices = ([
        ["stageStatusOverrides", mirror.stageStatusOverrides],
        ["owners", mirror.owners],
        ["stageDueDates", mirror.stageDueDates],
        ["stagePriorities", mirror.stagePriorities],
      ] as const);
      let conflictKey: string | null = null;
      for (const [slice, local] of conflictSlices) {
        if (!isProtected(slice)) continue;
        const incoming = (s as Record<string, unknown>)[slice];
        if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) continue;
        for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
          const localVal = (local as Record<string, unknown>)[k];
          if (JSON.stringify(localVal) !== JSON.stringify(v)) { conflictKey = k; break; }
        }
        if (conflictKey) break;
      }
      if (conflictKey) {
        lastConflictToastRef.current = Date.now();
        showToast(`// teammate edited "${conflictKey}" — your changes will save on top`, t.amber);
      }
    }
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
            setTimeout(() => setChatNotif(null), NOTIF_DISMISS_MS);
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
              setTimeout(() => setChatNotif(null), NOTIF_DISMISS_MS);
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
    if (s.timelineEvents && !isProtected("timelineEvents")) setTimelineEvents(s.timelineEvents as TimelineEvent[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((s as any).databases && !isProtected("databases")) setDatabases((s as any).databases as WorkspaceDb[]);
    if (s.notes && !isProtected("notes")) setNotes(s.notes as NoteItem[]);
    if (s.bugs && !isProtected("bugs")) setBugs(s.bugs as BugItem[]);
    if (s.usefulLinks && !isProtected("usefulLinks")) setUsefulLinks(s.usefulLinks as UsefulLinkItem[]);
    if (s.execProposals && !isProtected("execProposals")) setExecProposals(s.execProposals as ExecProposal[]);
    if (s.subtasks && !isProtected("subtasks")) setSubtasks(s.subtasks as Record<string, SubtaskItem[]>);
    if (s.comments && !isProtected("comments")) {
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
      if (pendingCommentNotif) { setChatNotif(pendingCommentNotif); playNotifSound(); setTimeout(() => setChatNotif(null), COMMENT_NOTIF_DISMISS_MS); }
      if (pendingLiveNotif) {
        const { stage: stg, name } = pendingLiveNotif;
        setLiveNotifs(prev => ({ ...prev, [stg]: { ...prev[stg], comment: name } }));
        setTimeout(() => setLiveNotifs(prev => { const n = { ...prev }; if (n[stg]) { delete n[stg].comment; if (!Object.keys(n[stg]).length) delete n[stg]; } return n; }), 4000);
      }
    }
    if (s.commentReactions) {
      setCommentReactions(s.commentReactions as Record<string, Record<string, string[]>>);
    }
    if (s.stageStatusOverrides && !isProtected("stageStatusOverrides")) {
      if (isInitialHydrateRef.current) {
        // On initial hydrate, merge server state into local, giving local precedence.
        // The user's keepalive PATCH may still be in-flight when fetchState runs after
        // a reload, so the server transiently returns the old value. Full-replacing
        // here would flash the stale status until the next poll corrects it (~10s).
        setStageStatusOverrides(prev => ({ ...s.stageStatusOverrides!, ...prev }));
      } else {
        setStageStatusOverrides(s.stageStatusOverrides);
      }
    }
    // Helper: on initial hydrate, merge server-into-local giving local precedence
    // so a keepalive PATCH that hasn't landed yet doesn't flash the old value.
    // On subsequent polls, server wins (normal behaviour).
    const mergeMapOnHydrate = <T extends Record<string, unknown>>(
      serverVal: T,
      setter: (fn: (prev: T) => T) => void,
      directSetter: (val: T) => void,
    ) => {
      if (isInitialHydrateRef.current) {
        setter(prev => ({ ...serverVal, ...prev }));
      } else {
        directSetter(serverVal);
      }
    };
    if (s.stageDescOverrides && !isProtected("stageDescOverrides"))
      mergeMapOnHydrate(s.stageDescOverrides as Record<string, unknown>, setStageDescOverrides as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setStageDescOverrides(v as Record<string, string>));
    if (s.stageDueDates && !isProtected("stageDueDates"))
      mergeMapOnHydrate(s.stageDueDates as Record<string, unknown>, setStageDueDates as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setStageDueDates(v as Record<string, string>));
    if ((s as { stagePriorities?: Record<string, "NOW" | "HIGH" | "MEDIUM" | "LOW"> }).stagePriorities && !isProtected("stagePriorities"))
      mergeMapOnHydrate((s as { stagePriorities: Record<string, "NOW" | "HIGH" | "MEDIUM" | "LOW"> }).stagePriorities as Record<string, unknown>, setStagePriorities as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setStagePriorities(v as Record<string, "NOW" | "HIGH" | "MEDIUM" | "LOW">));
    if (s.stageNameOverrides && !isProtected("stageNameOverrides"))
      mergeMapOnHydrate(s.stageNameOverrides as Record<string, unknown>, setStageNameOverrides as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setStageNameOverrides(v as Record<string, string>));
    if ((s as { inboxStageWorkspace?: Record<string, string> }).inboxStageWorkspace && !isProtected("inboxStageWorkspace"))
      mergeMapOnHydrate((s as { inboxStageWorkspace: Record<string, string> }).inboxStageWorkspace as Record<string, unknown>, setInboxStageWorkspace as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setInboxStageWorkspace(v as Record<string, string>));
    if (s.subtaskStages && !isProtected("subtaskStages"))
      mergeMapOnHydrate(s.subtaskStages as Record<string, unknown>, setSubtaskStages as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setSubtaskStages(v as Record<string, string>));
    if (s.subtaskDescOverrides && !isProtected("subtaskDescOverrides"))
      mergeMapOnHydrate(s.subtaskDescOverrides as Record<string, unknown>, setSubtaskDescOverrides as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setSubtaskDescOverrides(v as Record<string, string>));
    if (s.subtaskDueDates && !isProtected("subtaskDueDates"))
      mergeMapOnHydrate(s.subtaskDueDates as Record<string, unknown>, setSubtaskDueDates as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setSubtaskDueDates(v as Record<string, string>));
    if (s.pipeDescOverrides && !isProtected("pipeDescOverrides"))
      mergeMapOnHydrate(s.pipeDescOverrides as Record<string, unknown>, setPipeDescOverrides as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setPipeDescOverrides(v as Record<string, string>));
    if (s.pipeMetaOverrides && !isProtected("pipeMetaOverrides"))
      mergeMapOnHydrate(s.pipeMetaOverrides as Record<string, unknown>, setPipeMetaOverrides as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setPipeMetaOverrides(v as Record<string, { name?: string; priority?: string }>));
    if (s.customStages && !isProtected("customStages")) setCustomStages(s.customStages);
    if (s.customPipelines && !isProtected("customPipelines")) setCustomPipelines(s.customPipelines as CustomPipeline[]);
    if (s.users && !isProtected("users")) setUsers(prev => hydrateUsers(s.users as UserType[], prev));
    if (s.workspaces && Array.isArray(s.workspaces) && s.workspaces.length > 0 && !isProtected("workspaces")) setWorkspaces(s.workspaces as Workspace[]);
    // Archive slices always MERGE (union) with local state — never replace.
    // Replacing causes items archived locally to vanish when the next poll
    // arrives before the sync write has flushed to the server.
    if (s.archivedStages) setArchivedStages(prev => Array.from(new Set([...prev, ...(s.archivedStages as string[])])));
    if (s.archivedPipelines) setArchivedPipelines(prev => Array.from(new Set([...prev, ...(s.archivedPipelines as string[])])));
    if (s.archivedSubtasks) setArchivedSubtasks(prev => Array.from(new Set([...prev, ...(s.archivedSubtasks as string[])])));
    if (s.stagePointsOverride && !isProtected("stagePointsOverride"))
      mergeMapOnHydrate(s.stagePointsOverride as Record<string, unknown>, setStagePointsOverrideState as (fn: (p: Record<string, unknown>) => Record<string, unknown>) => void, v => setStagePointsOverrideState(v as Record<string, number>));
    if (s.approvedStages && !isProtected("approvedStages")) setApprovedStages(s.approvedStages as string[]);
    if (s.approvedSubtasks && !isProtected("approvedSubtasks")) setApprovedSubtasks(s.approvedSubtasks as string[]);
    if (s.approvedPipelines && !isProtected("approvedPipelines")) setApprovedPipelines(s.approvedPipelines as string[]);
    if (s.notifReads && !isProtected("notifReads")) setNotifReads(s.notifReads as Record<string, number>);
    if (s.notifDismissed && !isProtected("notifDismissed")) setNotifDismissed(s.notifDismissed as Record<string, string[]>);
    if (s.notifReadIds && !isProtected("notifReadIds")) setNotifReadIds(s.notifReadIds as Record<string, string[]>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((s as any).streakByUser) setStreakByUser((s as any).streakByUser as Record<string, number>);
    // Mark initial hydrate complete — subsequent calls will fire claim/reaction notifications
    isInitialHydrateRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  useEffect(() => {
    const nextSubtaskStages = { ...subtaskStages };
    const nextSubtasks: typeof subtasks = {};
    let stagesChanged = false;
    let subtasksChanged = false;
    const approvedToClear = new Set<string>();

    for (const [parentStageId, list] of Object.entries(subtasks)) {
      if (!Array.isArray(list)) continue;
      const nextList = list.map(subtask => {
        const key = SubtaskKey.make(parentStageId, subtask.id);
        const explicitStatus = subtaskStages[key];
        const status = normalizeStageStatus(explicitStatus || (subtask.done ? "active" : "planned"));
        if (!explicitStatus && subtask.done) {
          nextSubtaskStages[key] = "active";
          stagesChanged = true;
        }
        const shouldBeDone = status === "active";
        if (subtask.done !== shouldBeDone) {
          subtasksChanged = true;
          if (!shouldBeDone && approvedSubtasks.includes(key)) approvedToClear.add(key);
          return { ...subtask, done: shouldBeDone };
        }
        return subtask;
      });
      if (nextList !== list) nextSubtasks[parentStageId] = nextList;
    }

    if (stagesChanged) {
      markLocalWrite("subtaskStages");
      setSubtaskStages(nextSubtaskStages);
    }
    if (subtasksChanged) {
      markLocalWrite("subtasks");
      setSubtasks(prev => ({ ...prev, ...nextSubtasks }));
    }
    if (approvedToClear.size > 0) {
      markLocalWrite("approvedSubtasks");
      setApprovedSubtasks(prev => prev.filter(key => !approvedToClear.has(key)));
    }
  }, [approvedSubtasks, markLocalWrite, subtasks, subtaskStages]);

  const getCurrentState = useCallback((): PatchEnvelope => {
    const state: Record<string, unknown> = {
      owners,
      approvedStages, approvedSubtasks, approvedPipelines,
      reminders,
      timelineEvents,
      notes,
      bugs,
      usefulLinks,
      execProposals,
      subtasks, stageDescOverrides, stageDueDates, stageNameOverrides,
      subtaskStages, subtaskDescOverrides, subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
      users, workspaces, archivedStages, archivedPipelines, archivedSubtasks,
      stagePointsOverride,
      stagePriorities,
      inboxStageWorkspace,
      notifReads,
      notifDismissed,
      notifReadIds,
      databases,
    };
    const dirtyStatusKeys = dirtyMapKeysRef.current.stageStatusOverrides;
    if (dirtyStatusKeys?.size) {
      state.stageStatusOverrides = Object.fromEntries(
        [...dirtyStatusKeys]
          .filter(key => Object.prototype.hasOwnProperty.call(stageStatusOverrides, key))
          .map(key => [key, stageStatusOverrides[key]])
      );
    }
    // Compute _deletes by diffing current state against the last server-known
    // membership. Anything the server thinks exists but no longer exists locally
    // was deleted by the user and needs an explicit removal on the server.
    const deletes: Record<string, string[]> = {};
    // MAP slices: by key name.
    for (const slice of MAP_SLICES) {
      if (slice === "stageStatusOverrides" || slice === "subtaskStages") continue;
      const localVal = state[slice];
      if (!localVal || typeof localVal !== "object" || Array.isArray(localVal)) continue;
      const localKeys = new Set(Object.keys(localVal as Record<string, unknown>));
      const serverKeys = serverKeysRef.current[slice];
      if (!serverKeys || serverKeys.size === 0) continue;
      const removed: string[] = [];
      for (const k of serverKeys) if (!localKeys.has(k)) removed.push(k);
      if (removed.length > 0) deletes[slice] = removed;
    }
    // ARRAY-BY-ID slices: by item.id.
    for (const slice of ARRAY_BY_ID_SLICES) {
      const localVal = state[slice];
      if (!Array.isArray(localVal)) continue;
      const localIds = new Set((localVal as { id: number | string }[]).map(i => String(i.id)));
      const serverKeys = serverKeysRef.current[slice];
      if (!serverKeys || serverKeys.size === 0) continue;
      const removed: string[] = [];
      for (const id of serverKeys) if (!localIds.has(id)) removed.push(id);
      if (removed.length > 0) deletes[slice] = removed;
    }
    // SET slices: by member.
    for (const slice of SET_SLICES) {
      const localVal = state[slice];
      if (!Array.isArray(localVal)) continue;
      const localSet = new Set(localVal as string[]);
      const serverKeys = serverKeysRef.current[slice];
      if (!serverKeys || serverKeys.size === 0) continue;
      const removed: string[] = [];
      for (const k of serverKeys) if (!localSet.has(k)) removed.push(k);
      if (removed.length > 0) deletes[slice] = removed;
    }
    // Subtasks (inner-array): track `${stage}::${id}` so we delete only the
    // subtask the user removed, never wiping the whole stage's list.
    {
      const localSet = new Set<string>();
      const subs = state.subtasks as Record<string, { id: number }[]> | undefined;
      if (subs) for (const [stage, list] of Object.entries(subs)) {
        if (Array.isArray(list)) for (const item of list) localSet.add(`${stage}::${item.id}`);
      }
      const removed: string[] = [];
      for (const k of serverSubtaskKeysRef.current) if (!localSet.has(k)) removed.push(k);
      if (removed.length > 0) deletes.subtasks = removed;
    }
    // Databases (inner-array rows): track `${dbId}::${rowId}` so a removed row
    // propagates now that the server keeps existing rows on merge. Whole-database
    // removals are already covered by the ARRAY_BY_ID pass above (bare dbId).
    {
      const localRowKeys = new Set<string>();
      const localDbIds = new Set<string>();
      const dbs = state.databases as { id: number | string; rows?: { id: number | string }[] }[] | undefined;
      if (Array.isArray(dbs)) for (const db of dbs) {
        localDbIds.add(String(db.id));
        if (Array.isArray(db.rows)) for (const r of db.rows) localRowKeys.add(`${db.id}::${r.id}`);
      }
      const removed: string[] = [];
      for (const k of serverDbRowKeysRef.current) {
        const dbId = k.slice(0, k.indexOf("::"));
        // Skip rows of a database that was removed wholesale (handled above).
        if (!localDbIds.has(dbId)) continue;
        if (!localRowKeys.has(k)) removed.push(k);
      }
      if (removed.length > 0) deletes.databases = [...(deletes.databases ?? []), ...removed];
    }
    const envelope: PatchEnvelope = state as PatchEnvelope;
    if (Object.keys(deletes).length > 0) envelope._deletes = deletes;
    return envelope;
  }, [owners, approvedStages, approvedSubtasks, approvedPipelines, reminders, timelineEvents, notes, bugs, usefulLinks, execProposals,
       subtasks, stageStatusOverrides, stageDescOverrides, stageDueDates, stageNameOverrides,
       subtaskStages, subtaskDescOverrides, subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines,
       users, workspaces, archivedStages, archivedPipelines, archivedSubtasks,
       stagePointsOverride, stagePriorities, inboxStageWorkspace, notifReads, notifDismissed, notifReadIds, databases, MAP_SLICES, ARRAY_BY_ID_SLICES, SET_SLICES]);

  // After a successful PATCH, the server's truth now matches what we sent —
  // record those memberships as the new server-known set so we don't re-send
  // the same _deletes on the next scheduleWrite.
  const onWriteSuccess = useCallback((sent: PatchEnvelope) => {
    if (sent.stageStatusOverrides && dirtyMapKeysRef.current.stageStatusOverrides) {
      for (const key of Object.keys(sent.stageStatusOverrides)) {
        const sentValue = sent.stageStatusOverrides[key];
        const currentValue = stateMirrorRef.current.stageStatusOverrides[key];
        if (currentValue === sentValue) {
          dirtyMapKeysRef.current.stageStatusOverrides.delete(key);
        }
      }
      if (dirtyMapKeysRef.current.stageStatusOverrides.size === 0) {
        delete dirtyMapKeysRef.current.stageStatusOverrides;
      }
    }
    for (const slice of MAP_SLICES) {
      const v = (sent as Record<string, unknown>)[slice];
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const keys = Object.keys(v as Record<string, unknown>);
        if (slice === "stageStatusOverrides") {
          serverKeysRef.current[slice] = new Set([...(serverKeysRef.current[slice] ?? []), ...keys]);
        } else {
          serverKeysRef.current[slice] = new Set(keys);
        }
      }
    }
    for (const slice of ARRAY_BY_ID_SLICES) {
      const v = (sent as Record<string, unknown>)[slice];
      if (Array.isArray(v)) {
        serverKeysRef.current[slice] = new Set((v as { id: number | string }[]).map(i => String(i.id)));
      }
    }
    for (const slice of SET_SLICES) {
      const v = (sent as Record<string, unknown>)[slice];
      if (Array.isArray(v)) {
        serverKeysRef.current[slice] = new Set(v as string[]);
      }
    }
    if (sent.subtasks) {
      const set = new Set<string>();
      for (const [stage, list] of Object.entries(sent.subtasks)) {
        if (Array.isArray(list)) for (const item of list) set.add(`${stage}::${item.id}`);
      }
      serverSubtaskKeysRef.current = set;
    }
    // Rebuild known db-row keys from what we sent (deleted rows are already absent,
    // so this captures the post-write truth; others' rows are re-learned on poll).
    if (Array.isArray((sent as Record<string, unknown>).databases)) {
      const set = new Set<string>();
      for (const db of (sent as { databases: { id: number | string; rows?: { id: number | string }[] }[] }).databases) {
        if (Array.isArray(db.rows)) for (const r of db.rows) set.add(`${db.id}::${r.id}`);
      }
      serverDbRowKeysRef.current = set;
    }
    if (sent._deletes) {
      for (const [slice, keys] of Object.entries(sent._deletes)) {
        if (slice === "subtasks") {
          for (const k of keys) serverSubtaskKeysRef.current.delete(k);
          continue;
        }
        const set = serverKeysRef.current[slice];
        if (!set) continue;
        for (const k of keys) set.delete(k);
      }
    }
  }, [MAP_SLICES, ARRAY_BY_ID_SLICES, SET_SLICES]);

  // Minimal payload for the beforeunload keepalive flush. The full envelope is
  // ~700KB+ (the `databases` slice alone is ~470KB), but a keepalive fetch body
  // is capped at 64KB by the browser — so sending the whole state on unload
  // silently fails and the user's just-made change (e.g. an approval) is lost,
  // reappearing on reload. Send only slices written in the last protection
  // window, minus a few large low-priority ones, so the flush fits and lands.
  const UNLOAD_SKIP_SLICES = useMemo(() => new Set([
    "databases", "activityLog", "notifReadIds", "notifReads", "notifDismissed",
    "comments", "commentReactions", "chatMessages", "notificationEvents",
  ]), []);
  const getUnloadPatch = useCallback((): PatchEnvelope | null => {
    const now = Date.now();
    const dirty = new Set(
      Object.entries(localWritesRef.current)
        .filter(([slice, ts]) => now - ts < LOCAL_WRITE_PROTECT_MS && !UNLOAD_SKIP_SLICES.has(slice))
        .map(([slice]) => slice)
    );
    if (dirty.size === 0) return null;
    const full = getCurrentState() as Record<string, unknown>;
    const out: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(full)) {
      if (k === "_deletes" || k === "updatedAt") continue;
      if (dirty.has(k)) out[k] = v;
    }
    const fd = full._deletes as Record<string, string[]> | undefined;
    if (fd) {
      const nd: Record<string, string[]> = {};
      for (const [slice, keys] of Object.entries(fd)) if (dirty.has(slice)) nd[slice] = keys;
      if (Object.keys(nd).length > 0) out._deletes = nd;
    }
    return out as PatchEnvelope;
  }, [getCurrentState, UNLOAD_SKIP_SLICES, LOCAL_WRITE_PROTECT_MS]);

  const { status: syncStatus, scheduleWrite, writeNow, setOffline } = useSync({ onPatch: mergePatch, getPatch: getCurrentState, getUnloadPatch, onWriteSuccess });
  // Stash in a ref so handlers defined before scheduleWrite/writeNow are stable
  // can still trigger an immediate flush (e.g. addCustomStage closes over this).
  const writeNowRef = useRef(writeNow);
  useEffect(() => { writeNowRef.current = writeNow; }, [writeNow]);
  // Alias so handlers can signal offline state (argument ignored — always sets offline)
  const setSyncStatus: (status: string) => void = useCallback(() => setOffline(), [setOffline]);
  setSyncStatusRef.current = setSyncStatus;

  const clearDirtyMapKey = useCallback((slice: string, key: string) => {
    const keys = dirtyMapKeysRef.current[slice];
    if (!keys) return;
    keys.delete(key);
    if (keys.size === 0) delete dirtyMapKeysRef.current[slice];
  }, []);

  const persistStageStatusNow = useCallback((name: string, status: string) => {
    const patch = { stageStatusOverrides: { [name]: status } };
    beaconPatchState(patch);
    void patchState(patch, { keepalive: true }).then(result => {
      if (!result.ok) {
        setSyncStatusRef.current("offline");
        return;
      }
      serverKeysRef.current.stageStatusOverrides = new Set([
        ...(serverKeysRef.current.stageStatusOverrides ?? []),
        name,
      ]);
      if (stateMirrorRef.current.stageStatusOverrides[name] === status) {
        clearDirtyMapKey("stageStatusOverrides", name);
      }
    });
  }, [clearDirtyMapKey]);

  const persistSubtaskStageNow = useCallback((key: string, status: string) => {
    const patch = { subtaskStages: { [key]: status } };
    beaconPatchState(patch);
    void patchState(patch, { keepalive: true }).then(result => {
      if (!result.ok) {
        setSyncStatusRef.current("offline");
        return;
      }
      serverKeysRef.current.subtaskStages = new Set([
        ...(serverKeysRef.current.subtaskStages ?? []),
        key,
      ]);
      if (stateMirrorRef.current.subtaskStages[key] === status) {
        clearDirtyMapKey("subtaskStages", key);
      }
    });
  }, [clearDirtyMapKey]);

  useEffect(() => {
    if (timelineSeededRef.current || syncStatus === "hydrating" || timelineEvents.length > 0 || !currentUser) return;
    timelineSeededRef.current = true;
    const now = Date.now();
    const seedItems: Array<Omit<TimelineEvent, "id" | "createdBy" | "createdAt" | "updatedAt">> = [
      { title: "SM automation", status: "done", group: "Automation", tier: "core" },
      { title: "Prospect Evaluation", status: "done", group: "Leads", tier: "core" },
      { title: "Binayah Hub", status: "done", group: "Platform", tier: "core" },
      { title: "Binayah News API", status: "done", group: "Content", tier: "core" },
      { title: "Next.js website", status: "planned", date: "2026-05-21", label: "Thursday", group: "Website", tier: "core" },
      { title: "SEO / Leads analytics", status: "planned", date: "2026-05-21", label: "Thursday", group: "Analytics", notes: "WP milestone", tier: "core" },
      { title: "Binayah Engagement Farming", status: "planned", date: "2026-05-22", label: "Friday", group: "Growth", tier: "secondary" },
      { title: "Property Valuation", status: "planned", date: "2026-05-22", label: "Friday", group: "Tools", tier: "core" },
      { title: "Landing Pages automation", status: "planned", date: "2026-05-26", label: "Tuesday next week", group: "Automation", tier: "core" },
      { title: "Auto emailing / WhatsApp for Prospect Finder", status: "planned", date: "2026-05-26", label: "Next Tuesday", group: "Leads", tier: "core" },
      { title: "SEO / Leads analytics", status: "planned", date: "2026-05-27", label: "Next Wednesday", group: "Analytics", notes: "Next.js milestone", tier: "core" },
      { title: "Video Automation", status: "planned", date: "2026-05-27", label: "Initial phase", group: "Media", notes: "Initial phase starts Wednesday / Friday", tier: "secondary" },
      { title: "Price Comparison for Agents", status: "planned", date: "2026-05-27", label: "Next Wednesday", group: "Agent Tools", tier: "core" },
      { title: "Market Pulse", status: "planned", date: "2026-05-28", label: "Next Thursday", group: "Market", tier: "core" },
      { title: "Video Automation", status: "planned", date: "2026-05-29", label: "Friday checkpoint", group: "Media", notes: "Follow-up checkpoint", tier: "secondary" },
      { title: "Voice call agent", status: "planned", date: "2026-06-03", label: "June 3", group: "Voice AI", tier: "core" },
    ];
    const seed: TimelineEvent[] = seedItems.map((item, index) => ({
      id: now + index,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
      ...item,
    }));
    markLocalWrite("timelineEvents");
    setTimelineEvents(seed);
    flushImmediatelyRef.current = true;
  }, [currentUser, markLocalWrite, syncStatus, timelineEvents.length]);

  useEffect(() => {
    if (usefulLinksSeededRef.current || syncStatus === "hydrating" || usefulLinks.length > 0 || !currentUser) return;
    usefulLinksSeededRef.current = true;
    const now = Date.now();
    const seed = DEFAULT_USEFUL_LINKS.map(link => ({
      ...link,
      createdBy: currentUser,
      createdAt: link.createdAt || now,
      updatedAt: now,
    }));
    markLocalWrite("usefulLinks");
    setUsefulLinks(seed);
    flushImmediatelyRef.current = true;
  }, [currentUser, markLocalWrite, syncStatus, usefulLinks.length]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    if (syncStatus !== "live" || workspaceContentMigrationRef.current) return;
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const aiWs = workspaces.find(w => normalize(w.name) === "binayahai");
    const propertyWs = workspaces.find(w => normalize(w.name) === "binayahproperties");
    if (!aiWs || !propertyWs) return;
    const isBacklinks = (db: WorkspaceDb) => {
      const name = normalize(db.name);
      return name === "backlinks" || name === "backlinksupdate";
    };
    const propertyBugs = bugs.some(bug => bug.workspaceId === propertyWs.id);
    const backlinkDbs = databases.filter(isBacklinks);
    const backlinksNeedMove = backlinkDbs.length > 1 || backlinkDbs.some(db => db.workspaceId !== propertyWs.id);
    if (!propertyBugs && !backlinksNeedMove) {
      workspaceContentMigrationRef.current = true;
      return;
    }

    workspaceContentMigrationRef.current = true;

    if (propertyBugs) setBugs(prev => {
      let bugChanged = false;
      const next = prev.map(bug => {
        if (bug.workspaceId !== propertyWs.id) return bug;
        bugChanged = true;
        return { ...bug, workspaceId: aiWs.id };
      });
      if (bugChanged) {
        markLocalWrite("bugs");
        flushImmediatelyRef.current = true;
        return next;
      }
      return prev;
    });

    if (backlinksNeedMove) setDatabases(prev => {
      const backlinkDbs = prev.filter(isBacklinks);
      if (backlinkDbs.length === 0) return prev;

      const base = backlinkDbs.find(db => db.workspaceId === propertyWs.id) || backlinkDbs[0];
      const colIds = new Set(base.columns.map(c => c.id));
      const colNames = new Set(base.columns.map(c => normalize(c.name)));
      const columns = [
        ...base.columns,
        ...backlinkDbs.flatMap(db => db.columns).filter(c => {
          if (colIds.has(c.id) || colNames.has(normalize(c.name))) return false;
          colIds.add(c.id);
          colNames.add(normalize(c.name));
          return true;
        }),
      ];
      const baseColumnByName = new Map(base.columns.map(c => [normalize(c.name), c.id]));
      const remapRowValues = (db: WorkspaceDb, values: Record<string, string>) => {
        const next = { ...values };
        for (const column of db.columns) {
          const targetId = baseColumnByName.get(normalize(column.name));
          if (!targetId || targetId === column.id || !values[column.id] || next[targetId]) continue;
          next[targetId] = values[column.id];
          delete next[column.id];
        }
        return next;
      };
      const rowKeys = new Set<string>();
      const rows = backlinkDbs.flatMap(db => db.rows.map(row => ({ ...row, values: remapRowValues(db, row.values) }))).filter(row => {
        const key = JSON.stringify(row.values);
        if (rowKeys.has(key)) return false;
        rowKeys.add(key);
        return true;
      });
      const merged: WorkspaceDb = {
        ...base,
        workspaceId: propertyWs.id,
        columns,
        rows,
      };
      const next = [...prev.filter(db => !isBacklinks(db)), merged];
      const dbChanged = backlinkDbs.length !== 1 || base.workspaceId !== propertyWs.id || rows.length !== base.rows.length;
      if (dbChanged) {
        markLocalWrite("databases");
        flushImmediatelyRef.current = true;
        return next;
      }
      return prev;
    });
  }, [bugs, databases, markLocalWrite, syncStatus, workspaces]);

  // ── Debounced write — delegate to useSync's scheduleWrite ────────────────
  // Fires only when a user action (markLocalWrite) has advanced the counter
  // since the last scheduled write. Poll-driven state changes don't bump the
  // counter, so they never trigger an echo write — and user actions that batch
  // with a poll merge in the same React commit still fire because the counter
  // bump happens synchronously inside the user's handler before the setX queue.
  useEffect(() => {
    if (userActionCounterRef.current === lastWrittenActionRef.current) return;
    lastWrittenActionRef.current = userActionCounterRef.current;
    // This effect runs after commit, so writeNow/scheduleWrite read fresh state.
    // High-value actions set flushImmediatelyRef to skip the debounce.
    if (flushImmediatelyRef.current) {
      flushImmediatelyRef.current = false;
      writeNow();
    } else {
      scheduleWrite();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owners, approvedStages, approvedSubtasks, approvedPipelines, reminders, timelineEvents, notes, bugs, usefulLinks, execProposals, subtasks, stageStatusOverrides, stageDescOverrides, stageDueDates, stageNameOverrides, subtaskStages, subtaskDescOverrides, subtaskDueDates, pipeDescOverrides, pipeMetaOverrides, customStages, customPipelines, users, archivedStages, archivedPipelines, archivedSubtasks, stagePointsOverride, stagePriorities, inboxStageWorkspace, workspaces, notifReads, notifDismissed, notifReadIds, databases]);

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
  const getStatus = useCallback((name: string) => {
    const override = stageStatusOverrides[name];
    if (override) return normalizeStageStatus(override);
    const def = stageDefaults[name]?.status;
    if (def) return normalizeStageStatus(def);
    // Custom stages (no default, no override) default to "planned" — keeps
    // user-created tasks visible under `hideConcept`. Without this, addCustomStage
    // tasks would vanish after the 10s write-protect expires and the sync poll
    // replaces stageStatusOverrides with a server copy that didn't yet round-trip
    // the new entry.
    return "planned";
  }, [stageStatusOverrides]);

  const pointsMap = useMemo(() => {
    const map: Record<string, number> = {};
    const archivedSubtaskKeySet = new Set(archivedSubtasks);
    const approvedSubtaskKeySet = new Set(approvedSubtasks);

    // Collect all user IDs that appear anywhere in owners
    const allUserIds = new Set<string>();
    Object.values(owners).forEach(ownersList => ownersList.forEach(uid => allUserIds.add(uid)));
    // Also include all known users so the lookup never misses someone with 0 pts
    users.forEach(u => allUserIds.add(u.id));

    for (const uid of allUserIds) {
      let p = 0;
      Object.entries(owners).forEach(([key, ownersList]) => {
        if (!ownersList.includes(uid)) return;
        const ownerCount = Math.max(ownersList.length, 1);

        // Subtask — key is "stageId::subtaskId".
        // If the parent stage itself has been approved, the parent card pays the
        // displayed ledger total, so individual subtask approvals should not pay
        // a second time.
        if (SubtaskKey.isValid(key)) {
          if (!approvedSubtaskKeySet.has(key)) return;
          const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
          if (!parsed) return;
          if (approvedStages.includes(parsed.parentStageId)) return;
          const sub = (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId);
          if (!sub) return;
          // Split subtask points among owners. Use Math.floor so totals are stable
          // and never exceed the headline number on the card.
          p += Math.floor(((sub.points && sub.points > 0) ? sub.points : 5) / ownerCount);
          return;
        }
        // Stage — approving a task pays the same point value shown on its card.
        // For parent tasks this is the live subtask ledger total.
        if (!approvedStages.includes(key)) return;
        const stageDefaultPts = stageDefaults[key]?.points || 10;
        const stagePts = deriveStageDisplayPoints(key, subtasks[key], archivedSubtaskKeySet, stageDefaultPts, stagePointsOverride);
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
          const total = allStages.reduce((sum, s) => sum + (stageDefaults[s]?.points ?? ((stagePointsOverride[s] && stagePointsOverride[s] > 0) ? stagePointsOverride[s] : 10)), 0);
          const bonus = Math.floor(total * 0.25);
          p += Math.floor(bonus / ownersUnion.size);
        }
      }

      Object.values(reactions).forEach(e => { Object.values(e).forEach(r => { if (r.includes(uid)) p += 2; }); });
      map[uid] = p;
    }
    return map;
  }, [owners, approvedStages, approvedSubtasks, approvedPipelines, reactions, subtasks, archivedSubtasks, stagePointsOverride, customPipelines, customStages, users]);

  const getPoints = useCallback((uid: string) => pointsMap[uid] ?? 0, [pointsMap]);

  const sc = useMemo<Record<string, { l: string; c: string }>>(() => ({
    active: { l: "live", c: t.green }, live: { l: "live", c: t.green }, done: { l: "live", c: t.green },
    "in-progress": { l: "building", c: t.amber }, building: { l: "building", c: t.amber },
    planned: { l: "planned", c: t.cyan || t.accent }, concept: { l: "concept", c: t.purple }, blocked: { l: "blocked", c: t.red },
  }), [t]);
  const ck = useMemo<Record<string, string>>(() => ({ blue: t.accent, purple: t.purple, green: t.green, amber: t.amber, cyan: t.cyan || t.accent, red: t.red, orange: t.orange, lime: t.lime, slate: t.slate }), [t]);
  const pr = useMemo<Record<string, { c: string }>>(() => ({ NOW: { c: t.orange }, HIGH: { c: t.textMuted }, MEDIUM: { c: t.cyan || t.accent }, LOW: { c: t.textDim } }), [t]);

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

  const me = useMemo(() => users.find(u => u.id === currentUser), [users, currentUser]);
  const allPipelinesGlobal = useMemo(() => [...pipelineData, ...customPipelines], [customPipelines]);

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
  const pinCallSeries = useCallback((wsId: string, topic: string) => {
    markLocalWrite("workspaces");
    setWorkspaces(prev => prev.map(w => w.id === wsId
      ? { ...w, callSeriesFilters: Array.from(new Set([...(w.callSeriesFilters ?? []), topic])) }
      : w));
  }, [markLocalWrite, setWorkspaces]);

  const unpinCallSeries = useCallback((wsId: string, topic: string) => {
    markLocalWrite("workspaces");
    setWorkspaces(prev => prev.map(w => w.id === wsId
      ? { ...w, callSeriesFilters: (w.callSeriesFilters ?? []).filter(f => f !== topic) }
      : w));
  }, [markLocalWrite, setWorkspaces]);

  const setWorkspaceCallsLabel = useCallback((wsId: string, label: string) => {
    markLocalWrite("workspaces");
    setWorkspaces(prev => prev.map(w => w.id === wsId
      ? { ...w, callsLabel: label.trim() || undefined }
      : w));
  }, [markLocalWrite, setWorkspaces]);

  const updateWorkspaceHiddenTabs = useCallback((wsId: string, hiddenTabs: string[]) => {
    markLocalWrite("workspaces");
    setWorkspaces(prev => prev.map(w => w.id === wsId ? { ...w, hiddenTabs } : w));
  }, [markLocalWrite, setWorkspaces]);

  const canMutateDirectly = useCallback(() => {
    if (!currentUser) return false;
    if (ADMIN_IDS.includes(currentUser)) return true;
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    return !!ws && ws.captains.includes(currentUser);
  }, [currentUser, currentWorkspaceId, workspaces]);

  const requestWorkChange = useCallback((input: { kind: "edit" | "archive" | "assign"; target: string; title: string; body: string; requestedAction: string; requestedValue?: string | null; requestedUserId?: string | null }) => {
    if (!currentUser) return;
    const dedupeKey = [
      input.kind,
      input.target,
      input.requestedAction,
      input.requestedValue ?? "",
      input.requestedUserId ?? "",
      currentUser,
    ].join("::");
    const hasSamePending = execProposals.some(p => p.status === "pending" && [
      p.kind,
      p.target || "",
      p.requestedAction || "",
      p.requestedValue ?? "",
      p.requestedUserId ?? "",
      p.by,
    ].join("::") === dedupeKey);
    if (hasSamePending) {
      showToast("// request already waiting for Anna", t.amber);
      return;
    }
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
    logActivity("request", input.target, `${input.requestedAction}: ${input.body}`, ADMIN_IDS);
    showToast("// request sent to Anna", t.green);
  }, [currentUser, execProposals, logActivity, markLocalWrite, showToast, t.amber, t.green]);

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
	    const currentList = owners[sid] || [];
	    const isNewAssignment = !!userId && !currentList.includes(userId);
	    let nextStageOwners: string[] = [];
	    const applyAssignment = (prev: Record<string, string[]>): Record<string, string[]> => {
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
	        nextStageOwners = next;
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
	    };
	    markLocalWrite("owners");
	    setOwners(applyAssignment);
	    if (isNewAssignment && userId) {
	      const preview = applyAssignment(owners);
	      const assignedName = assignee?.name || userId;
	      patchState({
	        owners: { [sid]: preview[sid] || nextStageOwners },
	        notificationEvents: [{
	          eventType: "assigned",
	          stageKey: sid,
	          userIds: [userId],
	          detail: `${users.find(u => u.id === currentUser)?.name || currentUser} assigned "${sid}" to ${assignedName}.`,
	        }],
	      }).then(result => {
	        if (!result.ok) setSyncStatus("offline");
	      });
	    }

	    if (userId) {
	      logActivity("assign", sid, isNewAssignment ? `assigned ${assignee?.name || userId}` : `removed ${assignee?.name || userId}`);
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

  const MAX_SUBTASKS = 20; const MAX_SUBTASK_LEN = 500;
  const addSubtask = (sid: string, val: string, clearInput: () => void): number | null => {
    if (!val || !currentUser) return null;
    const trimmed = val.trim();
    if (trimmed.length > MAX_SUBTASK_LEN) { showToast(`// subtask too long — max ${MAX_SUBTASK_LEN} chars`, t.red); return null; }
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
    const key = SubtaskKey.make(sid, taskId);
    const current = (subtasks[sid] || []).find(t => t.id === taskId);
    if (!current || current.locked) return;
    const nextDone = !current.done;
    markLocalWrite("subtasks");
    setSubtasks(prev => ({ ...prev, [sid]: (prev[sid] || []).map(t => t.id === taskId && !t.locked ? { ...t, done: nextDone } : t) }));
    markLocalWrite("subtaskStages");
    setSubtaskStages(prev => ({ ...prev, [key]: nextDone ? "active" : "planned" }));
    persistSubtaskStageNow(key, nextDone ? "active" : "planned");
    if (!nextDone && approvedSubtasks.includes(key)) {
      markLocalWrite("approvedSubtasks");
      setApprovedSubtasks(prev => prev.filter(k => k !== key));
    }
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
    markLocalWrite("subtasks");
    setSubtasks(prev => {
      const oldList = prev[oldParent] || [];
      const moving = oldList.find(s => s.id === subtaskId);
      if (!moving) return prev;
      const newOldList = oldList.filter(s => s.id !== subtaskId);
      const newNewList = [...(prev[newParentStageId] || []), moving];
      return { ...prev, [oldParent]: newOldList, [newParentStageId]: newNewList };
    });

    markLocalWrite("reactions");
    setReactions(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    markLocalWrite("comments");
    setComments(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    markLocalWrite("commentReactions");
    setCommentReactions(prev => {
      const next = { ...prev };
      let changed = false;
      for (const [reactionKey, val] of Object.entries(prev)) {
        if (reactionKey.startsWith(`${oldKey}::`)) {
          delete next[reactionKey];
          next[reactionKey.replace(`${oldKey}::`, `${newKey}::`)] = val;
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    markLocalWrite("subtaskStages");
    setSubtaskStages(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    markLocalWrite("subtaskDescOverrides");
    setSubtaskDescOverrides(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    markLocalWrite("subtaskDueDates");
    setSubtaskDueDates(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    markLocalWrite("owners");
    setOwners(prev => {
      if (!(oldKey in prev)) return prev;
      const entry = prev[oldKey];
      const next = { ...prev };
      delete next[oldKey];
      next[newKey] = entry;
      return next;
    });

    markLocalWrite("approvedSubtasks");
    setApprovedSubtasks(prev => prev.includes(oldKey)
      ? Array.from(new Set([...prev.filter(k => k !== oldKey), newKey]))
      : prev);

    markLocalWrite("archivedSubtasks");
    setArchivedSubtasks(prev => prev.includes(oldKey)
      ? Array.from(new Set([...prev.filter(k => k !== oldKey), newKey]))
      : prev);

    // Push to undo stack
    undoStack.push({
      label: `moved subtask to ${newParentStageId}`,
      inverse: () => migrateSubtask(newKey as SubtaskKey, oldParent),
    });

    logActivity("subtask_migrated", newParentStageId, `subtask moved from ${oldParent}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoStack, logActivity]);

  const MAX_COMMENT_LEN = 3000;
  const addComment = (sid: string, val: string, clearInput: () => void) => {
    if (!val || !currentUser) return;
    if (val.length > MAX_COMMENT_LEN) { showToast("// comment too long — max 3000 chars", t.red); return; }
    const commentId = Date.now();
    // Optimistic: mark pending=true so the UI can dim or show a spinner until
    // the server confirms. On success we strip the flag in place; on failure
    // we remove the comment entirely and surface a toast.
    const c: CommentItem = { id: commentId, text: val, by: currentUser, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), pending: true };
    protectLocalSlice("comments");
    setComments(prev => ({ ...prev, [sid]: [...(prev[sid] || []), c] }));
    clearInput();
    logActivity("comment", sid, val.slice(0, 100), mentionedUserIds(val));
    pushComment(sid, c).then(result => {
      if (!result.ok) {
        setComments(prev => ({ ...prev, [sid]: (prev[sid] || []).filter(x => x.id !== commentId) }));
        setSyncStatus("offline");
        showToast("// comment lost — try again", t.red);
        return;
      }
      // Server accepted — clear pending flag in place. (A subsequent sync poll
      // would also overwrite this slice with server data, but flipping the
      // flag here gives an instant green-light without waiting up to 5s.)
      protectLocalSlice("comments");
      setComments(prev => ({
        ...prev,
        [sid]: (prev[sid] || []).map(x => x.id === commentId ? { ...x, pending: false } : x),
      }));
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

  const editComment = (sid: string, commentId: number, text: string) => {
    if (!currentUser) return;
    const existing = comments[sid] || [];
    const comment = existing.find(c => c.id === commentId);
    if (!comment) return;
    if (comment.by !== currentUser && !ADMIN_IDS.includes(currentUser)) {
      showToast("// you can only edit your own comment", t.amber);
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setComments(prev => ({
      ...prev,
      [sid]: (prev[sid] || []).map(c => c.id === commentId ? { ...c, text: trimmed } : c),
    }));
    patchCommentRemote(sid, commentId, trimmed).then(result => {
      if (!result.ok) {
        setComments(prev => ({ ...prev, [sid]: existing }));
        setSyncStatus("offline");
        showToast("// edit failed — refresh and try again", t.red);
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
    markLocalWrite("stageDueDates");
    setStageDueDates(prev => {
      if (!(sid in prev)) return prev;
      const next = { ...prev };
      delete next[sid];
      return next;
    });
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
    markLocalWrite("subtaskDueDates");
    setSubtaskDueDates(prev => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    showToast(`archived subtask`, t.textMuted, 8000, {
      label: "undo",
      onClick: () => { undoStack.removeById(op.id); setArchivedSubtasks(prev => prev.filter(k => k !== key)); },
    });
  };
  const restoreSubtask = (key: string) => { markLocalWrite("archivedSubtasks"); setArchivedSubtasks(prev => Array.from(new Set(prev)).filter(k => k !== key)); };

  const setStageDescOverride = (name: string, val: string) => {
    if (requestInsteadOfMutate("edit", name, "edit task description", `Change description for "${name}" to:\n\n${val}`, { requestedValue: val })) return;
    const previous = stateMirrorRef.current.stageDescOverrides[name] || "";
    stateMirrorRef.current.stageDescOverrides = { ...stateMirrorRef.current.stageDescOverrides, [name]: val };
    markLocalWrite("stageDescOverrides");
    setStageDescOverrides(prev => ({ ...prev, [name]: val }));
    lsSet("stageDescOverrides", { ...stageDescOverrides, [name]: val });
    notifyDescriptionMentions(name, val, previous, stageNameOverrides[name] || name);
  };
  const setStageDueDate = (name: string, val: string | null) => {
    if (requestInsteadOfMutate("edit", name, "set due date", val ? `Set due date for "${name}" to ${val}.` : `Clear due date for "${name}".`, { requestedValue: val })) return;
    markLocalWrite("stageDueDates");
    const nextStageDueDates = { ...stageDueDates };
    if (!val) delete nextStageDueDates[name]; else nextStageDueDates[name] = val;
    setStageDueDates(nextStageDueDates);
    lsSet("stageDueDates", nextStageDueDates);
  };
  const setStagePriority = (stageId: string, val: "NOW" | "HIGH" | "MEDIUM" | "LOW" | null) => {
    if (requestInsteadOfMutate("edit", stageId, "set priority", val ? `Set priority for "${stageId}" to ${val}.` : `Clear priority for "${stageId}".`, { requestedValue: val })) return;
    markLocalWrite("stagePriorities");
    const nextStagePriorities = { ...stagePriorities };
    if (!val) delete nextStagePriorities[stageId]; else nextStagePriorities[stageId] = val;
    setStagePriorities(nextStagePriorities);
    lsSet("stagePriorities", nextStagePriorities);
  };
  const setSubtaskDescOverride = (key: string, desc: string | null) => {
    if (requestInsteadOfMutate("edit", key, "edit subtask description", `Change description for "${key}" to:\n\n${desc || "(empty)"}`, { requestedValue: desc || "" })) return;
    const nextDesc = desc || "";
    const previous = stateMirrorRef.current.subtaskDescOverrides[key] || "";
    stateMirrorRef.current.subtaskDescOverrides = { ...stateMirrorRef.current.subtaskDescOverrides, [key]: nextDesc };
    markLocalWrite("subtaskDescOverrides");
    const nextSubtaskDescOverrides = { ...subtaskDescOverrides };
    if (desc === null) delete nextSubtaskDescOverrides[key]; else nextSubtaskDescOverrides[key] = desc;
    setSubtaskDescOverrides(nextSubtaskDescOverrides);
    lsSet("subtaskDescOverrides", nextSubtaskDescOverrides);
    const parsed = SubtaskKey.isValid(key) ? SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]) : null;
    const sub = parsed ? (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId) : null;
    notifyDescriptionMentions(key, nextDesc, previous, sub?.text || key);
  };
  const setSubtaskDueDate = (key: string, val: string | null) => {
    if (requestInsteadOfMutate("edit", key, "set subtask due date", val ? `Set due date for "${key}" to ${val}.` : `Clear due date for "${key}".`, { requestedValue: val })) return;
    markLocalWrite("subtaskDueDates");
    const nextSubtaskDueDates = { ...subtaskDueDates };
    if (!val) delete nextSubtaskDueDates[key]; else nextSubtaskDueDates[key] = val;
    setSubtaskDueDates(nextSubtaskDueDates);
    lsSet("subtaskDueDates", nextSubtaskDueDates);
  };
  const setStageNameOverride = (name: string, val: string) => {
    if (requestInsteadOfMutate("edit", name, "rename task", `Rename "${name}" to "${val}".`, { requestedValue: val })) return;
    markLocalWrite("stageNameOverrides");
    setStageNameOverrides(prev => ({ ...prev, [name]: val }));
    lsSet("stageNameOverrides", { ...stageNameOverrides, [name]: val });
  };
  const setStagePointsOverride = (stageId: string, pts: number | null) => {
    markLocalWrite("stagePointsOverride");
    const nextStagePointsOverride = { ...stagePointsOverride };
    if (pts === null) { delete nextStagePointsOverride[stageId]; } else { nextStagePointsOverride[stageId] = pts; }
    setStagePointsOverrideState(nextStagePointsOverride);
    lsSet("stagePointsOverride", nextStagePointsOverride);
  };
  // Couples subtask kanban status with sub.done + approval:
  //   - Setting status to "active" marks sub.done = true (entering pending state).
  //   - Moving away from "active" clears sub.done AND any prior approval.
  const setSubtaskStage = (key: string, status: string) => {
    const nextStatus = normalizeStageStatus(status);
    const parsed = SubtaskKey.isValid(key)
      ? SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0])
      : null;
    const legacyDone = parsed
      ? (subtasks[parsed.parentStageId] || []).some(s => s.id === parsed.subtaskId && s.done)
      : false;
    const prevStatus = normalizeStageStatus(subtaskStages[key] || (legacyDone ? "active" : "planned"));
    markLocalWrite("subtaskStages");
    setSubtaskStages(prev => ({ ...prev, [key]: nextStatus }));
    lsSet("subtaskStages", { ...subtaskStages, [key]: nextStatus });
    persistSubtaskStageNow(key, nextStatus);
    if (parsed && prevStatus !== nextStatus) {
      const becameActive = nextStatus === "active";
      const leftActive = prevStatus === "active" && nextStatus !== "active";
      if (becameActive || leftActive) {
        markLocalWrite("subtasks");
        setSubtasks(prev => ({
          ...prev,
          [parsed.parentStageId]: (prev[parsed.parentStageId] || []).map(s =>
            s.id === parsed.subtaskId ? { ...s, done: becameActive } : s
          ),
        }));
        if (leftActive && approvedSubtasks.includes(key)) {
          markLocalWrite("approvedSubtasks");
          setApprovedSubtasks(prev => prev.filter(k => k !== key));
        }
      }
    }
  };

  const getSubtaskStatus = useCallback((key: string) => {
    const parsed = SubtaskKey.isValid(key)
      ? SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0])
      : null;
    const legacyDone = parsed
      ? (subtasks[parsed.parentStageId] || []).some(s => s.id === parsed.subtaskId && s.done)
      : false;
    return normalizeStageStatus(subtaskStages[key] || (legacyDone ? "active" : "planned"));
  }, [subtasks, subtaskStages]);

  const cycleSubtaskStatus = (key: string) => {
    const cur = getSubtaskStatus(key);
    const idx = STATUS_ORDER.indexOf(cur);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    setSubtaskStage(key, next);
  };

  const setStageStatusDirect = (name: string, status: string) => {
    const next = normalizeStageStatus(status);
    markLocalWrite("stageStatusOverrides", name);
    setStageStatusOverrides(prev => ({ ...prev, [name]: next }));
    lsSet("stageStatusOverrides", { ...stageStatusOverrides, [name]: next });
    persistStageStatusNow(name, next);
    logActivity("status", name, `→ ${next}`, ADMIN_IDS);
  };

  const cycleStatus = (name: string) => {
    const cur = getStatus(name);
    const idx = STATUS_ORDER.indexOf(cur);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    markLocalWrite("stageStatusOverrides", name);
    setStageStatusOverrides(prev => ({ ...prev, [name]: next }));
    persistStageStatusNow(name, next);
    logActivity("status", name, `→ ${next}`, ADMIN_IDS);
  };

  const approveStage = (name: string) => {
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    if (!currentUser || !ws || !(ws.captains.includes(currentUser) || ADMIN_IDS.includes(currentUser))) {
      showToast("// only an operator can approve", t.amber); return;
    }
    if (approvedStages.includes(name)) return;
    const nextApprovedStages = [...approvedStages, name];
    markLocalWrite("approvedStages");
    setApprovedStages(nextApprovedStages);
    logActivity("status", name, "→ approved");
    // Flush immediately — approvals are high-value; don't risk losing them to a
    // reload before the 1.5s debounce fires (see beforeunload keepalive limits).
    flushImmediatelyRef.current = true;

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
    markLocalWrite("approvedPipelines");
    setApprovedPipelines(prev => [...prev, owningPipe.id]);
    const total = allStages.reduce((sum, s) => sum + (stageDefaults[s]?.points ?? ((stagePointsOverride[s] && stagePointsOverride[s] > 0) ? stagePointsOverride[s] : 10)), 0);
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
    markLocalWrite("approvedSubtasks");
    setApprovedSubtasks(prev => [...prev, key]);
    const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
    const subText = parsed ? (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId)?.text : undefined;
    logActivity("status", subText || key, "→ approved");
    // Flush immediately — don't risk losing the approval to a reload before the
    // 1.5s debounce fires (the beforeunload keepalive can't carry the full state).
    flushImmediatelyRef.current = true;
  };

  const addCustomStage = (pid: string, val: string) => {
    if (!val) return;
    // Strip `.` and `$` — stage names are used as MongoDB map keys (owners,
    // stageStatusOverrides, etc.) and Mongo rejects those characters. A single
    // bad stage name silently bricks every PATCH from every user (see
    // /api/admin/sanitize-state for the cleanup history). Sanitize at the
    // creation boundary so the bug can't recur.
    const trimmed = val.trim().replace(/[.$]/g, "_");
    if (!trimmed) return;
    // Stage names are the IDs in this dashboard. Adding a duplicate would alias
    // the new card onto the existing stage's state (claims, comments, status…),
    // which is what produced the "many duplicate cards" rendering bug.
    const pipe = allPipelinesGlobal.find(p => p.id === pid);
    const existingDefault = pipe?.stages || [];
    const existingCustom = customStages[pid] || [];
    if (existingDefault.includes(trimmed) || existingCustom.includes(trimmed)) {
      showToast(`// "${trimmed}" already exists in this pipeline`, t.amber);
      return;
    }
    markLocalWrite("customStages");
    setCustomStages(prev => ({ ...prev, [pid]: [...(prev[pid] || []), trimmed] }));
    logActivity("create", trimmed, `added task to ${pid}`, ADMIN_IDS);
    // Push to the server immediately rather than waiting on the 1.5s debounce.
    // Task creation is high-value: if the user reloads or navigates before the
    // debounce fires, the task is lost from the server (localStorage retains it
    // briefly, but the next sync poll overwrites it with the server's stale
    // copy). Fire on next tick so the setCustomStages state update has committed
    // before getPatch() reads the latest state.
    flushImmediatelyRef.current = true;
  };

  // Inbox sentinel — used inline (also exported at module top for cross-file imports)
  const INBOX_PIPELINE_ID = INBOX_PIPELINE_ID_CONST;

  // Add a task with no parent pipeline. Calls /api/suggest-points with the title to derive
  // an LLM-suggested point value, stored as stagePointsOverride. Optimistic — if the LLM
  // call fails the stage still gets created with the default point fallback.
  const addUnparentedStage = useCallback(async (title: string, workspaceId?: string | null): Promise<string | null> => {
    // See addCustomStage — strip Mongo-forbidden characters from the stage name.
    const trimmed = title.trim().replace(/[.$]/g, "_");
    if (!trimmed) return null;
    // Use trimmed title as the stage name (which is also the stage ID — names are IDs in this dashboard)
    markLocalWrite("customStages");
    setCustomStages(prev => ({
      ...prev,
      [INBOX_PIPELINE_ID]: [...(prev[INBOX_PIPELINE_ID] || []), trimmed],
    }));
    // Tag the Inbox task to a workspace so it's only visible to that workspace's
    // members (falls back to the default workspace when none is provided).
    const tagWs = workspaceId || DEFAULT_WORKSPACE_ID;
    markLocalWrite("inboxStageWorkspace");
    setInboxStageWorkspace(prev => ({ ...prev, [trimmed]: tagWs }));
    logActivity("create", trimmed, "added to inbox", ADMIN_IDS);
    // Push immediately — see addCustomStage rationale.
    flushImmediatelyRef.current = true;
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

  const addCustomPipeline = (form: { name: string; desc: string; icon: string; colorKey: string; priority: string }, workspaceId?: string): string | null => {
    if (!form.name.trim()) return null;
    const id = `custom-${Date.now()}`;
    const targetWorkspaceId = workspaceId || currentWorkspaceId;
    markLocalWrite("customPipelines");
    setCustomPipelines(prev => [...prev, { ...form, id, points: 0, stages: [] }]);
    if (targetWorkspaceId) {
      markLocalWrite("workspaces");
      setWorkspaces(prev => prev.map(w => w.id === targetWorkspaceId && !w.pipelineIds.includes(id) ? { ...w, pipelineIds: [...w.pipelineIds, id] } : w));
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
  const { sendChat, handleRemoteMessage, loadMoreMessages } = useChatHandlers({
    currentUser,
    currentWorkspaceId,
    users,
    chatMessages,
    hasMoreMessages,
    setChatMessages,
    setHasMoreMessages,
    setChatNotif,
    setSyncStatus,
    playNotifSound,
    showToast,
    tRed: t.red,
  });

  // ── Workspace handlers ────────────────────────────────────────────────────
  const { createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace } = useWorkspaceHandlers({
    currentUser,
    workspaces,
    setWorkspaces,
    markLocalWrite,
    logActivity,
    showToast,
    tAmber: t.amber,
    tGreen: t.green,
    tRed: t.red,
  });

  // ── Content handlers ──────────────────────────────────────────────────────
  const {
    addExecProposal,
    addReminder,
    dismissReminder,
    addNote,
    updateNote,
    deleteNote,
    addBug,
    updateBug,
    deleteBug,
    updateExecProposalStatus,
    applyExecProposal,
    cancelExecProposal,
    completeExecProposal,
    deleteExecProposal,
  } = useContentHandlers({
    currentUser,
    currentWorkspaceId,
    users,
    execProposals,
    reminders,
    notes,
    bugs,
    setExecProposals,
    setReminders,
    setNotes,
    setBugs,
    setOwners,
    setArchivedStages,
    setArchivedSubtasks,
    setStageNameOverrides,
    setStageDescOverrides,
    setStageDueDates,
    setSubtasks,
    setSubtaskDescOverrides,
    setSubtaskDueDates,
    markLocalWrite,
    flushNow: () => writeNowRef.current?.(),
    logActivity,
    showToast,
    tAmber: t.amber,
    tGreen: t.green,
  });



  // ── Timeline handlers ───────────────────────────────────────────────────
  const addTimelineEvent = useCallback((input: { title: string; group: string; status: TimelineEventStatus; tier?: TimelineEventTier; date?: string; label?: string; notes?: string; responsibleId?: string; url?: string }) => {
    if (!currentUser) return;
    const title = input.title.trim();
    if (!title) {
      showToast("// timeline event needs a title", t.amber);
      return;
    }
    const now = Date.now();
    const event: TimelineEvent = {
      id: now,
      title: title.slice(0, 160),
      group: (input.group.trim() || "General").slice(0, 80),
      status: input.status,
      tier: input.tier || "core",
      date: input.date || undefined,
      label: input.label?.trim().slice(0, 80) || undefined,
      notes: input.notes?.trim().slice(0, 1200) || undefined,
      responsibleId: input.responsibleId || undefined,
      url: input.url?.trim().slice(0, 500) || undefined,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
    };
    protectLocalSlice("timelineEvents");
    setTimelineEvents(prev => [event, ...prev].slice(0, 300));
    patchState({ timelineEvents: [event] }).then(result => {
      if (!result.ok) {
        setSyncStatus("offline");
        showToast(`// timeline save failed: ${result.error}`, t.amber);
      } else {
        protectLocalSlice("timelineEvents");
      }
    });
    showToast("// timeline event added", t.green);
  }, [currentUser, protectLocalSlice, setSyncStatus, showToast, t.amber, t.green]);

  const updateTimelineEvent = useCallback((id: number, patch: Partial<Pick<TimelineEvent, "title" | "group" | "status" | "tier" | "date" | "label" | "notes" | "responsibleId" | "url">>) => {
    const existing = timelineEvents.find(event => event.id === id);
    if (!existing) return;
    const updated: TimelineEvent = {
      ...existing,
      ...patch,
      title: patch.title !== undefined ? patch.title.trim().slice(0, 160) : existing.title,
      group: patch.group !== undefined ? (patch.group.trim() || "General").slice(0, 80) : existing.group,
      label: patch.label !== undefined ? (patch.label.trim().slice(0, 80) || undefined) : existing.label,
      notes: patch.notes !== undefined ? (patch.notes.trim().slice(0, 1200) || undefined) : existing.notes,
      date: patch.date !== undefined ? (patch.date || undefined) : existing.date,
      responsibleId: patch.responsibleId !== undefined ? (patch.responsibleId || undefined) : existing.responsibleId,
      url: patch.url !== undefined ? (patch.url.trim().slice(0, 500) || undefined) : existing.url,
      updatedAt: Date.now(),
    };
    protectLocalSlice("timelineEvents");
    setTimelineEvents(prev => prev.map(event => event.id === id ? updated : event));
    patchState({ timelineEvents: [updated] }).then(result => {
      if (!result.ok) {
        setSyncStatus("offline");
        showToast(`// timeline save failed: ${result.error}`, t.amber);
      } else {
        protectLocalSlice("timelineEvents");
      }
    });
  }, [protectLocalSlice, setSyncStatus, showToast, t.amber, timelineEvents]);

  const deleteTimelineEvent = useCallback((id: number) => {
    protectLocalSlice("timelineEvents");
    setTimelineEvents(prev => prev.filter(event => event.id !== id));
    patchState({ _deletes: { timelineEvents: [String(id)] } }).then(result => {
      if (!result.ok) {
        setSyncStatus("offline");
        showToast(`// timeline delete failed: ${result.error}`, t.amber);
      } else {
        protectLocalSlice("timelineEvents");
      }
    });
  }, [protectLocalSlice, setSyncStatus, showToast, t.amber]);

  // ── Useful links handlers ───────────────────────────────────────────────
  const addUsefulLink = useCallback((input: Omit<UsefulLinkItem, "id" | "createdBy" | "createdAt" | "updatedAt">) => {
    if (!currentUser) return;
    const title = input.title.trim();
    const href = input.href.trim();
    if (!title || !href) {
      showToast("// link needs a title and URL", t.amber);
      return;
    }
    const now = Date.now();
    const item: UsefulLinkItem = {
      id: now,
      group: (input.group.trim() || "Tools").slice(0, 80),
      eyebrow: (input.eyebrow.trim() || "Internal operations").slice(0, 80),
      title: title.slice(0, 120),
      label: input.label?.trim().slice(0, 80) || undefined,
      href: href.slice(0, 1000),
      icon: (input.icon || "link") as UsefulLinkIcon,
      badge: input.badge?.trim().slice(0, 40) || undefined,
      description: input.description?.trim().slice(0, 500) || undefined,
      credentials: input.credentials && (input.credentials.username || input.credentials.email || input.credentials.password)
        ? {
            username: input.credentials.username?.trim().slice(0, 120) || undefined,
            email: input.credentials.email?.trim().slice(0, 180) || undefined,
            password: input.credentials.password?.slice(0, 240) || undefined,
          }
        : undefined,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
    };
    markLocalWrite("usefulLinks");
    setUsefulLinks(prev => [item, ...prev].slice(0, 160));
    showToast("// useful link added", t.green);
  }, [currentUser, markLocalWrite, showToast, t.amber, t.green]);

  const updateUsefulLink = useCallback((id: number, patch: Partial<Pick<UsefulLinkItem, "group" | "eyebrow" | "title" | "label" | "href" | "icon" | "badge" | "description" | "credentials">>) => {
    markLocalWrite("usefulLinks");
    setUsefulLinks(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        ...patch,
        group: patch.group !== undefined ? (patch.group.trim() || "Tools").slice(0, 80) : item.group,
        eyebrow: patch.eyebrow !== undefined ? (patch.eyebrow.trim() || "Internal operations").slice(0, 80) : item.eyebrow,
        title: patch.title !== undefined ? (patch.title.trim() || "Untitled link").slice(0, 120) : item.title,
        label: patch.label !== undefined ? (patch.label.trim().slice(0, 80) || undefined) : item.label,
        href: patch.href !== undefined ? patch.href.trim().slice(0, 1000) : item.href,
        badge: patch.badge !== undefined ? (patch.badge.trim().slice(0, 40) || undefined) : item.badge,
        description: patch.description !== undefined ? (patch.description.trim().slice(0, 500) || undefined) : item.description,
        credentials: patch.credentials !== undefined && (patch.credentials.username || patch.credentials.email || patch.credentials.password)
          ? {
              username: patch.credentials.username?.trim().slice(0, 120) || undefined,
              email: patch.credentials.email?.trim().slice(0, 180) || undefined,
              password: patch.credentials.password?.slice(0, 240) || undefined,
            }
          : patch.credentials === undefined ? item.credentials : undefined,
        updatedAt: Date.now(),
      };
    }));
    showToast("// useful link updated", t.green);
  }, [markLocalWrite, showToast, t.green]);

  const deleteUsefulLink = useCallback((id: number) => {
    markLocalWrite("usefulLinks");
    setUsefulLinks(prev => prev.filter(item => item.id !== id));
  }, [markLocalWrite]);

  // ── Database (Notion-style tables) handlers ───────────────────────────────
  const createDatabase = useCallback((workspaceId: string, name: string, icon: string) => {
    if (!currentUser) return;
    const now = Date.now();
    const db: WorkspaceDb = {
      id: now,
      workspaceId,
      name: name.trim() || "Untitled",
      icon: icon || "🗃️",
      columns: [],
      rows: [],
      views: [
        { id: "view_all", name: "All rows" },
        { id: "view_status", name: "By Status", filterCol: "__status__", filterVal: "" },
        { id: "view_date", name: "by Date", filterCol: "__date__", filterVal: "" },
      ],
      createdAt: now,
      createdBy: currentUser,
    };
    markLocalWrite("databases");
    flushImmediatelyRef.current = true; // discrete action — persist now, don't risk a quick reload
    setDatabases(prev => [db, ...prev]);
  }, [currentUser, markLocalWrite]);

  const updateDatabase = useCallback((id: number, patch: Partial<Pick<WorkspaceDb, "name" | "icon" | "columns" | "rows" | "views">>) => {
    markLocalWrite("databases");
    setDatabases(prev => prev.map(db => db.id === id ? { ...db, ...patch } : db));
  }, [markLocalWrite]);

  const deleteDatabase = useCallback((id: number) => {
    markLocalWrite("databases");
    flushImmediatelyRef.current = true;
    setDatabases(prev => prev.filter(db => db.id !== id));
  }, [markLocalWrite]);

  const addDbRow = useCallback((dbId: number, values: Record<string, string> = {}) => {
    if (!currentUser) return;
    const row: import("@/lib/data").DbRow = {
      id: Date.now(),
      values,
      createdBy: currentUser,
      createdAt: Date.now(),
    };
    markLocalWrite("databases");
    flushImmediatelyRef.current = true; // adding a row is discrete — persist now
    setDatabases(prev => prev.map(db => db.id === dbId ? { ...db, rows: [...db.rows, row] } : db));
  }, [currentUser, markLocalWrite]);

  const updateDbRow = useCallback((dbId: number, rowId: number, values: Record<string, string>) => {
    markLocalWrite("databases");
    setDatabases(prev => prev.map(db => {
      if (db.id !== dbId) return db;
      return { ...db, rows: db.rows.map(r => r.id === rowId ? { ...r, values: { ...r.values, ...values } } : r) };
    }));
  }, [markLocalWrite]);

  const deleteDbRow = useCallback((dbId: number, rowId: number) => {
    markLocalWrite("databases");
    flushImmediatelyRef.current = true; // deleting a row is discrete — persist now
    setDatabases(prev => prev.map(db => {
      if (db.id !== dbId) return db;
      return { ...db, rows: db.rows.filter(r => r.id !== rowId) };
    }));
  }, [markLocalWrite]);

  const addDbColumn = useCallback((dbId: number, col: Omit<DbColumn, "id">) => {
    const id = `col_${Date.now()}`;
    markLocalWrite("databases");
    flushImmediatelyRef.current = true; // adding a column is discrete — persist now
    setDatabases(prev => prev.map(db => {
      if (db.id !== dbId) return db;
      return { ...db, columns: [...db.columns, { ...col, id }] };
    }));
  }, [markLocalWrite]);

  // ── Notification read/dismiss handlers ───────────────────────────────────
  // markAllNotifsRead stamps "now" against the current user — items in the
  // updates feed with time > stamp count as unread. dismissNotif appends a
  // single id; dismissals never expire so the user only sees an item again if
  // its underlying state changes (action-required) or a new event arrives
  // (updates).
  const markAllNotifsRead = useCallback((ids?: string[]) => {
    if (!currentUser) return;
    const stamp = Date.now();
    markLocalWrite("notifReads");
    markLocalWrite("notifReadIds");
    setNotifReads(prev => ({ ...prev, [currentUser]: stamp }));
    // Action-required items have time=0 (no trigger timestamp), so the cutoff
    // alone can't dim them. Adding their ids to the per-item read set does.
    // Items with real timestamps are read via the cutoff and don't need to be
    // tracked individually — keep the set bounded by passing only ids of items
    // that wouldn't otherwise be covered by the cutoff.
    if (ids && ids.length > 0) {
      setNotifReadIds(prev => {
        const merged = new Set([...(prev[currentUser] || []), ...ids]);
        return { ...prev, [currentUser]: Array.from(merged) };
      });
    } else {
      // No ids passed → reset the per-item set (cutoff handles everything).
      setNotifReadIds(prev => ({ ...prev, [currentUser]: [] }));
    }
  }, [currentUser, markLocalWrite]);

  // Mark a single notification read without dismissing it. Triggered by clicking
  // the row, the unread dot, or any other "I've seen this" affordance.
  const markNotifRead = useCallback((id: string) => {
    if (!currentUser) return;
    markLocalWrite("notifReadIds");
    setNotifReadIds(prev => {
      const existing = prev[currentUser] || [];
      if (existing.includes(id)) return prev;
      return { ...prev, [currentUser]: [...existing, id] };
    });
  }, [currentUser, markLocalWrite]);

  const dismissNotif = useCallback((id: string) => {
    if (!currentUser) return;
    markLocalWrite("notifDismissed");
    setNotifDismissed(prev => {
      const existing = prev[currentUser] || [];
      if (existing.includes(id)) return prev;
      return { ...prev, [currentUser]: [...existing, id] };
    });
  }, [currentUser, markLocalWrite]);

  const workspaceUsers = useMemo(() => {
    if (!currentWorkspaceId) return users;
    const ws = workspaces.find(w => w.id === currentWorkspaceId);
    if (!ws) return users;
    return users.filter(u => ws.members.includes(u.id));
  }, [users, workspaces, currentWorkspaceId]);

  const value: ModelContextValue = {
    users, workspaceUsers, setUsers, currentUser, setCurrentUser, me,
    streakByUser,
    owners,
    claims, reactions, comments, subtasks, assignments, ownership,
    commentReactions, handleCommentReact,
    notifReads, notifDismissed, notifReadIds, markAllNotifsRead, markNotifRead, dismissNotif,
    pendingNewComments, flushPendingComments,
    stageStatusOverrides, approvedStages, approvedSubtasks, approvedPipelines, stageDescOverrides, stageDueDates, setStageDueDate, stagePriorities, setStagePriority, inboxStageWorkspace, stageNameOverrides,
    stagePointsOverride, setStagePointsOverride,
    subtaskStages, subtaskDescOverrides, setSubtaskDescOverride, subtaskDueDates, setSubtaskDueDate, pipeDescOverrides, setPipeDescOverrides: persistPipeDescOverrides, pipeMetaOverrides, setPipeMetaOverrides: persistPipeMetaOverrides,
    customStages, customPipelines, workspaces, setWorkspaces, activityLog,
    reminders, addReminder, dismissReminder,
    timelineEvents, addTimelineEvent, updateTimelineEvent, deleteTimelineEvent,
    notes, addNote, updateNote, deleteNote,
    bugs, addBug, updateBug, deleteBug,
    usefulLinks, addUsefulLink, updateUsefulLink, deleteUsefulLink,
    execProposals, addExecProposal, requestWorkChange, updateExecProposalStatus, applyExecProposal, cancelExecProposal, completeExecProposal, deleteExecProposal,
    archivedStages, archivedPipelines, archivedSubtasks, archived, stageImages,
    chatMessages, setChatMessages, hasMoreMessages, chatNotif, setChatNotif, liveNotifs,
    syncStatus,
    getStatus, getPoints, sc, ck, pr,
    allPipelinesGlobal,
    handleClaim, handleReact, addComment, deleteComment, editComment, addSubtask, toggleSubtask, renameSubtask,
    lockSubtask, removeSubtask, setSubtaskPoints,
    archiveStage, restoreStage, archivePipeline, restorePipeline, archiveSubtask, restoreSubtask,
    setStageDescOverride, setStageNameOverride, setSubtaskStage, getSubtaskStatus, cycleSubtaskStatus, assignTask,
    setStageStatusDirect, cycleStatus, approveStage, approveSubtask,
    addCustomStage, addCustomPipeline, addUnparentedStage, moveStageToPipeline, cyclePriority,
    addStageImage, removeStageImage, sendChat, handleRemoteMessage, loadMoreMessages, logActivity,
    migrateSubtask,
    createWorkspace, addMemberToWorkspace, removeMemberFromWorkspace, setMemberRank, deleteWorkspace,
    isOfficerOfWorkspace,
    pinCallSeries,
    unpinCallSeries,
    setWorkspaceCallsLabel,
    updateWorkspaceHiddenTabs,
    currentWorkspaceId,
    databases,
    createDatabase,
    updateDatabase,
    deleteDatabase,
    addDbRow,
    updateDbRow,
    deleteDbRow,
    addDbColumn,
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
