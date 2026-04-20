import { redirect } from "next/navigation";
import { getServerProfile, dashboardPathForRole } from "@/lib/auth/get-profile";
import AdminDashboard from "@/components/dashboard/admin-dashboard";

export default async function Page() {
  const { profile } = await getServerProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "admin") {
    redirect(dashboardPathForRole(profile.role));
  }

  return <AdminDashboard />;
}