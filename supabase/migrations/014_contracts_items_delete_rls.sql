-- ================================================================
-- 014 — Contrats : colonnes items/total + politique DELETE
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- Ajouter les colonnes pour les prestations contractualisées
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS items            jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_amount     numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_currency text    DEFAULT 'CHF',
  ADD COLUMN IF NOT EXISTS client_referral_rate numeric DEFAULT 5;

-- Politique DELETE : seuls les admins peuvent supprimer des contrats
-- (le bug "contrat supprimé mais reste dans la liste" était causé par
--  l'absence de cette politique — la suppression était silencieusement bloquée)
DROP POLICY IF EXISTS "admins_can_delete_contracts" ON public.contracts;

CREATE POLICY "admins_can_delete_contracts"
  ON public.contracts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin_global', 'admin_org')
    )
  );
