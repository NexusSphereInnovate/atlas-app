"use client";

import type { WizardData } from "../wizard";
import { Info } from "lucide-react";

interface StepNamesProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function StepNames({ data, update }: StepNamesProps) {
  const setName = (i: number, value: string) => {
    const names = [...data.proposed_names];
    names[i] = value;
    update({ proposed_names: names });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-sm text-blue-300/80">
          Proposez jusqu&apos;à 3 noms pour votre société. Companies House vérifiera la disponibilité.
          Le premier nom est votre choix prioritaire. Toutes les sociétés UK LTD se terminent par <strong>Limited</strong> ou <strong>Ltd</strong>.
        </p>
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <label className="mb-1.5 block text-sm font-medium text-white/60">
              Nom {i + 1} {i === 0 && <span className="text-blue-400">*</span>}
              {i === 0 && <span className="ml-2 text-xs text-white/30">— Choix principal</span>}
              {i > 0 && <span className="ml-2 text-xs text-white/30">— Optionnel</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={data.proposed_names[i] ?? ""}
                onChange={(e) => setName(i, e.target.value)}
                placeholder={`Ex: ${["Atlas Ventures", "Atlas Trading", "Atlas Global"][i]} Limited`}
                className="flex-1 rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition-all focus:border-white/30 focus:bg-white/8"
              />
              <span className="shrink-0 rounded-lg border border-white/8 bg-white/3 px-3 py-3 text-xs text-white/30">
                Ltd
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-white/30">
        Le nom ne peut pas contenir de termes réglementés comme &quot;Bank&quot;, &quot;Royal&quot;, &quot;Government&quot; sans autorisation préalable.
      </p>
    </div>
  );
}
