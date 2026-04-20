import { getServerProfile } from "@/lib/auth/get-server-profile";
import { TicketsModule } from "@/components/tickets/tickets-module";

export default async function TicketsPage() {
  const profile = await getServerProfile();
  return <TicketsModule profile={profile} />;
}
