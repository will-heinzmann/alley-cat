-- 1. Restrict alley_update_requests.field_name to a strict allowlist
ALTER TABLE public.alley_update_requests
  ADD CONSTRAINT alley_update_requests_field_name_allowlist
  CHECK (field_name IN ('lane_count', 'phone'));

-- 2. Restrict who can read alley update requests (only submitter + admins)
DROP POLICY IF EXISTS "Update requests are viewable by everyone" ON public.alley_update_requests;
CREATE POLICY "Submitters and admins can view update requests"
  ON public.alley_update_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_app_admin(auth.uid()));

-- 3. Grant the admin role to williamheinzmann@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('094958ab-cf6a-4ab2-a771-ff8697b4e65f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;