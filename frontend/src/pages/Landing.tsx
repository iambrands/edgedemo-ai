import { useNavigate } from 'react-router-dom';
import {
  Check,
  Brain,
  Users,
  Shield,
  UserPlus,
  ArrowUpDown,
  Receipt,
  Target,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const PLATFORM_FEATURES = [
  {
    icon: Brain,
    title: 'Portfolio Intelligence',
    description:
      'AI-powered portfolio analysis, model portfolios, automated rebalancing, and tax-loss harvesting — all from one dashboard.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Users,
    title: 'Client Portal',
    description:
      'White-label portal your clients love — goals tracking, performance views, messaging, and document sharing. FREE for all your clients.',
    color: 'bg-emerald-50 text-emerald-600',
    badge: 'FREE',
  },
  {
    icon: Shield,
    title: 'Compliance & Reporting',
    description:
      'Automated compliance monitoring, audit trails, regulatory reporting, and document management built for fiduciary advisors.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: UserPlus,
    title: 'CRM & Prospects',
    description:
      'AI lead scoring, pipeline management, automated proposal generation, and activity tracking to grow your practice.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: ArrowUpDown,
    title: 'Trading & Execution',
    description:
      'Best execution analysis, multi-custodian support, trade blotter, and rebalancing across all client accounts.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: Receipt,
    title: 'Billing & Operations',
    description:
      'AUM-based fee schedules, automated billing, custodian integrations, and comprehensive reporting for your practice.',
    color: 'bg-teal-50 text-teal-600',
  },
];

const PRICING_TIERS = [
  {
    name: 'Starter',
    price: '$499',
    aum: 'Up to $10M AUM',
    clients: '25 clients',
    features: [
      'Portfolio management & analysis',
      'AI-powered insights',
      'Compliance dashboard',
      'Client reports & statements',
      'Email & chat support',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Professional',
    price: '$999',
    aum: 'Up to $50M AUM',
    clients: '100 clients',
    features: [
      'Everything in Starter',
      'Automated rebalancing',
      'Tax-loss harvesting',
      'White-label client portal',
      'CRM & prospect pipeline',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    aum: '$50M+ AUM',
    clients: 'Unlimited clients',
    features: [
      'Everything in Professional',
      'Custom integrations & API',
      'Multi-custodian trading',
      'Advanced compliance suite',
      'Dedicated account manager',
      'Custom onboarding & training',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="blue" className="mb-6">
              Built for Registered Investment Advisors
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold text-slate-900 leading-tight mb-6">
              The AI-Powered Platform That Runs Your{' '}
              <span className="text-primary-500">Entire Advisory Practice</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 mb-8 max-w-2xl mx-auto leading-relaxed">
              From portfolio intelligence to client engagement — Edge gives RIAs
              institutional-grade tools to grow AUM, delight clients, and stay compliant.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" onClick={() => navigate('/onboarding/ria')}>
                Start 14-Day Free Trial <ArrowRight className="w-4 h-4 ml-1 inline" />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/company/contact')}>
                Schedule Demo
              </Button>
            </div>

            {/* Trust Stats */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-500">$2.4B+</p>
                <p className="text-sm text-slate-500">AUM Managed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-500">500+</p>
                <p className="text-sm text-slate-500">Advisory Firms</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-500">99.9%</p>
                <p className="text-sm text-slate-500">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform Features ─────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Built for Every Part of Your Practice
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              One platform to manage portfolios, serve clients, stay compliant, and grow your firm
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {PLATFORM_FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} variant="feature" className="relative">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${feature.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                        {feature.badge && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI Engines ────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Powered by Advanced AI
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Three AI Engines Working for Your Practice
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Purpose-built AI that understands wealth management, not generic chatbots
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="feature">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Portfolio Intelligence Engine
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Analyzes client portfolios for concentration risk, fee drag, and tax
                inefficiency. Generates actionable recommendations you can share with clients.
              </p>
              <Badge variant="green">In Production</Badge>
            </Card>

            <Card variant="feature">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Client Insight Engine
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Understands client goals, risk tolerance, and behavioral patterns to generate
                personalized nudges and conversation starters for every meeting.
              </p>
              <Badge variant="green">In Production</Badge>
            </Card>

            <Card variant="feature">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                <ClipboardCheck className="w-6 h-6 text-teal-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Compliance & Risk Monitor
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Continuously monitors portfolios for regulatory compliance, drift alerts,
                and suitability issues. Auto-generates audit documentation.
              </p>
              <Badge variant="green">In Production</Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-500 text-lg">
              Plans that scale with your practice. No hidden fees.
            </p>
          </div>

          {/* Client Portal FREE callout */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-5 py-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                Client Portal included FREE with every plan — your clients pay nothing
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <Card
                key={tier.name}
                variant={tier.featured ? 'pricing-featured' : 'default'}
                className="relative"
              >
                {tier.featured && (
                  <Badge variant="blue" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  {tier.price}
                  {tier.price !== 'Custom' && (
                    <span className="text-base font-normal text-slate-500">/mo</span>
                  )}
                </p>
                <p className="text-sm text-slate-500 mb-1">{tier.aum}</p>
                <p className="text-sm text-primary-600 mb-6">{tier.clients}</p>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* FREE portal badge */}
                <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 mb-6">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">FREE Client Portal</span>
                </div>

                <Button
                  variant={tier.featured ? 'primary' : 'secondary'}
                  className="w-full"
                  onClick={() =>
                    tier.cta === 'Contact Sales'
                      ? navigate('/company/contact')
                      : navigate('/onboarding/ria')
                  }
                >
                  {tier.cta}
                </Button>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            All plans include a 14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Modernize Your Practice?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join 500+ advisory firms using Edge to deliver better outcomes for their clients.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              className="!bg-white !text-primary-600 !border-white hover:!bg-slate-100"
              onClick={() => navigate('/onboarding/ria')}
            >
              Start 14-Day Free Trial
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/company/contact')}>
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
