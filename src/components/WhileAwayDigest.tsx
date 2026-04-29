"use client";

import { useEffect } from "react";
import { T } from "@/lib/themes";
import { AvatarC } from "@/components/ui/Avatar";
import { type UserType, type ActivityItem } from "@/lib/data";

interface WhileAwayDigestProps {
  t: T;
  currentUser: string;
  users: UserType[];
  activityLog: ActivityItem[];
  claims: Record<string, string[]>;
  lastSession: number; // ms timestamp
  onDismiss: () => void;
}

function relativeTime(ms: number): string {
  // Guard against missing/zero/garbage timestamps (would otherwise render
  // "20572d ago" — i.e., epoch → now).
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "recently";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff > 365 * 86400000) return "a while ago"; // anything >1y is almost certainly junk
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function WhileAwayDigest({ t, currentUser, users, activityLog, claims, lastSession, onDismiss }: WhileAwayDigestProps) {
  // Compute three sections
  const since = lastSession;

  // Section A: stages claimed by teammates
  const claimedByTeammates = activityLog
    .filter(e => e.type === "claim" && e.time > since && e.user !== currentUser)
    .slice(0, 5);

  // Section B: comments mentioning currentUser by @firstName match
  const me = users.find(u => u.id === currentUser);
  const myFirstName = me?.name?.split(" ")[0]?.toLowerCase() ?? "";
  const mentioningMe = myFirstName
    ? activityLog
        .filter(e =>
          e.type === "comment" &&
          e.time > since &&
          e.user !== currentUser &&
          e.detail.toLowerCase().includes(`@${myFirstName}`)
        )
        .slice(0, 5)
    : [];

  // Section C: status changes on stages currentUser has claimed
  const myClaimed = new Set(
    Object.entries(claims)
      .filter(([, claimers]) => claimers.includes(currentUser))
      .map(([stageId]) => stageId)
  );
  const statusChangesOnMine = activityLog
    .filter(e => e.type === "status_change" && e.time > since && myClaimed.has(e.target))
    .slice(0, 5);

  const hasContent = claimedByTeammates.length > 0 || mentioningMe.length > 0 || statusChangesOnMine.length > 0;

  // Escape key dismisses
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss]);

  const awayDuration = relativeTime(lastSession);

  function Section({ label, entries }: { label: string; entries: ActivityItem[] }) {
    if (entries.length === 0) return null;
    return (
      <div style={{ paddingTop: 12 }}>
        <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry, i) => {
            const actor = users.find(u => u.id === entry.user);
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                {actor && <AvatarC user={actor} size={24} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: t.text, lineHeight: 1.4, wordBreak: "break-word" }}>
                    <span style={{ fontWeight: 700, color: actor?.color || t.accent }}>{actor?.name || entry.user}</span>
                    {" — "}
                    <span>{entry.target}</span>
                  </div>
                  {entry.detail && (
                    <div style={{ fontSize: 11, color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.detail.slice(0, 80)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", flexShrink: 0 }}>
                  {relativeTime(entry.time)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    // Backdrop
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 800,
        background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 20,
          padding: "24px 24px 20px",
          width: "100%",
          maxWidth: 480,
          maxHeight: "80vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>
            // while you were away...
          </div>
          <div style={{ fontSize: 11, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace", marginTop: 2 }}>
            last seen {awayDuration}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 12 }}>
          {hasContent ? (
            <>
              <Section label="// claims since you left" entries={claimedByTeammates} />
              {(claimedByTeammates.length > 0 && mentioningMe.length > 0) && <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 12 }} />}
              <Section label="// you were mentioned" entries={mentioningMe} />
              {((claimedByTeammates.length > 0 || mentioningMe.length > 0) && statusChangesOnMine.length > 0) && <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 12 }} />}
              <Section label="// status changes on your stages" entries={statusChangesOnMine} />
            </>
          ) : (
            <div style={{ padding: "24px 0", textAlign: "center", fontSize: 13, color: t.textDim, fontFamily: "var(--font-dm-mono), monospace" }}>
              // quiet while you were gone
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <button
            onClick={onDismiss}
            style={{
              background: t.accent,
              border: "none",
              borderRadius: 12,
              padding: "10px 32px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              fontFamily: "var(--font-dm-mono), monospace",
              letterSpacing: 0.3,
            }}
          >
            // got it
          </button>
        </div>
      </div>
    </div>
  );
}
