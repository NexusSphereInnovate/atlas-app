-- ================================================================
-- À EXÉCUTER dans Supabase SQL Editor
-- ================================================================

-- ── 1. Table contracts (si pas encore créée) ──────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID REFERENCES public.organizations(id),
  title            TEXT NOT NULL,
  version          TEXT NOT NULL DEFAULT '1.0',
  client_id        UUID REFERENCES public.user_profiles(id),
  pdf_path         TEXT,
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
  agent_id         UUID REFERENCES public.user_profiles(id),
  commission_type  TEXT CHECK (commission_type IN ('fixed', 'percentage')),
  commission_value NUMERIC(12,2),
  signed_at        TIMESTAMPTZ,
  signed_by        UUID REFERENCES public.user_profiles(id),
  sign_ip          TEXT,
  invoice_id       UUID REFERENCES public.invoices(id),
  created_by       UUID REFERENCES public.user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- ── 2. Colonnes manquantes sur invoices ───────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS revolut_order_id  TEXT,
  ADD COLUMN IF NOT EXISTS revolut_public_id TEXT,
  ADD COLUMN IF NOT EXISTS contract_id       UUID REFERENCES public.contracts(id),
  ADD COLUMN IF NOT EXISTS agent_id_override UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS comm_type         TEXT CHECK (comm_type IN ('fixed', 'percentage')),
  ADD COLUMN IF NOT EXISTS comm_value        NUMERIC(12,2);

-- ── 3. Statuts enum ───────────────────────────────────────────────
ALTER TYPE company_request_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE company_request_status ADD VALUE IF NOT EXISTS 'identity_verification';

-- ── 4. Champ canton sur company_requests ──────────────────────────
ALTER TABLE public.company_requests ADD COLUMN IF NOT EXISTS branch_canton TEXT;

-- ── 5. Bucket contracts (PDFs privés) ────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ── 6. Policies contracts (DROP avant CREATE) ─────────────────────
DROP POLICY IF EXISTS "contracts_select" ON public.contracts;
DROP POLICY IF EXISTS "contracts_insert" ON public.contracts;
DROP POLICY IF EXISTS "contracts_update" ON public.contracts;

CREATE POLICY "contracts_select" ON public.contracts
  FOR SELECT USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'agent')
  );

CREATE POLICY "contracts_insert" ON public.contracts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  );

CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
    OR (client_id = auth.uid() AND status = 'sent')
  );

-- ── 7. Policies storage bucket contracts ──────────────────────────
DROP POLICY IF EXISTS "contracts_admin_all" ON storage.objects;
DROP POLICY IF EXISTS "contracts_client_read" ON storage.objects;

CREATE POLICY "contracts_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'contracts'
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  )
  WITH CHECK (
    bucket_id = 'contracts'
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  );

CREATE POLICY "contracts_client_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.pdf_path = storage.objects.name
        AND c.client_id = auth.uid()
        AND c.status != 'draft'
    )
  );

-- ── 8. Trigger commission auto sur paiement facture ───────────────
CREATE OR REPLACE FUNCTION handle_invoice_paid()
RETURNS TRIGGER AS $$
DECLARE
  v_agent_id UUID;
  v_type     TEXT;
  v_value    NUMERIC(12,2);
  v_amount   NUMERIC(12,2);
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_paid ON public.invoices;
CREATE TRIGGER trg_invoice_paid
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION handle_invoice_paid();

-- ── 9. Table services (Nexus Sphère Studio) ───────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT        NOT NULL,
  category          TEXT        NOT NULL CHECK (category IN ('web','hosting','software','marketing','security','consulting')),
  short_description TEXT,
  description       TEXT,
  price_from        NUMERIC,
  price_currency    TEXT        DEFAULT 'CHF',
  price_type        TEXT        DEFAULT 'quote' CHECK (price_type IN ('fixed','monthly','quote')),
  is_active         BOOLEAN     DEFAULT true,
  sort_order        INTEGER     DEFAULT 0,
  icon              TEXT,
  features          TEXT[]      DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_read"  ON public.services;
DROP POLICY IF EXISTS "services_write" ON public.services;

CREATE POLICY "services_read" ON public.services
  FOR SELECT TO authenticated
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  );

CREATE POLICY "services_write" ON public.services
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin_global','admin_org'))
  );

-- ── 10. Seed services (seulement si la table est vide) ────────────
INSERT INTO public.services (name, category, short_description, description, price_from, price_type, icon, sort_order, features)
SELECT * FROM (VALUES
  ('Création de site vitrine', 'web', 'Site web professionnel pour présenter votre activité', 'Conception et développement d''un site web sur mesure pour présenter votre entreprise, vos services et vos coordonnées.', 1200, 'fixed', '🌐', 10, ARRAY['Design personnalisé','Responsive mobile','SEO de base','Formulaire de contact','Hébergement 1 an inclus']),
  ('Site e-commerce', 'web', 'Boutique en ligne complète avec paiement intégré', 'Développement d''une boutique en ligne avec gestion de catalogue, panier, paiement sécurisé et suivi des commandes.', 2500, 'fixed', '🛒', 20, ARRAY['Catalogue illimité','Paiement sécurisé','Gestion des stocks','Tableau de bord','Livraison configurable']),
  ('Landing page / Funnel', 'web', 'Page d''atterrissage haute conversion', 'Conception d''une page optimisée pour convertir vos visiteurs : capture de leads, tunnel de vente, A/B testing.', 600, 'fixed', '🚀', 25, ARRAY['Design haute conversion','A/B testing','Formulaire intégré','Analytics','Livraison 7 jours']),
  ('Application web sur mesure', 'web', 'Application métier développée selon vos besoins', 'Développement d''une application web personnalisée : CRM, ERP, portail client, outil interne, marketplace ou SaaS.', NULL, 'quote', '⚙️', 30, ARRAY['Analyse des besoins','Architecture scalable','API REST','Tableau de bord','Formation incluse']),
  ('Hébergement web mutualisé', 'hosting', 'Hébergement partagé haute disponibilité', 'Hébergement web mutualisé avec certificat SSL gratuit, sauvegardes quotidiennes et support 7j/7.', 15, 'monthly', '☁️', 40, ARRAY['SSL gratuit','Sauvegardes quotidiennes','cPanel','Emails inclus','Support 7j/7']),
  ('Serveur privé virtuel (VPS)', 'hosting', 'VPS dédié avec ressources garanties', 'Serveur privé virtuel avec ressources dédiées, accès root complet et haute disponibilité.', 49, 'monthly', '🖥️', 50, ARRAY['Ressources dédiées','Accès root','IP dédiée','Snapshots','Bande passante illimitée']),
  ('Serveur dédié', 'hosting', 'Serveur physique entièrement dédié', 'Infrastructure physique dédiée pour charges de travail intensives nécessitant des performances maximales.', 199, 'monthly', '🏭', 60, ARRAY['Hardware dédié','Performances maximales','RAID matériel','KVM/IPMI','SLA 99,9%']),
  ('Nom de domaine', 'hosting', 'Enregistrement et gestion de noms de domaine', 'Enregistrement, renouvellement et gestion complète de vos noms de domaine (.com, .fr, .ch, .eu…)', 12, 'fixed', '🔗', 70, ARRAY['Tous les TLDs','DNS managé','Transfert inclus','Protection WHOIS','Auto-renouvellement']),
  ('Emails professionnels', 'hosting', 'Messagerie professionnelle sur votre domaine', 'Adresses email professionnelles avec antispam, calendrier partagé et 50 Go de stockage.', 8, 'monthly', '📧', 80, ARRAY['Antispam avancé','Calendrier partagé','50 Go stockage','Compatible Outlook','Webmail inclus']),
  ('Logiciel sur mesure', 'software', 'Développement de logiciels métier personnalisés', 'Logiciels sur mesure : automatisation de processus, outils internes, scripts métier, intégrations API.', NULL, 'quote', '💻', 130, ARRAY['Analyse fonctionnelle','Développement agile','Tests & QA','Déploiement','Maintenance 6 mois']),
  ('CRM / ERP Cloud', 'software', 'Solution de gestion d''entreprise clé en main', 'Déploiement et configuration d''une solution CRM/ERP avec import de données et formation des équipes.', 200, 'monthly', '📊', 140, ARRAY['Configuration sur mesure','Import des données','Formation équipes','Intégrations','Support dédié']),
  ('Automatisation & IA', 'software', 'Automatisation de vos processus avec l''intelligence artificielle', 'Intégration d''outils d''automatisation (Make, n8n) et de solutions IA pour optimiser vos workflows.', NULL, 'quote', '🤖', 145, ARRAY['Audit des processus','Scripts d''automatisation','Intégration IA','Tableaux de bord','Formation incluse']),
  ('Référencement SEO', 'marketing', 'Optimisation pour les moteurs de recherche', 'Audit SEO, optimisation on-page et off-page, link building et suivi mensuel des positions.', 500, 'monthly', '📈', 90, ARRAY['Audit SEO','Optimisation on-page','Link building','Rapport mensuel','Suivi des positions']),
  ('Gestion réseaux sociaux', 'marketing', 'Animation et gestion de vos réseaux sociaux', 'Stratégie éditoriale, création de contenu et modération sur Instagram, LinkedIn, Facebook, TikTok.', 800, 'monthly', '📱', 100, ARRAY['Stratégie éditoriale','Création de contenu','Planification','Modération','Reporting mensuel']),
  ('Google & Meta Ads', 'marketing', 'Campagnes publicitaires payantes sur Google et Meta', 'Création et gestion de campagnes Google Ads et Meta Ads avec optimisation continue.', 400, 'monthly', '🎯', 110, ARRAY['Setup des campagnes','Ciblage avancé','A/B testing','Optimisation continue','Rapport hebdomadaire']),
  ('Identité visuelle & Branding', 'marketing', 'Logo, charte graphique et supports de communication', 'Création complète de votre identité de marque : logo, charte graphique, carte de visite, papier en-tête.', 800, 'fixed', '🎨', 120, ARRAY['Logo vectoriel HD','Charte graphique','Carte de visite','Papier en-tête','Fichiers sources']),
  ('Audit de cybersécurité', 'security', 'Évaluation complète de la sécurité de vos systèmes', 'Audit de vos infrastructures pour identifier les vulnérabilités, avec rapport et plan de remédiation.', 1500, 'fixed', '🛡️', 150, ARRAY['Scan de vulnérabilités','Test d''intrusion','Rapport détaillé','Plan de remédiation','Suivi post-audit']),
  ('Protection SSL & Firewall', 'security', 'Sécurisation de vos sites et données', 'SSL, firewall applicatif (WAF), protection DDoS et surveillance continue.', 150, 'fixed', '🔒', 160, ARRAY['SSL multi-domaines','WAF','Protection DDoS','Monitoring 24/7','Alertes temps réel']),
  ('Sauvegarde & Reprise d''activité', 'security', 'Plan de reprise et sauvegardes automatisées', 'Stratégie de sauvegarde 3-2-1, tests de restauration et plan de reprise d''activité.', NULL, 'quote', '💾', 165, ARRAY['Sauvegardes 3-2-1','Tests de restauration','PRA documenté','Alerte incidents','RPO/RTO définis']),
  ('Consulting digital', 'consulting', 'Accompagnement stratégique dans votre transformation digitale', 'Audit digital, feuille de route et accompagnement dans vos projets de transformation numérique.', 200, 'fixed', '🎓', 170, ARRAY['Audit digital','Feuille de route','Accompagnement','Ateliers','Suivi trimestriel']),
  ('Formation & Ateliers', 'consulting', 'Formations sur mesure pour vos équipes', 'Formation sur les outils numériques, le marketing digital, la cybersécurité et la productivité.', 500, 'fixed', '📚', 180, ARRAY['Contenu sur mesure','Présentiel ou visio','Supports inclus','Attestation de formation','Suivi post-formation'])
) AS v(name, category, short_description, description, price_from, price_type, icon, sort_order, features)
WHERE NOT EXISTS (SELECT 1 FROM public.services LIMIT 1);
