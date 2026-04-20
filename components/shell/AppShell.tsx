"use client";

import { useMemo, useState } from "react";
import DesktopSidebar from "./DesktopSidebar";
import MobileBottomNav from "./MobileBottomNav";
import type { AppRole } from "@/lib/auth/guards";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function Icon({ name }: { name: "home" | "users" | "files" | "billing" | "settings" }) {
  const cls = "h-5 w-5";
  if (name === "home")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  if (name === "users")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  if (name === "files")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  if (name === "billing")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none">
        <path d="M21 7H3v10h18V7Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 11h4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a8.2 8.2 0 0 0-1.7-1l-.4-2.7H9.1l-.4 2.7a8.2 8.2 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 13a7.97 7.97 0 0 0-.1 1 7.97 7.97 0 0 0 .1 1L2.5 16.6l2 3.4 2.5-1a8.2 8.2 0 0 0 1.7 1l.4 2.7h5.8l.4-2.7a8.2 8.2 0 0 0 1.7-1l2.5 1 2-3.4L19.4 15Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.9"
      />
    </svg>
  );
}

export default function AppShell({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const nav = useMemo<NavItem[]>(() => {
    if (role === "admin") {
      return [
        { href: "/dashboard/admin", label: "Dashboard", icon: <Icon name="home" /> },
        { href: "/dashboard/admin/clients", label: "Clients", icon: <Icon name="users" /> },
        { href: "/dashboard/admin/documents", label: "Documents", icon: <Icon name="files" /> },
        { href: "/dashboard/admin/invoices", label: "Factures", icon: <Icon name="billing" /> },
        { href: "/dashboard/admin/settings", label: "Réglages", icon: <Icon name="settings" /> },
      ];
    }
    if (role === "agent") {
      return [
        { href: "/dashboard/agents", label: "Dashboard", icon: <Icon name="home" /> },
        { href: "/dashboard/agents/clients", label: "Clients", icon: <Icon name="users" /> },
        { href: "/dashboard/agents/documents", label: "Documents", icon: <Icon name="files" /> },
        { href: "/dashboard/agents/invoices", label: "Factures", icon: <Icon name="billing" /> },
      ];
    }
    return [
      { href: "/dashboard/clients", label: "Accueil", icon: <Icon name="home" /> },
      { href: "/dashboard/clients/documents", label: "Documents", icon: <Icon name="files" /> },
      { href: "/dashboard/clients/invoices", label: "Factures", icon: <Icon name="billing" /> },
      { href: "/dashboard/clients/settings", label: "Réglages", icon: <Icon name="settings" /> },
    ];
  }, [role]);

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[0.55]">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-260px] right-[-180px] h-[560px] w-[560px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl">
        <DesktopSidebar nav={nav} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <main
          className={[
            "min-h-screen flex-1 px-4 py-6 md:px-8 md:py-10",
            "pb-24 md:pb-10",
          ].join(" ")}
        >
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav nav={nav} />
    </div>
  );
}