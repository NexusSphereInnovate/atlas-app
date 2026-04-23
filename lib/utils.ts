import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "CHF"): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";

  if (abs >= 1000) {
    const k = abs / 1000;
    // 1.0 → "1k", 1.5 → "1.5k", 1.25 → "1.3k"
    const kStr = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1);
    return `${sign}${kStr}k ${currency}`;
  }

  // Sous 1 000 : sans décimales inutiles
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return `${sign}${formatted} ${currency}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return formatDate(date);
}

export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
