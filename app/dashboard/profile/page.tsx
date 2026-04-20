import { getServerProfile } from "@/lib/auth/get-server-profile";
import { ProfileModule } from "@/components/settings/profile-module";

export default async function ProfilePage() {
  const profile = await getServerProfile();
  return <ProfileModule profile={profile} />;
}
