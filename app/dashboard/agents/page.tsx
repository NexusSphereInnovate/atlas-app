import { getServerProfile, requireRole } from "@/lib/auth/get-server-profile";
import { AgentsListModule } from "@/components/agents/agents-list-module";

export default async function AgentsPage() {
  const profile = await getServerProfile();
  requireRole(profile, ["admin_global", "admin_org"]);
  return <AgentsListModule profile={profile} />;
}
