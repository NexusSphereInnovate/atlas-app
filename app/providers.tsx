"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { CurrencyProvider } from "@/lib/contexts/currency-context";
import { LanguageProvider } from "@/lib/contexts/language-context";

export default function AtlasProvider({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
