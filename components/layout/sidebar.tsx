"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, FileText, Receipt, Award, Settings,
  Building2, UserCheck, FileBadge, DollarSign, MessageSquare,
  CreditCard, Globe, Landmark, LogOut, PanelLeftClose,
  PanelLeftOpen, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/contexts/language-context";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import type { UserRole } from "@/types/database";
import { signOut } from "@/lib/auth/helpers";

interface NavItem {
  href: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  roles: UserRole[];
}

interface NavSection {
  labelFr?: string;
  labelEn?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Tableau de bord", labelEn: "Dashboard", icon: LayoutDashboard, roles: ["admin_global","admin_org","agent","client"] },
    ],
  },
  {
    labelFr: "Équipe",
    labelEn: "Team",
    items: [
      { href: "/dashboard/clients",  label: "Clients", labelEn: "Clients", icon: Users,      roles: ["admin_global","admin_org","agent"] },
      { href: "/dashboard/agents",   label: "Agents",  labelEn: "Agents",  icon: UserCheck,  roles: ["admin_global","admin_org"] },
    ],
  },
  {
    labelFr: "Sociétés",
    labelEn: "Companies",
    items: [
      { href: "/dashboard/company-requests", label: "Créations",   labelEn: "Creations",  icon: Building2, roles: ["admin_global","admin_org","agent","client"] },
      { href: "/dashboard/companies",        label: "Sociétés",    labelEn: "Companies",  icon: Landmark,  roles: ["admin_global","admin_org","client"] },
    ],
  },
  {
    labelFr: "Services",
    labelEn: "Services",
    items: [
      { href: "/dashboard/services", label: "Services", labelEn: "Services", icon: Globe, roles: ["admin_global","admin_org","client"] },
    ],
  },
  {
    labelFr: "Finances",
    labelEn: "Finance",
    items: [
      { href: "/dashboard/invoices",    label: "Factures",     labelEn: "Invoices",     icon: Receipt,   roles: ["admin_global","admin_org","agent","client"] },
      { href: "/dashboard/contracts",   label: "Contrats",     labelEn: "Contracts",    icon: FileBadge, roles: ["admin_global","admin_org","client"] },
      { href: "/dashboard/commissions", label: "Commissions",  labelEn: "Commissions",  icon: DollarSign,roles: ["admin_global","admin_org","agent"] },
    ],
  },
  {
    labelFr: "Support",
    labelEn: "Support",
    items: [
      { href: "/dashboard/tickets",   label: "Tickets",   labelEn: "Tickets",   icon: MessageSquare, roles: ["admin_global","admin_org","agent","client"] },
      { href: "/dashboard/documents", label: "Documents", labelEn: "Documents", icon: FileText,      roles: ["admin_global","admin_org","agent","client"] },
    ],
  },
  {
    labelFr: "Compte",
    labelEn: "Account",
    items: [
      { href: "/dashboard/bank-account", label: "Compte bancaire", labelEn: "Bank Account", icon: CreditCard,  roles: ["client","admin_global","admin_org"] },
      { href: "/dashboard/atlas-circle", label: "Atlas Circle",   labelEn: "Atlas Circle", icon: Award,       roles: ["admin_global","admin_org","agent","client"] },
      { href: "/dashboard/profile",      label: "Mon profil",     labelEn: "My Profile",   icon: UserCircle,  roles: ["admin_global","admin_org","agent","client"] },
      { href: "/dashboard/settings",     label: "Paramètres",     labelEn: "Settings",     icon: Settings,    roles: ["admin_global","admin_org"] },
    ],
  },
];

interface SidebarProps {
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
}

export function Sidebar({ role, firstName, lastName }: SidebarProps) {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const { lang } = useLang();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = (firstName?.[0] ?? "") + (lastName?.[0] ?? "");

  // Filter sections and items for this role
  const filteredSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300 ease-in-out",
        "border-r border-white/8 bg-[#0d0d10]",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + Collapse toggle */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b border-white/8",
        collapsed ? "justify-center px-0" : "px-3 gap-2"
      )}>
        {collapsed ? (
          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/8 hover:text-white/70"
            title={lang === "fr" ? "Développer" : "Expand"}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Atlas" width={18} height={18} style={{ width: 18, height: 18 }} />
            </div>
            <span className="flex-1 truncate text-sm font-semibold text-white">
              Atlas <span className="font-light text-white/40">Incorporate</span>
            </span>
            <button
              onClick={toggle}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/8 hover:text-white/60"
              title={lang === "fr" ? "Réduire" : "Collapse"}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {filteredSections.map((section, si) => (
          <div key={si}>
            {/* Section label (only when expanded and label exists) */}
            {!collapsed && section.labelFr && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/20">
                {lang === "fr" ? section.labelFr : section.labelEn}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const label = lang === "fr" ? item.label : item.labelEn;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:bg-white/6 hover:text-white/80",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? label : undefined}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-white" : "text-white/40 group-hover:text-white/70"
                      )} />
                      {!collapsed && (
                        <span className="truncate">{label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — avatar + logout */}
      <div className="border-t border-white/8 p-2">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[10px] font-bold text-white">
              {initials}
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title={lang === "fr" ? "Déconnexion" : "Sign out"}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400/70 transition-colors hover:bg-red-500/15 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#16161c] px-3 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-[10px] font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {firstName} {lastName}
              </p>
              <p className="truncate text-[10px] text-white/40 capitalize">{role.replace("_", " ")}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title={lang === "fr" ? "Déconnexion" : "Sign out"}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400/60 transition-colors hover:bg-red-500/15 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
