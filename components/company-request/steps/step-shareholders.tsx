"use client";

import { Plus, Trash2, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardData } from "../wizard";
import type { Shareholder } from "@/types/database";

interface StepShareholdersProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

const EMPTY_PERSON: Shareholder = {
  type: "person",
  first_name: "",
  last_name: "",
  nationality: "",
  address: "",
  share_count: 0,
  share_percentage: 0,
};

const EMPTY_COMPANY: Shareholder = {
  type: "company",
  company_name: "",
  nationality: "",
  address: "",
  share_count: 0,
  share_percentage: 0,
};

export function StepShareholders({ data, update }: StepShareholdersProps) {
  const setShareholders = (shareholders: Shareholder[]) => update({ shareholders });

  const add = (type: "person" | "company") => {
    setShareholders([
      ...data.shareholders,
      type === "person" ? { ...EMPTY_PERSON } : { ...EMPTY_COMPANY },
    ]);
  };

  const remove = (i: number) => {
    setShareholders(data.shareholders.filter((_, idx) => idx !== i));
  };

  const patch = (i: number, fields: Partial<Shareholder>) => {
    const updated = [...data.shareholders];
    updated[i] = { ...updated[i], ...fields };
    setShareholders(updated);
  };

  const totalPct = data.shareholders.reduce((s, sh) => s + (sh.share_percentage || 0), 0);

  return (
    <div className="space-y-5">
      <p className="text-sm text-white/50">
        Renseignez les actionnaires de la société. La somme des pourcentages doit être égale à 100%.
        <span className={cn("ml-2 font-semibold", totalPct === 100 ? "text-emerald-400" : "text-amber-400")}>
          Total : {totalPct.toFixed(1)}%
        </span>
      </p>

      <div className="space-y-4">
        {data.shareholders.map((sh, i) => (
          <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => patch(i, { type: "person", company_name: undefined })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    sh.type === "person" ? "bg-blue-500 text-white" : "bg-white/8 text-white/50 hover:bg-white/12"
                  )}
                >
                  <User className="h-3 w-3" />
                  Personne
                </button>
                <button
                  onClick={() => patch(i, { type: "company", first_name: undefined, last_name: undefined })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    sh.type === "company" ? "bg-blue-500 text-white" : "bg-white/8 text-white/50 hover:bg-white/12"
                  )}
                >
                  <Building2 className="h-3 w-3" />
                  Société
                </button>
              </div>
              {data.shareholders.length > 1 && (
                <button
                  onClick={() => remove(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sh.type === "person" ? (
                <>
                  <Field label="Prénom *" value={sh.first_name ?? ""} onChange={(v) => patch(i, { first_name: v })} />
                  <Field label="Nom *" value={sh.last_name ?? ""} onChange={(v) => patch(i, { last_name: v })} />
                </>
              ) : (
                <div className="sm:col-span-2">
                  <Field label="Nom de la société *" value={sh.company_name ?? ""} onChange={(v) => patch(i, { company_name: v })} />
                </div>
              )}
              <Field label="Nationalité" value={sh.nationality ?? ""} onChange={(v) => patch(i, { nationality: v })} />
              <Field label="Adresse complète" value={sh.address ?? ""} onChange={(v) => patch(i, { address: v })} />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Nb. de parts *</label>
                <input
                  type="number"
                  min={0}
                  value={sh.share_count}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    const pct = data.share_count > 0 ? (count / data.share_count) * 100 : 0;
                    patch(i, { share_count: count, share_percentage: parseFloat(pct.toFixed(2)) });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">Pourcentage (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={sh.share_percentage}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    const count = Math.round((pct / 100) * data.share_count);
                    patch(i, { share_percentage: pct, share_count: count });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => add("person")}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/6 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Personne physique
        </button>
        <button
          onClick={() => add("company")}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/6 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Société
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-white/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#16161c] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 focus:bg-white/8"
      />
    </div>
  );
}
