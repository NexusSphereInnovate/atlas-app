-- ================================================================
-- 009 — Profil client : adresse de facturation + fix trigger robuste
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- ── 1. Colonnes adresse de facturation sur user_profiles ────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS billing_address      TEXT,
  ADD COLUMN IF NOT EXISTS billing_city         TEXT,
  ADD COLUMN IF NOT EXISTS billing_postal_code  TEXT,
  ADD COLUMN IF NOT EXISTS billing_country      TEXT DEFAULT 'CH';

-- ── 2. Fix handle_new_user ───────────────────────────────────────
--    Problèmes corrigés :
--    - org_id n'est plus requis (NULL par défaut, pas de FK failure)
--    - ON CONFLICT (id) DO NOTHING : pas de doublon si profil existe déjà
--    - EXCEPTION WHEN OTHERS : ne bloque JAMAIS la création d'un auth user

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  inv invitations%rowtype;
BEGIN
  -- Chercher une invitation valide pour cet email
  SELECT * INTO inv
    FROM public.invitations
   WHERE email = NEW.email
     AND accepted_at IS NULL
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  -- Insérer le profil sans dépendance org_id (NULL accepté)
  INSERT INTO public.user_profiles (
    id, email, first_name, last_name,
    org_id, role, is_active,
    assigned_agent_id, invited_by
  )
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'first_name', ''),
    coalesce(NEW.raw_user_meta_data->>'last_name', ''),
    NULL,
    CASE WHEN found THEN inv.role ELSE 'client' END,
    CASE WHEN found THEN true    ELSE false      END,
    CASE WHEN found THEN inv.agent_id   ELSE NULL END,
    CASE WHEN found THEN inv.invited_by ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Marquer l'invitation comme acceptée
  IF found THEN
    UPDATE public.invitations SET accepted_at = now() WHERE id = inv.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer la création d'un utilisateur auth
  RAISE WARNING 'handle_new_user error (ignored): %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
