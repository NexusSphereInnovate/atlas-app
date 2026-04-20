"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Image src="/logo.svg" alt="Atlas" width={22} height={22} />
          </div>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Mot de passe mis à jour</h1>
            <p className="mt-3 text-sm text-white/40">Vous allez être redirigé vers votre espace…</p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">Nouveau mot de passe</h1>
              <p className="mt-2 text-sm text-white/40">
                Choisissez un mot de passe sécurisé (8 caractères minimum).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30"
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

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-[#0f1117] transition-all hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner size="sm" className="border-[#0f1117]/20 border-t-[#0f1117]" /> : null}
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
