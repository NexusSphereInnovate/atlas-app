import { redirect } from "next/navigation";
import { getServerProfile, dashboardPathForRole } from "@/lib/auth/get-profile";

export default async function Page() {
  const { profile } = await getServerProfile();
  if (!profile) redirect("/auth/login");
  if (profile.role === "client") redirect(dashboardPathForRole(profile.role));

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111520]/70 backdrop-blur-xl p-6 text-white/80">
      Requests (à brancher). Admin/Agent uniquement.
    </div>
  );
}