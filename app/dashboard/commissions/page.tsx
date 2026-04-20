import { getServerProfile } from "@/lib/auth/get-server-profile";
import { requireRole } from "@/lib/auth/get-server-profile";
import { CommissionsModule } from "@/components/commissions/commissions-module";

export default async function CommissionsPage() {
  const profile = await getServerProfile();
  requireRole(profile, ["admin_global", "admin_org", "agent"]);
  return <CommissionsModule profile={profile} />;
}
