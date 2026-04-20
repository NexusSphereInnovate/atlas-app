"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";

export async function createInvitation(data: {
  email: string;
  role: "client" | "agent";
  firstName?: string;
  lastName?: string;
}) {
  const profile = await getServerProfile();
  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      email: data.email,
      role: data.role,
      invited_by: profile.id,
      agent_id: data.role === "client" ? profile.id : null,
    })
    .select("token")
    .single();

  if (error) return { error: error.message, token: null };

  return { error: null, token: invitation.token };
}

export async function updateClientProfile(
  clientId: string,
  data: { first_name?: string; last_name?: string; phone?: string; is_active?: boolean }
) {
  const profile = await getServerProfile();
  const supabase = await createClient();

  if (profile.role !== "admin_global" && profile.role !== "admin_org") {
    return { error: "Permission refusée" };
  }

  const { error } = await supabase
    .from("user_profiles")
    .update(data)
    .eq("id", clientId);

  return { error: error?.message ?? null };
}

export async function assignAgent(clientId: string, agentId: string) {
  const profile = await getServerProfile();
  if (profile.role !== "admin_global" && profile.role !== "admin_org") {
    return { error: "Permission refusée" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_profiles")
    .update({ assigned_agent_id: agentId })
    .eq("id", clientId);

  return { error: error?.message ?? null };
}
