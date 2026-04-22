-- ================================================================
-- 015 — CORRECTIF CRITIQUE : remettre search_path = public
-- La migration 013 avait mis search_path = '' (vide), ce qui casse
-- toutes les fonctions utilisant des noms de tables non qualifiés
-- (ex: INSERT INTO user_profiles au lieu de public.user_profiles).
-- Ce correctif remet search_path = public sur toutes les fonctions.
-- À EXÉCUTER EN PRIORITÉ dans Supabase SQL Editor
-- ================================================================

ALTER FUNCTION public.handle_new_user()                  SET search_path = public;
ALTER FUNCTION public.generate_invoice_number()          SET search_path = public;
ALTER FUNCTION public.create_commission_on_payment()     SET search_path = public;
ALTER FUNCTION public.set_updated_at()                   SET search_path = public;
ALTER FUNCTION public.auth_org_id()                      SET search_path = public;
ALTER FUNCTION public.is_admin()                         SET search_path = public;
ALTER FUNCTION public.auth_role()                        SET search_path = public;
ALTER FUNCTION public.is_agent_of(uuid)                  SET search_path = public;
ALTER FUNCTION public.update_tickets_updated_at()        SET search_path = public;
ALTER FUNCTION public.handle_invoice_paid()              SET search_path = public;
ALTER FUNCTION public.update_services_updated_at()       SET search_path = public;
ALTER FUNCTION public.notify_invoice_created()           SET search_path = public;
ALTER FUNCTION public.notify_invoice_status()            SET search_path = public;
ALTER FUNCTION public.notify_contract_status()           SET search_path = public;
ALTER FUNCTION public.notify_request_status()            SET search_path = public;
ALTER FUNCTION public.notify_ticket_message()            SET search_path = public;
ALTER FUNCTION public.notify_company_created()           SET search_path = public;
ALTER FUNCTION public.notify_ticket_created()            SET search_path = public;
ALTER FUNCTION public.notify_service_request_created()   SET search_path = public;
ALTER FUNCTION public.notify_service_request_updated()   SET search_path = public;
ALTER FUNCTION public.notify_bank_account_status()       SET search_path = public;
ALTER FUNCTION public.notify_bank_account_created()      SET search_path = public;
ALTER FUNCTION public.notify_ticket_status()             SET search_path = public;

-- Vérification — doit retourner 0 ligne si tout est corrigé :
SELECT p.proname, n.nspname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path%'
  ))
ORDER BY p.proname;
