import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    redirect("/login");
  }
  return <DashboardClient initialUserId={session.user.fixedUserId} />;
}
