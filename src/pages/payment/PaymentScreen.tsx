import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Shield, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import { usePricingPlans, type PricingPlan } from '@/hooks/usePricingPlans';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIVATE_SECTIONS = [
  {
    label: '🎁 Special Offer',
    keys: ['trial_lesson', 'trial_lesson_baku'],
  },
  {
    label: '🎯 Lesson Packs',
    keys: [
      'single_lesson', 'single_lesson_baku',
      'pack_5', 'pack_5_baku',
      'pack_8_baku',
      'pack_10',
      'pack_12_baku',
      'pack_20', 'pack_20_baku',
    ],
  },
  {
    label: '📅 Monthly Subscriptions',
    keys: [
      'starter_monthly', 'starter_monthly_baku',
      'premium_monthly', 'premium_monthly_baku',
      'elite_monthly', 'elite_monthly_baku',
    ],
  },
  {
    label: '👨‍👩‍👧 Special Offers',
    keys: ['family_pack', 'family_pack_baku'],
  },
];

const GROUP_SECTIONS = [
  {
    label: '🏊 Group Packs',
    keys: [
      'group_single', 'group_single_baku',
      'group_pack_5', 'group_pack_8_baku',
      'group_pack_10', 'group_pack_12_baku',
      'group_pack_20', 'group_pack_20_baku',
      'group_intensive',
    ],
  },
  {
    label: '📅 Group Subscription',
    keys: ['group_monthly', 'group_monthly_baku'],
  },
];

function calcSavings(plan: PricingPlan): number | null {
  if (!plan.lesson_count || plan.lesson_count <= 1 || !plan.price_per_lesson) return null;
  const basePrice = plan.currency === 'AZN' ? 45 : 350;
  const fullPrice = basePrice * plan.lesson_count;
  const saved = Math.round(fullPrice - plan.price);
  return saved > 0 ? saved : null;
}

export default function PaymentScreen() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { t } = useLanguage();
  const [activeCity, setActiveCity] = useState<'dubai' | 'baku'>(
    profile?.city?.toLowerCase() === 'baku' ? 'baku' : 'dubai'
  );
  const [lessonType, setLessonType] = useState<'private' | 'group'>('private');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const showTest = window.location.search.includes('test=true') || window.location.hostname === 'localhost';
  const { data: allPlans = [], isLoading } = usePricingPlans(activeCity, showTest);

  const sections = lessonType === 'private' ? PRIVATE_SECTIONS : GROUP_SECTIONS;
  const selected = allPlans.find(p => p.plan_key === selectedKey) || null;
  const currency = activeCity === 'dubai' ? 'AED' : 'AZN';

  const handlePay = () => {
    if (!selected) return;
    if (!selected.stripe_payment_link) {
      toast.info('Coming soon', { description: 'Payment link will be available shortly' });
      return;
    }
    window.open(selected.stripe_payment_link, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-operations flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-operations">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-5 pt-12 pb-6 text-primary-foreground">
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

        {/* Private / Group toggle */}
        <div className="flex gap-2 mt-4 bg-primary-foreground/10 rounded-xl p-1">
          <button
            onClick={() => { setLessonType('private'); setSelectedKey(null); }}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              lessonType === 'private'
                ? "bg-card text-primary shadow-sm"
                : "text-primary-foreground/70 hover:text-primary-foreground"
            )}
          >
            🏠 {t('Private', 'Личные')}
          </button>
          <button
            onClick={() => { setLessonType('group'); setSelectedKey(null); }}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              lessonType === 'group'
                ? "bg-card text-primary shadow-sm"
                : "text-primary-foreground/70 hover:text-primary-foreground"
            )}
          >
            👥 {t('Group', 'Группа')}
          </button>
        </div>
      </div>

      {/* City Switcher */}
      <div className="flex gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        {(['dubai', 'baku'] as const).map(city => (
          <button
            key={city}
            onClick={() => { setActiveCity(city); setSelectedKey(null); }}
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

      {/* Plan Cards grouped by section */}
      <div className="px-4 mt-3 space-y-4 pb-4">
        {/* Test plans */}
        {showTest && allPlans.filter(p => p.is_test).map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currency={currency}
            selected={selectedKey === plan.plan_key}
            onSelect={() => setSelectedKey(plan.plan_key)}
            index={i}
          />
        ))}

        {sections.map(section => {
          const sectionPlans = allPlans.filter(p => section.keys.includes(p.plan_key) && !p.is_test);
          if (sectionPlans.length === 0) return null;
          return (
            <div key={section.label}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-1">
                {section.label}
              </h2>
              <div className="space-y-3">
                {sectionPlans.map((plan, i) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currency={currency}
                    selected={selectedKey === plan.plan_key}
                    onSelect={() => setSelectedKey(plan.plan_key)}
                    index={i}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA — only when a plan is selected */}
      {selected && (
        <div className="px-4 py-6">
          <button
            onClick={handlePay}
            className={cn(
              'w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2',
              selected.stripe_payment_link
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <CreditCard className="w-5 h-5" />
            {selected.stripe_payment_link
              ? `${t('Pay', 'Оплатить')} ${selected.price.toLocaleString()} ${currency} →`
              : 'Coming soon'}
          </button>
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            {t('Secured by Stripe', 'Защищено Stripe')}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Trial Card ───────────────────────────────────────────── */

function TrialCard({
  plan,
  selected,
  onSelect,
  index,
}: {
  plan: PricingPlan;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-2xl border-2 overflow-hidden transition-all",
        selected
          ? "border-orange-400 shadow-lg shadow-orange-500/10"
          : "border-orange-200 dark:border-orange-800"
      )}
    >
      {/* Ribbon banner */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 flex items-center justify-between">
        <span className="text-white text-xs font-bold tracking-wide">
          🎁 FIRST LESSON — 50% OFF
        </span>
        <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          One time only
        </span>
      </div>
      {/* Card body */}
      <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-foreground">{plan.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{plan.description}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-orange-500">
              {plan.price} {plan.currency}
            </div>
            {plan.original_price && (
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <span className="text-xs text-muted-foreground line-through">
                  {plan.original_price} {plan.currency}
                </span>
                {plan.discount_percent && (
                  <span className="text-xs text-emerald-600 font-semibold">
                    -{plan.discount_percent}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 bg-card/70 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-base">🏊</span>
          <span className="text-xs text-muted-foreground">
            Coach comes to your pool · No commitment required
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ── Regular Plan Card ────────────────────────────────────── */

function PlanCard({
  plan,
  currency,
  selected,
  onSelect,
  index,
}: {
  plan: PricingPlan;
  currency: string;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  // Trial card gets special treatment
  if (plan.is_trial) {
    return <TrialCard plan={plan} selected={selected} onSelect={onSelect} index={index} />;
  }

  const noLink = !plan.stripe_payment_link;
  const saved = calcSavings(plan);

  const badgeStyle = (badge?: string | null) => {
    switch (badge) {
      case 'Elite':
      case 'Элит': return 'bg-gradient-to-r from-violet-500 to-purple-600 text-white';
      case 'Premium':
      case 'Премиум': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white';
      case 'Best Value':
      case 'Лучший выбор':
      case 'Max Savings':
      case 'Макс. выгода':
      case 'Выгодно': return 'bg-emerald-500 text-white';
      case 'Family':
      case 'Семейный': return 'bg-gradient-to-r from-pink-400 to-rose-500 text-white';
      case 'Subscribe':
      case 'Подписка': return 'bg-gradient-to-r from-sky-400 to-blue-500 text-white';
      case 'Популярный': return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white';
      case 'Попробуй': return 'bg-gradient-to-r from-orange-400 to-red-500 text-white';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-2xl border-2 text-left transition-all relative',
        noLink && !plan.is_test ? 'opacity-60' : '',
        plan.is_test
          ? selected
            ? 'border-dashed border-muted-foreground bg-muted/30 shadow-md'
            : 'border-dashed border-muted-foreground/40 bg-muted/10'
          : selected
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
            {/* Savings display */}
            {saved && saved > 0 ? (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                  💰 Save {saved} {currency}
                </span>
                {plan.saving_percent && (
                  <span className="text-[10px] text-muted-foreground">({plan.saving_percent}% off)</span>
                )}
              </div>
            ) : plan.saving_percent ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Save {plan.saving_percent}%
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display font-bold text-lg text-foreground">
            {Number(plan.price).toLocaleString()} {currency}
          </div>
          {plan.price_per_lesson && (
            <div className="text-[10px] text-muted-foreground">
              {Number(plan.price_per_lesson)} {currency}/lesson
            </div>
          )}
          {plan.is_subscription && (
            <div className="text-[10px] text-muted-foreground">/month</div>
          )}
          {noLink && !plan.is_test && (
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              Coming soon
            </span>
          )}
        </div>
      </div>
      {plan.badge && (
        <span
          className={cn(
            'absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold',
            badgeStyle(plan.badge),
          )}
        >
          {plan.badge}
        </span>
      )}
    </motion.button>
  );
}
