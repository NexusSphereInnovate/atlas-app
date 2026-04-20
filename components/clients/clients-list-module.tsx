"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronRight, MessageCircle, Users, Eye, EyeOff } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { getFullName, getInitials } from "@/types/profile";
import type { UserProfile } from "@/types/profile";

interface Client {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  assigned_agent_id: string | null;
}

interface ClientsListModuleProps {
  profile: UserProfile;
}

export function ClientsListModule({ profile }: ClientsListModuleProps) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Direct create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ firstName: "", lastName: "", email: "", password: "", phone: "" });
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";

  async function load() {
    const supabase = createClient();
    let query = supabase
      .from("user_profiles")
      .select("id, first_name, last_name, email, phone, is_active, created_at, assigned_agent_id")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("assigned_agent_id", profile.id);
    }

    const { data } = await query;
    setClients(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [profile.id, isAdmin]);

  const filtered = clients.filter((c) => {
    const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.toLowerCase();
    const email = (c.email ?? "").toLowerCase();
    const s = search.toLowerCase();
    return !s || name.includes(s) || email.includes(s);
  });

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
      body: JSON.stringify({ ...createForm, role: "client" }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      toast("error", data.error ?? "Erreur");
    } else {
      toast("success", "Client créé avec succès !");
      setCreateOpen(false);
      setCreateForm({ firstName: "", lastName: "", email: "", password: "", phone: "" });
      load();
    }
    setCreating(false);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Clients</h2>
          <p className="mt-1 text-sm text-white/40">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Créer directement
          </button>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client…"
          className="h-10 w-full rounded-xl border border-white/10 bg-[#16161c] pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30 sm:max-w-xs"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-18 animate-pulse rounded-2xl border border-white/5 bg-white/3" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-white/3 py-16 text-center">
          <Users className="h-10 w-10 text-white/15" />
          <p className="text-sm text-white/40">
            {search ? "Aucun client trouvé" : "Aucun client pour l'instant"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          <ul className="divide-y divide-white/5">
            {filtered.map((c) => (
              <li key={c.id} className="group flex items-center justify-between bg-white/2 px-5 py-4 transition-colors hover:bg-white/5">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar
                    initials={getInitials({ first_name: c.first_name, last_name: c.last_name })}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {getFullName({ first_name: c.first_name, last_name: c.last_name })}
                    </p>
                    <p className="truncate text-sm text-white/40">{c.email ?? "—"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-4">
                  <span className={cn(
                    "hidden rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:inline-block",
                    c.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-white/30"
                  )}>
                    {c.is_active ? "Actif" : "Inactif"}
                  </span>
                  <span className="hidden text-xs text-white/25 sm:block">{formatDate(c.created_at)}</span>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400 transition-colors hover:bg-emerald-500/25"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <Link
                    href={`/dashboard/clients/${c.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/6 text-white/35 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create Direct Modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateForm({ firstName: "", lastName: "", email: "", password: "", phone: "" }); }}
        title="Créer un client"
        description="Créez directement un compte client avec email et mot de passe."
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
              placeholder="client@exemple.com"
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
            {creating ? "Création…" : "Créer le client"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
