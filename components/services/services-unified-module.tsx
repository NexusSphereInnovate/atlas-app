"use client";

import { useState } from "react";
import { ServicesModule } from "./services-module";
import ServiceRequestsModule from "./service-requests-module";
import { useLang } from "@/lib/contexts/language-context";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/profile";

const TABS = [
  { id: "catalog", labelFr: "Catalogue", labelEn: "Catalog" },
  { id: "requests", labelFr: "Demandes", labelEn: "Requests" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ServicesUnifiedModule({ profile }: { profile: UserProfile }) {
  const [tab, setTab] = useState<TabId>("catalog");
  const { lang } = useLang();
  const isClient = profile.role === "client";

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-white/4 p-1">
        {TABS.map(({ id, labelFr, labelEn }) => {
          const isActive = tab === id;
          let label: string;
          if (id === "requests") {
            label = isClient
              ? lang === "fr" ? "Mes demandes" : "My Requests"
              : lang === "fr" ? "Demandes clients" : "Client Requests";
          } else {
            label = lang === "fr" ? labelFr : labelEn;
          }
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm transition-colors",
                isActive
                  ? "bg-white/12 font-medium text-white"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "catalog" && <ServicesModule profile={profile} />}
      {tab === "requests" && <ServiceRequestsModule profile={profile} />}
    </div>
  );
}

export default ServicesUnifiedModule;
