"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MessageCircle, FileText, Building2,
  Receipt, Mail, Phone, Calendar, UserCheck, UserX,
  Trash2, MailCheck,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { getFullName, getInitials } from "@/types/profile";
import type { UserProfile } from "@/types/profile";

interface ClientDetailModuleProps {
  client: UserProfile;
  profile: UserProfile;
}

export function ClientDetailModule({ client, profile }: ClientDetailModuleProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isActive, setIsActive] = useState(client.is_active);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isAdmin = profile.role === "admin_global" || profile.role === "admin_org";

  async function toggleActive() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({ is_active: !isActive })
      .eq("id", client.id);

    if (error) {
      toast("error", `Erreur : ${error.message}`);
    } else {
      setIsActive((v) => !v);
      toast("success", `Compte ${!isActive ? "activé" : "désactivé"}`);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement ${getFullName(client)} ? Cette action est irréversible.`)) return;
    setDeleting(true);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: client.id }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      toast("error", data.error ?? "Erreur lors de la suppression");
    } else {
      toast("success", "Client supprimé");
      router.push("/dashboard/clients");
    }
    setDeleting(false);
  }

  async function handleConfirmEmail() {
    setConfirming(true);
    const res = await fetch("/api/admin/confirm-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: client.id }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      toast("error", data.error ?? "Erreur lors de la confirmation");
    } else {
      toast("success", "Email confirmé ✓");
    }
    setConfirming(false);
  }

  const quickLinks = [
    { label: "Documents", icon: FileText, href: `/dashboard/documents?client=${client.id}` },
    { label: "Créations société", icon: Building2, href: `/dashboard/company-requests?client=${client.id}` },
    { label: "Factures", icon: Receipt, href: `/dashboard/invoices?client=${client.id}` },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      {/* Profile Card */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              initials={getInitials({ first_name: client.first_name, last_name: client.last_name })}
              size="lg"
            />
            <div>
              <h2 className="text-xl font-semibold text-white">
                {getFullName({ first_name: client.first_name, last_name: client.last_name })}
              </h2>
              <span className={cn(
                "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-white/40"
              )}>
                {isActive ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {client.phone && (
              <a
                href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={handleConfirmEmail}
                  disabled={confirming}
                  className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                  title="Confirmer l'email manuellement"
                >
                  {confirming ? <Spinner size="sm" /> : <MailCheck className="h-4 w-4" />}
                  <span className="hidden sm:inline">Confirmer email</span>
                </button>
                <button
                  onClick={toggleActive}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                    isActive
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                >
                  {saving ? <Spinner size="sm" /> : isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isActive ? "Désactiver" : "Activer"}</span>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                  <span className="hidden sm:inline">Supprimer</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-white/8 pt-5 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={client.email} />
          <InfoRow icon={Phone} label="Téléphone" value={client.phone} />
          <InfoRow icon={Calendar} label="Membre depuis" value={formatDate(client.created_at)} />
          <InfoRow icon={UserCheck} label="Rôle" value={client.role} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/3 p-4 text-center transition-all hover:border-white/15 hover:bg-white/5"
            >
              <Icon className="h-5 w-5 text-white/40" />
              <span className="text-xs font-medium text-white/60">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-white/25" />
      <div>
        <p className="text-[11px] text-white/35">{label}</p>
        <p className="text-sm font-medium text-white">{value || "—"}</p>
      </div>
    </div>
  );
}
