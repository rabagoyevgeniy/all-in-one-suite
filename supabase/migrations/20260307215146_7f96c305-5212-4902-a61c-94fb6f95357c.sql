
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_percent integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lesson_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lesson_type text DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;
