-- ===================================================================

-- PALABRE — Schéma complet de la base de données PostgreSQL / Supabase

-- Coupe d'Afrique des Développeurs (CADev) 2026

-- ===================================================================

-- 1. EXTENSIONS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. PROFILS UTILISATEURS

CREATE TABLE IF NOT EXISTS public.profiles (

    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    username TEXT UNIQUE,

    display_name TEXT NOT NULL,

    avatar_url TEXT,

    country TEXT,

    bio TEXT,

    tech_stack TEXT[] DEFAULT '{}'::TEXT[],

    is_public BOOLEAN DEFAULT TRUE NOT NULL,

    email TEXT,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL

);

-- Index pour recherche de profils

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. RÔLES ET PERMISSIONS

CREATE TABLE IF NOT EXISTS public.user_roles (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'contributor', 'user')),

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT unique_user_role UNIQUE (user_id, role)

);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Fonctions de sécurité pour vérifier les rôles sans exposer les tables

CREATE OR REPLACE FUNCTION public.is_admin()

RETURNS BOOLEAN

LANGUAGE sql

SECURITY DEFINER

SET search_path = public

STABLE

AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.user_roles

    WHERE user_id = auth.uid() AND role = 'admin'

  );

$$;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()

RETURNS BOOLEAN

LANGUAGE sql

SECURITY DEFINER

SET search_path = public

STABLE

AS $$

  SELECT EXISTS (

    SELECT 1 FROM public.user_roles

    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')

  );

$$;

-- 4. CATÉGORIES

CREATE TABLE IF NOT EXISTS public.categories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL UNIQUE,

    slug TEXT NOT NULL UNIQUE,

    description TEXT,

    icon TEXT,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL

);

-- 5. FICHES TECHNIQUES

CREATE TABLE IF NOT EXISTS public.fiches (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL CHECK (char_length(title) >= 5),

    short_description TEXT NOT NULL,

    problem TEXT NOT NULL,

    prerequisites TEXT,

    steps TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    code_snippet TEXT DEFAULT '',

    language TEXT NOT NULL,

    country TEXT NOT NULL,

    operator_service TEXT NOT NULL,

    api_version TEXT DEFAULT '',

    frequent_errors TEXT DEFAULT '',

    known_limits TEXT DEFAULT '',

    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'archived', 'hidden')),

    verification_status TEXT NOT NULL DEFAULT 'new' CHECK (verification_status IN ('ok', 're', 'fl', 'new')),

    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    confirmations_count INTEGER NOT NULL DEFAULT 0 CHECK (confirmations_count >= 0),

    last_validated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL

);

-- Index de performance

CREATE INDEX IF NOT EXISTS idx_fiches_author ON public.fiches(author_id);

CREATE INDEX IF NOT EXISTS idx_fiches_country ON public.fiches(country);

CREATE INDEX IF NOT EXISTS idx_fiches_operator ON public.fiches(operator_service);

CREATE INDEX IF NOT EXISTS idx_fiches_language ON public.fiches(language);

CREATE INDEX IF NOT EXISTS idx_fiches_status ON public.fiches(status);

CREATE INDEX IF NOT EXISTS idx_fiches_verification ON public.fiches(verification_status);

CREATE INDEX IF NOT EXISTS idx_fiches_created_at ON public.fiches(created_at DESC);

-- Index textuel pour recherche rapide

CREATE INDEX IF NOT EXISTS idx_fiches_search ON public.fiches USING gin(

  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(problem, '') || ' ' || coalesce(operator_service, '') || ' ' || coalesce(country, '') || ' ' || coalesce(language, ''))

);

-- 6. CONFIRMATIONS COMMUNAUTAIRES

CREATE TABLE IF NOT EXISTS public.fiche_confirmations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fiche_id UUID NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    country TEXT NOT NULL,

    operator_service TEXT NOT NULL,

    tested_version TEXT DEFAULT '',

    test_context TEXT DEFAULT '',

    comment TEXT,

    is_working BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT unique_user_fiche_context UNIQUE (fiche_id, user_id, country, operator_service)

);

CREATE INDEX IF NOT EXISTS idx_confirmations_fiche ON public.fiche_confirmations(fiche_id);

CREATE INDEX IF NOT EXISTS idx_confirmations_user ON public.fiche_confirmations(user_id);

-- 7. VARIANTES CONTEXTUELLES

CREATE TABLE IF NOT EXISTS public.fiche_variants (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fiche_id UUID NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,

    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    country TEXT NOT NULL,

    operator_service TEXT NOT NULL,

    differences TEXT NOT NULL,

    code_snippet TEXT DEFAULT '',

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL

);

CREATE INDEX IF NOT EXISTS idx_variants_fiche ON public.fiche_variants(fiche_id);

CREATE INDEX IF NOT EXISTS idx_variants_author ON public.fiche_variants(author_id);

-- 8. SIGNALEMENTS

CREATE TABLE IF NOT EXISTS public.fiche_reports (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fiche_id UUID NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    reason TEXT NOT NULL CHECK (reason IN ('misleading', 'version_incompatibility', 'obsolete', 'security_risk', 'other')),

    description TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),

    moderation_notes TEXT,

    reviewed_by UUID REFERENCES auth.users(id),

    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL

);

CREATE INDEX IF NOT EXISTS idx_reports_fiche ON public.fiche_reports(fiche_id);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.fiche_reports(status);

-- 9. FAVORIS

CREATE TABLE IF NOT EXISTS public.favorites (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fiche_id UUID NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,

    CONSTRAINT unique_user_fiche_favorite UNIQUE (fiche_id, user_id)

);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_fiche ON public.favorites(fiche_id);

-- 10. NOTIFICATIONS

CREATE TABLE IF NOT EXISTS public.notifications (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    type TEXT NOT NULL CHECK (type IN ('confirmation', 'report', 'variant', 'moderation', 'system')),

    fiche_id UUID REFERENCES public.fiches(id) ON DELETE CASCADE,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL

);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- ===================================================================

-- 11. TRIGGERS ET FONCTIONS AUTOMATIQUES

-- ===================================================================

-- A. Synchronisation automatique du profil à l'inscription

CREATE OR REPLACE FUNCTION public.handle_new_user()

RETURNS TRIGGER

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  v_username TEXT;

  v_display_name TEXT;

BEGIN

  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));

  v_display_name := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', v_username);

  *-- Vérifier si le username existe déjà, sinon ajouter un suffixe*

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN

    v_username := v_username || '_' || substr(new.id::text, 1, 5);

  END IF;

  INSERT INTO public.profiles (id, username, display_name, email, country, tech_stack)

  VALUES (

    new.id,

    v_username,

    v_display_name,

    new.email,

    new.raw_user_meta_data->>'country',

    ARRAY[]::TEXT[]

  )

  ON CONFLICT (id) DO UPDATE

  SET email = EXCLUDED.email;

  RETURN new;

END;

$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created

  AFTER INSERT ON auth.users

  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Gestion des confirmations et mise à jour des statistiques de fiche

CREATE OR REPLACE FUNCTION public.handle_fiche_confirmation()

RETURNS TRIGGER

LANGUAGE plpgsql

SECURITY DEFINER

SET search_path = public

AS $$

DECLARE

  v_author_id UUID;

  v_fiche_title TEXT;

  v_confirmer_name TEXT;

  v_count INT;

BEGIN

  IF (TG_OP = 'INSERT') THEN

    *-- Mettre à jour le compteur et la date de dernière validation*

    SELECT count(*), max(created_at) INTO v_count

    FROM public.fiche_confirmations

    WHERE fiche_id = NEW.fiche_id AND is_working = TRUE;

    UPDATE public.fiches

    SET confirmations_count = (SELECT count(*) FROM public.fiche_confirmations WHERE fiche_id = NEW.fiche_id),

        last_validated_at = NEW.created_at,

        verification_status = CASE

          WHEN verification_status = 'fl' THEN 'fl'

          WHEN (SELECT count(*) FROM public.fiche_confirmations WHERE fiche_id = NEW.fiche_id) >= 3 THEN 'ok'

          ELSE 'new'

        END

    WHERE id = NEW.fiche_id

    RETURNING author_id, title INTO v_author_id, v_fiche_title;

    *-- Notifier l'auteur de la fiche (sauf si c'est lui-même)*

    IF v_author_id IS NOT NULL AND v_author_id <> NEW.user_id THEN

      SELECT display_name INTO v_confirmer_name FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, title, message, type, fiche_id)

      VALUES (

        v_author_id,

        'Nouvelle confirmation reçue',

        coalesce(v_confirmer_name, 'Un développeur') || ' a confirmé votre fiche "' || v_fiche_title || '" (' || NEW.country || ' - ' || NEW.operator_service || ').',

        'confirmation',

        NEW.fiche_id

      );

    END IF;

    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN

    UPDATE public.fiches

    SET confirmations_count = (SELECT count(*) FROM public.fiche_confirmations WHERE fiche_id = OLD.fiche_id)

    WHERE id = OLD.fiche_id;

    RETURN OLD;

  END IF;

  RETURN NULL;

END;

$$;

DROP TRIGGER IF EXISTS on_confirmation_change ON public.fiche_confirmations;

CREATE TRIGGER on_confirmation_change

  AFTER INSERT OR DELETE ON public.fiche_confirmations

  FOR EACH ROW EXECUTE FUNCTION public.handle_fiche_confirmation();

-- C. Mise à jour automatique de updated_at

CREATE OR REPLACE FUNCTION public.set_updated_at()

RETURNS TRIGGER

LANGUAGE plpgsql

AS $$

BEGIN

  NEW.updated_at = timezone('utc'::text, now());

  RETURN NEW;

END;

$$;

DROP TRIGGER IF EXISTS tr_fiches_updated_at ON public.fiches;

CREATE TRIGGER tr_fiches_updated_at

  BEFORE UPDATE ON public.fiches

  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;

CREATE TRIGGER tr_profiles_updated_at

  BEFORE UPDATE ON public.profiles

  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===================================================================

-- 12. ROW LEVEL SECURITY (RLS) POLICIES

-- ===================================================================

-- Activer RLS sur toutes les tables

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fiches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fiche_confirmations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fiche_variants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fiche_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLITIQUES : PROFILES

DROP POLICY IF EXISTS "Les profils publics sont consultables par tous" ON public.profiles;

CREATE POLICY "Les profils publics sont consultables par tous"

  ON public.profiles FOR SELECT

  USING (is_public = TRUE OR auth.uid() = id);

DROP POLICY IF EXISTS "Un utilisateur peut modifier son propre profil" ON public.profiles;

CREATE POLICY "Un utilisateur peut modifier son propre profil"

  ON public.profiles FOR UPDATE

  TO authenticated

  USING (auth.uid() = id)

  WITH CHECK (auth.uid() = id);

-- POLITIQUES : USER_ROLES

DROP POLICY IF EXISTS "Lecture de ses propres rôles ou par les admins" ON public.user_roles;

CREATE POLICY "Lecture de ses propres rôles ou par les admins"

  ON public.user_roles FOR SELECT

  TO authenticated

  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Seuls les admins peuvent insérer ou modifier des rôles" ON public.user_roles;

CREATE POLICY "Seuls les admins peuvent insérer ou modifier des rôles"

  ON public.user_roles FOR ALL

  TO authenticated

  USING (public.is_admin())

  WITH CHECK (public.is_admin());

-- POLITIQUES : CATEGORIES

DROP POLICY IF EXISTS "Lecture publique des catégories" ON public.categories;

CREATE POLICY "Lecture publique des catégories"

  ON public.categories FOR SELECT

  USING (TRUE);

DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les catégories" ON public.categories;

CREATE POLICY "Seuls les admins peuvent modifier les catégories"

  ON public.categories FOR ALL

  TO authenticated

  USING (public.is_admin())

  WITH CHECK (public.is_admin());

-- POLITIQUES : FICHES

DROP POLICY IF EXISTS "Lecture des fiches publiées non masquées" ON public.fiches;

CREATE POLICY "Lecture des fiches publiées non masquées"

  ON public.fiches FOR SELECT

  USING (

    status = 'published'

    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())

    OR public.is_moderator_or_admin()

  );

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des fiches" ON public.fiches;

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des fiches"

  ON public.fiches FOR INSERT

  TO authenticated

  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Les auteurs peuvent modifier leurs fiches, les admins aussi" ON public.fiches;

CREATE POLICY "Les auteurs peuvent modifier leurs fiches, les admins aussi"

  ON public.fiches FOR UPDATE

  TO authenticated

  USING (author_id = auth.uid() OR public.is_moderator_or_admin())

  WITH CHECK (author_id = auth.uid() OR public.is_moderator_or_admin());

DROP POLICY IF EXISTS "Les auteurs peuvent supprimer leurs brouillons, les admins tout" ON public.fiches;

CREATE POLICY "Les auteurs peuvent supprimer leurs brouillons, les admins tout"

  ON public.fiches FOR DELETE

  TO authenticated

  USING (

    (author_id = auth.uid() AND status = 'draft')

    OR public.is_admin()

  );

-- POLITIQUES : CONFIRMATIONS

DROP POLICY IF EXISTS "Lecture publique des confirmations" ON public.fiche_confirmations;

CREATE POLICY "Lecture publique des confirmations"

  ON public.fiche_confirmations FOR SELECT

  USING (TRUE);

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent confirmer une fiche" ON public.fiche_confirmations;

CREATE POLICY "Les utilisateurs authentifiés peuvent confirmer une fiche"

  ON public.fiche_confirmations FOR INSERT

  TO authenticated

  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut supprimer sa propre confirmation" ON public.fiche_confirmations;

CREATE POLICY "Un utilisateur peut supprimer sa propre confirmation"

  ON public.fiche_confirmations FOR DELETE

  TO authenticated

  USING (user_id = auth.uid() OR public.is_admin());

-- POLITIQUES : VARIANTES

DROP POLICY IF EXISTS "Lecture publique des variantes" ON public.fiche_variants;

CREATE POLICY "Lecture publique des variantes"

  ON public.fiche_variants FOR SELECT

  USING (TRUE);

DROP POLICY IF EXISTS "Les utilisateurs connectés peuvent ajouter des variantes" ON public.fiche_variants;

CREATE POLICY "Les utilisateurs connectés peuvent ajouter des variantes"

  ON public.fiche_variants FOR INSERT

  TO authenticated

  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut modifier ou supprimer sa variante" ON public.fiche_variants;

CREATE POLICY "Un utilisateur peut modifier ou supprimer sa variante"

  ON public.fiche_variants FOR ALL

  TO authenticated

  USING (author_id = auth.uid() OR public.is_moderator_or_admin())

  WITH CHECK (author_id = auth.uid() OR public.is_moderator_or_admin());

-- POLITIQUES : SIGNALEMENTS

DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des signalements" ON public.fiche_reports;

CREATE POLICY "Les utilisateurs peuvent créer des signalements"

  ON public.fiche_reports FOR INSERT

  TO authenticated

  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Lecture des signalements : auteur ou modérateur/admin" ON public.fiche_reports;

CREATE POLICY "Lecture des signalements : auteur ou modérateur/admin"

  ON public.fiche_reports FOR SELECT

  TO authenticated

  USING (user_id = auth.uid() OR public.is_moderator_or_admin());

DROP POLICY IF EXISTS "Seuls les modérateurs ou admins peuvent traiter les signalements" ON public.fiche_reports;

CREATE POLICY "Seuls les modérateurs ou admins peuvent traiter les signalements"

  ON public.fiche_reports FOR UPDATE

  TO authenticated

  USING (public.is_moderator_or_admin())

  WITH CHECK (public.is_moderator_or_admin());

-- POLITIQUES : FAVORIS

DROP POLICY IF EXISTS "Les utilisateurs ont un accès exclusif à leurs favoris" ON public.favorites;

CREATE POLICY "Les utilisateurs ont un accès exclusif à leurs favoris"

  ON public.favorites FOR ALL

  TO authenticated

  USING (user_id = auth.uid())

  WITH CHECK (user_id = auth.uid());

-- POLITIQUES : NOTIFICATIONS

DROP POLICY IF EXISTS "Les utilisateurs ont un accès exclusif à leurs notifications" ON public.notifications;

CREATE POLICY "Les utilisateurs ont un accès exclusif à leurs notifications"

  ON public.notifications FOR ALL

  TO authenticated

  USING (user_id = auth.uid())

  WITH CHECK (user_id = auth.uid());
