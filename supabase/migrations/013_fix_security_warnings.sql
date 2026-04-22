-- ================================================================
-- 013 — Corriger les warnings de sécurité Supabase
-- À EXÉCUTER dans Supabase SQL Editor
-- Corrige : function_search_path_mutable (toutes les fonctions)
--           rls_policy_always_true (notifications_insert)
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. FUNCTION SEARCH PATH — Fixer toutes les fonctions publiques
--    La vulnérabilité : un attaquant peut manipuler search_path
--    pour substituer des fonctions/tables avant exécution.
--    Fix : SET search_path = '' force les noms qualifiés complets.
-- ────────────────────────────────────────────────────────────────

ALTER FUNCTION public.handle_new_user()                  SET search_path = '';
ALTER FUNCTION public.generate_invoice_number()          SET search_path = '';
ALTER FUNCTION public.create_commission_on_payment()     SET search_path = '';
ALTER FUNCTION public.set_updated_at()                   SET search_path = '';
ALTER FUNCTION public.auth_org_id()                      SET search_path = '';
ALTER FUNCTION public.is_admin()                         SET search_path = '';
ALTER FUNCTION public.auth_role()                        SET search_path = '';
ALTER FUNCTION public.is_agent_of(uuid)                  SET search_path = '';
ALTER FUNCTION public.update_tickets_updated_at()        SET search_path = '';
ALTER FUNCTION public.handle_invoice_paid()              SET search_path = '';
ALTER FUNCTION public.update_services_updated_at()       SET search_path = '';
ALTER FUNCTION public.notify_invoice_created()           SET search_path = '';
ALTER FUNCTION public.notify_invoice_status()            SET search_path = '';
ALTER FUNCTION public.notify_contract_status()           SET search_path = '';
ALTER FUNCTION public.notify_request_status()            SET search_path = '';
ALTER FUNCTION public.notify_ticket_message()            SET search_path = '';
ALTER FUNCTION public.notify_company_created()           SET search_path = '';
ALTER FUNCTION public.notify_ticket_created()            SET search_path = '';
ALTER FUNCTION public.notify_service_request_created()   SET search_path = '';
ALTER FUNCTION public.notify_service_request_updated()   SET search_path = '';
ALTER FUNCTION public.notify_bank_account_status()       SET search_path = '';
ALTER FUNCTION public.notify_bank_account_created()      SET search_path = '';
ALTER FUNCTION public.notify_ticket_status()             SET search_path = '';

-- ────────────────────────────────────────────────────────────────
-- 2. RLS POLICY ALWAYS TRUE — notifications_insert
--    La politique actuelle : WITH CHECK (true) → n'importe quel
--    utilisateur authentifié peut insérer n'importe quelle notif.
--    Fix : seul le système (service_role) ou l'utilisateur lui-même
--    peut créer des notifications pour son propre user_id.
-- ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_insert"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Autoriser si la notif est destinée à l'utilisateur lui-même
    -- ou si elle est créée par le système (user_id peut être null dans certains cas)
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('admin_global', 'admin_org')
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 3. EXTENSION IN PUBLIC (pg_trgm)
--    Note : déplacer pg_trgm vers le schema extensions peut casser
--    des index/fonctions existants. Cette migration ne le déplace
--    PAS pour éviter toute régression.
--    → Pour supprimer ce warning manuellement :
--      1. Allez dans Supabase Dashboard > Database > Extensions
--      2. Désactivez pg_trgm puis réactivez-le dans le schema "extensions"
--    OU acceptez ce warning (faible risque si pg_trgm est en lecture seule).
-- ────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────
-- 4. LEAKED PASSWORD PROTECTION
--    Ce paramètre ne peut pas être activé via SQL.
--    → Allez dans : Supabase Dashboard
--      Authentication > Sign In / Up > Password Security
--      Activez "Leaked password protection (HaveIBeenPwned)"
-- ────────────────────────────────────────────────────────────────

-- Vérification : afficher les fonctions encore non corrigées
SELECT
  p.proname AS function_name,
  n.nspname AS schema
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proconfig IS NULL
  AND p.prokind = 'f'
ORDER BY p.proname;
-- Si cette requête retourne des lignes, ces fonctions ont encore
-- un search_path mutable (peut-être des fonctions non listées ci-dessus).
