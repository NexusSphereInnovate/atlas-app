"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/atlas";
import ClientPicker from "@/components/documents/client-picker";

type DocCategory =
  | "KYC"
  | "Company"
  | "Branch"
  | "Invoice"
  | "Contract"
  | "Other";

const CATEGORIES: Array<{ value: DocCategory; label: string; hint: string }> = [
  { value: "KYC", label: "KYC / Identité", hint: "Pièce d’identité, relevé bancaire, justificatifs" },
  { value: "Company", label: "Société UK", hint: "Certificate, Articles, Incorporation docs" },
  { value: "Branch", label: "Succursale", hint: "CH/FR documents" },
  { value: "Invoice", label: "Facture", hint: "Factures et preuves de paiement" },
  { value: "Contract", label: "Contrat / CGV", hint: "Contrats, CGV, conditions" },
  { value: "Other", label: "Autre", hint: "Divers" },
];

export default function DocumentsUploader({
  role,
  orgId,
  onUploaded,
}: {
  role: UserRole;
  orgId: string;
  onUploaded: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const canPickClient = role === "admin" || role === "agent";

  const [clientId, setClientId] = useState<string | null>(null);
  const [category, setCategory] = useState<DocCategory>("KYC");
  const [visibility, setVisibility] = useState<string>("client"); // client | internal
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function getMyClientId(): Promise<string | null> {
    // Option “ça fonctionne” : pour un client, on prend clientId = auth.uid()
    // (tu pourras remplacer plus tard par mapping user_profiles.client_id)
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  }

  async function handleUpload() {
    setMsg(null);

    if (!file) {
      setMsg({ type: "err", text: "Choisis un fichier." });
      return;
    }

    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;

      if (!userId) {
        setMsg({ type: "err", text: "Session expirée. Reconnecte-toi." });
        setLoading(false);
        return;
      }

      const effectiveClientId = canPickClient ? clientId : await getMyClientId();

      if (!effectiveClientId) {
        setMsg({ type: "err", text: "Client non défini. (Admin/Agent : sélectionne un client)" });
        setLoading(false);
        return;
      }

      const docId = crypto.randomUUID();

      const cleanName = file.name.replace(/[^\w.\-() ]+/g, "_");
      const objectPath = `${orgId}/${effectiveClientId}/${docId}-${cleanName}`;

      // 1) Crée la ligne document d’abord (pour policy storage insert)
      const { error: insertError } = await supabase.from("documents").insert({
        id: docId,
        org_id: orgId,
        client_id: effectiveClientId,
        category,
        file_path: objectPath,
        original_filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        visibility,
        status: "uploaded",
        uploaded_by_user_id: userId,
      });

      if (insertError) {
        setMsg({ type: "err", text: `DB: ${insertError.message}` });
        setLoading(false);
        return;
      }

      // 2) Upload storage
      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(objectPath, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        // rollback DB row
        await supabase.from("documents").delete().eq("id", docId);
        setMsg({ type: "err", text: `Storage: ${uploadError.message}` });
        setLoading(false);
        return;
      }

      setFile(null);
      setMsg({ type: "ok", text: "Document uploadé ✅" });
      onUploaded();
    } catch (e) {
      setMsg({ type: "err", text: "Erreur inconnue pendant l’upload." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {canPickClient ? (
        <ClientPicker orgId={orgId} value={clientId} onChange={setClientId} />
      ) : null}

      <div className="rounded-2xl border border-white/8 bg-[#111520]/70 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.20)]">
        <div className="px-5 pt-5">
          <div className="text-[14px] font-extrabold text-white/90 tracking-[-0.2px]">Uploader</div>
          <div className="mt-1 text-[11px] text-white/35">Ajoute un document au dossier</div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/50">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocCategory)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[13px] text-white/85 outline-none focus:border-blue-500/30"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-white/35">
                {CATEGORIES.find((c) => c.value === category)?.hint ?? ""}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-white/50">Visibilité</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[13px] text-white/85 outline-none focus:border-blue-500/30"
              >
                <option value="client">Visible client</option>
                <option value="internal">Interne (admin/agent)</option>
              </select>
              <div className="text-[11px] text-white/35">
                “Interne” = le client ne le voit pas (plus tard on filtrera côté UI).
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-[12px] font-bold text-white/70">Fichier</div>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-[12px] text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-[12px] file:font-bold file:text-white/80 hover:file:bg-white/15"
              />
              <div className="text-[11px] text-white/35">
                Chemin: <span className="text-white/60">{orgId}/&lt;client_id&gt;/&lt;doc_id&gt;-filename</span>
              </div>
            </div>
          </div>

          {msg ? (
            <div
              className={`rounded-xl border px-4 py-3 text-[13px] font-semibold ${
                msg.type === "ok"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border-rose-500/25 bg-rose-500/10 text-rose-200"
              }`}
            >
              {msg.text}
            </div>
          ) : null}

          <button
            onClick={handleUpload}
            disabled={loading}
            className={`rounded-2xl px-4 py-3 text-[13px] font-extrabold transition ${
              loading
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-white text-[#0a0c12] hover:bg-[#f0f0f0]"
            }`}
          >
            {loading ? "Upload..." : "Uploader"}
          </button>
        </div>
      </div>
    </div>
  );
}