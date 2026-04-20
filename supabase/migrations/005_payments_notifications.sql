-- ================================================================
-- 005 — Paiements, Notifications, Fix RLS contrats
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- ── 1. Colonnes paiement sur invoices ────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_link         TEXT,
  ADD COLUMN IF NOT EXISTS payment_claimed_at   TIMESTAMPTZ;

-- ── 2. Nouveau statut invoice : payment_claimed ───────────────────
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'payment_claimed' AFTER 'sent';

-- ── 3. Fix RLS contracts (signature client) ───────────────────────
DROP POLICY IF EXISTS "contracts_update" ON public.contracts;
CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
    OR (client_id = auth.uid() AND status = 'sent')
  );

-- ── 4. Table notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- ── 5. Trigger : notifier client à la création d'une facture ─────
CREATE OR REPLACE FUNCTION notify_invoice_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (
    NEW.org_id,
    NEW.client_id,
    'invoice_created',
    'Nouvelle facture reçue',
    'Une nouvelle facture a été émise pour vous',
    '/dashboard/invoices'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_invoice_created ON public.invoices;
CREATE TRIGGER trg_notify_invoice_created
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION notify_invoice_created();

-- ── 6. Trigger : notifier sur changement statut facture ──────────
CREATE OR REPLACE FUNCTION notify_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- Notifier le client
  IF NEW.status = 'payment_claimed' THEN
    -- Le client déclare le paiement → notifier les admins
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    SELECT
      NEW.org_id, id,
      'payment_claimed',
      'Paiement déclaré par un client',
      'Un client a déclaré avoir effectué un paiement — vérification requise',
      '/dashboard/invoices'
    FROM public.user_profiles
    WHERE role IN ('admin_global', 'admin_org')
      AND (org_id = NEW.org_id OR role = 'admin_global');
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid' THEN
    v_title := 'Paiement confirmé ✓';
    v_body  := 'Votre paiement a été validé par Atlas';
  ELSIF NEW.status = 'sent' THEN
    v_title := 'Facture prête au paiement';
    v_body  := 'Une facture est disponible et attend votre règlement';
  ELSE
    v_title := 'Facture mise à jour';
    v_body  := 'Le statut de votre facture a changé';
  END IF;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (NEW.org_id, NEW.client_id, 'invoice_status', v_title, v_body, '/dashboard/invoices');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_invoice_status ON public.invoices;
CREATE TRIGGER trg_notify_invoice_status
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION notify_invoice_status();

-- ── 7. Trigger : notifier sur changement statut contrat ──────────
CREATE OR REPLACE FUNCTION notify_contract_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'sent' AND NEW.client_id IS NOT NULL THEN
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    VALUES (
      NEW.org_id, NEW.client_id,
      'contract_sent',
      'Contrat à signer',
      'Un contrat vous a été envoyé pour signature : ' || NEW.title,
      '/dashboard/contracts'
    );

  ELSIF NEW.status = 'signed' THEN
    -- Notifier tous les admins
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    SELECT
      NEW.org_id, id,
      'contract_signed',
      'Contrat signé ✓',
      'Le contrat "' || NEW.title || '" a été signé par le client',
      '/dashboard/contracts'
    FROM public.user_profiles
    WHERE role IN ('admin_global', 'admin_org')
      AND (org_id = NEW.org_id OR role = 'admin_global');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_contract_status ON public.contracts;
CREATE TRIGGER trg_notify_contract_status
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_status();

-- ── 8. Trigger : notifier sur changement statut dossier société ──
CREATE OR REPLACE FUNCTION notify_request_status()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  CASE NEW.status
    WHEN 'kyc_required' THEN
      v_title := 'Documents d''identité requis';
      v_body  := 'Veuillez soumettre vos pièces d''identité pour continuer votre dossier';
    WHEN 'kyc_in_review' THEN
      v_title := 'Dossier en cours d''examen';
      v_body  := 'Vos documents sont en cours de vérification par notre équipe';
    WHEN 'identity_verification' THEN
      v_title := 'Vérification d''identité';
      v_body  := 'Un opérateur Atlas vous contactera prochainement pour finaliser la vérification';
    WHEN 'company_created' THEN
      v_title := 'Société créée ✓';
      v_body  := 'Votre société a été créée avec succès !';
    WHEN 'submitted_companies_house' THEN
      v_title := 'Dossier soumis';
      v_body  := 'Votre dossier a été soumis — traitement en cours';
    WHEN 'branch_preparation' THEN
      v_title := 'Création de succursale';
      v_body  := 'La création de votre succursale est en cours';
    WHEN 'completed' THEN
      v_title := 'Dossier terminé ✓';
      v_body  := 'Félicitations ! Votre dossier est complet et votre société est opérationnelle';
    ELSE
      v_title := 'Dossier mis à jour';
      v_body  := 'Votre dossier a été mis à jour';
  END CASE;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (NEW.org_id, NEW.client_id, 'request_status', v_title, v_body, '/dashboard/company-requests');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_request_status ON public.company_requests;
CREATE TRIGGER trg_notify_request_status
  AFTER UPDATE ON public.company_requests
  FOR EACH ROW EXECUTE FUNCTION notify_request_status();

-- ── 9. Trigger : notifier sur nouveau message ticket ─────────────
CREATE OR REPLACE FUNCTION notify_ticket_message()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_client_id UUID;
  v_sender_role      TEXT;
  v_ticket_org_id    UUID;
BEGIN
  SELECT t.client_id, p.role, t.org_id
    INTO v_ticket_client_id, v_sender_role, v_ticket_org_id
    FROM public.tickets t
    JOIN public.user_profiles p ON p.id = NEW.sender_id
    WHERE t.id = NEW.ticket_id;

  IF v_sender_role IN ('admin_global', 'admin_org', 'agent') THEN
    -- Admin répond → notifier le client
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    VALUES (
      v_ticket_org_id, v_ticket_client_id,
      'ticket_reply',
      'Nouveau message sur votre ticket',
      LEFT(NEW.body, 100),
      '/dashboard/tickets'
    );
  ELSE
    -- Client écrit → notifier les admins
    INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
    SELECT
      v_ticket_org_id, id,
      'ticket_message',
      'Nouveau message client',
      LEFT(NEW.body, 100),
      '/dashboard/tickets'
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
