"use client";

import { Info } from "lucide-react";
import type { WizardData } from "../wizard";

interface StepCapitalProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function StepCapital({ data, update }: StepCapitalProps) {
  const handleCapitalChange = (value: number) => {
    if (data.share_value > 0) {
      update({ share_capital: value, share_count: Math.round(value / data.share_value) });
    } else {
      update({ share_capital: value });
    }
  };

  const handleShareValueChange = (value: number) => {
    if (value > 0 && data.share_count > 0) {
      update({ share_value: value, share_capital: value * data.share_count });
    } else {
      update({ share_value: value });
    }
  };

  const handleShareCountChange = (value: number) => {
    if (data.share_value > 0) {
      update({ share_count: value, share_capital: value * data.share_value });
    } else {
      update({ share_count: value });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-300/80">
          Le capital social standard pour une UK LTD est de <strong>100 GBP</strong> avec{" "}
          <strong>100 parts à 1 GBP</strong> chacune. Vous pouvez modifier ces valeurs selon vos besoins.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Capital social (GBP)
          </label>
          <input
            type="number"
            min={1}
            value={data.share_capital}
            onChange={(e) => handleCapitalChange(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Valeur par part (GBP)
          </label>
          <input
            type="number"
            min={0.01}
            step={0.01}
            value={data.share_value}
            onChange={(e) => handleShareValueChange(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">
            Nombre de parts
          </label>
          <input
            type="number"
            min={1}
            value={data.share_count}
            onChange={(e) => handleShareCountChange(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/3 p-4">
        <p className="text-sm text-white/50 font-medium mb-2">Récapitulatif</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Capital social total</span>
            <span className="font-semibold text-white">{data.share_capital.toLocaleString("fr-FR")} GBP</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Nombre de parts</span>
            <span className="font-semibold text-white">{data.share_count.toLocaleString("fr-FR")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Valeur nominale par part</span>
            <span className="font-semibold text-white">{data.share_value.toFixed(2)} GBP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
