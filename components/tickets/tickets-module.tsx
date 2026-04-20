"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/contexts/language-context";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { UserProfile } from "@/types/profile";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  client?: { first_name: string | null; last_name: string | null; email: string | null };
}

const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-500/15 text-blue-400",
  in_progress: "bg-amber-500/15 text-amber-400",
  resolved:    "bg-emerald-500/15 text-emerald-400",
  closed:      "bg-white/8 text-white/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    "bg-white/8 text-white/40",
  normal: "bg-blue-500/10 text-blue-400",
  high:   "bg-amber-500/15 text-amber-400",
  urgent: "bg-red-500/15 text-red-400",
};

interface TicketsModuleProps {
  profile: UserProfile;
}

export function TicketsModule({ profile }: TicketsModuleProps) {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isAgent = profile.role === "agent";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("tickets")
      .select("id, subject, status, priority, created_at, updated_at, client_id")
      .order("updated_at", { ascending: false });

    if (filter !== "all") q = q.eq("status", filter);
    if (profile.role === "client") q = q.eq("client_id", profile.id);

    const { data } = await q;

    // Fetch client names for admin/agent
    if ((isAdmin || isAgent) && data && data.length > 0) {
      const clientIds = [...new Set(data.map((t) => t.client_id))];
      const { data: clientData } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email")
        .in("id", clientIds);

      const clientMap = Object.fromEntries((clientData ?? []).map((c) => [c.id, c]));
      setTickets(data.map((ticket) => ({ ...ticket, client: clientMap[ticket.client_id] })));
    } else {
      setTickets(data ?? []);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    const supabase = createClient();

    const { data: ticket, error } = await supabase
      .from("tickets")
      .insert({
        client_id: profile.id,
        created_by: profile.id,
        org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
        subject: newSubject.trim(),
        priority: newPriority,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !ticket) {
      toast("error", error?.message ?? "Erreur");
      setSubmitting(false);
      return;
    }

    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: profile.id,
      content: newMessage.trim(),
    });

    toast("success", "Ticket créé");
    setNewOpen(false);
    setNewSubject("");
    setNewMessage("");
    setNewPriority("normal");
    load();
    setSubmitting(false);
  }

  const FILTERS = ["all", "open", "in_progress", "resolved", "closed"];

  const statusIcon = (s: string) => {
    if (s === "resolved" || s === "closed") return <CheckCircle className="h-4 w-4" />;
    if (s === "in_progress") return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {profile.role === "client"
              ? lang === "fr" ? "Mes tickets" : "My Tickets"
              : t("nav.tickets")}
          </h2>
          <p className="mt-1 text-sm text-white/40">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        {profile.role === "client" && (
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            {t("common.newTicket")}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
            )}
          >
            {f === "all"
              ? (profile.role === "client" ? "Tous" : "Tous")
              : t(`ticket.${f}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <MessageSquare className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/40">Aucun ticket</p>
          {profile.role === "client" && (
            <button
              onClick={() => setNewOpen(true)}
              className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {t("common.newTicket")}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <ul className="divide-y divide-white/5">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-4 bg-white/2 px-5 py-4 transition-colors hover:bg-white/5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={cn("mt-0.5 flex-shrink-0", STATUS_COLORS[ticket.status]?.split(" ")[1])}>
                      {statusIcon(ticket.status)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{ticket.subject}</p>
                      {(isAdmin || isAgent) && ticket.client && (
                        <p className="text-xs text-white/40">
                          {ticket.client.first_name} {ticket.client.last_name}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-white/25">
                        {formatDate(ticket.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium hidden sm:inline-block", STATUS_COLORS[ticket.status])}>
                      {t(`ticket.${ticket.status}` as Parameters<typeof t>[0])}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium hidden sm:inline-block", PRIORITY_COLORS[ticket.priority])}>
                      {t(`ticket.priority.${ticket.priority}` as Parameters<typeof t>[0])}
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/25" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title={t("common.newTicket")}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">{t("ticket.subject")} *</label>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Ex: Problème avec ma facture"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Priorité</label>
            <div className="flex gap-2">
              {["low", "normal", "high", "urgent"].map((p) => (
                <button
                  key={p}
                  onClick={() => setNewPriority(p)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
                    newPriority === p ? "bg-blue-600 text-white" : "bg-white/8 text-white/40 hover:bg-white/12"
                  )}
                >
                  {t(`ticket.priority.${p}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Message *</label>
            <textarea
              rows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t("ticket.placeholder")}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={submitting || !newSubject.trim() || !newMessage.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
            Créer le ticket
          </button>
        </div>
      </Modal>
    </div>
  );
}
