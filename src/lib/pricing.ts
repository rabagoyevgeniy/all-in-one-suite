/**
 * ProFit Swimming Academy — Pricing Strategy
 * ─────────────────────────────────────────────
 * Base price: AED 350/lesson (premium mobile coaching)
 * Baku conversion: AED × 0.54 = AZN (rounded to nearest 5)
 *
 * Stripe test links (5 active):
 * - test_plan     → test_00w6oG1Wf3On5Q1blZ8N200
 * - single_lesson → test_14A7sKgR90Cb3HT1Lp8N201
 * - pack_5        → test_eVqbJ0cAT3On92d2Pt8N202
 * - pack_10       → test_aFa9AS6cv84D0vHblZ8N203
 * - premium_monthly → test_28E28qgR9doX4LX0Hl8N204
 */

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  pricePerLesson?: number;
  savingPercent?: number;
  description: string;
  icon: string;
  badge?: string;
  isSubscription?: boolean;
  isTest?: boolean;
  lessonsIncluded?: number;
  features?: string[];
  targetCustomer?: string;
  paymentLink: string;
}

export interface CityPricing {
  currency: string;
  plans: PricingPlan[];
}

export const PLAN_SECTIONS = [
  { label: '🎯 Lesson Packs', ids: ['single_lesson', 'pack_5', 'pack_10', 'pack_20'] },
  { label: '📅 Monthly Subscriptions', ids: ['starter_monthly', 'premium_monthly', 'elite_monthly'] },
  { label: '👨‍👩‍👧 Special', ids: ['family_pack'] },
] as const;

export const DUBAI_PLANS: PricingPlan[] = [
  {
    id: 'test_plan',
    name: '🧪 Test Payment',
    price: 2,
    currency: 'AED',
    description: 'Dev only — verify payment flow',
    icon: '🧪',
    isTest: true,
    paymentLink: 'https://buy.stripe.com/test_00w6oG1Wf3On5Q1blZ8N200',
  },
  {
    id: 'single_lesson',
    name: 'Single Lesson',
    price: 350,
    currency: 'AED',
    description: 'Coach comes to your private pool',
    icon: '🏊',
    lessonsIncluded: 1,
    paymentLink: 'https://buy.stripe.com/test_14A7sKgR90Cb3HT1Lp8N201',
  },
  {
    id: 'pack_5',
    name: '5 Lessons Pack',
    price: 1575,
    currency: 'AED',
    description: 'Save 10% — commit to progress',
    icon: '🎯',
    badge: 'Popular',
    pricePerLesson: 315,
    savingPercent: 10,
    lessonsIncluded: 5,
    paymentLink: 'https://buy.stripe.com/test_eVqbJ0cAT3On92d2Pt8N202',
  },
  {
    id: 'pack_10',
    name: '10 Lessons Pack',
    price: 2975,
    currency: 'AED',
    description: 'Save 15% — serious swimmers',
    icon: '🏆',
    badge: 'Best Value',
    pricePerLesson: 298,
    savingPercent: 15,
    lessonsIncluded: 10,
    paymentLink: 'https://buy.stripe.com/test_aFa9AS6cv84D0vHblZ8N203',
  },
  {
    id: 'pack_20',
    name: '20 Lessons Pack',
    price: 5460,
    currency: 'AED',
    description: 'Save 22% — maximum value',
    icon: '💎',
    badge: 'Max Savings',
    pricePerLesson: 273,
    savingPercent: 22,
    lessonsIncluded: 20,
    paymentLink: '',
  },
  {
    id: 'starter_monthly',
    name: 'Starter Monthly',
    price: 1260,
    currency: 'AED',
    description: '5 lessons/month — best entry subscription',
    icon: '🌊',
    badge: 'Subscribe',
    pricePerLesson: 252,
    savingPercent: 28,
    isSubscription: true,
    lessonsIncluded: 5,
    paymentLink: '',
  },
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    price: 2240,
    currency: 'AED',
    description: '8 lessons/month + AI Assistant + video analysis',
    icon: '⭐',
    badge: 'Premium',
    pricePerLesson: 280,
    savingPercent: 20,
    isSubscription: true,
    lessonsIncluded: 8,
    paymentLink: 'https://buy.stripe.com/test_28E28qgR9doX4LX0Hl8N204',
  },
  {
    id: 'elite_monthly',
    name: 'Elite Monthly',
    price: 3360,
    currency: 'AED',
    description: '12 lessons/month + personal manager + belt ceremony',
    icon: '👑',
    badge: 'Elite',
    pricePerLesson: 280,
    savingPercent: 20,
    isSubscription: true,
    lessonsIncluded: 12,
    paymentLink: '',
  },
  {
    id: 'family_pack',
    name: 'Family Package',
    price: 2940,
    currency: 'AED',
    description: '12 lessons for 2 children — save 30%',
    icon: '👨‍👩‍👧',
    badge: 'Family',
    pricePerLesson: 245,
    savingPercent: 30,
    lessonsIncluded: 12,
    paymentLink: '',
  },
];

export const BAKU_PLANS: PricingPlan[] = DUBAI_PLANS.map(plan => ({
  ...plan,
  currency: 'AZN',
  price: Math.round((plan.price * 0.54) / 5) * 5,
  pricePerLesson: plan.pricePerLesson
    ? Math.round(plan.pricePerLesson * 0.54)
    : undefined,
  paymentLink: '',
}));

export const PRICING: Record<string, CityPricing> = {
  dubai: { currency: 'AED', plans: DUBAI_PLANS },
  baku: { currency: 'AZN', plans: BAKU_PLANS },
};
