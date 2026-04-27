"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { T } from "@/lib/themes";
import { type ActivityItem, type UserType } from "@/lib/data";
import { AvatarC } from "@/components/ui/Avatar";

const BELL_TYPES = new Set(["claimed", "active", "comment"]);
const MAX_NOTIFICATIONS = 50;
const MAX_VISIBLE = 20;

interface Props {
  t: T;
  currentUserId: string;
  users: UserType[];
}

function relativeTime(ts: number): string {
  const delta = Math.floor((Date.now() - ts) / 1000);
  if (delta < 5) return "just now";
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

function getEventColor(type: string, t: T): string {
  if (type === "claimed") return t.accent;
  if (type === "active") return t.green;
  if (type === "comment") return t.textSec;
  return t.textMuted;
}

function getEventDescription(item: ActivityItem, users: UserType[]): string {
  const actor = users.find(u => u.id === item.user);
  const name = actor?.name || item.user;
  const stage = item.target || item.detail || "a stage";
  if (item.type === "claimed") return `${name} claimed ${stage}`;
  if (item.type === "active") return `${stage} went live`;
  if (item.type === "comment") return `${name} commented on ${stage}`;
  return `${name} ${item.type} ${stage}`;
}

export default function NotificationBell({ t, currentUserId, users }: Props) {
  const [notifications, setNotifications] = useState<ActivityItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  // Pulse animation trigger — bumped on each new notification
  const [pulse, setPulse] = useState(false);
  const lastActivityIdRef = useRef<number>(0);
  const seenAtRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const backoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  // Tracks keys we've already ingested to avoid duplicates on reconnect
  const seenKeysRef = useRef<Set<string>>(new Set());
  // Ref mirror of `open` so SSE handler can read it without stale closure
  const openRef = useRef(false);

  // Load seenAt from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("binayah_notif_seen_at");
      if (stored) seenAtRef.current = parseInt(stored, 10);
    } catch { /* noop */ }
  }, []);

  // Gap-fill: seed from /api/pipeline-state activityLog on mount
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch("/api/pipeline-state");
        if (!res.ok) return;
        const data = await res.json() as { activityLog?: ActivityItem[] };
        const log = data.activityLog ?? [];
        const relevant = log
          .filter(a => BELL_TYPES.has(a.type))
          .slice(0, MAX_NOTIFICATIONS);
        // Seed keys
        relevant.forEach(a => {
          const k = `${a.type}:${a.user}:${a.target}:${a.time}`;
          seenKeysRef.current.add(k);
        });
        setNotifications(relevant);
        if (relevant.length > 0) {
          lastActivityIdRef.current = relevant[0].time;
          const unseen = relevant.filter(a => a.time > seenAtRef.current).length;
          setUnreadCount(unseen);
        }
      } catch { /* offline or unavailable */ }
    };
    fetchInitial();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = useCallback(() => {
    const now = Date.now();
    seenAtRef.current = now;
    setUnreadCount(0);
    try {
      localStorage.setItem("binayah_notif_seen_at", String(now));
    } catch { /* noop */ }
  }, []);

  // SSE subscription for live activity events
  useEffect(() => {
    mountedRef.current = true;

    const connect = () => {
      if (!mountedRef.current) return;
      const sinceActivity = lastActivityIdRef.current;
      const es = new EventSource(
        `/api/pipeline-state/messages/stream?sinceActivity=${sinceActivity}`
      );
      esRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        backoffRef.current = 1000;
      };

      // Named "activity" event — only fires when the SSE frame has `event: activity`
      es.addEventListener("activity", (event: MessageEvent) => {
        if (!mountedRef.current) return;
        try {
          const item = JSON.parse(event.data) as ActivityItem;
          if (!BELL_TYPES.has(item.type)) return;
          const key = `${item.type}:${item.user}:${item.target}:${item.time}`;
          if (seenKeysRef.current.has(key)) return;
          seenKeysRef.current.add(key);
          // Track last time for reconnect gap-fill
          if (item.time > lastActivityIdRef.current) {
            lastActivityIdRef.current = item.time;
          }
          setNotifications(prev => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
          // Only increment unread if dropdown is closed — use ref to avoid
          // calling setState inside another setState updater (React error #310)
          if (!openRef.current) {
            setUnreadCount(c => c + 1);
            setPulse(true);
            setTimeout(() => setPulse(false), 300);
          }
        } catch { /* malformed event */ }
      });

      // Ignore default message events — handled by ChatPanel
      es.onerror = () => {
        if (!mountedRef.current) return;
        es.close();
        esRef.current = null;
        const delay = Math.min(backoffRef.current, 30_000);
        backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-outside closes dropdown
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        openRef.current = false; setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Escape key closes dropdown
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { openRef.current = false; setOpen(false); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleBellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !openRef.current;
    openRef.current = next;
    setOpen(next);
    if (next) markRead();
  }, [markRead]);

  // Shared header button style — matches Dashboard hBtn
  const hBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    padding: "0 12px",
    cursor: "pointer",
    color: t.textMuted,
    fontFamily: "var(--font-dm-mono), monospace",
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    gap: 4,
    position: "relative" as const,
    minHeight: 44,
  };

  const visibleNotifs = notifications.slice(0, MAX_VISIBLE);

  return (
    <>
      <style>{`
        @keyframes notifPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        @keyframes bellDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div ref={dropdownRef} style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
        {/* Bell button */}
        <button
          onClick={handleBellClick}
          style={hBtn}
          title="Notifications"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          {/* Bell SVG — clean, minimal */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: open ? t.accent : t.textMuted,
              transition: "color 0.15s",
              animation: pulse ? "notifPulse 0.15s ease" : "none",
            }}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                minWidth: 14,
                height: 14,
                borderRadius: 8,
                background: t.accent,
                border: `2px solid ${t.bg}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 7,
                color: "#fff",
                fontWeight: 800,
                animation: pulse ? "notifPulse 0.15s ease" : "none",
                fontFamily: "var(--font-dm-mono), monospace",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              zIndex: 300,
              minWidth: 320,
              maxWidth: 380,
              width: "min(380px, calc(100vw - 32px))",
              boxShadow: t.shadowLg,
              animation: "bellDropIn 0.15s ease",
              overflow: "hidden",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Dropdown header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: t.textMuted,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                // activity
              </span>
              {notifications.length > 0 && (
                <button
                  onClick={markRead}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 9,
                    color: t.accent,
                    fontFamily: "var(--font-dm-mono), monospace",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: 0,
                  }}
                >
                  mark all read
                </button>
              )}
            </div>

            {/* Notification rows */}
            {visibleNotifs.length === 0 ? (
              <div
                style={{
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: t.textMuted,
                  letterSpacing: 0.5,
                }}
              >
                // all clear — command deck is quiet
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {visibleNotifs.map((item, idx) => {
                  const actor = users.find(u => u.id === item.user);
                  const isUnread = item.time > seenAtRef.current;
                  const eventColor = getEventColor(item.type, t);
                  const description = getEventDescription(item, users);

                  return (
                    <div
                      key={`${item.type}:${item.user}:${item.target}:${item.time}:${idx}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderBottom: `1px solid ${t.border}`,
                        borderLeft: isUnread ? `2px solid ${t.accent}` : "2px solid transparent",
                        background: isUnread ? `${t.accent}08` : "transparent",
                        transition: "background 0.15s",
                        cursor: "default",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = `${t.bgHover}`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = isUnread ? `${t.accent}08` : "transparent";
                      }}
                    >
                      {/* Avatar */}
                      <div style={{ flexShrink: 0 }}>
                        {actor ? (
                          <AvatarC user={actor} size={28} />
                        ) : (
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: `${eventColor}22`,
                              border: `2px solid ${eventColor}44`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              color: eventColor,
                              fontWeight: 800,
                            }}
                          >
                            ●
                          </div>
                        )}
                      </div>

                      {/* Description + time */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: t.text,
                            lineHeight: 1.3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {description}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: t.textMuted,
                            fontFamily: "var(--font-dm-mono), monospace",
                            marginTop: 0,
                          }}
                          title={new Date(item.time).toLocaleString()}
                        >
                          {relativeTime(item.time)}
                        </div>
                      </div>

                      {/* Event type dot */}
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: eventColor,
                          flexShrink: 0,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  );
                })}

                {notifications.length > MAX_VISIBLE && (
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: 9,
                      color: t.textMuted,
                      fontFamily: "var(--font-dm-mono), monospace",
                      textAlign: "center",
                    }}
                  >
                    // {notifications.length - MAX_VISIBLE} older events not shown
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
