import { MARKETING_COPY } from './marketingCopy';

export const HERO_STATS = [
  { value: '38', label: 'Advisor Modules' },
  { value: '19', label: 'Client Portal Pages' },
  { value: '3', label: 'AI Engines' },
  { value: '99.9%', label: 'Uptime SLA' },
];

export const TRUST_CUSTODIANS = [
  'Schwab',
  'Fidelity',
  'Vanguard',
  'Pershing',
  'TD Ameritrade',
  'Merrill',
  'E*TRADE',
  'Interactive Brokers',
];

export const PRICING_TIERS = [
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
      'Email & chat support',
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
      'White-label client portal (FREE for clients)',
      'CRM, prospects & meeting intelligence',
      'Multi-custodian data feeds',
      'Priority support',
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
      'CRM integrations (Salesforce, Redtail, Wealthbox)',
      'Advanced compliance & comm archiving',
      'API access & custom integrations',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

export const COMPARISON_ROWS = [
  { feature: 'Unified household view across custodians', legacy: false, firmum: true },
  { feature: 'AI portfolio, fee, tax & risk analysis', legacy: false, firmum: true },
  { feature: 'White-label client portal included', legacy: false, firmum: true },
  { feature: 'SEC 17a-4 communication archiving', legacy: false, firmum: true },
  { feature: 'Automated compliance workflows', legacy: false, firmum: true },
  { feature: 'Meeting prep & conversation intelligence', legacy: false, firmum: true },
  { feature: 'TWRR/MWRR performance accounting', legacy: false, firmum: true },
  { feature: 'Mobile-responsive PWA', legacy: false, firmum: true },
];

export const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Connect Your Book',
    desc: 'Import households via CSV, link custodians, or upload statements — Firmum parses 17+ brokerage formats automatically.',
  },
  {
    step: '02',
    title: 'Run Intelligence',
    desc: 'Portfolio, compliance, and behavioral AI engines analyze every household and surface actionable recommendations.',
  },
  {
    step: '03',
    title: 'Serve Clients',
    desc: 'Invite clients to the free portal for performance, goals, documents, and secure messaging — all under your brand.',
  },
  {
    step: '04',
    title: 'Stay Compliant',
    desc: 'Workflows, audit trails, and communication archiving keep your practice documentation-ready.',
  },
];

export const FAQS = [
  {
    q: 'How long does onboarding take?',
    a: 'Most advisors complete firm setup in under an hour. Bulk CSV import can onboard an entire book in a single session, with AI validation on every row.',
  },
  {
    q: 'Does Firmum replace my portfolio management system?',
    a: 'Firmum can serve as your primary practice platform for many independent RIAs. Larger firms often use Firmum alongside existing tools for aggregation, compliance, and client experience.',
  },
  {
    q: 'Is the client portal really free?',
    a: 'Yes. Every plan includes a white-label client portal at no extra cost to you or your clients — performance, goals, documents, messaging, and more.',
  },
  {
    q: 'Which custodians are supported?',
    a: 'Schwab, Fidelity, Pershing, and Vanguard via direct feeds and Plaid, plus statement parsing for 17+ brokerage formats including Vanguard, Merrill, and Robinhood.',
  },
  {
    q: 'How does Firmum handle compliance?',
    a: MARKETING_COPY.disclaimers.compliance,
  },
  {
    q: 'What AI capabilities are included?',
    a: 'Three engines: Investment Intelligence (portfolio analysis), Compliance Investment (suitability & monitoring), and Behavioral Intelligence (narratives & meeting prep). All outputs are advisor-reviewed before client delivery.',
  },
];

export const TESTIMONIALS = [
  {
    quote:
      'Firmum replaced four disconnected tools. Our team spends less time on statements and more time in client meetings — the AI prep alone is worth it.',
    author: 'Leslie Mitchell',
    role: 'Managing Partner',
    firm: 'IAB Advisors',
    initials: 'LM',
    color: 'bg-primary-600',
  },
  {
    quote:
      'The client portal changed how we communicate. Clients finally have one place for performance, documents, and goals — adoption went from 20% to over 80%.',
    author: 'David Park',
    role: 'Senior Advisor',
    firm: 'Park Wealth Partners',
    initials: 'DP',
    color: 'bg-indigo-600',
  },
  {
    quote:
      'Compliance workflows and communication archiving give our CCO confidence. We passed our last audit with documentation we generated in Firmum.',
    author: 'Rachel Torres',
    role: 'Chief Compliance Officer',
    firm: 'Summit Advisory Group',
    initials: 'RT',
    color: 'bg-emerald-600',
  },
];

export type ProductUpdate = {
  date: string;
  version: string;
  title: string;
  summary: string;
  highlights: string[];
  tag: 'feature' | 'improvement' | 'compliance' | 'security';
};

export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    date: '2026-03-09',
    version: '2.4.1',
    title: 'Tax module production readiness',
    summary: 'Dual authentication, UUID validation, and client-scoped tax views for portal users.',
    highlights: [
      'Advisor and portal auth paths for tax endpoints',
      'Stricter client ID validation',
      'Improved tax center data binding',
    ],
    tag: 'improvement',
  },
  {
    date: '2026-03-05',
    version: '2.4.0',
    title: 'IMM compliance rules & scheduled jobs',
    summary: 'APScheduler background jobs, IMM-03 compliance rules engine, and expanded audit logging.',
    highlights: [
      'Automated compliance rule evaluation',
      'Scheduled portfolio and alert refresh',
      'Audit log coverage across key actions',
    ],
    tag: 'compliance',
  },
  {
    date: '2026-02-28',
    version: '2.3.0',
    title: 'Data retention policy & documentation',
    summary: 'Published data retention and disposal policy with downloadable PDF for firm compliance files.',
    highlights: [
      'New legal page: Data Retention & Disposal',
      'PDF export for client disclosures',
      'Retention schedule by data category',
    ],
    tag: 'compliance',
  },
  {
    date: '2026-02-20',
    version: '2.2.0',
    title: 'IMM sprint — six intelligence features',
    summary: 'Major release across the IIM, CIM, and BIM pipeline with portfolio review and extended analysis.',
    highlights: [
      'Portfolio review workflow',
      'Extended analysis dimensions',
      'Behavioral narrative improvements',
      'Learning center & help content refresh',
    ],
    tag: 'feature',
  },
  {
    date: '2026-02-10',
    version: '2.1.0',
    title: 'Client portal expansion',
    summary: 'Tax center, family dashboard, what-if scenarios, and AI financial assistant for end clients.',
    highlights: [
      'Portal tax center with realized/unrealized views',
      'Family dashboard and beneficiaries',
      'What-if retirement modeling',
      'AI assistant with guardrails',
    ],
    tag: 'feature',
  },
  {
    date: '2026-01-15',
    version: '2.0.0',
    title: 'Firmum platform launch',
    summary: 'Full RIA practice platform with 38 advisor modules, 19 portal pages, and 293 automated E2E tests.',
    highlights: [
      'Unified advisor dashboard',
      'White-label client portal',
      'Three AI engines (IIM, CIM, BIM)',
      'Compliance workflows & document vault',
    ],
    tag: 'feature',
  },
];

export const FEATURE_CATEGORIES = [
  {
    id: 'client-management',
    label: 'Client Management',
    headline: 'Grow and organize your book',
    description: 'Households, accounts, bulk import, prospects, and CRM in one workspace.',
    features: [
      { title: 'Households', desc: 'Family-level AUM, risk, and account groupings with expandable detail.' },
      { title: 'Bulk Import', desc: 'CSV onboarding with validation for 10+ account types and error highlighting.' },
      { title: 'Prospects Pipeline', desc: 'Kanban stages, AI lead scoring, and proposal generation.' },
      { title: 'CRM', desc: 'Contacts, activity timeline, and Salesforce/Redtail/Wealthbox sync.' },
    ],
  },
  {
    id: 'investing',
    label: 'Investing & Portfolios',
    headline: 'Institutional-grade portfolio tools',
    description: 'Analysis, trading, models, tax harvesting, and direct indexing.',
    features: [
      { title: 'AI Analysis Suite', desc: 'Portfolio, fee, tax, risk, ETF builder, and IPS generator.' },
      { title: 'Model Portfolios', desc: 'Drift detection, marketplace models, and one-click rebalance.' },
      { title: 'Tax-Loss Harvesting', desc: 'Opportunity scan, wash-sale windows, and replacement securities.' },
      { title: 'Performance Accounting', desc: 'TWRR, MWRR, Sharpe, and Brinson-Fachler attribution.' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    headline: 'Documentation-ready workflows',
    description: MARKETING_COPY.features.compliance.description,
    features: [
      { title: 'Compliance Dashboard', desc: 'Score gauge, alerts, reviews, tasks, and audit log.' },
      { title: 'Workflow Templates', desc: 'Six pre-built flows: onboarding, annual review, rollover, and more.' },
      { title: 'Comm Archiving', desc: 'SEC 17a-4 archiving across email, SMS, portal, and chat.' },
      { title: 'ADV & Form CRS', desc: 'AI-assisted generation with version control and approval workflow.' },
    ],
  },
  {
    id: 'client-portal',
    label: 'Client Portal',
    headline: 'A portal clients actually use',
    description: 'Free for every client — performance, goals, tax, documents, and AI assistant.',
    features: [
      { title: 'Performance & Goals', desc: 'Charts, allocation views, and six goal types with progress tracking.' },
      { title: 'Tax Center', desc: 'Realized gains, tax lots, and downloadable 1099s and K-1s.' },
      { title: 'Secure Messaging', desc: 'FINRA-archivable threads between advisor and client.' },
      { title: 'Self-Service Onboarding', desc: '7-step wizard with risk assessment and e-sign ready documents.' },
    ],
  },
];

export const PLATFORM_HIGHLIGHTS = [
  {
    headline: 'Intelligence',
    title: 'Portfolio Analysis',
    description: MARKETING_COPY.features.statementParsing.description,
  },
  {
    headline: 'Efficiency',
    title: 'Statement Parsing',
    description: '17+ brokerage formats parsed automatically — Fidelity, Schwab, Vanguard, and more.',
  },
  {
    headline: 'Compliance',
    title: 'Regulatory Monitoring',
    description: MARKETING_COPY.features.compliance.description,
  },
  {
    headline: 'Engagement',
    title: 'Client Portal',
    description: 'White-label portal with performance, goals, meetings, and AI assistant — free for all clients.',
  },
  {
    headline: 'Revenue',
    title: 'Billing & Reporting',
    description: 'AUM fee schedules, Stripe invoicing, and scheduled client-ready PDF reports.',
  },
  {
    headline: 'Planning',
    title: 'Financial Planning',
    description: 'Goals, Monte Carlo, Social Security optimization, Roth ladders, and estate summaries.',
  },
];
