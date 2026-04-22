"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileBadge, Plus, Upload, Eye, CheckCircle, Clock,
  X, User, Calendar, DollarSign, Send, Pen, ArrowLeft,
  ChevronRight, Shield, AlertCircle, FileText, Sparkles,
  Building2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useLang } from "@/lib/contexts/language-context";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { SignContractModal } from "./sign-contract-modal";
import type { UserProfile } from "@/types/profile";
import type { ContractStatus } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────
interface Contract {
  id: string;
  title: string;
  version: string;
  status: ContractStatus;
  pdf_path: string | null;
  client_id: string | null;
  agent_id: string | null;
  commission_type: string | null;
  commission_value: number | null;
  invoice_id: string | null;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
  client?: { first_name: string | null; last_name: string | null; email: string | null } | null;
  agent?: { first_name: string | null; last_name: string | null } | null;
  invoice?: { invoice_number: string; total: number; currency: string } | null;
}

interface ClientInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country: string | null;
}

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft:     "bg-white/8 text-white/40",
  sent:      "bg-amber-500/15 text-amber-400",
  signed:    "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};
const STATUS_ICONS: Record<ContractStatus, React.ElementType> = {
  draft:     FileText,
  sent:      Clock,
  signed:    CheckCircle,
  cancelled: X,
};
const STATUS_LABELS_FR: Record<ContractStatus, string> = { draft: "Brouillon", sent: "Envoyé", signed: "Signé ✓", cancelled: "Annulé" };
const STATUS_LABELS_EN: Record<ContractStatus, string> = { draft: "Draft", sent: "Sent", signed: "Signed ✓", cancelled: "Cancelled" };

interface ContractsModuleProps { profile: UserProfile; }

export function ContractsModule({ profile }: ContractsModuleProps) {
  const { fmt } = useCurrency();
  const { lang } = useLang();
  const { toast } = useToast();

  const isAdmin  = profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";

  const [contracts, setContracts]   = useState<Contract[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Contract | null>(null);
  const [pdfUrl, setPdfUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [updatingStatus, setUpdatingStatus]   = useState<string | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [agents,  setAgents]  = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [newContract, setNewContract] = useState({
    title: "", version: "1.0", clientId: "",
    agentId: "", commissionType: "percentage" as "fixed" | "percentage",
    commissionValue: "", file: null as File | null,
    // Client info for PDF generation
    civility: "M." as "M." | "Mme.",
    address: "", city: "", postalCode: "", country: "",
    companyName: "", companyAddress: "",
    pdfMode: "auto" as "auto" | "manual",
  });
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stL = lang === "fr" ? STATUS_LABELS_FR : STATUS_LABELS_EN;

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!isAdmin) return;
    const sb = createClient();
    sb.from("user_profiles")
      .select("id,first_name,last_name,email,billing_address,billing_city,billing_postal_code,billing_country")
      .eq("role","client")
      .then(({data})=>setClients((data as ClientInfo[])??[]));
    sb.from("user_profiles").select("id,first_name,last_name").eq("role","agent").then(({data})=>setAgents(data??[]));
  }, [isAdmin]);

  // Auto-fill address when client changes
  useEffect(() => {
    if (!newContract.clientId) return;
    const client = clients.find(c => c.id === newContract.clientId);
    if (!client) return;
    setNewContract(n => ({
      ...n,
      address:    client.billing_address    ?? n.address,
      city:       client.billing_city        ?? n.city,
      postalCode: client.billing_postal_code ?? n.postalCode,
      country:    client.billing_country     ?? n.country,
    }));
  }, [newContract.clientId, clients]);

  async function load() {
    setLoading(true);
    const sb = createClient();
    let q = sb.from("contracts")
      .select("id,title,version,status,pdf_path,client_id,agent_id,commission_type,commission_value,invoice_id,signed_at,signed_by,created_at")
      .order("created_at", { ascending: false });
    if (isClient) q = q.eq("client_id", profile.id).neq("status", "draft");

    const { data, error } = await q;
    if (error) { toast("error", error.message); setLoading(false); return; }
    if (!data)  { setLoading(false); return; }

    const clientIds  = [...new Set(data.map(c=>c.client_id).filter(Boolean))]  as string[];
    const agentIds   = [...new Set(data.map(c=>c.agent_id).filter(Boolean))]   as string[];
    const invoiceIds = [...new Set(data.map(c=>c.invoice_id).filter(Boolean))] as string[];

    const [{ data: cd }, { data: ad }, { data: id }] = await Promise.all([
      clientIds.length  ? sb.from("user_profiles").select("id,first_name,last_name,email").in("id",clientIds)        : Promise.resolve({data:[]}),
      agentIds.length   ? sb.from("user_profiles").select("id,first_name,last_name").in("id",agentIds)               : Promise.resolve({data:[]}),
      invoiceIds.length ? sb.from("invoices").select("id,invoice_number,total,currency").in("id",invoiceIds) : Promise.resolve({data:[]}),
    ]);

    const cm = Object.fromEntries((cd??[]).map(c=>[c.id,c]));
    const am = Object.fromEntries((ad??[]).map(a=>[a.id,a]));
    const im = Object.fromEntries((id??[]).map(i=>[i.id,i]));

    const enriched = data.map(c=>({
      ...c,
      client:  c.client_id  ? cm[c.client_id]  : null,
      agent:   c.agent_id   ? am[c.agent_id]   : null,
      invoice: c.invoice_id ? im[c.invoice_id] : null,
    })) as Contract[];

    setContracts(enriched);
    if (selected) {
      const refreshed = enriched.find(c=>c.id===selected.id);
      if (refreshed) setSelected(refreshed);
    }
    setLoading(false);
  }

  async function openDetail(contract: Contract) {
    setSelected(contract);
    setPdfUrl(null);
    if (contract.pdf_path) {
      setPdfLoading(true);
      const { data } = await createClient().storage.from("contracts").createSignedUrl(contract.pdf_path, 1800);
      setPdfUrl(data?.signedUrl ?? null);
      setPdfLoading(false);
    }
  }

  async function updateStatus(id: string, status: ContractStatus) {
    setUpdatingStatus(id);
    const sb = createClient();
    const { error } = await sb.from("contracts").update({ status }).eq("id", id);
    if (error) toast("error", error.message);
    else {
      toast("success", lang==="fr"?"Statut mis à jour":"Status updated");
      await load();
      if (selected?.id===id) setSelected(s=>s?{...s,status}:s);
    }
    setUpdatingStatus(null);
  }

  async function handleCreate() {
    if (!newContract.title || !newContract.clientId) {
      toast("error", lang==="fr"?"Titre et client requis":"Title and client required"); return;
    }
    setCreating(true);
    const sb = createClient();

    let pdfPath: string | null = null;

    // ── Mode auto : générer le PDF via l'API ──────────────────────
    if (newContract.pdfMode === "auto") {
      const selectedClient = clients.find(c => c.id === newContract.clientId);
      const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

      try {
        const res = await fetch("/api/contracts/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            civility:        newContract.civility,
            firstName:       selectedClient?.first_name ?? "",
            lastName:        selectedClient?.last_name  ?? "",
            address:         newContract.address,
            postalCode:      newContract.postalCode,
            city:            newContract.city,
            country:         newContract.country,
            companyName:     newContract.companyName  || undefined,
            companyAddress:  newContract.companyAddress || undefined,
            contractTitle:   newContract.title,
            contractDate:    today,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "PDF generation failed" }));
          toast("error", err.error ?? "Erreur génération PDF");
          setCreating(false);
          return;
        }

        const blob    = await res.blob();
        const pdfFile = new File([blob], `contrat-${selectedClient?.last_name?.toLowerCase()}.pdf`, { type: "application/pdf" });
        pdfPath = `${newContract.clientId}/${Date.now()}.pdf`;

        const { error: upErr } = await sb.storage.from("contracts").upload(pdfPath, pdfFile);
        if (upErr) { toast("error", upErr.message); setCreating(false); return; }

      } catch (e) {
        toast("error", lang==="fr"?"Erreur de génération PDF":"PDF generation error");
        setCreating(false);
        return;
      }
    }

    // ── Mode manuel : upload du fichier ───────────────────────────
    if (newContract.pdfMode === "manual" && newContract.file) {
      const ext = newContract.file.name.split(".").pop();
      pdfPath = `${newContract.clientId}/${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("contracts").upload(pdfPath, newContract.file);
      if (upErr) { toast("error", upErr.message); setCreating(false); return; }
    }

    const { error } = await sb.from("contracts").insert({
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      title: newContract.title,
      version: newContract.version,
      client_id: newContract.clientId,
      pdf_path: pdfPath,
      status: "sent",
      agent_id: newContract.agentId || null,
      commission_type: newContract.agentId && newContract.commissionValue ? newContract.commissionType : null,
      commission_value: newContract.agentId && newContract.commissionValue ? Number(newContract.commissionValue) : null,
      created_by: profile.id,
    });

    if (error) toast("error", error.message);
    else {
      toast("success", lang==="fr"?"Contrat créé et envoyé au client":"Contract created and sent");
      setCreateOpen(false);
      setNewContract({
        title:"", version:"1.0", clientId:"", agentId:"",
        commissionType:"percentage", commissionValue:"", file:null,
        civility:"M.", address:"", city:"", postalCode:"", country:"",
        companyName:"", companyAddress:"", pdfMode:"auto",
      });
      load();
    }
    setCreating(false);
  }

  const clientName = (c: Contract) =>
    c.client ? `${c.client.first_name??""} ${c.client.last_name??""}`.trim() : "—";

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full gap-4">

      {/* ── LEFT: list ─────────────────────────────────────────── */}
      <div className={cn("flex flex-col gap-4 min-w-0",
        selected ? "hidden lg:flex lg:w-[340px] lg:shrink-0" : "flex-1")}>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {isClient ? (lang==="fr"?"Mes contrats":"My Contracts") : (lang==="fr"?"Contrats":"Contracts")}
            </h2>
            <p className="mt-0.5 text-sm text-white/40">
              {contracts.length} contrat{contracts.length!==1?"s":""}
            </p>
          </div>
          {isAdmin && (
            <button onClick={()=>setCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
              <Plus className="h-4 w-4"/>
              {lang==="fr"?"Nouveau":"New"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_,i)=><div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/3"/>)}
          </div>
        ) : contracts.length===0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-14 text-center">
            <FileBadge className="h-8 w-8 text-white/15"/>
            <p className="text-sm text-white/30">{lang==="fr"?"Aucun contrat":"No contracts yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contracts.map(c=>{
              const Icon = STATUS_ICONS[c.status];
              const isSelected = selected?.id===c.id;
              return (
                <button key={c.id} onClick={()=>openDetail(c)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ?"border-blue-500/40 bg-blue-500/8"
                      :"border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
                  )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      c.status==="signed"?"bg-emerald-500/15":c.status==="sent"?"bg-amber-500/15":"bg-white/8")}>
                      <Icon className={cn("h-3.5 w-3.5",
                        c.status==="signed"?"text-emerald-400":c.status==="sent"?"text-amber-400":"text-white/40")}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                        <span className="shrink-0 text-[10px] text-white/25">v{c.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",STATUS_COLORS[c.status])}>
                          {stL[c.status]}
                        </span>
                        {isAdmin && c.client && (
                          <p className="truncate text-xs text-white/35">{clientName(c)}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20"/>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: detail panel ────────────────────────────────── */}
      {selected && (
        <div className="flex flex-1 flex-col gap-4 min-w-0">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={()=>{setSelected(null);setPdfUrl(null);}}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/40 transition-colors hover:bg-white/8 hover:text-white lg:hidden">
                <ArrowLeft className="h-4 w-4"/>
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
                  <span className="text-sm text-white/30">v{selected.version}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium",STATUS_COLORS[selected.status])}>
                    {stL[selected.status]}
                  </span>
                </div>
                <p className="text-xs text-white/40">
                  {lang==="fr"?"Créé le":"Created"} {formatDate(selected.created_at)}
                </p>
              </div>
            </div>

            {isClient && selected.status==="sent" && (
              <button onClick={()=>setSigningContract(selected)}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
                <Pen className="h-4 w-4"/>
                {lang==="fr"?"Signer le contrat":"Sign contract"}
              </button>
            )}
          </div>

          {/* ── Signed banner ─────────────────────────────────── */}
          {selected.status==="signed" && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-5 py-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-emerald-400"/>
              <div>
                <p className="font-semibold text-emerald-300">
                  {lang==="fr"?"Contrat signé électroniquement":"Electronically signed contract"}
                </p>
                {selected.signed_at && (
                  <p className="mt-0.5 text-sm text-white/50">
                    {lang==="fr"
                      ?`Signé le ${formatDate(selected.signed_at)} par ${clientName(selected)}`
                      :`Signed on ${formatDate(selected.signed_at)} by ${clientName(selected)}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Pending signature banner (client) ─────────────── */}
          {isClient && selected.status==="sent" && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-5 py-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"/>
              <div>
                <p className="font-semibold text-white">
                  {lang==="fr"?"Signature requise":"Signature required"}
                </p>
                <p className="mt-0.5 text-sm text-white/55">
                  {lang==="fr"
                    ?"Veuillez lire le contrat et apposer votre signature électronique."
                    :"Please read the contract and apply your electronic signature."}
                </p>
                <button onClick={()=>setSigningContract(selected)}
                  className="mt-3 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
                  <Pen className="h-4 w-4"/>
                  {lang==="fr"?"Signer maintenant":"Sign now"}
                </button>
              </div>
            </div>
          )}

          {/* ── Meta grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {isAdmin && selected.client && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/30">
                  <User className="h-3 w-3"/>Client
                </div>
                <p className="text-sm font-medium text-white">{clientName(selected)}</p>
                <p className="text-xs text-white/40 truncate">{selected.client.email}</p>
              </div>
            )}

            {selected.signed_at && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-400/70">
                  <CheckCircle className="h-3 w-3"/>
                  {lang==="fr"?"Signé le":"Signed on"}
                </div>
                <p className="text-sm font-medium text-white">{formatDate(selected.signed_at)}</p>
                <p className="text-xs text-white/40">{clientName(selected)}</p>
              </div>
            )}

            {selected.invoice && (
              <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/30">
                  <DollarSign className="h-3 w-3"/>
                  {lang==="fr"?"Facture liée":"Linked invoice"}
                </div>
                <p className="text-sm font-medium text-white">{selected.invoice.invoice_number}</p>
                <p className="text-xs text-white/40">{fmt(selected.invoice.total)}</p>
              </div>
            )}

            <div className="rounded-xl border border-white/8 bg-white/3 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/30">
                <Calendar className="h-3 w-3"/>
                {lang==="fr"?"Créé le":"Created"}
              </div>
              <p className="text-sm font-medium text-white">{formatDate(selected.created_at)}</p>
            </div>

            {isAdmin && selected.agent && (
              <div className="col-span-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 sm:col-span-1">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-violet-400/70">
                  <Shield className="h-3 w-3"/>
                  {lang==="fr"?"Commission (privé)":"Commission (private)"}
                </div>
                <p className="text-sm font-medium text-white">
                  {selected.agent.first_name} {selected.agent.last_name}
                </p>
                {selected.commission_value != null && (
                  <p className="text-xs text-violet-300">
                    {selected.commission_type === "percentage"
                      ? `${selected.commission_value}%`
                      : fmt(selected.commission_value)}
                    {" "}{lang==="fr"?"de commission":"commission"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── PDF Viewer ────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden rounded-2xl border border-white/8 bg-white/3">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <p className="text-sm font-semibold text-white">
                {lang==="fr"?"Document contractuel":"Contract document"}
              </p>
              {selected.pdf_path && pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/15 hover:text-white">
                  <Eye className="h-3.5 w-3.5"/>
                  {lang==="fr"?"Ouvrir dans un onglet":"Open in tab"}
                </a>
              )}
            </div>
            <div className="h-[400px]">
              {!selected.pdf_path ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-white/25">
                  <FileText className="h-10 w-10"/>
                  <p className="text-sm">{lang==="fr"?"Aucun PDF joint":"No PDF attached"}</p>
                </div>
              ) : pdfLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner size="lg"/>
                </div>
              ) : pdfUrl ? (
                <iframe src={pdfUrl} className="h-full w-full rounded-b-2xl" title={selected.title}/>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/30">
                  {lang==="fr"?"Impossible de charger le PDF":"Unable to load PDF"}
                </div>
              )}
            </div>
          </div>

          {/* ── Admin: status controls ────────────────────────── */}
          {isAdmin && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-white/30">
                {lang==="fr"?"Changer le statut":"Change status"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["draft","sent","signed","cancelled"] as ContractStatus[])
                  .filter(s=>s!==selected.status)
                  .map(s=>(
                  <button key={s} onClick={()=>updateStatus(selected.id,s)}
                    disabled={updatingStatus===selected.id}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
                      s==="signed"
                        ?"border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        :"border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    )}>
                    → {stL[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sign modal ──────────────────────────────────────────── */}
      {signingContract && (
        <SignContractModal
          contract={signingContract}
          profile={profile}
          onClose={()=>setSigningContract(null)}
          onSigned={()=>{
            setSigningContract(null);
            load();
            toast("success", lang==="fr"?"Contrat signé avec succès !":"Contract signed successfully!");
          }}
        />
      )}

      {/* ── Create contract modal ───────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141418] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#141418] px-5 py-4">
              <p className="font-semibold text-white">
                {lang==="fr"?"Nouveau contrat":"New contract"}
              </p>
              <button onClick={()=>setCreateOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white">
                <X className="h-4 w-4"/>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  {lang==="fr"?"Titre du contrat *":"Contract title *"}
                </label>
                <input value={newContract.title}
                  onChange={e=>setNewContract(n=>({...n,title:e.target.value}))}
                  placeholder={lang==="fr"?"Ex : Contrat création LTD — Jean Dupont":"Ex: LTD setup agreement — John Smith"}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"/>
              </div>

              {/* Client + Version */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang==="fr"?"Client *":"Client *"}
                  </label>
                  <select value={newContract.clientId}
                    onChange={e=>setNewContract(n=>({...n,clientId:e.target.value}))}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30">
                    <option value="">{lang==="fr"?"Sélectionner":"Select"}</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">Version</label>
                  <input value={newContract.version}
                    onChange={e=>setNewContract(n=>({...n,version:e.target.value}))}
                    placeholder="1.0"
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"/>
                </div>
              </div>

              {/* PDF Mode toggle */}
              <div>
                <label className="mb-2 block text-xs font-medium text-white/50">
                  {lang==="fr"?"Document PDF":"PDF Document"}
                </label>
                <div className="flex gap-2 rounded-xl border border-white/10 bg-[#16161c] p-1">
                  <button
                    onClick={()=>setNewContract(n=>({...n,pdfMode:"auto"}))}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all",
                      newContract.pdfMode==="auto"
                        ?"bg-blue-600 text-white shadow-sm"
                        :"text-white/40 hover:text-white/60"
                    )}>
                    <Sparkles className="h-3.5 w-3.5"/>
                    {lang==="fr"?"Générer automatiquement":"Auto-generate"}
                  </button>
                  <button
                    onClick={()=>setNewContract(n=>({...n,pdfMode:"manual"}))}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all",
                      newContract.pdfMode==="manual"
                        ?"bg-white/12 text-white"
                        :"text-white/40 hover:text-white/60"
                    )}>
                    <Upload className="h-3.5 w-3.5"/>
                    {lang==="fr"?"Uploader un PDF":"Upload PDF"}
                  </button>
                </div>
              </div>

              {/* Auto-generate fields */}
              {newContract.pdfMode === "auto" && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400"/>
                    <p className="text-xs font-semibold text-blue-300">
                      {lang==="fr"?"Informations pour le contrat":"Contract information"}
                    </p>
                  </div>

                  {/* Civility + Name (read-only, from client) */}
                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="mb-1 block text-[10px] font-medium text-white/40">Civilité</label>
                      <select value={newContract.civility}
                        onChange={e=>setNewContract(n=>({...n,civility:e.target.value as "M."|"Mme."}))}
                        className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-2 py-2 text-xs text-white outline-none focus:border-white/30">
                        <option value="M.">M.</option>
                        <option value="Mme.">Mme.</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-medium text-white/40">
                        {lang==="fr"?"Nom complet (auto)":"Full name (auto)"}
                      </label>
                      <div className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/50">
                        {newContract.clientId
                          ? (() => { const c = clients.find(x=>x.id===newContract.clientId); return c ? `${c.first_name??""} ${c.last_name??""}`.trim() : "—"; })()
                          : <span className="text-white/25">{lang==="fr"?"Sélectionner un client":"Select a client"}</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-white/40">
                      {lang==="fr"?"Adresse":"Address"}
                    </label>
                    <input value={newContract.address}
                      onChange={e=>setNewContract(n=>({...n,address:e.target.value}))}
                      placeholder={lang==="fr"?"Rue, numéro...":"Street, number..."}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-white/40">
                        {lang==="fr"?"Code postal":"Postal code"}
                      </label>
                      <input value={newContract.postalCode}
                        onChange={e=>setNewContract(n=>({...n,postalCode:e.target.value}))}
                        placeholder="1000"
                        className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-[10px] font-medium text-white/40">
                        {lang==="fr"?"Ville":"City"}
                      </label>
                      <input value={newContract.city}
                        onChange={e=>setNewContract(n=>({...n,city:e.target.value}))}
                        placeholder={lang==="fr"?"Lausanne...":"London..."}
                        className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-white/40">
                      {lang==="fr"?"Pays":"Country"}
                    </label>
                    <input value={newContract.country}
                      onChange={e=>setNewContract(n=>({...n,country:e.target.value}))}
                      placeholder={lang==="fr"?"Suisse, France...":"Switzerland, France..."}
                      className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                  </div>

                  {/* Optional company info */}
                  <div className="pt-1 border-t border-white/8">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Building2 className="h-3 w-3 text-white/30"/>
                      <p className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                        {lang==="fr"?"Société (optionnel)":"Company (optional)"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <input value={newContract.companyName}
                        onChange={e=>setNewContract(n=>({...n,companyName:e.target.value}))}
                        placeholder={lang==="fr"?"Nom de la société":"Company name"}
                        className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                      <input value={newContract.companyAddress}
                        onChange={e=>setNewContract(n=>({...n,companyAddress:e.target.value}))}
                        placeholder={lang==="fr"?"Adresse de la société":"Company address"}
                        className="w-full rounded-lg border border-white/10 bg-[#1a1a20] px-3 py-2 text-xs text-white outline-none focus:border-white/30 placeholder:text-white/20"/>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual PDF upload */}
              {newContract.pdfMode === "manual" && (
                <div>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                    onChange={e=>setNewContract(n=>({...n,file:e.target.files?.[0]??null}))}/>
                  <button onClick={()=>fileRef.current?.click()}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm transition-colors",
                      newContract.file
                        ?"border-blue-500/40 bg-blue-500/8 text-blue-300"
                        :"border-white/20 bg-white/3 text-white/50 hover:border-white/40 hover:bg-white/5"
                    )}>
                    <Upload className="h-4 w-4"/>
                    {newContract.file ? newContract.file.name : (lang==="fr"?"Déposer le PDF ici":"Drop PDF here")}
                  </button>
                </div>
              )}

              {/* Agent + Commission */}
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/70">
                  {lang==="fr"?"Apporteur d'affaires (non visible client)":"Referral agent (hidden from client)"}
                </p>
                <select value={newContract.agentId}
                  onChange={e=>setNewContract(n=>({...n,agentId:e.target.value}))}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1a20] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30">
                  <option value="">{lang==="fr"?"Aucun apporteur":"No referral agent"}</option>
                  {agents.map(a=><option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
                {newContract.agentId && (
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {(["percentage","fixed"] as const).map(t=>(
                        <button key={t} onClick={()=>setNewContract(n=>({...n,commissionType:t}))}
                          className={cn("rounded-lg px-3 py-1.5 text-xs font-medium",
                            newContract.commissionType===t?"bg-violet-600 text-white":"bg-white/8 text-white/40")}>
                          {t==="percentage"?"%":(lang==="fr"?"Fixe":"Fixed")}
                        </button>
                      ))}
                    </div>
                    <input value={newContract.commissionValue}
                      onChange={e=>setNewContract(n=>({...n,commissionValue:e.target.value}))}
                      type="number" placeholder={newContract.commissionType==="percentage"?"Ex: 10":"Ex: 500"}
                      className="flex-1 rounded-xl border border-white/10 bg-[#16161c] px-3 py-1.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25"/>
                  </div>
                )}
              </div>

              <button onClick={handleCreate}
                disabled={creating || !newContract.title || !newContract.clientId}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
                {creating ? (
                  <>
                    <Spinner size="sm"/>
                    {newContract.pdfMode==="auto"
                      ? (lang==="fr"?"Génération du PDF...":"Generating PDF...")
                      : (lang==="fr"?"Création...":"Creating...")}
                  </>
                ) : (
                  <>
                    {newContract.pdfMode==="auto" ? <Sparkles className="h-4 w-4"/> : <Send className="h-4 w-4"/>}
                    {lang==="fr"?"Créer & envoyer au client":"Create & send to client"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
