-- Add reviewed_at to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone DEFAULT NULL;

-- Create lesson_reviews table
CREATE TABLE public.lesson_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid NOT NULL,
  coach_id uuid REFERENCES public.coaches(id) NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- Validation trigger instead of CHECK
CREATE OR REPLACE FUNCTION public.validate_lesson_review_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_rating
  BEFORE INSERT OR UPDATE ON public.lesson_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_review_rating();

-- Enable RLS
ALTER TABLE public.lesson_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Parent inserts own reviews" ON public.lesson_reviews
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parent sees own reviews" ON public.lesson_reviews
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Admin manages reviews" ON public.lesson_reviews
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone counts coach reviews" ON public.lesson_reviews
  FOR SELECT TO authenticated
  USING (true);

-- Trigger: update bookings.reviewed_at and coaches.avg_rating
CREATE OR REPLACE FUNCTION public.handle_lesson_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_avg numeric;
BEGIN
  UPDATE public.bookings SET reviewed_at = now() WHERE id = NEW.booking_id;
  SELECT COALESCE(AVG(rating), 0) INTO new_avg
  FROM public.lesson_reviews WHERE coach_id = NEW.coach_id;
  UPDATE public.coaches SET avg_rating = new_avg WHERE id = NEW.coach_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lesson_review_insert
  AFTER INSERT ON public.lesson_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_lesson_review();