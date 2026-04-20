-- ─────────────────────────────────────────────────────────────────
-- Migration 004 : identity_verification step, branch canton, services
-- ─────────────────────────────────────────────────────────────────

-- 1. Add new status value for identity verification step
ALTER TYPE company_request_status ADD VALUE IF NOT EXISTS 'identity_verification' AFTER 'kyc_in_review';

-- 2. Add branch canton field
ALTER TABLE company_requests ADD COLUMN IF NOT EXISTS branch_canton text;

-- 3. Services table (Nexus Sphère Studio)
CREATE TABLE IF NOT EXISTS services (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text        NOT NULL,
  category      text        NOT NULL CHECK (category IN ('web','hosting','software','marketing','security','consulting')),
  short_description text,
  description   text,
  price_from    numeric,
  price_currency text       DEFAULT 'CHF',
  price_type    text        DEFAULT 'quote' CHECK (price_type IN ('fixed','monthly','quote')),
  is_active     boolean     DEFAULT true,
  sort_order    integer     DEFAULT 0,
  icon          text,
  features      text[]      DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read active services
CREATE POLICY "services_read" ON services
  FOR SELECT TO authenticated
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin_global','admin_org')
    )
  );

-- Only admins can write services
CREATE POLICY "services_write" ON services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin_global','admin_org')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin_global','admin_org')
    )
  );

-- 4. Seed initial services
INSERT INTO services (name, category, short_description, description, price_from, price_type, icon, sort_order, features) VALUES

-- Web
('Création de site vitrine', 'web',
 'Site web professionnel pour présenter votre activité',
 'Conception et développement d''un site web sur mesure pour présenter votre entreprise, vos services et vos coordonnées. Design moderne, responsive et optimisé SEO.',
 1200, 'fixed', '🌐', 10,
 ARRAY['Design personnalisé','Responsive mobile','SEO de base','Formulaire de contact','Hébergement 1 an inclus']),

('Site e-commerce', 'web',
 'Boutique en ligne complète avec paiement intégré',
 'Développement d''une boutique en ligne avec gestion de catalogue, panier, paiement sécurisé (Stripe, PayPal, Revolut) et suivi des commandes.',
 2500, 'fixed', '🛒', 20,
 ARRAY['Catalogue illimité','Paiement sécurisé','Gestion des stocks','Tableau de bord','Livraison configurable']),

('Landing page / Funnel', 'web',
 'Page d''atterrissage haute conversion',
 'Conception d''une page optimisée pour convertir vos visiteurs : capture de leads, tunnel de vente, A/B testing, intégration CRM.',
 600, 'fixed', '🚀', 25,
 ARRAY['Design haute conversion','A/B testing','Formulaire intégré','Analytics','Livraison 7 jours']),

('Application web sur mesure', 'web',
 'Application métier développée selon vos besoins spécifiques',
 'Développement d''une application web personnalisée : CRM, ERP, portail client, outil interne, marketplace ou SaaS.',
 NULL, 'quote', '⚙️', 30,
 ARRAY['Analyse des besoins','Architecture scalable','API REST','Tableau de bord','Formation incluse']),

-- Hosting
('Hébergement web mutualisé', 'hosting',
 'Hébergement partagé haute disponibilité',
 'Solution d''hébergement web mutualisé avec certificat SSL gratuit, sauvegardes quotidiennes et support technique 7j/7.',
 15, 'monthly', '☁️', 40,
 ARRAY['SSL gratuit','Sauvegardes quotidiennes','cPanel/Plesk','Emails inclus','Support 7j/7']),

('Serveur privé virtuel (VPS)', 'hosting',
 'VPS dédié avec ressources garanties',
 'Serveur privé virtuel avec ressources dédiées, accès root complet, snapshots automatiques et haute disponibilité.',
 49, 'monthly', '🖥️', 50,
 ARRAY['Ressources dédiées','Accès root','IP dédiée','Snapshots','Bande passante illimitée']),

('Serveur dédié', 'hosting',
 'Serveur physique entièrement dédié à votre infrastructure',
 'Infrastructure physique dédiée pour charges de travail intensives nécessitant des performances maximales et une sécurité totale.',
 199, 'monthly', '🏭', 60,
 ARRAY['Hardware dédié','Performances maximales','RAID matériel','KVM/IPMI','SLA 99,9%']),

('Nom de domaine', 'hosting',
 'Enregistrement et gestion de noms de domaine',
 'Enregistrement, renouvellement et gestion complète de vos noms de domaine (.com, .fr, .ch, .eu, .io…)',
 12, 'fixed', '🔗', 70,
 ARRAY['Tous les TLDs populaires','DNS managé','Transfert inclus','Protection WHOIS','Auto-renouvellement']),

('Emails professionnels', 'hosting',
 'Messagerie professionnelle sur votre domaine',
 'Création et gestion d''adresses email professionnelles sur votre domaine avec antispam avancé, calendrier partagé et stockage cloud.',
 8, 'monthly', '📧', 80,
 ARRAY['Antispam avancé','Calendrier partagé','50 Go stockage','Compatible Outlook/Apple Mail','Webmail inclus']),

-- Software
('Logiciel sur mesure', 'software',
 'Développement de logiciels métier personnalisés',
 'Conception et développement de logiciels sur mesure : automatisation de processus, outils internes, scripts métier, intégrations API.',
 NULL, 'quote', '💻', 130,
 ARRAY['Analyse fonctionnelle','Développement agile','Tests & QA','Déploiement','Maintenance 6 mois']),

('CRM / ERP Cloud', 'software',
 'Solution de gestion d''entreprise clé en main',
 'Déploiement et configuration d''une solution CRM/ERP adaptée à votre secteur (Odoo, HubSpot, Salesforce…) avec import de données et formation.',
 200, 'monthly', '📊', 140,
 ARRAY['Configuration sur mesure','Import des données','Formation équipes','Intégrations natives','Support dédié']),

('Automatisation & IA', 'software',
 'Automatisation de vos processus avec l''intelligence artificielle',
 'Intégration d''outils d''automatisation (Zapier, Make, n8n) et de solutions IA pour optimiser vos workflows et gagner en productivité.',
 NULL, 'quote', '🤖', 145,
 ARRAY['Audit des processus','Scripts d''automatisation','Intégration IA','Tableaux de bord','Formation incluse']),

-- Marketing
('Référencement SEO', 'marketing',
 'Optimisation pour les moteurs de recherche',
 'Audit SEO complet, optimisation on-page et off-page, link building et suivi mensuel des positions pour améliorer votre visibilité.',
 500, 'monthly', '📈', 90,
 ARRAY['Audit SEO','Optimisation on-page','Link building','Rapport mensuel','Suivi des positions']),

('Gestion réseaux sociaux', 'marketing',
 'Animation et gestion de vos réseaux sociaux',
 'Stratégie éditoriale, création de contenu, planification et modération sur Instagram, LinkedIn, Facebook, TikTok, X.',
 800, 'monthly', '📱', 100,
 ARRAY['Stratégie éditoriale','Création de contenu','Planification','Modération','Reporting mensuel']),

('Google & Meta Ads', 'marketing',
 'Campagnes publicitaires payantes sur Google et Meta',
 'Création et gestion de campagnes Google Ads (Search, Display, Shopping) et Meta Ads (Facebook, Instagram) avec optimisation continue.',
 400, 'monthly', '🎯', 110,
 ARRAY['Setup des campagnes','Ciblage avancé','A/B testing','Optimisation continue','Rapport hebdomadaire']),

('Identité visuelle & Branding', 'marketing',
 'Logo, charte graphique et supports de communication',
 'Création complète de votre identité de marque : logo déclinable, charte graphique, carte de visite, papier en-tête, signature email.',
 800, 'fixed', '🎨', 120,
 ARRAY['Logo vectoriel HD','Charte graphique','Carte de visite','Papier en-tête','Fichiers sources']),

-- Security
('Audit de cybersécurité', 'security',
 'Évaluation complète de la sécurité de vos systèmes',
 'Audit approfondi de vos infrastructures et applications pour identifier les vulnérabilités, avec rapport détaillé et plan de remédiation.',
 1500, 'fixed', '🛡️', 150,
 ARRAY['Scan de vulnérabilités','Test d''intrusion','Rapport détaillé','Plan de remédiation','Suivi post-audit']),

('Protection SSL & Firewall', 'security',
 'Sécurisation de vos sites et données',
 'Installation et renouvellement de certificats SSL, configuration firewall applicatif (WAF), protection DDoS et surveillance continue.',
 150, 'fixed', '🔒', 160,
 ARRAY['SSL multi-domaines','WAF','Protection DDoS','Monitoring 24/7','Alertes temps réel']),

('Sauvegarde & Reprise d''activité', 'security',
 'Plan de reprise d''activité et sauvegardes automatisées',
 'Mise en place d''une stratégie de sauvegarde (3-2-1), tests de restauration et plan de reprise d''activité (PRA) en cas d''incident.',
 NULL, 'quote', '💾', 165,
 ARRAY['Sauvegardes 3-2-1','Tests de restauration','PRA documenté','Alerte incidents','RPO/RTO définis']),

-- Consulting
('Consulting digital', 'consulting',
 'Accompagnement stratégique dans votre transformation digitale',
 'Audit de votre présence digitale, définition de feuille de route et accompagnement dans vos projets de transformation numérique.',
 200, 'fixed', '🎓', 170,
 ARRAY['Audit digital','Feuille de route','Accompagnement','Ateliers','Suivi trimestriel']),

('Formation & Ateliers', 'consulting',
 'Formations sur mesure pour vos équipes',
 'Sessions de formation sur les outils numériques, le digital marketing, la cybersécurité et la productivité pour vos collaborateurs.',
 500, 'fixed', '📚', 180,
 ARRAY['Contenu sur mesure','Présentiel ou visio','Supports inclus','Attestation de formation','Suivi post-formation']);

-- 5. Updated_at trigger for services
CREATE OR REPLACE FUNCTION update_services_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_services_updated_at();
