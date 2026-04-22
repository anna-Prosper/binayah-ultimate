import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.fixedUserId) {
    redirect("/login");
  }
  return <Dashboard initialUserId={session.user.fixedUserId} />;
}
