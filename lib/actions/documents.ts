"use server";

import { createClient } from "@/lib/supabase/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";

export async function getSignedUrl(storagePath: string): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(storagePath, 300);

  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

export async function deleteDocument(documentId: string): Promise<{ error: string | null }> {
  const profile = await getServerProfile();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, uploaded_by, client_id")
    .eq("id", documentId)
    .single();

  if (!doc) return { error: "Document introuvable" };

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isOwner = doc.uploaded_by === profile.id && doc.client_id === profile.id;

  if (!isAdmin && !isOwner) return { error: "Permission refusée" };

  await supabase.storage.from("client-documents").remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", documentId);

  return { error: error?.message ?? null };
}

export async function verifyDocument(documentId: string): Promise<{ error: string | null }> {
  const profile = await getServerProfile();
  if (profile.role !== "admin_global" && profile.role !== "admin_org") {
    return { error: "Permission refusée" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ is_verified: true, verified_by: profile.id, verified_at: new Date().toISOString() })
    .eq("id", documentId);

  return { error: error?.message ?? null };
}
