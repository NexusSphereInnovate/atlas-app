import { getServerProfile } from "@/lib/auth/get-server-profile";
import { ContractsModule } from "@/components/contracts/contracts-module";

export default async function ContractsPage() {
  const profile = await getServerProfile();
  return <ContractsModule profile={profile} />;
}
