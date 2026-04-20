"use client";

import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIC_CODES, getSicCategories } from "../sic-codes";
import type { WizardData } from "../wizard";

interface StepSicProps {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function StepSic({ data, update }: StepSicProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => getSicCategories(), []);

  const filtered = useMemo(() => {
    return SIC_CODES.filter((c) => {
      const matchSearch = !search ||
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.code.includes(search);
      const matchCat = !activeCategory || c.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory]);

  const toggle = (code: string) => {
    const current = data.sic_codes;
    if (current.includes(code)) {
      update({ sic_codes: current.filter((c) => c !== code) });
    } else if (current.length < 4) {
      update({ sic_codes: [...current, code] });
    }
  };

  const selectedCodes = SIC_CODES.filter((c) => data.sic_codes.includes(c.code));

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/50">
        Sélectionnez jusqu&apos;à <strong className="text-white">4 codes SIC</strong> correspondant aux activités de votre société.
      </p>

      {/* Selected */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map((c) => (
            <div
              key={c.code}
              className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-1.5 text-xs"
            >
              <span className="font-mono font-semibold text-blue-400">{c.code}</span>
              <span className="text-white/70 max-w-[200px] truncate">{c.label}</span>
              <button onClick={() => toggle(c.code)} className="text-white/40 hover:text-white transition-colors">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un code ou une activité…"
          className="w-full rounded-xl border border-white/10 bg-[#16161c] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            !activeCategory ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70"
          )}
        >
          Toutes
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === cat ? "bg-white/15 text-white" : "bg-white/5 text-white/40 hover:bg-white/8 hover:text-white/70"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-white/8 bg-white/2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/30">Aucun résultat</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.slice(0, 50).map((c) => {
              const selected = data.sic_codes.includes(c.code);
              const disabled = !selected && data.sic_codes.length >= 4;
              return (
                <li key={c.code}>
                  <button
                    onClick={() => toggle(c.code)}
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      selected ? "bg-blue-500/12" : "hover:bg-white/5",
                      disabled && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      selected ? "border-blue-500 bg-blue-500" : "border-white/20"
                    )}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="w-14 shrink-0 font-mono text-xs text-blue-400">{c.code}</span>
                    <span className="text-sm text-white/70">{c.label}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-white/25">{c.category}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-white/30">
        {data.sic_codes.length}/4 codes sélectionnés
        {filtered.length > 50 && ` · Affichage limité à 50 résultats — affinez votre recherche`}
      </p>
    </div>
  );
}
