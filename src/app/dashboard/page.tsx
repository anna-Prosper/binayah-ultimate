import { redirect } from "next/navigation";

// C-1: /dashboard redirects to / so external links don't 404
export default function DashboardRedirect() {
  redirect("/");
}
