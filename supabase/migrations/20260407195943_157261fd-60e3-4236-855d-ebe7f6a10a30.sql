
-- Add slug column
ALTER TABLE public.alleys ADD COLUMN slug text;

-- Populate slugs using a window function to handle duplicates
WITH slugs AS (
  SELECT id,
    lower(regexp_replace(regexp_replace(regexp_replace(name || '-' || city, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'), '-+', '-', 'g')) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY lower(regexp_replace(regexp_replace(regexp_replace(name || '-' || city, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'), '-+', '-', 'g'))
      ORDER BY created_at
    ) AS rn
  FROM public.alleys
)
UPDATE public.alleys a
SET slug = CASE WHEN s.rn = 1 THEN s.base_slug ELSE s.base_slug || '-' || s.rn END
FROM slugs s
WHERE a.id = s.id;

-- Make slug NOT NULL and unique
ALTER TABLE public.alleys ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX alleys_slug_unique ON public.alleys (slug);
