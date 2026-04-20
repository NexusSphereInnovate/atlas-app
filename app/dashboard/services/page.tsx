import { getServerProfile } from "@/lib/auth/get-server-profile";
import ServicesUnifiedModule from "@/components/services/services-unified-module";

export const metadata = { title: "Services — Atlas" };

export default async function ServicesPage() {
  const profile = await getServerProfile();
  return <ServicesUnifiedModule profile={profile} />;
}
