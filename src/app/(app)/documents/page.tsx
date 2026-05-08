"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const DocumentsPanel = dynamic(() => import("@/components/DocumentsPanel"), { ssr: false, loading: () => null });

export default function DocumentsPage() {
  const isMobile = useIsMobile(768);
  const docId = useSearchParams().get("doc");
  const { currentWorkspaceId, paletteDocId, showToast } = useAppShell();
  const { workspaces, t } = useModel();

  // Mobile shows DocumentsPanel via BottomSheet from AppShell.
  if (isMobile) return null;

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || null;
  return (
    <ErrorBoundary onError={() => showToast("// documents failed to load — refresh to retry", t.red)}>
      <Suspense fallback={null}>
        <div style={{ marginTop: 16, height: "calc(100vh - 80px)" }}>
          <DocumentsPanel t={t} initialDocId={docId || paletteDocId} workspacePipelineIds={currentWorkspace?.pipelineIds ?? []} />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
