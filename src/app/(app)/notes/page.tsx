"use client";

import NotesView from "@/components/views/NotesView";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";

export default function NotesPage() {
  const { currentWorkspaceId } = useAppShell();
  const { t } = useModel();
  return <NotesView t={t} currentWorkspaceId={currentWorkspaceId} />;
}
