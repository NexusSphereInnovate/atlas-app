"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/atlas";
import ClientPicker from "@/components/documents/client-picker";

type DocRow = {
  id: string;
  org_id: string;
  client_id: string;
  category: string;
  file_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: string;
  status: string;
  uploaded_by_user_id: string | null;
  created_at: string;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function isPreviewable(mime: string | null) {
  if (!mime) return false;
  return mime.includes("pdf") || mime.startsWith("image/");
}

export default function DocumentsList({ role, orgId }: { role: UserRole; orgId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const canPickClient = role === "admin" || role === "agent";

  const [clientId, setClientId] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [filter, setFilter] = useState<string>("all"); // all | client | internal
  const [q, setQ] = useState<string>("");

  const [preview, setPreview] = useState<{ url: string; name: string; mime: string | null } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    let query = supabase
      .from("documents")
      .select("id, org_id, client_id, category, file_path, original_filename, mime_type, size_bytes, visibility, status, uploaded_by_user_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (canPickClient && clientId) {
      query = query.eq("client_id", clientId);
    }

    if (filter !== "all") {
      query = query.eq("visibility", filter);
    }

    const { data, error } = await query;

    if (error) {
      setDocs([]);
      setLoading(false);
      return;
    }

    const list = (data as DocRow[]) ?? [];
    setDocs(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, clientId, filter]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return docs;
    return docs.filter((d) => {
      const name = (d.original_filename ?? "").toLowerCase();
      const cat = (d.category ?? "").toLowerCase();
      const id = d.id.toLowerCase();
      return name.includes(qq) || cat.includes(qq) || id.includes(qq);
    });
  }, [docs, q]);

  async function getSignedUrl(filePath: string) {
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(filePath, 60 * 10);

    if (error) return null;
    return data?.signedUrl ?? null;
  }

  async function onPreview(d: DocRow) {
    setBusyId(d.id);
    const url = await getSignedUrl(d.file_path);
    if (!url) {
      setBusyId(null);
      return;
    }
    setPreview({ url, name: d.original_filename ?? d.id, mime: d.mime_type });
    setBusyId(null);
  }

  async function onDownload(d: DocRow) {
    setBusyId(d.id);
    const url = await getSignedUrl(d.file_path);
    if (!url) {
      setBusyId(null);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setBusyId(null);
  }

  async function onDelete(d: DocRow) {
    const ok = window.confirm("Supprimer ce document ? (fichier + ligne DB)");
    if (!ok) return;

    setBusyId(d.id);

    // delete storage first
    await supabase.storage.from("client-documents").remove([d.file_path]);

    // then delete db row
    await supabase.from("documents").delete().eq("id", d.id);

    setBusyId(null);
    await load();
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111520]/70 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.20)]">
      <div className="px-5 pt-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-extrabold text-white/90 tracking-[-0.2px]">Liste</div>
          <div className="mt-1 text-[11px] text-white/35">Preview / download / gestion</div>
        </div>

        <button
          onClick={load}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-bold text-white/70 hover:bg-white/7"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {canPickClient ? (
          <ClientPicker orgId={orgId} value={clientId} onChange={setClientId} />
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (nom, catégorie, id...)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[13px] text-white/85 placeholder:text-white/25 outline-none focus:border-blue-500/30"
          />

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-[200px] rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[13px] text-white/85 outline-none focus:border-blue-500/30"
          >
            <option value="all">Toutes</option>
            <option value="client">Visibles client</option>
            <option value="internal">Interne</option>
          </select>
        </div>

        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-[13px] text-white/60">
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-[13px] text-white/60">
            Aucun document.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/7 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-extrabold text-white/85 truncate">
                      {d.original_filename ?? d.id}
                    </div>
                    <div className="mt-1 text-[11px] text-white/40 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">
                        {d.category}
                      </span>
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">
                        {d.visibility}
                      </span>
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">
                        {formatBytes(d.size_bytes)}
                      </span>
                      <span className="text-white/35">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPreviewable(d.mime_type) ? (
                      <button
                        onClick={() => onPreview(d)}
                        disabled={busyId === d.id}
                        className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-[12px] font-bold text-blue-200 hover:bg-blue-500/15 disabled:opacity-50"
                      >
                        {busyId === d.id ? "..." : "Voir"}
                      </button>
                    ) : null}

                    <button
                      onClick={() => onDownload(d)}
                      disabled={busyId === d.id}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-bold text-white/75 hover:bg-white/7 disabled:opacity-50"
                    >
                      Télécharger
                    </button>

                    <button
                      onClick={() => onDelete(d)}
                      disabled={busyId === d.id}
                      className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[12px] font-bold text-rose-200 hover:bg-rose-500/15 disabled:opacity-50"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {preview ? (
          <div className="rounded-2xl border border-white/10 bg-[#0a0c12]/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-extrabold text-white/85 truncate">
                Preview: {preview.name}
              </div>
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-bold text-white/70 hover:bg-white/7"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/20">
              {preview.mime?.includes("pdf") ? (
                <iframe
                  src={preview.url}
                  className="w-full h-[520px]"
                  title="PDF Preview"
                />
              ) : preview.mime?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt="Preview" className="w-full max-h-[520px] object-contain bg-black/30" />
              ) : (
                <div className="p-4 text-[13px] text-white/60">
                  Preview non supporté. Utilise “Télécharger”.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}