"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users, ChevronRight, MessageCircle, UserPlus, Copy, Check, Eye, EyeOff } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getFullName, getInitials } from "@/types/profile";
import type { UserProfile } from "@/types/profile";

interface Agent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface AgentsListModuleProps {
  profile: UserProfile;
}

export function AgentsListModule({ profile }: AgentsListModuleProps) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Direct create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, email, phone, is_active, created_at")
      .eq("role", "agent")
      .order("created_at", { ascending: false });
    setAgents(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite() {
    if (!inviteEmail) return;
    setInviting(true);
    const supabase = createClient();

    const { data: inv, error } = await supabase
      .from("invitations")
      .insert({
        org_id: profile.org_id ?? "00000000-0000-0000-0000-000000000001",
        email: inviteEmail,
        role: "agent",
        invited_by: profile.id,
      })
      .select("token")
      .single();

    if (error || !inv) {
      toast("error", `Erreur : ${error?.message ?? "Impossible de créer l'invitation"}`);
      setInviting(false);
      return;
    }

    const link = `${window.location.origin}/auth/sign-up?token=${inv.token}&email=${encodeURIComponent(inviteEmail)}`;
    setInviteLink(link);
    setInviting(false);
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreate() {
    if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) return;
    if (createForm.password.length < 8) {
      toast("error", "Mot de passe : 8 caractères minimum");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...createForm, role: "agent" }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      toast("error", data.error ?? "Erreur");
    } else {
      toast("success", "Agent créé avec succès !");
      setCreateOpen(false);
      setCreateForm({ firstName: "", lastName: "", email: "", password: "", phone: "" });
      load();
    }
    setCreating(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Agents</h2>
          <p className="mt-1 text-sm text-white/40">{agents.length} agent{agents.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Créer directement
          </button>
          <button
            onClick={() => { setInviteOpen(true); setInviteLink(null); setInviteEmail(""); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <UserPlus className="h-4 w-4" />
            Inviter un agent
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <Users className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/40">Aucun agent pour l&apos;instant</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <ul className="divide-y divide-white/5">
            {agents.map((a) => (
              <li key={a.id} className="flex items-center justify-between bg-white/2 px-5 py-4 transition-colors hover:bg-white/5">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar
                    initials={getInitials({ first_name: a.first_name, last_name: a.last_name })}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {getFullName({ first_name: a.first_name, last_name: a.last_name })}
                    </p>
                    <p className="truncate text-sm text-white/40">{a.email ?? "—"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-4">
                  <span className={cn(
                    "hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-block",
                    a.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-white/30"
                  )}>
                    {a.is_active ? "Actif" : "Inactif"}
                  </span>
                  <span className="hidden text-xs text-white/25 sm:block">{formatDate(a.created_at)}</span>
                  {a.phone && (
                    <a
                      href={`https://wa.me/${a.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400 transition-colors hover:bg-emerald-500/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteLink(null); }}
        title="Inviter un agent"
        description="Un lien d'invitation sera généré pour que l'agent crée son compte."
        size="sm"
      >
        {!inviteLink ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Email de l&apos;agent *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="agent@exemple.com"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {inviting ? <Spinner size="sm" /> : <UserPlus className="h-4 w-4" />}
              {inviting ? "Création…" : "Générer l'invitation"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-white/60">Lien d&apos;invitation créé. Partagez-le avec l&apos;agent.</p>
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="flex-1 truncate text-xs text-white/40">{inviteLink}</p>
              <button
                onClick={copyLink}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/50 transition-colors hover:bg-white/12 hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-xs text-white/25">Valable 7 jours.</p>
            <button
              onClick={() => { setInviteOpen(false); setInviteLink(null); }}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Fermer
            </button>
          </div>
        )}
      </Modal>

      {/* Create Direct Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm({ firstName: "", lastName: "", email: "", password: "", phone: "" }); }}
        title="Créer un agent"
        description="Créez directement un compte agent avec email et mot de passe."
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Prénom *</label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Jean"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Nom *</label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Dupont"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Email *</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="agent@exemple.com"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Mot de passe * <span className="text-white/25">(8 caractères min.)</span></label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Téléphone</label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+33 6 00 00 00 00"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {creating ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
            {creating ? "Création…" : "Créer l'agent"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
