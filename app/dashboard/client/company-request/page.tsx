import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CompanyRequestWizard from "@/components/company-request/CompanyRequestWizard";
import type { CompanyRequestRow } from "@/types/company-request";

export default async function Page() {
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect("/auth/login");
  }

  const { data: req, error } = await supabase
    .from("company_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-white font-semibold">Erreur</div>
          <div className="text-white/60 text-sm mt-1">{error.message}</div>
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-white font-semibold">Aucune demande</div>
          <div className="text-white/60 text-sm mt-1">
            Ton agent/admin n’a pas encore créé la demande de création de société.
          </div>
        </div>
      </div>
    );
  }

  return <CompanyRequestWizard initialRequest={req as CompanyRequestRow} />;
}