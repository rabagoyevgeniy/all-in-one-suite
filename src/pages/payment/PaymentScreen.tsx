import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { PRICING, type PricingPlan } from '@/lib/pricing';
import { cn } from '@/lib/utils';

export default function PaymentScreen() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [activeCity, setActiveCity] = useState<string>(
    profile?.city?.toLowerCase() === 'baku' ? 'baku' : 'dubai'
  );

  const { currency, plans: allPlans } = PRICING[activeCity];
  const showTestPlan = window.location.search.includes('test=true') || window.location.hostname === 'localhost';
  const plans = showTestPlan ? allPlans : allPlans.filter(p => !p.isTest);

  const handlePay = () => {
    if (!selectedPlan?.paymentLink) return;
    window.open(selectedPlan.paymentLink, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-operations">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-5 pt-12 pb-8 text-primary-foreground">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-primary-foreground/70 mb-4"
        >
          <ArrowLeft size={16} /> {t('Back', 'Назад')}
        </button>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold">
            {t('Choose Your Plan', 'Выберите план')}
          </h1>
          <p className="text-primary-foreground/70 text-sm mt-1">
            {t(
              `Premium swimming coaching in ${activeCity === 'baku' ? 'Baku' : 'Dubai'}`,
              `Премиум обучение плаванию в ${activeCity === 'baku' ? 'Баку' : 'Дубае'}`,
            )}
          </p>
        </motion.div>
      </div>

      {/* City Switcher */}
      <div className="flex gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        {['dubai', 'baku'].map(city => (
          <button
            key={city}
            onClick={() => { setActiveCity(city); setSelectedPlan(null); }}
            className={cn(
              "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
              activeCity === city
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground border border-border"
            )}
          >
            {city === 'dubai' ? '🇦🇪 Dubai (AED)' : '🇦🇿 Baku (AZN)'}
          </button>
        ))}
      </div>

      {/* Plan Cards */}
      <div className="px-4 mt-3 space-y-3 pb-36">
        {plans.map((plan, i) => (
          <motion.button
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => setSelectedPlan(plan)}
            className={cn(
              'w-full p-4 rounded-2xl border-2 text-left transition-all relative',
              plan.isTest
                ? selectedPlan?.id === plan.id
                  ? 'border-dashed border-muted-foreground bg-muted/30 shadow-md'
                  : 'border-dashed border-muted-foreground/40 bg-muted/10'
                : selectedPlan?.id === plan.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/30',
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{plan.icon}</span>
                <div>
                  <div className="font-semibold text-foreground">{plan.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {plan.description}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display font-bold text-lg text-foreground">
                  {plan.price.toLocaleString()} {currency}
                </div>
                {plan.pricePerLesson && (
                  <div className="text-[10px] text-muted-foreground">
                    {plan.pricePerLesson} {currency}/lesson
                  </div>
                )}
                {plan.isSubscription && (
                  <div className="text-[10px] text-muted-foreground">/month</div>
                )}
              </div>
            </div>
            {plan.badge && (
              <span
                className={cn(
                  'absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold',
                  plan.badge === 'Premium'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                    : plan.badge === 'Best Value'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary text-primary-foreground',
                )}
              >
                {plan.badge}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-4 safe-area-bottom">
        <button
          onClick={handlePay}
          disabled={!selectedPlan}
          className={cn(
            'w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2',
            selectedPlan
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <CreditCard className="w-5 h-5" />
          {selectedPlan
            ? `${t('Pay', 'Оплатить')} ${selectedPlan.price.toLocaleString()} ${currency} →`
            : t('Select a plan', 'Выберите план')}
        </button>
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          {t('Secured by Stripe', 'Защищено Stripe')}
        </div>
      </div>
    </div>
  );
}
