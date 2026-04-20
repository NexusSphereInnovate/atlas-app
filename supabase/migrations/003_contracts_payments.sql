-- ============================================================
-- MIGRATION 003 — Contrats PDF, Paiement Revolut, Statut Terminé
-- ============================================================

-- Statut "completed" sur les demandes société
ALTER TYPE company_request_status ADD VALUE IF NOT EXISTS 'completed';

-- Bucket contrats (à créer dans Supabase Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false) ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE contracts — Gestion des contrats PDF
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES public.organizations(id),
  title           TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT '1.0',
  client_id       UUID REFERENCES public.user_profiles(id),
  pdf_path        TEXT,                    -- chemin dans storage 'contracts'
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),

  -- Commission (non visible client)
  agent_id        UUID REFERENCES public.user_profiles(id),
  commission_type TEXT CHECK (commission_type IN ('fixed', 'percentage')),
  commission_value NUMERIC(12,2),

  -- Signature électronique
  signed_at       TIMESTAMPTZ,
  signed_by       UUID REFERENCES public.user_profiles(id),
  sign_ip         TEXT,

  -- Liens
  invoice_id      UUID REFERENCES public.invoices(id),
  created_by      UUID REFERENCES public.user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes supplémentaires sur invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS revolut_order_id  TEXT,
  ADD COLUMN IF NOT EXISTS revolut_public_id TEXT,
  ADD COLUMN IF NOT EXISTS contract_id       UUID REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS agent_id_override UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS comm_type         TEXT CHECK (comm_type IN ('fixed', 'percentage')),
  ADD COLUMN IF NOT EXISTS comm_value        NUMERIC(12,2);

-- ============================================================
-- Trigger : commission auto quand invoice payée (avec contract)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_invoice_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id  UUID;
  v_type      TEXT;
  v_value     NUMERIC(12,2);
  v_amount    NUMERIC(12,2);
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    -- Priorité : agent sur la facture, sinon agent sur le contrat
    IF NEW.agent_id IS NOT NULL OR NEW.agent_id_override IS NOT NULL THEN
      v_agent_id := COALESCE(NEW.agent_id_override, NEW.agent_id);
      v_type     := NEW.comm_type;
      v_value    := NEW.comm_value;
    ELSIF NEW.contract_id IS NOT NULL THEN
      SELECT agent_id, commission_type, commission_value
        INTO v_agent_id, v_type, v_value
        FROM public.contracts WHERE id = NEW.contract_id;
    END IF;

    IF v_agent_id IS NOT NULL AND v_value IS NOT NULL THEN
      IF v_type = 'percentage' THEN
        v_amount := ROUND(NEW.total * v_value / 100, 2);
      ELSE
        v_amount := v_value;
      END IF;

      INSERT INTO public.commissions (
        org_id, agent_id, invoice_id, client_id,
        type, rate, amount, currency, status
      ) VALUES (
        NEW.org_id, v_agent_id, NEW.id, NEW.client_id,
        v_type::commission_type,
        CASE WHEN v_type = 'percentage' THEN v_value ELSE NULL END,
        v_amount, NEW.currency, 'pending'
      );
    END IF;

    -- Marquer le contrat comme payé si lié
    IF NEW.contract_id IS NOT NULL THEN
      UPDATE public.contracts SET status = 'signed' WHERE id = NEW.contract_id AND status != 'signed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_paid ON public.invoices;
CREATE TRIGGER trg_invoice_paid
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION handle_invoice_paid();

-- ============================================================
-- RLS contracts
-- ============================================================
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON public.contracts FOR SELECT USING (
  client_id = auth.uid() OR is_admin() OR auth_role() = 'agent'
);
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE USING (is_admin() OR (client_id = auth.uid() AND status = 'sent'));

-- Storage bucket policies pour contracts
-- INSERT INTO storage.policies ... (à ajouter manuellement dans Supabase dashboard)
