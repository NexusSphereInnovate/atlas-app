"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Building2, Receipt,
  MessageSquare, Users, DollarSign, CreditCard, Globe,
  FileBadge, MoreHorizontal, X, Award, Landmark, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/contexts/language-context";
import { useNotifications } from "@/lib/contexts/notifications-context";
import type { UserRole } from "@/types/database";

interface NavItem {
  href: string;
  tKey: string;
  icon: React.ElementType;
  roles: UserRole[];
}

// Ordered by priority — first 4 visible items will be shown in bar
const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",                  tKey: "nav.dashboard",       icon: LayoutDashboard, roles: ["admin_global","admin_org","agent","client"] },
  { href: "/dashboard/company-requests", tKey: "nav.companyRequests", icon: Building2,       roles: ["admin_global","admin_org","agent","client"] },
  { href: "/dashboard/invoices",         tKey: "nav.invoices",        icon: Receipt,         roles: ["admin_global","admin_org","client"] },
  { href: "/dashboard/tickets",          tKey: "nav.tickets",         icon: MessageSquare,   roles: ["admin_global","admin_org","agent","client"] },
  // Secondary — appear in "More"
  { href: "/dashboard/companies",        tKey: "nav.companies",       icon: Landmark,        roles: ["admin_global","admin_org","client"] },
  { href: "/dashboard/services",         tKey: "nav.services",        icon: Globe,           roles: ["admin_global","admin_org","client"] },
  { href: "/dashboard/clients",          tKey: "nav.clients",         icon: Users,           roles: ["admin_global","admin_org","agent"] },
  { href: "/dashboard/contracts",        tKey: "nav.contracts",       icon: FileBadge,       roles: ["admin_global","admin_org","client"] },
  { href: "/dashboard/documents",        tKey: "nav.documents",       icon: FileText,        roles: ["admin_global","admin_org","agent","client"] },
  { href: "/dashboard/commissions",      tKey: "nav.commissions",     icon: DollarSign,      roles: ["admin_global","admin_org","agent"] },
  { href: "/dashboard/bank-account",     tKey: "nav.bankAccount",     icon: CreditCard,      roles: ["client","admin_global","admin_org"] },
  { href: "/dashboard/atlas-circle",     tKey: "nav.atlasCircle",     icon: Award,           roles: ["admin_global","admin_org","agent","client"] },
  { href: "/dashboard/profile",          tKey: "nav.profile",         icon: UserCircle,      roles: ["admin_global","admin_org","agent","client"] },
];

const MAX_PRIMARY = 4;

interface BottomNavProps { role: UserRole; }

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useLang();
  const { unreadCount } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  const visible = ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));
  const primary   = visible.slice(0, MAX_PRIMARY);
  const secondary = visible.slice(MAX_PRIMARY);
  const hasMore   = secondary.length > 0;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const label = (tKey: string) =>
    t(tKey as Parameters<typeof t>[0]).split(" ")[0];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="border-t border-white/8 bg-[#0d0d10]/95 backdrop-blur-xl">
          <ul className="flex items-stretch">
            {primary.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 transition-colors relative",
                      active ? "text-white" : "text-white/35"
                    )}
                  >
                    {active && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-white opacity-80" />
                    )}
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active && "drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium tracking-wide",
                        active ? "text-white" : "text-white/35"
                      )}
                    >
                      {label(item.tKey)}
                    </span>
                  </Link>
                </li>
              );
            })}

            {/* More button */}
            {hasMore && (
              <li className="flex-1">
                <button
                  onClick={() => setMoreOpen(true)}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 py-2.5 transition-colors relative",
                    secondary.some((i) => isActive(i.href))
                      ? "text-white"
                      : "text-white/35"
                  )}
                >
                  {secondary.some((i) => isActive(i.href)) && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-white opacity-80" />
                  )}
                  <div className="relative">
                    <MoreHorizontal className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-wide">
                    {t("nav.more")}
                  </span>
                </button>
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 bg-[#141418] pb-safe md:hidden">
            {/* Handle */}
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-sm font-semibold text-white">
                {t("nav.more")}
              </p>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/8 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 px-4 pb-8">
              {secondary.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-center text-[10px] font-medium leading-tight">
                      {t(item.tKey as Parameters<typeof t>[0])}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
