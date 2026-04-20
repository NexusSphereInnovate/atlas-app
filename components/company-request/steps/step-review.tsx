"use client";

import { CheckCircle, Building2, Code2, DollarSign, Users, User, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIC_CODES } from "../sic-codes";
import { Spinner } from "@/components/ui/spinner";
import type { WizardData } from "../wizard";

interface StepReviewProps {
  data: WizardData;
  onSubmit: () => Promise<void>;
  onSaveDraft: () => Promise<void>;
  saving: boolean;
}

export function StepReview({ data, onSubmit, onSaveDraft, saving }: StepReviewProps) {
  const getSicLabel = (code: string) =>
    SIC_CODES.find((s) => s.code === code)?.label ?? code;

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-white/40" />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      {children}
    </div>
  );

  const Row = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-xs text-white/40">{label}</span>
      <span className="text-right text-xs font-medium text-white">{value || "—"}</span>
    </div>
  );

  const names = data.proposed_names.filter(Boolean);
  const canSubmit = names.length > 0 && data.sic_codes.length > 0 && data.director_first_name && data.director_last_name;

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/50">
        Vérifiez les informations avant de soumettre votre demande. Une fois soumise, notre équipe prendra contact avec vous.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Names */}
        <Section icon={Building2} title="Noms proposés">
          {names.length === 0 ? (
            <p className="text-xs text-amber-400">⚠️ Aucun nom renseigné</p>
          ) : (
            <ul className="space-y-1">
              {names.map((name, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                  <span className="text-white/30">{i + 1}.</span>
                  {name} Ltd
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* SIC */}
        <Section icon={Code2} title="Codes SIC">
          {data.sic_codes.length === 0 ? (
            <p className="text-xs text-amber-400">⚠️ Aucun code SIC sélectionné</p>
          ) : (
            <ul className="space-y-1.5">
              {data.sic_codes.map((code) => (
                <li key={code} className="text-xs">
                  <span className="font-mono text-blue-400">{code}</span>
                  <span className="ml-2 text-white/50">{getSicLabel(code)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Capital */}
        <Section icon={DollarSign} title="Capital social">
          <Row label="Capital total" value={`${data.share_capital.toLocaleString("fr-FR")} GBP`} />
          <Row label="Nombre de parts" value={data.share_count.toLocaleString("fr-FR")} />
          <Row label="Valeur par part" value={`${data.share_value.toFixed(2)} GBP`} />
        </Section>

        {/* Director */}
        <Section icon={User} title="Directeur (PSC)">
          {!data.director_first_name ? (
            <p className="text-xs text-amber-400">⚠️ Informations du directeur manquantes</p>
          ) : (
            <>
              <Row label="Nom" value={`${data.director_first_name} ${data.director_last_name}`} />
              <Row label="Date de naissance" value={data.director_dob || undefined} />
              <Row label="Nationalité" value={data.director_nationality || undefined} />
              <Row label="Ville" value={data.director_city || undefined} />
              <Row label="Pays" value={data.director_country || undefined} />
            </>
          )}
        </Section>
      </div>

      {/* Shareholders */}
      <Section icon={Users} title="Actionnaires">
        {data.shareholders.length === 0 ? (
          <p className="text-xs text-amber-400">⚠️ Aucun actionnaire</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {data.shareholders.map((sh, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-xs">
                <span className="text-white/70">
                  {sh.type === "person"
                    ? `${sh.first_name ?? ""} ${sh.last_name ?? ""}`.trim() || "—"
                    : sh.company_name || "—"}
                </span>
                <span className="font-semibold text-white">
                  {sh.share_count} parts ({sh.share_percentage.toFixed(1)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Branch */}
      <Section icon={GitBranch} title="Succursales">
        {!data.needs_branch_ch && !data.needs_branch_fr ? (
          <p className="text-xs text-white/30">Aucune succursale demandée</p>
        ) : (
          <ul className="space-y-1">
            {data.needs_branch_ch && (
              <li className="flex items-center gap-2 text-xs text-white/70">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Succursale Suisse
              </li>
            )}
            {data.needs_branch_fr && (
              <li className="flex items-center gap-2 text-xs text-white/70">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Succursale France
              </li>
            )}
          </ul>
        )}
      </Section>

      {!canSubmit && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3 text-sm text-amber-300">
          ⚠️ Des informations obligatoires sont manquantes (nom de société, codes SIC, informations du directeur).
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/6 hover:text-white disabled:opacity-40"
        >
          {saving ? <Spinner size="sm" /> : null}
          Sauvegarder en brouillon
        </button>
        <button
          onClick={onSubmit}
          disabled={saving || !canSubmit}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all",
            canSubmit && !saving
              ? "bg-blue-600 hover:bg-blue-500"
              : "bg-blue-600/40 cursor-not-allowed"
          )}
        >
          {saving ? <Spinner size="sm" /> : <CheckCircle className="h-4 w-4" />}
          {saving ? "Soumission…" : "Soumettre la demande"}
        </button>
      </div>
    </div>
  );
}
