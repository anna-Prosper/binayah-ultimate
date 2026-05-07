import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AppShellClient from "@/components/AppShellClient";

/**
 * (app) route group layout — server component.
 *
 * The (app) folder name is wrapped in parens which makes it a route group:
 * it adds a layout layer without contributing a URL segment. So:
 *   src/app/(app)/page.tsx          → "/"
 *   src/app/(app)/chat/page.tsx     → "/chat"
 *   src/app/(app)/pipelines/page.tsx → "/pipelines"
 * etc. Auth is checked once here and the persistent AppShell wraps every child.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    redirect("/login");
  }
  return <AppShellClient initialUserId={session.user.fixedUserId}>{children}</AppShellClient>;
}
