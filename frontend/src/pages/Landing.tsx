import { useNavigate } from 'react-router-dom';
import {
  Check,
  Brain,
  Target,
  ClipboardCheck,
  TrendingUp,
  DollarSign,
  Globe,
  BarChart2,
  User,
  Building2,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-[48px] font-bold text-slate-900 leading-tight mb-6">
              Smarter Investing Starts at the{' '}
              <span className="text-primary-500">Edge</span>
            </h1>
            <p className="text-lg sm:text-body-lg text-slate-500 mb-8 max-w-2xl mx-auto">
              Powered by AI. Built for everyone from individual investors to registered
              advisors. Get institutional-grade investment intelligence in one powerful
              platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="lg" onClick={() => navigate('/signup')}>
                Start Free Trial →
              </Button>
              <Button variant="secondary" size="lg">
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-500">+127.5K</p>
                <p className="text-sm text-slate-500">Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-500">$2.4B+</p>
                <p className="text-sm text-slate-500">Assets Analyzed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Choose Your Journey Section */}
      <section id="investors" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-h2 font-bold text-slate-900 mb-4">
              Choose Your Investment Journey
            </h2>
            <p className="text-slate-500 text-lg">
              Select the path that matches your investment needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Individual Investors Card */}
            <Card variant="feature" className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  For Individual Investors
                </h3>
              </div>
              <p className="text-slate-500 mb-6">
                Smart tools for everyday investors looking to grow their wealth with
                AI-powered insights and guidance.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'AI-powered portfolio analysis',
                  'Real-time market alerts',
                  'Personalized investment recommendations',
                  'Tax optimization suggestions',
                  'Educational resources & community',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-slate-700 text-[15px]">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-500">Starting at</p>
                <p className="text-2xl font-bold text-slate-900">
                  $29<span className="text-base font-normal text-slate-500">/month</span>
                </p>
                <p className="text-sm text-primary-600">Free 14-day trial</p>
              </div>
              <Button className="w-full" onClick={() => navigate('/signup')}>
                Start Investing Smarter →
              </Button>
            </Card>

            {/* Financial Professionals Card */}
            <Card variant="feature" className="relative" id="professionals">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  For Financial Professionals
                </h3>
              </div>
              <p className="text-slate-500 mb-6">
                Comprehensive platform for RIAs and financial advisors to manage
                clients, compliance, and portfolios at scale.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Multi-client portfolio management',
                  'Automated rebalancing & tax harvesting',
                  'Compliance & regulatory reporting',
                  'White-label client portals',
                  'Institutional-grade analytics',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-slate-700 text-[15px]">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-500">Starting at</p>
                <p className="text-2xl font-bold text-slate-900">
                  $499<span className="text-base font-normal text-slate-500">/month</span>
                </p>
                <p className="text-sm text-primary-600">Up to $5M AUM</p>
              </div>
              <Button className="w-full" onClick={() => navigate('/signup')}>
                Schedule Demo →
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Powered by Advanced AI Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-h2 font-bold text-slate-900 mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-slate-500 text-lg">
              Three specialized AI engines working together for your success
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Investment Intelligence Engine */}
            <Card variant="feature">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Investment Intelligence Engine
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Deep learning model trained on millions of portfolio configurations to
                identify optimal asset allocations and investment opportunities.
              </p>
              <Badge variant="green">In Production</Badge>
            </Card>

            {/* Behavioral Finance Advisor */}
            <Card variant="feature">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Behavioral Finance Advisor
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Combines behavioral economics, psychology, and portfolio theory to
                provide personalized guidance that accounts for investor biases.
              </p>
              <Badge variant="green">In Production</Badge>
            </Card>

            {/* Compliance Investment Model */}
            <Card variant="feature">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-4">
                <ClipboardCheck className="w-6 h-6 text-teal-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Compliance Investment Model
              </h3>
              <p className="text-slate-500 text-sm mb-4">
                Ensures regulatory compliance and suitability validation for every
                recommendation, with full audit trail documentation.
              </p>
              <Badge variant="green">In Production</Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* One Platform, Multiple Asset Classes */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-h2 font-bold text-slate-900 mb-4">
              One Platform, Multiple Asset Classes
            </h2>
            <p className="text-slate-500 text-lg">
              Trade and analyze every market from one interface
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* OptionsEdge */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart2 className="w-5 h-5" />
              </div>
              <h4 className="font-semibold mb-1">OptionsEdge</h4>
              <p className="text-sm text-white/80">Options trading & analysis</p>
            </div>

            {/* StocksEdge */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-semibold mb-1">StocksEdge</h4>
              <p className="text-sm text-white/80">Equity research & trading</p>
            </div>

            {/* ForexEdge */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h4 className="font-semibold mb-1">ForexEdge</h4>
              <p className="text-sm text-white/80">Currency trading & analysis</p>
            </div>

            {/* FuturesEdge */}
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="font-semibold mb-1">FuturesEdge</h4>
              <p className="text-sm text-white/80">Futures & commodities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-h2 font-bold text-slate-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-500 text-lg">Choose the plan that fits your needs</p>
          </div>

          {/* Individual Investors Pricing */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <Badge variant="blue">For Individual Investors</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Starter */}
              <Card className="relative">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Starter</h3>
                <p className="text-3xl font-bold text-slate-900 mb-6">
                  $29<span className="text-base font-normal text-slate-500">/mo</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    '1 module access',
                    'Basic AI insights',
                    'Portfolio tracking',
                    'Email alerts',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </Card>

              {/* Pro */}
              <Card variant="pricing-featured" className="relative">
                <Badge variant="blue" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Pro</h3>
                <p className="text-3xl font-bold text-slate-900 mb-6">
                  $79<span className="text-base font-normal text-slate-500">/mo</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    '2 module access',
                    'Advanced AI insights',
                    'Real-time alerts',
                    'Tax optimization',
                    'Priority support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </Card>

              {/* Elite */}
              <Card className="relative">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Elite</h3>
                <p className="text-3xl font-bold text-slate-900 mb-6">
                  $199<span className="text-base font-normal text-slate-500">/mo</span>
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'All modules',
                    'Unlimited AI queries',
                    'Custom strategies',
                    'API access',
                    '1-on-1 coaching',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </Card>
            </div>
          </div>

          {/* RIA Pricing */}
          <div>
            <div className="text-center mb-8">
              <Badge variant="blue">For Financial Professionals (RIA)</Badge>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* RIA Starter */}
              <Card className="relative">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">RIA Starter</h3>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  $499<span className="text-base font-normal text-slate-500">/mo</span>
                </p>
                <p className="text-sm text-slate-500 mb-6">Up to $5M AUM</p>
                <ul className="space-y-3 mb-8">
                  {[
                    '10 clients',
                    'Portfolio management',
                    'Compliance tools',
                    'Client reports',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" className="w-full" onClick={() => navigate('/signup')}>
                  Schedule Demo
                </Button>
              </Card>

              {/* RIA Professional */}
              <Card variant="pricing-featured" className="relative">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">RIA Professional</h3>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  $999<span className="text-base font-normal text-slate-500">/mo</span>
                </p>
                <p className="text-sm text-slate-500 mb-6">Up to $25M AUM</p>
                <ul className="space-y-3 mb-8">
                  {[
                    '50 clients',
                    'Auto-rebalancing',
                    'Tax harvesting',
                    'White-label portal',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" onClick={() => navigate('/signup')}>
                  Schedule Demo
                </Button>
              </Card>

              {/* RIA Enterprise */}
              <Card className="relative">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">RIA Enterprise</h3>
                <p className="text-3xl font-bold text-slate-900 mb-1">Custom</p>
                <p className="text-sm text-slate-500 mb-6">$100M+ AUM</p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Unlimited clients',
                    'Custom features',
                    'API access',
                    'Dedicated support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" className="w-full">
                  Contact Sales
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Invest Smarter?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join 127,500+ investors using Edge to make better investment decisions
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-primary-600 hover:bg-slate-100"
              onClick={() => navigate('/signup')}
            >
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
