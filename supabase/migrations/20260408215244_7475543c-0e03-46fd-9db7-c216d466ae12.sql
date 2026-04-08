
-- Leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  alley_id UUID REFERENCES public.alleys(id),
  day_of_week TEXT,
  start_date DATE,
  end_date DATE,
  games_per_session INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leagues are viewable by everyone" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create leagues" ON public.leagues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "League creator can update" ON public.leagues FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "League creator can delete" ON public.leagues FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- League members table
CREATE TABLE public.league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League members are viewable by everyone" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "Users can join leagues" ON public.league_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave leagues" ON public.league_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- League sessions table
CREATE TABLE public.league_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  week_number INTEGER NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.league_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League sessions are viewable by everyone" ON public.league_sessions FOR SELECT USING (true);
CREATE POLICY "League creator can manage sessions" ON public.league_sessions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.leagues WHERE id = league_id AND created_by = auth.uid())
);
CREATE POLICY "League creator can delete sessions" ON public.league_sessions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.leagues WHERE id = league_id AND created_by = auth.uid())
);

-- League games table (links games to sessions)
CREATE TABLE public.league_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_session_id UUID REFERENCES public.league_sessions(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(league_session_id, game_id)
);

ALTER TABLE public.league_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League games are viewable by everyone" ON public.league_games FOR SELECT USING (true);
CREATE POLICY "Users can add own games to sessions" ON public.league_games FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own games" ON public.league_games FOR DELETE TO authenticated USING (auth.uid() = user_id);
