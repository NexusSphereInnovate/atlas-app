"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Building2, CheckCircle, Clock, Edit3,
  Code2, DollarSign, Users, GitBranch, User, Save,
  AlertTriangle, Upload, FileText, Download, MapPin,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { useLang } from "@/lib/contexts/language-context";
import { Spinner } from "@/components/ui/spinner";
import { SIC_CODES } from "./sic-codes";
import type { UserProfile } from "@/types/profile";
import type { CompanyRequestStatus } from "@/types/database";

const STATUS_ORDER: CompanyRequestStatus[] = [
  "draft", "info_submitted", "kyc_required", "kyc_in_review",
  "identity_verification", "company_created",
  "branch_preparation", "completed",
];

const KYC_DOC_TYPES = [
  { key: "passport",        fr: "Passeport",             en: "Passport" },
  { key: "national_id",     fr: "Carte d'identité",      en: "National ID" },
  { key: "residence_permit",fr: "Titre de séjour",       en: "Residence permit" },
  { key: "drivers_license", fr: "Permis de conduire",    en: "Driver's licence" },
  { key: "proof_of_address",fr: "Justificatif d'adresse",en: "Proof of address" },
  { key: "kbis",            fr: "Extrait Kbis",          en: "Kbis extract" },
] as const;

const SWISS_CANTONS = [
  { code: "AG", name: "Argovie" },
  { code: "AI", name: "Appenzell Rh. Int." },
  { code: "AR", name: "Appenzell Rh. Ext." },
  { code: "BE", name: "Berne" },
  { code: "BL", name: "Bâle-Campagne" },
  { code: "BS", name: "Bâle-Ville" },
  { code: "FR", name: "Fribourg" },
  { code: "GE", name: "Genève" },
  { code: "GL", name: "Glaris" },
  { code: "GR", name: "Grisons" },
  { code: "JU", name: "Jura" },
  { code: "LU", name: "Lucerne" },
  { code: "NE", name: "Neuchâtel" },
  { code: "NW", name: "Nidwald" },
  { code: "OW", name: "Obwald" },
  { code: "SG", name: "Saint-Gall" },
  { code: "SH", name: "Schaffhouse" },
  { code: "SO", name: "Soleure" },
  { code: "SZ", name: "Schwytz" },
  { code: "TG", name: "Thurgovie" },
  { code: "TI", name: "Tessin" },
  { code: "UR", name: "Uri" },
  { code: "VD", name: "Vaud" },
  { code: "VS", name: "Valais" },
  { code: "ZG", name: "Zoug" },
  { code: "ZH", name: "Zurich" },
];

interface CompanyRequestDetailProps {
  request: Record<string, unknown>;
  profile: UserProfile;
}

export function CompanyRequestDetail({ request: rawRequest, profile }: CompanyRequestDetailProps) {
  const req = rawRequest as {
    id: string;
    status: CompanyRequestStatus;
    proposed_names: string[];
    sic_codes: string[];
    share_capital: number;
    share_value: number;
    share_count: number;
    shareholders: { type: string; first_name?: string; last_name?: string; company_name?: string; share_count: number; share_percentage: number }[];
    director_first_name: string | null;
    director_last_name: string | null;
    director_dob: string | null;
    director_nationality: string | null;
    director_city: string | null;
    director_country: string | null;
    needs_branch_ch: boolean;
    needs_branch_fr: boolean;
    company_name_final: string | null;
    company_number: string | null;
    incorporation_date: string | null;
    registered_address_line1: string | null;
    registered_address_city: string | null;
    registered_address_postcode: string | null;
    branch_address_line1: string | null;
    branch_address_city: string | null;
    branch_address_postcode: string | null;
    branch_address_country: string | null;
    branch_proof_type: string | null;
    branch_canton: string | null;
    branch_submitted_at: string | null;
    kyc_submitted_at: string | null;
    admin_notes: string | null;
    created_at: string;
    submitted_at: string | null;
  };

  const { toast } = useToast();
  const { t, lang } = useLang();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";
  const isClient = profile.role === "client";

  const [status, setStatus] = useState<CompanyRequestStatus>(req.status);
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? "");
  const [companyNumber, setCompanyNumber] = useState(req.company_number ?? "");
  const [companyNameFinal, setCompanyNameFinal] = useState(req.company_name_final ?? "");
  const [incorporationDate, setIncorporationDate] = useState(req.incorporation_date ?? "");
  const [regAddress, setRegAddress] = useState({
    line1: req.registered_address_line1 ?? "",
    city: req.registered_address_city ?? "",
    postcode: req.registered_address_postcode ?? "",
  });
  const [saving, setSaving] = useState(false);

  // KYC state (client) — per-file doc typing
  const [kycFiles, setKycFiles] = useState<{ file: File; docType: string; previewUrl: string | null }[]>([]);
  const [kycSubmitting, setKycSubmitting] = useState(false);

  // Branch state (client)
  const [branch, setBranch] = useState({
    line1: req.branch_address_line1 ?? "",
    city: req.branch_address_city ?? "",
    postcode: req.branch_address_postcode ?? "",
    country: req.branch_address_country ?? "CH",
    proofType: req.branch_proof_type ?? "",
    canton: req.branch_canton ?? "",
  });
  const [branchFile, setBranchFile] = useState<File | null>(null);
  const [branchSubmitting, setBranchSubmitting] = useState(false);
  const branchFileInputRef = useRef<HTMLInputElement>(null);

  const currentStepIdx = STATUS_ORDER.indexOf(status);
  const getSicLabel = (code: string) => SIC_CODES.find((s) => s.code === code)?.label ?? code;

  const STATUS_LABELS: Record<CompanyRequestStatus, string> = {
    draft:                     lang === "fr" ? "Brouillon"          : "Draft",
    info_submitted:            lang === "fr" ? "Infos soumises"     : "Info submitted",
    kyc_required:              lang === "fr" ? "Pièces d'identité"  : "ID docs",
    kyc_in_review:             lang === "fr" ? "En examen"          : "Under review",
    identity_verification:     lang === "fr" ? "Vérif. identité"   : "ID check",
    company_created:           lang === "fr" ? "Société créée"      : "Company created",
    submitted_companies_house: lang === "fr" ? "Soumis succursale"  : "Branch submitted",
    branch_preparation:        lang === "fr" ? "Succursale"         : "Branch setup",
    completed:                 lang === "fr" ? "Terminé ✓"          : "Completed ✓",
  };

  const isCompleted = status === "completed";

  // ── Admin save ──
  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("company_requests")
      .update({
        status,
        admin_notes: adminNotes || null,
        company_number: companyNumber || null,
        company_name_final: companyNameFinal || null,
        incorporation_date: incorporationDate || null,
        registered_address_line1: regAddress.line1 || null,
        registered_address_city: regAddress.city || null,
        registered_address_postcode: regAddress.postcode || null,
      })
      .eq("id", req.id);
    if (error) toast("error", error.message);
    else toast("success", lang === "fr" ? "Dossier mis à jour" : "File updated");
    setSaving(false);
  }

  // ── KYC file selection (step 1) ──
  function handleKycFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newEntries = files.map((file) => ({
      file,
      docType: "passport",
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    setKycFiles((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeKycFile(idx: number) {
    setKycFiles((prev) => {
      const updated = [...prev];
      if (updated[idx].previewUrl) URL.revokeObjectURL(updated[idx].previewUrl!);
      updated.splice(idx, 1);
      return updated;
    });
  }

  // ── Client KYC submit (step 2) ──
  async function handleKycSubmit() {
    if (kycFiles.length === 0) {
      toast("error", lang === "fr" ? "Veuillez déposer au moins un document" : "Please upload at least one document");
      return;
    }
    setKycSubmitting(true);
    const supabase = createClient();

    for (const entry of kycFiles) {
      const path = `${profile.id}/kyc/${Date.now()}-${entry.file.name}`;
      const { error: uploadError } = await supabase.storage.from("client-documents").upload(path, entry.file);
      if (!uploadError) {
        await supabase.from("documents").insert({
          client_id: profile.id,
          org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
          company_request_id: req.id,
          category: "identity",
          visibility: "internal",
          name: entry.file.name,
          label: entry.docType,
          storage_path: path,
          mime_type: entry.file.type,
          size_bytes: entry.file.size,
        });
      }
    }

    await supabase.from("company_requests").update({
      status: "kyc_in_review",
      kyc_submitted_at: new Date().toISOString(),
    }).eq("id", req.id);

    toast("success", lang === "fr" ? "Documents envoyés avec succès !" : "Documents submitted successfully!");
    setStatus("kyc_in_review");
    setKycFiles([]);
    setKycSubmitting(false);
  }

  // ── Client Branch submit ──
  async function handleBranchSubmit() {
    if (!branch.line1 || !branch.city || !branch.proofType) {
      toast("error", lang === "fr" ? "Veuillez remplir tous les champs" : "Please fill all fields");
      return;
    }
    setBranchSubmitting(true);
    const supabase = createClient();

    if (branchFile) {
      const path = `${profile.id}/branch/${Date.now()}-${branchFile.name}`;
      const { error: uploadError } = await supabase.storage.from("client-documents").upload(path, branchFile);
      if (!uploadError) {
        await supabase.from("documents").insert({
          client_id: profile.id,
          org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
          company_request_id: req.id,
          category: "branch",
          visibility: "internal",
          name: branchFile.name,
          storage_path: path,
          mime_type: branchFile.type,
          size_bytes: branchFile.size,
        });
      }
    }

    await supabase.from("company_requests").update({
      branch_address_line1: branch.line1,
      branch_address_city: branch.city,
      branch_address_postcode: branch.postcode || null,
      branch_address_country: branch.country,
      branch_proof_type: branch.proofType,
      branch_canton: branch.canton || null,
      branch_submitted_at: new Date().toISOString(),
    }).eq("id", req.id);

    toast("success", lang === "fr" ? "Informations envoyées !" : "Information submitted!");
    setBranchSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/dashboard/company-requests" className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("nav.companyRequests")}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Building2 className="h-6 w-6 text-white/60" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {req.company_name_final ?? (req.proposed_names?.[0] ? `${req.proposed_names[0]} Ltd` : (lang === "fr" ? "Dossier société" : "Company file"))}
            </h2>
            {req.company_number && (
              <p className="mt-0.5 text-sm text-white/40">N° {req.company_number}</p>
            )}
          </div>
        </div>
        {isAdmin && !isCompleted && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <p className="mb-4 text-sm font-semibold text-white">
          {lang === "fr" ? "Progression du dossier" : "File progress"}
        </p>
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-3.5 h-px bg-white/8" />
          {STATUS_ORDER.map((s, i) => {
            const done = i < currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={s} className="relative flex flex-col items-center gap-2">
                <button
                  onClick={() => isAdmin && setStatus(s)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all z-10",
                    done ? "border-emerald-500 bg-emerald-500 text-white" :
                      active ? "border-blue-500 bg-blue-500 text-white ring-4 ring-blue-500/20" :
                        "border-white/15 bg-[#0a0a0d] text-white/30",
                    isAdmin && "hover:scale-110 cursor-pointer"
                  )}
                >
                  {done ? <CheckCircle className="h-3.5 w-3.5" /> : active ? <Clock className="h-3.5 w-3.5" /> : i + 1}
                </button>
                <span className={cn(
                  "hidden text-[10px] font-medium text-center sm:block max-w-[70px]",
                  active ? "text-white" : done ? "text-white/40" : "text-white/20"
                )}>
                  {STATUS_LABELS[s].replace(" ✓", "")}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-white/40">
          {lang === "fr" ? "Statut actuel : " : "Current status: "}
          <span className="font-semibold text-white">{STATUS_LABELS[status]}</span>
          {req.submitted_at && <> · {lang === "fr" ? "Soumis le" : "Submitted"} {formatDate(req.submitted_at)}</>}
        </p>
      </div>

      {/* ═══ COMPLETED BANNER ═══ */}
      {isCompleted && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-300">
              {lang === "fr" ? "Dossier terminé" : "File completed"}
            </p>
            <p className="mt-0.5 text-sm text-white/50">
              {lang === "fr"
                ? "Ce dossier est clôturé et ne peut plus être modifié."
                : "This file is closed and can no longer be modified."}
            </p>
          </div>
        </div>
      )}

      {/* ═══ KYC GUIDANCE (client, status = kyc_required) ═══ */}
      {isClient && status === "kyc_required" && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-white">{t("kyc.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("kyc.subtitle")}</p>
            </div>
          </div>

          {/* Required docs list */}
          <div className="rounded-xl border border-white/8 bg-black/20 p-4 space-y-2.5">
            {(["kyc.doc1", "kyc.doc2", "kyc.doc3"] as Parameters<typeof t>[0][]).map((key) => (
              <div key={key} className="flex items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
                <p className="text-sm text-white/70">{t(key)}</p>
              </div>
            ))}
          </div>

          {/* File list with per-file doc type */}
          {kycFiles.length > 0 && (
            <div className="space-y-3">
              {kycFiles.map((entry, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    {entry.previewUrl ? (
                      <img src={entry.previewUrl} alt={entry.file.name} className="h-12 w-12 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                        <FileText className="h-5 w-5 text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm text-white/80">{entry.file.name}</p>
                      <p className="text-xs text-white/30">{(entry.file.size / 1024).toFixed(0)} Ko</p>
                    </div>
                    <button
                      onClick={() => removeKycFile(idx)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-red-500/15 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Doc type selector */}
                  <div className="flex flex-wrap gap-1.5">
                    {KYC_DOC_TYPES.map((dt) => (
                      <button
                        key={dt.key}
                        onClick={() => setKycFiles((prev) => prev.map((e, i) => i === idx ? { ...e, docType: dt.key } : e))}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                          entry.docType === dt.key
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-white/5 text-white/40 border border-white/8 hover:bg-white/10"
                        )}
                      >
                        {lang === "fr" ? dt.fr : dt.en}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add file button — mobile-friendly: no capture, OS handles picker */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleKycFileSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 py-4 text-sm text-amber-300/70 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10"
          >
            <Upload className="h-4 w-4" />
            {t("kyc.addFile")}
          </button>

          <button
            onClick={handleKycSubmit}
            disabled={kycSubmitting || kycFiles.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {kycSubmitting ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
            {t("kyc.submit")} {kycFiles.length > 0 && `(${kycFiles.length})`}
          </button>
        </div>
      )}

      {/* KYC sent confirmation / under review */}
      {isClient && status === "kyc_in_review" && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-500/25 bg-violet-500/8 p-4">
          <Clock className="h-5 w-5 shrink-0 text-violet-400" />
          <p className="text-sm text-white/70">{t("kyc.submitted")}</p>
        </div>
      )}

      {/* ═══ IDENTITY VERIFICATION ═══ */}
      {isClient && status === "identity_verification" && (
        <div className="rounded-2xl border border-blue-500/25 bg-blue-500/8 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/15">
              <User className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white">{t("kyc.identityVerifTitle")}</p>
              <p className="mt-1 text-sm text-white/60">{t("kyc.identityVerifDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
            <Clock className="h-4 w-4 text-white/30" />
            <p className="text-xs text-white/40">
              {lang === "fr" ? "Délai habituel : 24–48h ouvrées" : "Typical delay: 24–48 business hours"}
            </p>
          </div>
        </div>
      )}

      {/* ═══ COMPANY CREATED INFO ═══ */}
      {status === "company_created" && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <p className="font-semibold text-white">{t("company.info")}</p>
          </div>

          {isAdmin ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">{t("company.nameFinal")}</label>
                <input value={companyNameFinal} onChange={(e) => setCompanyNameFinal(e.target.value)}
                  placeholder="Ex: Atlas Ventures Limited"
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">{t("company.number")}</label>
                <input value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)}
                  placeholder="Ex: 12345678"
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">{t("company.incorp")}</label>
                <input type="date" value={incorporationDate} onChange={(e) => setIncorporationDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">{t("company.address")}</label>
                <input value={regAddress.line1} onChange={(e) => setRegAddress((a) => ({ ...a, line1: e.target.value }))}
                  placeholder="123 High Street, London"
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30" />
              </div>
            </div>
          ) : (
            // Client read-only view
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CompanyInfoRow label={t("company.nameFinal")} value={req.company_name_final ?? "—"} />
              <CompanyInfoRow label={t("company.number")} value={req.company_number ?? "—"} />
              <CompanyInfoRow label={t("company.incorp")} value={req.incorporation_date ? formatDate(req.incorporation_date) : "—"} />
              <CompanyInfoRow label={t("company.address")} value={req.registered_address_line1 ?? "—"} />
            </div>
          )}

          {/* Download official docs */}
          {isClient && (
            <Link
              href="/dashboard/documents"
              className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15"
            >
              <Download className="h-4 w-4" />
              {t("company.docs")} — {lang === "fr" ? "voir dans Documents" : "view in Documents"}
            </Link>
          )}
        </div>
      )}

      {/* ═══ BRANCH PREPARATION ═══ */}
      {status === "branch_preparation" && isClient && !isCompleted && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
            <div>
              <p className="font-semibold text-white">{t("branch.title")}</p>
              <p className="mt-1 text-sm text-white/60">{t("branch.subtitle")}</p>
            </div>
          </div>

          {req.branch_submitted_at ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-white/70">
                {lang === "fr" ? "Informations envoyées le" : "Information submitted on"} {formatDate(req.branch_submitted_at)}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">{t("branch.address")} *</label>
                  <input value={branch.line1} onChange={(e) => setBranch((b) => ({ ...b, line1: e.target.value }))}
                    placeholder="12 rue de la Paix, Paris"
                    className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">
                      {lang === "fr" ? "Ville" : "City"} *
                    </label>
                    <input value={branch.city} onChange={(e) => setBranch((b) => ({ ...b, city: e.target.value }))}
                      placeholder="Paris"
                      className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">
                      {lang === "fr" ? "Code postal" : "Postcode"}
                    </label>
                    <input value={branch.postcode} onChange={(e) => setBranch((b) => ({ ...b, postcode: e.target.value }))}
                      placeholder="75001"
                      className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">{t("branch.proofType")} *</label>
                  <div className="flex gap-2">
                    {["bail", "facture_electricite", "autre"].map((pt) => (
                      <button
                        key={pt}
                        onClick={() => setBranch((b) => ({ ...b, proofType: pt }))}
                        className={cn(
                          "flex-1 rounded-xl border py-2.5 text-xs font-medium transition-colors",
                          branch.proofType === pt
                            ? "border-blue-500/50 bg-blue-500/15 text-blue-400"
                            : "border-white/10 bg-white/3 text-white/40 hover:bg-white/6"
                        )}
                      >
                        {t(`branch.${pt === "facture_electricite" ? "facture" : pt}` as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canton selector — only for Swiss branch */}
                {req.needs_branch_ch && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/50">{t("branch.canton")} *</label>
                    <select
                      value={branch.canton}
                      onChange={(e) => setBranch((b) => ({ ...b, canton: e.target.value }))}
                      className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
                    >
                      <option value="" className="bg-[#1a1a20]">
                        {lang === "fr" ? "— Sélectionner un canton —" : "— Select a canton —"}
                      </option>
                      {SWISS_CANTONS.map((c) => (
                        <option key={c.code} value={c.code} className="bg-[#1a1a20]">
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Branch doc upload */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    {lang === "fr" ? "Justificatif (PDF ou image)" : "Supporting document (PDF or image)"}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    ref={(el) => { branchFileInputRef.current = el; }}
                    onChange={(e) => setBranchFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => branchFileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/3 py-3 text-sm text-white/50 transition-colors hover:border-white/40 hover:bg-white/6 hover:text-white/70"
                  >
                    <Upload className="h-4 w-4" />
                    {branchFile ? branchFile.name : t("common.upload")}
                  </button>
                </div>
              </div>

              <button
                onClick={handleBranchSubmit}
                disabled={branchSubmitting || !branch.line1 || !branch.city || !branch.proofType || (req.needs_branch_ch && !branch.canton)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {branchSubmitting ? <Spinner size="sm" /> : <MapPin className="h-4 w-4" />}
                {t("branch.submit")}
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ Company data cards ═══ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoCard icon={Building2} title={lang === "fr" ? "Noms proposés" : "Proposed names"}>
          {req.proposed_names?.filter(Boolean).map((n, i) => (
            <p key={i} className="text-sm text-white/70">{i + 1}. {n} Ltd</p>
          ))}
        </InfoCard>

        <InfoCard icon={Code2} title={lang === "fr" ? "Codes SIC" : "SIC Codes"}>
          {(req.sic_codes ?? []).map((code) => (
            <div key={code}>
              <span className="font-mono text-xs text-blue-400">{code}</span>
              <span className="ml-2 text-xs text-white/50">{getSicLabel(code)}</span>
            </div>
          ))}
        </InfoCard>

        <InfoCard icon={DollarSign} title={lang === "fr" ? "Capital social" : "Share capital"}>
          <InfoRow label={lang === "fr" ? "Capital" : "Capital"} value={`${req.share_capital?.toLocaleString("fr-FR")} GBP`} />
          <InfoRow label={lang === "fr" ? "Parts" : "Shares"} value={`${req.share_count} × ${req.share_value} GBP`} />
        </InfoCard>

        <InfoCard icon={User} title={lang === "fr" ? "Directeur (PSC)" : "Director (PSC)"}>
          <InfoRow label={lang === "fr" ? "Nom" : "Name"} value={`${req.director_first_name ?? ""} ${req.director_last_name ?? ""}`} />
          <InfoRow label={lang === "fr" ? "Naissance" : "DOB"} value={req.director_dob ?? undefined} />
          <InfoRow label={lang === "fr" ? "Nationalité" : "Nationality"} value={req.director_nationality ?? undefined} />
          <InfoRow label={lang === "fr" ? "Lieu" : "Location"} value={[req.director_city, req.director_country].filter(Boolean).join(", ") || undefined} />
        </InfoCard>

        <InfoCard icon={Users} title={lang === "fr" ? "Actionnaires" : "Shareholders"}>
          {(req.shareholders ?? []).map((sh, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-white/60">
                {sh.type === "person"
                  ? `${sh.first_name ?? ""} ${sh.last_name ?? ""}`.trim()
                  : sh.company_name ?? "—"}
              </span>
              <span className="text-white">{sh.share_percentage?.toFixed(1)}%</span>
            </div>
          ))}
        </InfoCard>

        <InfoCard icon={GitBranch} title={lang === "fr" ? "Succursales" : "Branches"}>
          {!req.needs_branch_ch && !req.needs_branch_fr ? (
            <p className="text-sm text-white/30">{lang === "fr" ? "Aucune succursale" : "No branch"}</p>
          ) : (
            <>
              {req.needs_branch_ch && <p className="text-sm text-white/70">🇨🇭 {lang === "fr" ? "Succursale Suisse" : "Swiss branch"}</p>}
              {req.needs_branch_fr && <p className="text-sm text-white/70">🇫🇷 {lang === "fr" ? "Succursale France" : "French branch"}</p>}
            </>
          )}
        </InfoCard>
      </div>

      {/* ═══ Admin Fields ═══ */}
      {isAdmin && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-white/40" />
            <p className="text-sm font-semibold text-white">
              {lang === "fr" ? "Gestion admin" : "Admin management"}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">
              {lang === "fr" ? "Notes internes" : "Internal notes"}
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={isCompleted}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={lang === "fr" ? "Notes visibles uniquement par l'équipe..." : "Notes visible to team only…"}
            />
          </div>
          {!isCompleted ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-medium text-white/50">
                  {lang === "fr" ? "Changer le statut" : "Change status"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        status === s ? "bg-blue-600 text-white" : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/80"
                      )}
                    >
                      {STATUS_LABELS[s].replace(" ✓", "")}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
                {t("common.save")}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-white/60">
                {lang === "fr" ? "Dossier verrouillé — aucune modification possible" : "File locked — no modifications allowed"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-white/30" />
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-white/35">{label}</span>
      <span className="text-right text-xs font-medium text-white/80">{value || "—"}</span>
    </div>
  );
}

function CompanyInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-black/15 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
