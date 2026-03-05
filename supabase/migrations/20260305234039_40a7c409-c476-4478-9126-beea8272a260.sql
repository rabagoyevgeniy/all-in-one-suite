
-- Fix search_path on the validation function
CREATE OR REPLACE FUNCTION public.validate_task_assignment_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.coin_reward > 100 THEN
    RAISE EXCEPTION 'Coin reward cannot exceed 100';
  END IF;
  IF NEW.coin_reward < 0 THEN
    RAISE EXCEPTION 'Coin reward cannot be negative';
  END IF;
  RETURN NEW;
END;
$$;
