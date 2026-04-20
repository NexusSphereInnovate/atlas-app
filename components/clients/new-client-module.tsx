"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Link as LinkIcon, Copy, Check } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";

interface NewClientModuleProps {
  profile: UserProfile;
}

export function NewClientModule({ profile }: NewClientModuleProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { data: invitation, error } = await supabase
      .from("invitations")
      .insert({
        org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
        email: form.email,
        role: "client",
        invited_by: profile.id,
        agent_id: profile.id,
      })
      .select("token")
      .single();

    if (error || !invitation) {
      toast("error", `Erreur : ${error?.message ?? "Impossible de créer l'invitation"}`);
      setLoading(false);
      return;
    }

    const link = `${window.location.origin}/auth/sign-up?token=${invitation.token}&email=${encodeURIComponent(form.email)}`;
    setInviteLink(link);
    toast("success", "Invitation créée avec succès");
    setLoading(false);
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (inviteLink) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
          <ArrowLeft className="h-3.5 w-3.5" />
          Clients
        </Link>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15">
            <UserPlus className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Invitation créée !</h3>
          <p className="mt-2 text-sm text-white/50">
            Partagez ce lien avec <strong className="text-white">{form.firstName} {form.lastName}</strong> pour qu&apos;il crée son compte.
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
          <div className="mb-3 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-white/30" />
            <p className="text-sm font-medium text-white">Lien d&apos;invitation</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 p-3">
            <p className="flex-1 truncate text-xs text-white/50">{inviteLink}</p>
            <button
              onClick={copyLink}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/50 transition-colors hover:bg-white/12 hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-white/30">Ce lien est valable 7 jours.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setInviteLink(null); setForm({ firstName: "", lastName: "", email: "", phone: "" }); }}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/50 transition-colors hover:bg-white/6 hover:text-white"
          >
            Inviter un autre client
          </button>
          <Link
            href="/dashboard/clients"
            className="flex-1 rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Voir mes clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      <div>
        <h2 className="text-xl font-semibold text-white">Nouveau client</h2>
        <p className="mt-1 text-sm text-white/40">
          Un lien d&apos;invitation sera généré pour que le client crée son compte.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/8 bg-white/3 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">Prénom *</label>
            <input
              required
              value={form.firstName}
              onChange={set("firstName")}
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/60">Nom *</label>
            <input
              required
              value={form.lastName}
              onChange={set("lastName")}
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">Email *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="client@exemple.com"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/60">Téléphone (WhatsApp)</label>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+33 6 12 34 56 78"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? <Spinner size="sm" /> : <UserPlus className="h-4 w-4" />}
          {loading ? "Création…" : "Créer et générer l'invitation"}
        </button>
      </form>
    </div>
  );
}
