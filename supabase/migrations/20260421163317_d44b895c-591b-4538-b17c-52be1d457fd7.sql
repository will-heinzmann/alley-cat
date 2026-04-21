-- 1. Add new columns
ALTER TABLE public.alleys
  ADD COLUMN IF NOT EXISTS lane_surface text NOT NULL DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS amenities text[] NOT NULL DEFAULT '{}'::text[];

-- 2. Index for city landing pages
CREATE INDEX IF NOT EXISTS idx_alleys_city_state ON public.alleys (state, city);
CREATE INDEX IF NOT EXISTS idx_alleys_amenities ON public.alleys USING GIN (amenities);

-- 3. Replace the admin-only UPDATE policy with a split:
--    - Admins can update anything
--    - Authenticated users can update only the "amenity-style" fields. We enforce this by
--      requiring all non-amenity fields to remain unchanged.
DROP POLICY IF EXISTS "Only admin can update alleys" ON public.alleys;

CREATE POLICY "Admins can update alleys"
ON public.alleys
FOR UPDATE
TO authenticated
USING (public.is_app_admin(auth.uid()))
WITH CHECK (public.is_app_admin(auth.uid()));

CREATE POLICY "Authenticated users can update amenity fields"
ON public.alleys
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Trigger to enforce that non-admin users may only modify amenity-related fields
CREATE OR REPLACE FUNCTION public.enforce_alley_amenity_only_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_app_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admins: only allow lane_surface, amenities, pinsetter_type, oil_pattern to change
  IF NEW.name IS DISTINCT FROM OLD.name
     OR NEW.address IS DISTINCT FROM OLD.address
     OR NEW.city IS DISTINCT FROM OLD.city
     OR NEW.state IS DISTINCT FROM OLD.state
     OR NEW.zip_code IS DISTINCT FROM OLD.zip_code
     OR NEW.lat IS DISTINCT FROM OLD.lat
     OR NEW.lng IS DISTINCT FROM OLD.lng
     OR NEW.lane_count IS DISTINCT FROM OLD.lane_count
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.website IS DISTINCT FROM OLD.website
     OR NEW.alley_rating IS DISTINCT FROM OLD.alley_rating
     OR NEW.beer_rating IS DISTINCT FROM OLD.beer_rating
  THEN
    RAISE EXCEPTION 'Only amenity fields (lane_surface, amenities, pinsetter_type, oil_pattern) can be edited by non-admins';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_alley_amenity_only_updates ON public.alleys;
CREATE TRIGGER enforce_alley_amenity_only_updates
BEFORE UPDATE ON public.alleys
FOR EACH ROW
EXECUTE FUNCTION public.enforce_alley_amenity_only_updates();