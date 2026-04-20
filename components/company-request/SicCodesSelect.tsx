"use client";

import { useMemo } from "react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

const GROUPS: { category: string; items: { code: string; label: string }[] }[] = [
  {
    category: "Technologies & Informatique",
    items: [
      { code: "62010", label: "Programmation informatique" },
      { code: "62020", label: "Conseil en technologies de l’information" },
      { code: "63110", label: "Traitement de données, hébergement" },
    ],
  },
  {
    category: "Conseil & Services aux entreprises",
    items: [
      { code: "70229", label: "Conseil en gestion d’entreprise" },
      { code: "82990", label: "Autres services de soutien aux entreprises" },
    ],
  },
  {
    category: "Commerce & E-commerce",
    items: [
      { code: "47910", label: "Vente à distance sur catalogue général" },
      { code: "47990", label: "Autre vente à distance" },
    ],
  },
];

export default function SicCodesSelect({ value, onChange }: Props) {
  const flat = useMemo(() => GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, category: g.category }))), []);

  const toggle = (code: string) => {
    const exists = value.includes(code);
    if (exists) {
      onChange(value.filter((c) => c !== code));
      return;
    }
    if (value.length >= 4) {
      return;
    }
    onChange([...value, code]);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-semibold tracking-tight">Codes SIC</div>
          <div className="text-white/55 text-sm mt-1">Choisis jusqu’à 4 activités maximum.</div>
        </div>
        <div className="text-xs text-white/55">{value.length}/4</div>
      </div>

      <div className="mt-4 space-y-4">
        {GROUPS.map((g) => (
          <div key={g.category}>
            <div className="text-xs uppercase tracking-widest text-white/40">{g.category}</div>
            <div className="mt-2 grid grid-cols-1 gap-2">
              {g.items.map((item) => {
                const selected = value.includes(item.code);
                const disabled = !selected && value.length >= 4;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => toggle(item.code)}
                    disabled={disabled}
                    className={[
                      "text-left rounded-xl border px-3 py-2 transition",
                      selected ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-white/0 hover:bg-white/5",
                      disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white/90 font-medium truncate">{item.label}</div>
                        <div className="text-white/45 text-xs mt-0.5">SIC {item.code}</div>
                      </div>
                      <div className={selected ? "text-blue-300" : "text-white/35"}>{selected ? "✓" : "+"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {value.length >= 4 && (
        <div className="mt-3 text-xs text-amber-300/80">
          Limite atteinte : tu peux retirer un code pour en ajouter un autre.
        </div>
      )}
    </div>
  );
}