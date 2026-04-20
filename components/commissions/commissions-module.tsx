"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { DollarSign, TrendingUp, Clock, CheckCircle, ChevronDown } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import type { UserProfile } from "@/types/profile";
import type { CommissionStatus } from "@/types/database";

const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: "En attente",
  validated: "Validée",
  paid: "Payée",
  cancelled: "Annulée",
};

const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  validated: "bg-blue-500/15 text-blue-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

interface Commission {
  id: string;
  agent_id: string;
  amount: number;
  currency: string;
  status: CommissionStatus;
  type: string;
  rate: number | null;
  created_at: string;
  paid_at: string | null;
  invoice_id: string | null;
  agent?: { first_name: string | null; last_name: string | null };
  invoice?: { invoice_number: string } | null;
}

interface CommissionsModuleProps {
  profile: UserProfile;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function CommissionsModule({ profile }: CommissionsModuleProps) {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();

    let query = supabase
      .from("commissions")
      .select(`
        id, agent_id, amount, currency, status, type, rate, created_at, paid_at, invoice_id,
        agent:user_profiles!commissions_agent_id_fkey(first_name, last_name),
        invoice:invoices(invoice_number)
      `)
      .order("created_at", { ascending: false });

    if (!isAdmin) query = query.eq("agent_id", profile.id);

    const { data } = await query;
    setCommissions((data ?? []) as unknown as Commission[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: CommissionStatus) {
    setUpdatingId(id);
    const supabase = createClient();
    const patch: Record<string, unknown> = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();

    const { error } = await supabase.from("commissions").update(patch).eq("id", id);
    if (error) {
      toast("error", `Erreur : ${error.message}`);
    } else {
      toast("success", "Statut mis à jour");
      await load();
    }
    setUpdatingId(null);
  }

  const filtered = commissions.filter(
    (c) => statusFilter === "all" || c.status === statusFilter
  );

  const totals = {
    total: commissions.reduce((s, c) => s + c.amount, 0),
    paid: commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0),
    pending: commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0),
  };

  // Monthly chart data (last 6 months)
  const chartData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("fr-FR", { month: "short" });
      months[key] = 0;
    }
    commissions.filter((c) => c.status === "paid").forEach((c) => {
      const key = new Date(c.created_at).toLocaleDateString("fr-FR", { month: "short" });
      if (key in months) months[key] += c.amount;
    });
    return Object.entries(months).map(([m, v]) => ({ m, v }));
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Commissions</h2>
        <p className="mt-1 text-sm text-white/40">{filtered.length} entrée{filtered.length !== 1 ? "s" : ""}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <TrendingUp className="mb-2 h-4 w-4 text-white/40" />
          <p className="text-xl font-bold text-white">{formatCurrency(totals.total)}</p>
          <p className="mt-0.5 text-xs text-white/40">Total commissions</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
          <CheckCircle className="mb-2 h-4 w-4 text-emerald-400" />
          <p className="text-xl font-bold text-white">{formatCurrency(totals.paid)}</p>
          <p className="mt-0.5 text-xs text-white/40">Commissions payées</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 sm:col-span-1">
          <Clock className="mb-2 h-4 w-4 text-amber-400" />
          <p className="text-xl font-bold text-white">{formatCurrency(totals.pending)}</p>
          <p className="mt-0.5 text-xs text-white/40">En attente</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-sm font-semibold text-white">Commissions payées / mois</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="m" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}£`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="v" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "validated", "paid", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === s
                ? "bg-white/15 text-white"
                : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70"
            )}
          >
            {s === "all" ? "Toutes" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <DollarSign className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/40">Aucune commission</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5">
                    <DollarSign className="h-4 w-4 text-white/40" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{formatCurrency(c.amount, c.currency)}</p>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", STATUS_COLORS[c.status])}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    {isAdmin && c.agent && (
                      <p className="text-xs text-white/40">
                        Agent : {(c.agent as unknown as { first_name: string | null; last_name: string | null }).first_name}{" "}
                        {(c.agent as unknown as { first_name: string | null; last_name: string | null }).last_name}
                      </p>
                    )}
                    {c.invoice && (
                      <p className="text-xs text-white/40">
                        Facture {(c.invoice as unknown as { invoice_number: string }).invoice_number}
                      </p>
                    )}
                    <p className="text-xs text-white/30">
                      {c.type === "percentage" && c.rate !== null ? `${c.rate}%` : "Montant fixe"}
                      {" · "}Créé le {formatDate(c.created_at)}
                      {c.paid_at && <> · Payé le {formatDate(c.paid_at)}</>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin actions */}
              {isAdmin && c.status !== "paid" && c.status !== "cancelled" && (
                <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
                  {c.status === "pending" && (
                    <button
                      onClick={() => updateStatus(c.id, "validated")}
                      disabled={updatingId === c.id}
                      className="rounded-lg border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-40"
                    >
                      Valider
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(c.id, "paid")}
                    disabled={updatingId === c.id}
                    className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    Marquer payée
                  </button>
                  <button
                    onClick={() => updateStatus(c.id, "cancelled")}
                    disabled={updatingId === c.id}
                    className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
