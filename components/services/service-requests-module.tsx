"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  MessageSquare,
  CheckCircle,
  Clock,
  X,
  Edit2,
  Save,
  User,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/contexts/language-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDate } from "@/lib/utils";
import { UserProfile } from "@/types/profile";
import { ServiceRequest, ServiceRequestStatus } from "@/types/database";

const SR_STATUS_LABELS_FR: Record<ServiceRequestStatus, string> = {
  pending: "En attente",
  reviewing: "En cours d'analyse",
  quoted: "Devis envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  completed: "Terminé",
};

const SR_STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  reviewing: "bg-blue-500/15 text-blue-400",
  quoted: "bg-violet-500/15 text-violet-400",
  accepted: "bg-emerald-500/15 text-emerald-400",
  rejected: "bg-red-500/15 text-red-400",
  completed: "bg-emerald-500/20 text-emerald-300",
};

const CAT_EMOJI: Record<string, string> = {
  web: "🌐",
  hosting: "☁️",
  software: "💻",
  marketing: "📈",
  security: "🛡️",
  consulting: "🎓",
};

const STATUS_ORDER: ServiceRequestStatus[] = [
  "pending",
  "reviewing",
  "quoted",
  "accepted",
  "completed",
];

interface Props {
  profile: UserProfile;
}

export default function ServiceRequestsModule({ profile }: Props) {
  const { lang } = useLang();
  const { toast } = useToast();

  const isAdmin =
    profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    ServiceRequestStatus | "all"
  >("all");

  const [editing, setEditing] = useState(false);
  const [editReply, setEditReply] = useState("");
  const [editQuotedPrice, setEditQuotedPrice] = useState("");
  const [editQuotedCurrency, setEditQuotedCurrency] = useState("EUR");
  const [editStatus, setEditStatus] = useState<ServiceRequestStatus>("pending");
  const [editCircleValue, setEditCircleValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<
    { id: string; first_name: string; last_name: string; email: string }[]
  >([]);

  async function load() {
    const sb = createClient();
    let q = sb
      .from("service_requests")
      .select(
        `*, client:user_profiles!service_requests_client_id_fkey(first_name, last_name, email)`
      )
      .order("created_at", { ascending: false });
    if (isClient) q = q.eq("client_id", profile.id);
    const { data } = await q;
    setRequests((data ?? []) as ServiceRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openRequest(req: ServiceRequest) {
    setSelected(req);
    setEditing(false);
    setEditReply(req.admin_reply ?? "");
    setEditQuotedPrice(req.quoted_price ? String(req.quoted_price) : "");
    setEditQuotedCurrency(req.quoted_currency ?? "EUR");
    setEditStatus(req.status);
    setEditCircleValue(req.circle_value ? String(req.circle_value) : "");
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("service_requests")
      .update({
        status: editStatus,
        admin_reply: editReply || null,
        quoted_price: editQuotedPrice ? Number(editQuotedPrice) : null,
        quoted_currency: editQuotedCurrency,
        circle_value: editCircleValue ? Number(editCircleValue) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      toast("error", error.message);
      setSaving(false);
      return;
    }

    if (editStatus === "completed" && Number(editCircleValue) > 0) {
      await sb.from("atlas_circle_entries").insert({
        org_id: selected.org_id ?? "00000000-0000-0000-0000-000000000001",
        client_id: selected.client_id,
        type: "service_request",
        amount: Number(editCircleValue),
        label: `Service : ${selected.service_name}`,
        ref_id: selected.id,
        added_by: profile.id,
      });
    }

    toast("success", lang === "fr" ? "Mis à jour" : "Updated");
    setSaving(false);
    setEditing(false);
    setSelected((s) =>
      s
        ? {
            ...s,
            status: editStatus,
            admin_reply: editReply || null,
            quoted_price: editQuotedPrice ? Number(editQuotedPrice) : null,
            circle_value: Number(editCircleValue),
          }
        : s
    );
    load();
  }

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  const allStatuses = Object.keys(SR_STATUS_LABELS_FR) as ServiceRequestStatus[];

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
              {isClient
                ? lang === "fr" ? "Mes demandes" : "My Requests"
                : lang === "fr" ? "Demandes de services" : "Service Requests"}
            </h2>
            <p className="mt-0.5 text-xs text-white/40">
              {requests.length}{" "}
              {lang === "fr" ? "demande(s)" : "request(s)"}
            </p>
          </div>
          <MessageSquare className="h-4 w-4 text-white/30" />
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/8 px-3 py-3">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              statusFilter === "all"
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            )}
          >
            {lang === "fr" ? "Tous" : "All"}
          </button>
          {allStatuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? cn(SR_STATUS_COLORS[s], "ring-1 ring-white/10")
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {SR_STATUS_LABELS_FR[s]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-5 w-5 text-white/30" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-white/20" />
              <p className="text-xs text-white/30">
                {lang === "fr" ? "Aucune demande" : "No requests"}
              </p>
            </div>
          ) : (
            filtered.map((req) => {
              const emoji = CAT_EMOJI[req.category ?? ""] ?? "📋";
              const clientName = req.client
                ? `${req.client.first_name} ${req.client.last_name}`
                : null;
              return (
                <button
                  key={req.id}
                  onClick={() => openRequest(req)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/4",
                    selected?.id === req.id && "bg-white/6"
                  )}
                >
                  <span className="mt-0.5 text-base leading-none">{emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium text-white/80">
                        {req.service_name}
                      </p>
                      <ChevronRight className="h-3 w-3 shrink-0 text-white/20" />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          SR_STATUS_COLORS[req.status]
                        )}
                      >
                        {SR_STATUS_LABELS_FR[req.status]}
                      </span>
                    </div>
                    {isAdmin && clientName && (
                      <p className="mt-1 truncate text-[10px] text-white/35">
                        {clientName}
                      </p>
                    )}
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

      {/* DETAIL PANEL */}
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
                {selected.service_name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50">
                  {CAT_EMOJI[selected.category ?? ""] ?? "📋"}{" "}
                  {selected.category ?? "—"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    SR_STATUS_COLORS[selected.status]
                  )}
                >
                  {SR_STATUS_LABELS_FR[selected.status]}
                </span>
              </div>
            </div>
            {isAdmin && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/12 hover:text-white"
              >
                <Edit2 className="h-3 w-3" />
                {lang === "fr" ? "Répondre" : "Reply"}
              </button>
            )}
            {isAdmin && editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/12 hover:text-white/70"
                >
                  <X className="h-3 w-3" />
                  {lang === "fr" ? "Annuler" : "Cancel"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                >
                  {saving ? (
                    <Spinner className="h-3 w-3" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  {lang === "fr" ? "Enregistrer" : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Client info card (admin only) */}
            {isAdmin && selected.client && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/40">
                  <User className="h-3.5 w-3.5" />
                  {lang === "fr" ? "Client" : "Client"}
                </div>
                <p className="text-sm font-medium text-white/80">
                  {selected.client.first_name} {selected.client.last_name}
                </p>
                <p className="mt-0.5 text-xs text-white/40">
                  {selected.client.email}
                </p>
              </div>
            )}

            {/* Request message card */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-white/40">
                <MessageSquare className="h-3.5 w-3.5" />
                {lang === "fr" ? "Message de la demande" : "Request message"}
              </div>
              <blockquote className="rounded-xl bg-white/3 p-4 italic text-sm text-white/70 leading-relaxed">
                {selected.message}
              </blockquote>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-white/30">
                <Clock className="h-3 w-3" />
                {lang === "fr" ? "Soumis le" : "Submitted on"}{" "}
                {formatDate(selected.created_at)}
              </p>
            </div>

            {/* Admin reply / edit section */}
            {isAdmin && editing && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
                <p className="text-xs font-medium text-white/50">
                  {lang === "fr" ? "Modifier la demande" : "Edit request"}
                </p>

                {/* Status selector */}
                <div>
                  <p className="mb-2 text-xs text-white/40">
                    {lang === "fr" ? "Statut" : "Status"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {allStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditStatus(s)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                          editStatus === s
                            ? cn(SR_STATUS_COLORS[s], "ring-1 ring-white/20")
                            : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/60"
                        )}
                      >
                        {SR_STATUS_LABELS_FR[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin reply textarea */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    {lang === "fr" ? "Réponse / message au client" : "Reply / message to client"}
                  </label>
                  <textarea
                    value={editReply}
                    onChange={(e) => setEditReply(e.target.value)}
                    rows={4}
                    placeholder={
                      lang === "fr"
                        ? "Votre réponse au client..."
                        : "Your reply to the client..."
                    }
                    className="w-full resize-none rounded-lg border border-white/15 bg-[#1a1a20] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
                  />
                </div>

                {/* Quoted price */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    {lang === "fr" ? "Offre de prix (devis)" : "Price offer (quote)"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editQuotedPrice}
                      onChange={(e) => setEditQuotedPrice(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 rounded-lg border border-white/15 bg-[#1a1a20] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
                    />
                    <select
                      value={editQuotedCurrency}
                      onChange={(e) => setEditQuotedCurrency(e.target.value)}
                      className="w-24 rounded-lg border border-white/15 bg-[#1a1a20] px-2 py-2 text-sm text-white outline-none focus:border-white/30 transition-colors"
                    >
                      <option value="CHF">CHF</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <p className="mt-1 text-[11px] text-white/30">
                    {lang === "fr"
                      ? "Passez le statut en « Devis envoyé » pour que le client puisse accepter ou refuser l'offre."
                      : "Set status to « Quote sent » so the client can accept or reject the offer."}
                  </p>
                </div>

                {/* Circle value */}
                <div>
                  <label className="mb-1.5 block text-xs text-white/40">
                    <Star className="mr-1 inline h-3 w-3 text-amber-400" />
                    {lang === "fr"
                      ? "Valeur Atlas Circle à attribuer à la complétion"
                      : "Atlas Circle value to assign on completion"}
                  </label>
                  <input
                    type="number"
                    value={editCircleValue}
                    onChange={(e) => setEditCircleValue(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-white/15 bg-[#1a1a20] px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Admin reply display (view mode) */}
            {!editing && selected.admin_reply && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-white/40">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  {lang === "fr" ? "Réponse Atlas" : "Atlas Reply"}
                </div>
                <p className="rounded-lg bg-white/4 p-3 text-sm text-white/70 leading-relaxed">
                  {selected.admin_reply}
                </p>
                {selected.quoted_price != null && selected.quoted_price > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-violet-500/8 px-3 py-2">
                    <span className="text-xs text-white/40">
                      {lang === "fr" ? "Devis estimé :" : "Quoted price:"}
                    </span>
                    <span className="text-sm font-semibold text-violet-300">
                      {selected.quoted_price}{" "}
                      {selected.quoted_currency ?? "EUR"}
                    </span>
                  </div>
                )}
                {selected.circle_value != null && selected.circle_value > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-500/8 px-3 py-2">
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-white/40">
                      {lang === "fr"
                        ? "Points Atlas Circle à la complétion :"
                        : "Atlas Circle points on completion:"}
                    </span>
                    <span className="text-sm font-semibold text-amber-300">
                      +{selected.circle_value}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Client — Accept / Reject quoted offer */}
            {isClient && selected.status === "quoted" && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
                    <Star className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {lang === "fr" ? "Offre de prix reçue" : "Price offer received"}
                    </p>
                    <p className="text-xs text-white/40">
                      {lang === "fr"
                        ? "Acceptez ou refusez l'offre pour continuer"
                        : "Accept or reject the offer to continue"}
                    </p>
                  </div>
                </div>
                {selected.quoted_price != null && selected.quoted_price > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-violet-500/10 px-4 py-3">
                    <span className="text-sm text-white/60">
                      {lang === "fr" ? "Montant proposé" : "Proposed amount"}
                    </span>
                    <span className="text-xl font-bold text-violet-300">
                      {selected.quoted_price} {selected.quoted_currency ?? "EUR"}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const sb = createClient();
                      await sb.from("service_requests").update({ status: "accepted" }).eq("id", selected.id);
                      setSelected((s) => s ? { ...s, status: "accepted" } : s);
                      load();
                      toast("success", lang === "fr" ? "Offre acceptée ! L'équipe Atlas vous contactera." : "Offer accepted! The Atlas team will contact you.");
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {lang === "fr" ? "Accepter" : "Accept"}
                  </button>
                  <button
                    onClick={async () => {
                      const sb = createClient();
                      await sb.from("service_requests").update({ status: "rejected" }).eq("id", selected.id);
                      setSelected((s) => s ? { ...s, status: "rejected" } : s);
                      load();
                      toast("success", lang === "fr" ? "Offre refusée" : "Offer rejected");
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/15 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/25"
                  >
                    <X className="h-4 w-4" />
                    {lang === "fr" ? "Refuser" : "Reject"}
                  </button>
                </div>
              </div>
            )}

            {/* Nexus Studio note */}
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
              <p className="text-xs leading-relaxed text-blue-300/80">
                ℹ️{" "}
                {lang === "fr"
                  ? "Le partenaire Nexus Sphère Studio vous contactera directement pour l'offre finale."
                  : "The Nexus Sphère Studio partner will contact you directly for the final offer."}
              </p>
            </div>

            {/* Client view — Status tracker */}
            {isClient && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                <p className="mb-4 text-xs font-medium text-white/40">
                  {lang === "fr" ? "Suivi de la demande" : "Request tracking"}
                </p>
                <div className="flex items-center gap-0">
                  {STATUS_ORDER.map((s, i) => {
                    const currentIdx = STATUS_ORDER.indexOf(
                      selected.status === "rejected"
                        ? "accepted"
                        : selected.status
                    );
                    const isActive = s === selected.status;
                    const isPast = i < currentIdx;
                    const isRejectedStep =
                      selected.status === "rejected" && s === "accepted";

                    return (
                      <div key={s} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-all",
                              isActive && !isRejectedStep
                                ? cn(
                                    SR_STATUS_COLORS[s],
                                    "border-current scale-110"
                                  )
                                : isRejectedStep
                                ? "border-red-500/40 bg-red-500/15 text-red-400 scale-110"
                                : isPast
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                                : "border-white/10 bg-white/4 text-white/20"
                            )}
                          >
                            {isPast ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : isRejectedStep ? (
                              <X className="h-3 w-3" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span
                            className={cn(
                              "text-center text-[9px] leading-tight",
                              isActive || isPast
                                ? "text-white/60"
                                : "text-white/20"
                            )}
                          >
                            {isRejectedStep
                              ? lang === "fr"
                                ? "Refusé"
                                : "Rejected"
                              : SR_STATUS_LABELS_FR[s]}
                          </span>
                        </div>
                        {i < STATUS_ORDER.length - 1 && (
                          <div
                            className={cn(
                              "mb-4 h-px flex-1 transition-colors",
                              isPast || (i < currentIdx)
                                ? "bg-emerald-500/30"
                                : "bg-white/8"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center bg-[#0a0a0d] md:flex">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/4">
              <MessageSquare className="h-5 w-5 text-white/20" />
            </div>
            <p className="text-sm text-white/30">
              {lang === "fr"
                ? "Sélectionnez une demande"
                : "Select a request"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
