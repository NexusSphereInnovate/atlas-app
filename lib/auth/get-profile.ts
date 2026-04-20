// lib/auth/get-profile.ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin_global" | "admin_org" | "agent" | "client";

export type UserProfile = {
  user_id: string;
  role: AppRole;
  org_id: string | null;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export function dashboardPathForRole(role: AppRole): string {
  if (role === "admin_global" || role === "admin_org") return "/dashboard/admin";
  if (role === "agent") return "/dashboard/agents";
  return "/dashboard/client";
}

export async function getServerProfile(): Promise<{
  user: { id: string; email?: string | null } | null;
  profile: UserProfile | null;
  pending: boolean;
}> {
  const supabase = await createClient();

  const { data: authData } = await supabase.auth.getUser();

  // ✅ PAS CONNECTÉ => PAS PENDING
  if (!authData?.user) {
    return { user: null, profile: null, pending: false };
  }

  const user = { id: authData.user.id, email: authData.user.email ?? null };

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("user_id, role, org_id, is_active, first_name, last_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  // ✅ Profile absent => on ne force PAS pending (sinon boucle)
  if (error || !profile) {
    return { user, profile: null, pending: false };
  }

  // ✅ Pending uniquement si connecté + profil existe + inactif
  const pending = profile.is_active === false;

  return { user, profile, pending };
}