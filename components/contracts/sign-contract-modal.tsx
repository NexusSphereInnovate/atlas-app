"use client";

import { useEffect, useState } from "react";
import { X, Pen, Shield, CheckCircle, FileText } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/contexts/language-context";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { UserProfile } from "@/types/profile";

interface Contract {
  id: string;
  title: string;
  version: string;
  pdf_path: string | null;
}

interface SignContractModalProps {
  contract: Contract;
  profile: UserProfile;
  onClose: () => void;
  onSigned: () => void;
}

export function SignContractModal({ contract, profile, onClose, onSigned }: SignContractModalProps) {
  const { lang } = useLang();
  const { toast } = useToast();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [checks, setChecks] = useState({ readContract: false, acceptCgv: false, commitPay: false });
  const [typedName, setTypedName] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // CGV viewer
  const [showCgv, setShowCgv] = useState(false);
  const [cgvText, setCgvText] = useState<string | null>(null);
  const [loadingCgv, setLoadingCgv] = useState(false);

  async function openCgv() {
    setShowCgv(true);
    if (cgvText !== null) return; // already fetched
    setLoadingCgv(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("org_settings")
        .select("cgv_content")
        .eq("org_id", profile.org_id ?? "00000000-0000-0000-0000-000000000001")
        .single();
      setCgvText(data?.cgv_content ?? (lang === "fr"
        ? "Les conditions générales de vente ne sont pas encore disponibles. Veuillez contacter l'équipe Atlas."
        : "General Terms & Conditions are not yet available. Please contact the Atlas team."));
    } catch {
      setCgvText(lang === "fr"
        ? "Impossible de charger les CGV. Veuillez réessayer."
        : "Could not load Terms & Conditions. Please try again.");
    }
    setLoadingCgv(false);
  }

  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  const allChecked = checks.readContract && checks.acceptCgv && checks.commitPay;
  const nameMatch = typedName.trim().toLowerCase() === fullName.toLowerCase();
  const canSign = allChecked && nameMatch;

  useEffect(() => {
    if (!contract.pdf_path) return;
    setLoadingPdf(true);
    createClient()
      .storage.from("contracts")
      .createSignedUrl(contract.pdf_path, 1800)
      .then(({ data }) => {
        setPdfUrl(data?.signedUrl ?? null);
        setLoadingPdf(false);
      });
  }, [contract.pdf_path]);

  async function handleSign() {
    if (!canSign) return;
    setSigning(true);
    const supabase = createClient();
    const now = new Date().toISOString();

    // 1. Update contract status
    const { error } = await supabase
      .from("contracts")
      .update({ status: "signed", signed_at: now, signed_by: profile.id })
      .eq("id", contract.id);

    if (error) {
      toast("error", lang === "fr"
        ? `Erreur lors de la signature : ${error.message}`
        : `Signing error: ${error.message}`);
      setSigning(false);
      return;
    }

    // 2. Record acceptance (non-blocking — table may not exist in all envs)
    try {
      await supabase.from("contract_acceptances").insert({
        org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
        accepted_by_user_id: profile.id,
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        email: profile.email ?? "",
        cgv_version: contract.version,
        acceptance_snapshot: JSON.stringify({
          contract_id: contract.id,
          contract_title: contract.title,
          signed_name: typedName.trim(),
          checks,
          signed_at: now,
        }),
      });
    } catch {
      // Non-blocking — signature is already recorded on contracts table
    }

    setSigned(true);
    setSigning(false);
    setTimeout(onSigned, 1800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="relative flex h-[95vh] sm:h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#111115] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="font-semibold text-white">
              {lang === "fr" ? "Signature électronique" : "Electronic signature"}
            </p>
            <p className="text-xs text-white/40">{contract.title} · v{contract.version}</p>
          </div>
          <button onClick={onClose} className="text-white/40 transition-colors hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success */}
        {signed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="text-xl font-semibold text-white">
              {lang === "fr" ? "Contrat signé !" : "Contract signed!"}
            </p>
            <p className="text-sm text-white/50">
              {lang === "fr"
                ? `Signé le ${formatDate(new Date().toISOString())} par ${fullName}`
                : `Signed on ${formatDate(new Date().toISOString())} by ${fullName}`}
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* PDF Viewer */}
            <div className="min-h-0 flex-1 border-b border-white/8">
              {!contract.pdf_path ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-white/40">
                    {lang === "fr" ? "Aucun PDF joint à ce contrat." : "No PDF attached to this contract."}
                  </p>
                </div>
              ) : loadingPdf ? (
                <div className="flex h-full items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : pdfUrl ? (
                <iframe src={pdfUrl} className="h-full w-full" title={contract.title} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-white/40">
                    {lang === "fr" ? "PDF non disponible." : "PDF unavailable."}
                  </p>
                </div>
              )}
            </div>

            {/* Signature form */}
            <div className="shrink-0 space-y-4 overflow-y-auto p-5">
              {/* Checkboxes */}
              <div className="space-y-2">
                {/* readContract */}
                {(["readContract", "commitPay"] as const).map((key) => {
                  const text = key === "readContract"
                    ? (lang === "fr" ? "J'ai lu et compris l'intégralité du contrat ci-dessus." : "I have read and understood the entire contract above.")
                    : (lang === "fr" ? "Je m'engage à régler les sommes dues dans les délais convenus." : "I commit to paying the amounts due within the agreed timeframes.");
                  return (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                        checks[key]
                          ? "border-emerald-500/30 bg-emerald-500/8"
                          : "border-white/10 bg-white/3 hover:bg-white/5"
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        checks[key] ? "border-emerald-500 bg-emerald-500" : "border-white/20 bg-white/5"
                      )}>
                        {checks[key] && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checks[key]}
                        onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                      />
                      <span className="text-xs leading-relaxed text-white/70">{text}</span>
                    </label>
                  );
                })}

                {/* acceptCgv — with clickable CGV link */}
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    checks.acceptCgv
                      ? "border-emerald-500/30 bg-emerald-500/8"
                      : "border-white/10 bg-white/3 hover:bg-white/5"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    checks.acceptCgv ? "border-emerald-500 bg-emerald-500" : "border-white/20 bg-white/5"
                  )}>
                    {checks.acceptCgv && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checks.acceptCgv}
                    onChange={(e) => setChecks((c) => ({ ...c, acceptCgv: e.target.checked }))}
                  />
                  <span className="text-xs leading-relaxed text-white/70">
                    {lang === "fr" ? "J'accepte les " : "I accept the "}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); openCgv(); }}
                      className="inline-flex items-center gap-1 text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      {lang === "fr" ? "Conditions Générales de Vente" : "General Terms & Conditions"}
                    </button>
                    {lang === "fr"
                      ? " et m'engage à respecter les termes du présent contrat."
                      : " and agree to comply with this contract."}
                  </span>
                </label>
              </div>

              {/* Typed name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  {lang === "fr"
                    ? `Tapez votre nom complet pour confirmer : « ${fullName} »`
                    : `Type your full name to confirm: "${fullName}"`}
                </label>
                <input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={fullName}
                  className={cn(
                    "w-full rounded-xl border bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20",
                    typedName && !nameMatch
                      ? "border-red-500/50 focus:border-red-500/70"
                      : typedName && nameMatch
                      ? "border-emerald-500/50"
                      : "border-white/10 focus:border-white/30"
                  )}
                />
                {typedName && !nameMatch && (
                  <p className="mt-1 text-xs text-red-400">
                    {lang === "fr" ? "Le nom ne correspond pas" : "Name does not match"}
                  </p>
                )}
              </div>

              {/* Legal notice */}
              <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/3 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
                <p className="text-[11px] leading-relaxed text-white/40">
                  {lang === "fr"
                    ? `En cliquant sur "Signer", vous apposez une signature électronique juridiquement contraignante, horodatée et liée à votre compte (${profile.email ?? ""}).`
                    : `By clicking "Sign", you apply a legally binding electronic signature, timestamped and linked to your account (${profile.email ?? ""}).`}
                </p>
              </div>

              <button
                onClick={handleSign}
                disabled={signing || !canSign}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {signing ? <Spinner size="sm" /> : <Pen className="h-4 w-4" />}
                {lang === "fr" ? "Signer le contrat" : "Sign the contract"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CGV Overlay */}
      {showCgv && (
        <div className="absolute inset-0 z-10 flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#111115]">
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
            <div>
              <p className="font-semibold text-white">
                {lang === "fr" ? "Conditions Générales de Vente" : "General Terms & Conditions"}
              </p>
              <p className="text-xs text-white/40">
                {lang === "fr" ? "Atlas Incorporate — AS International Group LTD" : "Atlas Incorporate — AS International Group LTD"}
              </p>
            </div>
            <button
              onClick={() => setShowCgv(false)}
              className="text-white/40 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loadingCgv ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-white/70">
                {cgvText}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/8 p-4">
            <button
              onClick={() => {
                setChecks((c) => ({ ...c, acceptCgv: true }));
                setShowCgv(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              <CheckCircle className="h-4 w-4" />
              {lang === "fr" ? "J'ai lu et j'accepte les CGV" : "I have read and accept the T&Cs"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
