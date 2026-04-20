import { redirect } from "next/navigation";

// Les demandes de services sont maintenant intégrées dans /dashboard/services (onglet "Demandes")
export default function ServiceRequestsRedirectPage() {
  redirect("/dashboard/services");
}
