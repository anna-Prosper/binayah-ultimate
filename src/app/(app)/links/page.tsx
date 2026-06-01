"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";

const UsefulLinksView = dynamic(() => import("@/components/views/UsefulLinksView"), { ssr: false, loading: () => null });

export default function LinksPage() {
  const { showToast } = useAppShell();
  const { t } = useModel();

  return (
    <ErrorBoundary onError={() => showToast("// useful links failed to load", t.red)}>
      <UsefulLinksView />
    </ErrorBoundary>
  );
}
