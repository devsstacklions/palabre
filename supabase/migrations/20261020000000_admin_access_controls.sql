-- Allow administrator dashboards to read account profiles without exposing
-- profile email addresses through the public API.
REVOKE SELECT ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id,
  username,
  display_name,
  avatar_url,
  country,
  bio,
  tech_stack,
  is_public,
  created_at,
  updated_at
) ON TABLE public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Les admins peuvent consulter tous les profils" ON public.profiles;
CREATE POLICY "Les admins peuvent consulter tous les profils"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());
