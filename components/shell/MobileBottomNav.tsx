"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export default function MobileBottomNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-white/[0.06] backdrop-blur-xl">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-1 px-2 py-2">
          {nav.slice(0, 4).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2",
                  active ? "bg-white/10" : "hover:bg-white/5",
                ].join(" ")}
              >
                <span className={active ? "text-white" : "text-white/70"}>{item.icon}</span>
                <span className={active ? "text-[11px] text-white" : "text-[11px] text-white/55"}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}