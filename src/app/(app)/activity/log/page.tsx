"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useModel } from "@/lib/contexts/ModelContext";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useIsMobile } from "@/hooks/useIsMobile";

const ActivityFeed = dynamic(() => import("@/components/ActivityFeed"), { ssr: false });

/**
 * Raw audit log — the chronological 200-entry feed. The notifications panel
 * at /activity is curated and noise-free; this page is the firehose for
 * users who specifically want "show me everything that happened."
 */
export default function ActivityLogPage() {
  const isMobile = useIsMobile(768);
  const { currentWorkspaceId } = useAppShell();
  const { activityLog, users, currentUser, t } = useModel();
  if (isMobile) return null;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const filtered = currentWorkspaceId
    ? activityLog.filter(e => (!e.workspaceId || e.workspaceId === currentWorkspaceId) && e.time >= sevenDaysAgo)
    : activityLog.filter(e => e.time >= sevenDaysAgo);

  const mono = "var(--font-dm-mono), monospace";

  return (
    <div style={{ marginTop: 16, padding: 12, maxWidth: 720 }}>
      <div style={{ marginBottom: 10 }}>
        <Link
          href="/activity"
          style={{
            fontSize: 11, color: t.textMuted, fontFamily: mono,
            textDecoration: "none",
          }}
        >
          ← back to notifications
        </Link>
        <div style={{ marginTop: 6, fontSize: 10, color: t.accent, fontFamily: mono, fontWeight: 850, letterSpacing: 0.7, textTransform: "uppercase" }}>
          activity log
        </div>
        <div style={{ marginTop: 3, fontSize: 18, color: t.text, fontWeight: 900 }}>
          raw audit log — every event in the past 7 days
        </div>
      </div>
      <ActivityFeed activityLog={filtered} users={users} t={t} currentUserId={currentUser} />
    </div>
  );
}
