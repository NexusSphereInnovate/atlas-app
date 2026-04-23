"use client";

import { useEffect, useState } from "react";
import {
  Receipt, Plus, Trash2, X, Edit2, Save, ChevronRight,
  CheckCircle, Clock, AlertCircle, ArrowLeft, FileText,
  User, Calendar, CreditCard, Download,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useLang } from "@/lib/contexts/language-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { AcceptanceModal } from "@/components/contracts/acceptance-modal";
import type { UserProfile } from "@/types/profile";
import type { InvoiceStatus } from "@/types/database";

// ─── Predefined services ─────────────────────────────────────────
const PREDEFINED_SERVICES = [
  { label: "Création société LTD UK",                     unit_price: 4500, currency: "CHF" },
  { label: "Création société LTD UK + Succursale Suisse", unit_price: 6500, currency: "CHF" },
  { label: "Renouvellement mise en conformité UK",         unit_price: 1200, currency: "CHF" },
  { label: "Création compte bancaire Revolut Business",    unit_price: 500,  currency: "CHF" },
  { label: "Pack comptabilité annuelle UK",                unit_price: 1800, currency: "GBP" },
  { label: "Pack comptabilité + mise en conformité",       unit_price: 3000, currency: "GBP" },
  { label: "Dissolution société LTD UK",                   unit_price: 500,  currency: "CHF" },
  { label: "Modification de dirigeant",                    unit_price: 350,  currency: "CHF" },
  { label: "Changement d'adresse de siège social",         unit_price: 200,  currency: "CHF" },
];

// ─── Types ────────────────────────────────────────────────────────
const STATUS_LABELS_FR: Record<InvoiceStatus, string> = {
  draft: "Brouillon", sent: "Envoyée", payment_claimed: "Paiement déclaré",
  paid: "Payée", cancelled: "Annulée", overdue: "En retard",
};
const STATUS_LABELS_EN: Record<InvoiceStatus, string> = {
  draft: "Draft", sent: "Sent", payment_claimed: "Payment declared",
  paid: "Paid", cancelled: "Cancelled", overdue: "Overdue",
};
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft:           "bg-white/8 text-white/50",
  sent:            "bg-amber-500/15 text-amber-400",
  payment_claimed: "bg-blue-500/15 text-blue-400",
  paid:            "bg-emerald-500/15 text-emerald-400",
  cancelled:       "bg-red-500/15 text-red-400",
  overdue:         "bg-red-500/20 text-red-400",
};
const STATUS_ICONS: Record<InvoiceStatus, React.ElementType> = {
  draft: FileText, sent: Clock, payment_claimed: CreditCard,
  paid: CheckCircle, cancelled: X, overdue: AlertCircle,
};

interface BillingItem { id?: string; label: string; quantity: number; unit_price: number; }

interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  subtotal: number;
  tax_rate: number | null;
  tax_amount: number | null;
  currency: string;
  due_date: string | null;
  paid_at: string | null;
  payment_claimed_at: string | null;
  created_at: string;
  cgv_accepted: boolean | null;
  cgv_accepted_at: string | null;
  cgv_version: string | null;
  client_id: string;
  agent_id: string | null;
  comm_type: string | null;
  comm_value: number | null;
  payment_method: string | null;
  payment_ref: string | null;
  payment_link: string | null;
  client?: { first_name: string | null; last_name: string | null } | null;
  billing_items?: BillingItem[];
}

interface InvoicesModuleProps { profile: UserProfile; }

const EMPTY_FORM = {
  clientId: "", agentId: "", currency: "CHF", dueDate: "", paymentLink: "",
  items: [{ label: "", quantity: 1, unit_price: 0 }] as BillingItem[],
  commType: "percentage" as "fixed" | "percentage",
  commValue: "",
};

export function InvoicesModule({ profile }: InvoicesModuleProps) {
  const { fmt } = useCurrency();
  const { lang } = useLang();
  const { toast } = useToast();
  const stL = lang === "fr" ? STATUS_LABELS_FR : STATUS_LABELS_EN;

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";
  const isAgent = profile.role === "agent";

  // List state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  // Detail / selected invoice
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // PDF download
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Edit mode (admin)
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState<BillingItem[]>([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editCurrency, setEditCurrency] = useState("CHF");
  const [editAgentId, setEditAgentId] = useState("");
  const [editCommType, setEditCommType] = useState<"fixed"|"percentage">("percentage");
  const [editCommValue, setEditCommValue] = useState("");
  const [editPaymentLink, setEditPaymentLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [claimingPayment, setClaimingPayment] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Lookups
  const [clients, setClients] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [agents, setAgents]   = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);

  // CGV modal
  const [acceptingInvoice, setAcceptingInvoice] = useState<Invoice | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => { load(); }, []);

  // ── Realtime — mise à jour automatique de la liste ───────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel("invoices-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        load();
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const sb = createClient();
    sb.from("user_profiles").select("id,first_name,last_name").eq("role","client").then(({data})=>setClients(data??[]));
    sb.from("user_profiles").select("id,first_name,last_name").eq("role","agent").then(({data})=>setAgents(data??[]));
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    const sb = createClient();
    let q = sb.from("invoices").select(`
      id, invoice_number, status, total, subtotal, tax_rate, tax_amount,
      currency, due_date, paid_at, payment_claimed_at, created_at,
      cgv_accepted, cgv_accepted_at, cgv_version, client_id, agent_id, comm_type, comm_value,
      payment_method, payment_ref, payment_link,
      client:user_profiles!invoices_client_id_fkey(first_name, last_name)
    `).order("created_at", { ascending: false });
    if (isClient) q = q.eq("client_id", profile.id);
    else if (profile.role === "agent") q = q.eq("agent_id", profile.id);
    const { data } = await q;
    setInvoices((data ?? []) as unknown as Invoice[]);
    setLoading(false);
  }

  async function openDetail(inv: Invoice) {
    setSelected({ ...inv });
    setEditing(false);
    setDetailLoading(true);
    const sb = createClient();
    const { data: items } = await sb.from("billing_items")
      .select("id, label, quantity, unit_price")
      .eq("invoice_id", inv.id)
      .order("id");
    const full = { ...inv, billing_items: (items ?? []) as BillingItem[] };
    setSelected(full);
    setDetailLoading(false);
  }

  function startEdit(inv: Invoice) {
    setEditItems(inv.billing_items?.map(i=>({...i})) ?? []);
    setEditDueDate(inv.due_date?.slice(0,10) ?? "");
    setEditCurrency(inv.currency);
    setEditAgentId(inv.agent_id ?? "");
    setEditCommType((inv.comm_type as "fixed"|"percentage") ?? "percentage");
    setEditCommValue(inv.comm_value != null ? String(inv.comm_value) : "");
    setEditPaymentLink(inv.payment_link ?? "");
    setEditing(true);
  }

  // ── Edit helpers ─────────────────────────────────────────────────
  function editItem(idx:number, field:keyof BillingItem, val:string|number) {
    setEditItems(prev => prev.map((it,i)=>i===idx?{...it,[field]:val}:it));
  }
  function addEditItem() { setEditItems(p=>[...p,{label:"",quantity:1,unit_price:0}]); }
  function removeEditItem(idx:number) { setEditItems(p=>p.filter((_,i)=>i!==idx)); }

  async function handleSaveEdit() {
    if (!selected) return;
    const validItems = editItems.filter(i=>i.label&&i.unit_price>0);
    if (validItems.length===0) { toast("error", lang==="fr"?"Au moins un article requis":"At least one item required"); return; }
    setSaving(true);
    const sb = createClient();
    const subtotal = validItems.reduce((s,i)=>s+i.quantity*i.unit_price,0);
    const total = subtotal;

    const { error } = await sb.from("invoices").update({
      subtotal, tax_amount:0, total,
      currency: editCurrency,
      due_date: editDueDate || null,
      agent_id: editAgentId || null,
      comm_type: editAgentId && editCommValue ? editCommType : null,
      comm_value: editAgentId && editCommValue ? Number(editCommValue) : null,
      payment_link: editPaymentLink.trim() || null,
    }).eq("id", selected.id);
    if (error) { toast("error", error.message); setSaving(false); return; }

    // Re-insert billing items
    await sb.from("billing_items").delete().eq("invoice_id", selected.id);
    await sb.from("billing_items").insert(
      validItems.map(i=>({invoice_id:selected.id, label:i.label, quantity:i.quantity, unit_price:i.unit_price, total:i.quantity*i.unit_price}))
    );

    toast("success", lang==="fr"?"Facture mise à jour":"Invoice updated");
    setSaving(false);
    setEditing(false);
    await load();
    // Refresh detail
    const refreshed = { ...selected, total, subtotal, currency:editCurrency, due_date:editDueDate||null,
      billing_items: validItems, agent_id:editAgentId||null,
      comm_type:editAgentId&&editCommValue?editCommType:null,
      comm_value:editAgentId&&editCommValue?Number(editCommValue):null,
      payment_link: editPaymentLink.trim()||null };
    setSelected(refreshed as Invoice);
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(lang==="fr"?`Supprimer la facture ${selected.invoice_number} ?`:`Delete invoice ${selected.invoice_number}?`)) return;
    setDeleting(true);
    const sb = createClient();
    await sb.from("billing_items").delete().eq("invoice_id", selected.id);
    const { error } = await sb.from("invoices").delete().eq("id", selected.id);
    if (error) { toast("error", error.message); setDeleting(false); return; }
    toast("success", lang==="fr"?"Facture supprimée":"Invoice deleted");
    setSelected(null);
    setDeleting(false);
    await load();
  }

  async function updateStatus(id:string, status:InvoiceStatus) {
    setUpdatingStatus(id);
    const sb = createClient();
    const updates: Record<string, unknown> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    const { error } = await sb.from("invoices").update(updates).eq("id",id);
    if (error) toast("error", error.message);
    else {
      if (status === "paid") {
        const inv = invoices.find(i => i.id === id) ?? selected;
        if (inv?.client_id) {
          const pts = Math.round(inv.total);
          // Points Atlas Circle pour le client payeur
          await sb.from("atlas_circle_entries").insert({
            client_id: inv.client_id,
            type: "invoice",
            amount: pts,
            label: `Facture ${inv.invoice_number} payée (${pts} ${inv.currency ?? "CHF"})`,
            ref_id: id,
            added_by: profile.id,
          });
        }
      }
      toast("success", lang==="fr"?"Statut mis à jour":"Status updated");
      await load();
      if (selected?.id===id) setSelected(s=>s?{...s,status}:s);
    }
    setUpdatingStatus(null);
  }

  // Client: declare payment made
  async function handleClaimPayment() {
    if (!selected) return;
    setClaimingPayment(true);
    const sb = createClient();
    const now = new Date().toISOString();
    const { error } = await sb.from("invoices")
      .update({ status: "payment_claimed", payment_claimed_at: now })
      .eq("id", selected.id);
    if (error) { toast("error", error.message); setClaimingPayment(false); return; }
    toast("success", lang==="fr"
      ?"Paiement déclaré — notre équipe va vérifier la réception"
      :"Payment declared — our team will verify receipt");
    setClaimingPayment(false);
    setSelected(s => s ? { ...s, status:"payment_claimed", payment_claimed_at: now } : s);
    await load();
  }

  // Admin: confirm payment received
  async function handleConfirmPayment() {
    if (!selected) return;
    setUpdatingStatus(selected.id);
    const sb = createClient();
    const now = new Date().toISOString();
    const { error } = await sb.from("invoices")
      .update({ status: "paid", paid_at: now })
      .eq("id", selected.id);
    if (error) { toast("error", error.message); setUpdatingStatus(null); return; }

    // Points Atlas Circle = montant de la facture (1 pt = 1 CHF/EUR)
    const pts = Math.round(selected.total);
    await sb.from("atlas_circle_entries").insert({
      client_id: selected.client_id,
      type: "invoice",
      amount: pts,
      label: `Facture ${selected.invoice_number} payée (${pts} ${selected.currency ?? "CHF"})`,
      ref_id: selected.id,
      added_by: profile.id,
    });
    toast("success", lang==="fr"
      ? `Paiement confirmé ✓ (+${pts} points Circle)`
      : `Payment confirmed ✓ (+${pts} Circle points)`);
    setSelected(s => s ? { ...s, status:"paid", paid_at: now } : s);
    setUpdatingStatus(null);
    await load();
  }

  // ── Download PDF ──────────────────────────────────────────────────
  async function downloadInvoicePdf(inv: Invoice) {
    setDownloadingPdf(inv.id);
    try {
      const sb = createClient();
      const { data: cp } = await sb.from("user_profiles")
        .select("first_name,last_name,email,billing_address,billing_city,billing_postal_code,billing_country")
        .eq("id", inv.client_id).single();

      // Load items if not already loaded
      let items = inv.billing_items ?? [];
      if (items.length === 0) {
        const { data: fetchedItems } = await sb.from("billing_items")
          .select("id,label,quantity,unit_price").eq("invoice_id", inv.id).order("id");
        items = (fetchedItems ?? []) as BillingItem[];
      }

      const res = await fetch("/api/invoices/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: inv.invoice_number,
          invoiceDate: new Date(inv.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
          dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : undefined,
          currency: inv.currency,
          clientName: cp ? `${cp.first_name ?? ""} ${cp.last_name ?? ""}`.trim() : clientName(inv),
          clientAddress:  cp?.billing_address      ?? "",
          clientPostal:   cp?.billing_postal_code  ?? "",
          clientCity:     cp?.billing_city         ?? "",
          clientCountry:  cp?.billing_country      ?? "",
          clientEmail:    cp?.email                ?? "",
          items: items.map(i => ({ label: i.label, quantity: i.quantity, unit_price: i.unit_price })),
          totalAmount: inv.total,
          status: inv.status,
          cgvAccepted: inv.cgv_accepted,
          cgvAcceptedAt: inv.cgv_accepted_at ?? undefined,
          paymentClaimedAt: inv.payment_claimed_at ?? undefined,
          paidAt: inv.paid_at ?? undefined,
          paymentMethod: inv.payment_method ?? undefined,
        }),
      });
      if (!res.ok) { toast("error", "Erreur génération PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${inv.invoice_number.toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("error", "Erreur téléchargement PDF");
    }
    setDownloadingPdf(null);
  }

  // ── Create ────────────────────────────────────────────────────────
  async function handleCreate() {
    const validItems = newInvoice.items.filter(i=>i.label&&i.unit_price>0);
    if (!newInvoice.clientId||validItems.length===0) {
      toast("error", lang==="fr"?"Client et au moins un article requis":"Client and at least one item required"); return;
    }
    setCreating(true);
    const sb = createClient();
    const subtotal = validItems.reduce((s,i)=>s+i.quantity*i.unit_price,0);
    const { data:inv, error } = await sb.from("invoices").insert({
      org_id: profile.org_id??"00000000-0000-0000-0000-000000000001",
      client_id: newInvoice.clientId,
      agent_id: newInvoice.agentId||null,
      currency: newInvoice.currency,
      subtotal, tax_rate:0, tax_amount:0, total:subtotal,
      due_date: newInvoice.dueDate||null,
      payment_link: newInvoice.paymentLink.trim()||null,
      status:"draft",
      comm_type: newInvoice.agentId&&newInvoice.commValue?newInvoice.commType:null,
      comm_value: newInvoice.agentId&&newInvoice.commValue?Number(newInvoice.commValue):null,
    }).select("id").single();
    if (error||!inv) { toast("error", error?.message??"Erreur"); setCreating(false); return; }
    await sb.from("billing_items").insert(
      validItems.map(i=>({invoice_id:inv.id, label:i.label, quantity:i.quantity, unit_price:i.unit_price, total:i.quantity*i.unit_price}))
    );
    toast("success", lang==="fr"?"Facture créée":"Invoice created");
    setCreateOpen(false);
    setNewInvoice(EMPTY_FORM);
    setCreating(false);
    load();
  }

  // ── Derived ───────────────────────────────────────────────────────
  const filtered = invoices.filter(inv=>statusFilter==="all"||inv.status===statusFilter);
  const totalPaid = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0);
  const totalPending = invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+i.total,0);
  const editTotal = editItems.reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price),0);

  const clientName = (inv:Invoice) =>
    inv.client ? `${inv.client.first_name??""} ${inv.client.last_name??""}`.trim() : "—";

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-4">

      {/* ── LEFT: List ─────────────────────────────────────────── */}
      <div className={cn("flex flex-col gap-4 min-w-0", selected ? "hidden lg:flex lg:w-[380px] lg:shrink-0" : "flex-1")}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isClient ? (lang==="fr"?"Mes factures":"My Invoices") : (lang==="fr"?"Factures":"Invoices")}
            </h2>
            <p className="mt-0.5 text-sm text-white/40">
              {filtered.length} {lang==="fr"?"facture(s)":"invoice(s)"}
            </p>
          </div>
          {isAdmin && (
            <button onClick={()=>setCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
              <Plus className="h-4 w-4"/>
              {lang==="fr"?"Nouvelle":"New"}
            </button>
          )}
        </div>

        {/* KPIs */}
        {(() => {
          const totalComm = invoices.reduce((s,i)=>s+(
            i.comm_type==="percentage"&&i.comm_value!=null ? i.total*i.comm_value/100
            : i.comm_value!=null ? i.comm_value : 0
          ),0);
          const kpis = isAgent ? [
            { label: lang==="fr"?"Factures":"Invoices",       value: String(invoices.length),   color:"text-white" },
            { label: lang==="fr"?"Comm. totale":"Total comm.", value: fmt(totalComm),            color:"text-violet-400" },
            { label: lang==="fr"?"Paiements déclarés":"Declared",
              value: `${invoices.filter(i=>i.status==="payment_claimed").length}`,               color:"text-blue-400" },
          ] : [
            { label: lang==="fr"?"Total":"Total",     value: fmt(invoices.reduce((s,i)=>s+i.total,0)), color:"text-white" },
            { label: lang==="fr"?"Payé":"Paid",       value: fmt(totalPaid),                          color:"text-emerald-400" },
            { label: lang==="fr"?"En attente":"Due",  value: fmt(totalPending),                       color:"text-amber-400" },
          ];
          return (
            <div className="grid grid-cols-3 gap-2">
              {kpis.map(k=>(
                <div key={k.label} className="rounded-xl border border-white/8 bg-white/3 p-3">
                  <p className={cn("text-base font-bold truncate", k.color)}>{k.value}</p>
                  <p className="text-[11px] text-white/40">{k.label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {(["all","draft","sent","payment_claimed","paid","overdue","cancelled"] as const).map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter===s?"bg-white/15 text-white":"bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70")}>
              {s==="all"?(lang==="fr"?"Toutes":"All"):stL[s]}
            </button>
          ))}
        </div>

        {/* Invoice rows */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_,i)=><div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/3"/>)}
          </div>
        ) : filtered.length===0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-14 text-center">
            <Receipt className="h-8 w-8 text-white/15"/>
            <p className="text-sm text-white/30">{lang==="fr"?"Aucune facture":"No invoices"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(inv=>{
              const StatusIcon = STATUS_ICONS[inv.status];
              const isSelected = selected?.id===inv.id;
              return (
                <button key={inv.id} onClick={()=>openDetail(inv)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ?"border-blue-500/40 bg-blue-500/8"
                      :"border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                  )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      inv.status==="paid"?"bg-emerald-500/15":inv.status==="sent"?"bg-amber-500/15":"bg-white/8")}>
                      <StatusIcon className={cn("h-3.5 w-3.5",
                        inv.status==="paid"?"text-emerald-400":inv.status==="sent"?"text-amber-400":"text-white/40")}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-white truncate">{inv.invoice_number}</p>
                        <p className="shrink-0 text-sm font-bold text-white">{fmt(inv.total)}</p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",STATUS_COLORS[inv.status])}>
                            {stL[inv.status]}
                          </span>
                          {(isAdmin || isAgent) && (
                            <p className="text-[11px] text-white/40 truncate">{clientName(inv)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <p className="text-[11px] text-white/30">{formatDate(inv.created_at)}</p>
                          <ChevronRight className="h-3 w-3 text-white/20"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: Detail panel ────────────────────────────────── */}
      {selected && (
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Back (mobile) + header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setSelected(null);setEditing(false);}}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-colors hover:bg-white/8 hover:text-white lg:hidden">
                <ArrowLeft className="h-4 w-4"/>
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-white">{selected.invoice_number}</h3>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",STATUS_COLORS[selected.status])}>
                    {stL[selected.status]}
                  </span>
                </div>
                <p className="text-xs text-white/40">
                  {lang==="fr"?"Créée le":"Created"} {formatDate(selected.created_at)}
                  {selected.due_date && <> · {lang==="fr"?"Échéance":"Due"} {formatDate(selected.due_date)}</>}
                  {selected.paid_at && <> · {lang==="fr"?"Payée le":"Paid on"} {formatDate(selected.paid_at)}</>}
                </p>
              </div>
            </div>
            {/* Admin actions */}
            {isAdmin && !editing && (
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={()=>downloadInvoicePdf(selected)} disabled={downloadingPdf===selected.id}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40">
                  {downloadingPdf===selected.id?<Spinner size="sm"/>:<Download className="h-3.5 w-3.5"/>}
                  PDF
                </button>
                <button onClick={()=>startEdit(selected)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                  <Edit2 className="h-3.5 w-3.5"/>
                  {lang==="fr"?"Modifier":"Edit"}
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-40">
                  {deleting?<Spinner size="sm"/>:<Trash2 className="h-3.5 w-3.5"/>}
                  {lang==="fr"?"Supprimer":"Delete"}
                </button>
              </div>
            )}
            {isAdmin && editing && (
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={()=>setEditing(false)}
                  className="rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10">
                  {lang==="fr"?"Annuler":"Cancel"}
                </button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
                  {saving?<Spinner size="sm"/>:<Save className="h-3.5 w-3.5"/>}
                  {lang==="fr"?"Enregistrer":"Save"}
                </button>
              </div>
            )}
          </div>

          {/* Client + meta */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(isAdmin || isAgent) && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
                  <User className="h-3 w-3"/> {lang==="fr"?"Client":"Client"}
                </div>
                <p className="text-sm font-medium text-white">{clientName(selected)}</p>
              </div>
            )}
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
                <CreditCard className="h-3 w-3"/> {lang==="fr"?"Devise":"Currency"}
              </div>
              {editing ? (
                <select value={editCurrency} onChange={e=>setEditCurrency(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#16161c] px-2 py-1 text-sm text-white outline-none">
                  <option value="CHF">CHF</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-white">{selected.currency}</p>
              )}
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/35">
                <Calendar className="h-3 w-3"/> {lang==="fr"?"Échéance":"Due date"}
              </div>
              {editing ? (
                <input type="date" value={editDueDate} onChange={e=>setEditDueDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#16161c] px-2 py-1 text-sm text-white outline-none"/>
              ) : (
                <p className="text-sm font-medium text-white">{selected.due_date?formatDate(selected.due_date):"—"}</p>
              )}
            </div>
            {selected.payment_method && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-emerald-400/70">
                  {lang==="fr"?"Paiement":"Payment"}
                </div>
                <p className="text-sm font-medium text-white capitalize">{selected.payment_method}</p>
                {selected.payment_ref && <p className="text-[11px] text-white/30 truncate">{selected.payment_ref}</p>}
              </div>
            )}
            {!editing && selected.payment_link && (
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/8 bg-white/3 p-3">
                <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-white/35">
                  {lang==="fr"?"Lien paiement":"Payment link"}
                </div>
                <a href={selected.payment_link} target="_blank" rel="noopener noreferrer"
                  className="truncate text-xs text-blue-400 underline hover:text-blue-300 block">
                  {selected.payment_link}
                </a>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
            <div className="border-b border-white/8 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{lang==="fr"?"Détail":"Line items"}</p>
              {editing && (
                <button onClick={addEditItem}
                  className="flex items-center gap-1 text-xs text-blue-400 transition-colors hover:text-blue-300">
                  <Plus className="h-3.5 w-3.5"/>
                  {lang==="fr"?"Ajouter":"Add"}
                </button>
              )}
            </div>

            {detailLoading ? (
              <div className="p-6 text-center text-sm text-white/30 animate-pulse">Chargement…</div>
            ) : (
              <>
              <div className="overflow-x-auto">
                {/* Table header */}
                <div className="grid min-w-[380px] grid-cols-12 gap-2 border-b border-white/5 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-white/30">
                  <div className="col-span-5">{lang==="fr"?"Description":"Description"}</div>
                  <div className="col-span-2 text-center">{lang==="fr"?"Qté":"Qty"}</div>
                  <div className="col-span-2 text-right">{lang==="fr"?"P.U.":"Unit"}</div>
                  <div className="col-span-3 text-right">{lang==="fr"?"Total":"Total"}</div>
                </div>

                {(editing ? editItems : (selected.billing_items??[])).map((item,idx)=>(
                  <div key={idx} className="grid min-w-[380px] grid-cols-12 gap-2 items-center border-b border-white/5 px-4 py-3 last:border-0">
                    {editing ? (
                      <>
                        <div className="col-span-5">
                          <input value={item.label} onChange={e=>editItem(idx,"label",e.target.value)}
                            placeholder={lang==="fr"?"Description":"Description"}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-2.5 py-1.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"/>
                        </div>
                        <div className="col-span-2">
                          <input type="number" value={item.quantity} min={1}
                            onChange={e=>editItem(idx,"quantity",Number(e.target.value))}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-2 py-1.5 text-center text-sm text-white outline-none focus:border-white/30"/>
                        </div>
                        <div className="col-span-2">
                          <input type="number" value={item.unit_price} min={0} step={0.01}
                            onChange={e=>editItem(idx,"unit_price",Number(e.target.value))}
                            className="w-full rounded-lg border border-white/10 bg-[#16161c] px-2 py-1.5 text-right text-sm text-white outline-none focus:border-white/30"/>
                        </div>
                        <div className="col-span-2 text-right text-sm font-medium text-white">
                          {fmt(Number(item.quantity)*Number(item.unit_price))}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {editItems.length>1&&(
                            <button onClick={()=>removeEditItem(idx)}
                              className="flex h-6 w-6 items-center justify-center rounded text-white/25 hover:text-red-400">
                              <X className="h-3.5 w-3.5"/>
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-5 text-sm text-white/80">{item.label}</div>
                        <div className="col-span-2 text-center text-sm text-white/50">{item.quantity}</div>
                        <div className="col-span-2 text-right text-sm text-white/50">{fmt(item.unit_price)}</div>
                        <div className="col-span-3 text-right text-sm font-semibold text-white">
                          {fmt(item.quantity*item.unit_price)}
                        </div>
                      </>
                    )}
                  </div>
                ))}

              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-4 bg-white/2">
                <p className="text-sm font-semibold text-white/60">{lang==="fr"?"Total TTC":"Total"}</p>
                <p className="text-xl font-bold text-white">
                  {editing ? fmt(editTotal) : fmt(selected.total)}
                </p>
              </div>
              </>
            )}
          </div>

          {/* Agent: commission en lecture seule */}
          {isAgent && !editing && selected.comm_value != null && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400/70">
                {lang==="fr"?"Votre commission":"Your commission"}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/50">
                  {selected.comm_type === "percentage"
                    ? `${selected.comm_value}% du total`
                    : lang==="fr"?"Montant fixe":"Fixed amount"}
                </p>
                <p className="text-xl font-bold text-violet-300">
                  {selected.comm_type === "percentage"
                    ? fmt(selected.total * selected.comm_value / 100)
                    : fmt(selected.comm_value)}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-white/30">
                {lang==="fr"
                  ? `Sur un total facture de ${fmt(selected.total)}`
                  : `On a total invoice of ${fmt(selected.total)}`}
              </p>
            </div>
          )}

          {/* Commission section (admin edit) */}
          {isAdmin && editing && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/70">
                {lang==="fr"?"Commission apporteur (non visible client)":"Referral commission (hidden from client)"}
              </p>
              <select value={editAgentId} onChange={e=>setEditAgentId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 text-sm text-white outline-none">
                <option value="">{lang==="fr"?"Aucun apporteur":"No referral agent"}</option>
                {agents.map(a=><option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
              {editAgentId && (
                <div className="flex gap-2">
                  <div className="flex gap-1">
                    {(["percentage","fixed"] as const).map(t=>(
                      <button key={t} onClick={()=>setEditCommType(t)}
                        className={cn("rounded-lg px-3 py-1.5 text-xs font-medium",
                          editCommType===t?"bg-violet-600 text-white":"bg-white/8 text-white/40")}>
                        {t==="percentage"?"%":(lang==="fr"?"Fixe":"Fixed")}
                      </button>
                    ))}
                  </div>
                  <input value={editCommValue} onChange={e=>setEditCommValue(e.target.value)}
                    type="number" placeholder={editCommType==="percentage"?"10":"500"}
                    className="flex-1 rounded-xl border border-white/10 bg-[#16161c] px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/25"/>
                </div>
              )}
            </div>
          )}

          {/* Payment link (admin edit) */}
          {isAdmin && editing && (
            <div className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                {lang==="fr"?"Lien de paiement (Revolut, virement…)":"Payment link (Revolut, transfer…)"}
              </p>
              <input
                value={editPaymentLink}
                onChange={e=>setEditPaymentLink(e.target.value)}
                type="url"
                placeholder="https://revolut.me/yourlink"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"
              />
              <p className="text-[11px] text-white/30">
                {lang==="fr"
                  ?"Ce lien sera visible par le client pour effectuer le paiement"
                  :"This link will be visible to the client for payment"}
              </p>
            </div>
          )}

          {/* Admin: confirm payment when client declared it */}
          {isAdmin && !editing && selected.status === "payment_claimed" && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/25 bg-blue-500/8 p-4">
              <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {lang==="fr"?"Paiement déclaré par le client":"Payment declared by client"}
                </p>
                <p className="text-xs text-white/50">
                  {lang==="fr"
                    ?"Le client a déclaré avoir effectué le paiement. Vérifiez la réception et confirmez."
                    :"The client declared having made the payment. Verify receipt and confirm."}
                </p>
                {selected.payment_claimed_at && (
                  <p className="mt-1 text-[11px] text-white/35">
                    {lang==="fr"?"Déclaré le":"Declared on"}{" "}
                    {new Date(selected.payment_claimed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {" "}{lang==="fr"?"à":"at"}{" "}
                    {new Date(selected.payment_claimed_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <button
                onClick={handleConfirmPayment}
                disabled={updatingStatus === selected.id}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {updatingStatus === selected.id ? <Spinner size="sm"/> : <CheckCircle className="h-3.5 w-3.5"/>}
                {lang==="fr"?"Confirmer":"Confirm"}
              </button>
            </div>
          )}

          {/* Admin status change */}
          {isAdmin && !editing && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                {lang==="fr"?"Changer le statut":"Change status"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["draft","sent","payment_claimed","paid","overdue","cancelled"] as InvoiceStatus[])
                  .filter(s=>s!==selected.status).map(s=>(
                  <button key={s} onClick={()=>updateStatus(selected.id,s)}
                    disabled={updatingStatus===selected.id}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-40">
                    → {stL[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client: payment section */}
          {isClient && selected.status === "sent" && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
              {!selected.cgv_accepted ? (
                <>
                  <p className="text-sm text-white/60">
                    {lang==="fr"
                      ?"Veuillez d'abord accepter les conditions générales de vente avant de procéder au paiement."
                      :"Please accept the terms and conditions before proceeding to payment."}
                  </p>
                  <button onClick={()=>setAcceptingInvoice(selected)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
                    <FileText className="h-4 w-4"/>
                    {lang==="fr"?"Accepter les CGV":"Accept Terms & Conditions"}
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle className="h-4 w-4 shrink-0"/>
                    {lang==="fr"?"CGV acceptées":"T&C accepted"}
                  </div>

                  {/* Payment link */}
                  {selected.payment_link && (
                    <a
                      href={selected.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/12"
                    >
                      <CreditCard className="h-4 w-4"/>
                      {lang==="fr"?"Payer via le lien de paiement":"Pay via payment link"}
                    </a>
                  )}

                  <button
                    onClick={handleClaimPayment}
                    disabled={claimingPayment}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    {claimingPayment ? <Spinner size="sm"/> : <CheckCircle className="h-4 w-4"/>}
                    {lang==="fr"?"J'ai effectué le paiement":"I have made the payment"}
                  </button>
                  <p className="text-center text-[11px] text-white/35">
                    {lang==="fr"
                      ?"Cliquez après avoir effectué le virement ou le paiement Revolut"
                      :"Click after completing your transfer or Revolut payment"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Client: payment claimed — waiting confirmation */}
          {isClient && selected.status === "payment_claimed" && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/25 bg-blue-500/8 px-4 py-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-400"/>
              <div>
                <p className="text-sm font-semibold text-white">
                  {lang==="fr"?"Paiement en cours de vérification":"Payment being verified"}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {lang==="fr"
                    ?"Votre paiement déclaré est en cours de vérification par notre équipe."
                    :"Your declared payment is being verified by our team."}
                </p>
              </div>
            </div>
          )}

          {/* Paid */}
          {selected.status === "paid" && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3">
              <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {lang==="fr"?"Facture payée ✓":"Invoice paid ✓"}
                </p>
                {selected.paid_at && (
                  <p className="text-xs text-white/40">
                    {new Date(selected.paid_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {" "}{lang==="fr"?"à":"at"}{" "}
                    {new Date(selected.paid_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <button onClick={()=>downloadInvoicePdf(selected)} disabled={downloadingPdf===selected.id}
                className="shrink-0 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40">
                {downloadingPdf===selected.id?<Spinner size="sm"/>:<Download className="h-3.5 w-3.5"/>}
                PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CGV Modal ────────────────────────────────────────────── */}
      {acceptingInvoice && (
        <AcceptanceModal
          profile={profile}
          invoiceId={acceptingInvoice.id}
          invoiceNumber={acceptingInvoice.invoice_number}
          amount={acceptingInvoice.total}
          currency={acceptingInvoice.currency}
          cgvVersion={acceptingInvoice.cgv_version??"v1.0"}
          onClose={()=>setAcceptingInvoice(null)}
          onAccepted={()=>{
            setAcceptingInvoice(null);
            load();
            if (selected?.id===acceptingInvoice.id) setSelected(s=>s?{...s,cgv_accepted:true}:s);
            toast("success", lang==="fr"?"CGV acceptées":"T&C accepted");
          }}
        />
      )}

      {/* ── Create Invoice Modal ──────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141418] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sticky top-0 bg-[#141418] z-10">
              <p className="font-semibold text-white">
                {lang==="fr"?"Nouvelle facture":"New invoice"}
              </p>
              <button onClick={()=>setCreateOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white">
                <X className="h-4 w-4"/>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Client + Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang==="fr"?"Client *":"Client *"}
                  </label>
                  <select value={newInvoice.clientId}
                    onChange={e=>setNewInvoice(n=>({...n,clientId:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30">
                    <option value="">{lang==="fr"?"Sélectionner":"Select"}</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang==="fr"?"Devise":"Currency"}
                  </label>
                  <select value={newInvoice.currency}
                    onChange={e=>setNewInvoice(n=>({...n,currency:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30">
                    <option value="CHF">CHF</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Due date + Payment link */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang==="fr"?"Date d'échéance":"Due date"}
                  </label>
                  <input type="date" value={newInvoice.dueDate}
                    onChange={e=>setNewInvoice(n=>({...n,dueDate:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"/>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang==="fr"?"Lien de paiement":"Payment link"}
                  </label>
                  <input type="url" value={newInvoice.paymentLink}
                    onChange={e=>setNewInvoice(n=>({...n, paymentLink:e.target.value}))}
                    placeholder="https://revolut.me/…"
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"/>
                </div>
              </div>

              {/* Quick-add predefined services */}
              <div>
                <p className="mb-2 text-xs font-medium text-white/50">
                  {lang==="fr"?"Services prédéfinis (clic pour ajouter)":"Predefined services (click to add)"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PREDEFINED_SERVICES.map((svc) => (
                    <button
                      key={svc.label}
                      type="button"
                      onClick={() => setNewInvoice(n => ({
                        ...n,
                        currency: svc.currency,
                        items: [...n.items.filter(i => i.label || i.unit_price > 0),
                          { label: svc.label, quantity: 1, unit_price: svc.unit_price }],
                      }))}
                      className="rounded-lg border border-white/10 bg-[#16161c] px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:bg-blue-500/15 hover:border-blue-500/30 hover:text-blue-300"
                    >
                      {svc.label} · {svc.unit_price} {svc.currency}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-white/50">
                    {lang==="fr"?"Articles *":"Line items *"}
                  </label>
                  <button onClick={()=>setNewInvoice(n=>({...n,items:[...n.items,{label:"",quantity:1,unit_price:0}]}))}
                    className="text-xs text-blue-400 hover:text-blue-300">
                    + {lang==="fr"?"Ajouter":"Add"}
                  </button>
                </div>
                {/* Column headers */}
                <div className="mb-1 flex items-center gap-2 px-1">
                  <p className="flex-1 min-w-0 text-[10px] font-medium uppercase tracking-wider text-white/30">
                    {lang==="fr"?"Description":"Description"}
                  </p>
                  <p className="w-14 text-center text-[10px] font-medium uppercase tracking-wider text-white/30">
                    {lang==="fr"?"Qté":"Qty"}
                  </p>
                  <p className="w-24 text-right text-[10px] font-medium uppercase tracking-wider text-white/30">
                    {lang==="fr"?"Prix unit.":"Unit price"}
                  </p>
                  <div className="w-4"/>
                </div>
                <div className="space-y-2">
                  {newInvoice.items.map((item,idx)=>(
                    <div key={idx} className="flex items-center gap-2">
                      <input value={item.label}
                        onChange={e=>setNewInvoice(n=>({...n,items:n.items.map((it,i)=>i===idx?{...it,label:e.target.value}:it)}))}
                        placeholder={lang==="fr"?"ex: Création société LTD UK":"e.g. LTD company creation"}
                        className="flex-1 min-w-0 rounded-xl border border-white/10 bg-[#16161c] px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                      <input type="number" value={item.quantity} min={1}
                        onChange={e=>setNewInvoice(n=>({...n,items:n.items.map((it,i)=>i===idx?{...it,quantity:Number(e.target.value)}:it)}))}
                        className="w-14 rounded-xl border border-white/10 bg-[#16161c] px-2 py-2 text-center text-sm text-white outline-none focus:border-white/30"/>
                      <input type="number" value={item.unit_price===0?"":item.unit_price} min={0} step={0.01}
                        onChange={e=>setNewInvoice(n=>({...n,items:n.items.map((it,i)=>i===idx?{...it,unit_price:Number(e.target.value)||0}:it)}))}
                        placeholder="0.00"
                        className="w-24 rounded-xl border border-white/10 bg-[#16161c] px-2 py-2 text-right text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"/>
                      {newInvoice.items.length>1&&(
                        <button onClick={()=>setNewInvoice(n=>({...n,items:n.items.filter((_,i)=>i!==idx)}))}
                          className="text-white/25 hover:text-red-400">
                          <X className="h-4 w-4"/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-2.5">
                  <p className="text-xs text-white/40">{lang==="fr"?"Total TTC":"Total"}</p>
                  <p className="text-sm font-bold text-white">
                    {fmt(newInvoice.items.reduce((s,i)=>s+(i.quantity*i.unit_price),0))} {newInvoice.currency}
                  </p>
                </div>
              </div>

              {/* Commission */}
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/70">
                  {lang==="fr"?"Commission (non visible client)":"Commission (hidden from client)"}
                </p>
                <select value={newInvoice.agentId}
                  onChange={e=>setNewInvoice(n=>({...n,agentId:e.target.value}))}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-3 py-2 text-sm text-white outline-none">
                  <option value="">{lang==="fr"?"Aucun apporteur":"No referral agent"}</option>
                  {agents.map(a=><option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
                {newInvoice.agentId && (
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {(["percentage","fixed"] as const).map(t=>(
                        <button key={t} onClick={()=>setNewInvoice(n=>({...n,commType:t}))}
                          className={cn("rounded-lg px-3 py-1.5 text-xs font-medium",
                            newInvoice.commType===t?"bg-violet-600 text-white":"bg-white/8 text-white/40")}>
                          {t==="percentage"?"%":(lang==="fr"?"Fixe":"Fixed")}
                        </button>
                      ))}
                    </div>
                    <input value={newInvoice.commValue}
                      onChange={e=>setNewInvoice(n=>({...n,commValue:e.target.value}))}
                      type="number" placeholder={newInvoice.commType==="percentage"?"10":"500"}
                      className="flex-1 rounded-xl border border-white/10 bg-[#16161c] px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/25"/>
                  </div>
                )}
              </div>

              <button onClick={handleCreate} disabled={creating||!newInvoice.clientId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {creating?<Spinner size="sm"/>:<Receipt className="h-4 w-4"/>}
                {lang==="fr"?"Créer la facture":"Create invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
