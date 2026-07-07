"use client";
import dynamic from "next/dynamic";
const CampaignsView = dynamic(() => import("@/components/views/CampaignsView"), { ssr: false });
export default function CampaignsPage() {
  return <CampaignsView />;
}
