import { getServerProfile, requireRole } from "@/lib/auth/get-server-profile";
import { SettingsModule } from "@/components/settings/settings-module";

export default async function SettingsPage() {
  const profile = await getServerProfile();
  requireRole(profile, ["admin_global", "admin_org"]);
  return <SettingsModule profile={profile} />;
}
