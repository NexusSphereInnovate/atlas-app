"use client";

import { useState } from "react";
import { FileText, Check, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { UserProfile } from "@/types/profile";

const CGV_TEXT = `CONDITIONS GÉNÉRALES DE VENTE — ATLAS INCORPORATE

1. OBJET
Les présentes Conditions Générales de Vente (CGV) régissent les prestations fournies par Atlas Incorporate (ci-après "le Prestataire") au Client.

2. PRESTATIONS
Le Prestataire fournit des services de création et d'administration de sociétés au Royaume-Uni, ainsi que des services connexes (succursales, enregistrements, conformité).

3. PRIX ET PAIEMENT
Les prix sont indiqués en livres sterling (GBP) hors taxes. Le paiement est dû à réception de la facture. En cas de retard, des pénalités de 3% par mois sont applicables.

4. ENGAGEMENT DU CLIENT
En acceptant ces conditions, le Client reconnaît et s'engage à :
— Fournir des informations exactes et complètes
— Régler les sommes dues dans les délais convenus
— Ne pas utiliser les services à des fins illicites

5. RESPONSABILITÉ
Le Prestataire ne peut être tenu responsable de délais imputables aux autorités administratives ou à des informations erronées fournies par le Client.

6. DROIT APPLICABLE
Les présentes CGV sont soumises au droit anglais (England and Wales).

7. ACCEPTATION
L'acceptation électronique de ces CGV constitue une signature valide et engageante.`;

interface AcceptanceModalProps {
  profile: UserProfile;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  cgvVersion: string;
  onClose: () => void;
  onAccepted: () => void;
}

export function AcceptanceModal({
  profile,
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  cgvVersion,
  onClose,
  onAccepted,
}: AcceptanceModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!accepted) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    const { error: acceptError } = await supabase.from("contract_acceptances").insert({
      invoice_id: invoiceId,
      accepted_by_user_id: profile.id,
      org_id: profile.org_id,
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      email: profile.email ?? "",
      cgv_version: cgvVersion,
      acceptance_snapshot: CGV_TEXT,
    });

    if (acceptError) {
      setError(acceptError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("invoices").update({
      cgv_accepted: true,
      cgv_accepted_at: new Date().toISOString(),
      cgv_version: cgvVersion,
    }).eq("id", invoiceId);

    setSubmitting(false);
    onAccepted();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Acceptation des conditions de vente"
      description={`Facture ${invoiceNumber} — ${formatCurrency(amount, currency)}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* CGV Text */}
        <div className="max-h-64 overflow-y-auto rounded-xl border border-white/8 bg-black/20 p-4">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-white/60 font-sans">
            {CGV_TEXT}
          </pre>
        </div>

        {/* Engagement summary */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="text-sm text-amber-300/80">
              <p className="font-semibold">En acceptant, vous confirmez :</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• Avoir lu et compris les conditions générales de vente</li>
                <li>• Vous engager à payer la somme de <strong>{formatCurrency(amount, currency)}</strong></li>
                <li>• Que votre acceptation électronique a valeur de signature</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Identity reminder */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-sm">
          <p className="text-xs text-white/40 mb-2">Signataire</p>
          <p className="font-medium text-white">{profile.first_name} {profile.last_name}</p>
          <p className="text-xs text-white/40">{profile.email}</p>
        </div>

        {/* Checkbox */}
        <label className="flex cursor-pointer items-start gap-3">
          <div
            onClick={() => setAccepted((v) => !v)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-all ${
              accepted ? "border-blue-500 bg-blue-500" : "border-white/25 bg-transparent"
            }`}
          >
            {accepted && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="text-sm text-white/70">
            J&apos;ai lu et j&apos;accepte les conditions générales de vente et je m&apos;engage à régler la somme due.
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/6 hover:text-white"
          >
            Annuler
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Spinner size="sm" /> : <FileText className="h-4 w-4" />}
            {submitting ? "Enregistrement…" : "Accepter et signer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
