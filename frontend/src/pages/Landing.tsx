import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered Analysis',
    description: 'Get plain-English trade explanations with actionable insights in seconds.',
  },
  {
    icon: '⚡',
    title: 'Automated Trading',
    description: 'Set your criteria once and let the system find opportunities 24/7.',
  },
  {
    icon: '📊',
    title: 'Real-Time Data',
    description: 'Live options chains, Greeks, and pricing updated every second.',
  },
  {
    icon: '🛡️',
    title: 'Risk Management',
    description: 'Built-in stop losses and position limits protect your capital.',
  },
  {
    icon: '📈',
    title: 'Performance Tracking',
    description: "Visual P&L charts and win rate analytics show what's working.",
  },
  {
    icon: '💵',
    title: 'Paper Trading',
    description: 'Practice risk-free with $100,000 in virtual money.',
  },
];

const Landing: React.FC = () => {
  const [dashboardImageError, setDashboardImageError] = React.useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center mr-3 shadow-md">
                <span className="text-white text-lg font-bold">OE</span>
              </div>
              <span className="text-gray-900 text-xl font-bold">OptionsEdge</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse" aria-hidden />
            Now in Beta — Limited Early Access
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Trade Options with
            <br />
            <span className="text-blue-500">AI-Powered Intelligence</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Make smarter options trades in minutes, not hours. AI analysis, automated strategies,
            and real-time data — all in one platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-all font-semibold text-lg shadow-lg text-center"
            >
              Start Paper Trading Free →
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg shadow-md text-center"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-6 text-gray-500 text-sm">
            ✓ No credit card required · ✓ $100,000 virtual balance · ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Everything You Need to Trade Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="feature-card p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="dashboard-preview py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">See It In Action</h2>
            <p className="text-gray-600">Your command center for smarter options trading</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl shadow-2xl overflow-hidden border border-gray-200 bg-gray-100 min-h-[280px] flex items-center justify-center">
              {!dashboardImageError ? (
                <img
                  src={`${process.env.PUBLIC_URL || ''}/images/dashboard-preview.png`}
                  alt="OptionsEdge Dashboard showing trading signals, positions, and AI analysis"
                  className="w-full max-h-[70vh] object-contain"
                  onError={() => setDashboardImageError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-8 text-gray-500 text-sm">
                  <span className="text-4xl">📊</span>
                  <span>Dashboard preview — add dashboard-preview.png to /public/images/</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 mt-8 text-sm text-gray-600">
              <span>📊 Live Market Data</span>
              <span>🎯 AI Trading Signals</span>
              <span>📈 Performance Analytics</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20 scroll-mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign Up Free</h3>
              <p className="text-gray-600 text-sm">Create your account in seconds. No credit card required.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyze Options</h3>
              <p className="text-gray-600 text-sm">Use AI-powered analysis to find the best trading opportunities.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trade or Automate</h3>
              <p className="text-gray-600 text-sm">Execute trades manually or set up automated strategies.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Performance</h3>
              <p className="text-gray-600 text-sm">Monitor your results and optimize your strategies.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Social Proof */}
      <section className="trust-section py-12 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-center gap-8 sm:gap-12 mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">500+</div>
              <div className="text-sm text-gray-500">Beta Testers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">50K+</div>
              <div className="text-sm text-gray-500">Trades Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">$10M+</div>
              <div className="text-sm text-gray-500">Paper Trading Volume</div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Powered By</p>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8 text-gray-500 font-medium">
              <span>Tradier</span>
              <span>Claude AI</span>
              <span>Finnhub</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta py-20 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 text-sm mb-6">
            🚀 Limited Beta Access — Join 500+ early adopters
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Trade Smarter?</h2>

          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Start with $100,000 in paper trading. No credit card required. See why traders are
            switching to AI-powered analysis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-center"
            >
              Start Paper Trading Free →
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-center"
            >
              Sign In to Existing Account
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8 text-sm text-blue-200">
            <span>✓ No credit card</span>
            <span>✓ Free paper trading</span>
            <span>✓ AI-powered analysis</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm font-bold">OE</span>
              <span className="text-white font-semibold">OptionsEdge</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link to="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link to="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>

            <div className="text-sm">© 2026 OptionsEdge by IAB Advisors, Inc.</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
