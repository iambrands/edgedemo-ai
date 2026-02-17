import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Bell,
  Receipt,
  Target,
  FileBarChart,
  Lock,
  Plug,
  Brain,
  Lightbulb,
  Quote,
  ArrowRight,
  Users,
} from 'lucide-react';
import { Footer } from '../../components/layout/Footer';

const PROBLEMS = [
  {
    problem: 'High Fees',
    description: 'Traditional investment platforms charge excessive management and trading fees that eat into your returns over time.',
  },
  {
    problem: 'Lack of Transparency',
    description: 'You deserve to understand exactly how your money is invested and why. Most platforms keep you in the dark.',
  },
  {
    problem: 'Reactive, Not Proactive',
    description: 'By the time you get a quarterly statement, opportunities have already been missed. You need real-time intelligence.',
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: 'AI Portfolio Analysis',
    description: 'Get institutional-grade analysis of your portfolio health, diversification, and risk exposure — powered by advanced AI.',
  },
  {
    icon: Bell,
    title: 'Real-Time Alerts',
    description: 'Receive proactive notifications about market movements, rebalancing opportunities, and portfolio events that matter to you.',
  },
  {
    icon: Receipt,
    title: 'Tax Optimization',
    description: 'Automatically identify tax-loss harvesting opportunities and optimize asset location across your accounts.',
  },
  {
    icon: Target,
    title: 'Goal Tracking',
    description: 'Set retirement, education, or custom goals and track your progress with Monte Carlo projections and scenario analysis.',
  },
  {
    icon: FileBarChart,
    title: 'Performance Reporting',
    description: 'Clear, visual reports showing time-weighted and money-weighted returns benchmarked against relevant indices.',
  },
  {
    icon: Lock,
    title: 'Secure Client Portal',
    description: 'Bank-grade security protects your data. Access your full financial picture anytime from any device.',
  },
];

const STEPS = [
  {
    icon: Plug,
    step: '01',
    title: 'Connect Your Accounts',
    description: 'Securely link your brokerage accounts. We support 17+ custodians including Schwab, Fidelity, and Pershing.',
  },
  {
    icon: Brain,
    step: '02',
    title: 'AI Analyzes Your Portfolio',
    description: 'Our AI engine assesses your holdings across 8 dimensions and identifies optimization opportunities in minutes.',
  },
  {
    icon: Lightbulb,
    step: '03',
    title: 'Get Personalized Insights',
    description: 'Receive tailored recommendations, proactive alerts, and clear reporting — all through your personal dashboard.',
  },
];

export default function Investors() {
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
            <Link to="/audience/professionals" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> For Professionals
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
            For Investors
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Smarter Investing Starts at the Edge
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            AI-powered portfolio intelligence that gives you institutional-grade analysis,
            real-time insights, and proactive optimization — all in one platform.
          </p>
        </section>

        {/* Problem / Solution */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Why Traditional Investing Falls Short</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              The old way of investing wasn't built for today's markets or today's investors.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PROBLEMS.map((item) => (
              <div key={item.problem} className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.problem}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Grid */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Everything You Need</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              A complete suite of AI-powered tools designed to optimize every aspect of your investments.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="inline-flex p-3 bg-blue-50 rounded-xl mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-slate-50 rounded-2xl p-8 sm:p-12 border border-slate-100 space-y-8">
          <h2 className="text-2xl font-bold text-slate-900 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-2xl mb-4 shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-blue-600 mb-1">STEP {step.step}</p>
                  <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Testimonial */}
        <section className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm">
          <Quote className="h-10 w-10 text-blue-200 mb-4" />
          <blockquote className="text-lg sm:text-xl text-slate-700 leading-relaxed mb-6">
            "Edge completely changed how I understand my portfolio. The AI insights flagged a
            concentration risk I hadn't noticed, and the tax optimization alone saved me over
            $8,000 last year. I finally feel in control of my financial future."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">RK</span>
            </div>
            <div>
              <p className="font-medium text-slate-900">Rebecca K.</p>
              <p className="text-sm text-slate-500">Individual Investor, Austin TX</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-10 text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Ready to Take Control?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Join thousands of investors who are already using AI to make smarter decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/portal/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/company/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/30 text-white rounded-xl font-medium hover:bg-white/10 transition-colors"
            >
              Talk to an Advisor
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
