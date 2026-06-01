"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";

const TimelineView = dynamic(() => import("@/components/views/TimelineView"), { ssr: false, loading: () => null });

export default function TimelinePage() {
  const { showToast } = useAppShell();
  const { t } = useModel();

  return (
    <ErrorBoundary onError={() => showToast("// timeline failed to load", t.red)}>
      <TimelineView />
    </ErrorBoundary>
  );
}
