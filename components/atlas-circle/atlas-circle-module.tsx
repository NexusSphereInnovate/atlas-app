"use client";

import { useEffect, useState } from "react";
import { Award, Star, TrendingUp, Users, Zap, Edit3, Save, Plus, X } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
// formatCurrency used for agent bonus amounts
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { UserProfile } from "@/types/profile";

interface MemberTier {
  id: string;
  tier_name: string;
  min_orders: number;
  min_spend: number;
  benefits: string[];
  color: string | null;
  sort_order: number;
}

interface AgentBonusRule {
  id: string;
  tier_name: string;
  min_sales_count: number | null;
  min_revenue: number | null;
  bonus_amount: number | null;
  bonus_type: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

interface AtlasCircleModuleProps {
  profile: UserProfile;
}

export function AtlasCircleModule({ profile }: AtlasCircleModuleProps) {
  const { toast } = useToast();
  const [memberTiers, setMemberTiers] = useState<MemberTier[]>([]);
  const [agentRules, setAgentRules] = useState<AgentBonusRule[]>([]);
  const [clientStats, setClientStats] = useState({ totalPoints: 0 });
  const [agentStats, setAgentStats] = useState({ salesCount: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState<string | null>(null);
  const [ruleEdits, setRuleEdits] = useState<Record<string, Partial<AgentBonusRule>>>({});

  // Tier benefits editing (admin only)
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [tierBenefits, setTierBenefits] = useState<Record<string, string[]>>({});
  const [tierMinPoints, setTierMinPoints] = useState<Record<string, number>>({});

  // Atlas Circle manual add (admin)
  const [circleOpen, setCircleOpen] = useState(false);
  const [circleClients, setCircleClients] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>([]);
  const [circleForm, setCircleForm] = useState({ clientId: "", amount: "", label: "" });
  const [addingCircle, setAddingCircle] = useState(false);
  const [circleEntries, setCircleEntries] = useState<{ id: string; client_id: string; amount: number; label: string; type: string; created_at: string }[]>([]);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isAgent = profile.role === "agent";
  const isClient = profile.role === "client";

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: tiers }, { data: rules }] = await Promise.all([
        supabase.from("member_tiers").select("*").order("sort_order"),
        supabase.from("agent_bonus_rules").select("*").order("sort_order"),
      ]);

      setMemberTiers(tiers ?? []);
      setAgentRules(rules ?? []);

      if (isAdmin) {
        const [{ data: cls }, { data: entries }] = await Promise.all([
          supabase.from("user_profiles").select("id,first_name,last_name,email").eq("role","client"),
          supabase.from("atlas_circle_entries").select("id,client_id,amount,label,type,created_at").order("created_at", { ascending: false }).limit(100),
        ]);
        setCircleClients(cls ?? []);
        setCircleEntries(entries ?? []);
      }

      if (isClient) {
        const { data: entries } = await supabase
          .from("atlas_circle_entries")
          .select("amount")
          .eq("client_id", profile.id);
        setClientStats({
          totalPoints: entries?.reduce((s, e) => s + (e.amount ?? 0), 0) ?? 0,
        });
      }

      if (isAgent || isAdmin) {
        const { data: coms } = await supabase
          .from("commissions")
          .select("amount, status")
          .eq("agent_id", profile.id);
        const { count: salesCount } = await supabase
          .from("commissions")
          .select("id", { count: "exact", head: true })
          .eq("agent_id", profile.id);

        setAgentStats({
          salesCount: salesCount ?? 0,
          totalRevenue: coms?.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0) ?? 0,
        });
      }

      setLoading(false);
    }
    load();
  }, [profile.id, isClient, isAgent, isAdmin]);

  function getCurrentClientTier(tiers: MemberTier[]) {
    const sorted = [...tiers].sort((a, b) => b.sort_order - a.sort_order);
    return sorted.find((t) => clientStats.totalPoints >= t.min_orders) ?? tiers[0];
  }

  function getCurrentAgentTier(rules: AgentBonusRule[]) {
    const sorted = [...rules].sort((a, b) => b.sort_order - a.sort_order);
    return sorted.find(
      (r) =>
        (r.min_sales_count === null || agentStats.salesCount >= r.min_sales_count) &&
        (r.min_revenue === null || agentStats.totalRevenue >= r.min_revenue)
    ) ?? rules[0];
  }

  async function handleAddCircle() {
    if (!circleForm.clientId || !circleForm.amount || !circleForm.label) {
      toast("error", "Client, montant et libellé requis");
      return;
    }
    setAddingCircle(true);
    const supabase = createClient();
    const { error } = await supabase.from("atlas_circle_entries").insert({
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      client_id: circleForm.clientId,
      type: "manual",
      amount: Number(circleForm.amount),
      label: circleForm.label,
      added_by: profile.id,
    });
    if (error) {
      toast("error", error.message);
    } else {
      toast("success", "Entrée Circle ajoutée");
      setCircleOpen(false);
      setCircleForm({ clientId: "", amount: "", label: "" });
      // Refresh entries
      const { data } = await supabase.from("atlas_circle_entries")
        .select("id,client_id,amount,label,type,created_at")
        .order("created_at", { ascending: false }).limit(100);
      setCircleEntries(data ?? []);
    }
    setAddingCircle(false);
  }

  async function saveTier(tierId: string) {
    setSavingTier(tierId);
    const supabase = createClient();
    const benefits = tierBenefits[tierId] ?? memberTiers.find(t => t.id === tierId)?.benefits ?? [];
    const minOrders = tierMinPoints[tierId] ?? memberTiers.find(t => t.id === tierId)?.min_orders ?? 0;
    const { error } = await supabase.from("member_tiers").update({
      benefits,
      min_orders: minOrders,
    }).eq("id", tierId);
    if (error) {
      toast("error", `Erreur : ${error.message}`);
    } else {
      toast("success", "Palier mis à jour");
      setMemberTiers(prev => prev.map(t => t.id === tierId ? { ...t, benefits, min_orders: minOrders } : t));
      setEditingTier(null);
    }
    setSavingTier(null);
  }

  async function saveRule(ruleId: string) {
    setSavingRule(ruleId);
    const supabase = createClient();
    const edits = ruleEdits[ruleId] ?? {};
    const { error } = await supabase.from("agent_bonus_rules").update(edits).eq("id", ruleId);
    if (error) {
      toast("error", `Erreur : ${error.message}`);
    } else {
      toast("success", "Règle mise à jour");
      setAgentRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, ...edits } : r));
      setEditingRule(null);
    }
    setSavingRule(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const currentClientTier = memberTiers.length > 0 ? getCurrentClientTier(memberTiers) : null;
  const currentAgentTier = agentRules.length > 0 ? getCurrentAgentTier(agentRules) : null;

  const nextClientTier = currentClientTier
    ? memberTiers.find((t) => t.sort_order > currentClientTier.sort_order)
    : null;

  const nextAgentTier = currentAgentTier
    ? agentRules.find((r) => r.sort_order > currentAgentTier.sort_order)
    : null;

  return (
    <>
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Atlas Circle</h2>
        <p className="mt-1 text-sm text-white/40">Programme de fidélité et paliers</p>
      </div>

      {/* CLIENT CARD */}
      {(isClient || isAdmin) && currentClientTier && (
        <div className="relative overflow-hidden rounded-2xl border p-6"
          style={{
            borderColor: `${currentClientTier.color ?? "#6b7280"}40`,
            background: `linear-gradient(135deg, ${currentClientTier.color ?? "#6b7280"}18 0%, transparent 60%)`,
          }}
        >
          {/* Background glow */}
          <div
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl"
            style={{ background: currentClientTier.color ?? "#6b7280" }}
          />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/40">
                  Atlas Circle — Membre
                </p>
                <p className="mt-1 text-3xl font-bold" style={{ color: currentClientTier.color ?? "#fff" }}>
                  {currentClientTier.tier_name}
                </p>
              </div>
              <Award className="h-10 w-10 opacity-40" style={{ color: currentClientTier.color ?? "#fff" }} />
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-white">{profile.first_name} {profile.last_name}</p>
              <p className="text-xs text-white/30">Membre Atlas Incorporate</p>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div>
                <p className="text-xs text-white/40">Points Circle</p>
                <p className="text-3xl font-bold text-white">{clientStats.totalPoints.toLocaleString()}</p>
                <p className="text-[10px] text-white/25 mt-0.5">1 pt = 1 CHF/EUR dépensé</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <p className="text-xs text-white/40">Palier actuel</p>
                <p className="text-lg font-bold" style={{ color: currentClientTier.color ?? "#fff" }}>
                  {currentClientTier.tier_name}
                </p>
              </div>
            </div>

            {nextClientTier && (
              <div className="mt-5">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                  <span>Vers {nextClientTier.tier_name}</span>
                  <span>
                    {Math.max(0, nextClientTier.min_orders - clientStats.totalPoints).toLocaleString()} CHF/EUR restants
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, nextClientTier.min_orders > 0 ? (clientStats.totalPoints / nextClientTier.min_orders) * 100 : 100)}%`,
                      background: currentClientTier.color ?? "#6b7280",
                    }}
                  />
                </div>
              </div>
            )}
            {!nextClientTier && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 text-center">
                🏆 Palier maximum atteint
              </div>
            )}

            {/* Benefits */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-white/50 uppercase tracking-wider">Avantages inclus</p>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {currentClientTier.benefits?.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <Zap className="h-3.5 w-3.5 shrink-0" style={{ color: currentClientTier.color ?? "#fff" }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* AGENT CARD */}
      {(isAgent || isAdmin) && currentAgentTier && (
        <div
          className="relative overflow-hidden rounded-2xl border p-6"
          style={{
            borderColor: "rgba(59,130,246,0.3)",
            background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, transparent 60%)",
          }}
        >
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500 opacity-15 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-white/40">Atlas Agent</p>
                <p className="mt-1 text-3xl font-bold text-blue-400">{currentAgentTier.tier_name}</p>
              </div>
              <Star className="h-10 w-10 text-blue-400 opacity-40" />
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-white">{profile.first_name} {profile.last_name}</p>
              <p className="text-xs text-white/30">Apporteur d&apos;affaires certifié</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/40">Ventes</p>
                <p className="text-lg font-bold text-white">{agentStats.salesCount}</p>
              </div>
              <div>
                <p className="text-xs text-white/40">Commissions</p>
                <p className="text-lg font-bold text-white">{formatCurrency(agentStats.totalRevenue)}</p>
              </div>
            </div>

            {nextAgentTier && (
              <div className="mt-5">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                  <span>Vers {nextAgentTier.tier_name}</span>
                  <span>
                    {formatCurrency(Math.max(0, (nextAgentTier.min_revenue ?? 0) - agentStats.totalRevenue))} restants
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${Math.min(100, (agentStats.totalRevenue / (nextAgentTier.min_revenue ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ALL TIERS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Paliers membres</p>
          <p className="text-xs text-white/30">1 point = 1 CHF / EUR dépensé</p>
        </div>
        <div className="space-y-3">
          {memberTiers.map((tier) => {
            const isEditing = editingTier === tier.id;
            const currentBenefits = tierBenefits[tier.id] ?? tier.benefits ?? [];
            const currentMinPts   = tierMinPoints[tier.id] ?? tier.min_orders;

            return (
              <div key={tier.id} className="rounded-2xl border p-4 transition-all"
                style={{ borderColor: `${tier.color ?? "#6b7280"}30`, background: `${tier.color ?? "#6b7280"}0a` }}>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: tier.color ?? "#6b7280" }} />
                      <p className="font-semibold text-white">{tier.tier_name}</p>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mt-3">
                        {/* Min points */}
                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-white/40">
                            Seuil minimum (CHF/EUR = points)
                          </label>
                          <input
                            type="number"
                            value={currentMinPts}
                            onChange={e => setTierMinPoints(p => ({ ...p, [tier.id]: Number(e.target.value) }))}
                            className="w-40 rounded-lg border border-white/10 bg-[#16161c] px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
                          />
                        </div>
                        {/* Benefits list */}
                        <div>
                          <label className="mb-1.5 block text-[10px] font-medium text-white/40">Avantages</label>
                          <div className="space-y-1.5">
                            {currentBenefits.map((b, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  value={b}
                                  onChange={e => {
                                    const next = [...currentBenefits];
                                    next[i] = e.target.value;
                                    setTierBenefits(p => ({ ...p, [tier.id]: next }));
                                  }}
                                  className="flex-1 rounded-lg border border-white/10 bg-[#16161c] px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
                                />
                                <button
                                  onClick={() => {
                                    const next = currentBenefits.filter((_, idx) => idx !== i);
                                    setTierBenefits(p => ({ ...p, [tier.id]: next }));
                                  }}
                                  className="rounded-lg p-1.5 text-white/30 hover:bg-white/8 hover:text-red-400">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => setTierBenefits(p => ({ ...p, [tier.id]: [...currentBenefits, ""] }))}
                              className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-xs text-white/40 hover:border-white/40 hover:text-white/60 transition-colors">
                              <Plus className="h-3 w-3" /> Ajouter un avantage
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-white/40 mb-2">
                          Dès {tier.min_orders.toLocaleString()} CHF/EUR dépensés
                        </p>
                        <ul className="space-y-1">
                          {tier.benefits?.map((b, i) => (
                            <li key={i} className="text-xs text-white/60">• {b}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingTier(null);
                              setTierBenefits(p => { const c = { ...p }; delete c[tier.id]; return c; });
                              setTierMinPoints(p => { const c = { ...p }; delete c[tier.id]; return c; });
                            }}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:bg-white/6">
                            Annuler
                          </button>
                          <button
                            onClick={() => saveTier(tier.id)}
                            disabled={savingTier === tier.id}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                            {savingTier === tier.id ? <Spinner size="sm" /> : <Save className="h-3 w-3" />}
                            Sauvegarder
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTier(tier.id);
                            setTierBenefits(p => ({ ...p, [tier.id]: [...(tier.benefits ?? [])] }));
                            setTierMinPoints(p => ({ ...p, [tier.id]: tier.min_orders }));
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 hover:bg-white/8 hover:text-white">
                          <Edit3 className="h-3.5 w-3.5" /> Modifier
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ATLAS CIRCLE ADMIN — Manual entries */}
      {isAdmin && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Gestion Atlas Circle clients</p>
              <p className="text-xs text-white/40 mt-0.5">Ajouter manuellement des points Circle à un client</p>
            </div>
            <button
              onClick={() => setCircleOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>

          {/* Recent entries */}
          {circleEntries.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {circleEntries.slice(0, 20).map((entry) => {
                const cl = circleClients.find(c => c.id === entry.client_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{entry.label}</p>
                      <p className="text-[11px] text-white/40">
                        {cl ? `${cl.first_name ?? ""} ${cl.last_name ?? ""}`.trim() || cl.email : entry.client_id.slice(0,8)}
                        {" · "}{entry.type}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300">
                      +{entry.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AGENT BONUS RULES — Admin editable */}
      <div>
        <p className="mb-3 text-sm font-semibold text-white">Paliers agents (bonus)</p>
        <div className="space-y-3">
          {agentRules.map((rule) => {
            const isEditing = editingRule === rule.id;
            const edits = ruleEdits[rule.id] ?? {};
            const current = { ...rule, ...edits };

            return (
              <div key={rule.id} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold text-white">{rule.tier_name}</p>
                      {!rule.is_active && (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/30">Inactif</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[10px] text-white/40">Ventes min</label>
                          <input
                            type="number"
                            value={current.min_sales_count ?? ""}
                            onChange={(e) => setRuleEdits((p) => ({ ...p, [rule.id]: { ...p[rule.id], min_sales_count: Number(e.target.value) } }))}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-white/40">CA min (GBP)</label>
                          <input
                            type="number"
                            value={current.min_revenue ?? ""}
                            onChange={(e) => setRuleEdits((p) => ({ ...p, [rule.id]: { ...p[rule.id], min_revenue: Number(e.target.value) } }))}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-white/40">Bonus (GBP)</label>
                          <input
                            type="number"
                            value={current.bonus_amount ?? ""}
                            onChange={(e) => setRuleEdits((p) => ({ ...p, [rule.id]: { ...p[rule.id], bonus_amount: Number(e.target.value) } }))}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] text-white/40">Description</label>
                          <input
                            type="text"
                            value={current.description ?? ""}
                            onChange={(e) => setRuleEdits((p) => ({ ...p, [rule.id]: { ...p[rule.id], description: e.target.value } }))}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 text-xs text-white/50">
                        <span>Min {rule.min_sales_count ?? 0} ventes</span>
                        <span>Min {formatCurrency(rule.min_revenue ?? 0)} CA</span>
                        <span className="font-semibold text-emerald-400">
                          Bonus {formatCurrency(rule.bonus_amount ?? 0)}
                        </span>
                        {rule.description && <span>{rule.description}</span>}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => { setEditingRule(null); setRuleEdits((p) => { const copy = { ...p }; delete copy[rule.id]; return copy; }); }}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/6"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => saveRule(rule.id)}
                            disabled={savingRule === rule.id}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                          >
                            {savingRule === rule.id ? <Spinner size="sm" /> : <Save className="h-3 w-3" />}
                            Sauvegarder
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setEditingRule(rule.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/8 hover:text-white"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* Circle add modal */}
    {circleOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141418] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <p className="font-semibold text-white">Ajouter des points Circle</p>
            <button onClick={() => setCircleOpen(false)} className="text-white/40 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Client *</label>
              <select
                value={circleForm.clientId}
                onChange={e => setCircleForm(f => ({ ...f, clientId: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="">Sélectionner un client</option>
                {circleClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Montant (points) *</label>
              <input
                type="number"
                value={circleForm.amount}
                onChange={e => setCircleForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="ex: 1200"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Libellé *</label>
              <input
                type="text"
                value={circleForm.label}
                onChange={e => setCircleForm(f => ({ ...f, label: e.target.value }))}
                placeholder="ex: Renouvellement mise en conformité UK"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
              />
            </div>
            <button
              onClick={handleAddCircle}
              disabled={addingCircle || !circleForm.clientId || !circleForm.amount || !circleForm.label}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              {addingCircle ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
              Ajouter les points
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
