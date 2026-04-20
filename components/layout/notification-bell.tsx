"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/contexts/notifications-context";
import { useLang } from "@/lib/contexts/language-context";

const TYPE_EMOJI: Record<string, string> = {
  invoice_created:             "🧾",
  invoice_status:              "📄",
  payment_claimed:             "💳",
  contract_sent:               "📝",
  contract_signed:             "✅",
  request_status:              "🏢",
  ticket_reply:                "💬",
  ticket_message:              "💬",
  ticket_created:              "🎫",
  ticket_status:               "🔔",
  company_created:             "🏛️",
  service_request:             "⚡",
  service_request_update:      "⚡",
  service_request_client_action: "⚡",
  bank_account_status:         "🏦",
  bank_account_request:        "🏦",
};

function timeAgo(dateStr: string, lang: "fr" | "en"): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  2)  return lang === "fr" ? "À l'instant"        : "Just now";
  if (mins  < 60)  return lang === "fr" ? `Il y a ${mins} min` : `${mins}m ago`;
  if (hours < 24)  return lang === "fr" ? `Il y a ${hours}h`   : `${hours}h ago`;
  return lang === "fr" ? `Il y a ${days}j` : `${days}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/6 hover:text-white/70"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-0.5 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="absolute right-0 top-10 z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-[#141418] shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  {lang === "fr" ? "Notifications" : "Notifications"}
                </p>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] text-white/40 transition-colors hover:text-white/70"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {lang === "fr" ? "Tout lu" : "Mark all read"}
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="max-h-[400px] overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Bell className="h-7 w-7 text-white/15" />
                  <p className="text-sm text-white/30">
                    {lang === "fr"
                      ? "Aucune notification"
                      : "No notifications yet"}
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const emoji = TYPE_EMOJI[n.type] ?? "🔔";
                  const inner = (
                    <div
                      className={cn(
                        "flex cursor-pointer items-start gap-3 border-b border-white/5 px-4 py-3 transition-colors last:border-0",
                        !n.is_read
                          ? "bg-blue-500/4 hover:bg-blue-500/8"
                          : "hover:bg-white/3"
                      )}
                      onClick={() => markAsRead(n.id)}
                    >
                      <span className="mt-0.5 shrink-0 text-base leading-none">
                        {emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-xs",
                            n.is_read
                              ? "font-normal text-white/60"
                              : "font-semibold text-white"
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/40">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-white/25">
                          {timeAgo(n.created_at, lang)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                  );

                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => { markAsRead(n.id); setOpen(false); }}
                      className="block"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
