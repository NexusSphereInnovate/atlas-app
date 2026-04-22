"use client";

import { useEffect, useState } from "react";
import {
  CreditCard, CheckCircle, Clock, Eye, EyeOff, Shield,
  Phone, Mail, Lock, ArrowLeft, Save, User, Building2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/contexts/language-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { UserProfile } from "@/types/profile";

interface BankAccountRequest {
  id: string;
  email: string;
  phone: string;
  status: string;
  iban: string | null;
  account_number: string | null;
  sort_code: string | null;
  notes: string | null;
  created_at: string;
}

type BankAccountRequestWithClient = BankAccountRequest & {
  client?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
};

const STATUS_MAP: Record<string, { label: string; labelEn: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Demande en cours",       labelEn: "Request pending",   color: "bg-amber-500/15 text-amber-400",     icon: Clock },
  processing: { label: "En cours de traitement", labelEn: "Being processed",   color: "bg-blue-500/15 text-blue-400",       icon: Clock },
  active:     { label: "Compte actif",            labelEn: "Account active",    color: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle },
  rejected:   { label: "Demande refusée",         labelEn: "Request rejected",  color: "bg-red-500/15 text-red-400",         icon: Clock },
};

const STATUS_COLORS_MAP: Record<string, string> = {
  pending:    "bg-amber-500/15 text-amber-400 border-amber-500/25",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  active:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  rejected:   "bg-red-500/15 text-red-400 border-red-500/25",
};

const STATUS_FILTER_LABELS: Record<string, string> = {
  all:        "Tous",
  pending:    "En attente",
  processing: "En traitement",
  active:     "Actif",
  rejected:   "Refusé",
};

interface BankAccountModuleProps {
  profile: UserProfile;
}

export function BankAccountModule({ profile }: BankAccountModuleProps) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";

  const [existing, setExisting] = useState<BankAccountRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: profile.email ?? "", phone: "", pin: "", pinConfirm: "" });
  const [showPin, setShowPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Admin: list all requests
  const [allRequests, setAllRequests] = useState<BankAccountRequestWithClient[]>([]);

  // Admin: detail panel state
  const [selected, setSelected] = useState<BankAccountRequestWithClient | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [editIban, setEditIban] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editSortCode, setEditSortCode] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    if (isClient) {
      const { data } = await supabase
        .from("bank_account_requests")
        .select("*")
        .eq("client_id", profile.id)
        .maybeSingle();
      setExisting(data);
    } else if (isAdmin) {
      const { data } = await supabase
        .from("bank_account_requests")
        .select("id, email, phone, status, iban, account_number, sort_code, notes, created_at, client_id")
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        const clientIds = data.map((d) => (d as unknown as { client_id: string }).client_id);
        const { data: clients } = await supabase
          .from("user_profiles")
          .select("id, first_name, last_name, email")
          .in("id", clientIds);
        const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c]));
        setAllRequests(
          data.map((d) => ({
            ...d,
            client: clientMap[(d as unknown as { client_id: string }).client_id],
          }))
        );
      } else {
        setAllRequests([]);
      }
    }
    setLoading(false);
  }

  function selectRequest(req: BankAccountRequestWithClient) {
    setSelected(req);
    setEditIban(req.iban ?? "");
    setEditAccountNumber(req.account_number ?? "");
    setEditSortCode(req.sort_code ?? "");
    setEditNotes(req.notes ?? "");
    setEditStatus(req.status);
  }

  async function handleAdminSave() {
    if (!selected) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("bank_account_requests")
      .update({
        status: editStatus,
        iban: editIban || null,
        account_number: editAccountNumber || null,
        sort_code: editSortCode || null,
        notes: editNotes || null,
      })
      .eq("id", selected.id);

    if (error) {
      toast("error", error.message);
      setSaving(false);
      return;
    }

    toast("success", lang === "fr" ? "Mis à jour" : "Updated");

    // Optimistic update of selected
    const updated: BankAccountRequestWithClient = {
      ...selected,
      status: editStatus,
      iban: editIban || null,
      account_number: editAccountNumber || null,
      sort_code: editSortCode || null,
      notes: editNotes || null,
    };
    setSelected(updated);
    setAllRequests((prev) => prev.map((r) => (r.id === selected.id ? updated : r)));
    setSaving(false);
    await load();
  }

  async function handleSubmit() {
    if (!form.email || !form.phone || !form.pin || form.pin.length !== 6 || !/^\d{6}$/.test(form.pin)) {
      toast("error", "Le code secret doit être exactement 6 chiffres");
      return;
    }
    if (form.pin !== form.pinConfirm) {
      toast("error", "Les codes secrets ne correspondent pas");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("bank_account_requests").insert({
      client_id: profile.id,
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      email: form.email,
      phone: form.phone,
      pin_code: form.pin,
      status: "pending",
    });
    if (error) {
      toast("error", error.message);
    } else {
      toast("success", lang === "fr" ? "Demande envoyée !" : "Request submitted!");
      load();
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  // ── ADMIN VIEW ──
  if (isAdmin) {
    const statusFilterOptions = ["all", "pending", "processing", "active", "rejected"];
    const filtered =
      statusFilter === "all"
        ? allRequests
        : allRequests.filter((r) => r.status === statusFilter);

    return (
      <div className="flex h-full min-h-0 gap-0 overflow-hidden rounded-2xl border border-white/8">
        {/* LEFT PANEL */}
        <div
          className={cn(
            "flex flex-col border-r border-white/8 bg-[#0a0a0d]",
            selected ? "hidden md:flex md:w-72 lg:w-80" : "flex w-full md:w-72 lg:w-80"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {lang === "fr" ? "Comptes bancaires" : "Bank Accounts"}
              </h2>
              <p className="mt-0.5 text-xs text-white/40">
                {allRequests.length} {lang === "fr" ? "demande(s)" : "request(s)"}
              </p>
            </div>
            <Building2 className="h-4 w-4 text-white/30" />
          </div>

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-3 py-3">
            {statusFilterOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  statusFilter === s
                    ? s === "all"
                      ? "bg-white/10 text-white"
                      : cn(STATUS_COLORS_MAP[s], "border ring-0")
                    : "text-white/40 hover:text-white/70"
                )}
              >
                {STATUS_FILTER_LABELS[s]}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <CreditCard className="h-6 w-6 text-white/20" />
                <p className="text-xs text-white/30">
                  {lang === "fr" ? "Aucune demande" : "No requests"}
                </p>
              </div>
            ) : (
              filtered.map((req) => {
                const s = STATUS_MAP[req.status];
                return (
                  <button
                    key={req.id}
                    onClick={() => selectRequest(req)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/4",
                      selected?.id === req.id && "bg-white/6"
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/6">
                      <User className="h-4 w-4 text-white/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/80">
                        {req.client?.first_name} {req.client?.last_name}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-white/40">
                        {req.client?.email}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            STATUS_COLORS_MAP[req.status]
                          )}
                        >
                          {lang === "fr" ? s?.label : s?.labelEn}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-white/25">
                        {formatDate(req.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT DETAIL PANEL */}
        {selected ? (
          <div className="flex min-w-0 flex-1 flex-col bg-[#0a0a0d]">
            {/* Detail header */}
            <div className="flex items-center gap-3 border-b border-white/8 px-4 py-4">
              <button
                onClick={() => setSelected(null)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-white">
                  {selected.client?.first_name} {selected.client?.last_name}
                </h3>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    STATUS_COLORS_MAP[selected.status]
                  )}
                >
                  {lang === "fr"
                    ? STATUS_MAP[selected.status]?.label
                    : STATUS_MAP[selected.status]?.labelEn}
                </span>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Client info card */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-white/40">
                  <User className="h-3.5 w-3.5" />
                  {lang === "fr" ? "Client" : "Client"}
                </div>
                <p className="text-sm font-medium text-white/80">
                  {selected.client?.first_name} {selected.client?.last_name}
                </p>
                {selected.client?.email && (
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Mail className="h-3.5 w-3.5 text-white/30" />
                    {selected.client.email}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Mail className="h-3.5 w-3.5 text-white/30" />
                  {lang === "fr" ? "Email soumis :" : "Submitted email:"} {selected.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Phone className="h-3.5 w-3.5 text-white/30" />
                  {selected.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Lock className="h-3.5 w-3.5 text-white/30" />
                  ●●●●●●
                </div>
              </div>

              {/* Status change pills */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                <p className="text-xs font-medium text-white/40">
                  {lang === "fr" ? "Changer le statut" : "Change status"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {["pending", "processing", "active", "rejected"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setEditStatus(st)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        editStatus === st
                          ? STATUS_COLORS_MAP[st]
                          : "border-white/8 bg-white/4 text-white/40 hover:bg-white/8 hover:text-white/60"
                      )}
                    >
                      {lang === "fr"
                        ? STATUS_MAP[st]?.label
                        : STATUS_MAP[st]?.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable fields */}
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
                <p className="text-xs font-medium text-white/40">
                  {lang === "fr" ? "Informations du compte" : "Account details"}
                </p>

                {/* IBAN */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    IBAN
                  </label>
                  <input
                    value={editIban}
                    onChange={(e) => setEditIban(e.target.value)}
                    placeholder="CH56 0483 5012 3456 7800 9"
                    className="w-full rounded-lg border border-white/8 bg-[#16161c] px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    {lang === "fr" ? "Numéro de compte" : "Account Number"}
                  </label>
                  <input
                    value={editAccountNumber}
                    onChange={(e) => setEditAccountNumber(e.target.value)}
                    placeholder="12345678"
                    className="w-full rounded-lg border border-white/8 bg-[#16161c] px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20"
                  />
                </div>

                {/* Sort Code */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    Sort Code
                  </label>
                  <input
                    value={editSortCode}
                    onChange={(e) => setEditSortCode(e.target.value)}
                    placeholder="XX-XX-XX"
                    pattern="\d{2}-\d{2}-\d{2}"
                    className="w-full rounded-lg border border-white/8 bg-[#16161c] px-3 py-2.5 font-mono text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    {lang === "fr" ? "Notes internes" : "Internal notes"}
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    placeholder={
                      lang === "fr"
                        ? "Notes visibles uniquement par l'équipe admin…"
                        : "Notes visible to admin team only…"
                    }
                    className="w-full resize-none rounded-lg border border-white/8 bg-[#16161c] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/30"
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleAdminSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                {lang === "fr" ? "Enregistrer" : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="hidden flex-1 items-center justify-center bg-[#0a0a0d] md:flex">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/4">
                <Building2 className="h-5 w-5 text-white/20" />
              </div>
              <p className="text-sm text-white/30">
                {lang === "fr" ? "Sélectionnez une demande" : "Select a request"}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CLIENT VIEW — existing request ──
  if (existing) {
    const s = STATUS_MAP[existing.status];
    const Icon = s?.icon ?? Clock;
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{t("bank.title")}</h2>
          <p className="mt-1 text-sm text-white/40">{t("bank.subtitle")}</p>
        </div>

        {/* Status card */}
        <div className={cn("flex items-center gap-3 rounded-2xl border p-5", s?.color.includes("emerald") ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/8 bg-white/3")}>
          <Icon className={cn("h-6 w-6 shrink-0", s?.color.split(" ")[1])} />
          <div>
            <p className="font-semibold text-white">{lang === "fr" ? s?.label : s?.labelEn}</p>
            <p className="text-sm text-white/50">
              {existing.status === "pending" && (lang === "fr" ? "Votre demande est en attente de traitement par notre équipe." : "Your request is awaiting processing by our team.")}
              {existing.status === "processing" && (lang === "fr" ? "Votre compte est en cours de création. Vous serez notifié sous 48h." : "Your account is being created. You will be notified within 48h.")}
              {existing.status === "active" && (lang === "fr" ? "Votre compte Revolut Business est actif." : "Your Revolut Business account is active.")}
              {existing.status === "rejected" && (lang === "fr" ? "Votre demande a été refusée. Contactez le support." : "Your request was rejected. Please contact support.")}
            </p>
          </div>
        </div>

        {/* Account details if active */}
        {existing.status === "active" && (existing.iban || existing.account_number) && (
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
            <p className="text-sm font-semibold text-white">
              {lang === "fr" ? "Informations du compte" : "Account details"}
            </p>
            {existing.iban && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">IBAN</span>
                <span className="font-mono text-sm text-white">{existing.iban}</span>
              </div>
            )}
            {existing.account_number && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Account</span>
                <span className="font-mono text-sm text-white">{existing.account_number}</span>
              </div>
            )}
            {existing.sort_code && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Sort code</span>
                <span className="font-mono text-sm text-white">{existing.sort_code}</span>
              </div>
            )}
          </div>
        )}

        {/* Submitted info */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-2">
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {lang === "fr" ? "Informations soumises" : "Submitted information"}
          </p>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Mail className="h-4 w-4 text-white/30" />
            {existing.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Phone className="h-4 w-4 text-white/30" />
            {existing.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Lock className="h-4 w-4 text-white/30" />
            ●●●●●●
          </div>
        </div>
      </div>
    );
  }

  // ── CLIENT VIEW — form ──
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">{t("bank.title")}</h2>
        <p className="mt-1 text-sm text-white/40">{t("bank.subtitle")}</p>
      </div>

      {/* Revolut info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4">
        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <div className="text-sm text-white/70 leading-relaxed">
          {lang === "fr"
            ? "Nous créerons votre compte Revolut Business sous 48h. Ce compte vous permettra de recevoir des paiements, émettre des factures et gérer vos finances depuis l'app Revolut."
            : "We will create your Revolut Business account within 48h. This account will allow you to receive payments, issue invoices and manage your finances from the Revolut app."}
        </div>
      </div>

      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
            <Mail className="h-3.5 w-3.5" />
            {t("bank.email")} *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
            placeholder="votre@email.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
            <Phone className="h-3.5 w-3.5" />
            {t("bank.phone")} *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
            placeholder="+33 6 00 00 00 00"
          />
        </div>

        {/* PIN warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
          <span className="mt-0.5 text-base leading-none">⚠️</span>
          <p className="text-xs leading-relaxed text-amber-300/90">
            {lang === "fr"
              ? "Ce code secret est uniquement demandé lors de la création du compte. Vous pourrez le modifier à tout moment directement auprès de votre banque une fois le compte ouvert. Ne communiquez jamais ce code à un tiers."
              : "This secret code is only required during account creation. You can change it at any time directly with your bank once the account is open. Never share this code with anyone."}
          </p>
        </div>

        {/* PIN */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
            <Lock className="h-3.5 w-3.5" />
            {t("bank.pin")} *
          </label>
          <div className="relative">
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              maxLength={6}
              value={form.pin}
              onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 pr-11 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25 tracking-[0.5em]"
              placeholder="••••••"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-xs text-white/30">
            {lang === "fr" ? "Exactement 6 chiffres" : "Exactly 6 digits"}
          </p>
        </div>

        {/* PIN Confirm */}
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white/50">
            <Shield className="h-3.5 w-3.5" />
            {lang === "fr" ? "Confirmer le code secret" : "Confirm secret code"} *
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.pinConfirm}
            onChange={(e) => setForm((f) => ({ ...f, pinConfirm: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
            className={cn(
              "w-full rounded-xl border bg-[#16161c] px-4 py-3 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25 tracking-[0.5em]",
              form.pinConfirm && form.pinConfirm !== form.pin ? "border-red-500/50" : "border-white/10"
            )}
            placeholder="••••••"
          />
          {form.pinConfirm && form.pinConfirm !== form.pin && (
            <p className="mt-1 text-xs text-red-400">
              {lang === "fr" ? "Les codes ne correspondent pas" : "Codes do not match"}
            </p>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !form.email || !form.phone || form.pin.length !== 6 || form.pin !== form.pinConfirm}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Spinner size="sm" /> : <CreditCard className="h-4 w-4" />}
          {t("bank.submit")}
        </button>
      </div>
    </div>
  );
}
