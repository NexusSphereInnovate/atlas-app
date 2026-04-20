import { getServerProfile, requireRole } from "@/lib/auth/get-server-profile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ClientDetailModule } from "@/components/clients/client-detail-module";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params;
  const profile = await getServerProfile();
  requireRole(profile, ["admin_global", "admin_org", "agent"]);

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  return <ClientDetailModule client={client} profile={profile} />;
}
