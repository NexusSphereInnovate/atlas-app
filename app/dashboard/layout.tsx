import type { ReactNode } from "react";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { DashboardShell } from "@/components/layout/dashboard-shell";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const profile = await getServerProfile();

  return (
    <DashboardShell
      role={profile.role}
      userId={profile.id}
      firstName={profile.first_name}
      lastName={profile.last_name}
      title="Atlas"
    >
      {children}
    </DashboardShell>
  );
}
