import { getServerProfile } from "@/lib/auth/get-server-profile";
import { DocumentsModule } from "@/components/documents/documents-module";

export default async function DocumentsPage() {
  const profile = await getServerProfile();
  return <DocumentsModule profile={profile} />;
}
