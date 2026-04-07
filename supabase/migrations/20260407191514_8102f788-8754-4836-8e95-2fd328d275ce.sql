
CREATE TABLE public.favorite_alleys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alley_id uuid NOT NULL REFERENCES public.alleys(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, alley_id)
);

ALTER TABLE public.favorite_alleys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Favorites are viewable by everyone"
  ON public.favorite_alleys FOR SELECT TO public USING (true);

CREATE POLICY "Users can favorite alleys"
  ON public.favorite_alleys FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfavorite alleys"
  ON public.favorite_alleys FOR DELETE TO public
  USING (auth.uid() = user_id);
