"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
    >
      <LogOut className="h-4 w-4" />
      Se déconnecter
    </button>
  );
}

export default LogoutButton;
