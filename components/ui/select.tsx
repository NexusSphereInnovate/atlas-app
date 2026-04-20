"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}
      <div className="relative">
        <select
          className={cn(
            "w-full appearance-none rounded-xl border bg-[#16161c] px-4 py-3 pr-10 text-sm text-white",
            "border-white/10 outline-none transition-all",
            "focus:border-white/30 focus:bg-white/8",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/50",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1a1a20] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
