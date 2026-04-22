-- ================================================================
-- 011 — Fix RLS : permettre aux clients de signer leurs contrats
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- S'assurer que RLS est activé sur la table
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques si elles existent déjà (pour ré-exécution idempotente)
DROP POLICY IF EXISTS "clients_can_sign_own_contracts" ON public.contracts;
DROP POLICY IF EXISTS "clients_can_read_own_contracts" ON public.contracts;
DROP POLICY IF EXISTS "admins_can_insert_contracts" ON public.contracts;
DROP POLICY IF EXISTS "admins_can_update_contracts" ON public.contracts;
DROP POLICY IF EXISTS "agents_can_read_contracts" ON public.contracts;
DROP POLICY IF EXISTS "admins_can_read_contracts" ON public.contracts;

-- Politique SELECT : le client peut lire ses propres contrats
-- les agents/admins peuvent lire tous les contrats
CREATE POLICY "clients_can_read_own_contracts"
  ON public.contracts
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin_global', 'admin_org', 'agent')
    )
  );

-- Politique INSERT : seuls les admins/agents peuvent créer des contrats
CREATE POLICY "admins_can_insert_contracts"
  ON public.contracts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin_global', 'admin_org', 'agent')
    )
  );

-- Politique UPDATE : le client peut signer son propre contrat
-- (passer status → "signed", enregistrer signed_at / signed_by)
CREATE POLICY "clients_can_sign_own_contracts"
  ON public.contracts
  FOR UPDATE
  TO authenticated
  USING  (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Politique UPDATE admin : les admins/agents peuvent tout modifier
CREATE POLICY "admins_can_update_contracts"
  ON public.contracts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin_global', 'admin_org', 'agent')
    )
  );
