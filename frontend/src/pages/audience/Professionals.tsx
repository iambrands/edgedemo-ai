import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Brain,
  ShieldCheck,
  Users,
  FileText,
  Scissors,
  Link2,
  BarChart3,
  FileBarChart,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  DollarSign,
  ArrowRight,
  Check,
  User,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const PAIN_POINTS = [
  {
    icon: ClipboardList,
    title: 'Manual Portfolio Reviews',
    description: 'Hours spent aggregating data across custodians and spreadsheets for each client review.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Burden',
    description: 'Regulatory requirements growing faster than your ability to document and monitor them.',
  },
  {
    icon: MessageSquare,
    title: 'Communication at Scale',
    description: 'Personalizing client outreach across hundreds of households without sacrificing quality.',
  },
  {
    icon: DollarSign,
    title: 'Fee Pressure',
    description: 'Demonstrating value to justify fees in an environment of low-cost robo alternatives.',
  },
];

const CAPABILITIES = [
  {
    icon: Brain,
    title: 'Portfolio Intelligence',
    description: 'AI-powered analysis across 8 dimensions including diversification, concentration, fee drag, and risk alignment.',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Automation',
    description: 'Continuous monitoring against FINRA 2111, SEC Reg BI, and firm-specific rules with audit-ready documentation.',
  },
  {
    icon: Users,
    title: 'Client Portal',
    description: '15+ white-labeled pages including performance, goals, tax center, and secure messaging.',
  },
  {
    icon: FileText,
    title: 'AI Narratives',
    description: 'Generate personalized client communications, meeting prep, and quarterly reviews in seconds.',
  },
  {
    icon: Scissors,
    title: 'Tax Harvesting',
    description: 'Automated tax-loss harvesting identification with wash-sale compliance and lot-level recommendations.',
  },
  {
    icon: Link2,
    title: 'CRM Integration',
    description: 'Bi-directional sync with Wealthbox, Redtail, and major CRM platforms. Keep everything in sync.',
  },
  {
    icon: BarChart3,
    title: 'Trading & Rebalancing',
    description: 'Model-based rebalancing with drift monitoring, block trading, and multi-custodian execution.',
  },
  {
    icon: FileBarChart,
    title: 'Custom Reporting',
    description: 'Build and schedule branded reports with drag-and-drop widgets covering any metric or time period.',
  },
];

const STATS = [
  { value: '3', label: 'AI Models' },
  { value: '17+', label: 'Brokerages' },
  { value: '15+', label: 'Portal Pages' },
  { value: '500+', label: 'Advisors' },
];

const INTEGRATIONS = ['Schwab', 'Fidelity', 'Pershing', 'Wealthbox', 'Redtail'];

const PRICING = [
  {
    tier: 'Starter',
    price: '$299',
    period: '/mo',
    description: 'For solo advisors getting started with AI.',
    features: [
      'Up to 50 households',
      'Portfolio intelligence',
      'Client portal (basic)',
      'Email support',
      'Single custodian',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: false,
  },
  {
    tier: 'Professional',
    price: '$599',
    period: '/mo',
    description: 'For growing RIAs that need the full platform.',
    features: [
      'Up to 250 households',
      'All AI modules',
      'Client portal (full)',
      'Compliance automation',
      'Multi-custodian support',
      'CRM integration',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: true,
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large firms with custom requirements.',
    features: [
      'Unlimited households',
      'All Professional features',
      'Custom AI model training',
      'White-label portal',
      'Dedicated success manager',
      'SLA & uptime guarantee',
      'API access',
    ],
    cta: 'Contact Sales',
    href: '/company/contact',
    highlighted: false,
  },
];

export default function Professionals() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6">
            <Link to="/audience/investors" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> For Investors
            </Link>
            <Link to="/company/about" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              About
            </Link>
            <Link to="/company/contact" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              Contact
            </Link>
          </nav>
          <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 sm:hidden">
            Home <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-20">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            For RIAs & Advisors
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            The Platform Designed to Enhance Efficiency for Modern RIAs
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Automate portfolio analysis, streamline compliance, and scale personalized client
            service — all from one intelligent platform.
          </p>
        </section>

        {/* Pain Points */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sound Familiar?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              These challenges hold advisors back from delivering the service their clients deserve.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {PAIN_POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="flex gap-4 bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <div className="p-3 bg-red-50 rounded-xl flex-shrink-0 h-fit">
                    <Icon className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{point.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{point.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Platform Capabilities */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Platform Capabilities</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              A complete AI-powered toolkit purpose-built for registered investment advisors.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex p-2.5 bg-blue-50 rounded-xl mb-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{cap.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* By the Numbers */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">By the Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-blue-200 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Seamless Integrations</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Connect with the custodians and CRMs you already use.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {INTEGRATIONS.map((name) => (
              <div
                key={name}
                className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm"
              >
                {name}
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Simple, Transparent Pricing</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Choose the plan that fits your practice. All plans include a 14-day free trial.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl p-6 flex flex-col ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 shadow-lg'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                <h3 className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                  {plan.tier}
                </h3>
                <div className="mt-2 mb-1">
                  <span className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-slate-500'}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`text-sm mb-5 ${plan.highlighted ? 'text-blue-100' : 'text-slate-600'}`}>
                  {plan.description}
                </p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-blue-600'}`} />
                      <span className={plan.highlighted ? 'text-blue-50' : 'text-slate-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.href}
                  className={`text-center px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-blue-700 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-slate-50 rounded-2xl p-10 border border-slate-100">
          <AlertTriangle className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Join 500+ advisors who are using Edge to serve more clients, reduce compliance risk,
            and grow their business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/company/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Schedule Demo
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
