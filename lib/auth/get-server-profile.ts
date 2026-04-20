import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserProfile } from "@/types/profile";
import type { UserRole } from "@/types/database";

export async function getServerProfile(): Promise<UserProfile> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/auth/login");
  }

  if (!profile.is_active) {
    redirect("/auth/pending");
  }

  return profile as UserProfile;
}

export async function getServerProfileOrNull(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as UserProfile) ?? null;
}

export function requireRole(profile: UserProfile, roles: UserRole[]): void {
  if (!roles.includes(profile.role)) {
    redirect("/dashboard");
  }
}

export function getDashboardPath(role: UserRole): string {
  return "/dashboard";
}
