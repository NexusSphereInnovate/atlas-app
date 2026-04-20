"use client";

import { useEffect, useState, useRef } from "react";
import {
  Upload, FileText, Image as ImageIcon, Eye, Download,
  Trash2, Filter, Search, X, CheckCircle, Shield,
} from "lucide-react";
import { cn, formatDate, formatFileSize } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import type { UserProfile } from "@/types/profile";
import type { DocumentCategory } from "@/types/database";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  identity: "Pièce d'identité",
  bank_statement: "Relevé bancaire",
  proof_of_address: "Justificatif d'adresse",
  company: "Document société",
  invoice: "Facture",
  contract: "Contrat",
  branch: "Dossier succursale",
  other: "Autre",
};

const COMPANY_DOC_LABELS: Record<string, string> = {
  certificate_of_incorporation: "Certificat d'immatriculation",
  memorandum: "Statuts de la société",
  share_certificates: "Certificats de parts",
  director_register: "Registre des directeurs",
  shareholder_register: "Registre des actionnaires",
  confirmation_statement: "Déclaration de confirmation",
  branch_ch: "Dossier succursale Suisse",
  branch_fr: "Dossier succursale France",
};

interface Document {
  id: string;
  client_id: string;
  category: DocumentCategory;
  visibility: string;
  name: string;
  label: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_verified: boolean | null;
  created_at: string;
}

interface DocumentsModuleProps {
  profile: UserProfile;
}

export function DocumentsModule({ profile }: DocumentsModuleProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | "all">("all");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    profile.role === "client" ? profile.id : ""
  );
  const [clients, setClients] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);

  // Pending upload — category picker
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState<DocumentCategory>("other");
  const [pendingLabel, setPendingLabel] = useState("");
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isAgent = profile.role === "agent";
  const isClient = profile.role === "client";

  useEffect(() => {
    const supabase = createClient();

    async function loadClients() {
      if (isClient) return;
      const query = supabase.from("user_profiles").select("id, first_name, last_name").eq("role", "client");
      if (isAgent) query.eq("assigned_agent_id", profile.id);
      const { data } = await query;
      if (data?.length) {
        setClients(data);
        if (!selectedClientId) setSelectedClientId(data[0].id);
      }
    }

    loadClients();
  }, [profile.id, profile.role, isAdmin, isAgent, isClient, selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) return;
    loadDocuments();
  }, [selectedClientId]);

  async function loadDocuments() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("client_id", selectedClientId)
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
    setLoading(false);
  }

  // Step 1: file selected → show category picker
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setPendingCategory("other");
    setPendingLabel("");
    // Generate local preview URL
    if (file.type.startsWith("image/")) {
      setPendingPreviewUrl(URL.createObjectURL(file));
    } else {
      setPendingPreviewUrl(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  // Step 2: confirmed → actual upload
  async function handleUpload() {
    if (!pendingFile || !selectedClientId) return;
    setUploading(true);
    const supabase = createClient();
    const ext = pendingFile.name.split(".").pop();
    const path = `${selectedClientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(path, pendingFile, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      toast("error", `Erreur upload : ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("documents").insert({
      client_id: selectedClientId,
      uploaded_by: profile.id,
      category: pendingCategory,
      visibility: "client",
      name: pendingFile.name,
      label: pendingLabel || null,
      storage_path: path,
      mime_type: pendingFile.type,
      size_bytes: pendingFile.size,
    });

    if (dbError) toast("error", `Erreur : ${dbError.message}`);
    else { toast("success", "Document téléversé"); await loadDocuments(); }

    setPendingFile(null);
    setPendingPreviewUrl(null);
    setUploading(false);
  }

  async function handlePreview(doc: Document) {
    setPreviewDoc(doc);
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.storage_path, 300);
    setPreviewUrl(data?.signedUrl ?? null);
  }

  async function handleDownload(doc: Document) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.storage_path, 60);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = doc.name;
      a.click();
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;
    const supabase = createClient();
    await supabase.storage.from("client-documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    toast("success", "Document supprimé");
    await loadDocuments();
  }

  const filtered = documents.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.label ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || d.category === filterCategory;
    return matchSearch && matchCat;
  });

  const isPdf = (mime: string | null) => mime === "application/pdf";
  const isImage = (mime: string | null) => mime?.startsWith("image/") ?? false;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {profile.role === "client" ? "Mes documents" : "Documents"}
          </h2>
          <p className="mt-1 text-sm text-white/40">{filtered.length} document{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <label className={cn(
          "flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors",
          uploading ? "bg-blue-600/50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
        )}>
          <Upload className="h-4 w-4" />
          {uploading ? "Upload…" : "Ajouter"}
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelected} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.webp" />
        </label>
      </div>

      {/* Client selector (admin/agent) */}
      {!isClient && clients.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">Client :</span>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#1a1a20]">
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-52 rounded-xl border border-white/10 bg-[#16161c] pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...Object.keys(CATEGORY_LABELS)] as (DocumentCategory | "all")[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                filterCategory === cat
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70"
              )}
            >
              {cat === "all" ? "Tous" : CATEGORY_LABELS[cat as DocumentCategory]}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <FileText className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/40">Aucun document trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="group relative rounded-2xl border border-white/8 bg-white/3 p-4 transition-all hover:border-white/15 hover:bg-white/5"
            >
              {/* Icon */}
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                {isImage(doc.mime_type) ? (
                  <ImageIcon className="h-5 w-5 text-blue-400" />
                ) : (
                  <FileText className="h-5 w-5 text-white/40" />
                )}
              </div>

              {/* Name */}
              <p className="truncate text-sm font-medium text-white" title={doc.name}>
                {doc.label ? COMPANY_DOC_LABELS[doc.label] ?? doc.label : doc.name}
              </p>
              <p className="mt-0.5 text-xs text-white/30">
                {CATEGORY_LABELS[doc.category]} · {formatFileSize(doc.size_bytes)}
              </p>
              <p className="mt-1 text-[11px] text-white/20">{formatDate(doc.created_at)}</p>

              {/* Verified badge */}
              {doc.is_verified && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Vérifié
                </div>
              )}

              {/* Visibility */}
              {doc.visibility !== "client" && isAdmin && (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                  <Shield className="h-3 w-3" />
                  {doc.visibility === "private" ? "Privé" : "Interne"}
                </div>
              )}

              {/* Actions */}
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => handlePreview(doc)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDownload(doc)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {(isAdmin || doc.client_id === profile.id) && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Picker Modal */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <p className="font-semibold text-white">Classer le document</p>
              <button
                onClick={() => { setPendingFile(null); setPendingPreviewUrl(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* File preview */}
              <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
                {pendingPreviewUrl ? (
                  <img
                    src={pendingPreviewUrl}
                    alt={pendingFile.name}
                    className="max-h-48 w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-white/30">
                    <FileText className="h-10 w-10" />
                    <p className="text-sm">{pendingFile.name}</p>
                    <p className="text-xs">{formatFileSize(pendingFile.size)}</p>
                  </div>
                )}
                {pendingPreviewUrl && (
                  <div className="border-t border-white/8 px-3 py-2">
                    <p className="truncate text-xs text-white/40">{pendingFile.name} · {formatFileSize(pendingFile.size)}</p>
                  </div>
                )}
              </div>

              {/* Category selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Catégorie</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPendingCategory(cat)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all",
                        pendingCategory === cat
                          ? "border-blue-500/60 bg-blue-500/15 text-blue-300"
                          : "border-white/8 bg-white/3 text-white/50 hover:border-white/15 hover:text-white/80"
                      )}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional label */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Libellé <span className="normal-case font-normal text-white/30">(optionnel)</span>
                </p>
                <input
                  value={pendingLabel}
                  onChange={(e) => setPendingLabel(e.target.value)}
                  placeholder="Ex : Passeport, Bail 2024…"
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/30"
                />
              </div>
            </div>

            <div className="flex gap-3 border-t border-white/8 px-5 py-4">
              <button
                onClick={() => { setPendingFile(null); setPendingPreviewUrl(null); }}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Envoi…" : "Téléverser"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#141418]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="font-semibold text-white">{previewDoc.name}</p>
                <p className="text-xs text-white/40">{formatFileSize(previewDoc.size_bytes)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/12 hover:text-white"
                >
                  <Download className="h-3.5 w-3.5" />
                  Télécharger
                </button>
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewUrl(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto p-4">
              {!previewUrl ? (
                <div className="animate-pulse text-sm text-white/30">Chargement…</div>
              ) : isPdf(previewDoc.mime_type) ? (
                <iframe src={previewUrl} className="h-[70vh] w-full rounded-lg" title={previewDoc.name} />
              ) : isImage(previewDoc.mime_type) ? (
                <img src={previewUrl} alt={previewDoc.name} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
              ) : (
                <div className="py-16 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-white/20" />
                  <p className="text-sm text-white/40">Aperçu non disponible pour ce format.</p>
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Télécharger
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
