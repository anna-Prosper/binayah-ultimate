"use client";

import { useMemo } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { ADMIN_IDS } from "@/lib/data";
import type { NotificationItem } from "@/lib/notificationKinds";

const DAY = 86_400_000;

/**
 * Computes the role-aware notification feed for the current user.
 *
 * Returns two lists:
 * - `actionRequired`: state-derived concerns (approvals, blocked stages,
 *   unassigned NOW, bugs, reminders past due, due-soon, stalled,
 *   opportunities). These have no timestamp — they vanish only when the
 *   underlying state changes.
 * - `updates`: timestamped events (mentions, comments on my stages, claims,
 *   status changes, exec updates). They persist until explicitly dismissed;
 *   `notifReads[me]` controls unread vs read styling.
 *
 * Both lists are filtered against `notifDismissed[me]` so explicit dismissals
 * stick across sessions and devices.
 */
export function useNotifications() {
  const m = useModel();
  const {
    currentUser, workspaces, allPipelinesGlobal, customStages, archivedStages, owners,
    approvedStages, getStatus, stagePriorities, execProposals, bugs, reminders,
    stageDueDates, activityLog, comments, chatMessages, users,
    notifReads, notifDismissed, notifReadIds,
  } = m;

  return useMemo(() => {
    const me = currentUser || "";
    const empty = {
      actionRequired: [] as NotificationItem[],
      updates: [] as NotificationItem[],
      unreadUpdatesCount: 0,
      unreadActionCount: 0,
      totalAttentionCount: 0,
      isUpdateRead: (_n: NotificationItem) => true,
      isItemRead: (_n: NotificationItem) => true,
    };
    if (!me) return empty;

    const now = Date.now();
    const isAdmin = ADMIN_IDS.includes(me);
    const myCaptainWorkspaces = workspaces.filter(w => isAdmin || w.captains.includes(me));
    const myMemberWorkspaces = workspaces.filter(w => w.members.includes(me) || isAdmin);
    const captainPipelineIds = new Set(myCaptainWorkspaces.flatMap(w => w.pipelineIds));
    const memberPipelineIds = new Set(myMemberWorkspaces.flatMap(w => w.pipelineIds));

    const stagesIn = (pipeIds: Set<string>) => allPipelinesGlobal
      .filter(p => pipeIds.has(p.id))
      .flatMap(p => [...p.stages, ...(customStages[p.id] || [])])
      .filter(s => !archivedStages.includes(s));

    const myCaptainStages = stagesIn(captainPipelineIds);
    const myMemberStages = stagesIn(memberPipelineIds);
    const isCaptainSomewhere = myCaptainWorkspaces.length > 0;

    const stageToPipeline = new Map<string, string>();
    for (const p of allPipelinesGlobal) {
      for (const s of [...p.stages, ...(customStages[p.id] || [])]) stageToPipeline.set(s, p.id);
    }

    const ar: NotificationItem[] = [];
    const up: NotificationItem[] = [];
    const userName = (id: string) => users.find(u => u.id === id)?.name || id;
    const stageHref = (s: string) => {
      const pid = stageToPipeline.get(s);
      return pid ? `/pipelines/${pid}` : "/pipelines";
    };

    // ── ACTION REQUIRED ─────────────────────────────────────────────────────

    // 1. Approvals pending (captain/admin) — stage is active/done but not yet approved.
    if (isCaptainSomewhere) {
      for (const stage of myCaptainStages) {
        const status = getStatus(stage);
        if ((status === "active" || status === "done") && !approvedStages.includes(stage)) {
          ar.push({
            id: `approval:${stage}`, kind: "approval", title: stage, body: "needs approval",
            stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
            time: 0, priority: "high", actionRequired: true,
          });
        }
      }
    }

    // 2. Exec proposals pending (admin only).
    if (isAdmin) {
      for (const p of execProposals) {
        if (p.status === "pending") {
          ar.push({
            id: `exec-pending:${p.id}`, kind: "exec-pending", title: p.title,
            body: `from ${userName(p.by)}`, time: 0, priority: "high", actionRequired: true,
          });
        }
      }
    }

    // 3. Blocked stages (captain/admin).
    if (isCaptainSomewhere) {
      for (const stage of myCaptainStages) {
        if (getStatus(stage) === "blocked") {
          ar.push({
            id: `blocked:${stage}`, kind: "blocked", title: stage, body: "blocked — needs intervention",
            stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
            time: 0, priority: "high", actionRequired: true,
          });
        }
      }
    }

    // 4. Unassigned NOW (captain/admin).
    if (isCaptainSomewhere) {
      for (const stage of myCaptainStages) {
        if (stagePriorities[stage] === "NOW" && !(owners[stage]?.length)) {
          ar.push({
            id: `unassigned-now:${stage}`, kind: "unassigned-now", title: stage, body: "NOW priority — no owner",
            stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
            time: 0, priority: "high", actionRequired: true,
          });
        }
      }
    }

    // 5. Bugs I own (universal).
    for (const bug of bugs) {
      if (bug.status === "closed") continue;
      const mine = bug.ownerId === me || (bug.createdBy === me && !bug.ownerId);
      if (!mine) continue;
      const sev: "high" | "medium" = (bug.severity === "critical" || bug.severity === "high") ? "high" : "medium";
      ar.push({
        id: `bug:${bug.id}`, kind: "bug", title: bug.title,
        body: `${bug.severity} ${bug.type}`,
        time: 0, priority: sev, actionRequired: true,
      });
    }

    // 6. Reminders past due (universal).
    for (const r of reminders) {
      if (!r.recipientIds.includes(me)) continue;
      if ((r.dismissedBy || []).includes(me)) continue;
      if (Date.parse(r.remindAt) > now) continue;
      ar.push({
        id: `reminder:${r.id}`, kind: "reminder", title: r.title,
        body: r.body || "due now",
        time: 0, priority: "medium", actionRequired: true,
      });
    }

    // 7. Tasks due soon — assigned to me, due within 3 days or overdue.
    const myAssignedStages = Object.keys(owners).filter(s => owners[s].includes(me) && !archivedStages.includes(s));
    for (const stage of myAssignedStages) {
      const due = stageDueDates[stage];
      if (!due) continue;
      const dueTime = Date.parse(`${due}T23:59:59`);
      if (!Number.isFinite(dueTime)) continue;
      if (dueTime > now + 3 * DAY) continue;
      const overdue = dueTime < now;
      ar.push({
        id: `due:${stage}`, kind: "due-soon", title: stage,
        body: overdue ? `expired ${due}` : `due ${due}`,
        stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
        time: 0, priority: overdue ? "high" : "medium", actionRequired: true,
      });
    }

    // 8. Stalled — claimed by me, no status_change in 7+ days, and not already in active/done.
    const lastChangeByStage = new Map<string, number>();
    for (const a of activityLog) {
      if (a.type === "status_change" && a.target && !lastChangeByStage.has(a.target)) {
        lastChangeByStage.set(a.target, a.time);
      }
    }
    for (const stage of myAssignedStages) {
      const last = lastChangeByStage.get(stage) || 0;
      const status = getStatus(stage);
      if (now - last > 7 * DAY && status !== "active" && status !== "done") {
        ar.push({
          id: `stalled:${stage}`, kind: "stalled", title: stage, body: "no progress 7+ days",
          stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
          time: 0, priority: "medium", actionRequired: true,
        });
      }
    }

    // 9. Opportunities — non-captains see HIGH/NOW unowned stages they could claim.
    if (!isCaptainSomewhere) {
      for (const stage of myMemberStages) {
        const pri = stagePriorities[stage];
        if ((pri === "NOW" || pri === "HIGH") && !(owners[stage]?.length)) {
          ar.push({
            id: `opportunity:${stage}`, kind: "opportunity", title: stage, body: `${pri} — open to claim`,
            stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
            time: 0, priority: "low", actionRequired: true,
          });
        }
      }
    }

    // ── UPDATES ─────────────────────────────────────────────────────────────

    // Mention needles: handles for the current user only — `@id` and `@firstName`.
    const meHandles = users
      .filter(u => u.id === me)
      .flatMap(u => [`@${u.id.toLowerCase()}`, `@${u.name.split(" ")[0].toLowerCase()}`]);

    // 10. Exec proposal status updates — mine got reviewed/rejected.
    for (const p of execProposals) {
      if (p.by !== me) continue;
      if ((p.status === "reviewed" || p.status === "rejected") && p.reviewedAt) {
        up.push({
          id: `exec-update:${p.id}`, kind: "exec-update", title: p.title,
          body: `${p.status === "reviewed" ? "approved" : "rejected"} by ${userName(p.reviewedBy || "")}`,
          time: p.reviewedAt, priority: "medium", actionRequired: false,
        });
      }
    }

    // 11. Comments on stages I own (excluding my own comments).
    for (const [stage, list] of Object.entries(comments)) {
      if (!owners[stage]?.includes(me)) continue;
      for (const c of list) {
        if (c.by === me) continue;
        const t = Date.parse(c.time) || c.id;
        up.push({
          id: `comment:${stage}:${c.id}`, kind: "comment", title: stage,
          body: `${userName(c.by)}: ${c.text.slice(0, 100)}`,
          stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
          time: t, priority: "medium", actionRequired: false,
        });
      }
    }

    // 12. Comment mentions of me anywhere.
    for (const [stage, list] of Object.entries(comments)) {
      for (const c of list) {
        if (c.by === me) continue;
        const lower = c.text.toLowerCase();
        if (!meHandles.some(h => lower.includes(h))) continue;
        const t = Date.parse(c.time) || c.id;
        up.push({
          id: `mention:comment:${stage}:${c.id}`, kind: "mention",
          title: `${userName(c.by)} mentioned you`, body: c.text.slice(0, 140),
          stage, pipelineId: stageToPipeline.get(stage), href: stageHref(stage),
          time: t, priority: "high", actionRequired: false,
        });
      }
    }

    // 13. Chat mentions of me.
    for (const msg of chatMessages) {
      if (msg.userId === me) continue;
      const lower = msg.text.toLowerCase();
      if (!meHandles.some(h => lower.includes(h))) continue;
      const t = Date.parse(msg.time) || msg.id;
      up.push({
        id: `mention:chat:${msg.id}`, kind: "mention",
        title: `${userName(msg.userId)} mentioned you`, body: msg.text.slice(0, 140),
        href: "/chat", time: t, priority: "high", actionRequired: false,
      });
    }

    // 14. Activity-log-derived updates on stages I own (excluding my own actions).
    for (const a of activityLog) {
      if (!a.target) continue;
      if (!owners[a.target]?.includes(me)) continue;
      if (a.user === me) continue;
      if (a.type === "claim") {
        up.push({
          id: `claim:${a.target}:${a.user}:${a.time}`, kind: "claim", title: a.target,
          body: `${userName(a.user)} ${a.detail || "claimed"}`,
          stage: a.target, pipelineId: stageToPipeline.get(a.target), href: stageHref(a.target),
          time: a.time, priority: "low", actionRequired: false,
        });
      } else if (a.type === "status_change") {
        up.push({
          id: `status:${a.target}:${a.time}`, kind: "status-change", title: a.target,
          body: a.detail || "status changed",
          stage: a.target, pipelineId: stageToPipeline.get(a.target), href: stageHref(a.target),
          time: a.time, priority: "medium", actionRequired: false,
        });
      } else if (a.type === "approve") {
        up.push({
          id: `approval-given:${a.target}:${a.time}`, kind: "approval-given", title: a.target,
          body: `${userName(a.user)} approved`,
          stage: a.target, pipelineId: stageToPipeline.get(a.target), href: stageHref(a.target),
          time: a.time, priority: "low", actionRequired: false,
        });
      }
    }

    // ── Filter dismissed, sort ──────────────────────────────────────────────
    const dismissedIds = new Set(notifDismissed?.[me] || []);
    const filteredAr = ar.filter(n => !dismissedIds.has(n.id));
    const filteredUp = up.filter(n => !dismissedIds.has(n.id));

    const priOrder = (p?: "high" | "medium" | "low") => p === "high" ? 0 : p === "medium" ? 1 : 2;
    // Stable sort: (priority, id) for action required; (time desc, id asc) for updates.
    // The id tiebreaker is critical — without it React reorders rows mid-render
    // when two items share the same priority/time, causing the "items move
    // unexpectedly" bug the spec calls out.
    filteredAr.sort((a, b) => {
      const d = priOrder(a.priority) - priOrder(b.priority);
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });
    filteredUp.sort((a, b) => {
      const d = b.time - a.time;
      return d !== 0 ? d : a.id.localeCompare(b.id);
    });

    // Read state applies to BOTH buckets so "all read" can dim action-required
    // items too. An item is read if its id is in the per-item read set OR (for
    // items with a real timestamp) its time is older than the cutoff. Action-
    // required items typically have time=0, so the cutoff doesn't cover them —
    // the id set is the only way they become read. New action-required items
    // (different id, e.g. a fresh approval need on a different stage) won't be
    // in the set, so they appear unread until acknowledged.
    const lastReadAt = notifReads?.[me] || 0;
    const readIdSet = new Set(notifReadIds?.[me] || []);
    const isItemRead = (n: NotificationItem) => readIdSet.has(n.id) || (n.time > 0 && n.time <= lastReadAt);
    const unreadUpdatesCount = filteredUp.filter(n => !isItemRead(n)).length;
    const unreadActionCount = filteredAr.filter(n => !isItemRead(n)).length;

    return {
      actionRequired: filteredAr,
      updates: filteredUp,
      unreadUpdatesCount,
      unreadActionCount,
      // Sidebar/header badge value — count of items the user hasn't acknowledged.
      // Once they hit "all read" or auto-read fires, this drops to 0 and stays
      // there until something genuinely new appears.
      totalAttentionCount: unreadUpdatesCount + unreadActionCount,
      isUpdateRead: isItemRead, // legacy alias kept for callers
      isItemRead,
    };
  }, [
    currentUser, workspaces, allPipelinesGlobal, customStages, archivedStages, owners,
    approvedStages, getStatus, stagePriorities, execProposals, bugs, reminders,
    stageDueDates, activityLog, comments, chatMessages, users,
    notifReads, notifDismissed, notifReadIds,
  ]);
}
