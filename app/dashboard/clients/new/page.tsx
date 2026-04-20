import { getServerProfile, requireRole } from "@/lib/auth/get-server-profile";
import { NewClientModule } from "@/components/clients/new-client-module";

export default async function NewClientPage() {
  const profile = await getServerProfile();
  requireRole(profile, ["admin_global", "admin_org", "agent"]);
  return <NewClientModule profile={profile} />;
}
