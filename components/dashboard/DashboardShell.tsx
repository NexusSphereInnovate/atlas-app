"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/atlas";

type NavItem = { href: string; label: string; icon: string; roles: UserRole[]; };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DashboardShell({
  role,
  fullName,
  children,
}: {
  role: UserRole;
  fullName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const nav: NavItem[] = useMemo(
    () => [
      { href: role === "admin" ? "/dashboard/admin" : role === "agent" ? "/dashboard/agents" : "/dashboard/client", label: "Dashboard", icon: "⊞", roles: ["admin", "agent", "client"] },
      { href: "/dashboard/documents", label: "Documents", icon: "📄", roles: ["admin", "agent", "client"] },
      { href: "/dashboard/client/company-request", label: "Création société", icon: "🏛️", roles: ["client"] },
      { href: "/dashboard/clients", label: "Clients", icon: "👥", roles: ["admin", "agent"] },
      { href: "/dashboard/requests", label: "Demandes", icon: "📋", roles: ["admin", "agent"] },
      { href: "/dashboard/billing", label: "Factures", icon: "💳", roles: ["admin", "agent", "client"] },
    ],
    [role]
  );

  const filtered = nav.filter((i) => i.roles.includes(role));

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0c12] text-[#c8d1de]">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-8 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_70%)]" />
        <div className="absolute -bottom-24 right-8 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.10)_0%,transparent_70%)]" />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0c12]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-400 text-white flex items-center justify-center font-extrabold">
              A
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-extrabold text-[#eef1f6] tracking-[-0.2px]">Atlas</div>
              <div className="text-[11px] text-white/35 -mt-0.5">{role.toUpperCase()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-400 text-white flex items-center justify-center text-[11px] font-bold">
                {(fullName?.split(" ")[0]?.[0] ?? "A") + (fullName?.split(" ")[1]?.[0] ?? "G")}
              </div>
              <div className="text-[12px] text-white/80 font-semibold max-w-[180px] truncate">{fullName}</div>
            </div>

            <button
              onClick={onSignOut}
              className="hidden sm:inline-flex rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-300 hover:bg-rose-500/15"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4">
        <div className="flex gap-5">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block relative">
            <div
              className={cx(
                "sticky top-20 h-[calc(100vh-96px)] rounded-2xl border border-white/8 bg-[#111520]/75 backdrop-blur-xl shadow-[0_18px_80px_rgba(0,0,0,0.35)]",
                collapsed ? "w-[72px]" : "w-[240px]"
              )}
            >
              <div className="flex h-full flex-col p-3">
                <div className={cx("flex items-center gap-3 px-2 py-3", collapsed && "justify-center")}>
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-400 text-white flex items-center justify-center font-extrabold">
                    A
                  </div>
                  {!collapsed && (
                    <div className="leading-tight">
                      <div className="text-[13px] font-extrabold text-[#eef1f6] tracking-[-0.2px]">Atlas</div>
                      <div className="text-[11px] text-white/35 -mt-0.5">Incorporate</div>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  {filtered.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className={cx(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[12px] font-semibold transition",
                          active ? "bg-blue-500/15 text-blue-300 border border-blue-500/20" : "text-white/45 hover:bg-white/5 hover:text-white/75"
                        )}
                      >
                        <span className="w-6 text-center text-[15px]">{item.icon}</span>
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto">
                  <div className={cx("mt-3 rounded-xl border border-white/8 bg-white/4 p-3", collapsed && "p-2")}>
                    <div className={cx("flex items-center gap-3", collapsed && "justify-center")}>
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-400 text-white flex items-center justify-center text-[11px] font-bold">
                        {(fullName?.split(" ")[0]?.[0] ?? "A") + (fullName?.split(" ")[1]?.[0] ?? "G")}
                      </div>
                      {!collapsed && (
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-bold text-[#eef1f6]">{fullName}</div>
                          <div className="text-[10px] text-white/35">atlas</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setCollapsed((v) => !v)}
                    className="mt-3 w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-[12px] font-semibold text-white/55 hover:bg-white/6"
                  >
                    {collapsed ? "▶" : "◀ Réduire"}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="relative z-10 flex-1 pb-[92px] lg:pb-10 pt-5">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/8 bg-[#0a0c12]/75 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-3">
          <div className="flex items-center justify-between py-2">
            {filtered.slice(0, 5).map((item) => {
              const active = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cx(
                    "flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold transition",
                    active ? "text-blue-300" : "text-white/45"
                  )}
                >
                  <span className="text-[16px]">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={onSignOut}
              className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-[10px] font-semibold text-rose-300"
            >
              <span className="text-[16px]">⎋</span>
              <span>Quitter</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}