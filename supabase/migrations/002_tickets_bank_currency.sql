-- ============================================================
-- MIGRATION 002 — Tickets, Compte bancaire, Devise, i18n, Succursale
-- À coller dans Supabase SQL Editor
-- ============================================================

-- Préférences utilisateur
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'CHF'
    CHECK (preferred_currency IN ('CHF', 'EUR')),
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT NOT NULL DEFAULT 'fr'
    CHECK (preferred_lang IN ('fr', 'en'));

-- Colonnes supplémentaires sur company_requests
ALTER TABLE public.company_requests
  ADD COLUMN IF NOT EXISTS registered_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS registered_address_city   TEXT,
  ADD COLUMN IF NOT EXISTS registered_address_postcode TEXT,
  ADD COLUMN IF NOT EXISTS branch_address_line1      TEXT,
  ADD COLUMN IF NOT EXISTS branch_address_city       TEXT,
  ADD COLUMN IF NOT EXISTS branch_address_postcode   TEXT,
  ADD COLUMN IF NOT EXISTS branch_address_country    TEXT DEFAULT 'FR',
  ADD COLUMN IF NOT EXISTS branch_proof_type         TEXT CHECK (branch_proof_type IN ('bail', 'facture_electricite', 'autre')),
  ADD COLUMN IF NOT EXISTS branch_submitted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at          TIMESTAMPTZ;

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tickets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID REFERENCES public.organizations(id),
  client_id           UUID NOT NULL REFERENCES public.user_profiles(id),
  assigned_to         UUID REFERENCES public.user_profiles(id),
  company_request_id  UUID REFERENCES public.company_requests(id),
  subject             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority            TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by          UUID NOT NULL REFERENCES public.user_profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES public.user_profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_message_updated ON public.ticket_messages;
CREATE TRIGGER trg_ticket_message_updated
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION update_tickets_updated_at();

-- ============================================================
-- COMPTE BANCAIRE (Revolut Business)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bank_account_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES public.organizations(id),
  client_id    UUID NOT NULL REFERENCES public.user_profiles(id) UNIQUE,
  email        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  pin_code     TEXT NOT NULL,           -- 6 chiffres hashé côté app
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'active', 'rejected')),
  iban         TEXT,
  account_number TEXT,
  sort_code    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RLS TICKETS
-- ============================================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Tickets : client voit ses tickets, admin/agent voit tout
CREATE POLICY "tickets_select" ON public.tickets FOR SELECT USING (
  client_id = auth.uid() OR is_admin() OR auth_role() = 'agent'
);
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT WITH CHECK (
  client_id = auth.uid() OR is_admin() OR auth_role() = 'agent'
);
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE USING (
  is_admin() OR auth_role() = 'agent'
);

-- Messages
CREATE POLICY "ticket_messages_select" ON public.ticket_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (t.client_id = auth.uid() OR is_admin() OR auth_role() = 'agent')
  )
);
CREATE POLICY "ticket_messages_insert" ON public.ticket_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
      AND (t.client_id = auth.uid() OR is_admin() OR auth_role() = 'agent')
  )
);

-- ============================================================
-- RLS BANK ACCOUNT
-- ============================================================
ALTER TABLE public.bank_account_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_account_select" ON public.bank_account_requests FOR SELECT USING (
  client_id = auth.uid() OR is_admin()
);
CREATE POLICY "bank_account_insert" ON public.bank_account_requests FOR INSERT WITH CHECK (
  client_id = auth.uid()
);
CREATE POLICY "bank_account_update" ON public.bank_account_requests FOR UPDATE USING (
  client_id = auth.uid() OR is_admin()
);
