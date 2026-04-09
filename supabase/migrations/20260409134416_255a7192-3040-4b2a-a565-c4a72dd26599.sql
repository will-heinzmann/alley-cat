-- Add session grouping fields to games table
ALTER TABLE public.games
  ADD COLUMN session_id uuid DEFAULT NULL,
  ADD COLUMN session_type text DEFAULT 'practice',
  ADD COLUMN game_number integer DEFAULT 1;

-- Index for fast session lookups
CREATE INDEX idx_games_session_id ON public.games (session_id) WHERE session_id IS NOT NULL;