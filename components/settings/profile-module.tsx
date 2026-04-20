"use client";

import { useEffect, useState } from "react";
import { User, MapPin, Shield, Save, Eye, EyeOff, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/avatar";
import { getInitials } from "@/types/profile";
import type { UserProfile } from "@/types/profile";

interface ProfileModuleProps {
  profile: UserProfile;
}

export function ProfileModule({ profile }: ProfileModuleProps) {
  const { toast } = useToast();

  // ── Informations personnelles ────────────────────────────────
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Email ────────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState(profile.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);

  // ── Adresse de facturation ───────────────────────────────────
  const [billing, setBilling] = useState({
    address: "",
    city: "",
    postal_code: "",
    country: "CH",
  });
  const [savingBilling, setSavingBilling] = useState(false);

  // ── Mot de passe ─────────────────────────────────────────────
  const [pwd, setPwd] = useState({ new: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      const supabase = createClient();
      const { data } = await supabase
        .from("user_profiles")
        .select("billing_address, billing_city, billing_postal_code, billing_country, phone")
        .eq("id", profile.id)
        .single();
      if (data) {
        setPhone(data.phone ?? "");
        setBilling({
          address:     data.billing_address     ?? "",
          city:        data.billing_city         ?? "",
          postal_code: data.billing_postal_code  ?? "",
          country:     data.billing_country      ?? "CH",
        });
      }
    }
    loadBilling();
  }, [profile.id]);

  // ── Save phone ───────────────────────────────────────────────
  async function saveInfo() {
    setSavingInfo(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({ phone: phone || null })
      .eq("id", profile.id);
    if (error) toast("error", error.message);
    else toast("success", "Téléphone mis à jour");
    setSavingInfo(false);
  }

  // ── Save email (sends confirmation) ─────────────────────────
  async function saveEmail() {
    if (!newEmail || newEmail === profile.email) return;
    setSavingEmail(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast("error", error.message);
    else toast("success", "Email de confirmation envoyé. Vérifiez votre boîte mail.");
    setSavingEmail(false);
  }

  // ── Save billing address ─────────────────────────────────────
  async function saveBilling() {
    setSavingBilling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("user_profiles")
      .update({
        billing_address:     billing.address     || null,
        billing_city:        billing.city         || null,
        billing_postal_code: billing.postal_code  || null,
        billing_country:     billing.country      || null,
      })
      .eq("id", profile.id);
    if (error) toast("error", error.message);
    else toast("success", "Adresse de facturation mise à jour");
    setSavingBilling(false);
  }

  // ── Change password ──────────────────────────────────────────
  async function savePassword() {
    if (!pwd.new) return;
    if (pwd.new.length < 8) {
      toast("error", "Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (pwd.new !== pwd.confirm) {
      toast("error", "Les mots de passe ne correspondent pas");
      return;
    }
    setSavingPwd(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwd.new });
    if (error) toast("error", error.message);
    else {
      toast("success", "Mot de passe modifié avec succès");
      setPwd({ new: "", confirm: "" });
    }
    setSavingPwd(false);
  }

  const setBillingField = (key: keyof typeof billing) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBilling((b) => ({ ...b, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar
          initials={getInitials({ first_name: profile.first_name, last_name: profile.last_name })}
          size="lg"
        />
        <div>
          <h2 className="text-xl font-semibold text-white">
            {profile.first_name} {profile.last_name}
          </h2>
          <p className="mt-0.5 text-sm capitalize text-white/40">
            {profile.role?.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {/* ── Informations personnelles ─────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Informations personnelles</p>
        </div>

        {/* Prénom + Nom (lecture seule) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Prénom</label>
            <input
              disabled
              value={profile.first_name ?? ""}
              className="w-full cursor-not-allowed rounded-xl border border-white/6 bg-white/4 px-4 py-2.5 text-sm text-white/40 outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Nom</label>
            <input
              disabled
              value={profile.last_name ?? ""}
              className="w-full cursor-not-allowed rounded-xl border border-white/6 bg-white/4 px-4 py-2.5 text-sm text-white/40 outline-none"
            />
          </div>
        </div>
        <p className="text-xs text-white/25">Le prénom et le nom ne peuvent pas être modifiés. Contactez le support si nécessaire.</p>

        {/* Téléphone */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">
            <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />Téléphone</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+41 79 000 00 00"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>

        <button
          onClick={saveInfo}
          disabled={savingInfo}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {savingInfo ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          {savingInfo ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

      {/* ── Email ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Adresse email</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Nouvel email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
          <p className="mt-1.5 text-xs text-white/30">
            Un email de confirmation sera envoyé à la nouvelle adresse. Votre email actuel reste actif jusqu&apos;à confirmation.
          </p>
        </div>
        <button
          onClick={saveEmail}
          disabled={savingEmail || !newEmail || newEmail === profile.email}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {savingEmail ? <Spinner size="sm" /> : <Mail className="h-4 w-4" />}
          {savingEmail ? "Envoi…" : "Changer l'email"}
        </button>
      </div>

      {/* ── Adresse de facturation ────────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Adresse de facturation</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Rue et numéro</label>
          <input
            type="text"
            value={billing.address}
            onChange={setBillingField("address")}
            placeholder="12 rue de la Paix"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Code postal</label>
            <input
              type="text"
              value={billing.postal_code}
              onChange={setBillingField("postal_code")}
              placeholder="1200"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Ville</label>
            <input
              type="text"
              value={billing.city}
              onChange={setBillingField("city")}
              placeholder="Genève"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Pays</label>
          <select
            value={billing.country}
            onChange={setBillingField("country")}
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="CH">🇨🇭 Suisse</option>
            <option value="FR">🇫🇷 France</option>
            <option value="BE">🇧🇪 Belgique</option>
            <option value="LU">🇱🇺 Luxembourg</option>
            <option value="GB">🇬🇧 Royaume-Uni</option>
            <option value="DE">🇩🇪 Allemagne</option>
            <option value="IT">🇮🇹 Italie</option>
            <option value="ES">🇪🇸 Espagne</option>
            <option value="PT">🇵🇹 Portugal</option>
            <option value="NL">🇳🇱 Pays-Bas</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>

        <button
          onClick={saveBilling}
          disabled={savingBilling}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {savingBilling ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          {savingBilling ? "Sauvegarde…" : "Sauvegarder l'adresse"}
        </button>
      </div>

      {/* ── Sécurité / Mot de passe ───────────────────────────── */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Sécurité</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">Nouveau mot de passe <span className="text-white/25">(8 caractères min.)</span></label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={pwd.new}
              onChange={(e) => setPwd((p) => ({ ...p, new: e.target.value }))}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 pr-11 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
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
          <label className="mb-1.5 block text-xs font-medium text-white/50">Confirmer le mot de passe</label>
          <input
            type={showPwd ? "text" : "password"}
            value={pwd.confirm}
            onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
          {pwd.confirm && pwd.new !== pwd.confirm && (
            <p className="mt-1.5 text-xs text-red-400">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        <button
          onClick={savePassword}
          disabled={savingPwd || !pwd.new || pwd.new !== pwd.confirm}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {savingPwd ? <Spinner size="sm" /> : <Shield className="h-4 w-4" />}
          {savingPwd ? "Modification…" : "Modifier le mot de passe"}
        </button>
      </div>
    </div>
  );
}
