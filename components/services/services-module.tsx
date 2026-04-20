"use client";

import { useEffect, useState } from "react";
import {
  Globe, Plus, Edit2, Trash2, X, Check, ChevronDown,
  ChevronUp, MessageSquare, Star, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/lib/contexts/language-context";
import { Spinner } from "@/components/ui/spinner";
import type { UserProfile } from "@/types/profile";
import type { Service, ServiceCategory, ServicePriceType } from "@/types/database";

// ─── Category metadata ────────────────────────────────────────────
const CATEGORY_META: Record<ServiceCategory, { emoji: string; color: string }> = {
  web:        { emoji: "🌐", color: "blue" },
  hosting:    { emoji: "☁️", color: "cyan" },
  software:   { emoji: "💻", color: "violet" },
  marketing:  { emoji: "📈", color: "orange" },
  security:   { emoji: "🛡️", color: "red" },
  consulting: { emoji: "🎓", color: "emerald" },
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:    { bg: "bg-blue-500/8",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/15 text-blue-300" },
  cyan:    { bg: "bg-cyan-500/8",    border: "border-cyan-500/20",    text: "text-cyan-400",    badge: "bg-cyan-500/15 text-cyan-300" },
  violet:  { bg: "bg-violet-500/8",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/15 text-violet-300" },
  orange:  { bg: "bg-orange-500/8",  border: "border-orange-500/20",  text: "text-orange-400",  badge: "bg-orange-500/15 text-orange-300" },
  red:     { bg: "bg-red-500/8",     border: "border-red-500/20",     text: "text-red-400",     badge: "bg-red-500/15 text-red-300" },
  emerald: { bg: "bg-emerald-500/8", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/15 text-emerald-300" },
};

const CATEGORIES: ServiceCategory[] = ["web", "hosting", "software", "marketing", "security", "consulting"];

interface ServicesModuleProps {
  profile: UserProfile;
}

const EMPTY_FORM = {
  name: "",
  category: "web" as ServiceCategory,
  short_description: "",
  description: "",
  price_from: "",
  price_currency: "CHF",
  price_type: "quote" as ServicePriceType,
  is_active: true,
  sort_order: "0",
  icon: "",
  features: [""],
};

export function ServicesModule({ profile }: ServicesModuleProps) {
  const { toast } = useToast();
  const { t, lang } = useLang();
  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Admin modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Quote request
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteMessage, setQuoteMessage] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    setLoading(true);
    const supabase = createClient();
    const query = supabase.from("services").select("*").order("sort_order").order("name");
    if (!isAdmin) query.eq("is_active", true);
    const { data } = await query;
    setServices(data ?? []);
    setLoading(false);
  }

  // ─── Admin CRUD ────────────────────────────────────────────────

  function openCreate() {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setEditingService(s);
    setForm({
      name: s.name,
      category: s.category,
      short_description: s.short_description ?? "",
      description: s.description ?? "",
      price_from: s.price_from != null ? String(s.price_from) : "",
      price_currency: s.price_currency,
      price_type: s.price_type,
      is_active: s.is_active,
      sort_order: String(s.sort_order),
      icon: s.icon ?? "",
      features: s.features.length > 0 ? s.features : [""],
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingService(null);
  }

  function setFeature(idx: number, val: string) {
    setForm((f) => {
      const features = [...f.features];
      features[idx] = val;
      return { ...f, features };
    });
  }

  function addFeature() {
    setForm((f) => ({ ...f, features: [...f.features, ""] }));
  }

  function removeFeature(idx: number) {
    setForm((f) => ({ ...f, features: f.features.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.name || !form.category) {
      toast("error", lang === "fr" ? "Nom et catégorie requis" : "Name and category required");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name,
      category: form.category,
      short_description: form.short_description || null,
      description: form.description || null,
      price_from: form.price_from ? parseFloat(form.price_from) : null,
      price_currency: form.price_currency,
      price_type: form.price_type,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order) || 0,
      icon: form.icon || null,
      features: form.features.filter(Boolean),
    };

    let error;
    if (editingService) {
      ({ error } = await supabase.from("services").update(payload).eq("id", editingService.id));
    } else {
      ({ error } = await supabase.from("services").insert(payload));
    }

    if (error) toast("error", error.message);
    else {
      toast("success", editingService
        ? (lang === "fr" ? "Service mis à jour" : "Service updated")
        : (lang === "fr" ? "Service créé" : "Service created"));
      closeModal();
      await loadServices();
    }
    setSaving(false);
  }

  async function handleDelete(s: Service) {
    if (!confirm(lang === "fr" ? `Supprimer "${s.name}" ?` : `Delete "${s.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("services").delete().eq("id", s.id);
    toast("success", lang === "fr" ? "Service supprimé" : "Service deleted");
    await loadServices();
  }

  // ─── Quote request (creates a service_request) ────────────────

  async function handleRequestQuote(s: Service) {
    if (quotingId === s.id) {
      // Submit
      setSendingQuote(true);
      const supabase = createClient();
      const defaultMsg = lang === "fr"
        ? `Bonjour, je suis intéressé(e) par le service "${s.name}" et souhaite obtenir un devis.`
        : `Hello, I am interested in "${s.name}" and would like to request a quote.`;

      const { error } = await supabase.from("service_requests").insert({
        org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
        client_id: profile.id,
        service_id: s.id,
        service_name: s.name,
        category: s.category,
        message: quoteMessage.trim() || defaultMsg,
        status: "pending",
      });

      if (error) {
        toast("error", lang === "fr" ? "Erreur lors de l'envoi" : "Error sending request");
      } else {
        toast("success", t("services.quoteSuccess"));
      }
      setQuotingId(null);
      setQuoteMessage("");
      setSendingQuote(false);
    } else {
      setQuotingId(s.id);
      setQuoteMessage("");
    }
  }

  // ─── Derived data ──────────────────────────────────────────────

  const filtered = services.filter((s) =>
    activeCategory === "all" || s.category === activeCategory
  );

  const grouped = CATEGORIES.reduce<Record<ServiceCategory, Service[]>>((acc, cat) => {
    acc[cat] = filtered.filter((s) => s.category === cat);
    return acc;
  }, {} as Record<ServiceCategory, Service[]>);

  function formatPrice(s: Service) {
    if (s.price_type === "quote" || !s.price_from) return lang === "fr" ? "Prix sur devis" : "Quote on request";
    const fmt = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", {
      style: "currency", currency: s.price_currency, minimumFractionDigits: 0,
    }).format(s.price_from);
    if (s.price_type === "monthly") return `${lang === "fr" ? "À partir de" : "From"} ${fmt} / mois`;
    return `${lang === "fr" ? "À partir de" : "From"} ${fmt}`;
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-violet-500/20">
            <Sparkles className="h-5 w-5 text-white/70" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{t("services.title")}</h2>
            <p className="mt-0.5 text-sm text-white/40">{t("services.subtitle")}</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            {t("services.addService")}
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            activeCategory === "all"
              ? "bg-white/15 text-white"
              : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70"
          )}
        >
          {lang === "fr" ? "Tous" : "All"}
          <span className="ml-1.5 text-xs text-white/30">({services.length})</span>
        </button>
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = services.filter((s) => s.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                activeCategory === cat
                  ? `${COLOR_CLASSES[meta.color].badge} border ${COLOR_CLASSES[meta.color].border}`
                  : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70"
              )}
            >
              {meta.emoji} {t(`services.category.${cat}` as Parameters<typeof t>[0])}
              <span className="ml-1.5 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-16">
          <Globe className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/30">{lang === "fr" ? "Aucun service" : "No services"}</p>
        </div>
      ) : (
        /* Services by category */
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const catServices = grouped[cat];
            if (catServices.length === 0) return null;
            const meta = CATEGORY_META[cat];
            const colors = COLOR_CLASSES[meta.color];
            return (
              <div key={cat}>
                {/* Category header */}
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-lg">{meta.emoji}</span>
                  <h3 className={cn("text-sm font-semibold uppercase tracking-wider", colors.text)}>
                    {t(`services.category.${cat}` as Parameters<typeof t>[0])}
                  </h3>
                  <div className="flex-1 h-px bg-white/6 ml-2" />
                </div>

                {/* Service cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catServices.map((s) => {
                    const isExpanded = expandedId === s.id;
                    const isQuoting = quotingId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-2xl border transition-all duration-200",
                          colors.bg, colors.border,
                          !s.is_active && "opacity-50"
                        )}
                      >
                        {/* Card header */}
                        <div className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{s.icon ?? meta.emoji}</span>
                              <div>
                                <p className="font-semibold text-white leading-tight">{s.name}</p>
                                {!s.is_active && isAdmin && (
                                  <span className="text-[10px] text-white/30">
                                    {lang === "fr" ? "Désactivé" : "Inactive"}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => openEdit(s)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(s)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/15 hover:text-red-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          {(s.short_description || s.description) && (
                            <p className="text-sm text-white/65 leading-relaxed">
                              {s.short_description || s.description}
                            </p>
                          )}

                          {/* Features always visible (first 3) */}
                          {s.features.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {s.features.slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-xs text-white/50">
                                  <Check className={cn("h-3 w-3 shrink-0", colors.text)} />
                                  {f}
                                </li>
                              ))}
                              {s.features.length > 3 && (
                                <li className="text-xs text-white/30 pl-[18px]">
                                  +{s.features.length - 3} {lang === "fr" ? "autres" : "more"}
                                </li>
                              )}
                            </ul>
                          )}

                          {/* Price */}
                          <p className={cn("mt-3 text-base font-bold", colors.text)}>
                            {formatPrice(s)}
                          </p>
                        </div>

                        {/* Expandable full description */}
                        {s.description && s.short_description && s.description !== s.short_description && (
                          <>
                            <div className={cn("border-t px-4 py-2", colors.border)}>
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                className="flex w-full items-center justify-between text-xs text-white/40 transition-colors hover:text-white/70"
                              >
                                <span>{lang === "fr" ? "En savoir plus" : "Learn more"}</span>
                                {isExpanded
                                  ? <ChevronUp className="h-3.5 w-3.5" />
                                  : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className={cn("border-t px-4 pb-4 pt-3", colors.border)}>
                                <p className="text-xs text-white/55 leading-relaxed">{s.description}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Quote request — clients only */}
                        {!isAdmin && (
                          <div className={cn("border-t p-3", colors.border)}>
                            {isQuoting ? (
                              <div className="space-y-2">
                                <textarea
                                  value={quoteMessage}
                                  onChange={(e) => setQuoteMessage(e.target.value)}
                                  rows={3}
                                  placeholder={
                                    lang === "fr"
                                      ? "Décrivez votre besoin (optionnel)…"
                                      : "Describe your need (optional)…"
                                  }
                                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/25"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setQuotingId(null)}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/8"
                                  >
                                    {t("common.cancel")}
                                  </button>
                                  <button
                                    onClick={() => handleRequestQuote(s)}
                                    disabled={sendingQuote}
                                    className={cn(
                                      "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
                                      colors.badge
                                    )}
                                  >
                                    {sendingQuote ? <Spinner size="sm" /> : <MessageSquare className="h-3.5 w-3.5" />}
                                    {lang === "fr" ? "Envoyer" : "Send"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleRequestQuote(s)}
                                className={cn(
                                  "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                                  colors.badge
                                )}
                              >
                                <Star className="h-3.5 w-3.5" />
                                {t("services.requestQuote")}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Admin Create/Edit Modal ──────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#141418] shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
              <p className="font-semibold text-white">
                {editingService ? t("services.editService") : t("services.addService")}
              </p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name + Icon row */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Icône (emoji)" : "Icon (emoji)"}
                  </label>
                  <input
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="🌐"
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-center text-2xl outline-none focus:border-white/30"
                  />
                </div>
                <div className="col-span-3">
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Nom du service *" : "Service name *"}
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder={lang === "fr" ? "Ex : Création de site vitrine" : "Ex: Website design"}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"
                  />
                </div>
              </div>

              {/* Category + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Catégorie *" : "Category *"}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1a1a20]">
                        {CATEGORY_META[cat].emoji} {t(`services.category.${cat}` as Parameters<typeof t>[0])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Ordre d'affichage" : "Display order"}
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {/* Short description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  {lang === "fr" ? "Description courte" : "Short description"}
                </label>
                <input
                  value={form.short_description}
                  onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
                  placeholder={lang === "fr" ? "Affiché sur la carte (1 ligne)" : "Shown on card (1 line)"}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"
                />
              </div>

              {/* Long description */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  {lang === "fr" ? "Description complète" : "Full description"}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder={lang === "fr" ? "Description détaillée du service…" : "Detailed service description…"}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Prix à partir de" : "Price from"}
                  </label>
                  <input
                    type="number"
                    value={form.price_from}
                    onChange={(e) => setForm((f) => ({ ...f, price_from: e.target.value }))}
                    placeholder={lang === "fr" ? "Vide = sur devis" : "Empty = on quote"}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Devise" : "Currency"}
                  </label>
                  <select
                    value={form.price_currency}
                    onChange={(e) => setForm((f) => ({ ...f, price_currency: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                  >
                    <option value="CHF" className="bg-[#1a1a20]">CHF</option>
                    <option value="EUR" className="bg-[#1a1a20]">EUR</option>
                    <option value="GBP" className="bg-[#1a1a20]">GBP</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Type" : "Type"}
                  </label>
                  <select
                    value={form.price_type}
                    onChange={(e) => setForm((f) => ({ ...f, price_type: e.target.value as ServicePriceType }))}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                  >
                    <option value="fixed" className="bg-[#1a1a20]">{lang === "fr" ? "Forfait" : "Fixed"}</option>
                    <option value="monthly" className="bg-[#1a1a20]">{lang === "fr" ? "Mensuel" : "Monthly"}</option>
                    <option value="quote" className="bg-[#1a1a20]">{lang === "fr" ? "Sur devis" : "On quote"}</option>
                  </select>
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-white/50">
                    {lang === "fr" ? "Points forts (checklist)" : "Features (checklist)"}
                  </label>
                  <button
                    onClick={addFeature}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-400 transition-colors hover:bg-blue-500/10"
                  >
                    <Plus className="h-3 w-3" />
                    {lang === "fr" ? "Ajouter" : "Add"}
                  </button>
                </div>
                <div className="space-y-2">
                  {form.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-white/20" />
                      <input
                        value={feat}
                        onChange={(e) => setFeature(idx, e.target.value)}
                        placeholder={lang === "fr" ? `Point fort ${idx + 1}` : `Feature ${idx + 1}`}
                        className="flex-1 rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"
                      />
                      {form.features.length > 1 && (
                        <button
                          onClick={() => removeFeature(idx)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/20 transition-colors hover:bg-red-500/15 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex cursor-pointer items-center gap-3">
                <div
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    form.is_active ? "bg-blue-600" : "bg-white/15"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    form.is_active ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
                <span className="text-sm text-white/70">
                  {form.is_active
                    ? (lang === "fr" ? "Service actif (visible par les clients)" : "Active (visible to clients)")
                    : (lang === "fr" ? "Service désactivé (masqué aux clients)" : "Inactive (hidden from clients)")}
                </span>
              </label>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 border-t border-white/8 px-6 py-4">
              <button
                onClick={closeModal}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
                {editingService
                  ? (lang === "fr" ? "Mettre à jour" : "Update")
                  : (lang === "fr" ? "Créer le service" : "Create service")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
