"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import type { UserProfile } from "@/types/profile";
import type { Shareholder } from "@/types/database";
import { StepNames } from "./steps/step-names";
import { StepSic } from "./steps/step-sic";
import { StepCapital } from "./steps/step-capital";
import { StepShareholders } from "./steps/step-shareholders";
import { StepDirector } from "./steps/step-director";
import { StepBranch } from "./steps/step-branch";
import { StepReview } from "./steps/step-review";

export interface WizardData {
  proposed_names: string[];
  sic_codes: string[];
  share_capital: number;
  share_value: number;
  share_count: number;
  shareholders: Shareholder[];
  director_first_name: string;
  director_last_name: string;
  director_dob: string;
  director_nationality: string;
  director_address_line1: string;
  director_address_line2: string;
  director_city: string;
  director_postcode: string;
  director_country: string;
  needs_branch_ch: boolean;
  needs_branch_fr: boolean;
}

const STEPS = [
  { id: "names", label: "Noms proposés" },
  { id: "sic", label: "Codes SIC" },
  { id: "capital", label: "Capital" },
  { id: "shareholders", label: "Actionnaires" },
  { id: "director", label: "Directeur" },
  { id: "branch", label: "Succursale" },
  { id: "review", label: "Récapitulatif" },
];

const DEFAULT_DATA: WizardData = {
  proposed_names: ["", "", ""],
  sic_codes: [],
  share_capital: 100,
  share_value: 1,
  share_count: 100,
  shareholders: [{ type: "person", first_name: "", last_name: "", nationality: "", address: "", share_count: 100, share_percentage: 100 }],
  director_first_name: "",
  director_last_name: "",
  director_dob: "",
  director_nationality: "",
  director_address_line1: "",
  director_address_line2: "",
  director_city: "",
  director_postcode: "",
  director_country: "",
  needs_branch_ch: false,
  needs_branch_fr: false,
};

interface WizardProps {
  profile: UserProfile;
  existingId?: string;
  initialData?: Partial<WizardData>;
}

export function CompanyRequestWizard({ profile, existingId, initialData }: WizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<WizardData>({ ...DEFAULT_DATA, ...initialData });
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  async function saveAndSubmit() {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      client_id: profile.id,
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      status: "info_submitted" as const,
      proposed_names: data.proposed_names.filter(Boolean),
      sic_codes: data.sic_codes,
      share_capital: data.share_capital,
      share_value: data.share_value,
      share_count: data.share_count,
      shareholders: data.shareholders,
      director_first_name: data.director_first_name,
      director_last_name: data.director_last_name,
      director_dob: data.director_dob || null,
      director_nationality: data.director_nationality,
      director_address_line1: data.director_address_line1,
      director_address_line2: data.director_address_line2,
      director_city: data.director_city,
      director_postcode: data.director_postcode,
      director_country: data.director_country,
      needs_branch_ch: data.needs_branch_ch,
      needs_branch_fr: data.needs_branch_fr,
      submitted_at: new Date().toISOString(),
    };

    let error;

    if (existingId) {
      ({ error } = await supabase.from("company_requests").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("company_requests").insert(payload));
    }

    if (error) {
      toast("error", `Erreur : ${error.message}`);
      setSaving(false);
      return;
    }

    toast("success", "Demande soumise avec succès !");
    router.push("/dashboard/company-requests");
  }

  async function saveDraft() {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      client_id: profile.id,
      org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
      status: "draft" as const,
      proposed_names: data.proposed_names.filter(Boolean),
      sic_codes: data.sic_codes,
      share_capital: data.share_capital,
      share_value: data.share_value,
      share_count: data.share_count,
      shareholders: data.shareholders,
      director_first_name: data.director_first_name,
      director_last_name: data.director_last_name,
      director_dob: data.director_dob || null,
      director_nationality: data.director_nationality,
      director_address_line1: data.director_address_line1,
      director_address_line2: data.director_address_line2,
      director_city: data.director_city,
      director_postcode: data.director_postcode,
      director_country: data.director_country,
      needs_branch_ch: data.needs_branch_ch,
      needs_branch_fr: data.needs_branch_fr,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("company_requests").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("company_requests").insert(payload));
    }

    if (error) {
      toast("error", `Erreur : ${error.message}`);
    } else {
      toast("success", "Brouillon sauvegardé");
    }
    setSaving(false);
  }

  const stepProps = { data, update };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <StepNames {...stepProps} />;
      case 1: return <StepSic {...stepProps} />;
      case 2: return <StepCapital {...stepProps} />;
      case 3: return <StepShareholders {...stepProps} />;
      case 4: return <StepDirector {...stepProps} />;
      case 5: return <StepBranch {...stepProps} />;
      case 6: return <StepReview data={data} onSubmit={saveAndSubmit} onSaveDraft={saveDraft} saving={saving} />;
      default: return null;
    }
  };

  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => i < currentStep && setCurrentStep(i)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1.5 transition-all",
                i < currentStep && "cursor-pointer",
                i > currentStep && "cursor-default"
              )}
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all",
                i < currentStep ? "bg-emerald-500 text-white" :
                  i === currentStep ? "bg-blue-500 text-white ring-4 ring-blue-500/20" :
                    "bg-white/8 text-white/30"
              )}>
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                "hidden text-[11px] font-medium sm:block",
                i === currentStep ? "text-white" : i < currentStep ? "text-white/50" : "text-white/25"
              )}>
                {step.label}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-6 md:p-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-white/30 uppercase tracking-wider">
            Étape {currentStep + 1} sur {STEPS.length}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">{STEPS[currentStep].label}</h2>
        </div>

        {renderStep()}

        {/* Navigation */}
        {!isLast && (
          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={goPrev}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/6 hover:text-white"
                >
                  Précédent
                </button>
              )}
              <button
                onClick={saveDraft}
                disabled={saving}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/40 transition-colors hover:bg-white/6 hover:text-white/60 disabled:opacity-50"
              >
                Sauvegarder
              </button>
            </div>
            <button
              onClick={goNext}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
