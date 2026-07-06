"use client";
import dynamic from "next/dynamic";
const DatabasesView = dynamic(() => import("@/components/views/DatabasesView"), { ssr: false });
export default function ContentCalendarPage() {
  return <DatabasesView currentWorkspaceId="marketing" openDbName="Content Calendar" />;
}
