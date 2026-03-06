ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS penalty_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warnings_sent integer[] DEFAULT '{}'::integer[];