"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import { lsGet, lsSet } from "@/lib/storage";
import HomeViewRoute from "@/components/views/HomeViewRoute";
import PipelinesView from "@/components/views/PipelinesView";
import type { NavItem } from "@/components/LeftSidebar";
import { NAV_HREFS } from "@/components/LeftSidebar";

/**
 * Home page (/).
 * Desktop: HomeView dashboard.
 * Mobile: legacy fallback to PipelinesView (matches old "isMobile || activeNavItem === 'pipelines'" branch).
 */
export default function HomePage() {
  const isMobile = useIsMobile(768);
  if (isMobile) return <MobilePipelines />;
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

function MobilePipelines() {
  const router = useRouter();
  const shell = useAppShell();
  const { workspaces, isOfficerOfWorkspace } = useModel();
  const { setCopied } = useEphemeral();
  const [view, setView] = useState<"list" | "kanban" | "overview">(() => lsGet("view", "list"));
  const [expanded, setExpanded] = useState<string[]>(() => lsGet("expanded", ["research"]));
  const [expS, setExpS] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => { lsSet("expanded", expanded); }, [expanded]);
  useEffect(() => { lsSet("view", view); }, [view]);

  const currentWorkspace = workspaces.find(w => w.id === shell.currentWorkspaceId) || null;
  const isAdmin = isOfficerOfWorkspace(shell.currentWorkspaceId);

  const sharePipeline = useCallback((pid: string, pname: string, pdesc: string, priority: string, stageList: string[]) => {
    const stageLines = stageList.map(s => `  · ${s}`).join("\n");
    const lines = ["Binayah AI  //  Pipeline", "────────────────────────────────", pname, `Priority: ${priority}  ·  ${stageList.length} stages`];
    if (pdesc) { lines.push(""); lines.push(pdesc); }
    lines.push(""); lines.push("Stages:"); lines.push(stageLines);
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopied(`pipe-${pid}`); setTimeout(() => setCopied(null), 2000);
  }, [setCopied]);

  return (
    <PipelinesView
      view={view}
      setView={setView}
      expanded={expanded}
      setExpanded={setExpanded}
      expS={expS}
      setExpS={setExpS}
      searchQ={searchQ}
      setSearchQ={setSearchQ}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      isMobile={true}
      currentWorkspaceId={shell.currentWorkspaceId}
      currentWorkspace={currentWorkspace}
      isAdmin={isAdmin}
      readOnly={false}
      showToast={shell.showToast}
      handleClaimWithAnim={shell.handleClaimWithAnim}
      sharePipeline={sharePipeline}
      onPipelineClick={(pid) => router.push(`/pipelines/${encodeURIComponent(pid)}`)}
    />
  );
}
