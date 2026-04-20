"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";

type Currency = "CHF" | "EUR";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fmt: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "CHF",
  setCurrency: () => {},
  fmt: (n) => formatCurrency(n, "CHF"),
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("CHF");

  useEffect(() => {
    const saved = localStorage.getItem("atlas_currency") as Currency | null;
    if (saved === "CHF" || saved === "EUR") setCurrencyState(saved);
  }, []);

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    localStorage.setItem("atlas_currency", c);
  }

  function fmt(amount: number) {
    return formatCurrency(amount, currency);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, fmt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
