"use client";

import BugTrackerView from "@/components/views/BugTrackerView";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";

export default function BugsPage() {
  const { currentWorkspaceId } = useAppShell();
  const { t } = useModel();
  return <BugTrackerView t={t} currentWorkspaceId={currentWorkspaceId} />;
}
