/** B2C tier catalog — keep in sync with backend/services/tier_catalog.py */

export type B2CPaidTier = 'starter' | 'pro' | 'premium';

export interface B2CTierDefinition {
  id: B2CPaidTier;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  highlight?: boolean;
  features: string[];
}

export const B2C_TIERS: B2CTierDefinition[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 9,
    priceAnnual: 89,
    features: [
      '10 statement uploads / month',
      'Fee analyzer vs industry benchmarks',
      '50 AI chat messages / month',
      'Net worth history & risk score',
      'Rebalancing suggestions',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 19,
    priceAnnual: 179,
    highlight: true,
    features: [
      '50 statement uploads / month',
      'Retirement Monte Carlo planner',
      '200 AI chat messages / month',
      'Tax-loss harvesting alerts',
      'Advisor match request',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 49,
    priceAnnual: 449,
    features: [
      'Unlimited uploads & AI chat',
      'Priority advisor matching',
      'Family household (up to 5 members)',
      'Live account aggregation (Plaid)',
      'Direct indexing insights',
      'Dedicated onboarding call',
    ],
  },
];

export const RIA_PRICING_TIERS = [
  {
    name: 'Breakaway',
    audience: 'Solo advisors',
    price: '$199',
    period: '/mo',
    aum: 'Up to $5M AUM',
    clients: '10 client households',
    features: [
      'Full AI analysis & compliance',
      'Statement parsing (17+ formats)',
      'White-label client portal',
      'B2C advisor match referrals',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Starter',
    audience: 'Emerging RIAs',
    price: '$499',
    period: '/mo',
    aum: 'Up to $10M AUM',
    clients: '25 client households',
    features: [
      'Portfolio management & AI analysis',
      'Compliance dashboard & alerts',
      'Statement parsing (17+ formats)',
      'Client reports & household view',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Professional',
    audience: 'Growing practices',
    price: '$999',
    period: '/mo',
    aum: 'Up to $50M AUM',
    clients: '100 client households',
    features: [
      'Everything in Starter',
      'Automated rebalancing & tax harvesting',
      'White-label client portal (FREE)',
      'CRM, prospects & meeting intelligence',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    audience: 'Multi-advisor firms',
    price: 'Custom',
    period: '',
    aum: '$50M+ AUM',
    clients: 'Unlimited households',
    features: [
      'Everything in Professional',
      'Firm management & RBAC',
      'CRM integrations (Salesforce, Redtail)',
      'API access & dedicated account manager',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];
