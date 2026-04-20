import { getServerProfile, requireRole } from "@/lib/auth/get-server-profile";
import { ClientsListModule } from "@/components/clients/clients-list-module";

export default async function ClientsPage() {
  const profile = await getServerProfile();
  requireRole(profile, ["admin_global", "admin_org", "agent"]);
  return <ClientsListModule profile={profile} />;
}
