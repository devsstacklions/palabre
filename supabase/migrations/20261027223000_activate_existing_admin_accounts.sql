-- Activate only existing accounts that entered through the admin enrollment flow.
-- This covers registrations made before the portal marker was introduced.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE raw_user_meta_data->>'palabre_portal' = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

DO $migration$
BEGIN
  IF to_regclass('public.admin_access_requests') IS NOT NULL THEN
    EXECUTE $statement$
      INSERT INTO public.user_roles (user_id, role)
      SELECT user_id, 'admin'
      FROM public.admin_access_requests
      WHERE status = 'pending'
      ON CONFLICT (user_id, role) DO NOTHING
    $statement$;
  END IF;
END;
$migration$;