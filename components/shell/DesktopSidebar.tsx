"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export default function DesktopSidebar({
  nav,
  collapsed,
  onToggle,
}: {
  nav: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <aside className="hidden md:block">
      <div
        className={[
          "sticky top-0 h-screen",
          "border-r border-white/10",
          "bg-white/[0.04] backdrop-blur-xl",
          "transition-all duration-200",
          collapsed ? "w-[78px]" : "w-[260px]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/10" />
            {!collapsed ? (
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-[-0.2px]">Atlas</div>
                <div className="text-xs text-white/45">Workspace</div>
              </div>
            ) : null}
          </div>

          <button
            onClick={onToggle}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
            type="button"
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="flex flex-col justify-between h-[calc(100vh-72px)] px-2 py-2">
          <div className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-2xl px-3 py-3",
                    "ring-1 ring-transparent",
                    active
                      ? "bg-white/10 ring-white/10"
                      : "hover:bg-white/5 hover:ring-white/10",
                  ].join(" ")}
                >
                  <span className="text-white/80">{item.icon}</span>
                  {!collapsed ? (
                    <span className="text-sm text-white/85">{item.label}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Logout button at bottom */}
          <div className="pb-4">
            <button
              onClick={handleLogout}
              className={[
                "w-full group flex items-center gap-3 rounded-2xl px-3 py-3",
                "ring-1 ring-transparent text-white/35",
                "hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/10 transition-colors",
              ].join(" ")}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!collapsed ? (
                <span className="text-sm">Se déconnecter</span>
              ) : null}
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}