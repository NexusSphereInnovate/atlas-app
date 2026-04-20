import { getServerProfile } from "@/lib/auth/get-server-profile";
import { CompanyRequestsModule } from "@/components/company-request/company-requests-module";

export default async function CompanyRequestsPage() {
  const profile = await getServerProfile();
  return <CompanyRequestsModule profile={profile} />;
}
