"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ActivitySkeleton } from "@/components/ui/Skeletons";
import dynamic from "next/dynamic";
import { ADMIN_IDS, type ActivityItem, type UserType } from "@/lib/data";
import { SubtaskKey } from "@/lib/subtaskKey";

const ActivityFeed = dynamic(() => import("@/components/ActivityFeed"), { ssr: false });

type CenterTab = "inbox" | "reminders" | "mentions" | "requests" | "due" | "approvals" | "assignments" | "bugs" | "activity";
type InAppPrefs = {
  inAppNotifications: boolean;
  inAppMention: boolean;
  inAppApproved: boolean;
  inAppAssigned: boolean;
  inAppReminder: boolean;
  inAppRequest: boolean;
  inAppDue: boolean;
  inAppBug: boolean;
  inAppOther: boolean;
};
const DEFAULT_IN_APP_PREFS: InAppPrefs = {
  inAppNotifications: true,
  inAppMention: true,
  inAppApproved: true,
  inAppAssigned: true,
  inAppReminder: true,
  inAppRequest: true,
  inAppDue: true,
  inAppBug: true,
  inAppOther: true,
};
type CenterItem = {
  id: string;
  title: string;
  meta: string;
  body: string;
  tone: "accent" | "green" | "amber" | "red" | "cyan";
  time: number;
};

function timeLabel(timestamp: number) {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function toneColor(t: ReturnType<typeof useModel>["t"], tone: CenterItem["tone"]) {
  if (tone === "green") return t.green;
  if (tone === "amber") return t.amber;
  if (tone === "red") return t.red;
  if (tone === "cyan") return t.cyan || t.accent;
  return t.accent;
}

function userName(users: UserType[], id: string) {
  return users.find(u => u.id === id)?.name || id;
}

function CenterList({ items, empty, t }: { items: CenterItem[]; empty: string; t: ReturnType<typeof useModel>["t"] }) {
  if (items.length === 0) {
    return (
      <div style={{ border: `1px dashed ${t.border}`, borderRadius: 10, padding: "28px 12px", color: t.textDim, fontSize: 12, fontFamily: "var(--font-dm-mono), monospace", textAlign: "center" }}>
        {empty}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(item => {
        const color = toneColor(t, item.tone);
        return (
          <div key={item.id} style={{ border: `1px solid ${color}33`, background: color + "0a", borderRadius: 10, padding: "9px 10px", display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 850, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
              <div style={{ marginTop: 2, fontSize: 11, color, fontFamily: "var(--font-dm-mono), monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.meta}</div>
              {item.body && <div style={{ marginTop: 3, fontSize: 12, color: t.textMuted, lineHeight: 1.4 }}>{item.body}</div>}
            </div>
            <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap" }}>{timeLabel(item.time)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function ActivityView({ showToast, currentWorkspaceId }: { showToast: (msg: string, color: string) => void; currentWorkspaceId?: string }) {
  const {
    activityLog, reminders, execProposals, comments, chatMessages, users, currentUser, t,
    allPipelinesGlobal, customStages, subtasks, owners, stageDueDates, subtaskDueDates, workspaces,
    approvedStages, approvedSubtasks, bugs, getStatus,
  } = useModel();
  const [activeTab, setActiveTab] = useState<CenterTab>("inbox");
  const [prefs, setPrefs] = useState<InAppPrefs>(DEFAULT_IN_APP_PREFS);
  const [now] = useState(() => Date.now());
  const mono = "var(--font-dm-mono), monospace";
  const me = currentUser || "";
  const isAdmin = ADMIN_IDS.includes(me);

  useEffect(() => {
    fetch("/api/auth/prefs")
      .then(r => r.ok ? r.json() : null)
      .then((data: Partial<InAppPrefs> | null) => {
        if (data) setPrefs({ ...DEFAULT_IN_APP_PREFS, ...data });
      })
      .catch(() => {});
  }, []);

  const allow = useCallback((key: keyof InAppPrefs) => prefs.inAppNotifications !== false && prefs[key] !== false, [prefs]);

  const dueReminderLog: ActivityItem[] = reminders
    .filter(() => allow("inAppReminder"))
    .filter(r => me && r.recipientIds.includes(me) && Date.parse(r.remindAt) <= now && !(r.dismissedBy || []).includes(me))
    .map(r => ({ type: "reminder", user: r.createdBy, target: r.title, detail: r.body, time: Date.parse(r.remindAt), notifyTo: r.recipientIds }));
  const filteredLog = currentWorkspaceId
    ? [...dueReminderLog, ...activityLog].filter(entry => !entry.workspaceId || entry.workspaceId === currentWorkspaceId)
    : [...dueReminderLog, ...activityLog];

  const center = useMemo(() => {
    const visiblePipelineIds = currentWorkspaceId
      ? new Set(workspaces.find(w => w.id === currentWorkspaceId)?.pipelineIds || [])
      : new Set(allPipelinesGlobal.map(p => p.id));
    if (visiblePipelineIds.size === 0) allPipelinesGlobal.forEach(p => visiblePipelineIds.add(p.id));

    const stageToPipeline = new Map<string, string>();
    const pipelineName = new Map<string, string>();
    allPipelinesGlobal.forEach(p => {
      pipelineName.set(p.id, p.name);
      [...p.stages, ...(customStages[p.id] || [])].forEach(stage => stageToPipeline.set(stage, p.id));
    });

    const taskItems = [...stageToPipeline.entries()]
      .filter(([, pid]) => visiblePipelineIds.has(pid))
      .map(([stage, pid]) => ({
        key: stage,
        title: stage,
        pipeline: pipelineName.get(pid) || pid,
        owners: owners[stage] || [],
        due: stageDueDates[stage],
        approved: approvedStages.includes(stage),
        status: getStatus(stage),
        kind: "task" as const,
      }));

    const subtaskItems = Object.entries(subtasks).flatMap(([parent, list]) => {
      const pid = stageToPipeline.get(parent);
      if (pid && !visiblePipelineIds.has(pid)) return [];
      return list.map(sub => {
        const key = SubtaskKey.make(parent, sub.id);
        return {
          key,
          title: sub.text,
          pipeline: pipelineName.get(pid || "") || parent,
          owners: owners[key] || [],
          due: subtaskDueDates[key],
          approved: approvedSubtasks.includes(key),
          status: sub.done ? "done" : "planned",
          kind: "subtask" as const,
        };
      });
    });
    const workItems = [...taskItems, ...subtaskItems];

    const dueItems: CenterItem[] = allow("inAppDue") ? workItems
      .filter(item => item.due)
      .map(item => {
        const dueTime = Date.parse(`${item.due}T23:59:59`);
        return { item, dueTime };
      })
      .filter(({ dueTime }) => Number.isFinite(dueTime) && dueTime <= now + 3 * 24 * 60 * 60 * 1000)
      .sort((a, b) => a.dueTime - b.dueTime)
      .slice(0, 20)
      .map(({ item, dueTime }) => ({
        id: `due-${item.key}`,
        title: item.title,
        meta: dueTime < now ? `expired · ${item.pipeline}` : `due ${item.due} · ${item.pipeline}`,
        body: item.owners.length ? `assigned to ${item.owners.map(id => userName(users, id)).join(", ")}` : "unassigned",
        tone: dueTime < now ? "red" : "amber",
        time: dueTime,
      })) : [];

    const approvalItems: CenterItem[] = allow("inAppApproved") ? workItems
      .filter(item => !item.approved && (item.status === "active" || item.status === "done"))
      .slice(0, 20)
      .map(item => ({
        id: `approval-${item.key}`,
        title: item.title,
        meta: `needs approval · ${item.pipeline}`,
        body: item.owners.length ? `owners: ${item.owners.map(id => userName(users, id)).join(", ")}` : "no owner",
        tone: "green",
        time: now,
      })) : [];

    const assignmentItems: CenterItem[] = allow("inAppAssigned") ? workItems
      .filter(item => item.owners.includes(me) || (isAdmin && item.owners.length === 0))
      .slice(0, 30)
      .map(item => ({
        id: `assignment-${item.key}`,
        title: item.title,
        meta: item.owners.includes(me) ? `assigned to you · ${item.pipeline}` : `unassigned · ${item.pipeline}`,
        body: item.status,
        tone: item.owners.includes(me) ? "cyan" : "amber",
        time: now,
      })) : [];

    const mentionNeedles = users
      .filter(u => u.id === me)
      .flatMap(u => [`@${u.id.toLowerCase()}`, `@${u.name.split(" ")[0].toLowerCase()}`]);
    const mentionItems: CenterItem[] = allow("inAppMention") ? [
      ...Object.entries(comments).flatMap(([target, list]) => list.map(c => ({ target, text: c.text, by: c.by, time: Date.parse(c.time || String(c.id)) || c.id }))),
      ...chatMessages.map(m => ({ target: "team chat", text: m.text, by: m.userId, time: m.id })),
    ]
      .filter(item => mentionNeedles.some(n => item.text.toLowerCase().includes(n)))
      .sort((a, b) => b.time - a.time)
      .slice(0, 20)
      .map(item => ({
        id: `mention-${item.target}-${item.time}`,
        title: `${userName(users, item.by)} mentioned you`,
        meta: item.target,
        body: item.text,
        tone: "accent",
        time: item.time,
      })) : [];

    const requestItems: CenterItem[] = allow("inAppRequest") ? execProposals
      .filter(p => isAdmin || p.by === me)
      .slice(0, 25)
      .map(p => ({
        id: `request-${p.id}`,
        title: p.title,
        meta: `${p.status === "reviewed" ? "approved" : p.status} · ${p.kind || "request"}`,
        body: p.body,
        tone: p.status === "pending" ? "amber" : p.status === "rejected" ? "red" : "green",
        time: p.createdAt,
      })) : [];

    const reminderItems: CenterItem[] = allow("inAppReminder") ? reminders
      .filter(r => r.recipientIds.includes(me) && !(r.dismissedBy || []).includes(me))
      .sort((a, b) => Date.parse(a.remindAt) - Date.parse(b.remindAt))
      .slice(0, 25)
      .map(r => {
        const due = Date.parse(r.remindAt);
        return {
          id: `reminder-${r.id}`,
          title: r.title,
          meta: due <= now ? "due now" : `scheduled ${new Date(r.remindAt).toLocaleString()}`,
          body: r.body || `from ${userName(users, r.createdBy)}`,
          tone: due <= now ? "amber" : "cyan",
          time: due,
        };
      }) : [];

    const bugItems: CenterItem[] = allow("inAppBug") ? bugs
      .filter(item => !currentWorkspaceId || !item.workspaceId || item.workspaceId === currentWorkspaceId)
      .filter(item => item.status !== "closed" && (isAdmin || item.ownerId === me || item.createdBy === me))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20)
      .map(item => ({
        id: `bug-${item.id}`,
        title: item.title,
        meta: `${item.type} · ${item.severity} · ${item.status}`,
        body: item.ownerId ? `owner: ${userName(users, item.ownerId)}` : "unassigned",
        tone: item.severity === "critical" || item.severity === "high" ? "red" : "amber",
        time: item.updatedAt,
      })) : [];

    const inbox = [...reminderItems.filter(i => i.time <= now), ...mentionItems, ...requestItems.filter(i => i.meta.startsWith("pending")), ...dueItems, ...approvalItems, ...assignmentItems.filter(i => i.meta.startsWith("unassigned")), ...bugItems.filter(i => i.meta.includes("critical") || i.meta.includes("high"))]
      .sort((a, b) => b.time - a.time)
      .slice(0, 40);

    return { inbox, reminders: reminderItems, mentions: mentionItems, requests: requestItems, due: dueItems, approvals: approvalItems, assignments: assignmentItems, bugs: bugItems };
  }, [allPipelinesGlobal, allow, approvedStages, approvedSubtasks, bugs, chatMessages, comments, currentWorkspaceId, customStages, execProposals, getStatus, isAdmin, me, now, owners, reminders, stageDueDates, subtaskDueDates, subtasks, users, workspaces]);

  const tabs: Array<{ id: CenterTab; label: string; count: number }> = [
    { id: "inbox", label: "inbox", count: center.inbox.length },
    { id: "reminders", label: "reminders", count: center.reminders.length },
    { id: "mentions", label: "mentions", count: center.mentions.length },
    { id: "requests", label: "requests", count: center.requests.length },
    { id: "due", label: "due dates", count: center.due.length },
    { id: "approvals", label: "approvals", count: center.approvals.length },
    { id: "assignments", label: "assignments", count: center.assignments.length },
    { id: "bugs", label: "bugs/tests", count: center.bugs.length },
    { id: "activity", label: "activity", count: filteredLog.length },
  ];

  const tabItems = activeTab === "activity" ? [] : center[activeTab];

  return (
    <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
      <Suspense fallback={<ActivitySkeleton t={t} />}>
        <div style={{ marginTop: 16, padding: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 850, letterSpacing: 0.7, textTransform: "uppercase" }}>notification center</div>
            <div style={{ marginTop: 3, fontSize: 18, color: t.text, fontWeight: 900 }}>signals, reminders, requests, and activity</div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
            {tabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} style={{ background: active ? t.accent + "18" : t.bgCard, border: `1px solid ${active ? t.accent + "66" : t.border}`, color: active ? t.accent : t.textMuted, borderRadius: 8, padding: "5px 8px", fontSize: 10, fontFamily: mono, fontWeight: 800, cursor: "pointer" }}>
                  {tab.label}{tab.count > 0 ? ` · ${tab.count}` : ""}
                </button>
              );
            })}
          </div>
          {activeTab === "activity" ? (
            <ActivityFeed activityLog={filteredLog} users={users} t={t} currentUserId={currentUser} />
          ) : (
            <CenterList items={tabItems} empty="// no signals in this lane" t={t} />
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
