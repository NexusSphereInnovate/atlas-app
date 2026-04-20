"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/types/documents";

type Profile = {
  org_id: string;
  role: "admin" | "agent" | "client";
  client_id: string | null;
};

function safeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

async function requireProfile(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; profile: Profile; userId: string }> {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    throw new Error("Not authenticated");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("org_id, role, client_id")
    .eq("user_id", auth.user.id)
    .single();

  if (error || !profile) {
    throw new Error("Profile not found");
  }

  return {
    supabase,
    profile: {
      org_id: profile.org_id as string,
      role: profile.role as Profile["role"],
      client_id: (profile as any).client_id ?? null,
    },
    userId: auth.user.id,
  };
}

export async function getViewerContext() {
  const { profile } = await requireProfile();
  return profile;
}

export async function listAccessibleClients() {
  const { supabase, profile, userId } = await requireProfile();

  if (profile.role === "client") {
    if (!profile.client_id) {
      return [];
    }
    return [{ id: profile.client_id }];
  }

  if (profile.role === "admin") {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as { id: string }[];
  }

  const { data, error } = await supabase
    .from("company_requests")
    .select("client_id")
    .eq("org_id", profile.org_id)
    .eq("assigned_agent_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    throw new Error(error.message);
  }

  const uniq = new Set<string>();
  for (const row of data ?? []) {
    const id = (row as any).client_id as string | null;
    if (id) {
      uniq.add(id);
    }
  }

  return Array.from(uniq).map((id) => ({ id }));
}

export async function listDocuments(params: { clientId?: string | null; limit?: number }) {
  const { supabase } = await requireProfile();

  let q = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 80);

  if (params.clientId) {
    q = q.eq("client_id", params.clientId);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DocumentRow[];
}

export async function createDocumentIntent(input: {
  clientId: string;
  requestId?: string | null;
  category: string;
  filename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  visibility?: "client" | "internal" | "private";
}) {
  const { supabase, profile, userId } = await requireProfile();

  const fileId = crypto.randomUUID();
  const finalName = safeName(input.filename);
  const filePath = `${profile.org_id}/${input.clientId}/${fileId}_${finalName}`;

  const { data: row, error } = await supabase
    .from("documents")
    .insert({
      org_id: profile.org_id,
      client_id: input.clientId,
      request_id: input.requestId ?? null,
      category: input.category,
      file_path: filePath,
      original_filename: input.filename,
      mime_type: input.mimeType ?? null,
      size_bytes: input.sizeBytes ?? null,
      visibility: input.visibility ?? "client",
      status: "uploaded",
      uploaded_by_user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/documents");
  return { filePath, document: row as DocumentRow };
}

export async function createSignedViewUrl(filePath: string) {
  const { supabase } = await requireProfile();

  const { data, error } = await supabase.storage
    .from("client-documents")
    .createSignedUrl(filePath, 60 * 10);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

export async function deleteDocument(documentId: string, filePath: string) {
  const { supabase } = await requireProfile();

  const { error: removeError } = await supabase.storage
    .from("client-documents")
    .remove([filePath]);

  if (removeError) {
    throw new Error(removeError.message);
  }

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (dbError) {
    throw new Error(dbError.message);
  }

  revalidatePath("/dashboard/documents");
  return true;
}