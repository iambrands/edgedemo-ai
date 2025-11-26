import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                <span className="text-indigo-600 text-lg font-bold">IAB</span>
              </div>
              <span className="text-white text-xl font-bold">OptionsBot</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-white hover:text-gray-200 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-white text-indigo-600 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Trade Options with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
              AI-Powered Intelligence
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            The intelligent options trading platform that combines advanced AI analysis, 
            automated strategies, and real-time market data to help you make smarter trades.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-all font-semibold text-lg shadow-2xl transform hover:-translate-y-1 hover:scale-105"
            >
              Start Trading Free →
            </Link>
            <Link
              to="/login"
              className="bg-white/10 backdrop-blur-md text-white border-2 border-white/30 px-8 py-4 rounded-lg hover:bg-white/20 transition-all font-semibold text-lg"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-6 text-white/80 text-sm">
            🎯 Start with $100,000 in paper trading • No credit card required • Risk-free learning
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Everything You Need to Trade Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI-Powered Analysis</h3>
              <p className="text-white/80">
                Get plain English explanations of complex options concepts. Our AI analyzes Greeks, 
                risk factors, and market conditions to provide actionable insights.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Trading</h3>
              <p className="text-white/80">
                Set up trading strategies that execute automatically. Monitor opportunities 24/7 
                and let the system work for you based on your criteria.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-teal-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Real-Time Data</h3>
              <p className="text-white/80">
                Access live market data, options chains, and Greeks. Make informed decisions 
                with up-to-the-minute pricing and volatility information.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-red-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Risk Management</h3>
              <p className="text-white/80">
                Built-in risk controls protect your capital. Set stop losses, position limits, 
                and daily loss limits to trade with confidence.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Performance Tracking</h3>
              <p className="text-white/80">
                Monitor your trading performance with detailed analytics, P/L tracking, 
                win rates, and visual charts to understand what's working.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Paper Trading</h3>
              <p className="text-white/80">
                Learn and practice with $100,000 in virtual money. Test strategies risk-free 
                before trading with real capital.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Sign Up Free</h3>
              <p className="text-white/80 text-sm">
                Create your account in seconds. No credit card required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analyze Options</h3>
              <p className="text-white/80 text-sm">
                Use AI-powered analysis to find the best trading opportunities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Trade or Automate</h3>
              <p className="text-white/80 text-sm">
                Execute trades manually or set up automated strategies.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Track Performance</h3>
              <p className="text-white/80 text-sm">
                Monitor your results and optimize your strategies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join beta testers and start trading options with AI-powered insights. 
            Free paper trading account with $100,000 virtual balance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-indigo-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-all font-semibold text-lg shadow-2xl transform hover:-translate-y-1"
            >
              Create Free Account →
            </Link>
            <Link
              to="/login"
              className="bg-white/10 backdrop-blur-md text-white border-2 border-white/30 px-8 py-4 rounded-lg hover:bg-white/20 transition-all font-semibold text-lg"
            >
              Sign In to Existing Account
            </Link>
          </div>
          <p className="mt-6 text-white/70 text-sm">
            ✓ No credit card required • ✓ Free paper trading • ✓ AI-powered analysis • ✓ Automated strategies
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-2">
                <span className="text-indigo-600 text-sm font-bold">IAB</span>
              </div>
              <span className="text-white font-semibold">IAB OptionsBot</span>
            </div>
            <div className="text-white/70 text-sm">
              <p>© 2025 IAB OptionsBot. Beta Version.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

