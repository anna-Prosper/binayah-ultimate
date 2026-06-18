"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";
import HomeViewRoute from "@/components/views/HomeViewRoute";
import type { NavItem } from "@/components/LeftSidebar";
import { NAV_HREFS } from "@/components/LeftSidebar";

/**
 * Home page (/).
 * Home now renders on mobile too. The old phone fallback jumped straight into
 * Pipelines, which made the Home tab feel broken and hid the attention summary.
 */
export default function HomePage() {
  return <DesktopHome />;
}

function DesktopHome() {
  const router = useRouter();
  const shell = useAppShell();
  const { me } = useModel();

  const setActiveNavItem = useCallback((item: NavItem) => {
    router.push(NAV_HREFS[item] ?? "/");
  }, [router]);

  const setActiveSidebarPipeline = useCallback((id: string | null) => {
    if (id) router.push(`/pipelines/${encodeURIComponent(id)}`);
  }, [router]);

  if (!me) return null;

  return (
    <HomeViewRoute
      showToast={shell.showToast}
      currentWorkspaceId={shell.currentWorkspaceId}
      setCurrentWorkspaceId={shell.setCurrentWorkspaceId}
      setActiveSidebarPipeline={setActiveSidebarPipeline}
      setActiveNavItem={setActiveNavItem}
      viewingUser={shell.viewingUser}
      setViewingUser={shell.setViewingUser}
      showActivity={shell.showActivity}
      setShowActivity={shell.setShowActivity}
      setLastSeenActivity={shell.setLastSeenActivity}
      showThemePicker={shell.showThemePicker}
      setShowThemePicker={shell.setShowThemePicker}
      selUser={shell.selUser}
      setSelUser={shell.setSelUser}
      selAvatar={shell.selAvatar}
      setSelAvatar={shell.setSelAvatar}
      setShowAvatarPicker={shell.setShowAvatarPicker}
      handleClaimWithAnim={shell.handleClaimWithAnim}
      unseen={shell.unseen}
      themeId={shell.themeId}
      isDark={shell.isDark}
      setThemeId={shell.setThemeId}
      setIsDark={shell.setIsDark}
    />
  );
}
