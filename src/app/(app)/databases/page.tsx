"use client";
import dynamic from "next/dynamic";
import { useAppShell } from "@/lib/contexts/AppShellContext";
const DatabasesView = dynamic(() => import("@/components/views/DatabasesView"), { ssr: false });
export default function DatabasesPage() {
  const { currentWorkspaceId } = useAppShell();
  return <DatabasesView currentWorkspaceId={currentWorkspaceId} />;
}
