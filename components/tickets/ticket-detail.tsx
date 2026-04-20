"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, Clock, X } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/contexts/language-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { UserProfile } from "@/types/profile";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: { first_name: string | null; last_name: string | null; role: string };
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  client_id: string;
  client?: { first_name: string | null; last_name: string | null; email: string | null };
}

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const STATUS_COLORS: Record<string, string> = {
  open:        "bg-blue-500/15 text-blue-400 border-blue-500/25",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  resolved:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  closed:      "bg-white/8 text-white/30 border-white/10",
};

interface TicketDetailProps {
  ticketId: string;
  profile: UserProfile;
}

export function TicketDetail({ ticketId, profile }: TicketDetailProps) {
  const { t } = useLang();
  const { toast } = useToast();
  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isAgent = profile.role === "agent";
  const canModerate = isAdmin || isAgent;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [ticketId]);

  // ── Realtime : nouveaux messages et changement de statut ─────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => { load(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${ticketId}` },
        (payload) => {
          if (payload.new) {
            setTicket((prev) => prev ? { ...prev, status: (payload.new as { status: string }).status } : prev);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function load() {
    const supabase = createClient();
    const [{ data: ticketData }, { data: msgData }] = await Promise.all([
      supabase.from("tickets").select("id, subject, status, priority, created_at, client_id").eq("id", ticketId).single(),
      supabase.from("ticket_messages").select("id, sender_id, content, created_at").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    ]);

    if (!ticketData) { setLoading(false); return; }

    // Fetch client info
    const { data: clientData } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email")
      .eq("id", ticketData.client_id)
      .single();

    // Fetch sender info for messages
    const senderIds = [...new Set((msgData ?? []).map((m) => m.sender_id))];
    const { data: senders } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, role")
      .in("id", senderIds);

    const senderMap = Object.fromEntries((senders ?? []).map((s) => [s.id, s]));

    setTicket({ ...ticketData, client: clientData ?? undefined });
    setMessages((msgData ?? []).map((m) => ({ ...m, sender: senderMap[m.sender_id] })));
    setLoading(false);
  }

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true);
    const supabase = createClient();

    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: profile.id,
      content: reply.trim(),
    });

    if (error) {
      toast("error", error.message);
    } else {
      // Auto-set status to in_progress if admin/agent replies on open ticket
      if (canModerate && ticket?.status === "open") {
        await supabase.from("tickets").update({ status: "in_progress" }).eq("id", ticketId);
        setTicket((prev) => prev ? { ...prev, status: "in_progress" } : prev);
      }
      setReply("");
      load();
    }
    setSending(false);
  }

  async function changeStatus(newStatus: string) {
    setChangingStatus(true);
    const supabase = createClient();
    const { error } = await supabase.from("tickets").update({ status: newStatus }).eq("id", ticketId);
    if (error) {
      toast("error", error.message);
    } else {
      setTicket((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast("success", "Statut mis à jour");
    }
    setChangingStatus(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-20 text-center text-sm text-white/40">Ticket introuvable</div>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col gap-4">
      {/* Back + Header */}
      <div className="flex-shrink-0 space-y-3">
        <Link href="/dashboard/tickets" className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("nav.tickets")}
        </Link>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-white">{ticket.subject}</h2>
              {(isAdmin || isAgent) && ticket.client && (
                <p className="mt-0.5 text-xs text-white/40">
                  {ticket.client.first_name} {ticket.client.last_name} · {ticket.client.email}
                </p>
              )}
              <p className="mt-0.5 text-xs text-white/25">{formatDate(ticket.created_at)}</p>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", STATUS_COLORS[ticket.status])}>
              {t(`ticket.${ticket.status}` as Parameters<typeof t>[0])}
            </span>
          </div>

          {/* Admin status controls */}
          {canModerate && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
              <span className="text-xs text-white/35">Statut :</span>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={changingStatus || ticket.status === s}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40",
                    ticket.status === s
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                  )}
                >
                  {t(`ticket.${s}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 rounded-2xl border border-white/8 bg-white/2 p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">Aucun message</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === profile.id;
            const isAdminMsg = msg.sender?.role === "admin_global" || msg.sender?.role === "admin_org" || msg.sender?.role === "agent";
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  isMe
                    ? "bg-blue-600 text-white"
                    : isAdminMsg
                      ? "bg-violet-500/15 border border-violet-500/20 text-white"
                      : "bg-white/8 text-white"
                )}>
                  {!isMe && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                      {msg.sender?.first_name} {msg.sender?.last_name}
                      {isAdminMsg && " · Atlas"}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn("mt-1.5 text-[10px]", isMe ? "text-white/50" : "text-white/30")}>
                    {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      {!isClosed ? (
        <div className="flex-shrink-0 flex items-end gap-2">
          <textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder={t("ticket.placeholder")}
            className="flex-1 resize-none rounded-2xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
          />
          <button
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center gap-2 rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-white/50">
            Ce ticket est {ticket.status === "resolved" ? "résolu" : "fermé"}
          </p>
          {canModerate && (
            <button
              onClick={() => changeStatus("open")}
              className="ml-auto text-xs text-white/40 underline hover:text-white/70"
            >
              Rouvrir
            </button>
          )}
        </div>
      )}
    </div>
  );
}
