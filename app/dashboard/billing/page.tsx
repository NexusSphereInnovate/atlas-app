import { redirect } from "next/navigation";
import { getServerProfile } from "@/lib/auth/get-profile";

export default async function Page() {
  const { profile } = await getServerProfile();
  if (!profile) redirect("/auth/login");

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111520]/70 backdrop-blur-xl p-6 text-white/80">
      Billing / Factures (à brancher).
    </div>
  );
}