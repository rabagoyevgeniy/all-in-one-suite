/**
 * ProFit Swimming Academy — Pricing Strategy
 * ─────────────────────────────────────────────
 * Based on Perplexity market research (March 2025):
 *
 * MARKET DATA (Dubai 2024-2025):
 * - Private coaches at client's pool: AED 150–300/session
 * - Hamilton Aquatics: AED 115/lesson (Gold & Platinum)
 * - Urban Swim Academy: AED 90–125/session
 * - Dubai Ladies Club: AED 160–180/session
 * - Competitive/elite coaching: AED 400–800+/session
 *
 * POSITIONING: Premium (+6% above market midpoint of AED 265)
 * - Single lesson: AED 280 (travel-to-you premium justified)
 * - Volume discounts: 10% (5-pack), 17% (10-pack), 22% (20-pack)
 * - Subscriptions: positioned between standard and elite tiers
 *
 * BAKU CONVERSION: AED × 0.54 = AZN (adjusted for local purchasing power)
 *
 * Citations:
 * - https://ptpeople.com/swimming-lessons/
 * - https://www.propertyfinder.ae/blog/swimming-classes-dubai/
 * - https://swimfituae.com/product/private-swim-classes-mobile-coaching-at-your-location/
 */

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  pricePerLesson?: number;
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

export const PRICING: Record<string, CityPricing> = {
  dubai: {
    currency: 'AED',
    plans: [
      // ── Test Plan (dev only) ──────────────────────
      {
        id: 'test_plan',
        name: '🧪 Test Payment',
        price: 2,
        description: 'Test only — verify payment works',
        icon: '🧪',
        badge: 'Test',
        isTest: true,
        paymentLink: 'https://buy.stripe.com/test_00w6oG1Wf3On5Q1blZ8N200',
      },

      // ── A) Per-Lesson (Flexible Entry) ────────────
      {
        id: 'single_lesson',
        name: 'Single Lesson',
        price: 280,
        description: 'One private lesson at your pool — coach comes to you',
        icon: '🏊',
        lessonsIncluded: 1,
        features: ['60-min private lesson', 'Coach travels to your pool', 'Post-lesson progress note'],
        targetCustomer: 'Trial customers, occasional swimmers',
        paymentLink: 'https://buy.stripe.com/test_14A7sKgR90Cb3HT1Lp8N201',
      },

      // ── B) 5-Lesson Pack (10% off) ───────────────
      {
        id: 'pack_5',
        name: '5 Lessons Pack',
        price: 1260,
        pricePerLesson: 252,
        description: 'Save 10% — commit to progress',
        icon: '🎯',
        badge: 'Popular',
        lessonsIncluded: 5,
        features: ['5 private lessons', '10% savings vs single', 'Progress tracking in app', 'Belt assessment included'],
        targetCustomer: 'Families testing commitment, beginners',
        paymentLink: 'https://buy.stripe.com/test_eVqbJ0cAT3On92d2Pt8N202',
      },

      // ── C) 10-Lesson Pack (15% off) ──────────────
      {
        id: 'pack_10',
        name: '10 Lessons Pack',
        price: 2380,
        pricePerLesson: 238,
        description: 'Save 15% — serious swimmers',
        icon: '🏆',
        badge: 'Best Value',
        lessonsIncluded: 10,
        features: ['10 private lessons', '15% savings vs single', 'Full belt progression', 'Video analysis included', 'Priority scheduling'],
        targetCustomer: 'Committed families, belt progression seekers',
        paymentLink: 'https://buy.stripe.com/test_aFa9AS6cv84D0vHblZ8N203',
      },

      // ── D) 20-Lesson Pack (22% off) ──────────────
      {
        id: 'pack_20',
        name: '20 Lessons Pack',
        price: 4380,
        pricePerLesson: 219,
        description: 'Save 22% — maximum value for dedicated swimmers',
        icon: '💎',
        badge: 'Max Savings',
        lessonsIncluded: 20,
        features: ['20 private lessons', '22% savings vs single', 'All app features unlocked', 'Belt ceremony included', 'Priority coach selection'],
        targetCustomer: 'Long-term committed families, multiple children',
        paymentLink: '', // TODO: Create Stripe link
      },

      // ── E) Monthly Starter ────────────────────────
      {
        id: 'monthly_starter',
        name: 'Starter Monthly',
        price: 1020,
        pricePerLesson: 255,
        description: '4 lessons/month + app access',
        icon: '🌊',
        isSubscription: true,
        lessonsIncluded: 4,
        features: ['4 lessons per month', 'Basic app access', 'Progress dashboard', 'Chat with coach', 'Belt tracking'],
        targetCustomer: 'Budget-conscious families wanting consistency',
        paymentLink: '', // TODO: Create Stripe subscription link
      },

      // ── F) Monthly Premium ────────────────────────
      {
        id: 'monthly_premium',
        name: 'Premium Monthly',
        price: 1800,
        pricePerLesson: 225,
        description: '8 lessons/month + AI assistant + video analysis',
        icon: '⭐',
        badge: 'Premium',
        isSubscription: true,
        lessonsIncluded: 8,
        features: ['8 lessons per month', 'AI personal assistant', 'Priority booking', 'Video analysis per lesson', 'ProFit Coins rewards', 'Community access'],
        targetCustomer: 'Mid-to-high income families, serious about progress',
        paymentLink: 'https://buy.stripe.com/test_28E28qgR9doX4LX0Hl8N204',
      },

      // ── G) Monthly Elite ──────────────────────────
      {
        id: 'monthly_elite',
        name: 'Elite Monthly',
        price: 2800,
        pricePerLesson: 233,
        description: '12 lessons/month + personal manager + belt ceremony',
        icon: '👑',
        badge: 'Elite',
        isSubscription: true,
        lessonsIncluded: 12,
        features: ['12 lessons per month', 'Personal academy manager', 'Belt ceremony event', 'Unlimited AI assistant', 'GPS coach tracking', 'Premium video library', 'Family dashboard'],
        targetCustomer: 'High-income families, competitive swimmers',
        paymentLink: '', // TODO: Create Stripe subscription link
      },
    ],
  },

  baku: {
    currency: 'AZN',
    plans: [
      {
        id: 'single_lesson',
        name: 'Single Lesson',
        price: 150,
        description: 'One private lesson at your pool',
        icon: '🏊',
        lessonsIncluded: 1,
        paymentLink: '', // TODO: Create Stripe link for Baku
      },
      {
        id: 'pack_5',
        name: '5 Lessons Pack',
        price: 680,
        pricePerLesson: 136,
        description: 'Save 10% — 5 private lessons',
        icon: '🎯',
        badge: 'Popular',
        lessonsIncluded: 5,
        paymentLink: '', // TODO
      },
      {
        id: 'pack_10',
        name: '10 Lessons Pack',
        price: 1285,
        pricePerLesson: 128,
        description: 'Save 15% — 10 private lessons',
        icon: '🏆',
        badge: 'Best Value',
        lessonsIncluded: 10,
        paymentLink: '', // TODO
      },
      {
        id: 'pack_20',
        name: '20 Lessons Pack',
        price: 2365,
        pricePerLesson: 118,
        description: 'Save 22% — maximum value',
        icon: '💎',
        badge: 'Max Savings',
        lessonsIncluded: 20,
        paymentLink: '', // TODO
      },
      {
        id: 'monthly_starter',
        name: 'Starter Monthly',
        price: 550,
        pricePerLesson: 138,
        description: '4 lessons/month + app access',
        icon: '🌊',
        isSubscription: true,
        lessonsIncluded: 4,
        paymentLink: '', // TODO
      },
      {
        id: 'monthly_premium',
        name: 'Premium Monthly',
        price: 970,
        pricePerLesson: 121,
        description: '8 lessons/month + AI + priority booking',
        icon: '⭐',
        badge: 'Premium',
        isSubscription: true,
        lessonsIncluded: 8,
        paymentLink: '', // TODO
      },
      {
        id: 'monthly_elite',
        name: 'Elite Monthly',
        price: 1510,
        pricePerLesson: 126,
        description: '12 lessons/month + everything included',
        icon: '👑',
        badge: 'Elite',
        isSubscription: true,
        lessonsIncluded: 12,
        paymentLink: '', // TODO
      },
    ],
  },
};
