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
      title: "What's New (January 2026)",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🎯 Recent Updates & New Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">📊 Performance Monitoring (NEW)</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Real-time performance tracking</li>
                  <li>• API cost analysis (Claude, Tradier)</li>
                  <li>• Slow request detection</li>
                  <li>• Database query optimization</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">📅 Economic Calendar (NEW)</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Powered by Finnhub</li>
                  <li>• High-impact economic events</li>
                  <li>• 7-day forward looking</li>
                  <li>• GDP, unemployment, Fed decisions</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">🏥 System Health Dashboard (IMPROVED)</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Database connection monitoring</li>
                  <li>• Redis cache statistics</li>
                  <li>• Tradier API status</li>
                  <li>• Environment configuration display</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-semibold text-indigo-700 mb-2">⚡ Optimization Achievements</h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Database: 10x faster with indexes</li>
                  <li>• Claude costs: 100x cheaper with Haiku</li>
                  <li>• Option chains: 75% faster filtering</li>
                  <li>• API calls: 90% reduction with caching</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>✅ Performance Targets Achieved:</strong> Dashboard loads in &lt;500ms, analysis costs ~$0.0005 per request, cache hit rate &gt;90%
            </p>
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
              <span className="text-gray-700">Unified Opportunities Page - Signals, Market Movers, and AI recommendations in one place</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Options Chain Analysis - AI-powered scoring and recommendations</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Automated Trading - Set it and forget it strategies with quantity control</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Automation Diagnostics - See exactly why automations are or aren't executing</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Real-Time Alerts - Never miss an opportunity</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Performance Dashboard - Track response times and API costs</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">✅</span>
              <span className="text-gray-700">Economic Calendar - Plan trades around GDP, Fed, unemployment events</span>
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

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Cost Optimization</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-gray-700 mb-3">
              <strong>We use Claude Haiku for most analysis:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
              <li>Cost: ~$0.0005 per analysis (half a penny!)</li>
              <li>Speed: 1-2 seconds</li>
              <li>Quality: Excellent for routine analysis</li>
              <li>Result: 100x cheaper than Claude Sonnet</li>
            </ul>
            <p className="text-sm text-blue-800 mt-3">
              <strong>💡 Sonnet used for:</strong> Multi-leg strategies (iron condors, butterflies), high volatility stocks (TSLA, NVDA), earnings week analysis
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
          <h3 className="text-2xl font-bold text-gray-900">📅 Economic Calendar (NEW)</h3>
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
              <strong>📊 Access via:</strong> Settings → Economic Calendar, or API endpoint <code className="bg-purple-100 px-1 rounded">/api/earnings/economic</code>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'performance',
      title: 'Performance & System Health',
      content: (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900">📊 Performance Dashboard (NEW)</h3>
          
          <h4 className="text-xl font-semibold text-gray-900 mt-4">What It Shows</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>Request Timing:</strong> How fast pages load (target: &lt;500ms)</li>
            <li><strong>API Call Costs:</strong> Claude and Tradier spending</li>
            <li><strong>Slow Operations:</strong> Identify bottlenecks</li>
            <li><strong>Database Performance:</strong> Query times and connection stats</li>
            <li><strong>Cache Hit Rate:</strong> % of requests served from cache (target: &gt;90%)</li>
          </ul>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">Metrics Explained</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">P95 Duration</h5>
              <p className="text-gray-700 text-sm">95% of requests complete faster than this time. If P95 is 400ms, only 5% take longer.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">Cache Hit Rate</h5>
              <p className="text-gray-700 text-sm">Percentage of requests served from cache. Higher = faster and cheaper.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">API Costs</h5>
              <p className="text-gray-700 text-sm">Total spending on Claude (~$0.0005/analysis) and Tradier API calls.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 mb-2">Slow Requests</h5>
              <p className="text-gray-700 text-sm">Requests taking &gt;1 second. These are flagged for optimization.</p>
            </div>
          </div>

          <h4 className="text-xl font-semibold text-gray-900 mt-6">System Health Components</h4>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li><strong>🟢 Database:</strong> Connection pool and query performance</li>
            <li><strong>🟢 Redis Cache:</strong> Memory usage and hit rate</li>
            <li><strong>🟢 Tradier API:</strong> Connection status and mode (sandbox/live)</li>
            <li><strong>🟢 Environment:</strong> Configuration and debug status</li>
          </ul>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-800">
              <strong>✅ Current Performance (January 2026):</strong>
            </p>
            <ul className="text-sm text-green-800 mt-2 space-y-1">
              <li>• Dashboard: &lt;500ms ✅</li>
              <li>• Analysis: 1-2 seconds (Haiku) ✅</li>
              <li>• Option chains: 2-3 seconds (filtered) ✅</li>
              <li>• Cache hit rate: &gt;90% ✅</li>
              <li>• API costs: &lt;$0.001 per analysis ✅</li>
            </ul>
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">Performance & Technical</h3>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why is my dashboard slow?</h4>
            <p className="text-gray-700 mt-2">
              A: We recently added database indexes for 10x speedup. If still slow, check the Performance Dashboard for bottlenecks. Common causes: too many open positions, cache not working, or browser cache needs clearing.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: What's a cache hit rate?</h4>
            <p className="text-gray-700 mt-2">
              A: The percentage of requests served from cache vs. fetching new data. Target: &gt;90%. Higher cache hit rate = faster responses and lower API costs.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: How do I see my API costs?</h4>
            <p className="text-gray-700 mt-2">
              A: Go to Performance Dashboard → API Call Costs section. This shows Claude (AI analysis) and Tradier (market data) costs broken down by operation.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Why does TSLA take longer to analyze?</h4>
            <p className="text-gray-700 mt-2">
              A: TSLA has 1,200+ options. We filter to strikes within ±20% of the current price, which makes it 75% faster. Still, high-volume symbols take longer due to more data.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: How much does AI analysis cost?</h4>
            <p className="text-gray-700 mt-2">
              A: ~$0.0005 per analysis (half a penny). At 10 analyses/day = $0.15/month. We use Claude Haiku for most analysis (100x cheaper than Sonnet) with comparable quality for routine trades.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Economic Calendar</h3>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Economic calendar not showing data?</h4>
            <p className="text-gray-700 mt-2">
              A: Check if FINNHUB_API_KEY is set in the environment variables. Common issues:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>API key not configured in Railway → Add it in Variables tab</li>
                <li>Rate limit exceeded (60 calls/min) → Wait a minute</li>
                <li>Calendar endpoint not deployed → Redeploy app</li>
              </ul>
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900">Q: Should I close positions before FOMC?</h4>
            <p className="text-gray-700 mt-2">
              A: If you're uncertain about direction, yes. FOMC (Federal Reserve) announcements often cause large moves. IV crush after events can hurt your position even if direction is correct. The economic calendar helps you plan around these events.
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
              <h4 className="font-semibold text-red-800">Dashboard Loading Slowly</h4>
              <p className="text-red-700 mt-2 text-sm">
                <strong>Causes:</strong> Database needs optimization, cache not working, too many open positions
              </p>
              <p className="text-red-700 mt-2 text-sm">
                <strong>Solutions:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-red-700 text-sm space-y-1">
                <li>Check Performance Dashboard for bottlenecks</li>
                <li>Clear browser cache</li>
                <li>Reload page</li>
                <li>Contact support if persistent</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-800">Analysis Taking Too Long</h4>
              <p className="text-orange-700 mt-2 text-sm">
                <strong>Normal timing:</strong> Simple analysis 1-2s (Haiku), Complex 3-5s (Sonnet), Option chains 2-8s
              </p>
              <p className="text-orange-700 mt-2 text-sm">
                <strong>If slower:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-orange-700 text-sm space-y-1">
                <li>Check Performance Dashboard for slow operations</li>
                <li>TSLA/NVDA take longer (more options)</li>
                <li>Clear cache and retry</li>
                <li>Try a simpler symbol first</li>
              </ul>
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
              <p className="text-gray-600">OptionsEdge v1.2.0 • Updated January 2026</p>
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

