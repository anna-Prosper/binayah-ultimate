"use client";
import dynamic from "next/dynamic";
const DatabasesView = dynamic(() => import("@/components/views/DatabasesView"), { ssr: false });
export default function MonthlyMetricsPage() {
  return <DatabasesView currentWorkspaceId="marketing" openDbName="Monthly Metrics" />;
}
