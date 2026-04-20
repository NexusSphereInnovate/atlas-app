"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companyRequestPatchSchema, CompanyRequestPatch } from "@/lib/validators/company-request";

export async function patchCompanyRequest(requestId: string, patch: CompanyRequestPatch) {
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { ok: false, error: "Not authenticated." };
  }

  const parsed = companyRequestPatchSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload." };
  }

  const { error } = await supabase
    .from("company_requests")
    .update(parsed.data)
    .eq("id", requestId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/client/company-request");
  return { ok: true };
}

export async function submitCompanyRequestInfo(requestId: string) {
  const supabase = createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return { ok: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("company_requests")
    .update({ status: "info_submitted" })
    .eq("id", requestId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/client/company-request");
  return { ok: true };
}