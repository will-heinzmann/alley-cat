
CREATE TABLE public.group_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alley_id UUID REFERENCES public.alleys(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.group_game_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_game_id UUID NOT NULL REFERENCES public.group_games(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  is_guest BOOLEAN NOT NULL DEFAULT true,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group games viewable by owner" ON public.group_games
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create group games" ON public.group_games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own group games" ON public.group_games
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Group game players viewable by game owner" ON public.group_game_players
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_games WHERE id = group_game_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can add players to own games" ON public.group_game_players
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.group_games WHERE id = group_game_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete players from own games" ON public.group_game_players
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_games WHERE id = group_game_id AND user_id = auth.uid())
  );
