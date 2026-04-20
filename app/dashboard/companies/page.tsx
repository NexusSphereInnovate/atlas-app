import { getServerProfile } from "@/lib/auth/get-server-profile";
import CompaniesModule from "@/components/companies/companies-module";

export const metadata = { title: "Mes Sociétés — Atlas" };

export default async function CompaniesPage() {
  const profile = await getServerProfile();
  return <CompaniesModule profile={profile} />;
}
