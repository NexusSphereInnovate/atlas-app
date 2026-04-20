"use client";

import { Avatar } from "@/components/ui/avatar";
import { useCurrency } from "@/lib/contexts/currency-context";
import { useLang } from "@/lib/contexts/language-context";
import { NotificationBell } from "./notification-bell";
import type { UserRole } from "@/types/database";

const roleLabels: Record<UserRole, { fr: string; en: string }> = {
  admin_global: { fr: "Administrateur Global", en: "Global Admin" },
  admin_org:    { fr: "Administrateur",         en: "Admin" },
  agent:        { fr: "Agent",                  en: "Agent" },
  client:       { fr: "Client",                 en: "Client" },
};

interface HeaderProps {
  title: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
}

export function Header({ title, role, firstName, lastName }: HeaderProps) {
  const initials =
    ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() || "?";
  const { currency, setCurrency } = useCurrency();
  const { lang, setLang } = useLang();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/8 bg-[#0d0d10]/80 px-4 backdrop-blur-md md:px-6">
      <h1 className="text-sm font-semibold text-white md:text-base">{title}</h1>

      <div className="flex items-center gap-1.5">
        {/* Currency toggle */}
        <div className="hidden items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs font-semibold sm:flex">
          {(["CHF", "EUR"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={
                currency === c
                  ? "rounded-md bg-white/15 px-2.5 py-1 text-white transition-all"
                  : "px-2.5 py-1 text-white/35 transition-all hover:text-white/60"
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* Language toggle */}
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs font-semibold">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={
                lang === l
                  ? "rounded-md bg-white/15 px-2.5 py-1 text-white uppercase transition-all"
                  : "px-2.5 py-1 text-white/35 uppercase transition-all hover:text-white/60"
              }
            >
              {l}
            </button>
          ))}
        </div>

        {/* Notification bell */}
        <NotificationBell />

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <Avatar initials={initials} size="sm" />
          <div className="hidden md:block">
            <p className="text-xs font-medium text-white leading-none">
              {firstName} {lastName}
            </p>
            <p className="mt-0.5 text-[10px] text-white/40">
              {roleLabels[role][lang]}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
