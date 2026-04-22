import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginClient from "@/components/LoginClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.fixedUserId) {
    redirect("/");
  }
  return <LoginClient />;
}
