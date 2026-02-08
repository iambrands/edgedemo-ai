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
      id: 'whats-new',
      title: "What's New",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🎯 Recent Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">🔥 Unusual Options Activity</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Top whale activity by contract size or by unusual volume</li>
                  <li>• Call vs put labels and sentiment</li>
                  <li>• Expiration and DTE on each signal</li>
                  <li>• View-all modal for full list</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">📅 Economic Calendar</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• High-impact economic events (GDP, Fed, jobs)</li>
                  <li>• Plan trades around announcements</li>
                  <li>• Available in Settings</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">🕐 Your Timezone</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Set timezone in Settings → Regional Settings</li>
                  <li>• All times (earnings, alerts, history) in your local time</li>
                  <li>• &quot;Detect My Timezone&quot; for one-tap setup</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">📈 Trade & Option Quote</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Expiration validated (past dates rejected with clear message)</li>
                  <li>• Better error messages when option quote fails</li>
                  <li>• Single-option and spread trading</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'introduction',
      title: 'Introduction',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">What is OptionsEdge?</h3>
          <p className="text-gray-700">
            OptionsEdge is an AI-powered options trading platform that uses Claude (Anthropic) to analyze options strategies and provide intelligent trade recommendations.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>🤖 AI-Powered Analysis:</strong> Get plain English explanations of complex options concepts using Claude</li>
            <li><strong>📊 Real-Time Data:</strong> Access current market data via Tradier API</li>
            <li><strong>📈 Performance Tracking:</strong> Monitor your trading results</li>
            <li><strong>🎯 Automated Trading:</strong> Set up strategies that execute automatically</li>
            <li><strong>💰 Risk Management:</strong> Built-in tools to protect your capital</li>
            <li><strong>📅 Economic Calendar:</strong> Plan trades around major events</li>
          </ul>
          
          <h4 className="text-xl font-semibold text-gray-900 mt-6">Key Features</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Unified Opportunities – Signals, Market Movers, and AI recommendations in one place</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Options Analyzer – AI-powered scoring and plain-English recommendations</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Automations – Set entry/exit rules and let the engine trade for you</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Automation Diagnostics – See why an automation did or didn’t fire</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Unusual Options Activity – Whale flow by contracts and sentiment</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Alerts – Trade executed, sell signals, and risk alerts</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Economic Calendar – Plan around GDP, Fed, jobs data</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Paper Trading – Start with $100,000 virtual balance; switch to live when ready</span>
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
          
          <h4 className="text-xl font-semibold text-gray-900 mt-4">Opportunities Page</h4>
          <p className="text-gray-700 mb-3">
            The unified Opportunities page combines all discovery features into one fast, easy-to-use interface with three tabs:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>🎯 Signals Tab:</strong> High-confidence trading signals (60%+) from your watchlist and popular symbols. Includes Quick Scan feature to instantly find opportunities across 10 high-volume stocks.</li>
            <li><strong>📈 Market Movers Tab:</strong> Pre-selected high-volume, high-volatility stocks and ETFs showing real-time price, volume, and change percentage. Always loads instantly.</li>
            <li><strong>🤖 For You Tab:</strong> Personalized AI recommendations based on your trading patterns, risk tolerance, and preferences. Always provides relevant suggestions.</li>
          </ul>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-purple-800">
              <strong>💡 Tip:</strong> All tabs load quickly using optimized algorithms. Click any card to instantly analyze options for that symbol in the Options Analyzer!
            </p>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Key Components</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Account Balance:</strong> Your current paper trading balance</li>
            <li><strong>Active Positions:</strong> All your open trades with real-time P/L</li>
            <li><strong>Performance Metrics:</strong> Total positions, unrealized P/L, realized P/L, and win rate</li>
            <li><strong>Performance Charts:</strong> Visual representation of your trading performance</li>
            <li><strong>Recent Trades:</strong> Your most recent trading activity</li>
            <li><strong>Refresh Button:</strong> Manually refresh dashboard data and update position prices</li>
            <li><strong>Check Exits Button:</strong> Manually trigger exit condition checks for all positions</li>
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
              <strong>💡 Tip:</strong> Use the "Refresh" button in the Dashboard header to manually update position prices. Prices also update automatically when the automation engine is running.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>⏳ Position Cooldown:</strong> Newly created positions have a 5-minute cooldown period. During this time, prices won't be updated and exit conditions won't be checked. This prevents false exits due to stale or incorrect price data immediately after opening a position.
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
      id: 'ai-analysis',
      title: 'AI Analysis - How Claude Works',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">How Claude Analyzes Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Step 1: Market Context</h4>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• Current price and trend</li>
                <li>• Support/resistance levels</li>
                <li>• Volume analysis</li>
                <li>• Implied volatility (IV)</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Step 2: Technical Signals</h4>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• Moving averages (MA)</li>
                <li>• MACD indicators</li>
                <li>• RSI levels</li>
                <li>• Volume patterns</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Step 3: Options Analysis</h4>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• Strike selection</li>
                <li>• Expiration timing</li>
                <li>• Greeks evaluation</li>
                <li>• Risk assessment</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Step 4: Recommendation</h4>
              <ul className="text-gray-700 text-sm space-y-1">
                <li>• Direction (buy/sell)</li>
                <li>• Specific option</li>
                <li>• Entry/exit prices</li>
                <li>• Position sizing</li>
              </ul>
            </div>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Understanding Confidence Scores</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="w-24 text-sm font-medium text-green-700">80-100%</span>
              <span className="text-gray-700">Very High - Strong technical alignment</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-24 text-sm font-medium text-green-600">60-79%</span>
              <span className="text-gray-700">High - Favorable conditions</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-24 text-sm font-medium text-yellow-600">40-59%</span>
              <span className="text-gray-700">Medium - Mixed signals</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-24 text-sm font-medium text-orange-600">20-39%</span>
              <span className="text-gray-700">Low - Weak setup</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="w-24 text-sm font-medium text-red-600">0-19%</span>
              <span className="text-gray-700">Very Low - Poor conditions</span>
            </div>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">How We Use AI</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-gray-700 mb-3">
              We use fast AI models so analysis is quick (usually a few seconds). For complex strategies (e.g. multi-leg spreads) or high-volatility symbols, we may use a more detailed model so you get accurate recommendations.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'economic-calendar',
      title: 'Economic Calendar',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">📅 Economic Calendar</h3>
          <p className="text-gray-700">
            Plan your trades around major economic events using our Finnhub-powered economic calendar.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">What It Shows</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Economic Events</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>GDP releases</li>
                <li>Unemployment data</li>
                <li>Federal Reserve decisions</li>
                <li>Inflation reports (CPI, PPI)</li>
                <li>Consumer confidence</li>
                <li>Housing data</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-gray-800 mb-2">Event Details</h5>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Date and time</li>
                <li>Impact level (high/medium)</li>
                <li>Country</li>
                <li>Expected vs. actual values</li>
                <li>Previous reading</li>
              </ul>
            </div>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">How to Use</h4>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Check weekly on Sundays:</strong> Review upcoming events for the week</li>
            <li><strong>Before each trade:</strong> Check for high-impact events near expiration</li>
            <li><strong>Avoid uncertainty:</strong> Close positions before major announcements if unsure</li>
            <li><strong>Look for opportunities:</strong> Plan entries after events settle</li>
          </ol>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Pro Tip:</strong> Don't hold options through FOMC announcements if you're not prepared for big moves! IV crush after events can hurt even if direction is right.
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-purple-800">
              <strong>📊 Access:</strong> Settings → Economic Calendar
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'performance',
      title: 'Performance & Reliability',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">What to Expect</h3>
          <p className="text-gray-700">
            OptionsEdge is built for fast loading and reliable analysis. Here’s what you’ll typically see:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Dashboard:</strong> Loads quickly; use Refresh to update positions and prices</li>
            <li><strong>Options Analyzer:</strong> Analysis usually finishes in a few seconds; complex symbols (e.g. TSLA) may take a bit longer</li>
            <li><strong>Option quote (Trade page):</strong> Fetch price may take a moment during busy market hours</li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 If something is slow:</strong> Refresh the page. If it keeps happening, use &quot;Send Feedback&quot; on this Help page so we can look into it.
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
                <li>Quantity: Number of contracts to buy per trade (default: 1)</li>
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
            <li>When entry conditions are met, trades are executed automatically with your specified quantity</li>
            <li>Positions are monitored continuously (after a 5-minute cooldown period for new positions)</li>
            <li>When exit conditions are met, positions are closed automatically</li>
            <li>New positions have a 5-minute cooldown before price updates and exit checks begin</li>
          </ul>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Automation Diagnostics</h4>
          <p className="text-gray-700 mb-3">
            The Automations page includes a Diagnostics panel that shows:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Whether each automation is ready to trade</li>
            <li>Specific blocking reasons (if trades aren't executing):
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Signal confidence too low → Lower min_confidence</li>
                <li>Already have open position → Close position or enable multiple positions</li>
                <li>Max positions reached → Close some positions</li>
                <li>No suitable options found → Adjust DTE, delta, volume, or open interest settings</li>
              </ul>
            </li>
            <li>Current signal confidence vs. minimum required</li>
            <li>Whether suitable options were found</li>
          </ul>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-purple-800">
              <strong>🤖 Automation Engine:</strong> Click "Start Engine" to begin automated trading. Use the Diagnostics panel to understand why automations aren't executing trades.
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

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Exporting Trade History</h4>
          <p className="text-gray-700">
            You can export your trade history to CSV for analysis or tax purposes:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
            <li>Apply any filters you want (date range, symbol, etc.)</li>
            <li>Click the "Export CSV" button in the Filters section</li>
            <li>The CSV file will download with all trade details</li>
          </ol>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> The exported CSV includes all trade details and is compatible with tax software and Excel.
            </p>
          </div>
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
            <li><strong>Risk Management:</strong> Default stop loss % and profit target % for positions</li>
            <li><strong>Default Strategy:</strong> Preferred trading strategy for recommendations</li>
            <li><strong>Regional Settings:</strong> Your timezone – all times (earnings, alerts, history) show in your local time. Use &quot;Detect My Timezone&quot; for one-tap setup</li>
            <li><strong>Notifications:</strong> Enable or disable email notifications</li>
            <li><strong>Trading Mode:</strong> Paper (virtual money) or Live (real money when your account is approved)</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'security',
      title: 'Account Security',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">Account Security</h3>

          <h4 className="text-xl font-semibold text-gray-900 mt-4">Rate Limiting</h4>
          <p className="text-gray-700 mb-4">
            To protect your account from unauthorized access, OptionsEdge limits certain actions:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700">Action</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Limit</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Reset Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-3 text-gray-700">Login attempts</td>
                  <td className="px-4 py-3 text-gray-700">5 attempts</td>
                  <td className="px-4 py-3 text-gray-700">15 minutes</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">Registration</td>
                  <td className="px-4 py-3 text-gray-700">3 per IP</td>
                  <td className="px-4 py-3 text-gray-700">1 hour</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">AI Analysis</td>
                  <td className="px-4 py-3 text-gray-700">20 requests</td>
                  <td className="px-4 py-3 text-gray-700">1 minute</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-gray-700">API requests</td>
                  <td className="px-4 py-3 text-gray-700">100 requests</td>
                  <td className="px-4 py-3 text-gray-700">1 minute</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">If you see &quot;Too Many Requests&quot;:</h4>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Wait 15 minutes before trying again</li>
              <li>Double-check your email and password</li>
              <li>Use &quot;Forgot Password&quot; if needed</li>
              <li>Contact support@optionsedge.ai if the issue persists</li>
            </ol>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Rate limiting is a security feature, not a bug. It prevents hackers from guessing passwords by making thousands of attempts. All secure platforms (banks, brokerages, etc.) use this protection.
          </p>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Other Security Measures</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>HTTPS Encryption:</strong> All data is encrypted in transit</li>
            <li><strong>JWT Authentication:</strong> Secure token-based sessions</li>
            <li><strong>Admin Protection:</strong> Administrative functions require elevated access</li>
            <li><strong>Audit Logging:</strong> All account actions are recorded for your review at <a href="/audit-log" className="text-indigo-600 hover:underline">/audit-log</a></li>
            <li><strong>Risk Acknowledgment:</strong> Required before first trade to ensure informed consent</li>
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
              A: Position prices update automatically when the automation engine is running. You can also manually refresh prices using the "Refresh" button in the Dashboard header. Note: Newly created positions have a 5-minute cooldown period before prices are updated to prevent false exits.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why aren't my new positions showing updated prices immediately?</h4>
            <p className="text-gray-700 mt-2">
              A: New positions have a 5-minute cooldown period to prevent false exits due to stale or incorrect price data. After 5 minutes, prices will update automatically and exit conditions will be checked. This ensures accurate position monitoring and prevents premature exits.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Where can I find trading opportunities and discovery features?</h4>
            <p className="text-gray-700 mt-2">
              A: All discovery features are now unified in the Opportunities page with three tabs:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li><strong>Signals Tab:</strong> High-confidence trading signals and Quick Scan feature</li>
                <li><strong>Market Movers Tab:</strong> Top high-volume, high-volatility stocks</li>
                <li><strong>For You Tab:</strong> Personalized AI recommendations based on your patterns</li>
              </ul>
              Access via "Opportunities" in the Discovery section of the sidebar. All tabs load quickly with optimized performance.
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
              A: Yes! Use the "🧪 Test Trade" button on any automation to see if it would execute a trade right now. This helps you verify your automation settings are correct. The test trade will use the quantity you specified.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why isn't my automation executing trades?</h4>
            <p className="text-gray-700 mt-2">
              A: Check the Diagnostics panel at the top of the Automations page. It shows exactly why each automation isn't executing. Common reasons:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Signal confidence too low → Lower min_confidence (try 0.30 for testing)</li>
                <li>Already have open position → Close position or enable "allow multiple positions"</li>
                <li>Max positions reached → Close some positions</li>
                <li>No suitable options found → Adjust DTE settings, volume, or open interest filters</li>
              </ul>
              Use the "Run Cycle Now" button to see detailed diagnostics and blocking reasons.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: How many contracts does an automation buy per trade?</h4>
            <p className="text-gray-700 mt-2">
              A: When creating or editing an automation, you can specify the "Quantity" field (default: 1 contract). Each time the automation executes a trade, it will buy that many contracts. For example, setting quantity to 3 means each trade will buy 3 contracts.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: What happens if I close a position manually?</h4>
            <p className="text-gray-700 mt-2">
              A: If you manually close a position that was created by an automation, the automation will stop monitoring it. The position will appear in your trade history with realized P/L.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Using the App</h3>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why are times wrong? I'm in Central / Pacific / etc.</h4>
            <p className="text-gray-700 mt-2">
              A: Set your timezone in <strong>Settings → Regional Settings</strong>. Use &quot;Detect My Timezone&quot; to set it automatically. After that, earnings dates, alerts, and trade history will show in your local time.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why does &quot;Fetch price&quot; fail when I sell an option?</h4>
            <p className="text-gray-700 mt-2">
              A: Make sure the expiration date is in the <strong>future</strong> (e.g. 2026, not 2006). The app will show a clear message if the expiration has passed. Use the expiration dropdown from the Trade page so the format is correct.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: What does &quot;AAPL 275 Put&quot; mean in Unusual Options Activity?</h4>
            <p className="text-gray-700 mt-2">
              A: It means there’s unusual volume on the AAPL $275 strike put. We show <strong>volume</strong> only – we don’t know if whales are buying or selling (that would need trade-by-trade data). Buying puts is bearish; selling puts is often bullish. Each row shows expiration and DTE (days to expiration).
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why is my dashboard or a page slow?</h4>
            <p className="text-gray-700 mt-2">
              A: Try refreshing the page. During market open, quote and analysis requests can be slower. If it’s often slow, use &quot;Send Feedback&quot; on the Help page so we can look into it.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why does TSLA (or another symbol) take longer to analyze?</h4>
            <p className="text-gray-700 mt-2">
              A: Symbols with many options (e.g. TSLA, NVDA) take a few extra seconds because we score more contracts. This is normal.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Economic Calendar</h3>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Economic calendar is empty?</h4>
            <p className="text-gray-700 mt-2">
              A: It may be temporarily unavailable. Try again later. You can still plan using external economic calendars.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Should I close positions before FOMC?</h4>
            <p className="text-gray-700 mt-2">
              A: If you're uncertain about direction, yes. FOMC (Federal Reserve) announcements often cause large moves. IV crush after events can hurt your position even if direction is correct. The economic calendar in Settings helps you plan around these events.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Security & Data</h3>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Is my data secure?</h4>
            <p className="text-gray-700 mt-2">
              A: Yes. API keys are encrypted at rest, all traffic uses HTTPS, and we don't share data with third parties. Your trading history is stored securely on Railway's infrastructure.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why am I seeing &quot;Too Many Requests&quot; when trying to log in?</h4>
            <p className="text-gray-700 mt-2">
              A: For security, we limit login attempts to 5 per 15 minutes. Wait 15 minutes and try again. If you&apos;ve forgotten your password, use the &quot;Forgot Password&quot; link on the login page.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: How long do I have to wait after being rate limited?</h4>
            <p className="text-gray-700 mt-2">
              A: The rate limit resets automatically after 15 minutes. A successful login also resets the counter immediately.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Is rate limiting a bug?</h4>
            <p className="text-gray-700 mt-2">
              A: No, it&apos;s a security feature. Rate limiting protects your account from hackers who try to guess passwords by making thousands of attempts. All secure platforms (banks, brokerages, etc.) use this protection. See the <a href="#security" className="text-indigo-600 hover:underline">Account Security</a> section for details.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Can I export my data?</h4>
            <p className="text-gray-700 mt-2">
              A: Yes. Go to History page and use the "Export CSV" button. The exported file includes all trade details and is compatible with tax software and Excel.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      content: (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900">Common Issues & Solutions</h3>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800">Dashboard or Page Loading Slowly</h4>
              <p className="text-red-700 mt-2 text-sm">
                <strong>Try:</strong> Refresh the page. Clear your browser cache and reload. If it keeps happening, use &quot;Send Feedback&quot; on the Help page so we can investigate.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800">Analysis Taking a While</h4>
              <p className="text-orange-700 mt-2 text-sm">
                Analysis usually finishes in a few seconds. Symbols with many options (e.g. TSLA, NVDA) can take longer. If it’s much slower than that, refresh and try again or try a different symbol.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800">Trade Execution Fails</h4>
              <p className="text-yellow-700 mt-2 text-sm">
                <strong>Check:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-yellow-700 text-sm space-y-1">
                <li>Tradier API key valid? → Check Settings</li>
                <li>Sufficient buying power? → Add cash</li>
                <li>Market hours (9:30am-4pm ET)? → Wait for market open</li>
                <li>Symbol valid? → Check ticker symbol</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800">API Rate Limits</h4>
              <p className="text-blue-700 mt-2 text-sm">
                <strong>Finnhub limits:</strong> 60 calls/minute, 30,000 calls/month (free tier)
              </p>
              <p className="text-blue-700 mt-2 text-sm">
                <strong>Tradier limits:</strong> Unlimited on sandbox, 120 calls/min on live
              </p>
              <p className="text-blue-700 mt-2 text-sm">
                <strong>Solution:</strong> We cache results for 1 hour. Wait a minute if rate limited.
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <h4 className="font-semibold text-green-800">Need Help?</h4>
            <ul className="text-green-700 text-sm mt-2 space-y-1">
              <li>📧 Email: support@optionsedge.ai</li>
              <li>💬 Use the "Send Feedback" button above</li>
              <li>🐛 Report bugs via GitHub or email</li>
            </ul>
            <p className="text-green-700 text-sm mt-2">
              <strong>Response times:</strong> Critical issues within 4 hours, general support within 24 hours.
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
              <p className="text-gray-600">OptionsEdge • Help & FAQ</p>
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

