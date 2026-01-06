# IAB OptionsBot - Complete User Instruction Manual

**Version:** 1.1 Beta  
**Last Updated:** January 2025

## 🌐 Access the Application

**Live URL:** [Your Railway Deployment URL]  
**Note:** Replace with your actual Railway deployment URL (e.g., `https://your-app-name.up.railway.app`)

**Status:** ✅ Live and Ready for Testing

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard - Your Trading Command Center](#dashboard)
4. [Options Analyzer - Find the Best Trades](#options-analyzer)
5. [Watchlist - Track Your Stocks](#watchlist)
6. [Opportunities - Discover Trading Signals](#opportunities)
7. [Trade Execution - Place Your Trades](#trade-execution)
8. [Automations - Automated Trading Strategies](#automations)
9. [Alerts - Stay Informed](#alerts)
10. [History - Review Your Trades](#history)
11. [Settings - Customize Your Experience](#settings)
12. [Understanding Options Trading](#understanding-options-trading)
13. [Advanced Features](#advanced-features)
14. [Troubleshooting](#troubleshooting)
15. [FAQ](#faq)

---

## 🎯 Introduction

### What is IAB OptionsBot?

IAB OptionsBot is an intelligent options trading platform that combines:
- **AI-Powered Analysis:** Get plain English explanations of complex options concepts
- **Automated Trading:** Set up strategies that execute trades automatically
- **Real-Time Data:** Access current market data and options chains
- **Risk Management:** Built-in tools to protect your capital
- **Paper Trading:** Practice with virtual money before risking real capital

### Key Features

✅ **Options Chain Analysis** - AI-powered scoring and recommendations  
✅ **Automated Trading** - Set it and forget it strategies  
✅ **Real-Time Alerts** - Never miss an opportunity with customizable filters  
✅ **Performance Tracking** - Monitor your trading results  
✅ **Risk Management** - Protect your capital automatically  
✅ **Paper Trading** - Learn risk-free with $100,000 virtual balance  
✅ **Test Trade Feature** - Test automations instantly with one click  
✅ **Advanced Automation Controls** - Fine-tune expiration dates and strike prices  

---

## 🚀 Getting Started

### Creating Your Account

1. **Navigate to the Registration Page**
   - Click "Register" or go to `/register`
   - You'll see a registration form

2. **Fill in Your Details:**
   - **Username:** Choose a unique username (required)
   - **Email:** Your email address (required)
   - **Password:** Create a strong password (required)
   - **Confirm Password:** Re-enter your password

3. **Click "Register"**
   - Your account will be created
   - You'll be automatically logged in
   - You'll be redirected to the Dashboard

### First-Time Login

If you already have an account:

1. **Go to Login Page**
   - Click "Login" or navigate to `/login`

2. **Enter Credentials:**
   - **Username:** Your registered username
   - **Password:** Your password

3. **Click "Login"**
   - You'll be redirected to your Dashboard

### Understanding Paper Trading

**Important:** IAB OptionsBot uses **Paper Trading Mode** by default.

**What This Means:**
- ✅ You start with $100,000 in virtual money
- ✅ All trades are simulated (not real money)
- ✅ Perfect for learning and testing strategies
- ✅ No financial risk while you learn
- ✅ Real market data, virtual execution

**When You're Ready:**
- Switch to "Live Trading" mode in Settings (when available)
- Connect your real trading account
- Start trading with real capital

---

## 📊 Dashboard - Your Trading Command Center

The Dashboard is the first page you see after logging in. It's your central hub for monitoring your trading activity.

### Account Balance Card

**Location:** Top of the Dashboard

**Shows:**
- **Paper Trading Balance:** Your current virtual account balance
- **Starting Balance:** $100,000 (default)
- **Current Balance:** Updates in real-time as you trade

**What to Watch:**
- Monitor your balance to ensure you have funds for trades
- Balance decreases when you buy options
- Balance increases when you sell options or close profitable positions

### Performance Statistics Cards

**Four Key Metrics:**

1. **Total Positions**
   - Number of currently open positions
   - Click to see all positions

2. **Unrealized P/L**
   - Profit or loss on open positions
   - Green = profit, Red = loss
   - Updates as market prices change

3. **Realized P/L (30d)**
   - Profit or loss from closed trades in the last 30 days
   - Only includes completed trades

4. **Win Rate**
   - Percentage of winning trades
   - Calculated from your recent trades
   - Higher is better!

### Performance Trend Chart

**What It Shows:**
- Line chart of your cumulative profit/loss over time
- X-axis: Dates of your closed trades
- Y-axis: Cumulative P/L in dollars

**How to Read:**
- **Upward trend:** You're making money
- **Downward trend:** You're losing money
- **Flat line:** Break-even

**Note:** Chart only appears after you've closed some positions. If you see "No performance data yet," close some positions to see your trend.

### Positions by Symbol Chart

**What It Shows:**
- Bar chart showing how many positions you have per stock
- Helps you see your diversification

**Example:**
- 3 positions in AAPL
- 2 positions in TSLA
- 1 position in SPY

### Active Positions Table

**Location:** Below the charts

**Columns:**
- **Symbol:** Stock ticker (e.g., AAPL)
- **Type:** CALL or PUT
- **Quantity:** Number of contracts
- **Entry Price:** Price you paid (premium for options)
- **Current Price:** Current market price (premium for options)
- **Expiration:** When the option expires
- **P/L:** Unrealized profit/loss in dollars
- **P/L %:** Unrealized profit/loss as percentage
- **Actions:** Buttons to view details or close position

**Understanding the Data:**
- **Entry Price (premium):** For options, this is the premium you paid
- **Current Price (premium):** Current option premium value
- **P/L:** Difference between entry and current price
- **Days to Expiration:** Shows urgency (red = <7 days, yellow = <21 days)

**Actions:**
- **Details Button:** Click to see full position information including:
  - All Greeks (Delta, Gamma, Theta, Vega, IV)
  - Entry and current Greeks comparison
  - Full trade history
  - Automation details (if automated)
- **Close Button:** Immediately close the position

### Recent Trades Table

**Location:** Below Active Positions

**Shows:** Your last 10 trades

**Columns:**
- **Date:** When the trade was executed
- **Symbol:** Stock ticker
- **Action:** BUY or SELL
- **Quantity:** Number of contracts
- **Price:** Execution price (premium for options)
- **Expiration:** Option expiration date
- **P/L:** Realized profit/loss (if position closed)
- **Actions:** View details button

**Details Button Shows:**
- Complete trade information
- Greeks at execution
- P/L breakdown
- Automation details (if automated)

### Dashboard Actions

**Refresh Button:**
- Top right of Dashboard
- Updates all data in real-time
- Use when you want the latest information

---

## 🔍 Options Analyzer - Find the Best Trades

The Options Analyzer is your primary tool for finding profitable options trades using AI-powered analysis.

### Accessing the Options Analyzer

**Ways to Access:**
1. Click "Options Analyzer" in the navigation menu
2. From Watchlist → Click "Analyze" button
3. Direct URL: `/analyzer`

### Step-by-Step: Analyzing Options

#### Step 1: Enter Stock Symbol

1. **Type a Stock Symbol**
   - Examples: AAPL, TSLA, SPY, NVDA
   - Symbol is automatically converted to uppercase
   - Press Enter or click outside the field

2. **What Happens:**
   - System fetches available expiration dates
   - Current stock price is displayed at the top
   - Expiration dropdown populates

#### Step 2: Select Expiration Date

1. **View Available Expirations**
   - Dropdown shows all available expiration dates
   - Dates are sorted chronologically
   - Format: YYYY-MM-DD

2. **Choose Your Expiration:**
   - **Income Strategy:** Choose shorter expirations (1-3 weeks)
   - **Balanced Strategy:** Choose medium expirations (3-6 weeks)
   - **Growth Strategy:** Choose longer expirations (6+ weeks)

3. **Select from Dropdown**
   - Click the expiration you want

#### Step 3: Choose Strategy Preference

**Three Options:**

1. **Income**
   - Focus: Collecting premium
   - Best for: Selling options (covered calls, cash-secured puts)
   - DTE Preference: 14-21 days
   - Risk: Lower to moderate

2. **Balanced**
   - Focus: Mix of income and growth
   - Best for: Most traders
   - DTE Preference: 30-45 days
   - Risk: Moderate

3. **Growth**
   - Focus: Capital appreciation
   - Best for: Buying options for upside
   - DTE Preference: 45-60+ days
   - Risk: Higher

#### Step 4: Analyze Options

1. **Click "Analyze Options" Button**
   - Button is at the bottom of the form
   - Only enabled when symbol and expiration are selected

2. **Wait for Analysis**
   - System analyzes all available options
   - AI processes each option
   - Results are scored and sorted

3. **View Results**
   - Options are displayed in a table
   - Sorted by score (best first)
   - Each option shows key metrics

### Understanding the Results Table

**Columns in Results:**

1. **Score (0-1.0)**
   - Overall quality score
   - Higher = better opportunity
   - Color-coded:
     - 🟢 Green: 0.8-1.0 (Excellent)
     - 🟡 Yellow: 0.6-0.8 (Good)
     - 🟠 Orange: 0.4-0.6 (Fair)
     - 🔴 Red: <0.4 (Poor)

2. **Category**
   - Excellent, Good, Fair, or Poor
   - Quick visual indicator

3. **Contract Type**
   - CALL or PUT
   - Shows direction of the trade

4. **Strike Price**
   - The strike price of the option
   - Compare to current stock price

5. **Premium (Mid)**
   - Current option premium
   - Average of bid and ask

6. **Delta**
   - Price sensitivity to stock movement
   - Range: -1.0 to +1.0
   - Higher absolute value = more sensitive

7. **Greeks**
   - Delta, Gamma, Theta, Vega, IV
   - Hover for quick tooltips

8. **Days to Expiration (DTE)**
   - How many days until expiration
   - Lower = more time decay risk

9. **Volume**
   - Trading volume
   - Higher = more liquid

10. **Open Interest**
    - Number of open contracts
    - Higher = more interest

### AI Analysis Section

**For Each Option, You'll See:**

#### AI Recommendation
- **Action:** Buy, Consider, Consider Carefully, or Avoid
- **Confidence:** High, Medium, or Low
- **Suitability:** Suitable, Moderately Suitable, or Not Suitable
- **Reasoning:** 2-3 sentence explanation

#### Greeks Explained (Plain English)

**Delta:**
- What it means in simple terms
- How it affects your trade
- Example: "Delta of 0.50 means for every $1 the stock moves, this option moves $0.50"

**Gamma:**
- How delta changes as stock moves
- Impact on your position

**Theta (Time Decay):**
- How much value you lose per day
- Critical for timing decisions
- Example: "Losing $0.50 per day in time decay"

**Vega (Volatility):**
- Sensitivity to volatility changes
- How IV affects the option price

**Implied Volatility (IV):**
- Current volatility level
- High IV = expensive options
- Low IV = cheaper options

#### Trade Analysis

**Overview:**
- Overall assessment of the trade
- ITM/OTM status
- Current market conditions

**Best Case Scenario:**
- What happens if everything goes right
- Maximum profit potential

**Worst Case Scenario:**
- What happens if trade goes against you
- Maximum loss (usually premium paid)

**Break-Even:**
- Exact price needed to break even
- For calls: Strike + Premium
- For puts: Strike - Premium

**Profit Potential:**
- How much stock needs to move
- Percentage move required
- Time considerations

**Time Considerations:**
- Days remaining
- Time decay impact
- Urgency level

#### Risk Assessment

**Overall Risk Level:**
- Low, Moderate, or High
- Based on multiple factors

**Risk Factors:**
- List of specific risks
- What to watch out for

**Warnings:**
- Important cautions
- Red flags to consider

### Quick Actions from Options Analyzer

**Trade Button:**
1. Click "Trade" on any option
2. You're taken to Trade page
3. All fields are pre-filled
4. Review and execute

**Add to Watchlist:**
1. Click "Add to Watchlist" button (top right)
2. Stock is added to your watchlist
3. You can track it over time

### Tips for Using Options Analyzer

1. **Start with High Scores:** Focus on options with scores >0.7
2. **Read AI Analysis:** The explanations are very educational
3. **Compare Multiple Options:** Analyze different strikes and expirations
4. **Consider Your Strategy:** Match options to your preference (income/growth/balanced)
5. **Check Liquidity:** Look for options with volume >100
6. **Mind the Greeks:** Understand what each Greek means for your trade
7. **Time Decay:** Be aware of theta, especially near expiration

---

## 📈 Watchlist - Track Your Stocks

The Watchlist helps you monitor stocks you're interested in trading.

### Adding Stocks to Watchlist

#### Method 1: From Options Analyzer
1. Analyze a stock in Options Analyzer
2. Click "Add to Watchlist" button (top right)
3. Stock is automatically added

#### Method 2: From Watchlist Page
1. Go to Watchlist page
2. Click "Add Stock" button
3. Enter stock symbol
4. (Optional) Add tags (e.g., "tech", "dividend", "growth")
5. (Optional) Add notes (e.g., "Watching for earnings")
6. Click "Add"

### Viewing Your Watchlist

**Table Columns:**
- **Symbol:** Stock ticker
- **Company Name:** Full company name
- **Current Price:** Real-time stock price
- **Change %:** Price change percentage
  - Green arrow (↑) = up
  - Red arrow (↓) = down
- **Volume:** Trading volume
- **Tags:** Your custom tags
- **Actions:** Quick action buttons

### Quick Actions

**For Each Stock:**

1. **Analyze Button**
   - Click to go to Options Analyzer
   - Symbol is pre-filled
   - Start analyzing immediately

2. **Trade Button**
   - Click to go to Trade page
   - Symbol is pre-filled
   - Quick trade execution

3. **Notes Button**
   - Click to edit your notes
   - Add reminders or observations
   - Save your thoughts

### Managing Your Watchlist

**Filtering:**
- Use search box to filter by symbol
- Filter by tags (if implemented)

**Sorting:**
- Click column headers to sort
- Sort by symbol, price, or change

**Removing Stocks:**
- Click "Remove" or delete button
- Confirm removal
- Stock is removed from watchlist

### Price Indicators

**Visual Indicators:**
- **Green Arrow (↑):** Price increased
- **Red Arrow (↓):** Price decreased
- **Percentage:** Shows % change
- **Color Coding:** Green for gains, red for losses

### Best Practices

1. **Keep It Focused:** Don't add too many stocks (10-20 is manageable)
2. **Use Tags:** Organize stocks by strategy or sector
3. **Add Notes:** Document why you're watching each stock
4. **Regular Review:** Check your watchlist regularly
5. **Remove Unused:** Clean up stocks you're no longer interested in

---

## 🎯 Opportunities - Discover Trading Signals

The Opportunities page is your centralized hub for discovering trading opportunities. It combines three powerful views into one convenient, fast-loading interface.

### Accessing Opportunities

**Ways to Access:**
1. Click "Opportunities" in the Discovery section of the navigation menu
2. From Dashboard → Click one of the quick link cards
3. Direct URL: `/opportunities`

### Understanding the Tabbed Interface

The Opportunities page uses a tabbed interface with three distinct views:

1. **🎯 Signals Tab** - High-confidence trading signals from your watchlist and popular symbols
2. **📈 Market Movers Tab** - Stocks with high volume and volatility
3. **🤖 For You Tab** - Personalized AI recommendations based on your trading patterns

All tabs load quickly and efficiently using optimized, fast-scoring algorithms.

### Signals Tab - Trading Signals

**What It Shows:**
- High-confidence trading signals (60%+ confidence)
- Based on price movement and volume analysis
- Prioritizes your watchlist symbols
- Falls back to 10 curated high-volume symbols if watchlist is empty

**How It Works:**
1. **Automatic Loading:** Signals load automatically when you switch to this tab
2. **Quick Scoring:** Uses fast quote-based scoring (no slow technical analysis)
3. **Smart Filtering:** Shows opportunities with 60%+ confidence
4. **Real-Time Data:** Updates with current market data

**Understanding Signal Cards:**
Each signal card shows:
- **Symbol:** Stock ticker (e.g., AAPL, TSLA, SPY)
- **Confidence:** Signal confidence percentage (shown as green badge)
- **Reason:** Brief explanation of why this is an opportunity
- **Contract Type:** CALL, PUT, or OPTION (generic)
- **Analyze Options Button:** Click to analyze options for this symbol

**Quick Scan Feature:**
- Click "⚡ Quick Scan" button at the top
- Scans 10 popular high-volume symbols instantly
- Finds additional opportunities beyond your watchlist
- Results appear in a separate section below

**How to Use:**
1. Switch to Signals tab
2. Review the opportunities shown
3. Click on any card to analyze options for that symbol
4. Or click "Analyze Options" button on the card
5. Use "Quick Scan" to find more opportunities

**Best Practices:**
- Check Signals tab daily for new opportunities
- Focus on symbols with 70%+ confidence
- Use Quick Scan to discover new stocks
- Add interesting symbols to your watchlist

### Market Movers Tab - High Volume & Volatility

**What It Shows:**
- 10 pre-selected high-volume, high-volatility stocks and ETFs
- Real-time price, volume, and change percentage
- Always available, loads instantly

**How It Works:**
1. **Curated List:** Uses 10 fixed, highly liquid symbols:
   - ETFs: SPY, QQQ, IWM
   - Mega-cap tech: AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA
2. **Fast Loading:** Just fetches current quotes (no heavy analysis)
3. **Sorted by Activity:** Most active movers shown first

**Understanding Market Mover Cards:**
Each card shows:
- **Symbol:** Stock ticker
- **Company Name:** Full company name (if available)
- **Price Change %:** Color-coded change percentage
  - Green = positive change
  - Red = negative change
- **Current Price:** Real-time stock price
- **Volume:** Trading volume
- **Analyze Options Button:** Click to analyze options

**How to Use:**
1. Switch to Market Movers tab
2. Browse the high-volume stocks
3. Look for significant price movements (±2%+)
4. Click on any card to analyze options
5. Use "Refresh" button to update prices

**Best Practices:**
- Check Market Movers for volatile trading opportunities
- Focus on stocks with ±2%+ price movement
- High volume means better liquidity for options
- Combine with your own analysis

### For You Tab - AI Recommendations

**What It Shows:**
- Personalized symbol recommendations based on your trading history
- Matched to your risk tolerance profile
- Always provides results, even for new users

**How It Works:**
1. **Personalization:** Analyzes your trading patterns and preferences
2. **Risk Matching:** Recommends symbols matching your risk tolerance
   - **Low Risk:** Conservative stocks (SPY, QQQ, AAPL, MSFT, etc.)
   - **Moderate Risk:** Balanced portfolio (AAPL, TSLA, NVDA, etc.)
   - **High Risk:** Volatile stocks (TSLA, NVDA, AMD, etc.)
3. **Fast Scoring:** Uses optimized scoring algorithm
4. **Fallback:** Always provides recommendations even if you're new

**Understanding Recommendation Cards:**
Each card shows:
- **Symbol:** Stock ticker
- **Confidence:** Recommendation confidence (purple badge)
- **Reason/Reasoning:** Why this symbol was recommended
- **Strategy:** Suggested strategy type
- **Analyze Options Button:** Click to analyze options

**Personalization Factors:**
- Your watchlist symbols (prioritized)
- Your trading history and successful trades
- Your risk tolerance setting (from Settings)
- Market activity and volume

**How to Use:**
1. Switch to For You tab
2. Review personalized recommendations
3. Read the reasoning for each recommendation
4. Click on any card to analyze options
5. Use "Refresh" to get updated recommendations

**Best Practices:**
- Check For You tab regularly for personalized picks
- Pay attention to the reasoning for each recommendation
- Consider adding recommended symbols to your watchlist
- Review recommendations that match your risk profile

### Tab Navigation

**Switching Tabs:**
- Click on any tab header to switch views
- Current tab is highlighted in blue
- Each tab loads its data independently
- Data loads automatically when you switch tabs

**URL Parameters:**
You can link directly to a specific tab:
- `/opportunities?tab=signals` - Opens Signals tab
- `/opportunities?tab=movers` - Opens Market Movers tab
- `/opportunities?tab=for-you` - Opens For You tab

### Quick Actions

**From Any Tab:**

1. **Analyze Options:**
   - Click on any card or the "Analyze Options" button
   - Takes you to Options Analyzer with symbol pre-filled
   - Start analyzing immediately

2. **Refresh:**
   - Click "Refresh" button at the top right
   - Reloads current tab's data
   - Updates with latest market information

3. **Quick Scan (Signals tab only):**
   - Click "⚡ Quick Scan" button
   - Scans popular symbols instantly
   - Adds new opportunities to the list

### Performance & Speed

**Optimized for Speed:**
- All tabs use fast, optimized algorithms
- No slow technical analysis or IV rank calculations
- Loads in seconds, not minutes
- No timeouts or loading delays

**Efficient Data Loading:**
- Only loads data when you view a tab
- Caches data to reduce API calls
- Smart refresh to minimize requests

### Tips for Using Opportunities Page

1. **Start with For You:** Check personalized recommendations first
2. **Check Signals Daily:** Review high-confidence signals regularly
3. **Watch Market Movers:** Monitor for volatile trading opportunities
4. **Use Quick Actions:** Click cards to analyze options instantly
5. **Combine with Watchlist:** Add interesting symbols to your watchlist
6. **Refresh Regularly:** Use Refresh button to get latest data

### Troubleshooting

**No Opportunities Showing:**
- **Signals Tab:** Try Quick Scan or add symbols to your watchlist
- **Market Movers Tab:** Should always show 10 symbols, try Refresh
- **For You Tab:** Should always show recommendations, try Refresh

**Slow Loading:**
- All tabs should load quickly (under 5 seconds)
- If slow, check your internet connection
- Try refreshing the page

**Data Not Updating:**
- Click Refresh button
- Switch to another tab and back
- Check if market is open

---

## 💼 Trade Execution - Place Your Trades

The Trade page is where you execute options trades manually.

### Accessing the Trade Page

**Ways to Access:**
1. Click "Trade" in navigation menu
2. From Options Analyzer → Click "Trade" button on any option
3. From Watchlist → Click "Trade" button
4. From Dashboard → Click "Start Trading" link

### Step-by-Step: Placing a Trade

#### Step 1: Select Stock Symbol

1. **Enter or Select Symbol**
   - If coming from Options Analyzer/Watchlist, symbol is pre-filled
   - Otherwise, type the symbol
   - Symbol auto-converts to uppercase

2. **Stock Price Display**
   - Current stock price is shown
   - Updates automatically
   - Use "Fetch Stock Price" to refresh

#### Step 2: Choose Trade Action

**Two Options:**

1. **Buy (Long)**
   - You're buying the option
   - Bullish for calls, bearish for puts
   - You own the option
   - Maximum loss = premium paid

2. **Sell (Short)**
   - You're selling the option
   - Collecting premium
   - Higher risk (unlimited loss potential)
   - Maximum profit = premium received

**For Beginners:** Start with "Buy" (long positions)

#### Step 3: Select Contract Type

**Two Options:**

1. **Call**
   - Right to buy stock at strike price
   - Profits when stock goes up
   - Bullish position

2. **Put**
   - Right to sell stock at strike price
   - Profits when stock goes down
   - Bearish position

#### Step 4: Choose Expiration Date

1. **Select from Dropdown**
   - Shows available expiration dates
   - Choose based on your strategy
   - Shorter = more time decay risk

2. **After Selection:**
   - Option price is automatically fetched
   - Strike prices become available

#### Step 5: Select Strike Price

1. **Choose Strike**
   - Dropdown shows available strikes
   - Select the strike you want
   - Price updates automatically

2. **Understanding Strikes:**
   - **ITM (In-the-Money):** Option has intrinsic value
   - **ATM (At-the-Money):** Strike = current stock price
   - **OTM (Out-of-the-Money):** No intrinsic value (cheaper)

#### Step 6: Enter Quantity

1. **Number of Contracts**
   - Enter how many contracts you want
   - Each contract = 100 shares
   - Minimum: 1 contract

2. **Cost Calculation:**
   - Total Cost = Price × Quantity × 100
   - Example: $5.00 premium × 2 contracts × 100 = $1,000

#### Step 7: Review Price

1. **Option Price**
   - Automatically fetched when all fields are filled
   - Shows current mid-price (average of bid/ask)
   - Use "Fetch Current Price" to refresh

2. **Price Details:**
   - **Bid:** What buyers are willing to pay
   - **Ask:** What sellers want
   - **Mid:** Average (what you'll likely pay)

#### Step 8: Review Trade Summary

**Before Executing, Check:**

- **Symbol:** Correct stock?
- **Action:** Buy or Sell?
- **Type:** Call or Put?
- **Expiration:** Correct date?
- **Strike:** Right strike price?
- **Quantity:** Correct number of contracts?
- **Price:** Current and fair?
- **Total Cost:** Can you afford it?
- **Balance After:** Will you have funds left?

#### Step 9: Execute Trade

1. **Click "Execute Trade" Button**
   - Button is at the bottom
   - Only enabled when all fields are valid

2. **Confirmation**
   - Review the confirmation dialog
   - Verify all details
   - Click "Confirm" to execute

3. **Success**
   - Trade is executed immediately
   - You'll see a success message
   - Position appears in Dashboard

### Understanding Trade Costs

**For Options:**
- **Price per Contract:** The premium (e.g., $5.00)
- **Contracts:** Number of contracts (e.g., 2)
- **Multiplier:** 100 (standard for options)
- **Total Cost:** $5.00 × 2 × 100 = $1,000

**For Stocks (if trading stocks):**
- **Price per Share:** Stock price
- **Shares:** Number of shares
- **Total Cost:** Price × Shares

### Trade Execution Details

**What Happens:**
1. System checks your balance
2. Verifies risk limits
3. Executes the trade
4. Creates a position (for buys)
5. Updates your balance
6. Records the trade in history

**Risk Checks:**
- Sufficient balance
- Daily loss limit not exceeded
- Position size within limits
- Maximum positions not exceeded

### Paper Trading Info

**Important Notice on Trade Page:**
- Reminds you this is paper trading
- Virtual money only
- No real financial risk
- Perfect for learning

### Tips for Trading

1. **Start Small:** Begin with 1-2 contracts
2. **Check Balance:** Ensure you have enough funds
3. **Verify Details:** Double-check all fields before executing
4. **Use Real Prices:** Always fetch current price
5. **Understand Costs:** Know what you're paying
6. **Set Limits:** Use stop losses and profit targets
7. **Track Performance:** Monitor your trades in Dashboard

---

## 🤖 Automations - Automated Trading Strategies

Automations let you create trading strategies that execute automatically based on your criteria.

### Understanding Automations

**What They Do:**
- Monitor stocks continuously
- Scan for trading opportunities
- Execute trades automatically
- Manage positions (take profits, stop losses)
- All based on your rules

**Benefits:**
- Trade 24/7 (during market hours)
- Never miss opportunities
- Remove emotion from trading
- Consistent execution
- Saves time

### Creating an Automation

#### Step 1: Access Automations Page

1. **Navigate to Automations**
   - Click "Automations" in navigation
   - Or go to `/automations`

2. **View Existing Automations**
   - See all your automations
   - Active vs. Inactive status
   - Performance metrics

#### Step 2: Click "Create Automation"

1. **Open Creation Modal**
   - Click purple "Create Automation" button
   - Modal form appears

2. **Fill in Basic Details:**

**Name:**
- Descriptive name (e.g., "AAPL Bullish Calls")
- Helps you identify the automation
- Required field

**Symbol:**
- Stock to monitor (e.g., AAPL, TSLA, NVDA)
- Must be a valid stock symbol
- Required field
- Cannot be changed after creation

**Description:**
- Optional notes about this automation
- Helps you remember the strategy

**Strategy Type:**
- **Covered Call:** Sell calls against stock you own
- **Cash Secured Put:** Sell puts with cash backing
- **Long Call:** Buy call options for upside
- **Long Put:** Buy put options for downside protection
- Required field

**Min Confidence:**
- Minimum signal confidence to execute (0.0 - 1.0)
- **Lower (0.3-0.5):** More trades, more aggressive
- **Higher (0.7-0.9):** Fewer trades, more conservative
- **Default:** 0.30 (moderate, good for testing)
- **For Testing:** Use 0.30 to make it easier to trigger
- Required field

**Profit Target %:**
- When to take profits
- Example: 50% = close position when up 50%
- Required field

**Stop Loss %:**
- When to cut losses
- Example: 25% = close position when down 25%
- Optional but recommended

**Max Days to Hold:**
- Maximum days to hold a position
- Example: 30 = close after 30 days regardless of P/L
- Optional

**Quantity:**
- Number of contracts to buy when automation executes
- Default: 1 contract
- Example: 3 = will buy 3 contracts each time
- **New Feature:** Specify how many contracts you want per trade

3. **Advanced Options (Click to Expand):**

**Expiration Date Controls (DTE):**

- **Preferred DTE:** Target days to expiration (default: 30)
  - The automation will prefer options with this DTE
  - Example: 30-45 days for covered calls
  
- **Min DTE:** Minimum days to expiration (default: 21)
  - Won't trade options with less than this many days
  - Prevents trading options too close to expiration
  
- **Max DTE:** Maximum days to expiration (default: 60)
  - Won't trade options with more than this many days
  - Can be increased to 1095 days (3 years) for LEAPS
  - For covered calls, 30-45 DTE is common

**Strike Price Controls (via Delta):**

- **Target Delta:** Ideal delta value (optional)
  - For covered calls, 0.30 delta (30% OTM) is common
  - Leave blank to let system choose
  
- **Min Delta:** Minimum delta (optional)
  - Example: 0.20 = won't trade options with delta < 0.20
  - Helps filter out deep OTM options
  
- **Max Delta:** Maximum delta (optional)
  - Example: 0.40 = won't trade options with delta > 0.40
  - Helps filter out deep ITM options

**💡 Tip:** For covered calls, use:
- Preferred DTE: 30-45 days
- Target Delta: 0.30
- Min Delta: 0.20
- Max Delta: 0.40

#### Step 3: Create Automation

1. **Click "Create" Button**
   - Automation is created
   - Appears in your automations list
   - Starts as "Inactive"

2. **Activate Automation**
   - Toggle the switch to "Active"
   - Automation will start scanning

### Starting the Automation Engine

**Important:** Automations only work when the engine is running.

1. **Check Engine Status**
   - Top of Automations page
   - Shows "Running" or "Stopped"

2. **Start Engine**
   - Click "Start Engine" button
   - Engine begins scanning
   - Status changes to "Running"

3. **Engine Activity**
   - Scans every cycle (configurable)
   - Checks all active automations
   - Executes trades when conditions met

### How Automations Work

**The Process:**

1. **Scanning Phase**
   - Engine checks each active automation
   - Fetches current market data
   - Analyzes technical indicators

2. **Signal Detection**
   - Looks for buy/sell signals
   - Calculates confidence score
   - Compares to min_confidence

3. **Risk Check**
   - Verifies sufficient balance
   - Checks position size limits
   - Validates daily loss limits

4. **Execution**
   - If all conditions met, executes trade
   - Creates position (for buys)
   - Records trade in history

5. **Monitoring**
   - Tracks open positions
   - Monitors profit targets
   - Watches stop losses

6. **Exit Signals**
   - Closes position when profit target hit
   - Closes position when stop loss hit
   - Manages positions automatically

### Automation Diagnostics

**New Feature:** The Automations page now includes a Diagnostics panel!

**Accessing Diagnostics:**
- Located at the top of the Automations page
- Shows detailed information about why automations are or aren't executing
- Updates automatically when you load the page

**What Diagnostics Shows:**

For each active automation, you'll see:
- **Automation Name & Symbol:** Which automation is being checked
- **Strategy Type:** What type of strategy it is
- **Quantity:** How many contracts it will buy (new feature!)
- **Is Ready to Trade:** ✅ Yes or ❌ No indicator
- **Blocking Reasons:** Specific reasons why trades aren't executing:
  - Already have open position (if not allowing multiple positions)
  - Max open positions reached
  - Signal confidence too low (below minimum required)
  - Signal not recommended
  - No suitable options found (check DTE, delta, volume, open interest, spread)
- **Signal Info:** Current signal confidence, direction, action
- **Options Info:** Whether suitable options were found (contract type, strike, expiration, DTE)
- **Risk Info:** Risk management status

**How to Use Diagnostics:**
1. Check the Diagnostics panel at the top of the page
2. Look for automations marked "❌ Is Ready to Trade: No"
3. Review the "Blocking Reasons" to understand what's preventing trades
4. Adjust automation settings based on the feedback:
   - Lower min_confidence if confidence is too low
   - Close existing position or enable "allow multiple positions"
   - Adjust DTE settings if no suitable options found
   - Check volume and open interest requirements
5. Click "Run Cycle Now" to test changes and see updated diagnostics

**Example Blocking Reasons:**
- "Signal confidence (0.45) below minimum required (0.70)" → Lower min_confidence to 0.30-0.40
- "Already have open position in AAPL (ID: 123)" → Close position or enable multiple positions
- "Max open positions reached (5/5)" → Close some positions
- "No suitable options found (check DTE, delta, volume, open interest, spread)" → Adjust DTE settings or relax filters

### Testing Your Automation

#### Test Trade Button

**Feature:** Each automation now has a "🧪 Test Trade" button!

**What It Does:**
- Forces a test trade execution for that automation
- Uses the quantity you specified (new feature!)
- Bypasses some checks (confidence threshold, strict filters) for testing
- Shows you exactly what trade would be executed
- Perfect for understanding how your automation works

**How to Use:**
1. Find your automation in the list
2. Click the green "🧪 Test Trade" button
3. Confirm the dialog
4. Wait for execution (you'll see a loading spinner)
5. Check the success message showing what was traded
6. View the position on your Dashboard

**When to Use:**
- Testing a new automation
- Understanding why trades aren't executing
- Verifying automation settings
- Learning how the system selects options

**Note:** Test trades are real trades (in paper trading mode). They will:
- Create actual positions
- Deduct from your paper balance
- Appear in your trade history
- Be managed by the automation

### Managing Automations

#### Editing an Automation

1. **Click "Edit" Button**
   - On the automation card (yellow button)
   - Opens edit modal

2. **Modify Settings**
   - Can change all settings except symbol
   - Symbol is locked (create new automation to change)
   - Can update DTE and delta controls
   - Can adjust confidence, profit targets, stop losses

3. **Save Changes**
   - Click "Update"
   - Changes take effect immediately

#### Toggling Active/Inactive

1. **Toggle Switch**
   - On each automation card
   - Green = Active (scanning)
   - Gray = Inactive (paused)

2. **When to Pause:**
   - Market closed
   - Testing different settings
   - Taking a break

#### Deleting an Automation

1. **Click Delete Button**
   - On the automation card
   - Confirm deletion

2. **What Happens:**
   - Automation is removed
   - Open positions remain
   - Trade history preserved

### Viewing Automation Activity

**Recent Activity Section:**
- Shows recent trades from automations (last 24 hours)
- Displays:
  - Trade details (symbol, strike, expiration, price)
  - Position status (created/closed)
  - P/L information (unrealized for open, realized for closed)
  - Link to view position on Dashboard
- Updates automatically every 30 seconds

**Automation Engine Status:**
- **Status:** Running or Stopped
- **Cycles Completed:** Number of scan cycles run
- **Market Status:** Open, Pre-Market, After-Hours, or Closed
- **Last Cycle:** When the last scan ran

**Run Cycle Now Button:**
- Manually trigger a scan without waiting
- Useful for testing
- Shows detailed diagnostics:
  - How many automations were scanned
  - Why trades aren't executing (if any)
  - Signal confidence vs. minimum required
  - Whether options were found
  - Specific blocking reasons

**Diagnostics Information:**
When you click "Run Cycle Now", you'll see:
- ✅ **Ready to trade:** Signal confidence meets threshold and options found
- ⚠️ **Blocking reasons:** Why trades aren't executing:
  - Signal confidence too low
  - Already have open position
  - Max positions reached
  - No suitable options found (check volume, open interest, spread, DTE)
  - Signal not recommended

**Automation Details:**
- Execution count (how many trades made)
- Last executed time
- Status (Active/Paused/Inactive)

### Automation Best Practices

1. **Start Conservative:**
   - Higher min_confidence (0.7+)
   - Smaller position sizes
   - Tighter stop losses

2. **Test First:**
   - Run in paper trading
   - Monitor for a few days
   - Adjust based on results

3. **Diversify:**
   - Don't put all capital in one automation
   - Spread across multiple stocks
   - Different strategies

4. **Monitor Regularly:**
   - Check automation activity
   - Review executed trades
   - Adjust settings as needed

5. **Set Appropriate Limits:**
   - Realistic profit targets
   - Protective stop losses
   - Reasonable position sizes

6. **Understand the Strategy:**
   - Know what signals trigger trades
   - Understand the risk
   - Match to your risk tolerance

### Automation Settings Explained

**Min Confidence:**
- **0.3-0.4:** Very aggressive, many trades
- **0.5-0.6:** Moderate, balanced approach
- **0.7-0.8:** Conservative, high-quality trades only
- **0.9+:** Very conservative, rare executions

**Profit Target:**
- **10-15%:** Quick profits, more trades
- **20-30%:** Balanced approach
- **40%+:** Let winners run, fewer exits

**Stop Loss:**
- **5-10%:** Tight stops, protect capital
- **15-20%:** Moderate, allow for volatility
- **25%+:** Wide stops, more room

**Max Position Size:**
- **1-2%:** Very conservative
- **3-5%:** Moderate risk
- **10%+:** Aggressive (not recommended)

---

## 🔔 Alerts - Stay Informed

Alerts keep you informed about market opportunities, position changes, and important events.

### Types of Alerts

1. **Buy Signal**
   - Strong buying opportunity detected
   - Based on technical analysis
   - AI-generated explanation

2. **Sell Signal**
   - Time to exit a position
   - Profit target or stop loss hit
   - Risk management alert

3. **Risk Alert**
   - Approaching risk limits
   - Daily loss limit warning
   - Position size warnings

4. **Trade Executed**
   - Automation executed a trade
   - Manual trade confirmation
   - Position created/closed

### Viewing Alerts

**Alerts Page:**
- All alerts in one place
- Unread alerts highlighted
- Sorted by priority and date
- Color-coded by priority (red=critical, orange=high, yellow=medium, blue=low)

**Alert Information:**
- **Type:** What kind of alert (buy signal, sell signal, risk alert, trade executed)
- **Priority:** Critical, High, Medium, or Low
- **Symbol:** Stock involved
- **Title:** Brief summary (AI-generated)
- **Message:** Detailed information (AI-generated)
- **Explanation:** Why this alert was generated (AI-generated)
- **Confidence:** Signal confidence percentage
- **Signal Strength:** High, Medium, or Low
- **Timestamp:** When it was created

**Technical Indicators Section:**
- **New Feature:** Each alert now shows the technical indicators that triggered it
- **RSI:** Relative Strength Index value (color-coded: green=oversold/bullish, red=overbought/bearish)
- **MACD Histogram:** Positive (green) = bullish, Negative (red) = bearish
- **SMA20, SMA50, SMA200:** Moving average values
- **Volume Ratio:** Current volume vs. average
- **Price Change:** 24-hour price change percentage

**Signals Triggered Section:**
- Lists all technical signals that met your criteria
- Shows signal name, description, confidence, and strength
- Example: "Golden Cross: Price above all moving averages (75% confidence, high strength)"

### Managing Alerts

**Mark as Read:**
- Click on an alert to mark as read
- Removes highlight
- Keeps in history

**Mark All Read:**
- Button at top of page
- Marks all alerts as read at once
- Useful for clearing the list

**Filtering:**
- Filter by type
- Filter by priority
- Filter by symbol

### Quick Actions from Alerts

**View Position:**
- If alert is about a position
- Click to see position details
- Navigate to Dashboard

**View Automation:**
- If alert is from automation
- Click to see automation settings
- Navigate to Automations page

**Trade:**
- If alert suggests a trade
- Click to go to Trade page
- Pre-fill trade details

### Alert Generation

**Automatic:**
- System generates alerts automatically
- Based on market conditions
- Based on your positions
- Based on automations

**Manual:**
- Click "Generate Alerts" button
- Manually trigger alert scanning
- Useful for immediate updates
- Shows progress with loading indicator
- Displays results: "Generated X alerts: Y buy signals, Z sell signals, W risk alerts"

### Customizing Alert Filters

**New Feature:** You can now customize how alerts are generated!

**Access:**
- Click "Configure Filters" button on Alerts page
- Opens a modal with all filter options

**What You Can Customize:**

**General Settings:**
- **Enable Custom Filters:** Toggle to use your custom settings vs. platform defaults
- **Minimum Confidence:** Minimum confidence % for signals (default: 60%)
- **Minimum Signals Required:** How many technical signals must agree (default: 1)

**RSI (Relative Strength Index) Filters:**
- **Enable RSI:** Toggle RSI-based signals on/off
- **Oversold Threshold:** RSI below this is bullish (default: 30)
- **Overbought Threshold:** RSI above this is bearish (default: 70)

**Moving Averages (SMA) Filters:**
- **Enable MA:** Toggle moving average signals on/off
- **Require Golden Cross:** All SMAs aligned bullish (SMA20 > SMA50 > SMA200)
- **Require Death Cross:** All SMAs aligned bearish (SMA20 < SMA50 < SMA200)

**MACD Filters:**
- **Enable MACD:** Toggle MACD signals on/off
- **Require MACD Bullish:** MACD line above signal, positive histogram
- **Require MACD Bearish:** MACD line below signal, negative histogram

**Volume Filters:**
- **Enable Volume:** Toggle volume-based signals on/off
- **Minimum Volume Ratio:** Current volume vs. average (default: 1.0x)
- **Require Volume Confirmation:** Only generate if volume confirms price move

**Signal Requirements:**
- **Require All Signals Bullish:** All signals must be bullish
- **Require All Signals Bearish:** All signals must be bearish

**How to Use:**
1. Click "Configure Filters"
2. Toggle "Enable Custom Filters" to ON
3. Adjust thresholds and requirements
4. Click "Save Filters"
5. Click "Generate Alerts" to use your custom settings
6. Click "Reset to Defaults" to revert to platform defaults

**Info Box:**
- Shows whether you're using "Platform Defaults" or "Custom Filters"
- Helps you understand what settings are active

### Understanding Alert Priorities

**High Priority:**
- Critical actions needed
- Risk alerts
- Important trade signals

**Medium Priority:**
- Informational
- Trade confirmations
- Market updates

**Low Priority:**
- General information
- Non-urgent updates

### Best Practices

1. **Check Regularly:** Review alerts daily
2. **Act on High Priority:** Don't ignore critical alerts
3. **Use Quick Actions:** Take advantage of links
4. **Keep Clean:** Mark read alerts to stay organized
5. **Understand Context:** Read explanations to learn

---

## 📜 History - Review Your Trades

The History page shows all your past trades for analysis and record-keeping.

### Accessing History

**Ways to Access:**
1. Click "History" in navigation menu
2. From Dashboard → Click "View All Trades"
3. Direct URL: `/history`

### Viewing Trade History

**Table Shows:**
- **Date:** When trade was executed
- **Symbol:** Stock ticker
- **Action:** BUY or SELL
- **Type:** CALL, PUT, or STOCK
- **Quantity:** Number of contracts/shares
- **Price:** Execution price
- **P/L:** Realized profit/loss
- **Source:** Manual or Automation

### Filtering Trades

**Quick Filters:**
- **Today:** Trades from today
- **This Week:** Trades from this week
- **This Month:** Trades from this month
- **This Year:** Trades from this year

**Advanced Filtering:**
- Filter by symbol
- Filter by date range
- Filter by source (manual/automation)
- Filter by profit/loss

### Trade Details

**Click to Expand:**
- Full trade information
- Greeks at execution
- P/L breakdown
- Commission (if any)
- Notes
- Related position (if applicable)

### Understanding Your History

**Key Metrics:**
- **Total Trades:** Number of completed trades
- **Winning Trades:** Number of profitable trades
- **Losing Trades:** Number of losing trades
- **Win Rate:** Percentage of winning trades
- **Average Return:** Average profit/loss per trade
- **Total P/L:** Cumulative profit/loss

### Exporting History

**Future Feature:**
- Export to CSV
- Export to PDF
- Tax reporting format

### Best Practices

1. **Review Regularly:** Learn from your trades
2. **Identify Patterns:** What works, what doesn't
3. **Track Performance:** Monitor win rate and returns
4. **Keep Records:** Important for taxes and analysis

---

## ⚙️ Settings - Customize Your Experience

The Settings page lets you customize your account and trading preferences.

### Accessing Settings

**Ways to Access:**
1. Click "Settings" in navigation menu
2. Click your profile/username
3. Direct URL: `/settings`

### Account Settings

**Default Strategy:**
- **Income:** Premium collection focus
- **Growth:** Capital appreciation focus
- **Balanced:** Mix of both
- Affects default recommendations

**Risk Tolerance:**
- **Low:** Conservative approach
- **Moderate:** Balanced approach
- **High:** Aggressive approach
- Affects risk limits and recommendations

**Trading Mode:**
- **Paper:** Virtual money (default)
- **Live:** Real money (when available)
- Switch when ready for live trading

**Notifications:**
- Enable/disable email notifications
- Control alert frequency

### Risk Limits Section

**Customize Your Risk Management:**

**Max Daily Loss %:**
- Maximum loss per day as percentage
- Default: 50% for paper trading
- Example: 10% = max $10,000 loss per day (on $100k)

**Max Position Size %:**
- Maximum % of balance per position
- Default: 10%
- Example: 5% = max $5,000 per position

**Max Open Positions:**
- Maximum number of simultaneous positions
- Default: 10
- Prevents over-diversification

**Max Capital at Risk %:**
- Maximum % of capital at risk total
- Default: 50%
- Protects your account

**How to Adjust:**
1. Expand "Risk Limits" section
2. Modify values
3. Click "Save" or "Update"
4. Changes take effect immediately

### Paper Trading Section

**Reset Paper Balance:**
- Button to reset to $100,000
- Useful for starting fresh
- Clears all positions and trades
- **Warning:** This action cannot be undone

**Current Balance:**
- Shows your current paper balance
- Updates in real-time

### Profile Settings

**Update Email:**
- Change your email address
- Used for notifications
- Used for account recovery

**Change Password:**
- Update your password
- Requires current password
- Use strong passwords

### Best Practices for Settings

1. **Match Risk Tolerance:** Set limits that match your comfort level
2. **Start Conservative:** Begin with tighter limits
3. **Adjust Over Time:** Modify as you gain experience
4. **Review Regularly:** Check settings periodically
5. **Understand Impact:** Know how each setting affects trading

---

## 📚 Understanding Options Trading

### What Are Options?

**Definition:**
Options are contracts that give you the right (but not obligation) to buy or sell a stock at a specific price by a specific date.

**Key Concepts:**
- **Call Option:** Right to BUY stock
- **Put Option:** Right to SELL stock
- **Strike Price:** Price at which you can exercise
- **Expiration Date:** When the option expires
- **Premium:** Price you pay for the option

### The Greeks Explained

**Delta:**
- Measures price sensitivity
- Range: -1.0 to +1.0
- Example: Delta 0.50 = option moves $0.50 for every $1 stock move

**Gamma:**
- Measures how delta changes
- Higher gamma = delta changes faster
- Important for position management

**Theta:**
- Measures time decay
- Negative value (you lose money over time)
- Higher near expiration
- Example: Theta -0.50 = lose $0.50 per day

**Vega:**
- Measures volatility sensitivity
- Higher vega = more sensitive to IV changes
- Important for volatility trading

**Implied Volatility (IV):**
- Market's expectation of volatility
- Higher IV = more expensive options
- Lower IV = cheaper options

### Option Strategies

**Buying Calls:**
- Bullish strategy
- Profit when stock goes up
- Limited risk (premium paid)
- Unlimited profit potential

**Buying Puts:**
- Bearish strategy
- Profit when stock goes down
- Limited risk (premium paid)
- Profit limited by stock going to zero

**Selling Calls:**
- Bearish/neutral strategy
- Collect premium
- Limited profit (premium)
- Unlimited risk (if uncovered)

**Selling Puts:**
- Bullish strategy
- Collect premium
- Limited profit (premium)
- Risk = strike price - premium

### Key Terms

**In-the-Money (ITM):**
- Call: Stock price > Strike price
- Put: Stock price < Strike price
- Has intrinsic value

**At-the-Money (ATM):**
- Stock price = Strike price
- No intrinsic value
- Only time value

**Out-of-the-Money (OTM):**
- Call: Stock price < Strike price
- Put: Stock price > Strike price
- No intrinsic value
- Cheaper premiums

**Intrinsic Value:**
- Real value of option
- ITM options have intrinsic value
- OTM options have zero intrinsic value

**Time Value:**
- Premium above intrinsic value
- Decays over time (theta)
- Higher with more time to expiration

---

## 🚀 Advanced Features

### Performance Tracking

**Dashboard Metrics:**
- Real-time P/L tracking
- Win rate calculation
- Performance trends
- Position analysis

### AI-Powered Analysis

**Options Analyzer:**
- AI explains complex concepts
- Personalized recommendations
- Risk assessment
- Trade analysis

### Automated Trading

**Automations:**
- Set-and-forget strategies
- 24/7 monitoring
- Automatic execution
- Position management

### Risk Management

**Built-in Protection:**
- Daily loss limits
- Position size limits
- Capital at risk limits
- Automatic stop losses

---

## 🆘 Troubleshooting

### Common Issues and Solutions

#### Can't Login

**Problem:** Unable to log in

**Solutions:**
1. Check username and password
2. Clear browser cache and cookies
3. Try different browser
4. Check if account exists
5. Use "Forgot Password" if available
6. Contact support

#### Trades Not Executing

**Problem:** Trade button doesn't work or trade fails

**Solutions:**
1. Check your balance (sufficient funds?)
2. Verify risk limits (not exceeded?)
3. Check all fields are filled
4. Verify price is valid
5. Check market hours
6. Review error message

#### Prices Not Updating

**Problem:** Prices show old data

**Solutions:**
1. Refresh the page
2. Click "Fetch Current Price"
3. Check internet connection
4. Wait a moment (prices update periodically)

#### Automation Not Working

**Problem:** Automation not executing trades

**Solutions:**
1. **Check Engine Status:**
   - Make sure "Start Engine" button shows "Running"
   - If stopped, click "Start Engine"

2. **Verify Automation is Active:**
   - Check automation status is "Active" (green badge)
   - If paused, click "Resume"

3. **Use Test Trade Button:**
   - Click "🧪 Test Trade" to force a test execution
   - This helps identify what's blocking trades
   - Shows detailed error messages

4. **Check Diagnostics:**
   - Click "Run Cycle Now" to see detailed diagnostics
   - Look for blocking reasons:
     - Signal confidence too low → Lower min_confidence (try 0.30)
     - Already have position → Close existing position or enable "allow multiple positions"
     - Max positions reached → Close some positions
     - No suitable options → Check volume, open interest, spread, DTE settings

5. **Verify Settings:**
   - Lower min_confidence if too high (try 0.30 for testing)
   - Check DTE settings (min_dte, max_dte) match available expirations
   - Verify sufficient balance
   - Check risk limits in Settings

6. **Check Market Hours:**
   - Automations work during market hours
   - Use "Run Cycle Now" to test anytime

#### Performance Chart Empty

**Problem:** Chart shows "No data"

**Solutions:**
- Chart only shows after closing positions
- Close some positions to see trend
- This is normal if you haven't closed trades yet

#### CORS Errors

**Problem:** Browser shows CORS errors

**Solutions:**
1. Check backend is running
2. Verify CORS configuration
3. Check frontend API URL
4. Contact support if persists

---

## ❓ FAQ

### General Questions

**Q: Is this real money trading?**  
A: No, by default it's paper trading with virtual money. You can switch to live trading in Settings when ready.

**Q: How much virtual money do I start with?**  
A: $100,000 in paper trading mode.

**Q: Can I reset my paper balance?**  
A: Yes, in Settings → Paper Trading section → "Reset Paper Balance" button.

**Q: Is my data saved?**  
A: Yes, all your trades, positions, and settings are saved to your account.

### Trading Questions

**Q: What's the minimum trade size?**  
A: 1 contract for options, 1 share for stocks.

**Q: Can I trade stocks, not just options?**  
A: Currently focused on options, but stock trading may be available.

**Q: How are prices determined?**  
A: Real-time market data from Yahoo Finance and Tradier API.

**Q: Are there commissions?**  
A: In paper trading, commissions are simulated. Check Settings for commission rates.

### Automation Questions

**Q: How often do automations check for opportunities?**  
A: Configurable, typically every few minutes during market hours.

**Q: Can I have multiple automations?**  
A: Yes, you can create multiple automations for different stocks/strategies.

**Q: Do automations work when I'm not logged in?**  
A: Yes, as long as the automation engine is running.

**Q: Can I edit an automation after creating it?**  
A: Yes, click "Edit" on any automation to modify settings. You can change everything except the symbol.

**Q: How do I test if my automation will work?**  
A: Use the "🧪 Test Trade" button on any automation. This forces a test execution so you can see what trade would be made.

**Q: Why isn't my automation executing trades?**  
A: Click "Run Cycle Now" to see detailed diagnostics. Common reasons: signal confidence too low (lower min_confidence to 0.30), already have a position, or no suitable options found.

**Q: Can I control which expiration dates and strike prices my automation uses?**  
A: Yes! Click "⚙️ Advanced Options" when creating/editing an automation. You can set preferred DTE, min/max DTE, and target delta ranges.

### Technical Questions

**Q: What browsers are supported?**  
A: Modern browsers (Chrome, Firefox, Safari, Edge) - latest versions recommended.

**Q: Do I need to install anything?**  
A: No, it's a web application. Just need a browser and internet connection.

**Q: Is my data secure?**  
A: Yes, we use industry-standard security practices. Passwords are encrypted.

**Q: Can I use this on mobile?**  
A: The interface is responsive and works on tablets. Mobile optimization coming soon.

---

## 📞 Support

### Getting Help

- **User Manual:** This document
- **Dashboard:** Check for error messages
- **Support Email:** [Your support email]
- **Feedback:** Share your thoughts and issues

### Reporting Issues

When reporting problems, include:
- What you were doing
- What happened (error message)
- What you expected
- Screenshots (if possible)
- Browser and OS information

---

## 🎓 Learning Resources

### Built-in Learning

- **AI Explanations:** Read the analysis in Options Analyzer
- **Greeks Tooltips:** Hover over Greek values for explanations
- **Paper Trading:** Practice risk-free

### External Resources

- Options trading courses
- Options Greeks tutorials
- Risk management guides
- Market analysis resources

---

**Happy Trading! 🚀**

*Remember: This is a beta version. We appreciate your feedback and patience as we improve the platform.*

---

---

## 📝 Recent Updates (Version 1.2)

### New Features Added:

1. **🎯 Unified Opportunities Page**
   - Combined Discover, Market Movers, and AI Recommendations into one page
   - Three tabs: Signals, Market Movers, and For You
   - Fast, optimized loading (no more timeouts!)
   - Single entry point for all trading opportunities

2. **⚡ Optimized Performance**
   - All opportunity tabs now use fast quote-based scoring
   - No slow technical analysis or IV rank calculations
   - Loads in seconds instead of minutes
   - Uses curated list of 10 high-volume symbols for consistency

3. **📊 Automation Diagnostics Panel**
   - New diagnostics panel at top of Automations page
   - Shows exactly why automations aren't executing
   - Lists specific blocking reasons (signal confidence, positions, options, etc.)
   - Real-time feedback on automation readiness

4. **🔢 Quantity Field for Automations**
   - Specify how many contracts to buy per automation execution
   - Default: 1 contract (can increase for larger positions)
   - Applies to Test Trade and regular automation execution

5. **🔧 Simplified Navigation**
   - Single "Opportunities" link replaces three separate pages
   - Cleaner Discovery section in navigation
   - Direct tab navigation via URL parameters

6. **🚀 Faster Signal Generation**
   - Signals tab uses fast price-movement-based scoring
   - Quick Scan feature for instant opportunity discovery
   - Prioritizes user watchlist, falls back to curated symbols

### Improvements:

- **Speed:** All opportunity pages load in seconds instead of timing out
- **Consistency:** All tabs use the same fast, optimized approach
- **User Experience:** Unified interface is easier to navigate
- **Diagnostics:** Better visibility into why automations don't execute
- **Flexibility:** More control over automation quantity and execution

---

## 📝 Previous Updates (Version 1.1)

### Features Added:

1. **🧪 Test Trade Button**
   - Force test trade execution for any automation
   - Bypasses some checks for testing purposes
   - Shows exactly what trade would be executed

2. **⚙️ Advanced Automation Controls**
   - Expiration Date Controls (DTE): Set preferred, min, and max days to expiration
   - Strike Price Controls (Delta): Set target, min, and max delta values

3. **🔔 Custom Alert Filters**
   - Configure how alerts are generated
   - Customize RSI, MACD, Moving Average, and Volume thresholds

4. **📊 Enhanced Alert Display**
   - Technical Indicators section
   - Signals Triggered section
   - Color-coded indicator values

5. **🔍 Automation Diagnostics**
   - Detailed diagnostics when running cycles
   - Shows why trades aren't executing

6. **📈 LEAPS Support**
   - Increased max DTE to 1095 days (3 years)

---

**Version:** 1.2 Beta  
**Last Updated:** January 2025  
**For:** IAB OptionsBot Beta Testers  
**Live URL:** [Your Railway Deployment URL]

