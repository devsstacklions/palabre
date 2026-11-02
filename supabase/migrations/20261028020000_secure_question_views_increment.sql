-- ===================================================================
-- PALABRE — Sécurisation du Compteur de Vues des Questions (Entraide)
-- Coupe d'Afrique des Développeurs (CADev) 2026
-- ===================================================================
-- MOTIF DE CETTE MIGRATION :
-- 1. Empêcher l'auteur connecté d'incrémenter le compteur de vues de ses propres questions,
--    y compris en cas d'appel RPC direct ou de navigation depuis son tableau de bord.
-- 2. Garantir la sécurité en profondeur côté serveur (PostgreSQL) sans dépendre uniquement du frontend.
-- 3. Préserver le comptage unitaire exact pour les visiteurs anonymes (auth.uid() IS NULL)
--    et les autres utilisateurs pairs (auth.uid() <> author_id).
-- 4. Restreindre strictement la modification à la colonne 'views_count' de la question ciblée
--    sans toucher aux brouillons/masqués, aux fiches, ni à aucune autre table.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.increment_question_views(p_question_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seule la question spécifiée est incrémentée de +1
  -- Strictement ignoré si l'utilisateur connecté est l'auteur de la question
  UPDATE public.questions
  SET views_count = views_count + 1
  WHERE id = p_question_id 
    AND status NOT IN ('draft', 'hidden')
    AND (auth.uid() IS NULL OR author_id <> auth.uid());
END;
$$;

-- Révocation de PUBLIC et octroi ciblé aux rôles anonyme et authentifié
REVOKE EXECUTE ON FUNCTION public.increment_question_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_question_views(UUID) TO anon, authenticated;
