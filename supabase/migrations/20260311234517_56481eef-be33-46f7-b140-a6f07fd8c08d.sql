
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS started_location_lat numeric,
  ADD COLUMN IF NOT EXISTS started_location_lng numeric,
  ADD COLUMN IF NOT EXISTS ended_location_lat numeric,
  ADD COLUMN IF NOT EXISTS ended_location_lng numeric;

ALTER TABLE public.coaches
  ADD COLUMN IF NOT EXISTS rank_history jsonb DEFAULT '[]'::jsonb;
