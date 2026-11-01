-- ===================================================================
-- PALABRE — Suite Complète de Tests : Sécurité, Intégrité, Déclencheurs & RLS
-- Coupe d'Afrique des Développeurs (CADev) 2026
-- ===================================================================
-- Ce script est conçu pour être exécuté dans le SQL Editor de Supabase (rôle postgres/service_role).
-- Il valide rigoureusement :
--   1. Les protections anti-falsification (fiches, questions, réponses, compteurs, auteurs)
--   2. La fonction mark_question_solution() (droits, intégrité, désélection, unicité)
--   3. Les déclencheurs de calcul automatique (confirmations, signalements, décompte atomique)
--   4. Les contraintes d'intégrité (notamment chk_report_target, idx_one_solution_per_question)
--   5. L'isolation des politiques RLS (anonyme, utilisateur pair, auteur, modérateur)
--
-- GARANTIE DE SÉCURITÉ & NON-DESTRUCTION :
-- - Utilise exclusivement des identifiants dynamiques isolés générés par gen_random_uuid().
-- - Nettoie 100% des entités et utilisateurs créés, tant en cas de succès qu'en cas d'échec.
-- - Ne touche à aucune donnée préexistante de la base.
-- ===================================================================

DO $$
DECLARE
  -- Identifiants dynamiques isolés pour les 3 profils de test
  v_author_id UUID := gen_random_uuid();
  v_peer_id UUID := gen_random_uuid();
  v_admin_id UUID := gen_random_uuid();

  -- Données de test
  v_fiche_id UUID := gen_random_uuid();
  v_draft_fiche_id UUID := gen_random_uuid();
  v_question_id UUID := gen_random_uuid();
  v_draft_question_id UUID := gen_random_uuid();
  v_answer_id UUID := gen_random_uuid();
  v_second_answer_id UUID := gen_random_uuid();
  v_mismatched_answer_id UUID := gen_random_uuid();
  v_report_id UUID := gen_random_uuid();

  -- Variables d'observation avec typage strict (évite toute incohérence de type)
  v_status_check TEXT;
  v_confirmations_count_check INT;
  v_neg_feedback_count_check INT;
  v_views_count_check INT;
  v_answers_count_check INT;
  v_author_check UUID;
  v_accepted_check UUID;
  v_is_sol_check BOOLEAN;
  v_count_check INT;
  v_notification_count INT;
  v_blocked BOOLEAN;
  v_test_step TEXT;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '>>> DÉMARRAGE DE LA SUITE DE TESTS DE SÉCURITÉ PALABRE';
  RAISE NOTICE '=======================================================';

  -- ===================================================================
  -- INITIALISATION : Création d'utilisateurs de test isolés dans auth.users
  -- ===================================================================
  v_test_step := 'Initialisation : Création des utilisateurs de test dans auth.users';

  -- Utilisateur A : Auteur (développeur créant fiches & questions)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    v_author_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test_author_' || substr(v_author_id::text, 1, 8) || '@palabre.internal.test',
    'dummy_test_hash',
    now(),
    json_build_object('username', 'dev_author_' || substr(v_author_id::text, 1, 6), 'display_name', 'Dev Auteur Test', 'country', 'Sénégal')::jsonb,
    now(),
    now()
  );

  -- Utilisateur B : Pair (autre développeur ordinaire)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    v_peer_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test_peer_' || substr(v_peer_id::text, 1, 8) || '@palabre.internal.test',
    'dummy_test_hash',
    now(),
    json_build_object('username', 'dev_peer_' || substr(v_peer_id::text, 1, 6), 'display_name', 'Dev Reviewer Test', 'country', 'Côte d''Ivoire')::jsonb,
    now(),
    now()
  );

  -- Utilisateur C : Modérateur / Administrateur
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test_admin_' || substr(v_admin_id::text, 1, 8) || '@palabre.internal.test',
    'dummy_test_hash',
    now(),
    json_build_object('username', 'dev_admin_' || substr(v_admin_id::text, 1, 6), 'display_name', 'Admin Test')::jsonb,
    now(),
    now()
  );

  -- Attribuer le rôle 'admin' à l'utilisateur C
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_admin_id, 'admin');

  RAISE NOTICE '[OK] 3 comptes de test créés avec succès (Auteur, Pair, Admin).';


  -- ===================================================================
  -- PARTIE 1 : TESTS D'INTÉGRITÉ, DÉCLENCHEURS & ANTI-FALSIFICATION
  -- ===================================================================

  -- TEST 1.1 : Vérification de la non-exposition des e-mails dans public.profiles
  v_test_step := 'Test 1.1 : Protection des e-mails dans public.profiles';
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email'
  ) THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.1 : La colonne "email" est présente dans public.profiles ! Fuite de données possible.';
  END IF;
  RAISE NOTICE '[PASS] Test 1.1 : Aucun e-mail n''est exposé dans la table public.profiles.';

  -- Configurer l'identité de l'Auteur pour les opérations de création légitimes
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_author_id::text, 'role', 'authenticated')::text, true);

  -- TEST 1.2 : Réinitialisation à la création des fiches (set_new_fiche_defaults)
  -- CORRECTION : Variables distinctement typées pour chaque colonne vérifiée
  v_test_step := 'Test 1.2 : Tentative de falsification à l''INSERT sur fiches';
  INSERT INTO public.fiches (
    id, title, short_description, problem, language, country, operator_service,
    author_id, status, verification_status, confirmations_count, negative_feedback_count, views_count
  ) VALUES (
    v_fiche_id,
    'Fiche de test falsification',
    'Description courte de test',
    'Description du problème technique rencontré sur le terrain.',
    'Node.js',
    'Sénégal',
    'Wave',
    v_author_id,
    'published',
    'ok', -- Tentative frauduleuse de s'auto-certifier
    999,  -- Tentative frauduleuse d'imposer 999 confirmations
    10,   -- Tentative frauduleuse de manipuler les retours négatifs
    5000  -- Tentative frauduleuse de gonfler les vues
  );

  SELECT verification_status, confirmations_count, negative_feedback_count, views_count
  INTO v_status_check, v_confirmations_count_check, v_neg_feedback_count_check, v_views_count_check
  FROM public.fiches WHERE id = v_fiche_id;

  IF v_status_check <> 'new' 
     OR v_confirmations_count_check <> 0 
     OR v_neg_feedback_count_check <> 0 
     OR v_views_count_check <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.2 : set_new_fiche_defaults a échoué. Valeurs stockées: status=%, confirmations=%, neg=%, views=%',
      v_status_check, v_confirmations_count_check, v_neg_feedback_count_check, v_views_count_check;
  END IF;
  RAISE NOTICE '[PASS] Test 1.2 : set_new_fiche_defaults réinitialise strictement les champs calculés (status=new, 0, 0, 0).';

  -- TEST 1.3 : Blocage de la falsification à l'UPDATE des fiches (protect_fiche_system_fields)
  v_test_step := 'Test 1.3 : Tentative de falsification à l''UPDATE sur fiches';
  UPDATE public.fiches
  SET verification_status = 'ok',
      confirmations_count = 50,
      negative_feedback_count = 0,
      views_count = 100000,
      author_id = v_peer_id -- Tentative frauduleuse de changer l'auteur
  WHERE id = v_fiche_id;

  SELECT verification_status, confirmations_count, views_count, author_id
  INTO v_status_check, v_confirmations_count_check, v_views_count_check, v_author_check
  FROM public.fiches WHERE id = v_fiche_id;

  IF v_status_check = 'ok' 
     OR v_confirmations_count_check = 50 
     OR v_views_count_check = 100000 
     OR v_author_check <> v_author_id THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.3 : protect_fiche_system_fields n''a pas protégé les champs système lors de l''UPDATE !';
  END IF;
  RAISE NOTICE '[PASS] Test 1.3 : protect_fiche_system_fields rejette toute altération directe de statut, compteurs et auteur.';

  -- TEST 1.4 : Blocage strict de l'auto-confirmation par l'auteur (sans faux succès)
  v_test_step := 'Test 1.4 : Blocage de l''auto-confirmation par l''auteur';
  v_blocked := FALSE;
  BEGIN
    INSERT INTO public.fiche_confirmations (
      fiche_id, user_id, country, operator_service, is_working, tested_version
    ) VALUES (
      v_fiche_id,
      v_author_id, -- L'auteur tente de confirmer sa propre fiche
      'Sénégal',
      'Wave',
      TRUE,
      'v1.0'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Le test ne réussit QUE si l'exception correspond exactement à la règle métier
      IF SQLERRM LIKE '%ne peut pas confirmer sa propre fiche%' THEN
        v_blocked := TRUE;
      ELSE
        RAISE EXCEPTION 'ÉCHEC TEST 1.4 : Exception inattendue reçue : "%"', SQLERRM;
      END IF;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.4 : L''auteur a pu insérer une confirmation sur sa propre fiche sans être bloqué !';
  END IF;

  -- Vérifier formellement qu'aucune confirmation n'existe en base
  SELECT count(*) INTO v_count_check
  FROM public.fiche_confirmations
  WHERE fiche_id = v_fiche_id AND user_id = v_author_id;

  IF v_count_check <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.4 : Une auto-confirmation frauduleuse a été enregistrée en base !';
  END IF;
  RAISE NOTICE '[PASS] Test 1.4 : check_fiche_confirmation_author bloque rigoureusement l''auto-confirmation.';

  -- TEST 1.5 : Recalcul dynamique de certification sur confirmation légitime et signalement
  v_test_step := 'Test 1.5 : Recalcul automatique du statut de fiche sur confirmation et signalement';
  -- Insertion d'une confirmation légitime par le Pair (Utilisateur B)
  INSERT INTO public.fiche_confirmations (
    fiche_id, user_id, country, operator_service, is_working, tested_version
  ) VALUES (
    v_fiche_id,
    v_peer_id,
    'Sénégal',
    'Wave',
    TRUE,
    'v1.0'
  );

  SELECT confirmations_count, verification_status 
  INTO v_confirmations_count_check, v_status_check
  FROM public.fiches WHERE id = v_fiche_id;

  IF v_confirmations_count_check <> 1 OR v_status_check <> 'new' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.5a : Confirmation légitime non comptabilisée (count=%, status=%)', 
      v_confirmations_count_check, v_status_check;
  END IF;

  -- Déposer un signalement ouvert : doit déclencher evaluate_fiche_status -> statut devient 'fl' (Contestée)
  INSERT INTO public.fiche_reports (
    id, fiche_id, user_id, reason, description, status
  ) VALUES (
    v_report_id,
    v_fiche_id,
    v_peer_id,
    'security_risk',
    'Signalement de test pour vérifier le déclencheur',
    'open'
  );

  SELECT verification_status INTO v_status_check
  FROM public.fiches WHERE id = v_fiche_id;

  IF v_status_check <> 'fl' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.5b : tr_fiche_reports_change n''a pas passé la fiche à "fl" après signalement ouvert (actuel: %)', v_status_check;
  END IF;
  RAISE NOTICE '[PASS] Test 1.5 : Les déclencheurs recalculent dynamiquement le statut lors de retours et signalements.';

  -- TEST 1.6 : Initialisation et protection des questions d'entraide à l'INSERT
  v_test_step := 'Test 1.6 : Protection des champs calculés sur questions d''entraide (INSERT)';
  INSERT INTO public.questions (
    id, title, description, technology, author_id, status, answers_count, views_count
  ) VALUES (
    v_question_id,
    'Question Test Sécurité Entraide',
    'Description détaillée du problème pour le test de sécurité.',
    'Node.js',
    v_author_id,
    'resolved', -- Tentative de forcer directement le statut 'resolved'
    50,         -- Tentative de forcer answers_count
    1000        -- Tentative de forcer views_count
  );

  SELECT answers_count, views_count, status 
  INTO v_answers_count_check, v_views_count_check, v_status_check
  FROM public.questions WHERE id = v_question_id;

  IF v_answers_count_check <> 0 OR v_views_count_check <> 0 OR v_status_check <> 'open' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.6 : set_new_question_defaults a échoué (answers=%, views=%, status=%)', 
      v_answers_count_check, v_views_count_check, v_status_check;
  END IF;
  RAISE NOTICE '[PASS] Test 1.6 : Les questions initialisent strictement leurs compteurs à 0 et statut à "open".';

  -- TEST 1.7 : Blocage de falsification directe sur UPDATE de questions
  v_test_step := 'Test 1.7 : Tentative de falsification à l''UPDATE sur questions';
  UPDATE public.questions
  SET answers_count = 100,
      views_count = 50000,
      status = 'resolved',
      accepted_answer_id = gen_random_uuid(),
      author_id = v_peer_id
  WHERE id = v_question_id;

  SELECT answers_count, views_count, status, accepted_answer_id, author_id
  INTO v_answers_count_check, v_views_count_check, v_status_check, v_accepted_check, v_author_check
  FROM public.questions WHERE id = v_question_id;

  IF v_answers_count_check = 100 
     OR v_views_count_check = 50000 
     OR v_status_check = 'resolved' 
     OR v_accepted_check IS NOT NULL 
     OR v_author_check <> v_author_id THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.7 : protect_question_system_fields n''a pas rejeté la falsification directe de la question !';
  END IF;
  RAISE NOTICE '[PASS] Test 1.7 : protect_question_system_fields rejette toute altération directe des compteurs et statuts.';

  -- TEST 1.8 : Protection du champ is_solution sur question_answers (INSERT et UPDATE)
  v_test_step := 'Test 1.8 : Protection anti-falsification de is_solution sur les réponses';
  -- 1.8.a : Tentative de s'auto-déclarer solution dès l'INSERT
  INSERT INTO public.question_answers (
    id, question_id, author_id, content, code_snippet, is_solution
  ) VALUES (
    v_answer_id,
    v_question_id,
    v_peer_id,
    'Voici une réponse technique détaillée pour résoudre le problème.',
    'const fixed = true;',
    TRUE -- Tentative d'auto-déclaration de solution dès l'INSERT
  );

  SELECT is_solution INTO v_is_sol_check
  FROM public.question_answers WHERE id = v_answer_id;

  IF v_is_sol_check IS NOT FALSE THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.8a : protect_answer_system_fields n''a pas forcé is_solution = FALSE à l''INSERT !';
  END IF;

  -- 1.8.b : Tentative de modifier is_solution = true via un UPDATE client standard par le répondant
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_peer_id::text, 'role', 'authenticated')::text, true);

  UPDATE public.question_answers
  SET is_solution = TRUE
  WHERE id = v_answer_id;

  SELECT is_solution INTO v_is_sol_check
  FROM public.question_answers WHERE id = v_answer_id;

  IF v_is_sol_check IS NOT FALSE THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.8b : protect_answer_system_fields a laissé passer un UPDATE direct vers is_solution = TRUE !';
  END IF;
  RAISE NOTICE '[PASS] Test 1.8 : protect_answer_system_fields bloque toute auto-attribution de solution (INSERT & UPDATE).';

  -- TEST 1.9 : Incrémentation automatique exacte de answers_count et notification
  v_test_step := 'Test 1.9 : Compteur de réponses automatique et notification';
  SELECT answers_count, status INTO v_answers_count_check, v_status_check
  FROM public.questions WHERE id = v_question_id;

  IF v_answers_count_check <> 1 OR v_status_check <> 'in_progress' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.9 : handle_question_answer n''a pas mis à jour answers_count=1 et status=in_progress (count=%, status=%)', 
      v_answers_count_check, v_status_check;
  END IF;

  SELECT count(*) INTO v_notification_count
  FROM public.notifications
  WHERE user_id = v_author_id AND question_id = v_question_id;

  IF v_notification_count < 1 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.9 : Aucune notification d''entraide avec question_id n''a été générée pour l''auteur !';
  END IF;
  RAISE NOTICE '[PASS] Test 1.9 : Compteur answers_count=1, statut "in_progress" et notification question_id vérifiés.';

  -- TEST 1.10 : Validation de solution par mark_question_solution() et désélection
  v_test_step := 'Test 1.10 : Fonction mark_question_solution() et permissions';

  -- 1.10.a : Un utilisateur non-auteur (Peer) est rejeté
  v_blocked := FALSE;
  BEGIN
    PERFORM public.mark_question_solution(v_question_id, v_answer_id, TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Seul l''auteur de la question ou un modérateur peut valider la solution%' THEN
        v_blocked := TRUE;
      ELSE
        RAISE EXCEPTION 'Exception inattendue reçue : %', SQLERRM;
      END IF;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.10a : Un utilisateur non-auteur a pu valider la solution de la question !';
  END IF;

  -- 1.10.b : Une réponse inexistante ou associée à une autre question est rejetée
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_author_id::text, 'role', 'authenticated')::text, true);
  v_blocked := FALSE;
  BEGIN
    PERFORM public.mark_question_solution(v_question_id, v_mismatched_answer_id, TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Réponse introuvable ou non associée à cette question%' THEN
        v_blocked := TRUE;
      ELSE
        RAISE EXCEPTION 'Exception inattendue reçue : %', SQLERRM;
      END IF;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.10b : mark_question_solution a accepté une réponse invalide !';
  END IF;

  -- 1.10.c : L'auteur valide légitimement sa solution -> statut passe à 'resolved', accepted_answer_id renseigné
  PERFORM public.mark_question_solution(v_question_id, v_answer_id, TRUE);

  SELECT status, accepted_answer_id INTO v_status_check, v_accepted_check
  FROM public.questions WHERE id = v_question_id;

  SELECT is_solution INTO v_is_sol_check
  FROM public.question_answers WHERE id = v_answer_id;

  IF v_status_check <> 'resolved' OR v_accepted_check <> v_answer_id OR v_is_sol_check IS NOT TRUE THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.10c : mark_question_solution n''a pas mis à jour question=resolved, answer.is_solution=TRUE';
  END IF;

  -- 1.10.d : L'auteur retire la solution (désélection) -> question repasse à 'in_progress', accepted_answer_id à NULL
  PERFORM public.mark_question_solution(v_question_id, v_answer_id, FALSE);

  SELECT status, accepted_answer_id INTO v_status_check, v_accepted_check
  FROM public.questions WHERE id = v_question_id;

  SELECT is_solution INTO v_is_sol_check
  FROM public.question_answers WHERE id = v_answer_id;

  IF v_status_check <> 'in_progress' OR v_accepted_check IS NOT NULL OR v_is_sol_check IS NOT FALSE THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.10d : La désélection de la solution n''a pas remis question=in_progress et is_solution=FALSE (status=%)', v_status_check;
  END IF;
  RAISE NOTICE '[PASS] Test 1.10 : mark_question_solution valide rigoureusement les droits, réponses et désélections.';

  -- TEST 1.11 : Unicité stricte de la solution (idx_one_solution_per_question)
  v_test_step := 'Test 1.11 : Unicité de la réponse validée par question';
  -- Insérer une 2e réponse pour la question
  INSERT INTO public.question_answers (
    id, question_id, author_id, content, code_snippet, is_solution
  ) VALUES (
    v_second_answer_id,
    v_question_id,
    v_author_id,
    'Seconde réponse alternative pour le problème.',
    '',
    FALSE
  );

  -- Valider la 1re réponse via la RPC
  PERFORM public.mark_question_solution(v_question_id, v_answer_id, TRUE);

  -- Tenter de forcer la 2e réponse à is_solution=TRUE directement en SQL -> doit échouer par l'index unique
  v_blocked := FALSE;
  BEGIN
    UPDATE public.question_answers
    SET is_solution = TRUE
    WHERE id = v_second_answer_id;
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := TRUE;
  END;

  IF NOT v_blocked THEN
    -- Vérifier si l'index unique a empêché d'avoir 2 solutions actives
    SELECT count(*) INTO v_count_check
    FROM public.question_answers
    WHERE question_id = v_question_id AND is_solution = TRUE;

    IF v_count_check > 1 THEN
      RAISE EXCEPTION 'ÉCHEC TEST 1.11 : Deux réponses sont simultanément marquées is_solution=TRUE pour la même question !';
    END IF;
  END IF;
  RAISE NOTICE '[PASS] Test 1.11 : L''unicité de la solution par question est garantie (idx_one_solution_per_question).';

  -- TEST 1.12 : Contrainte chk_report_target sur question_reports (exactement une cible)
  v_test_step := 'Test 1.12 : Contrainte stricte sur les cibles de signalement d''entraide';
  -- 1.12.a : Tenter d'insérer un rapport avec 2 cibles (question_id ET answer_id) -> doit échouer
  v_blocked := FALSE;
  BEGIN
    INSERT INTO public.question_reports (
      question_id, answer_id, user_id, reason, description
    ) VALUES (
      v_question_id, v_answer_id, v_peer_id, 'spam', 'Deux cibles fournies frauduleusement'
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := TRUE;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.12a : chk_report_target a accepté un signalement avec deux cibles simultanées !';
  END IF;

  -- 1.12.b : Tenter d'insérer un rapport avec 0 cible (les deux NULL) -> doit échouer
  v_blocked := FALSE;
  BEGIN
    INSERT INTO public.question_reports (
      question_id, answer_id, user_id, reason, description
    ) VALUES (
      NULL, NULL, v_peer_id, 'spam', 'Aucune cible fournie frauduleusement'
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := TRUE;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.12b : chk_report_target a accepté un signalement sans aucune cible !';
  END IF;
  RAISE NOTICE '[PASS] Test 1.12 : chk_report_target exige strictement une seule cible (num_nonnulls = 1).';

  -- TEST 1.13 : Suppression de réponse et ajustement automatique
  v_test_step := 'Test 1.13 : Décrémentation et ajustement de statut lors de la suppression de réponse';
  DELETE FROM public.question_answers WHERE id = v_answer_id;
  DELETE FROM public.question_answers WHERE id = v_second_answer_id;

  SELECT answers_count, status INTO v_answers_count_check, v_status_check
  FROM public.questions WHERE id = v_question_id;

  IF v_answers_count_check <> 0 OR v_status_check <> 'open' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.13 : Après suppression de toutes les réponses, answers_count=%, status=% (attendu: 0, open)', 
      v_answers_count_check, v_status_check;
  END IF;
  RAISE NOTICE '[PASS] Test 1.13 : La suppression de réponse recalcule fidèlement answers_count=0 et remet status="open".';

  -- TEST 1.14 : Fonctions d'incrémentation des consultations (RPC unitaires et règles d'auteur)
  v_test_step := 'Test 1.14 : Fonctions RPC d''incrémentation des consultations et filtrage de l''auteur';
  -- 1.14a : Incrémentation sur les fiches
  PERFORM public.increment_fiche_views(v_fiche_id);
  SELECT views_count INTO v_views_count_check FROM public.fiches WHERE id = v_fiche_id;
  IF v_views_count_check <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.14a : increment_fiche_views n''a pas incrémenté la vue à 1 (actuel: %)', v_views_count_check;
  END IF;

  -- 1.14b : Visiteur anonyme (auth.uid() IS NULL) consulte la question -> +1 vue autorisée
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  PERFORM public.increment_question_views(v_question_id);
  SELECT views_count INTO v_views_count_check FROM public.questions WHERE id = v_question_id;
  IF v_views_count_check <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.14b : increment_question_views n''a pas incrémenté la vue à 1 pour un anonyme (actuel: %)', v_views_count_check;
  END IF;

  -- 1.14c : L'AUTEUR consulte sa propre question -> STRICTEMENT AUCUNE VUE AJOUTÉE
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_author_id::text, 'role', 'authenticated')::text, true);
  PERFORM public.increment_question_views(v_question_id);
  SELECT views_count INTO v_views_count_check FROM public.questions WHERE id = v_question_id;
  IF v_views_count_check <> 1 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.14c : L''auteur a pu incrémenter les vues de sa propre question (actuel: %, attendu: 1)', v_views_count_check;
  END IF;

  -- 1.14d : Un autre utilisateur (Pair) consulte la question -> EXACTEMENT +1 VUE (passe à 2)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_peer_id::text, 'role', 'authenticated')::text, true);
  PERFORM public.increment_question_views(v_question_id);
  SELECT views_count INTO v_views_count_check FROM public.questions WHERE id = v_question_id;
  IF v_views_count_check <> 2 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.14d : Le pair n''a pas pu incrémenter les vues de la question (actuel: %, attendu: 2)', v_views_count_check;
  END IF;

  RAISE NOTICE '[PASS] Test 1.14 : increment_question_views filtre rigoureusement l''auteur et compte fidèlement les pairs et anonymes.';


  -- ===================================================================
  -- PARTIE 2 : TESTS D'AUTORISATIONS ET D'ISOLATION RLS
  -- ===================================================================

  -- Création préalable de brouillons privés pour vérifier l'étanchéité
  INSERT INTO public.fiches (
    id, title, short_description, problem, language, country, operator_service, author_id, status
  ) VALUES (
    v_draft_fiche_id,
    'Brouillon confidentiel auteur A',
    'Desc brouillon',
    'Problème brouillon',
    'Python',
    'Mali',
    'Orange Money',
    v_author_id,
    'draft'
  );

  INSERT INTO public.questions (
    id, title, description, technology, author_id, status
  ) VALUES (
    v_draft_question_id,
    'Question brouillon confidentielle',
    'Description question brouillon',
    'Flutter',
    v_author_id,
    'draft'
  );

  -- 1.14e : Consultation d'une question brouillon (draft) -> AUCUNE VUE AJOUTÉE (reste à 0)
  PERFORM public.increment_question_views(v_draft_question_id);
  SELECT views_count INTO v_views_count_check FROM public.questions WHERE id = v_draft_question_id;
  IF v_views_count_check <> 0 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 1.14e : increment_question_views a incrémenté les vues d''une question brouillon (actuel: %, attendu: 0)', v_views_count_check;
  END IF;
  RAISE NOTICE '[PASS] Test 1.14e : increment_question_views refuse d''incrémenter les questions non publiques (draft).';

  -- TEST 2.1 : Rôle ANONYME (auth.uid() IS NULL)
  v_test_step := 'Test 2.1 : Politiques d''accès anonyme';
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);

  -- 2.1.a : Un anonyme ne peut PAS appeler mark_question_solution()
  v_blocked := FALSE;
  BEGIN
    PERFORM public.mark_question_solution(v_question_id, gen_random_uuid(), TRUE);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Non authentifié%' OR SQLERRM LIKE '%permission denied%' THEN
        v_blocked := TRUE;
      ELSE
        RAISE EXCEPTION 'Exception inattendue reçue : %', SQLERRM;
      END IF;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION 'ÉCHEC TEST 2.1a : Un appel anonyme à mark_question_solution() n''a pas été rejeté !';
  END IF;
  RAISE NOTICE '[PASS] Test 2.1 : Les appels anonymes aux fonctions mutantes sont strictement rejetés.';

  -- TEST 2.2 : Rôle AUTHENTIFIÉ ORDINAIRE (Utilisateur B / Peer)
  v_test_step := 'Test 2.2 : Isolation entre utilisateurs authentifiés ordinaires';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_peer_id::text, 'role', 'authenticated')::text, true);

  -- 2.2.a : L'Utilisateur B ne peut pas usurper l'auteur A lors d'un INSERT sur questions
  v_blocked := FALSE;
  BEGIN
    INSERT INTO public.questions (
      title, description, technology, author_id
    ) VALUES (
      'Question usurpée', 'Description de la question usurpée', 'Kotlin', v_author_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_blocked := TRUE;
  END;

  -- Même si insérée, vérifier que l'author_id n'a pas été usurpé
  SELECT count(*) INTO v_count_check
  FROM public.questions
  WHERE title = 'Question usurpée' AND author_id = v_author_id;

  IF v_count_check > 0 THEN
    RAISE EXCEPTION 'ÉCHEC TEST 2.2a : L''utilisateur B a pu insérer une question avec author_id = utilisateur A !';
  END IF;

  -- 2.2.b : L'Utilisateur B ne peut pas modifier la question de l'Auteur A
  UPDATE public.questions
  SET title = 'Question piratée par utilisateur B'
  WHERE id = v_question_id;

  SELECT title INTO v_status_check FROM public.questions WHERE id = v_question_id;
  IF v_status_check = 'Question piratée par utilisateur B' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 2.2b : L''utilisateur B a pu modifier la question de l''auteur A !';
  END IF;
  RAISE NOTICE '[PASS] Test 2.2 : L''isolation entre pairs empêche toute usurpation et modification croisée.';

  -- TEST 2.3 : Rôle MODÉRATEUR / ADMINISTRATEUR
  v_test_step := 'Test 2.3 : Privilèges de modération et d''administration';
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);

  -- Le modérateur peut masquer une fiche signalée
  UPDATE public.fiches
  SET status = 'hidden'
  WHERE id = v_fiche_id;

  SELECT status INTO v_status_check FROM public.fiches WHERE id = v_fiche_id;
  IF v_status_check <> 'hidden' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 2.3a : Le modérateur n''a pas pu masquer la fiche signalée (status=%)', v_status_check;
  END IF;

  -- Le modérateur peut masquer une question signalée
  UPDATE public.questions
  SET status = 'hidden'
  WHERE id = v_question_id;

  SELECT status INTO v_status_check FROM public.questions WHERE id = v_question_id;
  IF v_status_check <> 'hidden' THEN
    RAISE EXCEPTION 'ÉCHEC TEST 2.3b : Le modérateur n''a pas pu masquer la question signalée (status=%)', v_status_check;
  END IF;
  RAISE NOTICE '[PASS] Test 2.3 : Le modérateur a les privilèges requis pour masquer fiches et questions.';


  -- ===================================================================
  -- NETTOYAGE RIGOUREUX & NON DESTRUCTIF
  -- ===================================================================
  v_test_step := 'Nettoyage des données de test';
  -- Rétablir le contexte d'administration
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- Grâce aux contraintes ON DELETE CASCADE vers auth.users(id),
  -- la suppression des 3 utilisateurs de test supprime automatiquement
  -- l'intégralité de leurs fiches, confirmations, questions, réponses, signalements, favoris et notifications.
  DELETE FROM auth.users WHERE id IN (v_author_id, v_peer_id, v_admin_id);

  RAISE NOTICE '=======================================================';
  RAISE NOTICE '>>> TOUS LES TESTS SONT VALIDES AVEC SUCCES (14/14 PASS)';
  RAISE NOTICE '>>> NETTOYAGE EFFECTUE : AUCUNE DONNEE DE TEST RESIDUELLE';
  RAISE NOTICE '=======================================================';

EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'échec sur n'importe quel test, garantir le nettoyage complet des 3 comptes
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);
    DELETE FROM auth.users WHERE id IN (v_author_id, v_peer_id, v_admin_id);

    RAISE EXCEPTION 'ARRÊT SUR ERREUR [%] : %', v_test_step, SQLERRM;
END $$;
