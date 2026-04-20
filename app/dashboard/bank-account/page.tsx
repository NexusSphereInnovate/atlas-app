import { getServerProfile } from "@/lib/auth/get-server-profile";
import { BankAccountModule } from "@/components/bank-account/bank-account-module";

export const metadata = { title: "Compte bancaire — Atlas" };

export default async function BankAccountPage() {
  const profile = await getServerProfile();
  return <BankAccountModule profile={profile} />;
}
