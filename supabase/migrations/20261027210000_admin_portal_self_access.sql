-- Auto-assign the admin role only to registrations explicitly initiated in the admin portal.
-- Ordinary registrations keep the regular user role and cannot promote themselves.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
BEGIN
  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_display_name := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', v_username);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(new.id::text, 1, 5);
  END IF;

  INSERT INTO public.profiles (id, username, display_name, email, country, tech_stack)
  VALUES (new.id, v_username, v_display_name, new.email,
          new.raw_user_meta_data->>'country', ARRAY[]::TEXT[])
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  IF new.raw_user_meta_data->>'palabre_portal' = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN new;
END;
$function$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Also activate accounts that were already registered through the admin portal
-- before this migration was applied.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE raw_user_meta_data->>'palabre_portal' = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.review_admin_access_request(UUID, TEXT);