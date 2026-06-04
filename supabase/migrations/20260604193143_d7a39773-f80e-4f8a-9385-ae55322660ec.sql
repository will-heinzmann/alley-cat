-- 1. Bowling balls: restrict full-row read to owner, expose safe fields via a public view
DROP POLICY IF EXISTS "Bowling balls viewable by everyone" ON public.bowling_balls;

CREATE POLICY "Users can view own bowling balls"
  ON public.bowling_balls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.bowling_balls_public AS
  SELECT id, user_id, name, brand, weight, color, is_active, created_at
  FROM public.bowling_balls;

GRANT SELECT ON public.bowling_balls_public TO anon, authenticated;

-- 2. Alley website URL validation (only http/https). NOT VALID so existing rows are untouched.
ALTER TABLE public.alleys
  ADD CONSTRAINT alleys_website_protocol_chk
  CHECK (website IS NULL OR website ~* '^https?://')
  NOT VALID;

-- 3. user_roles: only allow each user to read their own roles
DROP POLICY IF EXISTS "User roles viewable by everyone" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);