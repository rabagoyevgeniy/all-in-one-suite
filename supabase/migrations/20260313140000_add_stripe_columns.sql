-- Add stripe_session_id to financial_transactions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_transactions'
      AND column_name = 'stripe_session_id'
  ) THEN
    ALTER TABLE public.financial_transactions ADD COLUMN stripe_session_id TEXT;
  END IF;
END $$;

-- Add stripe_subscription_id to subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Create index on stripe_session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_financial_transactions_stripe_session
  ON public.financial_transactions (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Create index on stripe_subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
