
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  city text NOT NULL DEFAULT 'dubai',
  name text NOT NULL,
  description text,
  icon text DEFAULT '🏊',
  badge text,
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AED',
  price_per_lesson numeric,
  saving_percent integer,
  lessons_included integer,
  is_subscription boolean DEFAULT false,
  is_test boolean DEFAULT false,
  is_active boolean DEFAULT true,
  stripe_payment_link text,
  sort_order integer DEFAULT 0,
  features text[] DEFAULT '{}',
  target_customer text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plan_key, city)
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active plans" ON public.pricing_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manages pricing plans" ON public.pricing_plans
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
