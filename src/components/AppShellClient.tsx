"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("@/components/AppShell"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh" }} />,
});

/**
 * Client-side mount point for AppShell. Lives at this thin layer because
 * the route-group layout is a server component (does the auth redirect)
 * and Next.js disallows `ssr: false` from server components.
 */
export default function AppShellClient({
  initialUserId,
  children,
}: {
  initialUserId?: string;
  children: React.ReactNode;
}) {
  return <AppShell initialUserId={initialUserId}>{children}</AppShell>;
}
