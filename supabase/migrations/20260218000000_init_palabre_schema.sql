-- ===================================================================
-- PALABRE â€” SchÃ©ma complet de la base de donnÃ©es PostgreSQL / Supabase
-- Coupe d'Afrique des DÃ©veloppeurs (CADev) 2026
-- ===================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- 2. PROFILS UTILISATEURS
-- L'adresse e-mail est protÃ©gÃ©e et conservÃ©e exclusivement dans auth.users pour Ã©viter tout scraping.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    country TEXT,
    bio TEXT,
    tech_stack TEXT[] DEFAULT '{}'::TEXT[],
    is_public BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 3. RÃ”LES ET PERMISSIONS
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'contributor', 'user')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

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

-- 4. CATÃ‰GORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. FICHES TECHNIQUES DE TERRAIN
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
    negative_feedback_count INTEGER NOT NULL DEFAULT 0 CHECK (negative_feedback_count >= 0),
    views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fiches_author ON public.fiches(author_id);
CREATE INDEX IF NOT EXISTS idx_fiches_country ON public.fiches(country);
CREATE INDEX IF NOT EXISTS idx_fiches_operator ON public.fiches(operator_service);
CREATE INDEX IF NOT EXISTS idx_fiches_language ON public.fiches(language);
CREATE INDEX IF NOT EXISTS idx_fiches_status ON public.fiches(status);
CREATE INDEX IF NOT EXISTS idx_fiches_verification ON public.fiches(verification_status);
CREATE INDEX IF NOT EXISTS idx_fiches_created_at ON public.fiches(created_at DESC);

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
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_fiche_confirmation UNIQUE (fiche_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_confirmations_fiche ON public.fiche_confirmations(fiche_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_user ON public.fiche_confirmations(user_id);

-- 7. COMMENTAIRES DES FICHES
CREATE TABLE IF NOT EXISTS public.fiche_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiche_id UUID NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) >= 2),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_fiche ON public.fiche_comments(fiche_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.fiche_comments(user_id);

-- 8. VARIANTES CONTEXTUELLES
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

-- 9. SIGNALEMENTS DE FICHES
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

-- 10. FAVORIS
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiche_id UUID NOT NULL REFERENCES public.fiches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_fiche_favorite UNIQUE (fiche_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_fiche ON public.favorites(fiche_id);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('confirmation', 'comment', 'report', 'variant', 'moderation', 'system')),
    fiche_id UUID REFERENCES public.fiches(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- 12. ESPACE ENTRAIDE TECHNIQUE
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(trim(title)) >= 5),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
    technology TEXT NOT NULL,
    language TEXT,
    framework TEXT,
    error_message TEXT,
    expected_result TEXT,
    tools_version TEXT,
    environment TEXT,
    code_snippet TEXT DEFAULT '',
    code_language TEXT DEFAULT 'plaintext',
    attachments TEXT[] DEFAULT '{}'::TEXT[],
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'in_progress', 'resolved', 'closed', 'hidden')),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_answer_id UUID,
    answers_count INTEGER NOT NULL DEFAULT 0 CHECK (answers_count >= 0),
    views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_author ON public.questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_technology ON public.questions(technology);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_questions_search ON public.questions USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(error_message, '') || ' ' || coalesce(technology, '') || ' ' || coalesce(framework, ''))
);

CREATE TABLE IF NOT EXISTS public.question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) >= 5),
    code_snippet TEXT DEFAULT '',
    code_language TEXT DEFAULT 'plaintext',
    is_solution BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answers_question ON public.question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_author ON public.question_answers(author_id);
CREATE INDEX IF NOT EXISTS idx_answers_solution ON public.question_answers(is_solution);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_questions_accepted_answer'
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT fk_questions_accepted_answer
      FOREIGN KEY (accepted_answer_id) REFERENCES public.question_answers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.question_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    answer_id UUID REFERENCES public.question_answers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'security_risk', 'wrong_category', 'other')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
    moderation_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_report_target CHECK (num_nonnulls(question_id, answer_id) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_solution_per_question
  ON public.question_answers(question_id)
  WHERE is_solution = TRUE;

CREATE INDEX IF NOT EXISTS idx_question_reports_status ON public.question_reports(status);
CREATE INDEX IF NOT EXISTS idx_question_reports_question ON public.question_reports(question_id);

-- CompatibilitÃ© de la table notifications pour l'entraide technique
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_question_id ON public.notifications(question_id);

-- ===================================================================
-- 13. TRIGGERS ET FONCTIONS AUTOMATIQUES
-- ===================================================================

-- Synchronisation automatique du profil Ã  l'inscription (sans e-mail public)
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

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(new.id::text, 1, 5);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, country, tech_stack)
  VALUES (
    new.id,
    v_username,
    v_display_name,
    new.raw_user_meta_data->>'country',
    ARRAY[]::TEXT[]
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ã‰valuation de la certification d'une fiche (RÃ¨gle serveur automatique)
CREATE OR REPLACE FUNCTION public.evaluate_fiche_status(p_fiche_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold CONSTANT INT := 3;
  v_positive_count INT;
  v_negative_count INT;
  v_open_reports INT;
  v_last_valid_date TIMESTAMPTZ;
  v_new_status TEXT;
BEGIN
  SELECT
    count(*) FILTER (WHERE is_working = TRUE),
    count(*) FILTER (WHERE is_working = FALSE),
    max(created_at) FILTER (WHERE is_working = TRUE)
  INTO v_positive_count, v_negative_count, v_last_valid_date
  FROM public.fiche_confirmations
  WHERE fiche_id = p_fiche_id;

  SELECT count(*) INTO v_open_reports
  FROM public.fiche_reports
  WHERE fiche_id = p_fiche_id AND status = 'open';

  IF (v_open_reports > 0 OR v_negative_count >= 2) THEN
    v_new_status := 'fl';
  ELSIF (v_positive_count >= v_threshold) THEN
    IF (v_last_valid_date < (now() - interval '90 days')) THEN
      v_new_status := 're';
    ELSE
      v_new_status := 'ok';
    END IF;
  ELSIF (v_positive_count > 0 AND v_last_valid_date < (now() - interval '90 days')) THEN
    v_new_status := 're';
  ELSE
    v_new_status := 'new';
  END IF;

  PERFORM set_config('palabre.internal_system_update', 'true', true);

  UPDATE public.fiches
  SET confirmations_count = v_positive_count,
      negative_feedback_count = v_negative_count,
      last_validated_at = v_last_valid_date,
      verification_status = v_new_status
  WHERE id = p_fiche_id;

  PERFORM set_config('palabre.internal_system_update', 'false', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.evaluate_fiche_status FROM PUBLIC, anon, authenticated;

-- Protection contre l'auto-confirmation par l'auteur
CREATE OR REPLACE FUNCTION public.check_fiche_confirmation_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id UUID;
BEGIN
  SELECT author_id INTO v_author_id FROM public.fiches WHERE id = NEW.fiche_id;
  IF v_author_id = NEW.user_id THEN
    RAISE EXCEPTION 'Un auteur ne peut pas confirmer sa propre fiche technique.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_check_fiche_confirmation_author ON public.fiche_confirmations;
CREATE TRIGGER tr_check_fiche_confirmation_author
  BEFORE INSERT OR UPDATE ON public.fiche_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.check_fiche_confirmation_author();

-- Trigger sur les confirmations
CREATE OR REPLACE FUNCTION public.handle_fiche_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fiche_id UUID;
  v_author_id UUID;
  v_fiche_title TEXT;
  v_confirmer_name TEXT;
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Si la fiche ciblÃ©e a changÃ© lors d'un UPDATE, rÃ©Ã©valuer l'ancienne ET la nouvelle
    IF (TG_OP = 'UPDATE' AND OLD.fiche_id IS DISTINCT FROM NEW.fiche_id) THEN
      PERFORM public.evaluate_fiche_status(OLD.fiche_id);
    END IF;

    PERFORM public.evaluate_fiche_status(NEW.fiche_id);

        IF (TG_OP = 'INSERT') THEN
          v_fiche_id := NEW.fiche_id;

          SELECT author_id, title
          INTO v_author_id, v_fiche_title
          FROM public.fiches
          WHERE id = v_fiche_id;

          IF (v_author_id IS NOT NULL AND v_author_id <> NEW.user_id) THEN
            SELECT display_name
            INTO v_confirmer_name
            FROM public.profiles
            WHERE id = NEW.user_id;

            INSERT INTO public.notifications (
              user_id, title, message, type, fiche_id
            )
            VALUES (
              v_author_id,
              CASE
                WHEN NEW.is_working THEN 'Nouvelle confirmation reçue'
                ELSE 'Retour négatif signalé'
              END,
              coalesce(v_confirmer_name, 'Un développeur')
                || ' a testé votre fiche "'
                || coalesce(v_fiche_title, 'Sans titre')
                || '" (' || NEW.country || ') : '
                || CASE
                  WHEN NEW.is_working THEN 'solution validée.'
                  ELSE 'échec ou obsolescence signalée.'
                END,
              'confirmation',
              v_fiche_id
            );
          END IF;
        END IF;
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_fiche_id := OLD.fiche_id;
    PERFORM public.evaluate_fiche_status(v_fiche_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_confirmation_change ON public.fiche_confirmations;
CREATE TRIGGER on_confirmation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.fiche_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_fiche_confirmation();

-- Trigger sur les commentaires
CREATE OR REPLACE FUNCTION public.handle_fiche_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fiche_id UUID;
  v_author_id UUID;
  v_fiche_title TEXT;
  v_commenter_name TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_fiche_id := NEW.fiche_id;

    UPDATE public.fiches
    SET comments_count = (SELECT count(*) FROM public.fiche_comments WHERE fiche_id = v_fiche_id)
    WHERE id = v_fiche_id;

    SELECT author_id, title INTO v_author_id, v_fiche_title FROM public.fiches WHERE id = v_fiche_id;
    IF (v_author_id IS NOT NULL AND v_author_id <> NEW.user_id) THEN
      SELECT display_name INTO v_commenter_name FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, title, message, type, fiche_id)
      VALUES (
        v_author_id,
        'Nouveau commentaire',
        coalesce(v_commenter_name, 'Un dÃ©veloppeur') || ' a commentÃ© votre fiche "' || v_fiche_title || '".',
        'comment',
        v_fiche_id
      );
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_fiche_id := OLD.fiche_id;
    UPDATE public.fiches
    SET comments_count = (SELECT count(*) FROM public.fiche_comments WHERE fiche_id = v_fiche_id)
    WHERE id = v_fiche_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_change ON public.fiche_comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.fiche_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_fiche_comment();

-- Trigger sur les signalements de fiches
CREATE OR REPLACE FUNCTION public.handle_fiche_report_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Si la fiche cible a Ã©tÃ© modifiÃ©e lors d'un UPDATE, rÃ©Ã©valuer l'ancienne ET la nouvelle fiche
    IF (TG_OP = 'UPDATE' AND OLD.fiche_id IS DISTINCT FROM NEW.fiche_id) THEN
      PERFORM public.evaluate_fiche_status(OLD.fiche_id);
    END IF;
    PERFORM public.evaluate_fiche_status(NEW.fiche_id);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.evaluate_fiche_status(OLD.fiche_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_fiche_reports_change ON public.fiche_reports;
CREATE TRIGGER tr_fiche_reports_change
  AFTER INSERT OR UPDATE OR DELETE ON public.fiche_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_fiche_report_change();

-- Protection contre la falsification des statuts et compteurs sur fiches
CREATE OR REPLACE FUNCTION public.protect_fiche_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- EmpÃªcher la rÃ©attribution d'auteur
  NEW.author_id := OLD.author_id;

  -- Vues : seul un incrÃ©ment unitaire (+1 via RPC increment_fiche_views) ou un administrateur est autorisÃ©
  IF NEW.views_count IS DISTINCT FROM OLD.views_count THEN
    IF NEW.views_count <> OLD.views_count + 1 AND NOT public.is_moderator_or_admin() THEN
      NEW.views_count := OLD.views_count;
    END IF;
  END IF;

  -- Les compteurs de confirmations, avis nÃ©gatifs et statut de vÃ©rification
  -- ne peuvent Ãªtre mis Ã  jour QUE par les dÃ©clencheurs internes (pg_trigger_depth() > 1)
  -- ou par un administrateur / modÃ©rateur
  IF pg_trigger_depth() > 1 OR public.is_moderator_or_admin() THEN
    RETURN NEW;
  END IF;

  NEW.confirmations_count := OLD.confirmations_count;
  NEW.negative_feedback_count := OLD.negative_feedback_count;
  NEW.comments_count := OLD.comments_count;
  NEW.verification_status := OLD.verification_status;
  NEW.last_validated_at := OLD.last_validated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_fiche_system_fields ON public.fiches;
CREATE TRIGGER tr_protect_fiche_system_fields
  BEFORE UPDATE ON public.fiches
  FOR EACH ROW EXECUTE FUNCTION public.protect_fiche_system_fields();

CREATE OR REPLACE FUNCTION public.set_new_fiche_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.confirmations_count := 0;
  NEW.negative_feedback_count := 0;
  NEW.views_count := 0;
  NEW.comments_count := 0;
  NEW.verification_status := 'new';
  NEW.last_validated_at := NULL;

  -- SÃ©curisation de l'auteur :
  IF auth.uid() IS NOT NULL THEN
    IF NEW.author_id IS NULL OR (NEW.author_id <> auth.uid() AND NOT public.is_admin()) THEN
      NEW.author_id := auth.uid();
    END IF;
  ELSE
    IF NEW.author_id IS NULL THEN
      RAISE EXCEPTION 'author_id obligatoire.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_new_fiche_defaults ON public.fiches;
CREATE TRIGGER tr_set_new_fiche_defaults
  BEFORE INSERT ON public.fiches
  FOR EACH ROW EXECUTE FUNCTION public.set_new_fiche_defaults();

-- IncrÃ©mentation atomique des consultations de fiche
CREATE OR REPLACE FUNCTION public.increment_fiche_views(p_fiche_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.fiches
  SET views_count = views_count + 1
  WHERE id = p_fiche_id AND status = 'published';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_fiche_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_fiche_views(UUID) TO anon, authenticated;

-- Mise Ã  jour automatique de updated_at
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

DROP TRIGGER IF EXISTS tr_questions_updated_at ON public.questions;
CREATE TRIGGER tr_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_question_answers_updated_at ON public.question_answers;
CREATE TRIGGER tr_question_answers_updated_at
  BEFORE UPDATE ON public.question_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Logique entraide : protection et initialisation des questions
CREATE OR REPLACE FUNCTION public.protect_question_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. EmpÃªcher la rÃ©attribution d'auteur
  NEW.author_id := OLD.author_id;

  -- 2. answers_count est TOUJOURS dÃ©rivÃ© de la rÃ©alitÃ© de la table question_answers
  NEW.answers_count := (
    SELECT count(*) FROM public.question_answers WHERE question_id = OLD.id
  );

  -- 3. Vues : seul un incrÃ©ment unitaire (+1 via RPC increment_question_views) ou un modÃ©rateur est autorisÃ©
  IF NEW.views_count IS DISTINCT FROM OLD.views_count THEN
    IF NEW.views_count <> OLD.views_count + 1 AND NOT public.is_moderator_or_admin() THEN
      NEW.views_count := OLD.views_count;
    END IF;
  END IF;

  -- 4. Protection de accepted_answer_id et du statut 'resolved'
  IF NEW.accepted_answer_id IS DISTINCT FROM OLD.accepted_answer_id
     OR (NEW.status = 'resolved' AND OLD.status <> 'resolved') THEN
    IF NEW.accepted_answer_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.question_answers
        WHERE id = NEW.accepted_answer_id
          AND question_id = OLD.id
          AND is_solution = TRUE
      ) OR (auth.uid() IS NOT NULL AND auth.uid() <> OLD.author_id AND NOT public.is_moderator_or_admin()) THEN
        NEW.accepted_answer_id := OLD.accepted_answer_id;
        IF OLD.status <> 'resolved' THEN
          NEW.status := OLD.status;
        END IF;
      END IF;
    ELSE
      -- Si accepted_answer_id est mis Ã  NULL, le statut ne peut pas rester 'resolved'
      IF NEW.status = 'resolved' THEN
        NEW.status := CASE WHEN NEW.answers_count > 0 THEN 'in_progress' ELSE 'open' END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_question_system_fields ON public.questions;
CREATE TRIGGER tr_protect_question_system_fields
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.protect_question_system_fields();

-- Protection du champ is_solution sur question_answers contre toute falsification directe
CREATE OR REPLACE FUNCTION public.protect_answer_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Une rÃ©ponse insÃ©rÃ©e ne peut jamais s'auto-dÃ©clarer solution dÃ¨s l'INSERT
    NEW.is_solution := FALSE;

    -- SÃ©curisation de l'auteur :
    IF auth.uid() IS NOT NULL THEN
      IF NEW.author_id IS NULL OR (NEW.author_id <> auth.uid() AND NOT public.is_admin()) THEN
        NEW.author_id := auth.uid();
      END IF;
    ELSE
      IF NEW.author_id IS NULL THEN
        RAISE EXCEPTION 'author_id obligatoire.';
      END IF;
    END IF;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- EmpÃªcher le dÃ©tournement de question_id ou d'auteur
    IF NOT public.is_admin() THEN
      NEW.question_id := OLD.question_id;
      NEW.author_id := OLD.author_id;
    END IF;

    -- is_solution : ne peut Ãªtre modifiÃ© QUE par l'auteur de la question parente ou un modÃ©rateur/admin
    IF NEW.is_solution IS DISTINCT FROM OLD.is_solution THEN
      IF NOT public.is_moderator_or_admin() THEN
        IF auth.uid() IS NULL OR NOT EXISTS (
          SELECT 1 FROM public.questions
          WHERE id = OLD.question_id AND author_id = auth.uid()
        ) THEN
          NEW.is_solution := OLD.is_solution;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_answer_system_fields ON public.question_answers;
CREATE TRIGGER tr_protect_answer_system_fields
  BEFORE INSERT OR UPDATE ON public.question_answers
  FOR EACH ROW EXECUTE FUNCTION public.protect_answer_system_fields();

CREATE OR REPLACE FUNCTION public.set_new_question_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_set_new_question_defaults ON public.questions;
CREATE TRIGGER tr_set_new_question_defaults
  BEFORE INSERT ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_new_question_defaults();

-- DÃ©compte atomique exact des rÃ©ponses et notifications sans race condition
CREATE OR REPLACE FUNCTION public.handle_question_answer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id UUID;
  v_author_id UUID;
  v_question_title TEXT;
  v_answerer_name TEXT;
  v_exact_count INT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_question_id := NEW.question_id;

    -- Verrouillage de la ligne de question parente pour sÃ©rialiser les calculs concurrents
    PERFORM 1 FROM public.questions WHERE id = v_question_id FOR UPDATE;

    SELECT count(*) INTO v_exact_count
    FROM public.question_answers
    WHERE question_id = v_question_id;

    UPDATE public.questions
    SET answers_count = v_exact_count,
        status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
    WHERE id = v_question_id;

    -- Notifier l'auteur de la question
    SELECT author_id, title INTO v_author_id, v_question_title
    FROM public.questions WHERE id = v_question_id;

    IF (v_author_id IS NOT NULL AND (auth.uid() IS NULL OR v_author_id <> NEW.author_id)) THEN
      SELECT display_name INTO v_answerer_name FROM public.profiles WHERE id = NEW.author_id;

      INSERT INTO public.notifications (user_id, title, message, type, question_id)
      VALUES (
        v_author_id,
        'Nouvelle rÃ©ponse Ã  votre problÃ¨me',
        coalesce(v_answerer_name, 'Un dÃ©veloppeur') || ' a rÃ©pondu Ã  votre problÃ¨me "' || v_question_title || '".',
        'comment',
        v_question_id
      );
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_question_id := OLD.question_id;

    -- Verrouillage de la ligne pour mise Ã  jour atomique
    PERFORM 1 FROM public.questions WHERE id = v_question_id FOR UPDATE;

    SELECT count(*) INTO v_exact_count
    FROM public.question_answers
    WHERE question_id = v_question_id;

    UPDATE public.questions
    SET answers_count = v_exact_count,
        accepted_answer_id = CASE WHEN accepted_answer_id = OLD.id THEN NULL ELSE accepted_answer_id END,
        status = CASE
          WHEN accepted_answer_id = OLD.id OR OLD.is_solution = TRUE THEN
            CASE WHEN v_exact_count > 0 THEN 'in_progress' ELSE 'open' END
          WHEN v_exact_count = 0 AND status NOT IN ('draft', 'hidden') THEN
            'open'
          ELSE status
        END
    WHERE id = v_question_id;

    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_question_answer_change ON public.question_answers;
CREATE TRIGGER tr_question_answer_change
  AFTER INSERT OR DELETE ON public.question_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_question_answer();

-- IncrÃ©mentation atomique et protÃ©gÃ©e des consultations de questions
CREATE OR REPLACE FUNCTION public.increment_question_views(p_question_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.questions
  SET views_count = views_count + 1
  WHERE id = p_question_id
    AND status NOT IN ('draft', 'hidden')
    AND (auth.uid() IS NULL OR author_id <> auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_question_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_question_views(UUID) TO anon, authenticated;

-- Marquer une rÃ©ponse comme solution validÃ©e
CREATE OR REPLACE FUNCTION public.mark_question_solution(
  p_question_id UUID,
  p_answer_id UUID,
  p_is_solution BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_author UUID;
  v_question_title TEXT;
  v_answer_author UUID;
BEGIN
  -- 1. Refuser strictement les appels anonymes
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifiÃ©. Seuls les utilisateurs connectÃ©s peuvent exÃ©cuter cette action.';
  END IF;

  -- 2. VÃ©rifier l'existence de la question
  SELECT author_id, title INTO v_question_author, v_question_title
  FROM public.questions
  WHERE id = p_question_id;

  IF v_question_author IS NULL THEN
    RAISE EXCEPTION 'Question introuvable.';
  END IF;

  -- 3. Autoriser uniquement l'auteur de la question ou un modÃ©rateur/admin
  IF (auth.uid() <> v_question_author AND NOT public.is_moderator_or_admin()) THEN
    RAISE EXCEPTION 'Seul l''auteur de la question ou un modÃ©rateur peut valider la solution.';
  END IF;

  -- 4. Exiger une rÃ©ponse valide et vÃ©rifier qu'elle appartient bien Ã  cette question
  IF p_answer_id IS NULL THEN
    RAISE EXCEPTION 'Identifiant de rÃ©ponse invalide.';
  END IF;

  SELECT author_id INTO v_answer_author
  FROM public.question_answers
  WHERE id = p_answer_id AND question_id = p_question_id;

  IF v_answer_author IS NULL THEN
    RAISE EXCEPTION 'RÃ©ponse introuvable ou non associÃ©e Ã  cette question.';
  END IF;

  -- 5. Verrouiller la question parente pour sÃ©rialiser les appels concurrents
  PERFORM 1 FROM public.questions WHERE id = p_question_id FOR UPDATE;

  IF p_is_solution THEN
    -- RÃ©initialiser toute autre rÃ©ponse marquÃ©e solution pour cette question
    UPDATE public.question_answers
    SET is_solution = FALSE
    WHERE question_id = p_question_id AND id <> p_answer_id AND is_solution = TRUE;

    -- Valider la rÃ©ponse choisie
    UPDATE public.question_answers
    SET is_solution = TRUE
    WHERE id = p_answer_id;

    -- Mettre Ã  jour la question au statut 'resolved'
    UPDATE public.questions
    SET status = 'resolved',
        accepted_answer_id = p_answer_id
    WHERE id = p_question_id;

    -- Notifier l'auteur de la rÃ©ponse acceptÃ©e (sauf s'il est l'auteur de la question)
    IF (v_answer_author IS NOT NULL AND v_answer_author <> auth.uid()) THEN
      INSERT INTO public.notifications (user_id, title, message, type, question_id)
      VALUES (
        v_answer_author,
        'Votre rÃ©ponse a Ã©tÃ© acceptÃ©e comme solution !',
        'Votre rÃ©ponse Ã  la question "' || v_question_title || '" a Ã©tÃ© validÃ©e par son auteur.',
        'confirmation',
        p_question_id
      );
    END IF;
  ELSE
    -- Retirer le statut de solution sur la rÃ©ponse ciblÃ©e
    UPDATE public.question_answers
    SET is_solution = FALSE
    WHERE id = p_answer_id;

    -- Remettre Ã  jour le statut de la question
    UPDATE public.questions
    SET status = CASE WHEN answers_count > 0 THEN 'in_progress' ELSE 'open' END,
        accepted_answer_id = NULL
    WHERE id = p_question_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_question_solution(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_question_solution(UUID, UUID, BOOLEAN) TO authenticated;

-- ===================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiche_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiche_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiche_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiche_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

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
DROP POLICY IF EXISTS "Lecture de ses propres rÃ´les ou par les admins" ON public.user_roles;
CREATE POLICY "Lecture de ses propres rÃ´les ou par les admins"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Seuls les admins peuvent insÃ©rer ou modifier des rÃ´les" ON public.user_roles;
CREATE POLICY "Seuls les admins peuvent insÃ©rer ou modifier des rÃ´les"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- POLITIQUES : CATEGORIES
DROP POLICY IF EXISTS "Lecture publique des catÃ©gories" ON public.categories;
CREATE POLICY "Lecture publique des catÃ©gories"
  ON public.categories FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les catÃ©gories" ON public.categories;
CREATE POLICY "Seuls les admins peuvent modifier les catÃ©gories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- POLITIQUES : FICHES
DROP POLICY IF EXISTS "Lecture des fiches publiÃ©es non masquÃ©es" ON public.fiches;
CREATE POLICY "Lecture des fiches publiÃ©es non masquÃ©es"
  ON public.fiches FOR SELECT
  USING (
    status = 'published'
    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
    OR public.is_moderator_or_admin()
  );

DROP POLICY IF EXISTS "Les utilisateurs authentifiÃ©s peuvent crÃ©er des fiches" ON public.fiches;
CREATE POLICY "Les utilisateurs authentifiÃ©s peuvent crÃ©er des fiches"
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

DROP POLICY IF EXISTS "Les utilisateurs authentifiÃ©s peuvent confirmer une fiche" ON public.fiche_confirmations;
CREATE POLICY "Les utilisateurs authentifiÃ©s peuvent confirmer une fiche"
  ON public.fiche_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut modifier son avis" ON public.fiche_confirmations;
CREATE POLICY "Un utilisateur peut modifier son avis"
  ON public.fiche_confirmations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut retirer sa propre confirmation" ON public.fiche_confirmations;
CREATE POLICY "Un utilisateur peut retirer sa propre confirmation"
  ON public.fiche_confirmations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- POLITIQUES : COMMENTAIRES
DROP POLICY IF EXISTS "Lecture publique des commentaires" ON public.fiche_comments;
CREATE POLICY "Lecture publique des commentaires"
  ON public.fiche_comments FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Les utilisateurs authentifiÃ©s peuvent poster des commentaires" ON public.fiche_comments;
CREATE POLICY "Les utilisateurs authentifiÃ©s peuvent poster des commentaires"
  ON public.fiche_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut modifier son commentaire" ON public.fiche_comments;
CREATE POLICY "Un utilisateur peut modifier son commentaire"
  ON public.fiche_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut supprimer son commentaire ou les admins" ON public.fiche_comments;
CREATE POLICY "Un utilisateur peut supprimer son commentaire ou les admins"
  ON public.fiche_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator_or_admin());

-- POLITIQUES : VARIANTES
DROP POLICY IF EXISTS "Lecture publique des variantes" ON public.fiche_variants;
CREATE POLICY "Lecture publique des variantes"
  ON public.fiche_variants FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Les utilisateurs connectÃ©s peuvent ajouter des variantes" ON public.fiche_variants;
CREATE POLICY "Les utilisateurs connectÃ©s peuvent ajouter des variantes"
  ON public.fiche_variants FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Un utilisateur peut modifier ou supprimer sa variante" ON public.fiche_variants;
CREATE POLICY "Un utilisateur peut modifier ou supprimer sa variante"
  ON public.fiche_variants FOR ALL
  TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_moderator_or_admin());

-- POLITIQUES : SIGNALEMENTS DE FICHES
DROP POLICY IF EXISTS "Les utilisateurs peuvent crÃ©er des signalements" ON public.fiche_reports;
CREATE POLICY "Les utilisateurs peuvent crÃ©er des signalements"
  ON public.fiche_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Lecture des signalements : auteur ou modÃ©rateur/admin" ON public.fiche_reports;
CREATE POLICY "Lecture des signalements : auteur ou modÃ©rateur/admin"
  ON public.fiche_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator_or_admin());

DROP POLICY IF EXISTS "Seuls les modÃ©rateurs ou admins peuvent traiter les signalements" ON public.fiche_reports;
CREATE POLICY "Seuls les modÃ©rateurs ou admins peuvent traiter les signalements"
  ON public.fiche_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());

-- POLITIQUES : FAVORIS
DROP POLICY IF EXISTS "Les utilisateurs ont un accÃ¨s exclusif Ã  leurs favoris" ON public.favorites;
CREATE POLICY "Les utilisateurs ont un accÃ¨s exclusif Ã  leurs favoris"
  ON public.favorites FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- POLITIQUES : NOTIFICATIONS
DROP POLICY IF EXISTS "Les utilisateurs ont un accÃ¨s exclusif Ã  leurs notifications" ON public.notifications;
CREATE POLICY "Les utilisateurs ont un accÃ¨s exclusif Ã  leurs notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- POLITIQUES : QUESTIONS
DROP POLICY IF EXISTS "Lecture des questions publiques et actives" ON public.questions;
CREATE POLICY "Lecture des questions publiques et actives"
  ON public.questions FOR SELECT
  USING (
    status NOT IN ('draft', 'hidden')
    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
    OR public.is_moderator_or_admin()
  );

DROP POLICY IF EXISTS "CrÃ©ation de questions par les utilisateurs connectÃ©s" ON public.questions;
CREATE POLICY "CrÃ©ation de questions par les utilisateurs connectÃ©s"
  ON public.questions FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Modification de ses propres questions ou par modÃ©rateur" ON public.questions;
CREATE POLICY "Modification de ses propres questions ou par modÃ©rateur"
  ON public.questions FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_moderator_or_admin());

DROP POLICY IF EXISTS "Suppression de ses propres questions ou par admin" ON public.questions;
CREATE POLICY "Suppression de ses propres questions ou par admin"
  ON public.questions FOR DELETE
  TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_admin()
  );

-- POLITIQUES : QUESTION_ANSWERS
DROP POLICY IF EXISTS "Lecture publique des rÃ©ponses" ON public.question_answers;
CREATE POLICY "Lecture publique des rÃ©ponses"
  ON public.question_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id
      AND (
        q.status NOT IN ('draft', 'hidden')
        OR (auth.uid() IS NOT NULL AND q.author_id = auth.uid())
        OR public.is_moderator_or_admin()
      )
    )
  );

DROP POLICY IF EXISTS "CrÃ©ation de rÃ©ponses par les utilisateurs connectÃ©s" ON public.question_answers;
CREATE POLICY "CrÃ©ation de rÃ©ponses par les utilisateurs connectÃ©s"
  ON public.question_answers FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Modification de sa rÃ©ponse ou par modÃ©rateur" ON public.question_answers;
CREATE POLICY "Modification de sa rÃ©ponse ou par modÃ©rateur"
  ON public.question_answers FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_moderator_or_admin());

DROP POLICY IF EXISTS "Suppression de sa propre rÃ©ponse ou par admin" ON public.question_answers;
CREATE POLICY "Suppression de sa propre rÃ©ponse ou par admin"
  ON public.question_answers FOR DELETE
  TO authenticated
  USING (author_id = auth.uid() OR public.is_moderator_or_admin());

-- POLITIQUES : QUESTION_REPORTS
DROP POLICY IF EXISTS "CrÃ©ation de signalements par les utilisateurs" ON public.question_reports;
CREATE POLICY "CrÃ©ation de signalements par les utilisateurs"
  ON public.question_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Lecture des signalements : auteur ou modÃ©rateur" ON public.question_reports;
CREATE POLICY "Lecture des signalements : auteur ou modÃ©rateur"
  ON public.question_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_moderator_or_admin());

DROP POLICY IF EXISTS "Traitement des signalements par les modÃ©rateurs" ON public.question_reports;
CREATE POLICY "Traitement des signalements par les modÃ©rateurs"
  ON public.question_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());

-- ===================================================================
-- 15. BUCKET SUPABASE STORAGE POUR LES CAPTURES D'Ã‰CRAN
-- ===================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entraide-attachments',
  'entraide-attachments',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Lecture publique des captures d'entraide" ON storage.objects;
CREATE POLICY "Lecture publique des captures d'entraide"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entraide-attachments');

DROP POLICY IF EXISTS "TÃ©lÃ©versement par les utilisateurs authentifiÃ©s" ON storage.objects;
CREATE POLICY "TÃ©lÃ©versement par les utilisateurs authentifiÃ©s"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'entraide-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Suppression de ses captures par l'utilisateur ou admin" ON storage.objects;
CREATE POLICY "Suppression de ses captures par l'utilisateur ou admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'entraide-attachments'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
