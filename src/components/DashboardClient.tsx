"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh" }} />,
});

export default function DashboardClient({ initialUserId }: { initialUserId?: string }) {
  return <Dashboard initialUserId={initialUserId} />;
}
