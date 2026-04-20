-- ================================================================
-- 006 — Sociétés, Demandes de services, Atlas Circle
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- ── 1. Table companies ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id               UUID        REFERENCES public.organizations(id),
  client_id            UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  request_id           UUID        REFERENCES public.company_requests(id),
  -- Infos société UK
  name                 TEXT        NOT NULL,
  company_number       TEXT,
  incorporation_date   DATE,
  registered_address   TEXT,
  status               TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'dormant', 'dissolved', 'in_dissolution')),
  -- Succursale
  has_branch_ch        BOOLEAN     NOT NULL DEFAULT false,
  branch_canton        TEXT,
  branch_address       TEXT,
  branch_created_date  DATE,
  -- Mise en conformité (annual compliance)
  compliance_due_date  DATE,
  last_compliance_date DATE,
  compliance_price     NUMERIC(10,2) DEFAULT 1200,
  compliance_currency  TEXT        DEFAULT 'CHF',
  -- Pack comptabilité
  accounting_pack      BOOLEAN     NOT NULL DEFAULT false,
  accounting_price     NUMERIC(10,2),
  accounting_currency  TEXT        DEFAULT 'GBP',
  -- Dissolution
  dissolution_price    NUMERIC(10,2) DEFAULT 500,
  dissolution_currency TEXT        DEFAULT 'CHF',
  -- Admin
  admin_notes          TEXT,
  created_by           UUID        REFERENCES public.user_profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_client_id ON public.companies(client_id);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;

CREATE POLICY "companies_select" ON public.companies FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);
CREATE POLICY "companies_update" ON public.companies FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);
CREATE POLICY "companies_delete" ON public.companies FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);

-- ── 2. Ajouter company_id aux documents ──────────────────────────
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- ── 3. Table service_requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_requests (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           UUID        REFERENCES public.organizations(id),
  client_id        UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_id       UUID        REFERENCES public.services(id),
  service_name     TEXT        NOT NULL,
  category         TEXT,
  message          TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','quoted','accepted','rejected','completed')),
  admin_reply      TEXT,
  quoted_price     NUMERIC(10,2),
  quoted_currency  TEXT        DEFAULT 'CHF',
  circle_value     NUMERIC(10,2) DEFAULT 0,
  assigned_to      UUID        REFERENCES public.user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_client ON public.service_requests(client_id);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_select" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_insert" ON public.service_requests;
DROP POLICY IF EXISTS "service_requests_update" ON public.service_requests;

CREATE POLICY "service_requests_select" ON public.service_requests FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org','agent'))
);
CREATE POLICY "service_requests_insert" ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  );
CREATE POLICY "service_requests_update" ON public.service_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);

-- ── 4. Table atlas_circle_entries (ajouts manuels + auto) ────────
CREATE TABLE IF NOT EXISTS public.atlas_circle_entries (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      UUID        REFERENCES public.organizations(id),
  client_id   UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'manual'
    CHECK (type IN ('manual','invoice','service_request','bonus')),
  amount      NUMERIC(10,2) NOT NULL,
  label       TEXT        NOT NULL,
  ref_id      UUID,
  added_by    UUID        REFERENCES public.user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atlas_circle_client ON public.atlas_circle_entries(client_id);
ALTER TABLE public.atlas_circle_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atlas_circle_select" ON public.atlas_circle_entries;
DROP POLICY IF EXISTS "atlas_circle_insert" ON public.atlas_circle_entries;
DROP POLICY IF EXISTS "atlas_circle_delete" ON public.atlas_circle_entries;

CREATE POLICY "atlas_circle_select" ON public.atlas_circle_entries FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);
CREATE POLICY "atlas_circle_insert" ON public.atlas_circle_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);
CREATE POLICY "atlas_circle_delete" ON public.atlas_circle_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
);

-- ── 5. Trigger : notifier client quand sa société est créée ──────
CREATE OR REPLACE FUNCTION notify_company_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (
    NEW.org_id, NEW.client_id,
    'company_created',
    'Votre société est disponible ✓',
    'La société "' || NEW.name || '" est enregistrée et accessible dans l''espace Mes Sociétés',
    '/dashboard/companies'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_company_created ON public.companies;
CREATE TRIGGER trg_notify_company_created
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION notify_company_created();

-- ── 6. Trigger : notifier admin d'une nouvelle demande service ───
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
    'Nouvelle demande de service',
    v_client_name || ' demande : ' || NEW.service_name,
    '/dashboard/service-requests'
  FROM public.user_profiles
  WHERE role IN ('admin_global','admin_org')
    AND (org_id = NEW.org_id OR role = 'admin_global');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_request ON public.service_requests;
CREATE TRIGGER trg_notify_service_request
  AFTER INSERT ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION notify_service_request_created();

-- ── 7. Trigger : notifier client quand sa demande est mise à jour ─
CREATE OR REPLACE FUNCTION notify_service_request_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = OLD.status AND NEW.admin_reply IS NOT DISTINCT FROM OLD.admin_reply THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (org_id, user_id, type, title, body, link)
  VALUES (
    NEW.org_id, NEW.client_id,
    'service_request_update',
    'Mise à jour de votre demande',
    'Votre demande "' || NEW.service_name || '" a été mise à jour',
    '/dashboard/service-requests'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_service_request_updated ON public.service_requests;
CREATE TRIGGER trg_notify_service_request_updated
  AFTER UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION notify_service_request_updated();
