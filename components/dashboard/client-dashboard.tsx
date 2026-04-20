"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle, Clock, AlertCircle, FileText,
  Receipt, Building2, ChevronRight, Award,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";
import type { CompanyRequestStatus } from "@/types/database";

const STATUS_STEPS: { status: CompanyRequestStatus; label: string; description: string }[] = [
  { status: "draft", label: "Dossier ouvert", description: "Votre demande est en cours de complétion" },
  { status: "info_submitted", label: "Informations soumises", description: "Vos informations ont été transmises" },
  { status: "kyc_required", label: "Vérification d'identité", description: "Veuillez fournir vos documents KYC" },
  { status: "kyc_in_review", label: "KYC en cours", description: "Vos documents sont en cours d'examen" },
  { status: "submitted_companies_house", label: "Soumis à Companies House", description: "Votre dossier a été déposé" },
  { status: "company_created", label: "Société créée ✓", description: "Votre société est immatriculée" },
  { status: "branch_preparation", label: "Préparation succursale", description: "Votre succursale est en préparation" },
];

const STATUS_ORDER: CompanyRequestStatus[] = [
  "draft", "info_submitted", "kyc_required", "kyc_in_review",
  "submitted_companies_house", "company_created", "branch_preparation",
];

interface CompanyRequest {
  id: string;
  status: CompanyRequestStatus;
  proposed_names: string[];
  needs_branch_ch: boolean;
  needs_branch_fr: boolean;
  created_at: string;
  company_name_final: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface ClientDashboardProps {
  profile: UserProfile;
}

export function ClientDashboard({ profile }: ClientDashboardProps) {
  const [request, setRequest] = useState<CompanyRequest | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        { data: req },
        { data: inv },
        { count: docs },
      ] = await Promise.all([
        supabase
          .from("company_requests")
          .select("id, status, proposed_names, needs_branch_ch, needs_branch_fr, created_at, company_name_final")
          .eq("client_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("invoices")
          .select("id, invoice_number, total, status, due_date, created_at")
          .eq("client_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("client_id", profile.id),
      ]);

      setRequest(req ?? null);
      setInvoices(inv ?? []);
      setDocCount(docs ?? 0);
      setLoading(false);
    }

    load();
  }, [profile.id]);

  const currentStep = request ? STATUS_ORDER.indexOf(request.status) : -1;

  const invoiceStatusColor: Record<string, string> = {
    paid: "text-emerald-400",
    sent: "text-amber-400",
    draft: "text-white/40",
    cancelled: "text-red-400",
    overdue: "text-red-400",
  };

  const invoiceStatusLabel: Record<string, string> = {
    paid: "Payée",
    sent: "En attente",
    draft: "Brouillon",
    cancelled: "Annulée",
    overdue: "En retard",
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          Bonjour, {profile.first_name} 👋
        </h2>
        <p className="mt-1 text-sm text-white/40">Votre espace Atlas Incorporate</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Mon dossier", icon: Building2, href: "/dashboard/company-requests", color: "blue" },
          { label: "Documents", icon: FileText, href: "/dashboard/documents", color: "violet", badge: docCount > 0 ? docCount : undefined },
          { label: "Factures", icon: Receipt, href: "/dashboard/invoices", color: "amber" },
          { label: "Atlas Circle", icon: Award, href: "/dashboard/atlas-circle", color: "pink" },
        ].map((action) => {
          const Icon = action.icon;
          const colorMap: Record<string, string> = {
            blue: "from-blue-500/15 to-blue-600/5 border-blue-500/20 text-blue-400",
            violet: "from-violet-500/15 to-violet-600/5 border-violet-500/20 text-violet-400",
            amber: "from-amber-500/15 to-amber-600/5 border-amber-500/20 text-amber-400",
            pink: "from-pink-500/15 to-pink-600/5 border-pink-500/20 text-pink-400",
          };
          return (
            <Link
              key={action.label}
              href={action.href}
              className={cn(
                "relative group flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-br p-5 text-center transition-all hover:scale-[1.02]",
                colorMap[action.color]
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium text-white">{action.label}</span>
              {action.badge !== undefined && (
                <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">
                  {action.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Company Request Status */}
      {!loading && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Création de société UK LTD</p>
            {request ? (
              <Link href={`/dashboard/company-requests/${request.id}`} className="flex items-center gap-1 text-xs text-blue-400 transition-colors hover:text-blue-300">
                Voir le dossier <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link href="/dashboard/company-requests" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500">
                Commencer
              </Link>
            )}
          </div>

          {!request ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Building2 className="h-10 w-10 text-white/20" />
              <p className="text-sm text-white/40">Vous n&apos;avez pas encore de demande de création</p>
              <Link
                href="/dashboard/company-requests"
                className="mt-1 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Démarrer ma demande
              </Link>
            </div>
          ) : (
            <>
              {request.company_name_final && (
                <p className="mb-4 text-sm font-semibold text-white/80">
                  {request.company_name_final}
                </p>
              )}
              {/* Timeline */}
              <ol className="relative space-y-0">
                {STATUS_STEPS.map((step, i) => {
                  const idx = STATUS_ORDER.indexOf(step.status);
                  const done = idx < currentStep;
                  const active = idx === currentStep;
                  const last = i === STATUS_STEPS.length - 1;

                  return (
                    <li key={step.status} className="flex items-start gap-3 pb-4 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          done ? "bg-emerald-500 text-white" :
                            active ? "bg-blue-500 text-white ring-4 ring-blue-500/20" :
                              "bg-white/8 text-white/30"
                        )}>
                          {done ? <CheckCircle className="h-3.5 w-3.5" /> : active ? <Clock className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                        </div>
                        {!last && (
                          <div className={cn("mt-1 h-full w-px", done ? "bg-emerald-500/40" : "bg-white/8")} style={{ minHeight: 16 }} />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p className={cn("text-sm font-medium", active ? "text-white" : done ? "text-white/60" : "text-white/30")}>
                          {step.label}
                        </p>
                        {active && (
                          <p className="mt-0.5 text-xs text-white/40">{step.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      )}

      {/* Invoices */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Mes factures</p>
          <Link href="/dashboard/invoices" className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70">
            Voir toutes <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {invoices.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Aucune facture</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">{inv.invoice_number}</p>
                  <p className={cn("text-xs", invoiceStatusColor[inv.status] ?? "text-white/40")}>
                    {invoiceStatusLabel[inv.status] ?? inv.status}
                    {inv.due_date && ` · Échéance ${formatDate(inv.due_date)}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-white">{formatCurrency(inv.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
