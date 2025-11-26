import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-3 shadow-md">
                <span className="text-white text-lg font-bold">IAB</span>
              </div>
              <span className="text-gray-900 text-xl font-bold">OptionsBot</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Trade Options with
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-amber-500">
                AI-Powered Intelligence
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              The intelligent options trading platform that combines advanced AI analysis, 
              automated strategies, and real-time market data to help you make smarter trades.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/register"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-all font-semibold text-lg shadow-lg transform hover:-translate-y-1 hover:shadow-xl text-center"
              >
                Start Trading Free →
              </Link>
              <Link
                to="/login"
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg shadow-md text-center"
              >
                Sign In
              </Link>
            </div>
            <p className="mt-6 text-gray-600 text-sm">
              🎯 Start with $100,000 in paper trading • No credit card required • Risk-free learning
            </p>
          </div>
          
          {/* Right Column - Hero Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              {/* Placeholder for your custom image - Replace this img tag with your image */}
              <img
                src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                alt="Trading Dashboard"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  // Fallback to gradient if image fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="w-full h-96 bg-gradient-to-br from-blue-600 via-blue-500 to-amber-500 flex items-center justify-center">
                      <div class="text-white text-center p-8">
                        <div class="text-6xl mb-4">📈</div>
                        <div class="text-2xl font-bold">IAB OptionsBot</div>
                        <div class="text-lg mt-2">AI-Powered Trading Platform</div>
                      </div>
                    </div>
                  `;
                }}
              />
              {/* Optional: Overlay gradient for better text contrast if needed */}
              <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none"></div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-amber-400 rounded-full opacity-20 blur-2xl"></div>
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-blue-400 rounded-full opacity-20 blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Everything You Need to Trade Options
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center mb-4 shadow-md">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600">
                Get plain English explanations of complex options concepts. Our AI analyzes Greeks, 
                risk factors, and market conditions to provide actionable insights.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mb-4 shadow-md">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Automated Trading</h3>
              <p className="text-gray-600">
                Set up trading strategies that execute automatically. Monitor opportunities 24/7 
                and let the system work for you based on your criteria.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center mb-4 shadow-md">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real-Time Data</h3>
              <p className="text-gray-600">
                Access live market data, options chains, and Greeks. Make informed decisions 
                with up-to-the-minute pricing and volatility information.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center mb-4 shadow-md">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Risk Management</h3>
              <p className="text-gray-600">
                Built-in risk controls protect your capital. Set stop losses, position limits, 
                and daily loss limits to trade with confidence.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center mb-4 shadow-md">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Performance Tracking</h3>
              <p className="text-gray-600">
                Monitor your trading performance with detailed analytics, P/L tracking, 
                win rates, and visual charts to understand what's working.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center mb-4 shadow-md">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Paper Trading</h3>
              <p className="text-gray-600">
                Learn and practice with $100,000 in virtual money. Test strategies risk-free 
                before trading with real capital.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-20">
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
              <p className="text-gray-600 text-sm">
                Create your account in seconds. No credit card required.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyze Options</h3>
              <p className="text-gray-600 text-sm">
                Use AI-powered analysis to find the best trading opportunities.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trade or Automate</h3>
              <p className="text-gray-600 text-sm">
                Execute trades manually or set up automated strategies.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                <span className="text-3xl font-bold text-white">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Performance</h3>
              <p className="text-gray-600 text-sm">
                Monitor your results and optimize your strategies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-blue-50 mb-8">
            Join beta testers and start trading options with AI-powered insights. 
            Free paper trading account with $100,000 virtual balance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-50 transition-all font-semibold text-lg shadow-xl transform hover:-translate-y-1"
            >
              Create Free Account →
            </Link>
            <Link
              to="/login"
              className="bg-transparent text-white border-2 border-white px-8 py-4 rounded-lg hover:bg-white/10 transition-all font-semibold text-lg"
            >
              Sign In to Existing Account
            </Link>
          </div>
          <p className="mt-6 text-blue-100 text-sm">
            ✓ No credit card required • ✓ Free paper trading • ✓ AI-powered analysis • ✓ Automated strategies
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center mr-2 shadow-md">
                <span className="text-white text-sm font-bold">IAB</span>
              </div>
              <span className="text-white font-semibold">IAB OptionsBot</span>
            </div>
            <div className="text-gray-400 text-sm">
              <p>© 2025 IAB OptionsBot. Beta Version.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

