"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/lib/contexts/sidebar-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import type { UserRole } from "@/types/database";

interface ClientLayoutProps {
  children: ReactNode;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  title: string;
}

export function ClientLayout({
  children,
  role,
  firstName,
  lastName,
  title,
}: ClientLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <>
      <Sidebar role={role} firstName={firstName} lastName={lastName} />

      <div
        className={cn(
          "flex flex-col transition-all duration-300",
          collapsed ? "md:ml-16" : "md:ml-60"
        )}
      >
        <Header
          title={title}
          role={role}
          firstName={firstName}
          lastName={lastName}
        />
        <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav role={role} />
    </>
  );
}
