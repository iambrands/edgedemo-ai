import React, { useState, useMemo } from 'react';
import FeedbackModal from '../components/FeedbackModal';

interface HelpSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

const Help: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const sections: HelpSection[] = [
    {
      id: 'introduction',
      title: 'Introduction',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">What is IAB OptionsBot?</h3>
          <p className="text-gray-700">
            IAB OptionsBot is an intelligent options trading platform that combines:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>AI-Powered Analysis:</strong> Get plain English explanations of complex options concepts</li>
            <li><strong>Automated Trading:</strong> Set up strategies that execute trades automatically</li>
            <li><strong>Real-Time Data:</strong> Access current market data and options chains</li>
            <li><strong>Risk Management:</strong> Built-in tools to protect your capital</li>
            <li><strong>Paper Trading:</strong> Practice with virtual money before risking real capital</li>
          </ul>
          
          <h4 className="text-xl font-semibold text-gray-900 mt-6">Key Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Options Chain Analysis - AI-powered scoring and recommendations</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Automated Trading - Set it and forget it strategies</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Real-Time Alerts - Never miss an opportunity</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Performance Tracking - Monitor your trading results</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Risk Management - Protect your capital automatically</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Paper Trading - Learn risk-free with $100,000 virtual balance</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Creating Your Account</h3>
          <ol className="list-decimal list-inside space-y-3 text-gray-700 ml-4">
            <li><strong>Navigate to Registration:</strong> Click "Register" or go to the registration page</li>
            <li><strong>Fill in Your Details:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Username: Choose a unique username (minimum 3 characters)</li>
                <li>Email: Your email address</li>
                <li>Password: Create a strong password (minimum 6 characters)</li>
              </ul>
            </li>
            <li><strong>Click "Register":</strong> Your account will be created and you'll be automatically logged in</li>
          </ol>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Paper Trading:</strong> You'll start with $100,000 in virtual money. This is perfect for learning and testing strategies without any financial risk!
            </p>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">First-Time Login</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Go to the Login page</li>
            <li>Enter your username and password</li>
            <li>Click "Login" - you'll be redirected to your Dashboard</li>
          </ol>
        </div>
      ),
    },
    {
      id: 'dashboard',
      title: 'Dashboard - Your Trading Command Center',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your Dashboard is the central hub where you can see everything about your trading activity at a glance.
          </p>
          
          <h4 className="text-xl font-semibold text-gray-900 mt-4">Key Components</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Account Balance:</strong> Your current paper trading balance</li>
            <li><strong>Active Positions:</strong> All your open trades with real-time P/L</li>
            <li><strong>Performance Metrics:</strong> Total positions, unrealized P/L, realized P/L, and win rate</li>
            <li><strong>Performance Charts:</strong> Visual representation of your trading performance</li>
            <li><strong>Recent Trades:</strong> Your most recent trading activity</li>
          </ul>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Position Details</h4>
          <p className="text-gray-700">
            Click "Details" on any position to see:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Basic information (symbol, contract type, quantity, strike, expiration)</li>
            <li>Pricing & P/L (entry price, current price, total cost, current value, unrealized P/L)</li>
            <li>Current Greeks (delta, gamma, theta, vega, implied volatility)</li>
            <li>AI Analysis (automated insights about your position)</li>
          </ul>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 Tip:</strong> Use the "Refresh Price" button to manually update position prices. Prices also update automatically every 15 minutes.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'options-analyzer',
      title: 'Options Analyzer - Find the Best Trades',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The Options Analyzer helps you find the best options trades using AI-powered analysis.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">How to Use</h4>
          <ol className="list-decimal list-inside space-y-3 text-gray-700 ml-4">
            <li><strong>Enter a Stock Symbol:</strong> Type any stock symbol (e.g., AAPL, TSLA, MSFT)</li>
            <li><strong>Select Expiration Date:</strong> Choose from available expiration dates</li>
            <li><strong>Choose Strategy Preference:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li><strong>Income:</strong> Focus on high premium, high probability trades</li>
                <li><strong>Balanced:</strong> Balance between income and growth</li>
                <li><strong>Growth:</strong> Focus on high potential returns</li>
              </ul>
            </li>
            <li><strong>Click "Analyze Options":</strong> The system will score and rank all available options</li>
          </ol>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Understanding the Scores</h4>
          <p className="text-gray-700">
            Each option receives a score based on:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Greeks Analysis:</strong> Delta, gamma, theta, vega, and implied volatility</li>
            <li><strong>Liquidity:</strong> Volume and open interest</li>
            <li><strong>Spread:</strong> Bid-ask spread percentage</li>
            <li><strong>Days to Expiration:</strong> Time value considerations</li>
            <li><strong>Strategy Alignment:</strong> How well it matches your preference</li>
          </ul>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-800">
              <strong>✅ Best Practices:</strong> Look for options with high scores (80+), good liquidity (volume &gt; 20, OI &gt; 100), and reasonable spreads (&lt; 15%).
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'watchlist',
      title: 'Watchlist - Track Your Stocks',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your Watchlist helps you track stocks you're interested in trading.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Adding Stocks</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Click "Add Stock" button</li>
            <li>Enter the stock symbol</li>
            <li>Optionally add tags (e.g., "Tech", "Dividend", "Growth")</li>
            <li>Add notes if desired</li>
            <li>Click "Add to Watchlist"</li>
          </ol>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Managing Your Watchlist</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>View Prices:</strong> See real-time stock prices</li>
            <li><strong>Edit Notes:</strong> Click on a stock to add or update notes</li>
            <li><strong>Update Tags:</strong> Organize stocks with custom tags</li>
            <li><strong>Remove Stocks:</strong> Click the delete button to remove stocks</li>
            <li><strong>Quick Analyze:</strong> Use the "Analyze Options" button to quickly analyze options for a stock</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'trade-execution',
      title: 'Trade Execution - Place Your Trades',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The Trade page allows you to execute trades manually.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Executing a Trade</h4>
          <ol className="list-decimal list-inside space-y-3 text-gray-700 ml-4">
            <li><strong>Select Symbol:</strong> Choose from your watchlist or enter a symbol</li>
            <li><strong>Choose Action:</strong> Select "Buy" or "Sell"</li>
            <li><strong>Select Contract Type:</strong> Choose "Stock", "Call", or "Put"</li>
            <li><strong>Enter Details:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Quantity: Number of contracts/shares</li>
                <li>Strike Price: For options only</li>
                <li>Expiration Date: For options only</li>
                <li>Price: Execution price (optional, uses market price if not specified)</li>
              </ul>
            </li>
            <li><strong>Click "Execute Trade":</strong> Your trade will be executed</li>
          </ol>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Remember:</strong> All trades are in paper trading mode. No real money is at risk!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'automations',
      title: 'Automations - Automated Trading Strategies',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Automations allow you to set up trading strategies that execute automatically based on your criteria.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Creating an Automation</h4>
          <ol className="list-decimal list-inside space-y-3 text-gray-700 ml-4">
            <li><strong>Click "Create Automation":</strong> Fill in the automation details</li>
            <li><strong>Set Entry Conditions:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Symbol: Stock to trade</li>
                <li>Strategy Type: Long call, long put, covered call, etc.</li>
                <li>Min Confidence: Minimum signal confidence (0-100%)</li>
                <li>Preferred DTE: Days to expiration</li>
                <li>Delta Range: Target delta range</li>
              </ul>
            </li>
            <li><strong>Set Exit Conditions:</strong>
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Profit Target: Percentage profit to take (e.g., 25%)</li>
                <li>Stop Loss: Maximum loss percentage (e.g., 10%)</li>
                <li>Max Days to Hold: Maximum holding period</li>
              </ul>
            </li>
            <li><strong>Click "Create":</strong> Your automation is ready</li>
          </ol>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">How Automations Work</h4>
          <p className="text-gray-700">
            Once you start the Automation Engine:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>The system scans for opportunities every 15 minutes during market hours</li>
            <li>When entry conditions are met, trades are executed automatically</li>
            <li>Positions are monitored continuously</li>
            <li>When exit conditions are met, positions are closed automatically</li>
          </ul>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-purple-800">
              <strong>🤖 Automation Engine:</strong> Click "Start Engine" to begin automated trading. The engine runs continuously in the background.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'alerts',
      title: 'Alerts - Stay Informed',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Alerts keep you informed about trading opportunities and important events.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Types of Alerts</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Buy Signals:</strong> Opportunities to enter trades</li>
            <li><strong>Sell Signals:</strong> When to exit positions</li>
            <li><strong>Risk Alerts:</strong> Warnings about portfolio risk</li>
            <li><strong>Trade Executed:</strong> Notifications when automations execute trades</li>
          </ul>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Managing Alerts</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>View all alerts on the Alerts page</li>
            <li>Filter by type, status, or priority</li>
            <li>Acknowledge alerts to mark them as read</li>
            <li>Dismiss alerts you don't need</li>
            <li>See AI analysis for each alert</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'history',
      title: 'History - Review Your Trades',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The History page shows all your past trades with detailed information.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Viewing Trade History</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>See all your closed positions</li>
            <li>Filter by date range, symbol, or action</li>
            <li>View detailed trade information</li>
            <li>See realized P/L for each trade</li>
            <li>Review performance metrics</li>
          </ul>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Trade Details</h4>
          <p className="text-gray-700">
            Click "Show" on any trade to see:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Entry and exit prices</li>
            <li>Realized P/L and percentage</li>
            <li>Greeks at entry and exit</li>
            <li>Trade duration</li>
            <li>Commission and fees</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'settings',
      title: 'Settings - Customize Your Experience',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The Settings page allows you to customize your trading preferences and account settings.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Available Settings</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Risk Tolerance:</strong> Set your risk level (low, moderate, high)</li>
            <li><strong>Default Strategy:</strong> Choose your preferred trading strategy</li>
            <li><strong>Notifications:</strong> Enable or disable email notifications</li>
            <li><strong>Trading Mode:</strong> Switch between paper and live trading (when available)</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      content: (
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Is this real money trading?</h4>
            <p className="text-gray-700 mt-2">
              A: No, by default all trading is in paper trading mode. You start with $100,000 in virtual money. This is perfect for learning and testing strategies without any financial risk.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: How often do prices update?</h4>
            <p className="text-gray-700 mt-2">
              A: Position prices update automatically every 15 minutes when the automation engine is running. You can also manually refresh prices using the "Refresh Price" button.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: How do automations work?</h4>
            <p className="text-gray-700 mt-2">
              A: Automations scan for trading opportunities every 15 minutes during market hours. When entry conditions are met, trades execute automatically. Positions are monitored continuously, and exits execute when exit conditions are met.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Can I test an automation before enabling it?</h4>
            <p className="text-gray-700 mt-2">
              A: Yes! Use the "Test Trade" button on any automation to see if it would execute a trade right now. This helps you verify your automation settings are correct.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: What happens if I close a position manually?</h4>
            <p className="text-gray-700 mt-2">
              A: If you manually close a position that was created by an automation, the automation will stop monitoring it. The position will appear in your trade history with realized P/L.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    
    const query = searchQuery.toLowerCase();
    return sections.filter(section => 
      section.title.toLowerCase().includes(query) ||
      (typeof section.content === 'string' && section.content.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
    // Scroll to section
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Help & Documentation</h1>
              <p className="text-gray-600">Everything you need to know about IAB OptionsBot</p>
            </div>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              💬 Send Feedback
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              {filteredSections.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No results found for "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="p-8 space-y-12">
                  {filteredSections.map((section) => (
                    <div
                      key={section.id}
                      id={section.id}
                      className="scroll-mt-8"
                    >
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-3">
                        {section.title}
                      </h2>
                      <div className="prose max-w-none">
                        {section.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        initialPageUrl="/help"
      />
    </div>
  );
};

export default Help;

