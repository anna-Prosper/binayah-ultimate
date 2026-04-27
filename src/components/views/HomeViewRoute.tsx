"use client";

import { Suspense } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import dynamic from "next/dynamic";
import { AvatarC } from "@/components/ui/Avatar";
import { signOut } from "next-auth/react";
import { MessageSquare, Bell } from "lucide-react";
import type { NavItem } from "@/components/LeftSidebar";

const HomeView = dynamic(() => import("@/components/HomeView"), { ssr: false });

interface HomeViewRouteProps {
  showToast: (msg: string, color: string) => void;
  currentWorkspaceId: string;
  setCurrentWorkspaceId: (id: string) => void;
  setActiveSidebarPipeline: (id: string | null) => void;
  setActiveNavItem: (item: NavItem) => void;
  viewingUser: string | null;
  setViewingUser: (id: string | null) => void;
  showActivity: boolean;
  setShowActivity: (v: boolean) => void;
  setLastSeenActivity: (n: number) => void;
  showThemePicker: boolean;
  setShowThemePicker: (v: boolean) => void;
  selUser: string | null;
  setSelUser: (id: string | null) => void;
  selAvatar: string | null;
  setSelAvatar: (v: string | null) => void;
  setShowAvatarPicker: (v: boolean) => void;
  handleClaimWithAnim: (sid: string) => void;
  editMode?: boolean;
  unseen: number;
  themeId: string;
  isDark: boolean;
  setThemeId: (v: string) => void;
  setIsDark: (v: boolean) => void;
}

export default function HomeViewRoute({
  showToast, currentWorkspaceId, setCurrentWorkspaceId, setActiveSidebarPipeline,
  setActiveNavItem, viewingUser, setViewingUser, showActivity, setShowActivity,
  setLastSeenActivity, showThemePicker, setShowThemePicker, selUser, setSelUser,
  selAvatar, setSelAvatar, setShowAvatarPicker, handleClaimWithAnim,
  editMode, unseen, themeId, isDark, setThemeId, setIsDark,
}: HomeViewRouteProps) {
  const {
    users, currentUser, me, allPipelinesGlobal,
    pipeMetaOverrides, workspaces, activityLog, getPoints, t,
  } = useModel();

  const myWorkspaces = workspaces.filter(w => currentUser ? w.members.includes(currentUser!) : true);
  const isCaptainOfAny = !!currentUser && workspaces.some(w => w.captains.includes(currentUser!));

  const hBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0 12px", cursor: "pointer", color: t.textMuted, fontFamily: "var(--font-dm-mono), monospace", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, gap: 4, minHeight: 44 };

  if (!me) return null;
  return (
    <ErrorBoundary onError={() => showToast("// home failed to load — refresh to retry", t.red)}>
      <Suspense fallback={null}>
        <HomeView
          t={t}
          me={me}
          users={users}
          myWorkspaces={myWorkspaces}
          allPipelinesGlobal={allPipelinesGlobal}
          pipeMetaOverrides={pipeMetaOverrides}
          currentUser={currentUser!}
          isCaptainOfAny={isCaptainOfAny}
          currentWorkspaceId={currentWorkspaceId}
          onSwitchWorkspace={(id) => { setCurrentWorkspaceId(id); setActiveSidebarPipeline(null); }}
          editMode={editMode}
          onPipelineClick={(pid) => { setActiveNavItem("pipelines"); setActiveSidebarPipeline(pid); }}
          onUserClick={(uid) => setViewingUser(viewingUser === uid ? null : uid)}
          navbarSlot={(
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div onClick={e => { e.stopPropagation(); setSelUser(currentUser); setSelAvatar(me.avatar); setShowAvatarPicker(true); }} style={{ display: "flex", alignItems: "center", gap: 8, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "6px 10px", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = me.color + "55"} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = t.border}>
                <AvatarC user={me} size={24} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: t.text }}>{me.name}</div>
                  <div style={{ fontSize: 10, color: t.accent, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace" }}>{getPoints(currentUser!)}pts</div>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setActiveNavItem("chat"); }} style={{ ...hBtn, fontSize: 14 }}><MessageSquare size={14} strokeWidth={1.8} /></button>
              <button onClick={e => { e.stopPropagation(); setShowActivity(!showActivity); if (!showActivity) setLastSeenActivity(activityLog.length); }} style={{ ...hBtn, fontSize: 14, position: "relative" }}>
                <Bell size={14} strokeWidth={1.8} />
                {unseen > 0 && <div style={{ position: "absolute", top: 4, right: 4, minWidth: 12, height: 12, borderRadius: 8, background: t.red, border: `2px solid ${t.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 800 }}>{unseen > 9 ? "9+" : unseen}</div>}
              </button>
              <button onClick={() => setShowThemePicker(!showThemePicker)} style={{ ...hBtn, fontSize: 14, gap: 3 }}>{t.icon} <span style={{ fontSize: 11 }}>▾</span></button>
              <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ ...hBtn, fontSize: 11 }}>sign out</button>
            </div>
          )}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
