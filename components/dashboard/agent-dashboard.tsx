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
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  Bronze: { bg: "from-[#cd7f32]/20 to-[#cd7f32]/5", border: "border-[#cd7f32]/30", text: "text-[#cd7f32]", glow: "#cd7f32" },
  Silver: { bg: "from-[#94a3b8]/20 to-[#94a3b8]/5", border: "border-[#94a3b8]/30", text: "text-[#94a3b8]", glow: "#94a3b8" },
  Gold: { bg: "from-[#eab308]/20 to-[#eab308]/5", border: "border-[#eab308]/30", text: "text-[#eab308]", glow: "#eab308" },
  Elite: { bg: "from-[#f43f5e]/20 to-[#f43f5e]/5", border: "border-[#f43f5e]/30", text: "text-[#f43f5e]", glow: "#f43f5e" },
  Platinum: { bg: "from-[#06b6d4]/20 to-[#06b6d4]/5", border: "border-[#06b6d4]/30", text: "text-[#06b6d4]", glow: "#06b6d4" },
};

const COMMISSION_CHART = [
  { m: "Nov", v: 640 },
  { m: "Déc", v: 980 },
  { m: "Jan", v: 820 },
  { m: "Fév", v: 1240 },
  { m: "Mar", v: 1080 },
  { m: "Avr", v: 1560 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

interface AgentDashboardProps {
  profile: UserProfile;
}

export function AgentDashboard({ profile }: AgentDashboardProps) {
  const [stats, setStats] = useState({
    clientCount: 0,
    monthSales: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    currentTier: "Bronze",
    nextTier: "Silver",
    nextTierRevenue: 5000,
  });
  const [recentClients, setRecentClients] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; created_at: string }[]>([]);
  const [bonusRules, setBonusRules] = useState<{ tier_name: string; min_revenue: number | null; bonus_amount: number | null }[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const [
        { count: clientCount },
        { data: commissions },
        { data: clients },
        { data: rules },
      ] = await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("assigned_agent_id", profile.id),
        supabase.from("commissions").select("amount, status").eq("agent_id", profile.id),
        supabase.from("user_profiles")
          .select("id, first_name, last_name, email, phone, created_at")
          .eq("assigned_agent_id", profile.id)
          .eq("role", "client")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("agent_bonus_rules").select("tier_name, min_revenue, bonus_amount").order("sort_order"),
      ]);

      const totalCom = commissions?.reduce((s, c) => s + c.amount, 0) ?? 0;
      const pendingCom = commissions?.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0) ?? 0;

      setStats({
        clientCount: clientCount ?? 0,
        monthSales: 0,
        totalCommissions: totalCom,
        pendingCommissions: pendingCom,
        currentTier: "Bronze",
        nextTier: "Silver",
        nextTierRevenue: 5000,
      });
      setRecentClients(clients ?? []);
      setBonusRules(rules ?? []);
    }

    load();
  }, [profile.id]);

  const tier = TIER_COLORS[stats.currentTier] ?? TIER_COLORS.Bronze;
  const progressPct = Math.min(100, (stats.totalCommissions / (stats.nextTierRevenue || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Bonjour, {profile.first_name} 👋</h2>
          <p className="mt-1 text-sm text-white/40">Votre espace apporteur d&apos;affaires</p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Clients", value: stats.clientCount, icon: Users, color: "text-blue-400" },
          { label: "Commissions totales", value: formatCurrency(stats.totalCommissions), icon: DollarSign, color: "text-emerald-400" },
          { label: "En attente", value: formatCurrency(stats.pendingCommissions), icon: TrendingUp, color: "text-amber-400" },
          { label: "Palier", value: stats.currentTier, icon: Award, color: tier.text },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <Icon className={cn("h-4 w-4 mb-3", k.color)} />
              <p className="text-lg font-bold text-white">{k.value}</p>
              <p className="mt-0.5 text-xs text-white/40">{k.label}</p>
            </div>
          );
        })}
      </div>

      {/* Agent Card + Chart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Atlas Agent Card */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5",
          tier.bg, tier.border
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-white/50 uppercase tracking-widest">Atlas Agent</p>
              <p className={cn("mt-1 text-2xl font-bold", tier.text)}>{stats.currentTier}</p>
            </div>
            <Award className={cn("h-8 w-8", tier.text, "opacity-60")} />
          </div>
          <div className="mt-4">
            <p className="text-xs text-white/40">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="mt-0.5 text-[11px] text-white/25">Apporteur d&apos;affaires certifié</p>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/40">Vers {stats.nextTier}</span>
              <span className={cn("font-semibold", tier.text)}>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%`, background: tier.glow }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">
              {formatCurrency(Math.max(0, stats.nextTierRevenue - stats.totalCommissions))} avant prochain palier
            </p>
          </div>

          {/* Bonus Rules */}
          {bonusRules.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Paliers bonus</p>
              {bonusRules.slice(0, 4).map((r) => (
                <div key={r.tier_name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3 w-3 text-white/30" />
                    <span className="text-white/60">{r.tier_name}</span>
                  </span>
                  <span className="text-white/80">
                    {r.bonus_amount ? formatCurrency(r.bonus_amount) : "—"}
                    {r.min_revenue ? <span className="text-white/30"> / {formatCurrency(r.min_revenue)}</span> : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commission Chart */}
        <div className="col-span-2 rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Commissions</p>
              <p className="text-xs text-white/40">6 derniers mois</p>
            </div>
            <TrendingUp className="h-4 w-4 text-white/30" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={COMMISSION_CHART} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="comGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="m" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}£`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#comGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clients récents */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Mes clients récents</p>
          <Link href="/dashboard/clients" className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70">
            Voir tous <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentClients.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">Aucun client pour l&apos;instant</p>
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
                <div className="flex items-center gap-2">
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 transition-colors hover:bg-emerald-500/25"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
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
