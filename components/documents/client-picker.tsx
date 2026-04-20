"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ClientRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  email?: string | null;
};

export default function ClientPicker({
  orgId,
  value,
  onChange,
}: {
  orgId: string;
  value: string | null;
  onChange: (clientId: string | null) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState<boolean>(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, company_name, email")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!cancelled) {
        if (error) {
          setClients([]);
        } else {
          setClients((data as ClientRow[]) ?? []);
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, supabase]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return clients;
    return clients.filter((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim().toLowerCase();
      const comp = (c.company_name ?? "").toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      return name.includes(qq) || comp.includes(qq) || email.includes(qq) || c.id.toLowerCase().includes(qq);
    });
  }, [clients, q]);

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111520]/70 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.20)]">
      <div className="px-5 pt-5">
        <div className="text-[14px] font-extrabold text-white/90 tracking-[-0.2px]">Client</div>
        <div className="mt-1 text-[11px] text-white/35">Sélection pour upload / filtre</div>
      </div>

      <div className="p-5 flex flex-col gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, entreprise, email...)"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[13px] text-white/85 placeholder:text-white/25 outline-none focus:border-blue-500/30"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(null)}
            className={`rounded-xl px-3 py-2 text-[12px] font-semibold border ${
              value === null
                ? "border-blue-500/25 bg-blue-500/10 text-blue-200"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/7"
            }`}
          >
            Tous
          </button>

          <div className="text-[12px] text-white/35">{loading ? "Chargement..." : `${filtered.length} clients`}</div>
        </div>

        <div className="max-h-[320px] overflow-auto pr-1">
          {filtered.map((c) => {
            const label =
              c.company_name?.trim()
                ? c.company_name
                : `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email || c.id;

            const active = value === c.id;

            return (
              <button
                key={c.id}
                onClick={() => onChange(c.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition ${
                  active
                    ? "border-blue-500/25 bg-blue-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/7"
                }`}
              >
                <div className="text-[13px] font-semibold text-white/85 truncate">{label}</div>
                <div className="mt-0.5 text-[11px] text-white/35 truncate">
                  {c.email ? c.email : c.id}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}