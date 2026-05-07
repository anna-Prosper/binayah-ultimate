"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useModel } from "@/lib/contexts/ModelContext";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ActivitySkeleton } from "@/components/ui/Skeletons";
import { ACTIVITY_LOG_VISIBLE_DAYS, MS_PER_DAY } from "@/lib/constants";
import type { NotificationItem, NotificationKind } from "@/lib/notificationKinds";

const ActivityFeed = dynamic(() => import("@/components/ActivityFeed"), { ssr: false });
import { isUsefulActivity } from "@/components/ActivityFeed";

type Filter = "all" | "unread" | "mentions" | "approvals" | "bugs" | "activity";

function timeLabel(timestamp: number) {
  if (!timestamp) return "";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function priorityColor(t: ReturnType<typeof useModel>["t"], priority?: NotificationItem["priority"]) {
  if (priority === "high") return t.red;
  if (priority === "medium") return t.amber;
  return t.accent;
}

const MENTION_KINDS: NotificationKind[] = ["mention"];
const APPROVAL_KINDS: NotificationKind[] = ["approval", "exec-pending", "approval-given", "exec-update"];
const BUG_KINDS: NotificationKind[] = ["bug"];

function matchesFilter(item: NotificationItem, filter: Filter, isReadCheck: (n: NotificationItem) => boolean): boolean {
  if (filter === "all") return true;
  if (filter === "unread") {
    // Both buckets follow read state — once acknowledged (per-item or 'all read'),
    // the item drops out of the unread filter. Underlying state still drives
    // the action-required bucket on the 'all' tab.
    return !isReadCheck(item);
  }
  if (filter === "mentions") return MENTION_KINDS.includes(item.kind);
  if (filter === "approvals") return APPROVAL_KINDS.includes(item.kind);
  if (filter === "bugs") return BUG_KINDS.includes(item.kind);
  return true;
}

function ItemRow({
  item, t, isRead, onDismiss, onMarkRead,
}: {
  item: NotificationItem;
  t: ReturnType<typeof useModel>["t"];
  isRead: boolean;
  onDismiss?: (id: string) => void;
  onMarkRead?: (id: string) => void;
}) {
  const color = priorityColor(t, item.priority);
  // Read vs unread is signalled by COLOR — unread cards carry the priority tint
  // (border + faint bg), read cards drop to a neutral border with no tint. No
  // opacity change so text stays fully legible either way.
  const borderCol = isRead ? t.border : color + "55";
  const bgCol = isRead ? "transparent" : color + "0d";
  const hoverBg = isRead ? (t.bgHover || t.bgSoft || "transparent") : color + "1a";
  // Click anywhere on the row → mark this item read. Navigation (if href) still
  // happens via the wrapping <Link>; we just call the read callback in addition.
  const handleRowClick = () => {
    if (!isRead && onMarkRead) onMarkRead(item.id);
  };
  const inner = (
    <div
      onClick={handleRowClick}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems: "start",
        gap: 10,
        border: `1px solid ${borderCol}`,
        background: bgCol,
        borderRadius: 10,
        padding: "10px 12px",
        textDecoration: "none",
        color: "inherit",
        cursor: item.href || !isRead ? "pointer" : "default",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = hoverBg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bgCol; }}
    >
      {/* Unread dot — clickable per-item read affordance. Action-required items
          stay in the list when read (state still needs resolving), but dim. */}
      <button
        type="button"
        onClick={e => { e.preventDefault(); e.stopPropagation(); if (!isRead && onMarkRead) onMarkRead(item.id); }}
        aria-label={isRead ? "read" : "mark as read"}
        title={isRead ? "read" : "mark as read"}
        style={{
          width: 14, height: 14, marginTop: 3, padding: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none",
          cursor: isRead ? "default" : "pointer",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: !isRead ? color : "transparent", display: "block" }} />
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.title}
        </div>
        {item.body && (
          <div style={{ marginTop: 3, fontSize: 12, color: t.textMuted, lineHeight: 1.45, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {item.body}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", whiteSpace: "nowrap", paddingTop: 3 }}>
        {item.actionRequired ? "" : timeLabel(item.time)}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onDismiss(item.id); }}
          aria-label="dismiss"
          title="dismiss"
          style={{
            background: "transparent",
            border: `1px solid ${t.border}`,
            borderRadius: 6,
            color: t.textDim,
            cursor: "pointer",
            padding: "2px 6px",
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      ) : <div />}
    </div>
  );
  if (item.href) {
    return <Link href={item.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{inner}</Link>;
  }
  return inner;
}

function SectionHeader({ label, count, t }: { label: string; count: number; t: ReturnType<typeof useModel>["t"] }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "14px 2px 8px" }}>
      <div style={{ fontSize: 10, color: t.accent, fontFamily: "var(--font-dm-mono), monospace", fontWeight: 850, letterSpacing: 0.7, textTransform: "uppercase" }}>
        — {label}
      </div>
      <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
        {count}
      </div>
    </div>
  );
}

export default function ActivityView({ showToast, currentWorkspaceId }: { showToast: (msg: string, color: string) => void; currentWorkspaceId?: string }) {
  const { t, markAllNotifsRead, markNotifRead, dismissNotif, activityLog, users, currentUser } = useModel();
  const { actionRequired, updates, unreadUpdatesCount, unreadActionCount, isItemRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(() => Date.now());
  const mono = "var(--font-dm-mono), monospace";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Per-filter counts derived from the FULL lists, not the currently filtered list,
  // so the chip count is stable regardless of which filter is active.
  const counts = useMemo(() => {
    const all = actionRequired.length + updates.length;
    const unread = unreadActionCount + unreadUpdatesCount;
    const inKind = (kinds: NotificationKind[]) =>
      actionRequired.filter(n => kinds.includes(n.kind)).length +
      updates.filter(n => kinds.includes(n.kind)).length;
    return {
      all,
      unread,
      mentions: inKind(MENTION_KINDS),
      approvals: inKind(APPROVAL_KINDS),
      bugs: inKind(BUG_KINDS),
    };
  }, [actionRequired, updates, unreadUpdatesCount, unreadActionCount]);

  const visibleAr = actionRequired.filter(n => matchesFilter(n, filter, isItemRead));
  const visibleUp = updates.filter(n => matchesFilter(n, filter, isItemRead));

  // Auto-mark-read on open (instant). Whenever the panel mounts OR new unread
  // items arrive while the user is on the page, mark them read. The dedupe ref
  // stops the same set from firing repeatedly if React re-renders.
  const allUnreadIds = useMemo(
    () => [...actionRequired, ...updates].filter(n => !isItemRead(n)).map(n => n.id),
    [actionRequired, updates, isItemRead]
  );
  const allUnreadKey = allUnreadIds.join(",");
  const autoReadFiredRef = useRef("");
  useEffect(() => {
    if (allUnreadIds.length === 0) return;
    if (autoReadFiredRef.current === allUnreadKey) return;
    autoReadFiredRef.current = allUnreadKey;
    markAllNotifsRead(allUnreadIds);
  }, [allUnreadKey, allUnreadIds, markAllNotifsRead]);

  // Activity log content for the "activity log" tab. Apply the same noise
  // filter as ActivityFeed so the chip count matches the rendered feed count
  // (drops status_change spam + role-irrelevant entries).
  const activityLogFiltered = useMemo(() => {
    const cutoff = now - ACTIVITY_LOG_VISIBLE_DAYS * MS_PER_DAY;
    const wsFiltered = currentWorkspaceId
      ? activityLog.filter(e => (!e.workspaceId || e.workspaceId === currentWorkspaceId) && e.time >= cutoff)
      : activityLog.filter(e => e.time >= cutoff);
    return wsFiltered.filter(e => isUsefulActivity(e, currentUser, users));
  }, [activityLog, currentWorkspaceId, currentUser, users, now]);

  const filterChips: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "all", count: counts.all },
    { id: "unread", label: "unread", count: counts.unread },
    { id: "mentions", label: "mentions", count: counts.mentions },
    { id: "approvals", label: "approvals", count: counts.approvals },
    { id: "bugs", label: "bugs", count: counts.bugs },
    { id: "activity", label: "activity log", count: activityLogFiltered.length },
  ];

  return (
    <ErrorBoundary onError={() => showToast("// failed to load notifications — refresh to retry", t.red)}>
      <Suspense fallback={<ActivitySkeleton t={t} />}>
        <div style={{ marginTop: 16, padding: 12, maxWidth: 720 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 850, letterSpacing: 0.7, textTransform: "uppercase" }}>
                notifications
              </div>
              <div style={{ marginTop: 3, fontSize: 18, color: t.text, fontWeight: 900 }}>
                signals, requests, mentions
              </div>
            </div>
            <button
              type="button"
              onClick={() => markAllNotifsRead(allUnreadIds)}
              disabled={unreadUpdatesCount === 0}
              style={{
                background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8,
                padding: "6px 10px", cursor: unreadUpdatesCount ? "pointer" : "default",
                opacity: unreadUpdatesCount ? 1 : 0.45,
                color: t.textMuted, fontFamily: mono, fontSize: 11, fontWeight: 700,
                whiteSpace: "nowrap",
              }}
              title="mark all updates as read"
            >
              ✓ all read
            </button>
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 4 }}>
            {filterChips.map(chip => {
              const active = filter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  style={{
                    background: active ? t.accent + "18" : t.bgCard,
                    border: `1px solid ${active ? t.accent + "66" : t.border}`,
                    color: active ? t.accent : t.textMuted,
                    borderRadius: 8, padding: "5px 9px", fontSize: 10,
                    fontFamily: mono, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  {chip.label}{chip.count > 0 ? ` · ${chip.count}` : ""}
                </button>
              );
            })}
          </div>

          {/* Activity log tab — full audit feed, replaces redirected page */}
          {filter === "activity" ? (
            <div style={{ marginTop: 12 }}>
              {activityLogFiltered.length === 0 ? (
                <div style={{ border: `1px dashed ${t.border}`, borderRadius: 10, padding: "32px 12px", color: t.textDim, fontSize: 12, fontFamily: mono, textAlign: "center" }}>
                  // no activity in the past {ACTIVITY_LOG_VISIBLE_DAYS} days.
                </div>
              ) : (
                <ActivityFeed activityLog={activityLogFiltered} users={users} t={t} currentUserId={currentUser} />
              )}
            </div>
          ) : (
          <>
          {/* Empty state */}
          {visibleAr.length === 0 && visibleUp.length === 0 && (
            <div style={{ marginTop: 24, border: `1px dashed ${t.border}`, borderRadius: 10, padding: "32px 12px", color: t.textDim, fontSize: 12, fontFamily: mono, textAlign: "center" }}>
              {filter === "all"
                ? "// you're all caught up — no signals."
                : "// nothing in this filter."}
            </div>
          )}

          {/* Action required */}
          {visibleAr.length > 0 && (
            <>
              <SectionHeader label="action required" count={visibleAr.length} t={t} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleAr.map(item => (
                  <ItemRow key={item.id} item={item} t={t} isRead={isItemRead(item)} onMarkRead={markNotifRead} />
                ))}
              </div>
            </>
          )}

          {/* Updates */}
          {visibleUp.length > 0 && (
            <>
              <SectionHeader label="updates" count={visibleUp.length} t={t} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleUp.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    t={t}
                    isRead={isItemRead(item)}
                    onDismiss={dismissNotif}
                    onMarkRead={markNotifRead}
                  />
                ))}
              </div>
            </>
          )}
          </>
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
