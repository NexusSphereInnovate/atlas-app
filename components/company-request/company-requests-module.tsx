"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Building2, ChevronRight, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";
import type { CompanyRequestStatus } from "@/types/database";

const STATUS_LABELS: Record<CompanyRequestStatus, string> = {
  draft: "Brouillon",
  info_submitted: "Infos soumises",
  kyc_required: "KYC requis",
  kyc_in_review: "KYC en cours",
  identity_verification: "Vérif. identité",
  submitted_companies_house: "Soumis succursale",
  company_created: "Société créée",
  branch_preparation: "Succursale",
  completed: "Terminé ✓",
};

const STATUS_COLORS: Record<CompanyRequestStatus, string> = {
  draft: "bg-white/8 text-white/50",
  info_submitted: "bg-blue-500/15 text-blue-400",
  kyc_required: "bg-amber-500/15 text-amber-400",
  kyc_in_review: "bg-violet-500/15 text-violet-400",
  identity_verification: "bg-sky-500/15 text-sky-400",
  submitted_companies_house: "bg-cyan-500/15 text-cyan-400",
  company_created: "bg-emerald-500/15 text-emerald-400",
  branch_preparation: "bg-pink-500/15 text-pink-400",
  completed: "bg-emerald-500/20 text-emerald-300",
};

const STATUS_ICONS: Partial<Record<CompanyRequestStatus, React.ElementType>> = {
  company_created: CheckCircle,
  kyc_required: AlertCircle,
  kyc_in_review: Clock,
};

interface CompanyRequest {
  id: string;
  status: CompanyRequestStatus;
  proposed_names: string[];
  company_name_final: string | null;
  needs_branch_ch: boolean;
  needs_branch_fr: boolean;
  created_at: string;
  submitted_at: string | null;
  client_id: string;
  client?: { first_name: string | null; last_name: string | null };
}

interface CompanyRequestsModuleProps {
  profile: UserProfile;
}

export function CompanyRequestsModule({ profile }: CompanyRequestsModuleProps) {
  const [requests, setRequests] = useState<CompanyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      let query = supabase
        .from("company_requests")
        .select(`
          id, status, proposed_names, company_name_final,
          needs_branch_ch, needs_branch_fr, created_at, submitted_at, client_id,
          client:user_profiles!company_requests_client_id_fkey(first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (isClient) query = query.eq("client_id", profile.id);
      else if (profile.role === "agent") query = query.eq("assigned_agent_id", profile.id);

      const { data } = await query;
      setRequests((data ?? []) as unknown as CompanyRequest[]);
      setLoading(false);
    }
    load();
  }, [profile.id, profile.role, isClient]);

  const canCreate = profile.role !== "admin_global" && profile.role !== "admin_org";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {isClient ? "Mes dossiers" : "Créations de société"}
          </h2>
          <p className="mt-1 text-sm text-white/40">{requests.length} dossier{requests.length !== 1 ? "s" : ""}</p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/company-requests/new"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <Building2 className="h-12 w-12 text-white/15" />
          <div>
            <p className="text-sm font-medium text-white/50">Aucune demande de création</p>
            {canCreate && (
              <p className="mt-1 text-xs text-white/30">Cliquez sur &quot;Nouvelle demande&quot; pour commencer</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const displayName = req.company_name_final
              ?? (req.proposed_names?.[0] ? `${req.proposed_names[0]} Ltd` : "Société sans nom");
            const StatusIcon = STATUS_ICONS[req.status] ?? Building2;

            return (
              <Link
                key={req.id}
                href={`/dashboard/company-requests/${req.id}`}
                className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 p-5 transition-all hover:border-white/15 hover:bg-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                    <StatusIcon className="h-5 w-5 text-white/40" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{displayName}</p>
                    {isAdmin && req.client && (
                      <p className="text-xs text-white/40">
                        {req.client.first_name} {req.client.last_name}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", STATUS_COLORS[req.status])}>
                        {STATUS_LABELS[req.status]}
                      </span>
                      {req.needs_branch_ch && (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/40">🇨🇭 CH</span>
                      )}
                      {req.needs_branch_fr && (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/40">🇫🇷 FR</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="hidden text-xs text-white/30 sm:block">{formatDate(req.created_at)}</p>
                  <ChevronRight className="h-4 w-4 text-white/25 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
