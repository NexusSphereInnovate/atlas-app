"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  X,
  Edit2,
  Save,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Upload,
  Trash2,
  Download,
  Calendar,
  MapPin,
  BookOpen,
  Banknote,
  Shield,
  ExternalLink,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/contexts/language-context";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { cn, formatDate } from "@/lib/utils";
import { Company, CompanyStatus } from "@/types/database";
import { UserProfile } from "@/types/profile";

// ─── Constants ────────────────────────────────────────────────────────────────

const SWISS_CANTONS = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU",
  "NE","NW","OW","SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH",
];

const EMPTY_CREATE = {
  clientId: "",
  name: "",
  companyNumber: "",
  incorporationDate: "",
  registeredAddress: "",
  hasBranchCh: false,
  branchCanton: "",
  branchAddress: "",
  complianceDueDate: "",
  accountingPack: false,
  adminNotes: "",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocEntry {
  id: string;
  name: string;
  label: string | null;
  storage_path: string;
  created_at: string;
  mime_type: string | null;
}

interface Props {
  profile: UserProfile;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getComplianceStatus(dueDate: string | null): "ok" | "soon" | "overdue" {
  if (!dueDate) return "ok";
  const diff = new Date(dueDate).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0) return "overdue";
  if (days < 60) return "soon";
  return "ok";
}

function statusColor(status: CompanyStatus | string): string {
  switch (status) {
    case "active":       return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "dormant":      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "dissolved":    return "text-red-400 bg-red-400/10 border-red-400/20";
    case "in_dissolution": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    default:             return "text-white/40 bg-white/5 border-white/10";
  }
}

function statusIconColor(status: CompanyStatus | string): string {
  switch (status) {
    case "active":       return "text-emerald-400";
    case "dormant":      return "text-amber-400";
    case "dissolved":    return "text-red-400";
    case "in_dissolution": return "text-orange-400";
    default:             return "text-white/30";
  }
}

function statusLabel(status: CompanyStatus | string, lang: string): string {
  const map: Record<string, { fr: string; en: string }> = {
    active:         { fr: "Active",          en: "Active" },
    dormant:        { fr: "Dormante",         en: "Dormant" },
    dissolved:      { fr: "Dissoute",         en: "Dissolved" },
    in_dissolution: { fr: "En dissolution",   en: "In dissolution" },
  };
  const entry = map[status];
  if (!entry) return status;
  return lang === "fr" ? entry.fr : entry.en;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompaniesModule({ profile }: Props) {
  const { lang } = useLang();
  const { fmt } = useCurrency();
  const { toast } = useToast();

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";

  // List state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail state
  const [selected, setSelected] = useState<Company | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);

  // Clients list (admin only)
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string; email: string }[]>([]);

  // Documents
  const [documents, setDocuments] = useState<DocEntry[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Dissolution confirm
  const [dissolutionConfirm, setDissolutionConfirm] = useState(false);

  // ─── Data loading ──────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    const sb = createClient();
    let q = sb
      .from("companies")
      .select(`*, client:user_profiles!companies_client_id_fkey(first_name, last_name, email)`)
      .order("created_at", { ascending: false });
    if (isClient) q = q.eq("client_id", profile.id);
    const { data } = await q;
    setCompanies(data ?? []);
    setLoading(false);
  }

  async function loadDocuments(companyId: string) {
    setDocLoading(true);
    const sb = createClient();
    const { data } = await sb
      .from("documents")
      .select("id, name, label, storage_path, created_at, mime_type")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setDocuments(data ?? []);
    setDocLoading(false);
  }

  async function loadClients() {
    const sb = createClient();
    const { data } = await sb
      .from("user_profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "client");
    setClients(data ?? []);
  }

  useEffect(() => {
    load();
    if (isAdmin) loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Detail open ──────────────────────────────────────────────────────────

  async function openDetail(company: Company) {
    setSelected(company);
    setEditing(false);
    setDissolutionConfirm(false);
    setEditForm({
      name: company.name,
      company_number: company.company_number,
      incorporation_date: company.incorporation_date,
      registered_address: company.registered_address,
      status: company.status,
      has_branch_ch: company.has_branch_ch,
      branch_canton: company.branch_canton,
      branch_address: company.branch_address,
      branch_created_date: company.branch_created_date,
      compliance_due_date: company.compliance_due_date,
      last_compliance_date: company.last_compliance_date,
      compliance_price: company.compliance_price,
      compliance_currency: company.compliance_currency,
      accounting_pack: company.accounting_pack,
      accounting_price: company.accounting_price,
      accounting_currency: company.accounting_currency,
      dissolution_price: company.dissolution_price,
      dissolution_currency: company.dissolution_currency,
      admin_notes: company.admin_notes,
    });
    loadDocuments(company.id);
  }

  // ─── Save edit ────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("companies")
      .update({ ...editForm, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (error) { toast("error", error.message); setSaving(false); return; }
    toast("success", lang === "fr" ? "Société mise à jour" : "Company updated");
    setSaving(false);
    setEditing(false);
    await load();
    setSelected((s) => (s ? { ...s, ...editForm } as Company : s));
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!createForm.clientId || !createForm.name) {
      toast("error", lang === "fr" ? "Client et nom requis" : "Client and name required");
      return;
    }
    setCreating(true);
    const sb = createClient();
    const { error } = await sb.from("companies").insert({
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      client_id: createForm.clientId,
      name: createForm.name,
      company_number: createForm.companyNumber || null,
      incorporation_date: createForm.incorporationDate || null,
      registered_address: createForm.registeredAddress || null,
      has_branch_ch: createForm.hasBranchCh,
      branch_canton: createForm.branchCanton || null,
      branch_address: createForm.branchAddress || null,
      compliance_due_date: createForm.complianceDueDate || null,
      accounting_pack: createForm.accountingPack,
      admin_notes: createForm.adminNotes || null,
      created_by: profile.id,
    });
    if (error) { toast("error", error.message); setCreating(false); return; }
    toast("success", lang === "fr" ? "Société créée" : "Company created");
    setCreating(false);
    setCreateOpen(false);
    setCreateForm(EMPTY_CREATE);
    load();
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>, companyId: string) {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    const sb = createClient();
    const path = `companies/${companyId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await sb.storage.from("documents").upload(path, file);
    if (upErr) { toast("error", upErr.message); setUploading(false); return; }
    await sb.from("documents").insert({
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      client_id: selected.client_id,
      company_id: companyId,
      uploaded_by: profile.id,
      category: "company",
      visibility: "client",
      name: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
    });
    toast("success", lang === "fr" ? "Document ajouté" : "Document added");
    setUploading(false);
    loadDocuments(companyId);
    e.target.value = "";
  }

  async function handleDocDelete(docId: string) {
    if (!selected) return;
    const sb = createClient();
    await sb.from("documents").delete().eq("id", docId);
    toast("success", lang === "fr" ? "Document supprimé" : "Document deleted");
    loadDocuments(selected.id);
  }

  async function getDocUrl(path: string): Promise<string | null> {
    const sb = createClient();
    const { data } = await sb.storage.from("documents").createSignedUrl(path, 1800);
    return data?.signedUrl ?? null;
  }

  async function handleDownload(path: string) {
    const url = await getDocUrl(path);
    if (url) window.open(url, "_blank");
    else toast("error", lang === "fr" ? "Erreur de téléchargement" : "Download error");
  }

  // ─── Dissolution ──────────────────────────────────────────────────────────

  async function handleDissolution() {
    if (!selected) return;
    const sb = createClient();
    await sb.from("companies").update({ status: "in_dissolution", updated_at: new Date().toISOString() }).eq("id", selected.id);
    toast("success", lang === "fr" ? "Demande de résiliation soumise" : "Dissolution request submitted");
    setDissolutionConfirm(false);
    await load();
    setSelected((s) => (s ? { ...s, status: "in_dissolution" as CompanyStatus } : s));
  }

  // ─── Shared input style ───────────────────────────────────────────────────

  const inputCls = "w-full bg-[#16161c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 focus:bg-[#1e1e26] transition-colors";
  const labelCls = "block text-xs text-white/40 mb-1";
  const cardCls = "rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── LEFT LIST ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col border-r border-white/8 bg-[#0a0a0d] shrink-0",
          "w-full md:w-[380px]",
          selected ? "hidden md:flex" : "flex"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white/40" />
            <h2 className="font-semibold text-white text-sm">
              {lang === "fr" ? "Mes Sociétés" : "My Companies"}
            </h2>
          </div>
          {isAdmin && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs text-white/70 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {lang === "fr" ? "Ajouter" : "Add"}
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-white/30">
              <Building2 className="w-10 h-10" />
              <p className="text-sm">
                {lang === "fr" ? "Aucune société" : "No companies"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {companies.map((co) => (
                <li key={co.id}>
                  <button
                    onClick={() => openDetail(co)}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-5 py-4 hover:bg-white/4 transition-colors",
                      selected?.id === co.id && "bg-white/6"
                    )}
                  >
                    <Building2 className={cn("w-5 h-5 shrink-0", statusIconColor(co.status))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{co.name}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0", statusColor(co.status))}>
                          {statusLabel(co.status, lang)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isAdmin && co.client && (
                          <span className="text-xs text-white/40 truncate">
                            {co.client.first_name} {co.client.last_name}
                          </span>
                        )}
                        {co.created_at && (
                          <span className="text-xs text-white/25 shrink-0">
                            {formatDate(co.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── RIGHT DETAIL PANEL ────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-[#0a0a0d] overflow-hidden",
          selected ? "flex" : "hidden md:flex"
        )}
      >
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
            <Building2 className="w-12 h-12" />
            <p className="text-sm">
              {lang === "fr" ? "Sélectionnez une société" : "Select a company"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Detail header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0 sticky top-0 bg-[#0a0a0d] z-10">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white truncate">{selected.name}</h3>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0", statusColor(selected.status))}>
                    {statusLabel(selected.status, lang)}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 shrink-0">
                  {editing ? (
                    <>
                      <button
                        onClick={() => setEditing(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs text-white/60 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        {lang === "fr" ? "Annuler" : "Cancel"}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-xs text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Spinner className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                        {lang === "fr" ? "Enregistrer" : "Save"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs text-white/60 hover:text-white transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {lang === "fr" ? "Modifier" : "Edit"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Detail body */}
            <div className="flex-1 p-5 space-y-4">

              {/* ── Company info card ──────────────────────────────────── */}
              <div className={cardCls}>
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {lang === "fr" ? "Informations société" : "Company information"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Company number */}
                  <div>
                    <p className={labelCls}>{lang === "fr" ? "Numéro de société" : "Company number"}</p>
                    {editing ? (
                      <input
                        className={inputCls}
                        value={editForm.company_number ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, company_number: e.target.value }))}
                        placeholder="e.g. 12345678"
                      />
                    ) : (
                      <p className="text-sm text-white">{selected.company_number || <span className="text-white/30">—</span>}</p>
                    )}
                  </div>

                  {/* Incorporation date */}
                  <div>
                    <p className={labelCls}>{lang === "fr" ? "Date de constitution" : "Incorporation date"}</p>
                    {editing ? (
                      <input
                        type="date"
                        className={inputCls}
                        value={editForm.incorporation_date ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, incorporation_date: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm text-white">
                        {selected.incorporation_date ? formatDate(selected.incorporation_date) : <span className="text-white/30">—</span>}
                      </p>
                    )}
                  </div>

                  {/* Status (admin edit) */}
                  {isAdmin && editing && (
                    <div>
                      <p className={labelCls}>{lang === "fr" ? "Statut" : "Status"}</p>
                      <select
                        className={inputCls}
                        value={editForm.status ?? selected.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as CompanyStatus }))}
                      >
                        <option value="active">{lang === "fr" ? "Active" : "Active"}</option>
                        <option value="dormant">{lang === "fr" ? "Dormante" : "Dormant"}</option>
                        <option value="in_dissolution">{lang === "fr" ? "En dissolution" : "In dissolution"}</option>
                        <option value="dissolved">{lang === "fr" ? "Dissoute" : "Dissolved"}</option>
                      </select>
                    </div>
                  )}

                  {/* Client (admin) */}
                  {isAdmin && selected.client && (
                    <div>
                      <p className={labelCls}>{lang === "fr" ? "Client" : "Client"}</p>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-white/30" />
                        <p className="text-sm text-white">
                          {selected.client.first_name} {selected.client.last_name}
                        </p>
                      </div>
                      <p className="text-xs text-white/30 mt-0.5">{selected.client.email}</p>
                    </div>
                  )}

                  {/* Registered address */}
                  <div className="sm:col-span-2">
                    <p className={labelCls}>
                      <MapPin className="inline w-3 h-3 mr-1" />
                      {lang === "fr" ? "Adresse enregistrée" : "Registered address"}
                    </p>
                    {editing ? (
                      <textarea
                        className={cn(inputCls, "resize-none")}
                        rows={2}
                        value={editForm.registered_address ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, registered_address: e.target.value }))}
                      />
                    ) : (
                      <p className="text-sm text-white whitespace-pre-line">
                        {selected.registered_address || <span className="text-white/30">—</span>}
                      </p>
                    )}
                  </div>

                  {/* Admin notes */}
                  {isAdmin && (
                    <div className="sm:col-span-2">
                      <p className={labelCls}>{lang === "fr" ? "Notes admin" : "Admin notes"}</p>
                      {editing ? (
                        <textarea
                          className={cn(inputCls, "resize-none")}
                          rows={2}
                          value={editForm.admin_notes ?? ""}
                          onChange={(e) => setEditForm((f) => ({ ...f, admin_notes: e.target.value }))}
                        />
                      ) : (
                        <p className="text-sm text-white/60 whitespace-pre-line">
                          {selected.admin_notes || <span className="text-white/30">—</span>}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Compliance section ─────────────────────────────────── */}
              {(() => {
                const complianceStatus = getComplianceStatus(selected.compliance_due_date);
                return (
                  <div
                    className={cn(
                      "rounded-2xl border p-5 space-y-4",
                      complianceStatus === "overdue"
                        ? "border-red-500/30 bg-red-500/8"
                        : complianceStatus === "soon"
                        ? "border-amber-500/30 bg-amber-500/8"
                        : "border-white/8 bg-white/3"
                    )}
                  >
                    <div className="flex items-center gap-2 text-white/60">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {lang === "fr" ? "Mise en conformité annuelle" : "Annual compliance"}
                      </span>
                      {complianceStatus === "overdue" && (
                        <span className="ml-auto text-xs font-medium text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {lang === "fr" ? "En retard" : "Overdue"}
                        </span>
                      )}
                      {complianceStatus === "soon" && (
                        <span className="ml-auto text-xs font-medium text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {lang === "fr" ? "Bientôt dû" : "Due soon"}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className={labelCls}>{lang === "fr" ? "Date d'échéance" : "Due date"}</p>
                        {editing ? (
                          <input
                            type="date"
                            className={inputCls}
                            value={editForm.compliance_due_date ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, compliance_due_date: e.target.value }))}
                          />
                        ) : (
                          <p className="text-sm text-white">
                            {selected.compliance_due_date ? formatDate(selected.compliance_due_date) : <span className="text-white/30">—</span>}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className={labelCls}>{lang === "fr" ? "Dernière conformité" : "Last compliance"}</p>
                        {editing ? (
                          <input
                            type="date"
                            className={inputCls}
                            value={editForm.last_compliance_date ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, last_compliance_date: e.target.value }))}
                          />
                        ) : (
                          <p className="text-sm text-white">
                            {selected.last_compliance_date ? formatDate(selected.last_compliance_date) : <span className="text-white/30">—</span>}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className={labelCls}>{lang === "fr" ? "Prix" : "Price"}</p>
                        {editing ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              className={cn(inputCls, "flex-1")}
                              value={editForm.compliance_price ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, compliance_price: parseFloat(e.target.value) }))}
                            />
                            <input
                              className="w-20 bg-[#16161c] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                              value={editForm.compliance_currency ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, compliance_currency: e.target.value }))}
                              placeholder="CHF"
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-white">
                            {selected.compliance_price != null
                              ? `${selected.compliance_price} ${selected.compliance_currency ?? "CHF"}`
                              : <span className="text-white/30">—</span>}
                          </p>
                        )}
                      </div>
                      {isAdmin && editing && (
                        <div className="flex items-end">
                          <button
                            onClick={() => toast("success", `${lang === "fr" ? "Créer une facture de" : "Create invoice for"} ${editForm.compliance_price ?? selected.compliance_price ?? "?"} ${editForm.compliance_currency ?? selected.compliance_currency ?? "CHF"} ${lang === "fr" ? "pour renouvellement" : "for renewal"}`)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-xs text-white/60 hover:text-white transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {lang === "fr" ? "Créer facture renouvellement" : "Create renewal invoice"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Warning box */}
                    <div className="flex gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300/80 leading-relaxed">
                        {lang === "fr"
                          ? "Attention : le non-respect des obligations de mise en conformité annuelle peut entraîner des amendes pouvant atteindre 4 000 £ ainsi que la dissolution administrative de votre société."
                          : "Warning: failure to comply with annual compliance obligations may result in fines of up to £4,000 and administrative dissolution of your company."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* ── Accounting pack section ────────────────────────────── */}
              <div className={cardCls}>
                <div className="flex items-center gap-2 text-white/60">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {lang === "fr" ? "Pack comptabilité UK" : "UK Accounting pack"}
                  </span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  {lang === "fr"
                    ? "Notre pack comptabilité inclut la tenue des livres, la déclaration fiscale annuelle et le dépôt des comptes auprès de Companies House."
                    : "Our accounting pack includes bookkeeping, annual tax return filing, and accounts submission to Companies House."}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    {(editing ? editForm.accounting_pack : selected.accounting_pack) ? (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {lang === "fr" ? "Activé" : "Enabled"}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-white/30">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm">
                          {lang === "fr" ? "Non activé" : "Not enabled"}
                        </span>
                      </div>
                    )}
                    {(editing ? editForm.accounting_pack : selected.accounting_pack) && (
                      <p className="text-sm text-white mt-1">
                        {editing
                          ? `${editForm.accounting_price ?? selected.accounting_price ?? "?"} ${editForm.accounting_currency ?? selected.accounting_currency ?? "CHF"}`
                          : `${selected.accounting_price ?? "?"} ${selected.accounting_currency ?? "CHF"}`}
                        <span className="text-white/40 text-xs ml-1">/an</span>
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-3">
                      {editing && (
                        <>
                          <input
                            type="number"
                            className="w-24 bg-[#16161c] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                            value={editForm.accounting_price ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, accounting_price: parseFloat(e.target.value) }))}
                            placeholder="Prix"
                          />
                          <input
                            className="w-16 bg-[#16161c] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                            value={editForm.accounting_currency ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, accounting_currency: e.target.value }))}
                            placeholder="CHF"
                          />
                        </>
                      )}
                      <button
                        onClick={() => setEditForm((f) => ({ ...f, accounting_pack: !f.accounting_pack }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                          (editing ? editForm.accounting_pack : selected.accounting_pack)
                            ? "bg-emerald-500"
                            : "bg-white/15"
                        )}
                        disabled={!editing}
                      >
                        <span
                          className={cn(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            (editing ? editForm.accounting_pack : selected.accounting_pack)
                              ? "translate-x-6"
                              : "translate-x-1"
                          )}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Branch section ─────────────────────────────────────── */}
              {(selected.has_branch_ch || (isAdmin && editing)) && (
                <div className={cardCls}>
                  <div className="flex items-center gap-2 text-white/60">
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {lang === "fr" ? "Succursale Suisse" : "Swiss branch"}
                    </span>
                    {isAdmin && editing && (
                      <label className="ml-auto flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-white/40">{lang === "fr" ? "Activer" : "Enable"}</span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-emerald-500"
                          checked={editForm.has_branch_ch ?? false}
                          onChange={(e) => setEditForm((f) => ({ ...f, has_branch_ch: e.target.checked }))}
                        />
                      </label>
                    )}
                  </div>

                  {!(editing ? editForm.has_branch_ch : selected.has_branch_ch) ? (
                    <p className="text-sm text-white/30">
                      {lang === "fr" ? "Aucune succursale enregistrée" : "No registered branch"}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className={labelCls}>{lang === "fr" ? "Canton" : "Canton"}</p>
                        {editing ? (
                          <select
                            className={inputCls}
                            value={editForm.branch_canton ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, branch_canton: e.target.value }))}
                          >
                            <option value="">{lang === "fr" ? "Choisir…" : "Select…"}</option>
                            {SWISS_CANTONS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm text-white">{selected.branch_canton || <span className="text-white/30">—</span>}</p>
                        )}
                      </div>
                      <div>
                        <p className={labelCls}>{lang === "fr" ? "Date de création" : "Created date"}</p>
                        {editing ? (
                          <input
                            type="date"
                            className={inputCls}
                            value={editForm.branch_created_date ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, branch_created_date: e.target.value }))}
                          />
                        ) : (
                          <p className="text-sm text-white">
                            {selected.branch_created_date ? formatDate(selected.branch_created_date) : <span className="text-white/30">—</span>}
                          </p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <p className={labelCls}>{lang === "fr" ? "Adresse de la succursale" : "Branch address"}</p>
                        {editing ? (
                          <textarea
                            className={cn(inputCls, "resize-none")}
                            rows={2}
                            value={editForm.branch_address ?? ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, branch_address: e.target.value }))}
                          />
                        ) : (
                          <p className="text-sm text-white whitespace-pre-line">
                            {selected.branch_address || <span className="text-white/30">—</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Documents section ──────────────────────────────────── */}
              <div className={cardCls}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {lang === "fr" ? "Documents" : "Documents"}
                    </span>
                  </div>
                  {isAdmin && (
                    <label className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs text-white/60 hover:text-white transition-colors cursor-pointer",
                      uploading && "opacity-50 pointer-events-none"
                    )}>
                      {uploading ? <Spinner className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
                      {lang === "fr" ? "Ajouter" : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleDocUpload(e, selected.id)}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {docLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-white/30 py-2">
                    {lang === "fr" ? "Aucun document" : "No documents"}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/6 hover:bg-white/6 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-white/30 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{doc.name}</p>
                          {doc.label && <p className="text-xs text-white/40 truncate">{doc.label}</p>}
                          <p className="text-xs text-white/25">{formatDate(doc.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleDownload(doc.storage_path)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            title={lang === "fr" ? "Télécharger" : "Download"}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDocDelete(doc.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              title={lang === "fr" ? "Supprimer" : "Delete"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ── Dissolution section ────────────────────────────────── */}
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-red-400/70">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {lang === "fr" ? "Résiliation de la société" : "Company dissolution"}
                  </span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  {lang === "fr"
                    ? "La dissolution entraîne la fermeture définitive de votre société. Cette action est irréversible et implique la radiation du registre des sociétés."
                    : "Dissolution leads to the permanent closure of your company. This action is irreversible and results in removal from the companies register."}
                </p>
                <div className="flex items-center justify-between">
                  {(selected.dissolution_price != null) && (
                    <p className="text-sm text-white">
                      <Banknote className="inline w-3.5 h-3.5 mr-1 text-white/30" />
                      {selected.dissolution_price} {selected.dissolution_currency ?? "CHF"}
                    </p>
                  )}
                  {isAdmin && editing && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-24 bg-[#16161c] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                        value={editForm.dissolution_price ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, dissolution_price: parseFloat(e.target.value) }))}
                        placeholder="Prix"
                      />
                      <input
                        className="w-16 bg-[#16161c] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                        value={editForm.dissolution_currency ?? ""}
                        onChange={(e) => setEditForm((f) => ({ ...f, dissolution_currency: e.target.value }))}
                        placeholder="CHF"
                      />
                    </div>
                  )}
                </div>

                {selected.status !== "dissolved" && selected.status !== "in_dissolution" && (
                  <>
                    {!dissolutionConfirm ? (
                      <button
                        onClick={() => setDissolutionConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-sm text-red-400 transition-colors"
                      >
                        <Shield className="w-4 h-4" />
                        {lang === "fr" ? "Demander la résiliation" : "Request dissolution"}
                      </button>
                    ) : (
                      <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <div className="flex-1">
                          <p className="text-sm text-red-300 font-medium mb-1">
                            {lang === "fr" ? "Confirmer la résiliation ?" : "Confirm dissolution?"}
                          </p>
                          <p className="text-xs text-red-300/60">
                            {lang === "fr" ? "Cette action est irréversible." : "This action cannot be undone."}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setDissolutionConfirm(false)}
                            className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/12 text-xs text-white/60 transition-colors"
                          >
                            {lang === "fr" ? "Annuler" : "Cancel"}
                          </button>
                          <button
                            onClick={handleDissolution}
                            className="px-3 py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-xs text-red-300 transition-colors"
                          >
                            {lang === "fr" ? "Confirmer" : "Confirm"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(selected.status === "in_dissolution" || selected.status === "dissolved") && (
                  <div className="flex items-center gap-2 text-orange-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {selected.status === "in_dissolution"
                      ? (lang === "fr" ? "Dissolution en cours" : "Dissolution in progress")
                      : (lang === "fr" ? "Société dissoute" : "Company dissolved")}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ──────────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#111115] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/40" />
                <h3 className="font-semibold text-white text-sm">
                  {lang === "fr" ? "Nouvelle société" : "New company"}
                </h3>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Client selector */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Client *" : "Client *"}</label>
                <select
                  className={inputCls}
                  value={createForm.clientId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, clientId: e.target.value }))}
                >
                  <option value="">{lang === "fr" ? "Sélectionner un client…" : "Select a client…"}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Company name */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Nom de la société *" : "Company name *"}</label>
                <input
                  className={inputCls}
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={lang === "fr" ? "Nom de la société" : "Company name"}
                />
              </div>

              {/* Company number */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Numéro de société" : "Company number"}</label>
                <input
                  className={inputCls}
                  value={createForm.companyNumber}
                  onChange={(e) => setCreateForm((f) => ({ ...f, companyNumber: e.target.value }))}
                  placeholder="e.g. 12345678"
                />
              </div>

              {/* Incorporation date */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Date de constitution" : "Incorporation date"}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={createForm.incorporationDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, incorporationDate: e.target.value }))}
                />
              </div>

              {/* Registered address */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Adresse enregistrée" : "Registered address"}</label>
                <textarea
                  className={cn(inputCls, "resize-none")}
                  rows={2}
                  value={createForm.registeredAddress}
                  onChange={(e) => setCreateForm((f) => ({ ...f, registeredAddress: e.target.value }))}
                />
              </div>

              {/* Compliance due date */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Date d'échéance conformité" : "Compliance due date"}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={createForm.complianceDueDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, complianceDueDate: e.target.value }))}
                />
              </div>

              {/* Has branch CH */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hasBranchCh"
                  className="w-4 h-4 accent-emerald-500"
                  checked={createForm.hasBranchCh}
                  onChange={(e) => setCreateForm((f) => ({ ...f, hasBranchCh: e.target.checked }))}
                />
                <label htmlFor="hasBranchCh" className="text-sm text-white/60 cursor-pointer">
                  {lang === "fr" ? "Succursale en Suisse" : "Swiss branch"}
                </label>
              </div>

              {createForm.hasBranchCh && (
                <div className="space-y-3 pl-4 border-l border-white/8">
                  <div>
                    <label className={labelCls}>{lang === "fr" ? "Canton" : "Canton"}</label>
                    <select
                      className={inputCls}
                      value={createForm.branchCanton}
                      onChange={(e) => setCreateForm((f) => ({ ...f, branchCanton: e.target.value }))}
                    >
                      <option value="">{lang === "fr" ? "Choisir…" : "Select…"}</option>
                      {SWISS_CANTONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{lang === "fr" ? "Adresse de la succursale" : "Branch address"}</label>
                    <textarea
                      className={cn(inputCls, "resize-none")}
                      rows={2}
                      value={createForm.branchAddress}
                      onChange={(e) => setCreateForm((f) => ({ ...f, branchAddress: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Accounting pack */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="accountingPack"
                  className="w-4 h-4 accent-emerald-500"
                  checked={createForm.accountingPack}
                  onChange={(e) => setCreateForm((f) => ({ ...f, accountingPack: e.target.checked }))}
                />
                <label htmlFor="accountingPack" className="text-sm text-white/60 cursor-pointer">
                  {lang === "fr" ? "Pack comptabilité UK" : "UK Accounting pack"}
                </label>
              </div>

              {/* Admin notes */}
              <div>
                <label className={labelCls}>{lang === "fr" ? "Notes admin" : "Admin notes"}</label>
                <textarea
                  className={cn(inputCls, "resize-none")}
                  rows={2}
                  value={createForm.adminNotes}
                  onChange={(e) => setCreateForm((f) => ({ ...f, adminNotes: e.target.value }))}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/8 shrink-0">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-sm text-white/60 hover:text-white transition-colors"
              >
                {lang === "fr" ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/25 text-sm text-emerald-400 transition-colors disabled:opacity-50"
              >
                {creating ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {lang === "fr" ? "Créer" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
