"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { T } from "@/lib/themes";
import { type UserType, type Workspace, ADMIN_IDS } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";
import UserPopup from "@/components/ui/UserPopup";
import { useModel } from "@/lib/contexts/ModelContext";
import { SubtaskKey } from "@/lib/subtaskKey";

const TasksView = dynamic(() => import("@/components/TasksView"), { ssr: false });

interface Pipeline { id: string; name: string; icon: string; colorKey: string; stages: string[]; }
type AttentionTone = "accent" | "green" | "amber" | "red" | "cyan";
type ZoomStatus = {
  configured: boolean;
  connected: boolean;
  mode: "server_to_server";
  missing: string[];
  tokenStatus: number | null;
  tokenError: string | null;
  scopes: string;
  expiresIn: number | null;
};
type ZoomRecordingsStatus = {
  ok: boolean;
  totalRecords?: number;
  meetings?: Array<{ topic: string; startTime?: string; transcriptCount: number; fileCount: number }>;
  message?: string;
};

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function timeAgoFrom(now: number, timestamp: number): string {
  const diff = now - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function toneColor(t: T, tone: AttentionTone): string {
  if (tone === "green") return t.green;
  if (tone === "amber") return t.amber;
  if (tone === "red") return t.red;
  if (tone === "cyan") return t.cyan || t.accent;
  return t.accent;
}

function AttentionOverview({ t, attention }: {
  t: T;
  attention: {
    roleLabel: string;
    scopeLabel: string;
    summary: string;
    stats: Array<{ label: string; value: number; tone: AttentionTone }>;
    actions: Array<{ title: string; meta: string; body: string; tone: AttentionTone }>;
    people: Array<{ user: UserType; title: string; meta: string; body: string; tone: AttentionTone }>;
  };
}) {
  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div>
          <div style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
            overview · {attention.roleLabel} · {attention.scopeLabel}
          </div>
          <div style={{ fontSize: 18, color: t.text, fontWeight: 800, marginTop: 4, lineHeight: 1.25 }}>
            {attention.summary}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          {attention.stats.map(stat => {
            const color = toneColor(t, stat.tone);
            return (
              <div key={stat.label} style={{ border: `1px solid ${color}44`, background: color + "0f", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
                <div style={{ fontSize: 22, color, fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                <div style={{ marginTop: 4, fontSize: 10, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {attention.people.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            {attention.people.map(person => {
              const color = toneColor(t, person.tone);
              return (
                <div key={person.user.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", border: `1px solid ${color}3d`, background: color + "0d", borderRadius: 10, minWidth: 0 }}>
                  <AvatarC user={person.user} size={24} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                      <span style={{ fontSize: 12, color: t.text, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.title}</span>
                      <span style={{ fontSize: 10, color, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}>{person.meta}</span>
                    </div>
                    <div style={{ fontSize: 10, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{person.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {attention.actions.length === 0 ? (
          <div style={{ minHeight: 132, border: `1px dashed ${t.border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: t.textDim, fontSize: 12, fontFamily: "var(--font-dm-mono), monospace" }}>
            no urgent signals
          </div>
        ) : attention.actions.map((item, idx) => {
          const color = toneColor(t, item.tone);
          return (
            <div key={`${item.title}-${idx}`} style={{ display: "grid", gridTemplateColumns: "8px minmax(0, 1fr)", gap: 10, alignItems: "stretch", background: idx === 0 ? color + "0f" : t.bgHover || t.bgSoft, border: `1px solid ${idx === 0 ? color + "44" : t.border}`, borderRadius: 10, padding: "9px 10px" }}>
              <div style={{ width: 8, borderRadius: 8, background: color }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 13, color: t.text, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  <div style={{ fontSize: 10, color, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}>{item.meta}</div>
                </div>
                <div style={{ marginTop: 2, fontSize: 11, color: t.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.body}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ZoomIntegrationPanel({ t, isAdmin }: { t: T; isAdmin: boolean }) {
  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recordings, setRecordings] = useState<ZoomRecordingsStatus | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    fetch("/api/zoom/status")
      .then(r => r.json())
      .then((data: ZoomStatus) => { if (alive) setStatus(data); })
      .catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [isAdmin]);

  if (!isAdmin) return null;
  const configured = status?.configured ?? false;
  const connected = status?.connected ?? false;
  const missing = status?.missing ?? [];
  const stateColor = connected ? t.green : configured ? t.amber : t.textDim;
  const checkZoom = async () => {
    if (!configured || checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/zoom/connect", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      setStatus(prev => ({
        configured: true,
        connected: res.ok,
        mode: "server_to_server",
        missing: [],
        tokenStatus: res.ok ? 200 : res.status,
        tokenError: res.ok ? null : data?.message || "Zoom token check failed",
        scopes: data?.scopes || prev?.scopes || "",
        expiresIn: data?.expiresIn ?? prev?.expiresIn ?? null,
      }));
    } finally {
      setChecking(false);
    }
  };
  const syncCalls = async () => {
    if (!connected || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/zoom/recordings", { cache: "no-store" });
      const data = await res.json().catch(() => null) as ZoomRecordingsStatus | null;
      setRecordings(data ? { ...data, ok: res.ok } : { ok: false, message: "Zoom call sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section style={{ marginBottom: 18, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, display: "grid", gridTemplateColumns: "minmax(240px, 0.8fr) minmax(280px, 1.2fr)", gap: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
          zoom intelligence
        </div>
        <div style={{ fontSize: 18, color: t.text, fontWeight: 850, marginTop: 4, lineHeight: 1.25 }}>
          call summaries and proposed tasks
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, lineHeight: 1.45 }}>
          Server-to-Server OAuth is configured backend-side. After calls are imported, summaries should become editable task proposals here for admin approval.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            disabled={!configured || checking}
            onClick={checkZoom}
            style={{
              background: configured ? t.accent : t.bgHover || t.bgSoft,
              border: `1px solid ${configured ? t.accent : t.border}`,
              borderRadius: 10,
              padding: "8px 12px",
              color: configured ? "#fff" : t.textDim,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: "var(--font-dm-mono), monospace",
              textDecoration: "none",
              cursor: configured && !checking ? "pointer" : "not-allowed",
            }}
          >
            {checking ? "checking..." : "check zoom"}
          </button>
          <span style={{ fontSize: 11, color: stateColor, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 800 }}>
            {connected ? "server token ok" : configured ? "credentials found" : "setup needed"}
          </span>
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: t.textMuted, lineHeight: 1.45 }}>
          To activate proposals, turn on Zoom cloud recording transcripts or AI Companion summaries for the account, then sync recent calls here.
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
        <div style={{ border: `1px solid ${t.border}`, background: t.bgHover || t.bgSoft, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, color: t.text, fontWeight: 850 }}>Task proposal queue</div>
            <button
              type="button"
              disabled={!connected || syncing}
              onClick={syncCalls}
              style={{
                border: `1px solid ${connected ? t.accent : t.border}`,
                background: connected ? t.bgCard : t.bgHover || t.bgSoft,
                color: connected ? t.accent : t.textDim,
                borderRadius: 8,
                padding: "6px 9px",
                fontSize: 10,
                fontWeight: 850,
                fontFamily: "var(--font-dm-mono), monospace",
                cursor: connected && !syncing ? "pointer" : "not-allowed",
              }}
            >
              {syncing ? "syncing..." : "sync latest calls"}
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted, lineHeight: 1.45 }}>
            No Zoom proposals yet. Once call import is enabled, this lane will show extracted tasks with edit, approve, and reject controls.
          </div>
          {recordings?.ok && (
            <div style={{ marginTop: 8, fontSize: 11, color: recordings.totalRecords ? t.green : t.amber, lineHeight: 1.45 }}>
              Found {recordings.totalRecords ?? 0} cloud recording{recordings.totalRecords === 1 ? "" : "s"} in the last 30 days.
              {(recordings.totalRecords ?? 0) === 0 ? " Record a Zoom meeting to the cloud with transcript/AI summary enabled, then sync again." : " Next step is turning these transcripts into editable task proposals."}
            </div>
          )}
          {recordings && !recordings.ok && (
            <div style={{ marginTop: 8, fontSize: 11, color: t.red, lineHeight: 1.45 }}>
              Call sync failed. {recordings.message || "Check Zoom recording scopes and account settings."}
            </div>
          )}
          {status?.tokenError && (
            <div style={{ marginTop: 8, fontSize: 11, color: t.red, lineHeight: 1.4 }}>
              Zoom token check failed{status.tokenStatus ? ` (${status.tokenStatus})` : ""}. Check the app credentials and scopes in Zoom Marketplace.
            </div>
          )}
          {status?.scopes && (
            <div style={{ marginTop: 8, fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              scopes: {status.scopes}
            </div>
          )}
        </div>
        {configured && !connected && !status?.tokenError && (
          <div style={{ border: `1px dashed ${t.amber}66`, background: t.amber + "0f", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 11, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 850 }}>
              server-to-server oauth
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted, lineHeight: 1.45 }}>
              No callback URL is needed for this Zoom app type. The backend will mint tokens directly from the account credentials.
            </div>
          </div>
        )}
        {!configured && (
          <div style={{ border: `1px dashed ${t.amber}66`, background: t.amber + "0f", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 11, color: t.amber, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 850 }}>
              missing env: {missing.length ? missing.join(", ") : "loading"}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: t.textMuted, lineHeight: 1.45 }}>
              Add these to Vercel for the Zoom Server-to-Server OAuth app. No redirect or callback URL is required.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface Props {
  t: T;
  me: UserType;
  users: UserType[];
  navbarSlot?: React.ReactNode;
  myWorkspaces: Workspace[];
  allPipelinesGlobal: Pipeline[];
  pipeMetaOverrides: Record<string, { name?: string; priority?: string }>;
  currentUser: string;
  isCaptainOfAny: boolean;
  currentWorkspaceId: string | null;
  onSwitchWorkspace: (id: string) => void;
  editMode?: boolean;
  onPipelineClick?: (pipelineId: string) => void;
  onUserClick?: (userId: string) => void;
  viewingUser?: string | null;
  setViewingUser?: (id: string | null) => void;
  onChangeAvatar?: (userId: string, avatar: string) => void;
}

export default function HomeView({
  t, me, users, myWorkspaces, allPipelinesGlobal, pipeMetaOverrides,
  currentUser, isCaptainOfAny, currentWorkspaceId, onSwitchWorkspace,
  editMode, onPipelineClick, onUserClick, navbarSlot,
  viewingUser, setViewingUser, onChangeAvatar,
}: Props) {
  const {
    claims, comments, approvedStages, approvedSubtasks, customStages, getPoints: modelGetPoints,
    owners, assignments, subtasks, subtaskStages, activityLog, chatMessages,
    getStatus, ck,
  } = useModel();

  // null = show all workspaces; string = filter to specific workspace
  const [homeWsFilter, setHomeWsFilter] = useState<string | null>(null);
  const [overviewNow] = useState(() => Date.now());

  // Build full pipeline→workspace map from ALL user's workspaces
  const pipelineWorkspaceMap = useMemo(() => {
    const m: Record<string, { id: string; name: string; icon: string }> = {};
    for (const w of myWorkspaces) {
      for (const pid of w.pipelineIds) {
        if (!m[pid]) m[pid] = { id: w.id, name: w.name, icon: w.icon };
      }
    }
    return m;
  }, [myWorkspaces]);

  // Pipelines visible based on homeWsFilter:
  // null = all pipelines linked to any of user's workspaces
  // set = only pipelines linked to that specific workspace
  const visiblePipelines = useMemo(() => {
    const ids = new Set<string>();
    if (homeWsFilter) {
      const ws = myWorkspaces.find(w => w.id === homeWsFilter);
      (ws?.pipelineIds || []).forEach(pid => ids.add(pid));
    } else {
      for (const w of myWorkspaces) for (const pid of w.pipelineIds) ids.add(pid);
    }
    // Also include pipelines that contain any stage/subtask the current user owns or is assigned to.
    // This guarantees the "mine" tab can never miss a user\'s items, even if a pipeline isn\'t
    // explicitly linked to one of their workspaces.
    if (currentUser) {
      const userInList = (key: string) =>
        (claims[key] || []).includes(currentUser) ||
        (assignments[key] || []).includes(currentUser) ||
        (owners[key] || []).includes(currentUser);
      for (const p of allPipelinesGlobal) {
        if (ids.has(p.id)) continue;
        const allStagesInPipe = [...p.stages, ...(customStages[p.id] || [])];
        const hasOwnedStage = allStagesInPipe.some(userInList);
        const hasOwnedSubtask = !hasOwnedStage && allStagesInPipe.some(s =>
          (subtasks[s] || []).some(sub => userInList(`${s}::${sub.id}`))
        );
        if (hasOwnedStage || hasOwnedSubtask) ids.add(p.id);
      }
    }
    return allPipelinesGlobal.filter(p => ids.has(p.id));
  }, [myWorkspaces, allPipelinesGlobal, homeWsFilter, currentUser, claims, assignments, owners, customStages, subtasks]);

  const greeting = `gm, ${me.name.toLowerCase()} 🫡`;
  const attention = useMemo(() => {
    const dayAgo = overviewNow - 24 * 60 * 60 * 1000;
    const visiblePipelineIds = new Set(visiblePipelines.map(p => p.id));
    const visibleStageIds = new Set<string>();
    const stageToPipeline = new Map<string, Pipeline>();
    for (const p of visiblePipelines) {
      for (const stage of [...p.stages, ...(customStages[p.id] || [])]) {
        visibleStageIds.add(stage);
        stageToPipeline.set(stage, p);
      }
    }

    const itemOwnerIds = (key: string) => Array.from(new Set([
      ...(claims[key] || []),
      ...(owners[key] || []),
      ...(assignments[key] || []),
    ]));
    const isRoot = ADMIN_IDS.includes(currentUser);
    const scopedWorkspaces = homeWsFilter
      ? myWorkspaces.filter(w => w.id === homeWsFilter)
      : myWorkspaces;
    const isOperatorScope = isRoot || scopedWorkspaces.some(w => w.captains.includes(currentUser));
    const roleLabel = isRoot ? "root" : isOperatorScope ? "operator" : "agent";

    const stageItems = Array.from(visibleStageIds).map(stageId => {
      const pipeline = stageToPipeline.get(stageId);
      const priority = pipeline ? pipeMetaOverrides[pipeline.id]?.priority : undefined;
      return {
        key: stageId,
        title: stageNameLabel(stageId),
        pipelineName: pipeline ? ((pipeline as { displayName?: string }).displayName || pipeline.name) : "Inbox",
        pipelineId: pipeline?.id || "",
        status: getStatus(stageId),
        owners: itemOwnerIds(stageId),
        priority,
        kind: "task" as const,
        approved: approvedStages.includes(stageId),
      };
    });
    const subtaskItems = Object.entries(subtasks || {}).flatMap(([parentStageId, list]) => {
      if (!visibleStageIds.has(parentStageId)) return [];
      const parent = stageToPipeline.get(parentStageId);
      return list.map(sub => {
        const key = `${parentStageId}::${sub.id}`;
        return {
          key,
          title: sub.text,
          pipelineName: parent ? ((parent as { displayName?: string }).displayName || parent.name) : "Inbox",
          pipelineId: parent?.id || "",
          status: subtaskStages[key] || "planned",
          owners: itemOwnerIds(key),
          priority: parent ? pipeMetaOverrides[parent.id]?.priority : undefined,
          kind: "subtask" as const,
          approved: approvedSubtasks.includes(key),
          done: sub.done,
        };
      });
    });
    const allItems = [...stageItems, ...subtaskItems].filter(item => item.pipelineId === "" || visiblePipelineIds.has(item.pipelineId));
    const myItems = allItems.filter(item => item.owners.includes(currentUser));
    const freshActivity = activityLog.filter(a => a.time > dayAgo && a.user !== currentUser);
    const scopedMemberIds = new Set(scopedWorkspaces.flatMap(w => w.members));
    const scopedUsers = users.filter(u => scopedMemberIds.has(u.id));
    const newOwned = freshActivity.filter(a => myItems.some(item => item.key === a.target)).slice(0, 6);
    const reviewItems = allItems.filter(item =>
      (item.kind === "task" && item.status === "active" && !item.approved) ||
      (item.kind === "subtask" && item.done && !item.approved)
    );
    const blockedItems = allItems.filter(item => item.status === "blocked");
    const hotItems = allItems.filter(item =>
      (item.priority === "NOW" || item.priority === "HIGH") &&
      item.status !== "active" &&
      item.status !== "blocked"
    );
    const unownedItems = allItems.filter(item => item.owners.length === 0 && item.status !== "active");
    const firstName = me.name.split(" ")[0].toLowerCase();
    const mentionNeedles = [`@${firstName}`, `@${currentUser.toLowerCase()}`];
    const mentions = Object.entries(comments || {}).flatMap(([target, list]) =>
      list
        .filter(c => c.by !== currentUser && mentionNeedles.some(n => c.text.toLowerCase().includes(n)))
        .map(c => ({
          target,
          text: c.text,
          by: c.by,
          title: stageNameLabel(target),
        }))
    ).slice(-5).reverse();
    const mineBlocked = blockedItems.filter(item => item.owners.includes(currentUser));
    const mineHot = hotItems.filter(item => item.owners.includes(currentUser));
    const minePlanned = myItems.filter(item => item.status === "planned" || item.status === "concept");
    const chatMentions = (chatMessages || [])
      .filter(msg => msg.userId !== currentUser && mentionNeedles.some(n => msg.text.toLowerCase().includes(n)))
      .slice(-4)
      .reverse();
    const activeUpdates = freshActivity
      .filter(a => a.type === "status_change" && /active|in progress|→ active/i.test(a.detail))
      .slice(0, 4);
    const people = roleLabel === "agent" ? [] : scopedUsers
      .filter(u => u.id !== currentUser)
      .map(u => {
        const openItems = allItems.filter(item => item.owners.includes(u.id) && item.status !== "active");
        const userActivity = activityLog.filter(a => a.user === u.id);
        const userComments = Object.entries(comments || {}).flatMap(([target, list]) =>
          list.filter(c => c.by === u.id).map(c => ({ target, text: c.text }))
        );
        const userChat = (chatMessages || []).filter(m => m.userId === u.id);
        const lastActivity = Math.max(
          0,
          ...userActivity.map(a => a.time),
          ...userChat.map(m => m.id),
        );
        const recentActive = userActivity
          .filter(a => a.time > dayAgo && a.type === "status_change" && /active|in progress|→ active/i.test(a.detail))
          .slice(0, 1)[0];
        const recentComment = userComments.slice(-1)[0];
        const stale = openItems.length > 0 && (!lastActivity || overviewNow - lastActivity > 48 * 60 * 60 * 1000);
        const title = u.name.split(" ")[0];
        if (stale) {
          return {
            user: u,
            title,
            meta: lastActivity ? `${timeAgoFrom(overviewNow, lastActivity)} quiet` : "no updates",
            body: `${openItems.length} open item${openItems.length === 1 ? "" : "s"} without recent movement`,
            tone: "amber" as AttentionTone,
          };
        }
        if (recentActive) {
          return {
            user: u,
            title,
            meta: "in progress",
            body: `${stageNameLabel(recentActive.target)} moved forward`,
            tone: "green" as AttentionTone,
          };
        }
        return {
          user: u,
          title,
          meta: lastActivity ? timeAgoFrom(overviewNow, lastActivity) : "quiet",
          body: recentComment ? truncate(recentComment.text, 70) : `${openItems.length} open item${openItems.length === 1 ? "" : "s"}`,
          tone: openItems.length > 0 ? "cyan" as AttentionTone : "accent" as AttentionTone,
        };
      })
      .sort((a, b) => {
        const priority = { amber: 0, green: 1, cyan: 2, accent: 3, red: 4 } as Record<AttentionTone, number>;
        return priority[a.tone] - priority[b.tone];
      })
      .slice(0, 6);

    const stats = roleLabel === "agent"
      ? [
          { label: "your open work", value: minePlanned.length, tone: "accent" as AttentionTone },
          { label: "mentions", value: mentions.length, tone: "amber" as AttentionTone },
          { label: "blocked by you", value: mineBlocked.length, tone: "red" as AttentionTone },
          { label: "hot priorities", value: mineHot.length, tone: "green" as AttentionTone },
        ]
      : roleLabel === "operator"
        ? [
            { label: "needs approval", value: reviewItems.length, tone: "green" as AttentionTone },
            { label: "blocked", value: blockedItems.length, tone: "red" as AttentionTone },
            { label: "unowned work", value: unownedItems.length, tone: "amber" as AttentionTone },
            { label: "new activity", value: freshActivity.length, tone: "cyan" as AttentionTone },
          ]
        : [
            { label: "approval queue", value: reviewItems.length, tone: "green" as AttentionTone },
            { label: "blocked across org", value: blockedItems.length, tone: "red" as AttentionTone },
            { label: "unowned", value: unownedItems.length, tone: "amber" as AttentionTone },
            { label: "mentions", value: mentions.length, tone: "accent" as AttentionTone },
          ];

    const actions = roleLabel === "agent"
      ? [
          ...mentions.map(m => ({ tone: "amber" as AttentionTone, title: `${commentUserLabel(m.by)} mentioned you`, meta: m.title, body: truncate(m.text, 92) })),
          ...chatMentions.map(m => ({ tone: "amber" as AttentionTone, title: `${commentUserLabel(m.userId)} messaged you`, meta: "chat", body: truncate(m.text, 92) })),
          ...mineBlocked.slice(0, 3).map(item => ({ tone: "red" as AttentionTone, title: item.title, meta: "blocked", body: item.pipelineName })),
          ...mineHot.slice(0, 3).map(item => ({ tone: "green" as AttentionTone, title: item.title, meta: `${item.priority} priority`, body: item.pipelineName })),
          ...newOwned.slice(0, 2).map(a => ({ tone: "cyan" as AttentionTone, title: a.detail, meta: timeAgo(a.time), body: stageNameLabel(a.target) })),
        ]
      : [
          ...chatMentions.map(m => ({ tone: "amber" as AttentionTone, title: `${commentUserLabel(m.userId)} messaged you`, meta: "chat", body: truncate(m.text, 92) })),
          ...activeUpdates.map(a => ({ tone: "green" as AttentionTone, title: `${commentUserLabel(a.user)} marked work in progress`, meta: timeAgoFrom(overviewNow, a.time), body: stageNameLabel(a.target) })),
          ...reviewItems.slice(0, 4).map(item => ({ tone: "green" as AttentionTone, title: item.title, meta: "ready for review", body: item.pipelineName })),
          ...blockedItems.slice(0, 3).map(item => ({ tone: "red" as AttentionTone, title: item.title, meta: "blocked", body: item.pipelineName })),
          ...unownedItems.slice(0, 3).map(item => ({ tone: "amber" as AttentionTone, title: item.title, meta: "no owner", body: item.pipelineName })),
          ...mentions.slice(0, 2).map(m => ({ tone: "accent" as AttentionTone, title: `${commentUserLabel(m.by)} mentioned you`, meta: m.title, body: truncate(m.text, 92) })),
        ];

    const topAction = actions[0];
    const summary = topAction
      ? topAction.title
      : roleLabel === "agent"
        ? "clear lane: no urgent personal items"
        : "clear lane: no urgent team items";

    function stageNameLabel(key: string) {
      if (SubtaskKey.isValid(key)) {
        const parsed = SubtaskKey.parse(key as Parameters<typeof SubtaskKey.parse>[0]);
        if (parsed) {
          const sub = (subtasks[parsed.parentStageId] || []).find(s => s.id === parsed.subtaskId);
          return sub?.text || key;
        }
      }
      return key;
    }
    function commentUserLabel(id: string) {
      return users.find(u => u.id === id)?.name.split(" ")[0] || id;
    }

    return {
      roleLabel,
      stats,
      actions: actions.slice(0, 6),
      people,
      summary,
      scopeLabel: homeWsFilter ? (myWorkspaces.find(w => w.id === homeWsFilter)?.name || "workspace") : "all workspaces",
    };
  }, [
    activityLog, approvedStages, approvedSubtasks, assignments, chatMessages, claims, comments, currentUser,
    customStages, getStatus, homeWsFilter, me.name, myWorkspaces, owners, overviewNow, pipeMetaOverrides,
    subtaskStages, subtasks, users, visiblePipelines,
  ]);

  return (
    <div>
      {/* Greeting + navbar on same line */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, letterSpacing: -0.5, lineHeight: 1.15 }}>{greeting}</div>
        {navbarSlot && <div style={{ flexShrink: 0 }}>{navbarSlot}</div>}
      </div>

      {/* Optimized workspace header */}
      {myWorkspaces.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          {/* Workspace switcher row — "All" tab + per-workspace tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {/* "All" tab — selected when no workspace filter is active */}
            {(() => {
              const isAllActive = homeWsFilter === null;
              return (
                <button
                  key="__all__"
                  onClick={() => setHomeWsFilter(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isAllActive ? t.accent + "18" : "transparent",
                    border: isAllActive ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: isAllActive ? t.accent : t.textMuted,
                    fontSize: 12,
                    fontWeight: isAllActive ? 700 : 600,
                    fontFamily: "var(--font-dm-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isAllActive) el.style.color = t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isAllActive) el.style.color = t.textMuted;
                  }}
                >
                  <span style={{ fontSize: 14 }}>🌐</span>
                  <span>All</span>
                </button>
              );
            })()}
            {myWorkspaces.map(w => {
              const isActive = w.id === homeWsFilter;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    const next = homeWsFilter === w.id ? null : w.id;
                    setHomeWsFilter(next);
                    if (next) onSwitchWorkspace(next);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: isActive ? t.accent + "18" : "transparent",
                    border: isActive ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    color: isActive ? t.accent : t.textMuted,
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 600,
                    fontFamily: "var(--font-dm-mono), monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isActive) el.style.color = t.text;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!isActive) el.style.color = t.textMuted;
                  }}
                >
                  <span style={{ fontSize: 14 }}>{w.icon}</span>
                  <span>{w.name}</span>
                </button>
              );
            })}
          </div>

          <AttentionOverview t={t} attention={attention} />
          <ZoomIntegrationPanel t={t} isAdmin={attention.roleLabel !== "agent"} />

          {/* Summary card — shows aggregate "all" view when no workspace selected, or specific workspace when one is */}
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                // "All" mode: aggregate across every workspace the user is in
                if (homeWsFilter === null) {
                  const allPipelineIds = new Set<string>();
                  for (const w of myWorkspaces) for (const pid of w.pipelineIds) allPipelineIds.add(pid);
                  const allPipelines = allPipelinesGlobal.filter(p => allPipelineIds.has(p.id));
                  const totalStages = allPipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                  const allMemberIds = new Set<string>();
                  for (const w of myWorkspaces) for (const m of w.members) allMemberIds.add(m);
                  const allTeamMembers = users.filter(u => allMemberIds.has(u.id));
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>🌐</div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>All workspaces</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.accent }}>◆ {myWorkspaces.length} workspaces</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.green }}>● {allPipelines.length} pipelines</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.cyan || t.accent }}>• {totalStages} stages</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
                          team ({allTeamMembers.length})
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {allTeamMembers.map(u => {
                            const uPts = modelGetPoints(u.id);
                            const isMe = u.id === currentUser;
                            return (
                              <div key={u.id} style={{ position: "relative" }}>
                                <button
                                  type="button"
                                  data-testid="team-avatar"
                                  onClick={e => { e.stopPropagation(); onUserClick?.(u.id); }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.borderColor = u.color + "88"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = isMe ? t.accent + "44" : t.border; }}
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, border-color 0.15s" }}
                                >
                                  <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                    <AvatarC user={u} size={24} />
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{u.name.split(" ")[0]}</div>
                                    <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                                  </div>
                                </button>
                                {viewingUser === u.id && setViewingUser && (
                                  <UserPopup user={u} onClose={() => setViewingUser(null)} onChangeAvatar={onChangeAvatar} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                }

                // Specific workspace selected
                const activeWs = myWorkspaces.find(w => w.id === homeWsFilter);
                if (!activeWs) return null;
                const activePipelines = allPipelinesGlobal.filter(p => activeWs.pipelineIds.includes(p.id));
                const totalStages = activePipelines.reduce((sum, p) => sum + p.stages.length + (customStages[p.id]?.length || 0), 0);
                const wsMembers = activeWs.members;
                const wsTeamMembers = users.filter(u => wsMembers.includes(u.id));

                return (
                  <>
                    {/* Header: icon, name, stats */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, justifyContent: "space-between", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ fontSize: 32, lineHeight: 1 }}>{activeWs.icon}</div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: t.text, lineHeight: 1.2, marginBottom: 4 }}>{activeWs.name}</div>
                          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", display: "flex", gap: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.green }}>● {activePipelines.length} pipelines</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, color: t.cyan || t.accent }}>• {totalStages} stages</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team members section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "var(--font-dm-mono), monospace" }}>
                        team ({wsTeamMembers.length})
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {wsTeamMembers.map((u) => {
                          const uPts = modelGetPoints(u.id);
                          const isMe = u.id === currentUser;
                          const role: "root" | "operator" | null =
                            ADMIN_IDS.includes(u.id) ? "root"
                            : activeWs.captains.includes(u.id) ? "operator"
                            : null;
                          return (
                            <div key={u.id} style={{ position: "relative" }}>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onUserClick?.(u.id); }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.borderColor = u.color + "88"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.borderColor = isMe ? t.accent + "44" : t.border; }}
                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: isMe ? t.accent + "11" : t.bgHover, borderRadius: 10, border: isMe ? `1px solid ${t.accent}44` : `1px solid ${t.border}`, cursor: "pointer", fontFamily: "inherit", transition: "transform 0.15s, border-color 0.15s" }}
                              >
                                <div style={{ borderRadius: "50%", padding: isMe ? 2 : 0, background: isMe ? `linear-gradient(135deg,${u.color},${u.color}88)` : "transparent", flexShrink: 0 }}>
                                  <AvatarC user={u} size={24} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: t.text, display: "flex", gap: 6, alignItems: "center" }}>
                                    {u.name.split(" ")[0]}
                                    {role && <span style={{ fontSize: 11, color: t.text, fontWeight: 800 }} title={role}>{role === "root" ? "🔑" : "⚡"}</span>}
                                  </div>
                                  <div style={{ fontSize: 10, color: uPts > 0 ? t.accent : t.textDim, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 600 }}>{uPts}pts</div>
                                </div>
                              </button>
                              {viewingUser === u.id && setViewingUser && (
                                <UserPopup user={u} onClose={() => setViewingUser(null)} onChangeAvatar={onChangeAvatar} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
        </div>
      )}

      <TasksView
        t={t}
        allPipelines={visiblePipelines}
        customStages={customStages}
        pipeMetaOverrides={pipeMetaOverrides}
        getStatus={getStatus}
        users={users}
        currentUser={currentUser}
        isAdmin={isCaptainOfAny}
        ck={ck}
        showMyAllFilter={true}
        defaultMyAllFilter={isCaptainOfAny ? "all" : "my"}
        pipelineWorkspaceMap={pipelineWorkspaceMap}
        headerLabel="🏠 home"
        editMode={editMode}
        onPipelineClick={onPipelineClick}
        currentWorkspaceId={homeWsFilter}
        availableWorkspaces={myWorkspaces.map(w => ({ id: w.id, name: w.name, icon: w.icon, pipelineIds: w.pipelineIds }))}
      />
    </div>
  );
}
