
CREATE OR REPLACE FUNCTION public.update_alley_ratings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.alleys
  SET
    alley_rating = COALESCE((SELECT ROUND(AVG(rating)) FROM public.reviews WHERE alley_id = NEW.alley_id), 3),
    beer_rating = COALESCE((SELECT ROUND(AVG(beer_rating)) FROM public.reviews WHERE alley_id = NEW.alley_id), 0)
  WHERE id = NEW.alley_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_update_alley_ratings
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_alley_ratings();
