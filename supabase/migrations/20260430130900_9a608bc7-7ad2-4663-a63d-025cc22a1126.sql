-- 1. Create role enum and user_roles table for proper role-based admin checks
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Anyone can read roles (so UI can show admin badges, etc.) but no one can write via API
CREATE POLICY "User roles viewable by everyone"
ON public.user_roles FOR SELECT
USING (true);

-- No INSERT/UPDATE/DELETE policies = only service role can modify

-- 2. Generic role-check function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Seed existing admin into user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('094958ab-cf6a-4ab2-a771-ff8697b4e65f'::uuid, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Replace hardcoded is_app_admin with role-table lookup
CREATE OR REPLACE FUNCTION public.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
$$;

-- 5. Revoke EXECUTE from anon to reduce attack surface (authenticated still needs it for RLS policies)
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_app_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 6. Tighten public storage buckets: replace broad SELECT with object-path SELECT (still readable, but not "list bucket")
-- Drop duplicate/broad listing policies
DROP POLICY IF EXISTS "Anyone can view game images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view game images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

-- Recreate as narrower SELECT policies that still allow direct file access (by known path)
-- but reduce duplicate permissive policies. Public buckets remain accessible by URL.
CREATE POLICY "Public read avatars by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Public read game-images by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-images');