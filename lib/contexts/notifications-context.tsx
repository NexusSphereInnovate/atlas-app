"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationsProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) return;
    const sb = createClient();

    // Initial fetch
    sb.from("notifications")
      .select("id, type, title, body, link, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data }) => setNotifications((data ?? []) as AppNotification[]));

    // Realtime — new notifications
    const channel = sb
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id
                ? { ...n, ...(payload.new as AppNotification) }
                : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    const sb = createClient();
    await sb.from("notifications").update({ is_read: true }).eq("id", id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const sb = createClient();
    const ids = notifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    if (ids.length === 0) return;
    await sb.from("notifications").update({ is_read: true }).in("id", ids);
  }, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);
