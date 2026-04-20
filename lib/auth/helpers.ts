"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });
  return { error: error?.message ?? null };
}

export async function updatePassword(password: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { error: error?.message ?? null };
}
