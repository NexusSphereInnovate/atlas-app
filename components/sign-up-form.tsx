"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const prefillEmail = searchParams.get("email") ?? "";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: prefillEmail,
    password: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          invitation_token: token,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Prénom</label>
          <input
            required
            value={form.firstName}
            onChange={set("firstName")}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Nom</label>
          <input
            required
            value={form.lastName}
            onChange={set("lastName")}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-white/8"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={set("email")}
          placeholder="votre@email.com"
          className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all focus:border-white/30 focus:bg-white/8"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-white/50">Mot de passe</label>
        <div className="relative">
          <input
            type={showPwd ? "text" : "password"}
            required
            minLength={8}
            placeholder="8 caractères minimum"
            value={form.password}
            onChange={set("password")}
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
        {loading ? "Création du compte…" : "Créer mon compte"}
      </button>
    </form>
  );
}
