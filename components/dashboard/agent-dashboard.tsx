"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, DollarSign, Users, ArrowRight,
  Award, Star, ChevronRight, MessageCircle, Plus,
  Clock,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";

// ─── Tier color map ───────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Bronze:   { bg: "from-[#cd7f32]/20 to-[#cd7f32]/5",   border: "border-[#cd7f32]/30",   text: "text-[#cd7f32]",   glow: "#cd7f32" },
  Silver:   { bg: "from-[#94a3b8]/20 to-[#94a3b8]/5",   border: "border-[#94a3b8]/30",   text: "text-[#94a3b8]",   glow: "#94a3b8" },
  Gold:     { bg: "from-[#eab308]/20 to-[#eab308]/5",   border: "border-[#eab308]/30",   text: "text-[#eab308]",   glow: "#eab308" },
  Elite:    { bg: "from-[#f43f5e]/20 to-[#f43f5e]/5",   border: "border-[#f43f5e]/30",   text: "text-[#f43f5e]",   glow: "#f43f5e" },
  Platinum: { bg: "from-[#06b6d4]/20 to-[#06b6d4]/5",   border: "border-[#06b6d4]/30",   text: "text-[#06b6d4]",   glow: "#06b6d4" },
};
const DEFAULT_TIER = TIER_COLORS.Bronze;

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Commission {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  invoice_id: string | null;
}

interface BonusRule {
  tier_name: string;
  min_revenue: number | null;
  bonus_amount: number | null;
  sort_order: number;
}

interface ChartPoint { m: string; v: number; }

interface AgentDashboardProps { profile: UserProfile; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLast6Months(): { label: string; year: number; month: number }[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleString("fr-FR", { month: "short" }),
      year:  d.getFullYear(),
      month: d.getMonth(),
    };
  });
}

function buildChartData(commissions: Commission[]): ChartPoint[] {
  const months = getLast6Months();
  return months.map(({ label, year, month }) => ({
    m: label.charAt(0).toUpperCase() + label.slice(1),
    v: commissions
      .filter(c => {
        const d = new Date(c.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, c) => sum + (c.amount ?? 0), 0),
  }));
}

function getCurrentTier(rules: BonusRule[], totalRevenue: number): BonusRule | null {
  const sorted = [...rules].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0));
  return sorted.find(r => totalRevenue >= (r.min_revenue ?? 0)) ?? rules[0] ?? null;
}

function getNextTier(rules: BonusRule[], currentTier: BonusRule | null): BonusRule | null {
  if (!currentTier) return rules[0] ?? null;
  const sorted = [...rules].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const idx    = sorted.findIndex(r => r.tier_name === currentTier.tier_name);
  return sorted[idx + 1] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AgentDashboard({ profile }: AgentDashboardProps) {
  const [commissions,    setCommissions]    = useState<Commission[]>([]);
  const [recentClients,  setRecentClients]  = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; created_at: string }[]>([]);
  const [bonusRules,     setBonusRules]     = useState<BonusRule[]>([]);
  const [clientCount,    setClientCount]    = useState(0);
  const [chartData,      setChartData]      = useState<ChartPoint[]>([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        { count },
        { data: coms },
        { data: clients },
        { data: rules },
      ] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("assigned_agent_id", profile.id),
        supabase.from("commissions").select("id,amount,status,created_at,invoice_id").eq("agent_id", profile.id).order("created_at"),
        supabase.from("user_profiles").select("id,first_name,last_name,email,phone,created_at").eq("assigned_agent_id", profile.id).eq("role","client").order("created_at",{ascending:false}).limit(5),
        supabase.from("agent_bonus_rules").select("tier_name,min_revenue,bonus_amount,sort_order").order("sort_order"),
      ]);

      const allComs = coms ?? [];
      setCommissions(allComs);
      setRecentClients(clients ?? []);
      setBonusRules(rules ?? []);
      setClientCount(count ?? 0);
      setChartData(buildChartData(allComs));
      setLoading(false);
    }

    load();
  }, [profile.id]);

  // Derived values
  const totalCommissions   = commissions.reduce((s, c) => s + (c.amount ?? 0), 0);
  const paidCommissions    = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const pendingCommissions = commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);

  const currentTier = getCurrentTier(bonusRules, paidCommissions);
  const nextTier    = getNextTier(bonusRules, currentTier);

  const tierName    = currentTier?.tier_name ?? "Bronze";
  const tierColors  = TIER_COLORS[tierName] ?? DEFAULT_TIER;
  const nextRevenue = nextTier?.min_revenue ?? 0;
  const progressPct = nextRevenue > 0
    ? Math.min(100, (paidCommissions / nextRevenue) * 100)
    : 100;

  const thisMonthV  = chartData[chartData.length - 1]?.v ?? 0;
  const lastMonthV  = chartData[chartData.length - 2]?.v ?? 0;
  const monthDiff   = thisMonthV - lastMonthV;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"/></div>;
  }

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Bonjour, {profile.first_name} 👋</h2>
          <p className="mt-1 text-sm text-white/40">Votre espace apporteur d&apos;affaires</p>
        </div>
        <Link href="/dashboard/clients/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
          <Plus className="h-4 w-4"/>
          Nouveau client
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Clients", value: String(clientCount), icon: Users, color: "text-blue-400" },
          { label: "Commissions payées", value: formatCurrency(paidCommissions), icon: DollarSign, color: "text-emerald-400" },
          { label: "En attente", value: formatCurrency(pendingCommissions), icon: Clock, color: "text-amber-400" },
          { label: "Palier actuel", value: tierName, icon: Award, color: tierColors.text },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <Icon className={cn("h-4 w-4 mb-3", k.color)}/>
              <p className="text-lg font-bold text-white">{k.value}</p>
              <p className="mt-0.5 text-xs text-white/40">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* Agent Card + Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Atlas Agent Card */}
        <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5", tierColors.bg, tierColors.border)}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-widest">Atlas Agent</p>
              <p className={cn("mt-1 text-2xl font-bold", tierColors.text)}>{tierName}</p>
            </div>
            <Award className={cn("h-8 w-8 opacity-60", tierColors.text)}/>
          </div>
          <div className="mt-4">
            <p className="text-xs text-white/40">{profile.first_name} {profile.last_name}</p>
            <p className="mt-0.5 text-[11px] text-white/25">Apporteur d&apos;affaires certifié</p>
          </div>

          {/* Progress toward next tier */}
          <div className="mt-5">
            {nextTier ? (
              <>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/40">Vers {nextTier.tier_name}</span>
                  <span className={cn("font-semibold", tierColors.text)}>{Math.round(progressPct)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${progressPct}%`, background: tierColors.glow }}/>
                </div>
                <p className="mt-1.5 text-[11px] text-white/30">
                  {formatCurrency(Math.max(0, nextRevenue - paidCommissions))} avant prochain palier
                </p>
              </>
            ) : (
              <p className="text-xs text-white/40">🏆 Palier maximum atteint</p>
            )}
          </div>

          {/* Bonus rules list */}
          {bonusRules.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Paliers & bonus</p>
              {bonusRules.map((r) => (
                <div key={r.tier_name}
                  className={cn("flex items-center justify-between text-xs rounded-lg px-2 py-1",
                    r.tier_name === tierName ? "bg-white/10" : "")}>
                  <span className="flex items-center gap-1.5">
                    <Star className={cn("h-3 w-3", r.tier_name === tierName ? tierColors.text : "text-white/25")}/>
                    <span className={r.tier_name === tierName ? "text-white font-semibold" : "text-white/50"}>
                      {r.tier_name}
                    </span>
                  </span>
                  <span className="text-white/70">
                    {r.bonus_amount ? formatCurrency(r.bonus_amount) : "—"}
                    {r.min_revenue ? <span className="text-white/30 text-[10px]"> / {formatCurrency(r.min_revenue)}</span> : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commission Chart — données réelles */}
        <div className="col-span-2 rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Commissions</p>
              <p className="text-xs text-white/40">6 derniers mois</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Ce mois</p>
              <p className={cn("text-sm font-bold",
                monthDiff >= 0 ? "text-emerald-400" : "text-red-400")}>
                {formatCurrency(thisMonthV)}
                {lastMonthV > 0 && (
                  <span className="ml-1 text-[10px] text-white/30">
                    {monthDiff >= 0 ? "▲" : "▼"} {Math.abs(Math.round(((monthDiff) / lastMonthV) * 100))}%
                  </span>
                )}
              </p>
            </div>
          </div>

          {chartData.every(p => p.v === 0) ? (
            <div className="flex h-[180px] items-center justify-center">
              <p className="text-sm text-white/20">Aucune commission sur cette période</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="comGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="m" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}£`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#comGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Summary row */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/8 pt-4">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Total</p>
              <p className="text-sm font-semibold text-white">{formatCurrency(totalCommissions)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Payées</p>
              <p className="text-sm font-semibold text-emerald-400">{formatCurrency(paidCommissions)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">En attente</p>
              <p className="text-sm font-semibold text-amber-400">{formatCurrency(pendingCommissions)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commissions récentes */}
      {commissions.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <p className="mb-4 text-sm font-semibold text-white">Commissions récentes</p>
          <ul className="divide-y divide-white/5">
            {[...commissions].reverse().slice(0, 8).map(c => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-white/70">
                    {c.invoice_id ? `Facture #${c.invoice_id.slice(0,8)}` : "Commission manuelle"}
                  </p>
                  <p className="text-xs text-white/30">{formatDate(c.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(c.amount)}</p>
                  <span className={cn("text-[10px] rounded-full px-2 py-0.5",
                    c.status === "paid"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400")}>
                    {c.status === "paid" ? "Payée" : "En attente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clients récents */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Mes clients récents</p>
          <Link href="/dashboard/clients" className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70">
            Voir tous <ArrowRight className="h-3 w-3"/>
          </Link>
        </div>
        {recentClients.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Aucun client pour l&apos;instant</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {recentClients.map(c => (
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
                <div className="flex items-center gap-2">
                  {c.phone && (
                    <a href={`https://wa.me/${c.phone.replace(/\D/g,"")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25">
                      <MessageCircle className="h-3.5 w-3.5"/>
                    </a>
                  )}
                  <Link href={`/dashboard/clients/${c.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-white/40 hover:bg-white/10 hover:text-white">
                    <ChevronRight className="h-3.5 w-3.5"/>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
