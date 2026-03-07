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
      {
        id: 'single_lesson',
        name: 'Single Lesson',
        price: 300,
        description: 'One private lesson at your pool',
        icon: '🏊',
        paymentLink: 'https://buy.stripe.com/test_14A7sKgR90Cb3HT1Lp8N201',
      },
      {
        id: 'pack_5',
        name: '5 Lessons Pack',
        price: 1350,
        pricePerLesson: 270,
        description: 'Save 10% — 5 private lessons',
        icon: '🎯',
        badge: 'Popular',
        paymentLink: 'https://buy.stripe.com/test_eVqbJ0cAT3On92d2Pt8N202',
      },
      {
        id: 'pack_10',
        name: '10 Lessons Pack',
        price: 2500,
        pricePerLesson: 250,
        description: 'Save 17% — 10 private lessons',
        icon: '🏆',
        badge: 'Best Value',
        paymentLink: 'https://buy.stripe.com/test_aFa9AS6cv84D0vHblZ8N203',
      },
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        price: 1800,
        description: 'Unlimited lessons + AI + priority booking',
        icon: '⭐',
        badge: 'Premium',
        isSubscription: true,
        paymentLink: 'https://buy.stripe.com/test_28E28qgR9doX4LX0Hl8N204',
      },
    ],
  },
  baku: {
    currency: 'AZN',
    plans: [
      {
        id: 'single_lesson',
        name: 'Single Lesson',
        price: 40,
        description: 'One private lesson at your pool',
        icon: '🏊',
        paymentLink: 'https://buy.stripe.com/REPLACE_single_lesson_azn',
      },
      {
        id: 'pack_5',
        name: '5 Lessons Pack',
        price: 180,
        description: 'Save 10% — 5 private lessons',
        icon: '🎯',
        badge: 'Popular',
        paymentLink: 'https://buy.stripe.com/REPLACE_pack_5_azn',
      },
      {
        id: 'pack_10',
        name: '10 Lessons Pack',
        price: 320,
        description: 'Save 17% — 10 private lessons',
        icon: '🏆',
        badge: 'Best Value',
        paymentLink: 'https://buy.stripe.com/REPLACE_pack_10_azn',
      },
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        price: 200,
        description: 'Unlimited lessons + AI Assistant + priority booking',
        icon: '⭐',
        badge: 'Premium',
        isSubscription: true,
        paymentLink: 'https://buy.stripe.com/REPLACE_premium_azn',
      },
    ],
  },
};
