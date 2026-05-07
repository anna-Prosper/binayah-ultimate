"use client";

import dynamic from "next/dynamic";
import { useModel } from "@/lib/contexts/ModelContext";
import { useIsMobile } from "@/hooks/useIsMobile";

const CallsView = dynamic(() => import("@/components/views/CallsView"), { ssr: false, loading: () => null });

export default function CallsPage() {
  const isMobile = useIsMobile(768);
  const { t } = useModel();
  // CallsView is desktop-only in the legacy layout — preserve that.
  if (isMobile) return null;
  return <CallsView t={t} />;
}
