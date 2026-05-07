"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useModel } from "@/lib/contexts/ModelContext";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ActivitySkeleton } from "@/components/ui/Skeletons";
import type { NotificationItem, NotificationKind } from "@/lib/notificationKinds";

type Filter = "all" | "unread" | "mentions" | "approvals" | "bugs";

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
    // Action-required items always count as "needs attention"; updates only if unread.
    return item.actionRequired || !isReadCheck(item);
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
  const dim = isRead && !item.actionRequired;
  // Click anywhere on the row → mark this update read. Navigation (if href) still
  // happens via the wrapping <Link>; we just call the read callback in addition.
  const handleRowClick = () => {
    if (!item.actionRequired && !isRead && onMarkRead) onMarkRead(item.id);
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
        border: `1px solid ${color}33`,
        background: color + "0a",
        borderRadius: 10,
        padding: "10px 12px",
        opacity: dim ? 0.55 : 1,
        textDecoration: "none",
        color: "inherit",
        cursor: item.href || (!item.actionRequired && !isRead) ? "pointer" : "default",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = color + "14"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = color + "0a"; }}
    >
      {/* Unread dot for updates only — action-required items don't have read state.
          Clickable: lets users mark a single item read without navigating. */}
      {!item.actionRequired ? (
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
      ) : (
        <div aria-hidden style={{ width: 14, height: 14 }} />
      )}
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

export default function ActivityView({ showToast }: { showToast: (msg: string, color: string) => void; currentWorkspaceId?: string }) {
  const { t, markAllNotifsRead, markNotifRead, dismissNotif } = useModel();
  const { actionRequired, updates, unreadUpdatesCount, isUpdateRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const mono = "var(--font-dm-mono), monospace";

  // Per-filter counts derived from the FULL lists, not the currently filtered list,
  // so the chip count is stable regardless of which filter is active.
  const counts = useMemo(() => {
    const all = actionRequired.length + updates.length;
    const unread = actionRequired.length + unreadUpdatesCount;
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
  }, [actionRequired, updates, unreadUpdatesCount]);

  const visibleAr = actionRequired.filter(n => matchesFilter(n, filter, isUpdateRead));
  const visibleUp = updates.filter(n => matchesFilter(n, filter, isUpdateRead));

  const filterChips: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "all", count: counts.all },
    { id: "unread", label: "unread", count: counts.unread },
    { id: "mentions", label: "mentions", count: counts.mentions },
    { id: "approvals", label: "approvals", count: counts.approvals },
    { id: "bugs", label: "bugs", count: counts.bugs },
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
              onClick={() => markAllNotifsRead()}
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
            <Link
              href="/activity/log"
              style={{
                background: t.bgCard, border: `1px solid ${t.border}`,
                color: t.textMuted, borderRadius: 8, padding: "5px 9px",
                fontSize: 10, fontFamily: mono, fontWeight: 800,
                textDecoration: "none",
              }}
            >
              activity log →
            </Link>
          </div>

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
                  <ItemRow key={item.id} item={item} t={t} isRead={false} />
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
                    isRead={isUpdateRead(item)}
                    onDismiss={dismissNotif}
                    onMarkRead={markNotifRead}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
