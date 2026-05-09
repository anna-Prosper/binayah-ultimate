"use client";

import dynamic from "next/dynamic";
import { useModel } from "@/lib/contexts/ModelContext";
import { useIsMobile } from "@/hooks/useIsMobile";

const CallsView = dynamic(() => import("@/components/views/CallsView"), { ssr: false, loading: () => null });

export default function CallsPage() {
  const isMobile = useIsMobile(768);
  const { t, workspaces, currentWorkspaceId } = useModel() as ReturnType<typeof useModel> & { currentWorkspaceId: string | null };
  if (isMobile) return null;
  const workspace = workspaces.find(w => w.id === currentWorkspaceId);
  return <CallsView t={t} callSeriesFilters={workspace?.callSeriesFilters} />;
}
