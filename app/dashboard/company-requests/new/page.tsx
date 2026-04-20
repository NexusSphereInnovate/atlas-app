import { getServerProfile } from "@/lib/auth/get-server-profile";
import { CompanyRequestWizard } from "@/components/company-request/wizard";

export default async function NewCompanyRequestPage() {
  const profile = await getServerProfile();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Nouvelle demande de création</h2>
        <p className="mt-1 text-sm text-white/40">Société UK LTD — immatriculation à Companies House</p>
      </div>
      <CompanyRequestWizard profile={profile} />
    </div>
  );
}
