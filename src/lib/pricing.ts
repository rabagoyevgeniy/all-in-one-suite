export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  pricePerLesson?: number;
  description: string;
  icon: string;
  badge?: string;
  isSubscription?: boolean;
  priceId: string;
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
        id: 'single_lesson',
        name: 'Single Lesson',
        price: 300,
        description: 'One private lesson at your pool',
        icon: '🏊',
        priceId: 'price_1T89G5Cb87PTRYLaSpB8fLfC',
      },
      {
        id: 'pack_5',
        name: '5 Lessons Pack',
        price: 1350,
        pricePerLesson: 270,
        description: 'Save 10% — 5 private lessons',
        icon: '🎯',
        badge: 'Popular',
        priceId: 'price_1T89GDCb87PTRYLaabCuvSsK',
      },
      {
        id: 'pack_10',
        name: '10 Lessons Pack',
        price: 2500,
        pricePerLesson: 250,
        description: 'Save 17% — 10 private lessons',
        icon: '🏆',
        badge: 'Best Value',
        priceId: 'price_1T89GECb87PTRYLaWCVYCw1t',
      },
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        price: 1800,
        description: 'Unlimited lessons + AI Assistant + priority booking',
        icon: '⭐',
        badge: 'Premium',
        isSubscription: true,
        priceId: 'price_1T89GFCb87PTRYLaJVpjOIhV',
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
        priceId: 'price_1T89GGCb87PTRYLacD0qhAxZ',
      },
      {
        id: 'pack_5',
        name: '5 Lessons Pack',
        price: 180,
        description: 'Save 10% — 5 private lessons',
        icon: '🎯',
        badge: 'Popular',
        priceId: 'price_1T89GHCb87PTRYLarYW5i5k7',
      },
      {
        id: 'pack_10',
        name: '10 Lessons Pack',
        price: 320,
        description: 'Save 17% — 10 private lessons',
        icon: '🏆',
        badge: 'Best Value',
        priceId: 'price_1T89GICb87PTRYLahlNjuyXE',
      },
      {
        id: 'premium_monthly',
        name: 'Premium Monthly',
        price: 200,
        description: 'Unlimited lessons + AI Assistant + priority booking',
        icon: '⭐',
        badge: 'Premium',
        isSubscription: true,
        priceId: 'price_1T89GJCb87PTRYLaK49PgvMU',
      },
    ],
  },
};
