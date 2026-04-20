import { cn } from "@/lib/utils";
import { type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}
      <textarea
        className={cn(
          "w-full resize-none rounded-xl border bg-[#16161c] px-4 py-3 text-sm text-white",
          "border-white/10 outline-none transition-all",
          "focus:border-white/30 focus:bg-white/8",
          "placeholder:text-white/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500/50",
          className
        )}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
