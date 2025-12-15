# 🤖 Automation System - Complete User Guide

## What is Automation?

Automation is a "set it and forget it" trading system that:
- **Monitors your watchlist** for buying opportunities
- **Monitors your open positions** for exit signals (profit targets, stop losses)
- **Executes trades automatically** when conditions are met
- **Runs continuously** during market hours

---

## 🎯 How It Works - Step by Step

### Step 1: Create an Automation

1. Go to **Automations** page
2. Click **"Create Automation"**
3. Fill in the form:
   - **Name**: Give it a name (e.g., "TSLA Long Call Strategy")
   - **Symbol**: Stock symbol (e.g., TSLA)
   - **Strategy Type**: Choose your strategy (Long Call, Covered Call, etc.)
   - **Min Confidence**: How selective you want to be (0.30 = easy trigger, 0.70 = selective)
   - **Profit Target**: % profit to take (e.g., 25% = sell when up 25%)
   - **Stop Loss**: % loss to exit (e.g., 10% = sell when down 10%)
   - **Max Days to Hold**: Maximum days to hold position

### Step 2: Start the Automation Engine

1. On the **Automations** page, click **"Start Engine"** button
2. The engine will:
   - Run every 15 minutes during market hours
   - Check all your automations
   - Monitor existing positions
   - Scan for new opportunities

### Step 3: How Trades Get Executed

#### For NEW Positions (Entry):
1. **Engine scans your watchlist** for the automation's symbol
2. **Technical analysis** runs (checks moving averages, RSI, MACD, etc.)
3. **Signal confidence** is calculated (0-100%)
4. **If confidence ≥ Min Confidence**:
   - System finds suitable options contracts
   - Validates against risk limits
   - **Executes BUY trade automatically**
   - Creates a new position

#### For EXISTING Positions (Exit):
1. **Engine monitors all open positions** every cycle
2. **Checks exit conditions**:
   - ✅ **Profit Target**: If position is up by your profit target % → SELL
   - ✅ **Stop Loss**: If position is down by your stop loss % → SELL
   - ✅ **Max Days**: If held longer than max days → SELL
   - ✅ **Expiration**: If option expires soon → SELL
3. **If any condition is met**:
   - **Executes SELL trade automatically**
   - Closes the position
   - Records realized P/L

---

## 🔧 Understanding Automation Settings

### Min Confidence (0.0 - 1.0)
- **0.30** = Easy trigger (trades more often, lower quality signals)
- **0.70** = Selective (only high-quality signals, trades less often)
- **1.0** = Very strict (rarely trades, only best opportunities)

**Recommendation**: Start with 0.30 for testing, then increase to 0.70 for production.

### Profit Target %
- **25%** = Sell when position is up 25%
- **50%** = Sell when position is up 50%
- This is the % gain on the option premium (not stock price)

**Example**: You buy a call for $10. If profit target is 25%, it sells when the call is worth $12.50.

### Stop Loss %
- **10%** = Sell when position is down 10%
- **15%** = Sell when position is down 15%
- This prevents large losses

**Example**: You buy a call for $10. If stop loss is 10%, it sells when the call drops to $9.

### Max Days to Hold
- **30 days** = Close position after 30 days regardless of profit/loss
- **45 days** = Close position after 45 days
- Prevents holding positions too long

---

## 🚀 Getting Started - Quick Start Guide

### Scenario: You want to automate TSLA call options

1. **Create Automation**:
   - Name: "TSLA Calls"
   - Symbol: TSLA
   - Strategy: Long Call
   - Min Confidence: 0.30 (for testing)
   - Profit Target: 25%
   - Stop Loss: 10%
   - Max Days: 30

2. **Add TSLA to Watchlist**:
   - Go to Watchlist page
   - Add TSLA

3. **Start Engine**:
   - Go to Automations page
   - Click "Start Engine"

4. **Wait for Trades**:
   - Engine runs every 15 minutes
   - When TSLA shows a bullish signal (confidence ≥ 30%), it will:
     - Find a suitable call option
     - Execute BUY trade
     - Create a position

5. **Monitor Positions**:
   - Go to Dashboard
   - See your open positions
   - Engine will automatically:
     - Sell when up 25% (profit target)
     - Sell when down 10% (stop loss)
     - Sell after 30 days (max days)

---

## ❓ Common Questions

### Q: Why isn't my automation executing trades?

**Check these:**
1. ✅ Is the engine **running**? (Check "Start Engine" button status)
2. ✅ Is the automation **Active** and **not Paused**?
3. ✅ Is the symbol in your **Watchlist**?
4. ✅ Is **Min Confidence** too high? (Try lowering to 0.30)
5. ✅ Is the **market open**? (Engine only runs during market hours)
6. ✅ Are there **suitable options** available? (Check volume, open interest)

**Debug Steps:**
1. Click **"Run Cycle Now"** to manually trigger a scan
2. Check the diagnostics message - it will tell you why trades aren't executing
3. Look for messages like:
   - "Signal confidence X% < min Y%" → Lower Min Confidence
   - "No suitable options found" → Check if options exist for that symbol
   - "Already have open position" → Close existing position first

### Q: How do I test an automation?

1. **Use Test Trade Button**:
   - On Automations page, click **"🧪 Test Trade"** on an automation
   - This forces a trade execution (bypasses some checks)
   - Good for testing if automation is working

2. **Use Run Cycle Now**:
   - Click **"Run Cycle Now"** to manually trigger a scan
   - Check the diagnostics to see what happened

### Q: Why are all my alerts showing 77% confidence?

This is a known issue with the confidence calculation. The system calculates confidence based on:
- Technical indicators (moving averages, RSI, MACD)
- How far price is above/below moving averages
- Volume patterns

The 77% comes from a specific calculation in the Golden Cross signal. We're working on making confidence more varied and accurate.

### Q: Can I have multiple automations for the same symbol?

Yes! But by default, the system prevents multiple open positions in the same symbol. To allow this:
- Set `allow_multiple_positions = True` in the automation (requires code change for now)

### Q: What happens if the engine stops?

- **Positions remain open** (they don't close automatically)
- **No new trades** will execute
- **You can manually close** positions on the Dashboard
- **Restart the engine** to resume automation

---

## 📊 Monitoring Your Automations

### Dashboard
- **Active Positions**: See all open positions created by automations
- **Recent Trades**: See all trades executed by automations
- **P/L**: See profit/loss for each position

### Automations Page
- **Engine Status**: See if engine is running
- **Execution Count**: How many trades each automation has made
- **Last Executed**: When the last trade was made
- **Recent Activity**: See recent automation trades

### Alerts Page
- **Trade Alerts**: See when automations execute trades
- **Sell Signals**: See when positions hit profit targets or stop losses

---

## ⚠️ Important Notes

1. **Paper Trading**: All trades are paper trades (virtual money) unless you configure live trading
2. **Market Hours**: Engine only runs during market hours (9:30 AM - 4:00 PM ET)
3. **Risk Management**: System validates all trades against risk limits
4. **Position Limits**: By default, only one position per symbol
5. **Options Only**: Currently optimized for options trading (calls/puts)

---

## 🐛 Troubleshooting

### Engine won't start
- Check if you're logged in
- Check browser console for errors
- Try refreshing the page

### Trades not executing
- Lower Min Confidence to 0.30
- Check if symbol is in watchlist
- Check if market is open
- Use "Run Cycle Now" to see diagnostics

### Positions not closing
- Check if automation has correct profit target/stop loss set
- Check if `exit_at_profit_target` and `exit_at_stop_loss` are enabled
- Verify position prices are updating (use "Refresh Price" button)

### Test Trade fails
- Check error message - it will tell you what's missing
- Common issues:
  - No options available for symbol
  - Missing required fields (strike, expiration)
  - Risk validation failed

---

## 📝 Example Workflow

**Day 1: Setup**
1. Create automation: "AAPL Calls" (Min Confidence: 0.30, Profit: 25%, Stop: 10%)
2. Add AAPL to watchlist
3. Start engine

**Day 2: First Trade**
1. Engine detects bullish signal on AAPL (confidence: 45%)
2. Finds suitable call option (strike: $150, exp: 30 days)
3. Executes BUY trade
4. Creates position on Dashboard

**Day 5: Profit Target Hit**
1. Position is now up 28% (above 25% target)
2. Engine detects profit target
3. Executes SELL trade
4. Closes position
5. Records realized P/L

**Day 10: New Opportunity**
1. Engine detects another bullish signal
2. Executes new BUY trade
3. Creates new position

---

## 🎓 Advanced Features

### Advanced Options (in Create/Edit Modal)
- **Preferred DTE**: Target days to expiration (e.g., 30 days)
- **Min/Max DTE**: Acceptable range (e.g., 21-60 days)
- **Target Delta**: Ideal delta (e.g., 0.30 for 30 delta)
- **Min/Max Delta**: Acceptable delta range

These help fine-tune which options the system selects.

---

## 💡 Tips for Success

1. **Start Simple**: Use default settings first, then customize
2. **Test First**: Use "Test Trade" to verify automation works
3. **Monitor Closely**: Check Dashboard daily to see positions
4. **Adjust Settings**: If too many/few trades, adjust Min Confidence
5. **Use Stop Losses**: Always set a stop loss to limit risk
6. **Check Alerts**: Alerts page shows what the system is doing

---

## 📞 Need Help?

If you're still having issues:
1. Check the diagnostics from "Run Cycle Now"
2. Review this guide
3. Check the error messages in the browser console
4. Verify all settings are correct

---

**Last Updated**: December 2025

