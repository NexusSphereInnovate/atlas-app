"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Receipt, TrendingUp, Building2, DollarSign, ArrowRight, CheckCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useLang } from "@/lib/contexts/language-context";
import type { UserProfile } from "@/types/profile";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  info_submitted: "#3b82f6",
  kyc_required: "#f59e0b",
  kyc_in_review: "#8b5cf6",
  submitted_companies_house: "#06b6d4",
  company_created: "#10b981",
  branch_preparation: "#f43f5e",
};

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getLast6Months(lang: string) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: (lang === "fr" ? MONTHS_FR : MONTHS_EN)[d.getMonth()],
      total: 0,
    };
  });
}

interface AdminDashboardProps {
  profile: UserProfile;
}

export function AdminDashboard({ profile }: AdminDashboardProps) {
  const { fmt } = useCurrency();
  const { t, lang } = useLang();

  const [stats, setStats] = useState({
    clientCount: 0, agentCount: 0,
    pendingInvoices: 0, pendingCommissions: 0,
    monthRevenue: 0, openRequests: 0,
  });
  const [revenueData, setRevenueData] = useState<{ label: string; v: number }[]>([]);
  const [requestsByStatus, setRequestsByStatus] = useState<{ status: string; count: number }[]>([]);
  const [recentClients, setRecentClients] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null; created_at: string }[]>([]);
  const [pendingInvoiceList, setPendingInvoiceList] = useState<{ id: string; invoice_number: string; total: number; due_date: string | null }[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [
        { count: clientCount },
        { count: agentCount },
        { data: sentInvoices },
        // Récupère TOUTES les factures payées sans filtre date (évite les NULL paid_at)
        { data: paidInvoices },
        { data: commissions },
        { data: requests },
        { data: clients },
        { data: pendingInv },
      ] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
        supabase.from("invoices").select("total, status").in("status", ["sent", "overdue"]),
        // Plus robuste : pas de filtre paid_at (utilise updated_at comme fallback)
        supabase.from("invoices").select("total, paid_at, updated_at").eq("status", "paid"),
        supabase.from("commissions").select("amount, status").eq("status", "pending"),
        supabase.from("company_requests").select("status"),
        supabase.from("user_profiles").select("id, first_name, last_name, email, created_at").eq("role", "client").order("created_at", { ascending: false }).limit(5),
        supabase.from("invoices").select("id, invoice_number, total, due_date").in("status", ["sent", "overdue"]).order("due_date", { ascending: true }).limit(4),
      ]);

      // Revenue par mois — utilise paid_at si disponible, sinon updated_at
      const months = getLast6Months(lang);
      paidInvoices?.forEach((inv) => {
        const dateStr = inv.paid_at ?? inv.updated_at;
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (date < sixMonthsAgo) return; // filtrer client-side
        const key = dateStr.slice(0, 7);
        const m = months.find((x) => x.key === key);
        if (m) m.total += Number(inv.total ?? 0);
      });

      const currentMonthKey = new Date().toISOString().slice(0, 7);
      const currentMonth = months.find((m) => m.key === currentMonthKey);

      const pendingTotal = sentInvoices?.reduce((s, i) => s + Number(i.total ?? 0), 0) ?? 0;
      const comTotal = commissions?.reduce((s, c) => s + Number(c.amount ?? 0), 0) ?? 0;

      const statusMap: Record<string, number> = {};
      requests?.forEach((r) => {
        statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
      });

      setStats({
        clientCount: clientCount ?? 0,
        agentCount: agentCount ?? 0,
        pendingInvoices: Math.round(pendingTotal),
        pendingCommissions: Math.round(comTotal),
        monthRevenue: Math.round(currentMonth?.total ?? 0),
        openRequests: requests?.filter((r) => r.status !== "company_created").length ?? 0,
      });
      setRevenueData(months.map((m) => ({ label: m.label, v: Math.round(m.total) })));
      setRequestsByStatus(Object.entries(statusMap).map(([status, count]) => ({ status, count })));
      setRecentClients(clients ?? []);
      setPendingInvoiceList(pendingInv ?? []);
    }

    load();

    // Realtime : recharger quand une facture change
    const channel = supabase
      .channel("dashboard-invoices")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lang]);

  const statusLabel = (s: string) => t(`status.${s}` as Parameters<typeof t>[0]) || s;

  const kpis = [
    { label: lang === "fr" ? "Clients actifs" : "Active clients",      value: stats.clientCount,                  color: "blue",    href: "/dashboard/clients",         icon: Users },
    { label: lang === "fr" ? "Agents" : "Agents",                       value: stats.agentCount,                   color: "violet",  href: "/dashboard/agents",          icon: Users },
    { label: lang === "fr" ? "Factures en attente" : "Pending invoices",value: fmt(stats.pendingInvoices),         color: "amber",   href: "/dashboard/invoices",        icon: Receipt },
    { label: lang === "fr" ? "Commissions dues" : "Commissions due",    value: fmt(stats.pendingCommissions),      color: "emerald", href: "/dashboard/commissions",     icon: DollarSign },
    { label: lang === "fr" ? "Dossiers ouverts" : "Open files",         value: stats.openRequests,                 color: "cyan",    href: "/dashboard/company-requests",icon: Building2 },
    { label: lang === "fr" ? "CA ce mois" : "Revenue this month",       value: fmt(stats.monthRevenue),            color: "pink",    href: "/dashboard/invoices",        icon: TrendingUp },
  ];

  const colorMap: Record<string, string> = {
    blue:    "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    violet:  "from-violet-500/20 to-violet-600/5 border-violet-500/20 text-violet-400",
    amber:   "from-amber-500/20 to-amber-600/5 border-amber-500/20 text-amber-400",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
    cyan:    "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 text-cyan-400",
    pink:    "from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400",
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 shadow-xl">
        <p className="text-xs text-white/50">{label}</p>
        <p className="text-sm font-semibold text-white">{fmt(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {lang === "fr" ? `Bonjour, ${profile.first_name} 👋` : `Hello, ${profile.first_name} 👋`}
        </h2>
        <p className="mt-1 text-sm text-white/40">
          {lang === "fr" ? "Vue globale de la plateforme Atlas" : "Atlas platform overview"}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-all hover:scale-[1.02]",
                colorMap[kpi.color]
              )}
            >
              <Icon className="h-4 w-4 mb-3 opacity-80" />
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <p className="mt-0.5 text-[11px] text-white/50">{kpi.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="col-span-2 rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {lang === "fr" ? "Chiffre d'affaires" : "Revenue"}
              </p>
              <p className="text-xs text-white/40">
                {lang === "fr" ? "6 derniers mois (factures payées)" : "Last 6 months (paid invoices)"}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-white/30" />
          </div>
          {revenueData.every((d) => d.v === 0) ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-sm text-white/30">
                {lang === "fr" ? "Aucune facture payée sur cette période" : "No paid invoices this period"}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : String(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">
              {lang === "fr" ? "Créations par statut" : "Files by status"}
            </p>
            <p className="text-xs text-white/40">
              {requestsByStatus.reduce((s, r) => s + r.count, 0)} {lang === "fr" ? "dossiers" : "files"}
            </p>
          </div>
          {requestsByStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={requestsByStatus} dataKey="count" nameKey="status" innerRadius={35} outerRadius={55}>
                    {requestsByStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-1.5">
                {requestsByStatus.map((r) => (
                  <li key={r.status} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[r.status] ?? "#6b7280" }} />
                      <span className="text-white/60">{statusLabel(r.status)}</span>
                    </span>
                    <span className="font-semibold text-white">{r.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-8 text-center text-xs text-white/30">
              {lang === "fr" ? "Aucun dossier" : "No files"}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              {lang === "fr" ? "Clients récents" : "Recent clients"}
            </p>
            <Link href="/dashboard/clients" className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70">
              {lang === "fr" ? "Voir tous" : "View all"} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentClients.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/30">
              {lang === "fr" ? "Aucun client" : "No clients yet"}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[11px] font-bold text-white">
                      {(c.first_name?.[0] ?? "") + (c.last_name?.[0] ?? "")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-white/40">{c.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-white/30">{formatDate(c.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">
              {lang === "fr" ? "Factures en attente" : "Pending invoices"}
            </p>
            <Link href="/dashboard/invoices" className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70">
              {lang === "fr" ? "Voir toutes" : "View all"} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {pendingInvoiceList.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/30">
              {lang === "fr" ? "Aucune facture en attente" : "No pending invoices"}
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {pendingInvoiceList.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{inv.invoice_number}</p>
                    {inv.due_date && (
                      <p className="text-xs text-amber-400">
                        {lang === "fr" ? "Échéance" : "Due"} : {formatDate(inv.due_date)}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white">{fmt(inv.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
