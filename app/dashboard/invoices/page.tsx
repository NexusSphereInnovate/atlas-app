import { getServerProfile } from "@/lib/auth/get-server-profile";
import { InvoicesModule } from "@/components/invoices/invoices-module";

export default async function InvoicesPage() {
  const profile = await getServerProfile();
  return <InvoicesModule profile={profile} />;
}
