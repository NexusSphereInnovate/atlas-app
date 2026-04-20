import type { ReactNode } from "react";
import { SidebarProvider } from "@/lib/contexts/sidebar-context";
import { NotificationsProvider } from "@/lib/contexts/notifications-context";
import { ClientLayout } from "./client-layout";
import type { UserRole } from "@/types/database";

interface DashboardShellProps {
  children: ReactNode;
  role: UserRole;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  title: string;
}

export function DashboardShell({
  children,
  role,
  userId,
  firstName,
  lastName,
  title,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <NotificationsProvider userId={userId}>
        <div className="min-h-screen bg-[#0a0a0d] text-white">
          <ClientLayout
            role={role}
            firstName={firstName}
            lastName={lastName}
            title={title}
          >
            {children}
          </ClientLayout>
        </div>
      </NotificationsProvider>
    </SidebarProvider>
  );
}
