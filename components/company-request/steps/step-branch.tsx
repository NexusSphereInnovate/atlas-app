"use client";

import { cn } from "@/lib/utils";
import type { WizardData } from "../wizard";

interface StepBranchProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function StepBranch({ data, update }: StepBranchProps) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-white/50">
        Une succursale vous permet d&apos;exercer votre activité dans un autre pays tout en conservant votre structure UK LTD.
        Cette option pourra être activée après la création de la société principale.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* CH */}
        <button
          onClick={() => update({ needs_branch_ch: !data.needs_branch_ch })}
          className={cn(
            "relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all",
            data.needs_branch_ch
              ? "border-blue-500/40 bg-blue-500/12"
              : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-lg",
              data.needs_branch_ch ? "bg-blue-500/20" : "bg-white/8"
            )}>
              🇨🇭
            </div>
            <div>
              <p className="font-semibold text-white">Succursale Suisse</p>
              <p className="text-xs text-white/40">Canton à définir</p>
            </div>
          </div>
          <p className="text-sm text-white/50">
            Enregistrement d&apos;une succursale en Suisse pour opérer localement.
            Nous vous accompagnons dans toutes les démarches auprès du registre du commerce cantonal.
          </p>
          <div className={cn(
            "absolute right-4 top-4 h-5 w-5 rounded-full border-2 transition-all",
            data.needs_branch_ch ? "border-blue-500 bg-blue-500" : "border-white/25"
          )}>
            {data.needs_branch_ch && (
              <div className="absolute inset-1 rounded-full bg-white" />
            )}
          </div>
        </button>

        {/* FR */}
        <button
          onClick={() => update({ needs_branch_fr: !data.needs_branch_fr })}
          className={cn(
            "relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all",
            data.needs_branch_fr
              ? "border-blue-500/40 bg-blue-500/12"
              : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-lg",
              data.needs_branch_fr ? "bg-blue-500/20" : "bg-white/8"
            )}>
              🇫🇷
            </div>
            <div>
              <p className="font-semibold text-white">Succursale France</p>
              <p className="text-xs text-white/40">Enregistrement au Greffe</p>
            </div>
          </div>
          <p className="text-sm text-white/50">
            Enregistrement d&apos;une succursale en France auprès du Greffe du Tribunal de commerce.
            Nécessaire pour exercer une activité commerciale régulière en France.
          </p>
          <div className={cn(
            "absolute right-4 top-4 h-5 w-5 rounded-full border-2 transition-all",
            data.needs_branch_fr ? "border-blue-500 bg-blue-500" : "border-white/25"
          )}>
            {data.needs_branch_fr && (
              <div className="absolute inset-1 rounded-full bg-white" />
            )}
          </div>
        </button>
      </div>

      {!data.needs_branch_ch && !data.needs_branch_fr && (
        <p className="text-center text-sm text-white/30">
          Aucune succursale sélectionnée — vous pourrez toujours en ajouter une plus tard.
        </p>
      )}
    </div>
  );
}
