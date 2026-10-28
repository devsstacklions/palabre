-- ===================================================================
-- PALABRE — Correctif de création de fiches, alignement profils et PostgREST
-- Coupe d'Afrique des Développeurs (CADev) 2026
-- ===================================================================
-- Cette migration résout :
--   1. L'erreur HTTP 409 Conflict lors de l'enregistrement de fiches par le compte B :
--      - Rétro-alimentation (backfill) des profils manquants pour les utilisateurs auth.users
--      - Politique RLS d'insertion permettant aux utilisateurs authentifiés d'insérer leur propre profil
--      - Auto-guérison (self-healing) dans le trigger set_new_fiche_defaults()
--      - Suppression de toute contrainte unique accidentelle sur les titres de fiches
--   2. L'alignement des clés étrangères vers public.profiles(id) pour PostgREST :
--      - Résolution définitive des erreurs PGRST200 sur fiches, commentaires, confirmations et variantes
-- ===================================================================

-- 1. POLITIQUE RLS INSERTION SUR PROFILES
-- Permettre à tout utilisateur authentifié d'insérer son propre profil s'il n'existe pas encore
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs authentifiés peuvent créer leur propre profil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. RÉTRO-ALIMENTATION (BACKFILL) DES PROFILS MANQUANTS
-- Crée un profil pour chaque utilisateur auth.users existant sans profil
INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
SELECT 
  u.id,
  coalesce(
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1),
    'dev_' || substr(u.id::text, 1, 8)
  ) AS username,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1),
    'Développeur'
  ) AS display_name,
  u.raw_user_meta_data->>'country' AS country,
  '{}'::TEXT[] AS tech_stack,
  TRUE AS is_public
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 3. SUPPRESSION DE TOUTE CONTRAINTE D'UNICITÉ ACCIDENTELLE SUR LES TITRES DE FICHES
-- Un même titre de solution peut être utilisé dans des contextes pays/opérateurs différents
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'fiches' AND constraint_name = 'fiches_title_key'
  ) THEN
    ALTER TABLE public.fiches DROP CONSTRAINT fiches_title_key;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'fiches' AND constraint_name = 'fiches_title_unique'
  ) THEN
    ALTER TABLE public.fiches DROP CONSTRAINT fiches_title_unique;
  END IF;

  DROP INDEX IF EXISTS public.fiches_title_key;
  DROP INDEX IF EXISTS public.idx_fiches_title_unique;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4. ALIGNEMENT DES CLÉS ÉTRANGÈRES VERS public.profiles(id) POUR POSTGREST
-- PostgREST requiert une contrainte de clé étrangère explicite vers public.profiles
-- pour résoudre les jointures imbriquées (author:profiles!author_id et user:profiles!user_id).

-- A. fiches.author_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'fiches' AND constraint_name = 'fiches_author_id_profiles_fkey'
  ) THEN
    -- Nettoyage préventif des orphelins avant contrainte si nécessaire
    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    SELECT DISTINCT f.author_id, 'dev_' || substr(f.author_id::text, 1, 8), 'Développeur', NULL, '{}'::TEXT[], TRUE
    FROM public.fiches f
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = f.author_id)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.fiches
      ADD CONSTRAINT fiches_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- B. fiche_confirmations.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'fiche_confirmations' AND constraint_name = 'fiche_confirmations_user_id_profiles_fkey'
  ) THEN
    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    SELECT DISTINCT fc.user_id, 'dev_' || substr(fc.user_id::text, 1, 8), 'Développeur', NULL, '{}'::TEXT[], TRUE
    FROM public.fiche_confirmations fc
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = fc.user_id)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.fiche_confirmations
      ADD CONSTRAINT fiche_confirmations_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- C. fiche_comments.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'fiche_comments' AND constraint_name = 'fiche_comments_user_id_profiles_fkey'
  ) THEN
    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    SELECT DISTINCT cm.user_id, 'dev_' || substr(cm.user_id::text, 1, 8), 'Développeur', NULL, '{}'::TEXT[], TRUE
    FROM public.fiche_comments cm
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cm.user_id)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.fiche_comments
      ADD CONSTRAINT fiche_comments_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- D. fiche_variants.author_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'fiche_variants' AND constraint_name = 'fiche_variants_author_id_profiles_fkey'
  ) THEN
    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    SELECT DISTINCT v.author_id, 'dev_' || substr(v.author_id::text, 1, 8), 'Développeur', NULL, '{}'::TEXT[], TRUE
    FROM public.fiche_variants v
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v.author_id)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.fiche_variants
      ADD CONSTRAINT fiche_variants_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- E. questions.author_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'questions' AND constraint_name = 'questions_author_id_profiles_fkey'
  ) THEN
    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    SELECT DISTINCT q.author_id, 'dev_' || substr(q.author_id::text, 1, 8), 'Développeur', NULL, '{}'::TEXT[], TRUE
    FROM public.questions q
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = q.author_id)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.questions
      ADD CONSTRAINT questions_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- F. question_answers.author_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'question_answers' AND constraint_name = 'question_answers_author_id_profiles_fkey'
  ) THEN
    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    SELECT DISTINCT qa.author_id, 'dev_' || substr(qa.author_id::text, 1, 8), 'Développeur', NULL, '{}'::TEXT[], TRUE
    FROM public.question_answers qa
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = qa.author_id)
    ON CONFLICT (id) DO NOTHING;

    ALTER TABLE public.question_answers
      ADD CONSTRAINT question_answers_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. TRIGGER AUTO-GUÉRISSEUR SUR FICHES (set_new_fiche_defaults)
-- Garantit que même si un utilisateur n'a pas encore de ligne dans profiles,
-- le trigger crée son profil immédiatement avant de vérifier la clé étrangère.
CREATE OR REPLACE FUNCTION public.set_new_fiche_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_user_meta JSONB;
  v_uname TEXT;
  v_dname TEXT;
  v_country TEXT;
BEGIN
  NEW.confirmations_count := 0;
  NEW.negative_feedback_count := 0;
  NEW.views_count := 0;
  NEW.comments_count := 0;
  NEW.verification_status := 'new';
  NEW.last_validated_at := NULL;

  -- Sécurisation de l'auteur :
  IF auth.uid() IS NOT NULL THEN
    IF NEW.author_id IS NULL OR (NEW.author_id <> auth.uid() AND NOT public.is_admin()) THEN
      NEW.author_id := auth.uid();
    END IF;
  ELSE
    IF NEW.author_id IS NULL THEN
      RAISE EXCEPTION 'author_id obligatoire.';
    END IF;
  END IF;

  -- AUTO-GUÉRISON DU PROFIL AUTEUR :
  -- Si le profil n'existe pas encore dans public.profiles, l'insérer automatiquement
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.author_id) THEN
    SELECT email, raw_user_meta_data INTO v_user_email, v_user_meta
    FROM auth.users
    WHERE id = NEW.author_id;

    v_uname := coalesce(
      v_user_meta->>'username',
      split_part(v_user_email, '@', 1),
      'dev_' || substr(NEW.author_id::text, 1, 8)
    );
    v_dname := coalesce(
      v_user_meta->>'display_name',
      v_user_meta->>'name',
      split_part(v_user_email, '@', 1),
      'Développeur'
    );
    v_country := v_user_meta->>'country';

    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_uname) THEN
      v_uname := v_uname || '_' || substr(NEW.author_id::text, 1, 5);
    END IF;

    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    VALUES (NEW.author_id, v_uname, v_dname, v_country, '{}'::TEXT[], TRUE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_new_fiche_defaults ON public.fiches;
CREATE TRIGGER tr_set_new_fiche_defaults
  BEFORE INSERT ON public.fiches
  FOR EACH ROW EXECUTE FUNCTION public.set_new_fiche_defaults();

-- 6. TRIGGER AUTO-GUÉRISSEUR SUR QUESTIONS (set_new_question_defaults)
CREATE OR REPLACE FUNCTION public.set_new_question_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
  v_user_meta JSONB;
  v_uname TEXT;
  v_dname TEXT;
  v_country TEXT;
BEGIN
  NEW.answers_count := 0;
  NEW.views_count := 0;
  NEW.accepted_answer_id := NULL;
  IF NEW.status = 'resolved' THEN
    NEW.status := 'open';
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF NEW.author_id IS NULL OR (NEW.author_id <> auth.uid() AND NOT public.is_admin()) THEN
      NEW.author_id := auth.uid();
    END IF;
  ELSE
    IF NEW.author_id IS NULL THEN
      RAISE EXCEPTION 'author_id obligatoire.';
    END IF;
  END IF;

  -- AUTO-GUÉRISON DU PROFIL AUTEUR POUR L'ENTRAIDE :
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.author_id) THEN
    SELECT email, raw_user_meta_data INTO v_user_email, v_user_meta
    FROM auth.users
    WHERE id = NEW.author_id;

    v_uname := coalesce(
      v_user_meta->>'username',
      split_part(v_user_email, '@', 1),
      'dev_' || substr(NEW.author_id::text, 1, 8)
    );
    v_dname := coalesce(
      v_user_meta->>'display_name',
      v_user_meta->>'name',
      split_part(v_user_email, '@', 1),
      'Développeur'
    );
    v_country := v_user_meta->>'country';

    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_uname) THEN
      v_uname := v_uname || '_' || substr(NEW.author_id::text, 1, 5);
    END IF;

    INSERT INTO public.profiles (id, username, display_name, country, tech_stack, is_public)
    VALUES (NEW.author_id, v_uname, v_dname, v_country, '{}'::TEXT[], TRUE)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_new_question_defaults ON public.questions;
CREATE TRIGGER tr_set_new_question_defaults
  BEFORE INSERT ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_new_question_defaults();

-- 7. NOTIFICATION DU RECHARGEMENT DU SCHÉMA POSTGREST
NOTIFY pgrst, 'reload schema';
