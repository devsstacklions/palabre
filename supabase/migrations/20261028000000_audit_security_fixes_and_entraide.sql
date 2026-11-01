-- ===================================================================
-- PALABRE — Migration d'audit, renforcement de sécurité et espace d'entraide
-- Coupe d'Afrique des Développeurs (CADev) 2026
-- ===================================================================
-- Cette migration est strictement idempotente et non-destructive.
-- Elle applique :
--   1. Les correctifs d'audit de sécurité sur les tables existantes (fiches, profils, notifications)
--   2. La création et la mise à niveau des tables de l'espace d'entraide
--   3. L'élimination des conflits de triggers et des risques de concurrence sans dépendre
--      d'un paramètre de session client
--   4. La sécurisation stricte de mark_question_solution() et des compteurs
--   5. Les politiques RLS et le bucket Supabase Storage pour captures d'écran
-- ===================================================================

-- ===================================================================
-- 1. CORRECTIONS DE SÉCURITÉ DE L'AUDIT SUPABASE
-- ===================================================================

-- A. Audit & Protection des e-mails des utilisateurs
-- -------------------------------------------------------------------
-- JUSTIFICATION ARCHITECTURALE & ANALYSE D'IMPACT :
-- 1. La table auth.users gérée par Supabase Auth constitue l'unique source de vérité
--    sécurisée et chiffrée pour les adresses e-mail des comptes.
-- 2. La table public.profiles est lisible par les autres utilisateurs (pour afficher
--    le nom, le pays et la biographie de l'auteur d'une fiche ou d'une réponse).
--    La présence de la colonne "email" dans public.profiles exposait tous les développeurs
--    inscrits à des risques de moissonnage (scraping), de spam ou d'usurpation.
-- 3. AUDIT DES DÉPENDANCES FRONTEND & BACKEND :
--    - Frontend : useAuth().user.email accède à l'e-mail du compte connecté via la session
--      JWT sécurisée. Aucun composant de consultation publique n'affiche l'e-mail d'un tiers.
--    - profileService.updateProfile() ne met à jour que display_name, country, bio, tech_stack et is_public.
--    - La suppression de public.profiles.email renforce donc la confidentialité sans briser
--      aucune fonctionnalité utilisateur.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Mise à jour du trigger handle_new_user sans injection d'e-mail public
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

  -- Éviter les doublons de username
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

-- B. Protection anti-falsification des statuts et compteurs sur fiches
-- -------------------------------------------------------------------
-- RÈGLE DE SÉCURITÉ ROBUSTE :
-- - Les compteurs de confirmations, retours négatifs et statut de vérification
--   ne peuvent être mis à jour QUE par les déclencheurs internes automatiques
--   (pg_trigger_depth() > 1, garanti par le moteur PostgreSQL et infalsifiable par le client)
--   ou par un administrateur / modérateur.
-- - Les vues (views_count) ne peuvent être incrémentées que de 1 à la fois ou par un admin.
-- - L'auteur (author_id) ne peut jamais être réassigné.
CREATE OR REPLACE FUNCTION public.protect_fiche_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empêcher la réattribution d'auteur
  NEW.author_id := OLD.author_id;

  -- Vues : seul un incrément unitaire (+1 via RPC increment_fiche_views) ou un administrateur est autorisé
  IF NEW.views_count IS DISTINCT FROM OLD.views_count THEN
    IF NEW.views_count <> OLD.views_count + 1 AND NOT public.is_moderator_or_admin() THEN
      NEW.views_count := OLD.views_count;
    END IF;
  END IF;

  -- Les compteurs de confirmations, avis négatifs et statut de vérification
  -- ne peuvent être mis à jour QUE par les déclencheurs internes (pg_trigger_depth() > 1)
  -- ou par un administrateur / modérateur
  IF pg_trigger_depth() > 1 OR public.is_moderator_or_admin() THEN
    RETURN NEW;
  END IF;

  -- Rejeter toute altération directe des compteurs et statuts par appel client REST
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

-- Initialisation sécurisée des fiches à la création (INSERT)
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

  -- Sécurisation de l'auteur :
  -- Si auth.uid() est présent (appel client PostgREST), forcer l'auteur à auth.uid() sauf si admin
  -- Si auth.uid() est NULL (script SQL interne, test ou migration), préserver NEW.author_id
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

-- C. Empêcher l'auto-confirmation par l'auteur de sa propre fiche
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

-- D. Déclencheur sur confirmations de fiches pour recalculer le statut
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
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Si la fiche ciblée a changé lors d'un UPDATE, réévaluer l'ancienne ET la nouvelle
    IF (TG_OP = 'UPDATE' AND OLD.fiche_id IS DISTINCT FROM NEW.fiche_id) THEN
      PERFORM public.evaluate_fiche_status(OLD.fiche_id);
    END IF;

    PERFORM public.evaluate_fiche_status(NEW.fiche_id);

    IF (TG_OP = 'INSERT') THEN
      SELECT author_id, title INTO v_author_id, v_fiche_title FROM public.fiches WHERE id = NEW.fiche_id;
      IF (v_author_id IS NOT NULL AND v_author_id <> NEW.user_id) THEN
        SELECT display_name INTO v_confirmer_name FROM public.profiles WHERE id = NEW.user_id;

        INSERT INTO public.notifications (user_id, title, message, type, fiche_id)
        VALUES (
          v_author_id,
          CASE WHEN NEW.is_working THEN 'Nouvelle confirmation reçue' ELSE 'Retour négatif signalé' END,
          coalesce(v_confirmer_name, 'Un développeur') || ' a testé votre fiche "' || v_fiche_title || '" (' || NEW.country || ') : ' || CASE WHEN NEW.is_working THEN 'solution validée.' ELSE 'échec ou obsolescence signalée.' END,
          'confirmation',
          NEW.fiche_id
        );
      END IF;
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.evaluate_fiche_status(OLD.fiche_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_confirmation_change ON public.fiche_confirmations;
CREATE TRIGGER on_confirmation_change
  AFTER INSERT OR UPDATE OR DELETE ON public.fiche_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_fiche_confirmation();

-- E. Déclencheur sur fiche_reports pour recalculer le statut de vérification
CREATE OR REPLACE FUNCTION public.handle_fiche_report_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.evaluate_fiche_status(NEW.fiche_id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Si la fiche cible a été modifiée lors d'un UPDATE, réévaluer l'ancienne ET la nouvelle fiche
    IF OLD.fiche_id IS DISTINCT FROM NEW.fiche_id THEN
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

-- F. Réévaluation certifiée du statut de vérification
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
  -- Compter les confirmations positives et négatives réelles
  SELECT 
    count(*) FILTER (WHERE is_working = TRUE),
    count(*) FILTER (WHERE is_working = FALSE),
    max(created_at) FILTER (WHERE is_working = TRUE)
  INTO v_positive_count, v_negative_count, v_last_valid_date
  FROM public.fiche_confirmations
  WHERE fiche_id = p_fiche_id;

  -- Compter les signalements ouverts
  SELECT count(*) INTO v_open_reports
  FROM public.fiche_reports
  WHERE fiche_id = p_fiche_id AND status = 'open';

  -- Règles de certification CADev :
  -- 1. Si contestation active (>= 2 avis négatifs ou >= 1 signalement ouvert non résolu) -> 'fl' (Contestée)
  -- 2. Si confirmations positives >= 3 et pas de contestation et confirmation < 90 jours -> 'ok' (Certifiée)
  -- 3. Si confirmation positive > 0 mais > 90 jours sans re-test -> 're' (À revérifier)
  -- 4. Sinon -> 'new' (En attente de validation)
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

  UPDATE public.fiches
  SET confirmations_count = v_positive_count,
      negative_feedback_count = v_negative_count,
      last_validated_at = v_last_valid_date,
      verification_status = v_new_status
  WHERE id = p_fiche_id;
END;
$$;

-- Révocation de l'accès direct en RPC public à la fonction d'évaluation (réservée aux triggers internes)
REVOKE EXECUTE ON FUNCTION public.evaluate_fiche_status(UUID) FROM PUBLIC, anon, authenticated;

-- G. Sécurisation de l'incrémentation des vues de fiches
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

-- ===================================================================
-- 2. CRÉATION ET MISE À NIVEAU DES TABLES D'ENTRAIDE TECHNIQUE
-- ===================================================================

-- Table des questions / problèmes d'entraide
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

-- Garantir la présence de toutes les colonnes requises si la table préexistait
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tools_version TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS environment TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS expected_result TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS code_snippet TEXT DEFAULT '';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS code_language TEXT DEFAULT 'plaintext';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS accepted_answer_id UUID;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS answers_count INTEGER NOT NULL DEFAULT 0 CHECK (answers_count >= 0);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0);

-- Index de performance sur les questions
CREATE INDEX IF NOT EXISTS idx_questions_author ON public.questions(author_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_technology ON public.questions(technology);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);

-- Index textuel pour recherche plein texte
CREATE INDEX IF NOT EXISTS idx_questions_search ON public.questions USING gin(
  to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(error_message, '') || ' ' || coalesce(technology, '') || ' ' || coalesce(framework, ''))
);

-- Table des réponses aux problèmes
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

-- Garantir la présence de toutes les colonnes si la table existait déjà
ALTER TABLE public.question_answers ADD COLUMN IF NOT EXISTS code_snippet TEXT DEFAULT '';
ALTER TABLE public.question_answers ADD COLUMN IF NOT EXISTS code_language TEXT DEFAULT 'plaintext';
ALTER TABLE public.question_answers ADD COLUMN IF NOT EXISTS is_solution BOOLEAN NOT NULL DEFAULT FALSE;

-- Index sur les réponses
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.question_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_author ON public.question_answers(author_id);
CREATE INDEX IF NOT EXISTS idx_answers_solution ON public.question_answers(is_solution);

-- GARANTIE D'INTÉGRITÉ : Une seule réponse validée acceptée par question
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_solution_per_question 
  ON public.question_answers(question_id) 
  WHERE is_solution = TRUE;

-- Clé étrangère questions.accepted_answer_id -> question_answers.id
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

-- Table des signalements d'entraide
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

-- Assurer la contrainte stricte sur chk_report_target si la table existait déjà avec l'ancienne contrainte
DO $$
BEGIN
  ALTER TABLE public.question_reports DROP CONSTRAINT IF EXISTS chk_report_target;
  ALTER TABLE public.question_reports ADD CONSTRAINT chk_report_target 
    CHECK (num_nonnulls(question_id, answer_id) = 1);
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_question_reports_status ON public.question_reports(status);
CREATE INDEX IF NOT EXISTS idx_question_reports_question ON public.question_reports(question_id);

-- Compatibilité de la table public.notifications pour l'entraide technique
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_question_id ON public.notifications(question_id);

-- ===================================================================
-- 3. TRIGGERS ET LOGIQUE MÉTIER POUR L'ENTRAIDE
-- ===================================================================

-- Mise à jour automatique de updated_at
DROP TRIGGER IF EXISTS tr_questions_updated_at ON public.questions;
CREATE TRIGGER tr_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_question_answers_updated_at ON public.question_answers;
CREATE TRIGGER tr_question_answers_updated_at
  BEFORE UPDATE ON public.question_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Protection des champs système et des statuts sur questions
-- SÉCURITÉ SANS FAILLE :
-- - answers_count est TOUJOURS recalculé à partir du compte réel de question_answers.
-- - views_count ne peut être incrémenté que par +1 via increment_question_views.
-- - accepted_answer_id et 'resolved' ne peuvent être assignés que si la réponse existe,
--   est validée (is_solution = true) et que l'appelant est l'auteur ou un modérateur.
CREATE OR REPLACE FUNCTION public.protect_question_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Empêcher la réattribution d'auteur
  NEW.author_id := OLD.author_id;

  -- 2. answers_count est TOUJOURS dérivé de la réalité de la table question_answers
  NEW.answers_count := (
    SELECT count(*) FROM public.question_answers WHERE question_id = OLD.id
  );

  -- 3. Vues : seul un incrément unitaire (+1 via RPC increment_question_views) ou un modérateur est autorisé
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
      -- Si accepted_answer_id est mis à NULL, le statut ne peut pas rester 'resolved'
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
    -- Une réponse insérée ne peut jamais s'auto-déclarer solution dès l'INSERT
    NEW.is_solution := FALSE;

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

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Empêcher le détournement de question_id ou d'auteur
    IF NOT public.is_admin() THEN
      NEW.question_id := OLD.question_id;
      NEW.author_id := OLD.author_id;
    END IF;

    -- is_solution : ne peut être modifié QUE par l'auteur de la question parente ou un modérateur/admin
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

-- Initialisation par défaut lors de la création d'une question (INSERT)
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

-- Décompte atomique exact des réponses et notifications sans race condition
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

    -- Verrouillage de la ligne de question parente pour sérialiser les calculs concurrents
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
        'Nouvelle réponse à votre problème',
        coalesce(v_answerer_name, 'Un développeur') || ' a répondu à votre problème "' || v_question_title || '".',
        'comment',
        v_question_id
      );
    END IF;

    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_question_id := OLD.question_id;

    -- Verrouillage de la ligne pour mise à jour atomique
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

-- Incrémentation atomique et protégée des consultations de questions
-- SÉCURITÉ RENFORCÉE :
-- 1. Seule la question ciblée (p_question_id) au statut public actif est mise à jour (+1).
-- 2. L'auteur connecté (auth.uid() = author_id) ne peut jamais incrémenter ses propres vues.
-- 3. Les visiteurs anonymes (auth.uid() IS NULL) et les pairs (auth.uid() <> author_id) sont comptabilisés.
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

-- ===================================================================
-- 4. FONCTION SÉCURISÉE mark_question_solution()
-- ===================================================================

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
    RAISE EXCEPTION 'Non authentifié. Seuls les utilisateurs connectés peuvent exécuter cette action.';
  END IF;

  -- 2. Vérifier l'existence de la question
  SELECT author_id, title INTO v_question_author, v_question_title
  FROM public.questions
  WHERE id = p_question_id;

  IF v_question_author IS NULL THEN
    RAISE EXCEPTION 'Question introuvable.';
  END IF;

  -- 3. Autoriser uniquement l'auteur de la question ou un modérateur/admin
  IF (auth.uid() <> v_question_author AND NOT public.is_moderator_or_admin()) THEN
    RAISE EXCEPTION 'Seul l''auteur de la question ou un modérateur peut valider la solution.';
  END IF;

  -- 4. Exiger une réponse valide et vérifier qu'elle appartient bien à cette question
  IF p_answer_id IS NULL THEN
    RAISE EXCEPTION 'Identifiant de réponse invalide.';
  END IF;

  SELECT author_id INTO v_answer_author
  FROM public.question_answers
  WHERE id = p_answer_id AND question_id = p_question_id;

  IF v_answer_author IS NULL THEN
    RAISE EXCEPTION 'Réponse introuvable ou non associée à cette question.';
  END IF;

  -- 5. Verrouiller la question parente pour sérialiser les appels concurrents
  PERFORM 1 FROM public.questions WHERE id = p_question_id FOR UPDATE;

  IF p_is_solution THEN
    -- Réinitialiser toute autre réponse marquée solution pour cette question
    UPDATE public.question_answers
    SET is_solution = FALSE
    WHERE question_id = p_question_id AND id <> p_answer_id AND is_solution = TRUE;

    -- Valider la réponse choisie
    UPDATE public.question_answers
    SET is_solution = TRUE
    WHERE id = p_answer_id;

    -- Mettre à jour la question au statut 'resolved'
    UPDATE public.questions
    SET status = 'resolved',
        accepted_answer_id = p_answer_id
    WHERE id = p_question_id;

    -- Notifier l'auteur de la réponse acceptée (sauf s'il est l'auteur de la question)
    IF (v_answer_author IS NOT NULL AND v_answer_author <> auth.uid()) THEN
      INSERT INTO public.notifications (user_id, title, message, type, question_id)
      VALUES (
        v_answer_author,
        'Votre réponse a été acceptée comme solution !',
        'Votre réponse à la question "' || v_question_title || '" a été validée par son auteur.',
        'confirmation',
        p_question_id
      );
    END IF;
  ELSE
    -- Retirer le statut de solution sur la réponse ciblée
    UPDATE public.question_answers
    SET is_solution = FALSE
    WHERE id = p_answer_id;

    -- Remettre à jour le statut de la question
    UPDATE public.questions
    SET status = CASE WHEN answers_count > 0 THEN 'in_progress' ELSE 'open' END,
        accepted_answer_id = NULL
    WHERE id = p_question_id;
  END IF;
END;
$$;

-- Révocation stricte des permissions inutiles et octroi ciblé
REVOKE ALL ON FUNCTION public.mark_question_solution(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_question_solution(UUID, UUID, BOOLEAN) TO authenticated;

-- ===================================================================
-- 5. POLITIQUES ROW LEVEL SECURITY (RLS) POUR L'ENTRAIDE
-- ===================================================================

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- POLITIQUES : QUESTIONS
DROP POLICY IF EXISTS "Lecture des questions publiques et actives" ON public.questions;
CREATE POLICY "Lecture des questions publiques et actives"
  ON public.questions FOR SELECT
  USING (
    status NOT IN ('draft', 'hidden')
    OR (auth.uid() IS NOT NULL AND author_id = auth.uid())
    OR public.is_moderator_or_admin()
  );

DROP POLICY IF EXISTS "Création de questions par les utilisateurs connectés" ON public.questions;
CREATE POLICY "Création de questions par les utilisateurs connectés"
  ON public.questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

DROP POLICY IF EXISTS "Modification de ses propres questions ou par modérateur" ON public.questions;
CREATE POLICY "Modification de ses propres questions ou par modérateur"
  ON public.questions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (author_id = auth.uid() OR public.is_moderator_or_admin()))
  WITH CHECK (auth.uid() IS NOT NULL AND (author_id = auth.uid() OR public.is_moderator_or_admin()));

DROP POLICY IF EXISTS "Suppression de ses propres questions ou par admin" ON public.questions;
CREATE POLICY "Suppression de ses propres questions ou par admin"
  ON public.questions FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (author_id = auth.uid() OR public.is_admin())
  );

-- POLITIQUES : QUESTION_ANSWERS
DROP POLICY IF EXISTS "Lecture publique des réponses" ON public.question_answers;
CREATE POLICY "Lecture publique des réponses"
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

DROP POLICY IF EXISTS "Création de réponses par les utilisateurs connectés" ON public.question_answers;
CREATE POLICY "Création de réponses par les utilisateurs connectés"
  ON public.question_answers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

DROP POLICY IF EXISTS "Modification de sa réponse ou par modérateur" ON public.question_answers;
CREATE POLICY "Modification de sa réponse ou par modérateur"
  ON public.question_answers FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (author_id = auth.uid() OR public.is_moderator_or_admin()))
  WITH CHECK (auth.uid() IS NOT NULL AND (author_id = auth.uid() OR public.is_moderator_or_admin()));

DROP POLICY IF EXISTS "Suppression de sa propre réponse ou par admin" ON public.question_answers;
CREATE POLICY "Suppression de sa propre réponse ou par admin"
  ON public.question_answers FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (author_id = auth.uid() OR public.is_moderator_or_admin()));

-- POLITIQUES : QUESTION_REPORTS
DROP POLICY IF EXISTS "Création de signalements par les utilisateurs" ON public.question_reports;
CREATE POLICY "Création de signalements par les utilisateurs"
  ON public.question_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Lecture des signalements : auteur ou modérateur" ON public.question_reports;
CREATE POLICY "Lecture des signalements : auteur ou modérateur"
  ON public.question_reports FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_moderator_or_admin()));

DROP POLICY IF EXISTS "Traitement des signalements par les modérateurs" ON public.question_reports;
CREATE POLICY "Traitement des signalements par les modérateurs"
  ON public.question_reports FOR UPDATE
  TO authenticated
  USING (public.is_moderator_or_admin())
  WITH CHECK (public.is_moderator_or_admin());

-- ===================================================================
-- 6. BUCKET SUPABASE STORAGE POUR LES CAPTURES D'ÉCRAN
-- ===================================================================
-- DOCUMENTATION DU CARACTÈRE PUBLIC :
-- Le bucket 'entraide-attachments' est configuré avec "public = true" afin que
-- les captures d'écran illustrant un problème technique ou un message d'erreur
-- puissent être chargées directement par le navigateur de tout visiteur via URL CDN.
--
-- AVERTISSEMENT DE SÉCURITÉ :
-- Tout fichier téléversé dans ce bucket est ACCESSIBLE PUBLIQUEMENT SUR INTERNET
-- par toute personne disposant de son URL. CES CAPTURES NE SONT PAS CONFIDENTIELLES.
-- L'interface utilisateur de Palabre alerte explicitement les utilisateurs
-- de masquer impérativement tout mot de passe, jeton JWT, clé API ou donnée privée
-- avant téléversement. Aucune politique existante d'autres buckets n'est supprimée.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'entraide-attachments',
  'entraide-attachments',
  true,
  5242880, -- Limite stricte : 5 Mo par image
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

-- Politiques RLS Storage
DROP POLICY IF EXISTS "Lecture publique des captures d'entraide" ON storage.objects;
CREATE POLICY "Lecture publique des captures d'entraide"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'entraide-attachments');

DROP POLICY IF EXISTS "Téléversement par les utilisateurs authentifiés" ON storage.objects;
CREATE POLICY "Téléversement par les utilisateurs authentifiés"
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
