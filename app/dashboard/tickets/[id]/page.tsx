import { getServerProfile } from "@/lib/auth/get-server-profile";
import { TicketDetail } from "@/components/tickets/ticket-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const profile = await getServerProfile();
  return <TicketDetail ticketId={id} profile={profile} />;
}
