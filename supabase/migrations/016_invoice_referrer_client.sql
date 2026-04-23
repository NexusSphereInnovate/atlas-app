-- ================================================================
-- 016 — Parrainage client sur les factures
-- Ajoute les colonnes pour gérer le client qui a recommandé
-- un autre client (commission parrainage + points Atlas Circle)
-- ================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS referrer_client_id UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS referrer_comm_rate  NUMERIC DEFAULT 5;

-- Index pour retrouver les parrainages d'un client
CREATE INDEX IF NOT EXISTS idx_invoices_referrer ON public.invoices(referrer_client_id)
  WHERE referrer_client_id IS NOT NULL;

-- Commentaires
COMMENT ON COLUMN public.invoices.referrer_client_id IS 'Client qui a recommandé ce client (parrainage)';
COMMENT ON COLUMN public.invoices.referrer_comm_rate IS 'Taux de commission parrainage en % (défaut 5)';
