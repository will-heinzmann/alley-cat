-- 1. Bowling balls (the user's "bag")
CREATE TABLE IF NOT EXISTS public.bowling_balls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  brand text,
  weight integer,
  color text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bowling_balls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bowling balls viewable by everyone"
  ON public.bowling_balls FOR SELECT USING (true);

CREATE POLICY "Users manage their own balls insert"
  ON public.bowling_balls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own balls update"
  ON public.bowling_balls FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own balls delete"
  ON public.bowling_balls FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_bowling_balls_updated_at
BEFORE UPDATE ON public.bowling_balls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bowling_balls_user ON public.bowling_balls (user_id);

-- 2. Add ball reference to games
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS ball_id uuid REFERENCES public.bowling_balls(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_games_ball ON public.games (ball_id);
CREATE INDEX IF NOT EXISTS idx_games_alley_user_created ON public.games (alley_id, user_id, created_at DESC);

-- 3. Game comments
CREATE TABLE IF NOT EXISTS public.game_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by everyone"
  ON public.game_comments FOR SELECT USING (true);

CREATE POLICY "Users post their own comments"
  ON public.game_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users edit their own comments"
  ON public.game_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own comments"
  ON public.game_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_game_comments_updated_at
BEFORE UPDATE ON public.game_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_game_comments_game ON public.game_comments (game_id, created_at);