-- ================================================================
-- 007 — Fix trigger ticket messages + notifications tickets
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- ── 1. Fix critique : NEW.body → NEW.content ─────────────────────
--    Le trigger utilisait NEW.body mais la colonne s'appelle content
CREATE OR REPLACE FUNCTION notify_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_client_id UUID;
  v_sender_role      TEXT;
  v_ticket_org_id    UUID;
  v_ticket_id_str    TEXT;
BEGIN
  SELECT t.client_id, p.role, t.org_id
    INTO v_ticket_client_id, v_sender_role, v_ticket_org_id
    FROM public.tickets t
    JOIN public.user_profiles p ON p.id = NEW.sender_id
    WHERE t.id = NEW.ticket_id;

  v_ticket_id_str := NEW.ticket_id::TEXT;

  IF v_sender_role IN ('admin_global', 'admin_org', 'agent') THEN
    -- Admin répond → notifier le client
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    VALUES (
      v_ticket_org_id, v_ticket_client_id,
      'ticket_reply',
      'Nouveau message sur votre ticket',
      LEFT(NEW.content, 100),
      '/dashboard/tickets/' || v_ticket_id_str
    );
  ELSE
    -- Client écrit → notifier les admins
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    SELECT
      v_ticket_org_id, id,
      'ticket_message',
      'Nouveau message client',
      LEFT(NEW.content, 100),
      '/dashboard/tickets/' || v_ticket_id_str
    FROM public.user_profiles
    WHERE role IN ('admin_global', 'admin_org')
      AND (org_id = v_ticket_org_id OR role = 'admin_global');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger (au cas où il aurait été désactivé à cause de l'erreur)
DROP TRIGGER IF EXISTS trg_notify_ticket_message ON public.ticket_messages;
CREATE TRIGGER trg_notify_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION notify_ticket_message();

-- ── 2. Trigger : notifier les admins quand un nouveau ticket est créé
CREATE OR REPLACE FUNCTION notify_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  SELECT
    NEW.org_id, id,
    'ticket_created',
    'Nouveau ticket support',
    'Objet : ' || NEW.subject,
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

-- ── 3. Trigger : notifier le client du changement de statut ticket ─
CREATE OR REPLACE FUNCTION notify_ticket_status()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'in_progress' THEN
      v_title := 'Ticket pris en charge';
      v_body  := 'Votre ticket est maintenant traité par notre équipe';
    WHEN 'resolved' THEN
      v_title := 'Ticket résolu ✓';
      v_body  := 'Votre ticket a été marqué comme résolu';
    WHEN 'closed' THEN
      v_title := 'Ticket fermé';
      v_body  := 'Votre ticket a été fermé';
    WHEN 'open' THEN
      v_title := 'Ticket rouvert';
      v_body  := 'Votre ticket a été rouvert';
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
