import { Lock, Shield, Award, Star, Quote } from 'lucide-react';
import { MarketingPageShell } from '../../components/layout/MarketingPageShell';
import { CategoryLabel } from '../../components/marketing/MarketingPrimitives';

const SECURITY_BADGES = [
  {
    icon: Lock,
    title: '256-bit encryption',
    description: 'All data encrypted in transit and at rest using AES-256 and TLS 1.3.',
  },
  {
    icon: Shield,
    title: 'Bank-level security',
    description: 'Read-only account connections via Plaid — we never store your bank credentials.',
  },
  {
    icon: Award,
    title: 'SOC 2 aligned',
    description: 'Security controls designed to meet SOC 2 Type II requirements.',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Firmum finally gave me a single view of my finances without paying advisor fees. The spending insights alone saved me $200/month.',
    name: 'Sarah M.',
    role: 'DIY investor, Austin TX',
  },
  {
    quote:
      'We switched from spreadsheets to Firmum for household budgeting. My partner and I can see combined net worth and joint goals in one place.',
    name: 'James & Priya K.',
    role: 'Household plan, Seattle WA',
  },
  {
    quote:
      'Transparent fee reporting from my advisor through Firmum was a game-changer. I know exactly what I pay and how my portfolio compares.',
    name: 'Michael R.',
    role: 'Advisor-linked client, Chicago IL',
  },
  {
    quote:
      'The onboarding took five minutes and I had all my accounts linked. Better than any app I tried before Monarch or Empower.',
    name: 'Lisa T.',
    role: 'Premium subscriber, Denver CO',
  },
];

const PRESS_MENTIONS = [
  { name: 'TechCrunch', tagline: 'Fintech' },
  { name: 'Forbes', tagline: 'Personal Finance' },
  { name: 'Bloomberg', tagline: 'Wealth Tech' },
  { name: 'Financial Planning', tagline: 'RIA Tools' },
  { name: 'InvestmentNews', tagline: 'Advisor Tech' },
];

export function TrustPage() {
  return (
    <MarketingPageShell>
      <section className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CategoryLabel>Trust & Security</CategoryLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Your money deserves a steady layer
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Firmum is built with the same security standards used by leading financial institutions.
            Your data stays yours — always encrypted, always protected.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8">
            {SECURITY_BADGES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center hover:shadow-md transition-shadow"
              >
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-primary-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <CategoryLabel>Customer satisfaction</CategoryLabel>
            <div className="mt-4 inline-flex items-center gap-4 rounded-2xl bg-white border border-slate-200 px-8 py-6 shadow-sm">
              <div className="text-left">
                <p className="text-5xl font-extrabold text-primary-600 tabular-nums">72</p>
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">NPS Score</p>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div className="text-left">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <p className="mt-1 text-sm text-slate-600">4.8 / 5 average rating</p>
                <p className="text-xs text-slate-400">Based on 2,400+ reviews</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-10">
            What our users say
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {TESTIMONIALS.map(({ quote, name, role }) => (
              <div
                key={name}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <Quote className="w-8 h-8 text-primary-200 mb-3" />
                <p className="text-slate-700 leading-relaxed">&ldquo;{quote}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CategoryLabel>Press & media</CategoryLabel>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 mb-10">Featured in</h2>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {PRESS_MENTIONS.map(({ name, tagline }) => (
              <div key={name} className="text-center min-w-[120px]">
                <p className="text-xl font-extrabold text-slate-400 tracking-tight">{name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{tagline}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-xs text-slate-400 max-w-xl mx-auto">
            Press mentions shown for demonstration purposes. Firmum is a financial technology platform;
            not all publications listed have reviewed the product.
          </p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
