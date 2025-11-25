# IAB OptionsBot - Beta User Manual

Welcome to IAB OptionsBot! This guide will help you get started and make the most of the platform.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Options Analyzer](#options-analyzer)
4. [Watchlist](#watchlist)
5. [Trading](#trading)
6. [Automations](#automations)
7. [Alerts](#alerts)
8. [Settings](#settings)
9. [Tips & Best Practices](#tips--best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Creating Your Account

1. **Navigate to the registration page**
2. **Fill in your details:**
   - Username (choose a unique username)
   - Email address
   - Password (use a strong password)
3. **Click "Register"**
4. You'll be automatically logged in

### First Login

If you already have an account:
1. Enter your username and password
2. Click "Login"
3. You'll be taken to your Dashboard

### Paper Trading Mode

**Important:** IAB OptionsBot uses **paper trading** by default. This means:
- ✅ You're trading with virtual money ($100,000 starting balance)
- ✅ No real money is at risk
- ✅ Perfect for learning and testing strategies
- ✅ All trades are simulated

---

## 📊 Dashboard Overview

The Dashboard is your command center. Here's what you'll see:

### Account Balance Card
- **Paper Trading Balance:** Your virtual account balance
- Starts at $100,000
- Updates in real-time as you trade

### Performance Stats
- **Total Positions:** Number of open positions
- **Unrealized P/L:** Profit/Loss on open positions
- **Realized P/L (30d):** Profit/Loss from closed trades
- **Win Rate:** Percentage of winning trades

### Performance Trend Chart
- Visual representation of your cumulative P/L over time
- Shows your trading performance at a glance

### Active Positions
- All your currently open positions
- Shows:
  - Symbol and strike price
  - Entry price vs. current price
  - Unrealized P/L
  - Days to expiration
  - **Details button:** Click for full position information

### Recent Trades
- Your last 10 trades
- Shows execution details and realized P/L
- **Details button:** Click for full trade information

---

## 🔍 Options Analyzer

The Options Analyzer helps you find the best options trades using AI-powered analysis.

### How to Use

1. **Enter a Stock Symbol**
   - Type a symbol (e.g., AAPL, TSLA, SPY)
   - Press Enter or click outside the field

2. **Select Expiration Date**
   - Choose from available expiration dates
   - Options are sorted by date

3. **Choose Strategy Preference**
   - **Income:** Focus on premium collection (shorter DTE)
   - **Balanced:** Mix of income and growth
   - **Growth:** Longer-term positions (longer DTE)

4. **Click "Analyze Options"**
   - The system will analyze all available options
   - Results are sorted by score (best first)

### Understanding the Results

Each option shows:

- **Score (0-1.0):** Overall quality score
- **Category:** 
  - 🟢 **Excellent:** Score > 0.8
  - 🟡 **Good:** Score 0.6-0.8
  - 🟠 **Fair:** Score 0.4-0.6
  - 🔴 **Poor:** Score < 0.4

- **AI Analysis:** 
  - **Greeks Explained:** Plain English explanation of Delta, Gamma, Theta, Vega, and IV
  - **Trade Analysis:** Best case, worst case, break-even, profit potential
  - **Risk Assessment:** Overall risk level and warnings
  - **Recommendation:** Buy/Consider/Avoid with reasoning

### Quick Actions

- **Trade:** Click to execute this option trade
- **Add to Watchlist:** Add the underlying stock to your watchlist

---

## 📈 Watchlist

Track stocks you're interested in trading.

### Adding Stocks

1. **From Options Analyzer:**
   - Click "Add to Watchlist" button

2. **From Watchlist Page:**
   - Click "Add Stock" button
   - Enter symbol
   - Add tags (optional)
   - Add notes (optional)
   - Click "Add"

### Managing Your Watchlist

- **View Prices:** Real-time prices and changes
- **Quick Actions:**
  - **Analyze:** Jump to Options Analyzer for this stock
  - **Trade:** Go directly to Trade page
  - **Notes:** Edit your notes for the stock
- **Filter:** Search by symbol or tag
- **Sort:** By symbol, price, or change

### Price Indicators

- **Green arrow (↑):** Price is up
- **Red arrow (↓):** Price is down
- **Percentage:** Shows % change

---

## 💼 Trading

Execute options trades manually.

### Placing a Trade

1. **Navigate to Trade Page**
   - From Dashboard → "Start Trading"
   - From Options Analyzer → "Trade" button
   - From Watchlist → "Trade" button

2. **Select Trade Details**
   - **Symbol:** Stock symbol
   - **Action:** Buy or Sell
   - **Contract Type:** Call or Put
   - **Expiration Date:** Select from available dates
   - **Strike Price:** Enter strike price
   - **Quantity:** Number of contracts

3. **Price**
   - **Auto-fetch:** Price is fetched automatically when you select all details
   - **Manual:** Click "Fetch Current Price" to refresh
   - **Enter manually:** If needed

4. **Review**
   - Check the cost calculation
   - Verify your balance after trade
   - Review all details

5. **Execute**
   - Click "Execute Trade"
   - Confirm the trade
   - Trade will be executed immediately

### Understanding Trade Costs

- **Price per Contract:** The option premium
- **Total Cost:** Price × Quantity × 100 (for options)
- **Balance After:** Your remaining balance after the trade

### Trade Types

- **Buy (Long):** You're buying the option (bullish)
- **Sell (Short):** You're selling the option (bearish)

---

## 🤖 Automations

Create automated trading strategies that execute trades based on your criteria.

### Creating an Automation

1. **Go to Automations Page**
2. **Click "Create Automation"**
3. **Fill in Details:**
   - **Name:** Descriptive name (e.g., "AAPL Bullish Calls")
   - **Symbol:** Stock to monitor
   - **Strategy:** Income, Growth, or Balanced
   - **Min Confidence:** Minimum signal confidence (0.0-1.0)
     - Lower = more trades (more aggressive)
     - Higher = fewer trades (more conservative)
   - **Profit Target %:** When to take profits
   - **Stop Loss %:** When to cut losses
   - **Max Position Size %:** Maximum % of balance per trade

4. **Click "Create"**
5. **Start the Automation Engine:**
   - Click "Start Engine" button
   - Engine will scan for opportunities every cycle

### How Automations Work

1. **Engine Scans:** Checks all active automations
2. **Signal Detection:** Looks for trading signals based on:
   - Technical indicators (RSI, MACD, moving averages)
   - Options Greeks
   - Market conditions
3. **Confidence Check:** Only executes if confidence ≥ min_confidence
4. **Risk Check:** Verifies position size and risk limits
5. **Trade Execution:** Executes trade if all conditions met
6. **Position Monitoring:** Tracks open positions
7. **Exit Signals:** Closes positions when profit target or stop loss hit

### Managing Automations

- **Edit:** Click "Edit" to modify settings
- **Toggle Active:** Enable/disable automation
- **Delete:** Remove automation
- **View Activity:** See recent trades from this automation

### Automation Status

- **Active:** Automation is running and scanning
- **Inactive:** Automation is paused
- **Engine Status:** Shows if the automation engine is running

---

## 🔔 Alerts

Stay informed about market opportunities and your positions.

### Alert Types

- **Buy Signal:** Strong buying opportunity detected
- **Sell Signal:** Time to exit a position
- **Risk Alert:** Risk limit approaching
- **Trade Executed:** Automation executed a trade

### Viewing Alerts

1. **Go to Alerts Page**
2. **View All Alerts:**
   - Unread alerts are highlighted
   - Click to expand details
3. **Quick Actions:**
   - **View Position:** See position details
   - **View Automation:** Check automation settings
   - **Trade:** Execute a trade

### Managing Alerts

- **Mark as Read:** Click to mark individual alerts
- **Mark All Read:** Button to clear all alerts
- **Generate Alerts:** Manually trigger alert scanning

### Alert Details

Each alert includes:
- **Type:** What kind of alert
- **Priority:** High, Medium, or Low
- **Symbol:** Stock involved
- **Message:** What happened
- **Explanation:** Why this alert was generated
- **Timestamp:** When it was created

---

## ⚙️ Settings

Customize your trading experience.

### Account Settings

- **Default Strategy:** Your preferred trading strategy
- **Risk Tolerance:** Low, Moderate, or High
- **Trading Mode:** Paper (default) or Live (when available)
- **Notifications:** Enable/disable email notifications

### Risk Limits

Customize your risk management:

- **Max Daily Loss %:** Maximum loss per day (default: 50% for paper)
- **Max Position Size %:** Maximum % of balance per position
- **Max Open Positions:** Maximum number of simultaneous positions
- **Max Capital at Risk %:** Maximum % of capital at risk

### Paper Trading

- **Reset Paper Balance:** Reset to $100,000 starting balance
- **Current Balance:** View your current paper balance

### Profile

- Update your email
- Change password
- Update preferences

---

## 💡 Tips & Best Practices

### For Beginners

1. **Start Small:** Begin with small position sizes
2. **Use Paper Trading:** Practice with virtual money first
3. **Learn the Greeks:** Understand Delta, Gamma, Theta, Vega
4. **Read AI Analysis:** The AI explanations are very helpful
5. **Set Stop Losses:** Always protect your capital

### For Experienced Traders

1. **Use Automations:** Let the system work for you
2. **Customize Risk Limits:** Adjust to your risk tolerance
3. **Monitor Alerts:** Stay on top of opportunities
4. **Review Performance:** Use Dashboard to track results
5. **Test Strategies:** Try different approaches in paper mode

### Risk Management

- ✅ Always set stop losses
- ✅ Don't risk more than you can afford to lose
- ✅ Diversify your positions
- ✅ Monitor your positions regularly
- ✅ Use position sizing appropriately

### Understanding Options

- **Calls:** Profit when stock goes up
- **Puts:** Profit when stock goes down
- **In-the-Money (ITM):** Option has intrinsic value
- **Out-of-the-Money (OTM):** Option has no intrinsic value
- **Time Decay (Theta):** Options lose value over time
- **Volatility (Vega):** Higher volatility = higher premiums

---

## 🆘 Troubleshooting

### Can't Login

1. **Check Credentials:** Verify username and password
2. **Clear Browser Cache:** Clear cookies and cache
3. **Try Different Browser:** Sometimes browser issues occur
4. **Contact Support:** If problem persists

### Trades Not Executing

1. **Check Balance:** Ensure you have sufficient funds
2. **Check Risk Limits:** Verify you haven't hit daily loss limit
3. **Check Market Hours:** Some features work only during market hours
4. **Check Automation Status:** Ensure automation engine is running

### Prices Not Updating

1. **Refresh Page:** Sometimes a refresh helps
2. **Check Connection:** Ensure internet connection is stable
3. **Wait a Moment:** Prices update periodically

### Performance Chart Not Showing

- **Need Closed Trades:** Chart shows cumulative P/L from closed positions
- **Close Some Positions:** Close positions to see performance trend

### Automation Not Working

1. **Check Engine Status:** Ensure engine is running
2. **Check Min Confidence:** Lower confidence if no trades executing
3. **Check Market Hours:** Some automations work only during market hours
4. **Review Automation Settings:** Verify all settings are correct

---

## 📞 Support & Feedback

### Getting Help

- **Check This Manual:** Most questions are answered here
- **Review Dashboard:** Check for error messages
- **Contact Support:** [Your support email/contact]

### Providing Feedback

We value your feedback! Please share:
- **What you like:** Features that work well
- **What needs improvement:** Areas for enhancement
- **Bugs:** Any issues you encounter
- **Feature Requests:** Ideas for new features

### Reporting Issues

When reporting issues, please include:
- **What you were doing:** Step-by-step description
- **What happened:** Error message or unexpected behavior
- **What you expected:** What should have happened
- **Screenshots:** If possible

---

## 📚 Additional Resources

### Learning Options Trading

- **Greeks Explained:** Use the AI analysis in Options Analyzer
- **Paper Trading:** Practice with virtual money
- **Watchlist:** Track stocks you're learning about

### Platform Features

- **Dashboard:** Your trading overview
- **Options Analyzer:** Find the best trades
- **Automations:** Automated trading strategies
- **Alerts:** Stay informed
- **History:** Review your trades

---

## ✅ Quick Reference

### Keyboard Shortcuts

- **Refresh:** F5 or Cmd/Ctrl + R
- **Search:** Cmd/Ctrl + F (in most pages)

### Important URLs

- **Dashboard:** `/dashboard`
- **Options Analyzer:** `/analyzer`
- **Watchlist:** `/watchlist`
- **Trade:** `/trade`
- **Automations:** `/automations`
- **Alerts:** `/alerts`
- **Settings:** `/settings`
- **History:** `/history`

### Common Actions

- **Add to Watchlist:** Options Analyzer → "Add to Watchlist"
- **Execute Trade:** Options Analyzer → "Trade" button
- **Create Automation:** Automations → "Create Automation"
- **View Position Details:** Dashboard → "Details" button

---

## 🎯 Getting the Most Out of IAB OptionsBot

1. **Start with Paper Trading:** Learn the platform risk-free
2. **Use AI Analysis:** Read the explanations to learn
3. **Set Up Automations:** Let the system work for you
4. **Monitor Alerts:** Stay on top of opportunities
5. **Review Performance:** Learn from your trades
6. **Customize Settings:** Adjust to your preferences
7. **Practice Regularly:** The more you use it, the better you'll get

---

**Happy Trading! 🚀**

*Remember: This is a beta version. Features may change, and we appreciate your feedback!*

