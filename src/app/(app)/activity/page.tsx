"use client";

import ActivityView from "@/components/views/ActivityView";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useIsMobile } from "@/hooks/useIsMobile";

export default function ActivityPage() {
  const isMobile = useIsMobile(768);
  const { showToast, currentWorkspaceId } = useAppShell();
  // Mobile uses the BottomSheet rendered by AppShell, not a route page.
  if (isMobile) return null;
  return <ActivityView showToast={showToast} currentWorkspaceId={currentWorkspaceId} />;
}
