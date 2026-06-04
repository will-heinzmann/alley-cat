-- 1. Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  game_id uuid,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- 2. Grants
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 3. RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
-- No INSERT policy: notifications are only created by SECURITY DEFINER triggers below.

-- 4. Trigger: notify game owner when their game is liked
CREATE OR REPLACE FUNCTION public.notify_on_game_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO owner FROM public.games WHERE id = NEW.game_id;
  IF owner IS NULL OR owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT username INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
  VALUES (owner, NEW.user_id, 'like', NEW.game_id,
    COALESCE(actor_name, 'Someone') || ' high-fived your game 🙌');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_game_like_notify
  AFTER INSERT ON public.game_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_game_like();

-- 5. Trigger: notify game owner when their game is commented on
CREATE OR REPLACE FUNCTION public.notify_on_game_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
  actor_name text;
BEGIN
  SELECT user_id INTO owner FROM public.games WHERE id = NEW.game_id;
  IF owner IS NULL OR owner = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT username INTO actor_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
  VALUES (owner, NEW.user_id, 'comment', NEW.game_id,
    COALESCE(actor_name, 'Someone') || ' commented on your game 💬');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_game_comment_notify
  AFTER INSERT ON public.game_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_game_comment();

-- 6. Trigger: notify bowler when they hit an accomplishment
CREATE OR REPLACE FUNCTION public.notify_on_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_best int;
  prior_count int;
  new_count int;
BEGIN
  SELECT COALESCE(MAX(score), 0), COUNT(*)
    INTO prev_best, prior_count
    FROM public.games
    WHERE user_id = NEW.user_id AND id <> NEW.id;

  new_count := prior_count + 1;

  -- Perfect game
  IF NEW.score = 300 THEN
    INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
    VALUES (NEW.user_id, NEW.user_id, 'achievement', NEW.id,
      '🎳 PERFECT GAME! You bowled a 300!');
  ELSIF NEW.score >= 250 AND prev_best < 250 THEN
    INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
    VALUES (NEW.user_id, NEW.user_id, 'achievement', NEW.id,
      '🔥 You broke 250! New high of ' || NEW.score || '.');
  ELSIF NEW.score >= 200 AND prev_best < 200 THEN
    INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
    VALUES (NEW.user_id, NEW.user_id, 'achievement', NEW.id,
      '💪 You broke 200 for the first time with a ' || NEW.score || '!');
  ELSIF prior_count > 0 AND NEW.score > prev_best THEN
    INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
    VALUES (NEW.user_id, NEW.user_id, 'achievement', NEW.id,
      '🏆 New personal best: ' || NEW.score || '!');
  END IF;

  -- Games-logged milestones
  IF new_count IN (10, 25, 50, 100, 250, 500) THEN
    INSERT INTO public.notifications (user_id, actor_id, type, game_id, message)
    VALUES (NEW.user_id, NEW.user_id, 'achievement', NEW.id,
      '🎉 Milestone! You''ve logged ' || new_count || ' games.');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_game_achievement_notify
  AFTER INSERT ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_achievement();

-- 7. Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;