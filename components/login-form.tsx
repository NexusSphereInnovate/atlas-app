"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-white/8"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-white/50">Mot de passe</label>
          <Link href="/auth/forgot-password" className="text-xs text-white/35 transition-colors hover:text-white/70">
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-white/8"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-[#0f1117] transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Spinner size="sm" className="border-[#0f1117]/20 border-t-[#0f1117]" /> : null}
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
