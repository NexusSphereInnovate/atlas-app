"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({ open, onClose, title, description, children, size = "md", className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full rounded-2xl border border-white/10 bg-[#141418] shadow-2xl",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          sizes[size],
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-white/8 p-6 pb-4">
            <div>
              {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
              {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
