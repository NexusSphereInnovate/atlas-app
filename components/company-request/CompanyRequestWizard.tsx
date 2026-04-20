"use client";

import { useMemo, useState, useTransition } from "react";
import type { CompanyRequestRow, Shareholder } from "@/types/company-request";
import SicCodesSelect from "@/components/company-request/SicCodesSelect";
import { patchCompanyRequest, submitCompanyRequestInfo } from "@/lib/actions/company-request";

type Props = {
  initialRequest: CompanyRequestRow;
};

type StepId = "company" | "capital" | "director" | "options" | "review";

const STEPS: { id: StepId; title: string; subtitle: string }[] = [
  { id: "company", title: "Société", subtitle: "Nom + activités (SIC)" },
  { id: "capital", title: "Capital & actionnaires", subtitle: "Parts & répartition" },
  { id: "director", title: "Directeur", subtitle: "Informations légales" },
  { id: "options", title: "Options", subtitle: "Succursale CH / FR" },
  { id: "review", title: "Vérification", subtitle: "Résumé avant envoi" },
];

function clampNumber(val: string, fallback: number) {
  const n = Number(val);
  if (Number.isFinite(n)) return n;
  return fallback;
}

export default function CompanyRequestWizard({ initialRequest }: Props) {
  const [step, setStep] = useState<StepId>("company");
  const [req, setReq] = useState<CompanyRequestRow>(initialRequest);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.id === step), [step]);
  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEPS.length) * 100), [stepIndex]);

  const save = (patch: Partial<CompanyRequestRow>) => {
    setError(null);
    const next = { ...req, ...patch } as CompanyRequestRow;
    setReq(next);

    startTransition(async () => {
      const { ok, error: e } = await patchCompanyRequest(req.id, patch as any);
      if (!ok) setError(e ?? "Erreur.");
    });
  };

  const canSubmitInfo = useMemo(() => {
    if (!req.company_name_1?.trim()) return false;
    if (!req.sic_codes?.length || req.sic_codes.length > 4) return false;
    if (!req.share_capital_amount || !req.share_value) return false;
    if (!req.shareholders?.length) return false;
    if (!req.director_first_name?.trim()) return false;
    if (!req.director_last_name?.trim()) return false;
    if (!req.director_date_of_birth) return false;
    if (!req.director_nationality?.trim()) return false;
    if (!req.director_address?.trim()) return false;
    return true;
  }, [req]);

  const submitInfo = () => {
    setError(null);
    startTransition(async () => {
      const { ok, error: e } = await submitCompanyRequestInfo(req.id);
      if (!ok) {
        setError(e ?? "Erreur.");
        return;
      }
      setReq({ ...req, status: "info_submitted" });
      setStep("review");
    });
  };

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-8 pt-7 pb-20 max-w-6xl mx-auto">
        <div className="flex flex-col gap-3">
          <div className="text-white text-2xl sm:text-3xl font-semibold tracking-tight">
            Création de société (UK LTD)
          </div>
          <div className="text-white/55 text-sm">
            Complète les informations. Ensuite tu pourras déposer tes documents (KYC) et suivre l’avancée en direct.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-white font-semibold tracking-tight">Progression</div>
                  <div className="text-white/55 text-sm mt-1">{STEPS[stepIndex]?.title} · {STEPS[stepIndex]?.subtitle}</div>
                </div>
                <div className="text-xs text-white/55">{progress}%</div>
              </div>

              <div className="mt-4 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500/80 via-violet-500/70 to-fuchsia-500/60 transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {STEPS.map((s) => {
                  const active = s.id === step;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStep(s.id)}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-medium border transition",
                        active ? "border-blue-400/40 bg-blue-500/10 text-blue-200" : "border-white/10 bg-white/0 text-white/55 hover:bg-white/5",
                      ].join(" ")}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </Card>

            {step === "company" && (
              <Card>
                <div className="text-white font-semibold tracking-tight">Nom de la société</div>
                <div className="text-white/55 text-sm mt-1">Propose jusqu’à 3 noms. Le 1er est obligatoire.</div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <input
                    value={req.company_name_1 ?? ""}
                    onChange={(e) => save({ company_name_1: e.target.value })}
                    placeholder="Nom de société (choix 1)"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <input
                    value={req.company_name_2 ?? ""}
                    onChange={(e) => save({ company_name_2: e.target.value || null })}
                    placeholder="Nom de société (choix 2) — optionnel"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <input
                    value={req.company_name_3 ?? ""}
                    onChange={(e) => save({ company_name_3: e.target.value || null })}
                    placeholder="Nom de société (choix 3) — optionnel"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-5">
                  <SicCodesSelect
                    value={req.sic_codes ?? []}
                    onChange={(next) => save({ sic_codes: next })}
                  />
                </div>

                <div className="mt-5">
                  <div className="text-white font-semibold tracking-tight">Description de l’activité</div>
                  <div className="text-white/55 text-sm mt-1">Décris en 2–5 phrases ce que fait l’entreprise.</div>
                  <textarea
                    value={req.business_description ?? ""}
                    onChange={(e) => save({ business_description: e.target.value || null })}
                    placeholder="Ex: Agence digitale spécialisée en création de sites web, branding et automatisation…"
                    className="mt-3 min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs text-white/45">Autosave {isPending ? "…" : "✓"}</div>
                  <button
                    type="button"
                    onClick={() => setStep("capital")}
                    className="rounded-2xl bg-white text-[#0a0c12] px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:scale-[0.99] transition"
                  >
                    Continuer
                  </button>
                </div>
              </Card>
            )}

            {step === "capital" && (
              <Card>
                <div className="text-white font-semibold tracking-tight">Capital & actionnaires</div>
                <div className="text-white/55 text-sm mt-1">
                  Généralement : 100 GBP avec parts à 1 GBP, mais tu peux choisir.
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/45">Capital (montant)</div>
                    <input
                      value={String(req.share_capital_amount ?? 100)}
                      onChange={(e) => save({ share_capital_amount: clampNumber(e.target.value, 100) })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400/40"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/45">Valeur d’une part</div>
                    <input
                      value={String(req.share_value ?? 1)}
                      onChange={(e) => save({ share_value: clampNumber(e.target.value, 1) })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400/40"
                      inputMode="decimal"
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/45">Devise</div>
                    <input
                      value={req.currency ?? "GBP"}
                      onChange={(e) => save({ currency: e.target.value.toUpperCase() })}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-blue-400/40"
                    />
                  </div>
                </div>

                <div className="mt-5 text-white/60 text-sm">
                  Le client doit connaître la répartition des parts. Ajoute un ou plusieurs actionnaires.
                </div>

                <div className="mt-4 space-y-3">
                  {(req.shareholders ?? []).map((sh, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={sh.type}
                          onChange={(e) => {
                            const next = [...req.shareholders];
                            next[idx] = { ...next[idx], type: e.target.value as Shareholder["type"] };
                            save({ shareholders: next });
                          }}
                          className="w-full sm:w-44 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                        >
                          <option value="person">Personne</option>
                          <option value="company">Entreprise</option>
                        </select>

                        {sh.type === "person" ? (
                          <>
                            <input
                              value={sh.first_name ?? ""}
                              onChange={(e) => {
                                const next = [...req.shareholders];
                                next[idx] = { ...next[idx], first_name: e.target.value };
                                save({ shareholders: next });
                              }}
                              placeholder="Prénom"
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                            />
                            <input
                              value={sh.last_name ?? ""}
                              onChange={(e) => {
                                const next = [...req.shareholders];
                                next[idx] = { ...next[idx], last_name: e.target.value };
                                save({ shareholders: next });
                              }}
                              placeholder="Nom"
                              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                            />
                          </>
                        ) : (
                          <input
                            value={sh.company_name ?? ""}
                            onChange={(e) => {
                              const next = [...req.shareholders];
                              next[idx] = { ...next[idx], company_name: e.target.value };
                              save({ shareholders: next });
                            }}
                            placeholder="Nom de l’entreprise"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                          />
                        )}

                        <input
                          value={String(sh.shares ?? 1)}
                          onChange={(e) => {
                            const next = [...req.shareholders];
                            next[idx] = { ...next[idx], shares: clampNumber(e.target.value, 1) };
                            save({ shareholders: next });
                          }}
                          placeholder="Parts"
                          className="w-full sm:w-28 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                          inputMode="numeric"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const next = req.shareholders.filter((_, i) => i !== idx);
                            save({ shareholders: next as any });
                          }}
                          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200 text-sm font-semibold hover:bg-red-500/15 transition"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(req.shareholders ?? [])];
                      next.push({ type: "person", first_name: "", last_name: "", shares: 1 });
                      save({ shareholders: next as any });
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/0 hover:bg-white/5 px-4 py-3 text-white/85 font-semibold transition"
                  >
                    + Ajouter un actionnaire
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("company")}
                    className="rounded-2xl border border-white/10 bg-white/0 hover:bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("director")}
                    className="rounded-2xl bg-white text-[#0a0c12] px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:scale-[0.99] transition"
                  >
                    Continuer
                  </button>
                </div>
              </Card>
            )}

            {step === "director" && (
              <Card>
                <div className="text-white font-semibold tracking-tight">Directeur</div>
                <div className="text-white/55 text-sm mt-1">Le directeur est aussi le PSC (pas besoin de séparer).</div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={req.director_first_name ?? ""}
                    onChange={(e) => save({ director_first_name: e.target.value })}
                    placeholder="Prénom"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <input
                    value={req.director_last_name ?? ""}
                    onChange={(e) => save({ director_last_name: e.target.value })}
                    placeholder="Nom"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <input
                    value={req.director_date_of_birth ?? ""}
                    onChange={(e) => save({ director_date_of_birth: e.target.value })}
                    placeholder="Date de naissance (YYYY-MM-DD)"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                  <input
                    value={req.director_nationality ?? ""}
                    onChange={(e) => save({ director_nationality: e.target.value })}
                    placeholder="Nationalité"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-3">
                  <textarea
                    value={req.director_address ?? ""}
                    onChange={(e) => save({ director_address: e.target.value })}
                    placeholder="Adresse complète du directeur"
                    className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-blue-400/40 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("capital")}
                    className="rounded-2xl border border-white/10 bg-white/0 hover:bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("options")}
                    className="rounded-2xl bg-white text-[#0a0c12] px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:scale-[0.99] transition"
                  >
                    Continuer
                  </button>
                </div>
              </Card>
            )}

            {step === "options" && (
              <Card>
                <div className="text-white font-semibold tracking-tight">Succursale</div>
                <div className="text-white/55 text-sm mt-1">
                  UK uniquement. Choisis si tu veux un dossier de succursale (CH/FR).
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => save({ needs_branch_ch: !req.needs_branch_ch })}
                    className={[
                      "rounded-2xl border px-4 py-4 text-left transition",
                      req.needs_branch_ch ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-white/0 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="text-white font-semibold">Succursale Suisse (CH)</div>
                    <div className="text-white/55 text-sm mt-1">Dossier FR/EN après création.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => save({ needs_branch_fr: !req.needs_branch_fr })}
                    className={[
                      "rounded-2xl border px-4 py-4 text-left transition",
                      req.needs_branch_fr ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-white/0 hover:bg-white/5",
                    ].join(" ")}
                  >
                    <div className="text-white font-semibold">Succursale France (FR)</div>
                    <div className="text-white/55 text-sm mt-1">Dossier FR/EN après création.</div>
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("director")}
                    className="rounded-2xl border border-white/10 bg-white/0 hover:bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("review")}
                    className="rounded-2xl bg-white text-[#0a0c12] px-4 py-2.5 text-sm font-semibold hover:bg-white/90 active:scale-[0.99] transition"
                  >
                    Continuer
                  </button>
                </div>
              </Card>
            )}

            {step === "review" && (
              <Card>
                <div className="text-white font-semibold tracking-tight">Vérification</div>
                <div className="text-white/55 text-sm mt-1">
                  Une fois envoyé, l’étape suivante sera la demande de documents (KYC) avec vérification manuelle.
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
                  <div className="text-white/80"><span className="text-white/40">Nom :</span> {req.company_name_1}</div>
                  <div className="text-white/80"><span className="text-white/40">SIC :</span> {(req.sic_codes ?? []).join(", ")}</div>
                  <div className="text-white/80"><span className="text-white/40">Capital :</span> {req.share_capital_amount} {req.currency} · part {req.share_value}</div>
                  <div className="text-white/80"><span className="text-white/40">Actionnaires :</span> {(req.shareholders ?? []).length}</div>
                  <div className="text-white/80"><span className="text-white/40">Succursale :</span> {req.needs_branch_ch ? "CH " : ""}{req.needs_branch_fr ? "FR" : ""}{(!req.needs_branch_ch && !req.needs_branch_fr) ? "Aucune" : ""}</div>
                </div>

                {!canSubmitInfo && (
                  <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-amber-200 text-sm">
                    Il manque des informations obligatoires. Reviens sur les étapes précédentes.
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("options")}
                    className="rounded-2xl border border-white/10 bg-white/0 hover:bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/80 transition"
                  >
                    Retour
                  </button>

                  <button
                    type="button"
                    disabled={!canSubmitInfo || isPending}
                    onClick={submitInfo}
                    className={[
                      "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                      (!canSubmitInfo || isPending) ? "bg-white/20 text-white/50 cursor-not-allowed" : "bg-white text-[#0a0c12] hover:bg-white/90 active:scale-[0.99]",
                    ].join(" ")}
                  >
                    {isPending ? "Envoi..." : "Envoyer les informations"}
                  </button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:sticky lg:top-6 h-fit">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="text-white font-semibold tracking-tight">Statut</div>
              <div className="mt-1 text-white/55 text-sm">{req.status}</div>

              <div className="mt-4 h-px bg-white/10" />

              <div className="mt-4 text-white font-semibold tracking-tight">Prochaine étape</div>
              <div className="mt-1 text-white/55 text-sm">
                Après l’envoi : dépôt des documents (KYC) + vérification manuelle avec un admin.
              </div>

              <div className="mt-4 text-xs text-white/45">
                Autosave: {isPending ? "synchronisation…" : "à jour"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}