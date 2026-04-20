import { getServerProfile } from "@/lib/auth/get-server-profile";
import { AtlasCircleModule } from "@/components/atlas-circle/atlas-circle-module";

export default async function AtlasCirclePage() {
  const profile = await getServerProfile();
  return <AtlasCircleModule profile={profile} />;
}
