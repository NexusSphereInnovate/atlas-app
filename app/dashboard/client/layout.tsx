import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    redirect("/auth/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", auth.user.id)
    .single();

  if (error || !profile) {
    redirect("/auth/login");
  }

  if (profile.role !== "client") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#c8d1de]">
      {children}
    </div>
  );
}