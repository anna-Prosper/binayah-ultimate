"use client";
import dynamic from "next/dynamic";
const DatabasesView = dynamic(() => import("@/components/views/DatabasesView"), { ssr: false });
export default function CampaignsPage() {
  return <DatabasesView currentWorkspaceId="marketing" openDbName="Campaigns" />;
}
