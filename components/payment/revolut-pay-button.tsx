"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useLang } from "@/lib/contexts/language-context";

interface RevolutPayButtonProps {
  invoiceId: string;
  amount: number;
  currency: string;
}

export function RevolutPayButton({ invoiceId, amount, currency }: RevolutPayButtonProps) {
  const { lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Erreur de paiement");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handlePay}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-[#191c20] border border-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/8 disabled:opacity-50"
      >
        {loading ? <Spinner size="sm" /> : (
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#191C20"/>
            <path d="M20 8C13.373 8 8 13.373 8 20s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 2.4a9.6 9.6 0 110 19.2 9.6 9.6 0 010-19.2z" fill="white"/>
            <path d="M17.6 15.2h4.8a4.8 4.8 0 010 9.6H17.6v-9.6z" fill="white"/>
          </svg>
        )}
        {loading
          ? (lang === "fr" ? "Redirection…" : "Redirecting…")
          : `Revolut Pay · ${new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { style: "currency", currency }).format(amount)}`}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
