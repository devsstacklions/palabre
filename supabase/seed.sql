-- ===================================================================
-- PALABRE — Données de démonstration et catégories (Seed)
-- À exécuter pour peupler initialement l'application
-- ===================================================================

-- 1. Catégories initiales
INSERT INTO public.categories (id, name, slug, description, icon) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Mobile Money', 'mobile-money', 'Intégration Wave, Orange Money, MTN MoMo, Free Money', 'Smartphone'),
  ('c2222222-2222-2222-2222-222222222222', 'Télécoms & SMS', 'telecoms-sms', 'Passerelles SMS, accusés de réception, numérotation locale', 'MessageSquare'),
  ('c3333333-3333-3333-3333-333333333333', 'USSD & Vocaux', 'ussd-vocaux', 'Sessions USSD multi-niveaux, gestion des timeouts et menus', 'Hash'),
  ('c4444444-4444-4444-4444-444444444444', 'Réseau & Hors-ligne', 'reseau-offline', 'Gestion de connectivité intermittente, files locales, sync', 'WifiOff'),
  ('c5555555-5555-5555-5555-555555555555', 'Hébergement & Cloud', 'hebergement-cloud', 'Infrastructures régionales, latence, passerelles et proxies', 'Server')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description;

