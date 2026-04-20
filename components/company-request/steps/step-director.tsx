"use client";

import { Info } from "lucide-react";
import type { WizardData } from "../wizard";

interface StepDirectorProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function StepDirector({ data, update }: StepDirectorProps) {
  const field = (key: keyof WizardData) => ({
    value: (data[key] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update({ [key]: e.target.value }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-sm text-blue-300/80">
          Le directeur est également la personne ayant contrôle significatif (<strong>PSC</strong>).
          Ces informations seront transmises à Companies House.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">Prénom *</label>
          <input
            type="text"
            {...field("director_first_name")}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">Nom *</label>
          <input
            type="text"
            {...field("director_last_name")}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">Date de naissance *</label>
          <input
            type="date"
            {...field("director_dob")}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">Nationalité *</label>
          <input
            type="text"
            {...field("director_nationality")}
            placeholder="Ex: Française"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-white/60">Adresse de résidence *</p>
        <div>
          <label className="mb-1.5 block text-xs text-white/40">Ligne 1</label>
          <input
            type="text"
            {...field("director_address_line1")}
            placeholder="Numéro et nom de la rue"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-white/40">Ligne 2 (optionnel)</label>
          <input
            type="text"
            {...field("director_address_line2")}
            placeholder="Appartement, bâtiment, etc."
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-white/40">Ville</label>
            <input
              type="text"
              {...field("director_city")}
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/40">Code postal</label>
            <input
              type="text"
              {...field("director_postcode")}
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-white/40">Pays</label>
          <input
            type="text"
            {...field("director_country")}
            placeholder="Ex: France"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
      </div>
    </div>
  );
}
