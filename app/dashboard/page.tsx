import { getServerProfile } from "@/lib/auth/get-server-profile";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";

export default async function DashboardPage() {
  const profile = await getServerProfile();

  if (profile.role === "admin_global" || profile.role === "admin_org") {
    return <AdminDashboard profile={profile} />;
  }

  if (profile.role === "agent") {
    return <AgentDashboard profile={profile} />;
  }

  return <ClientDashboard profile={profile} />;
}
