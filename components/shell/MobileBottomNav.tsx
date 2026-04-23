"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export default function MobileBottomNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  // Max 4 nav items + logout = 5 cols
  const visibleNav = nav.slice(0, 4);
  const cols = visibleNav.length + 1; // +1 for logout

  return (
    <div className="md:hidden">
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-white/[0.06] backdrop-blur-xl">
        <div
          className="mx-auto max-w-xl gap-1 px-2 py-2"
          style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2",
                  active ? "bg-white/10" : "hover:bg-white/5",
                ].join(" ")}
              >
                <span className={active ? "text-white" : "text-white/70"}>{item.icon}</span>
                <span className={active ? "text-[10px] text-white" : "text-[10px] text-white/55"}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px]">Sortir</span>
          </button>
        </div>
      </div>
    </div>
  );
}