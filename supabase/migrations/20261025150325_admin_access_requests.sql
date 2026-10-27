CREATE TABLE public.admin_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX admin_access_requests_one_pending_per_user
  ON public.admin_access_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX admin_access_requests_pending_created_at
  ON public.admin_access_requests (created_at)
  WHERE status = 'pending';

ALTER TABLE public.admin_access_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_access_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_access_requests TO authenticated;
GRANT INSERT (user_id) ON TABLE public.admin_access_requests TO authenticated;
GRANT UPDATE (status, reviewed_at, reviewed_by)
  ON TABLE public.admin_access_requests TO authenticated;

CREATE POLICY "Les utilisateurs consultent leurs demandes admin"
  ON public.admin_access_requests FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin());

CREATE POLICY "Les utilisateurs demandent leur propre accès admin"
  ON public.admin_access_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
  );

CREATE POLICY "Seuls les admins traitent les demandes admin"
  ON public.admin_access_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.review_admin_access_request(
  request_id UUID,
  decision TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  request_user_id UUID;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  IF decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid admin access decision';
  END IF;

  SELECT user_id
  INTO request_user_id
  FROM public.admin_access_requests
  WHERE id = request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending admin access request not found';
  END IF;

  IF decision = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (request_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.admin_access_requests
  SET status = decision,
      reviewed_at = timezone('utc'::text, now()),
      reviewed_by = (SELECT auth.uid())
  WHERE id = request_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.review_admin_access_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_admin_access_request(UUID, TEXT) TO authenticated;