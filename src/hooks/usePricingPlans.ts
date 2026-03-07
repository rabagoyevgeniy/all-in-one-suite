import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PricingPlan {
  id: string;
  plan_key: string;
  city: string;
  name: string;
  description: string | null;
  icon: string;
  badge: string | null;
  price: number;
  currency: string;
  price_per_lesson: number | null;
  saving_percent: number | null;
  lessons_included: number | null;
  is_subscription: boolean;
  is_test: boolean;
  is_active: boolean;
  stripe_payment_link: string | null;
  sort_order: number;
  features: string[];
  target_customer: string | null;
}

export function usePricingPlans(city: 'dubai' | 'baku' = 'dubai', includeTest = false) {
  return useQuery({
    queryKey: ['pricing_plans', city],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('city', city)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const plans = (data || []) as unknown as PricingPlan[];
      return includeTest ? plans : plans.filter(p => !p.is_test);
    },
    staleTime: 5 * 60 * 1000,
  });
}
