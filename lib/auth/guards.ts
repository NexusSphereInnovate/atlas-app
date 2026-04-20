import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "agent" | "client";

export function dashboardPathForRole(role: AppRole) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "agent") return "/dashboard/agents";
  return "/dashboard/clients";
}

export async function requireProfile() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, role, org_id")
    .eq("user_id", data.user.id)
    .single<{ user_id: string; role: AppRole; org_id: string }>();

  if (!profile) redirect("/auth/login");
  return { supabase, user: data.user, profile };
}

export async function requireRole(roles: AppRole[]) {
  const { profile } = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/forbidden");
  return profile;
}