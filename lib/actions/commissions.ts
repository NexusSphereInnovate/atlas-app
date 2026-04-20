"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";

export async function createCommissionRule(data: {
  invoiceId?: string;
  orderId?: string;
  agentId: string;
  type: "fixed" | "percentage";
  value: number;
}): Promise<{ error: string | null }> {
  const profile = await getServerProfile();
  if (profile.role !== "admin_global" && profile.role !== "admin_org") {
    return { error: "Permission refusée" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("commission_rules").insert({
    org_id: profile.org_id,
    invoice_id: data.invoiceId ?? null,
    order_id: data.orderId ?? null,
    agent_id: data.agentId,
    type: data.type,
    value: data.value,
    created_by: profile.id,
  });

  return { error: error?.message ?? null };
}

export async function updateCommissionStatus(
  commissionId: string,
  status: "pending" | "validated" | "paid" | "cancelled"
): Promise<{ error: string | null }> {
  const profile = await getServerProfile();
  if (profile.role !== "admin_global" && profile.role !== "admin_org") {
    return { error: "Permission refusée" };
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();

  const { error } = await supabase
    .from("commissions")
    .update(patch)
    .eq("id", commissionId);

  return { error: error?.message ?? null };
}
