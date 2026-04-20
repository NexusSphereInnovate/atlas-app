"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
            <Image src="/logo.svg" alt="Atlas" width={22} height={22} />
          </div>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
              <Mail className="h-7 w-7 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Email envoyé</h1>
            <p className="mt-3 text-sm text-white/40 leading-relaxed">
              Un lien de réinitialisation a été envoyé à{" "}
              <span className="text-white/70">{email}</span>.
              Vérifiez votre dossier spam si nécessaire.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-6 text-sm text-white/40 transition-colors hover:text-white/70"
            >
              Renvoyer un email
            </button>
            <div className="mt-4">
              <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">Mot de passe oublié</h1>
              <p className="mt-2 text-sm text-white/40">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/50">
                  Adresse email
                </label>
                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-white/8"
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
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="flex items-center justify-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
