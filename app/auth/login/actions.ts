"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/guards";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // (MVP) simple : redirection avec query
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single<{ role: "admin" | "agent" | "client" }>();

  if (!profile) redirect("/auth/login");
  redirect(dashboardPathForRole(profile.role));
}