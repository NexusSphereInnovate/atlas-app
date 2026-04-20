-- ================================================================
-- 008 — Notifications complètes : tickets, demandes, compte bancaire
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- ── 1. Re-appliquer le fix du trigger ticket messages ─────────────
--    (en cas de non-application de la migration 007)
CREATE OR REPLACE FUNCTION notify_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_client_id UUID;
  v_sender_role      TEXT;
  v_ticket_org_id    UUID;
  v_ticket_subject   TEXT;
BEGIN
  SELECT t.client_id, p.role, t.org_id, t.subject
    INTO v_ticket_client_id, v_sender_role, v_ticket_org_id, v_ticket_subject
    FROM public.tickets t
    JOIN public.user_profiles p ON p.id = NEW.sender_id
    WHERE t.id = NEW.ticket_id;

  IF v_sender_role IN ('admin_global', 'admin_org', 'agent') THEN
    -- Admin répond → notifier le client
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    VALUES (
      v_ticket_org_id,
      v_ticket_client_id,
      'ticket_reply',
      'Réponse à votre ticket',
      LEFT(NEW.content, 120),
      '/dashboard/tickets/' || NEW.ticket_id::TEXT
    );
  ELSE
    -- Client écrit → notifier les admins
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    SELECT
      v_ticket_org_id, id,
      'ticket_message',
      'Nouveau message — ' || COALESCE(v_ticket_subject, 'Ticket'),
      LEFT(NEW.content, 120),
      '/dashboard/tickets/' || NEW.ticket_id::TEXT
    FROM public.user_profiles
    WHERE role IN ('admin_global', 'admin_org')
      AND (org_id = v_ticket_org_id OR role = 'admin_global');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_ticket_message ON public.ticket_messages;
CREATE TRIGGER trg_notify_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION notify_ticket_message();

-- ── 2. Trigger : nouveau ticket → notifier les admins ─────────────
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Client')
    INTO v_client_name FROM public.user_profiles WHERE id = NEW.client_id;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  SELECT
    NEW.org_id, id,
    'ticket_created',
    'Nouveau ticket : ' || NEW.subject,
    'De : ' || v_client_name || ' — Priorité : ' || NEW.priority,
    '/dashboard/tickets/' || NEW.id::TEXT
  FROM public.user_profiles
  WHERE role IN ('admin_global', 'admin_org')
    AND (org_id = NEW.org_id OR role = 'admin_global');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_ticket_created ON public.tickets;
CREATE TRIGGER trg_notify_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION notify_ticket_created();

-- ── 3. Trigger : changement statut ticket → notifier le client ────
CREATE OR REPLACE FUNCTION notify_ticket_status()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'in_progress' THEN
      v_title := '🔧 Ticket pris en charge';
      v_body  := 'Votre ticket "' || NEW.subject || '" est traité par notre équipe';
    WHEN 'resolved' THEN
      v_title := '✅ Ticket résolu';
      v_body  := 'Votre ticket "' || NEW.subject || '" a été résolu';
    WHEN 'closed' THEN
      v_title := 'Ticket fermé';
      v_body  := 'Votre ticket "' || NEW.subject || '" a été fermé';
    WHEN 'open' THEN
      v_title := '🔄 Ticket rouvert';
      v_body  := 'Votre ticket "' || NEW.subject || '" a été rouvert';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (
    NEW.org_id, NEW.client_id,
    'ticket_status',
    v_title, v_body,
    '/dashboard/tickets/' || NEW.id::TEXT
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_ticket_status ON public.tickets;
CREATE TRIGGER trg_notify_ticket_status
  AFTER UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION notify_ticket_status();

-- ── 4. Trigger : nouvelle demande de service → notifier les admins ─
CREATE OR REPLACE FUNCTION notify_service_request_created()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Client')
    INTO v_client_name FROM public.user_profiles WHERE id = NEW.client_id;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  SELECT
    NEW.org_id, id,
    'service_request',
    '⚡ Nouvelle demande : ' || NEW.service_name,
    'Client : ' || v_client_name || CASE WHEN NEW.message IS NOT NULL THEN ' — ' || LEFT(NEW.message, 80) ELSE '' END,
    '/dashboard/services'
  FROM public.user_profiles
  WHERE role IN ('admin_global', 'admin_org')
    AND (org_id = NEW.org_id OR role = 'admin_global');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_request ON public.service_requests;
CREATE TRIGGER trg_notify_service_request
  AFTER INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION notify_service_request_created();

-- ── 5. Trigger : mise à jour demande service → notifier client ─────
CREATE OR REPLACE FUNCTION notify_service_request_updated()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
BEGIN
  -- Ne notifier que si status ou admin_reply a changé
  IF NEW.status = OLD.status AND NEW.admin_reply IS NOT DISTINCT FROM OLD.admin_reply THEN
    RETURN NEW;
  END IF;

  -- Définir le titre selon le nouveau statut
  CASE NEW.status
    WHEN 'reviewing' THEN
      v_title := '🔍 Demande en cours d''analyse';
      v_body  := 'Votre demande "' || NEW.service_name || '" est examinée par notre équipe';
    WHEN 'quoted' THEN
      v_title := '💰 Offre de prix reçue';
      v_body  := 'Vous avez reçu une offre pour "' || NEW.service_name || '"'
                 || CASE WHEN NEW.quoted_price IS NOT NULL
                         THEN ' — ' || NEW.quoted_price::TEXT || ' ' || COALESCE(NEW.quoted_currency, 'EUR')
                         ELSE '' END
                 || '. Connectez-vous pour l''accepter ou la refuser.';
    WHEN 'accepted' THEN
      v_title := '✅ Demande acceptée';
      v_body  := 'Votre demande "' || NEW.service_name || '" a été acceptée — les travaux vont débuter';
    WHEN 'rejected' THEN
      v_title := 'Demande refusée';
      v_body  := 'Votre demande "' || NEW.service_name || '" a été refusée'
                 || CASE WHEN NEW.admin_reply IS NOT NULL THEN ' : ' || LEFT(NEW.admin_reply, 100) ELSE '' END;
    WHEN 'completed' THEN
      v_title := '🎉 Service terminé !';
      v_body  := '"' || NEW.service_name || '" est terminé'
                 || CASE WHEN NEW.circle_value > 0 THEN ' — +' || NEW.circle_value::TEXT || ' pts Atlas Circle' ELSE '' END;
    ELSE
      IF NEW.admin_reply IS DISTINCT FROM OLD.admin_reply AND NEW.admin_reply IS NOT NULL THEN
        v_title := '💬 Réponse sur votre demande';
        v_body  := LEFT(NEW.admin_reply, 120);
      ELSE
        RETURN NEW;
      END IF;
  END CASE;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (
    NEW.org_id, NEW.client_id,
    'service_request_update',
    v_title, v_body,
    '/dashboard/services'
  );

  -- Si client accepte ou refuse → notifier les admins
  IF NEW.status IN ('accepted', 'rejected') AND OLD.status = 'quoted' THEN
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    SELECT
      NEW.org_id, id,
      'service_request_client_action',
      CASE NEW.status WHEN 'accepted' THEN '✅ Devis accepté par le client' ELSE '❌ Devis refusé par le client' END,
      '"' || NEW.service_name || '"',
      '/dashboard/services'
    FROM public.user_profiles
    WHERE role IN ('admin_global', 'admin_org')
      AND (org_id = NEW.org_id OR role = 'admin_global');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_request_updated ON public.service_requests;
CREATE TRIGGER trg_notify_service_request_updated
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION notify_service_request_updated();

-- ── 6. Trigger : changement statut compte bancaire → notifier client
CREATE OR REPLACE FUNCTION notify_bank_account_status()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'processing' THEN
      v_title := '⚙️ Compte en cours de création';
      v_body  := 'Votre compte Revolut Business est en cours de création — délai 48h';
    WHEN 'active' THEN
      v_title := '🏦 Compte bancaire activé !';
      v_body  := 'Votre compte Revolut Business est actif. Consultez l''application pour voir vos coordonnées.';
    WHEN 'rejected' THEN
      v_title := 'Demande de compte refusée';
      v_body  := 'Votre demande de compte bancaire n''a pas pu aboutir. Contactez le support.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (
    NEW.org_id, NEW.client_id,
    'bank_account_status',
    v_title, v_body,
    '/dashboard/bank-account'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_bank_account ON public.bank_account_requests;
CREATE TRIGGER trg_notify_bank_account
  AFTER UPDATE ON public.bank_account_requests
  FOR EACH ROW EXECUTE FUNCTION notify_bank_account_status();

-- ── 7. Notifier les admins d'une nouvelle demande compte bancaire ──
CREATE OR REPLACE FUNCTION notify_bank_account_created()
RETURNS TRIGGER AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Client')
    INTO v_client_name FROM public.user_profiles WHERE id = NEW.client_id;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  SELECT
    NEW.org_id, id,
    'bank_account_request',
    '🏦 Nouvelle demande compte Revolut',
    'Client : ' || v_client_name,
    '/dashboard/bank-account'
  FROM public.user_profiles
  WHERE role IN ('admin_global', 'admin_org')
    AND (org_id = NEW.org_id OR role = 'admin_global');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_bank_account_created ON public.bank_account_requests;
CREATE TRIGGER trg_notify_bank_account_created
  AFTER INSERT ON public.bank_account_requests
  FOR EACH ROW EXECUTE FUNCTION notify_bank_account_created();
