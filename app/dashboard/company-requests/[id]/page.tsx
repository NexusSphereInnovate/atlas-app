import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CompanyRequestDetail } from "@/components/company-request/company-request-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompanyRequestDetailPage({ params }: Props) {
  const { id } = await params;
  const profile = await getServerProfile();
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("company_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) notFound();

  return <CompanyRequestDetail request={request} profile={profile} />;
}
