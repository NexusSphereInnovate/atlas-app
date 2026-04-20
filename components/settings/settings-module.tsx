"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Users, Globe, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import type { UserProfile } from "@/types/profile";

interface SettingsModuleProps {
  profile: UserProfile;
}

export function SettingsModule({ profile }: SettingsModuleProps) {
  const { toast } = useToast();
  const [cgvContent, setCgvContent] = useState("");
  const [cgvVersion, setCgvVersion] = useState("v1.0");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("org_settings")
        .select("cgv_content, cgv_current_version")
        .eq("org_id", profile.org_id ?? "00000000-0000-0000-0000-000000000001")
        .single();

      if (data) {
        setCgvContent(data.cgv_content ?? "");
        setCgvVersion(data.cgv_current_version ?? "v1.0");
      }
      setLoading(false);
    }
    load();
  }, [profile.org_id]);

  async function saveCgv() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("org_settings")
      .update({ cgv_content: cgvContent, cgv_current_version: cgvVersion })
      .eq("org_id", profile.org_id ?? "00000000-0000-0000-0000-000000000001");

    if (error) {
      toast("error", `Erreur : ${error.message}`);
    } else {
      toast("success", "Paramètres sauvegardés");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Paramètres</h2>
        <p className="mt-1 text-sm text-white/40">Configuration de la plateforme Atlas</p>
      </div>

      {/* Organisation */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Organisation</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">Nom</span>
            <span className="text-sm font-medium text-white">Atlas Incorporate</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">ID</span>
            <span className="font-mono text-xs text-white/30">00000000-0000-0000-0000-000000000001</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">Administrateur</span>
            <span className="text-sm font-medium text-white">{profile.first_name} {profile.last_name}</span>
          </div>
        </div>
      </div>

      {/* CGV */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Conditions Générales de Vente</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Version actuelle</label>
              <input
                value={cgvVersion}
                onChange={(e) => setCgvVersion(e.target.value)}
                placeholder="v1.0"
                className="w-40 rounded-xl border border-white/10 bg-[#16161c] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">Texte des CGV</label>
              <textarea
                value={cgvContent}
                onChange={(e) => setCgvContent(e.target.value)}
                rows={12}
                placeholder="Entrez le texte complet de vos conditions générales de vente..."
                className="w-full resize-none rounded-xl border border-white/10 bg-[#16161c] px-4 py-3 text-sm text-white outline-none focus:border-white/30 placeholder:text-white/20 font-mono"
              />
            </div>
            <button
              onClick={saveCgv}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
              {saving ? "Sauvegarde…" : "Sauvegarder les CGV"}
            </button>
          </div>
        )}
      </div>

      {/* Agents */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-white/30" />
          <p className="text-sm font-semibold text-white">Paliers & Commissions</p>
        </div>
        <p className="text-sm text-white/40">
          Gérez les paliers agents et les règles de commission depuis la page{" "}
          <a href="/dashboard/atlas-circle" className="text-blue-400 transition-colors hover:text-blue-300">
            Atlas Circle
          </a>.
        </p>
      </div>
    </div>
  );
}
