# Paper Trading Guide - IAB OptionsBot

## 🎯 What is Paper Trading?

Paper trading allows you to test the platform with **simulated money** - no real funds at risk! Perfect for:
- Testing strategies
- Learning options trading
- Validating automation rules
- Building confidence before live trading

---

## 🚀 Getting Started with Paper Trading

### 1. **Enable Paper Trading Mode**

Your account is already set to paper trading by default:
- **Trading Mode:** `paper`
- **Starting Balance:** $100,000 (virtual money)

### 2. **Create an Automation**

1. Go to **Automations** page
2. Click **"Create Automation"**
3. Fill in the form:
   - **Name:** "My First Strategy"
   - **Symbol:** "AAPL" (or any stock symbol)
   - **Strategy Type:** Choose from:
     - `covered_call` - Sell covered calls
     - `cash_secured_put` - Sell cash-secured puts
     - `long_call` - Buy call options
     - `long_put` - Buy put options
   - **Profit Target:** 50% (close position at 50% profit)
   - **Stop Loss:** 25% (close position at 25% loss)
   - **Max Days to Hold:** 30 days

4. Click **"Create"**

### 3. **Activate Your Automation**

- Your automation is **active** by default
- The system will automatically:
  - Scan for opportunities
  - Execute trades when criteria are met
  - Monitor positions
  - Close positions at profit targets or stop losses

---

## 📊 How Paper Trading Works

### **Virtual Balance**
- Starting balance: **$100,000**
- All trades use virtual money
- No real funds are at risk
- Track your performance in real-time

### **Trade Execution**
- Trades are **simulated** (not sent to broker)
- Prices use real market data
- Commissions are simulated
- P/L is calculated in real-time

### **Position Monitoring**
- Positions are tracked automatically
- Real-time P/L updates
- Automatic exits at targets
- Risk management enforced

---

## 🎮 Testing Scenarios

### **Scenario 1: Test a Covered Call Strategy**

1. **Create Automation:**
   - Strategy: `covered_call`
   - Symbol: `AAPL`
   - Profit Target: 50%
   - Stop Loss: 25%

2. **What Happens:**
   - System scans for opportunities
   - When criteria met, sells a covered call
   - Monitors position
   - Closes at 50% profit or 25% loss

3. **Monitor:**
   - Check **Dashboard** for positions
   - View **History** for closed trades
   - Check **Automations** for execution count

### **Scenario 2: Test Multiple Strategies**

1. Create multiple automations for different symbols
2. Each runs independently
3. Track performance per automation
4. Compare strategies

### **Scenario 3: Test Risk Management**

1. Set tight stop losses (e.g., 10%)
2. Set conservative profit targets (e.g., 20%)
3. See how the system manages risk
4. Review trade history

---

## 📈 Monitoring Your Paper Trading

### **Dashboard**
- **Active Positions:** See all open positions
- **Real-time P/L:** Track unrealized gains/losses
- **Recent Trades:** View closed positions
- **Performance Charts:** Visualize your results

### **History Page**
- **All Trades:** Complete trade log
- **Win Rate:** Percentage of profitable trades
- **Average Return:** Average profit per trade
- **Filtering:** By date, symbol, strategy

### **Automations Page**
- **Execution Count:** How many trades executed
- **Status:** Active, paused, or inactive
- **Performance:** Per-automation metrics

---

## ⚙️ Automation Settings Explained

### **Entry Criteria**
- **Min Volume:** Minimum daily volume (default: 20)
- **Min Open Interest:** Minimum open interest (default: 100)
- **Max Spread %:** Maximum bid-ask spread (default: 15%)

### **Exit Criteria**
- **Profit Target %:** Close at this profit (default: 50%)
- **Stop Loss %:** Close at this loss (default: 25%)
- **Max Days to Hold:** Maximum holding period (default: 30)

### **Risk Management**
- **Max Position Size:** Maximum position value
- **Max Portfolio Exposure:** Maximum total exposure
- **Allow Multiple Positions:** Can hold multiple positions per symbol

---

## 🔍 Tips for Paper Trading

1. **Start Small:** Test with one automation first
2. **Use Realistic Settings:** Don't set unrealistic targets
3. **Monitor Regularly:** Check positions daily
4. **Review Performance:** Analyze what works
5. **Adjust Settings:** Refine based on results
6. **Test Different Strategies:** Try various approaches
7. **Learn from Mistakes:** Paper trading is for learning!

---

## 📊 Example Paper Trading Workflow

### **Day 1: Setup**
1. Create automation for `AAPL`
2. Set profit target: 50%
3. Set stop loss: 25%
4. Activate automation

### **Day 2-5: Monitoring**
1. Check dashboard for positions
2. Review alerts for signals
3. Monitor P/L in real-time
4. Let automation run

### **Day 6-10: Analysis**
1. Review trade history
2. Check win rate
3. Analyze profitable vs losing trades
4. Adjust settings if needed

### **Day 11+: Optimization**
1. Create more automations
2. Test different strategies
3. Refine entry/exit criteria
4. Build confidence

---

## 🎯 Switching to Live Trading

**⚠️ IMPORTANT:** Only switch to live trading when:
- ✅ You're comfortable with the platform
- ✅ Your paper trading is profitable
- ✅ You understand the risks
- ✅ You have real funds ready

**To Switch:**
1. Go to **Settings** (when implemented)
2. Change **Trading Mode** from `paper` to `live`
3. Connect your Tradier account
4. Start with small positions

---

## 💡 Best Practices

1. **Start with Paper Trading:** Always test first
2. **Use Realistic Targets:** 50% profit, 25% loss are good defaults
3. **Monitor Daily:** Check positions regularly
4. **Review Weekly:** Analyze performance weekly
5. **Adjust Gradually:** Make small changes, not big swings
6. **Keep Records:** Document what works
7. **Learn Continuously:** Options trading is complex

---

## 🆘 Troubleshooting

### **No Trades Executing?**
- Check if automation is **active** and not **paused**
- Verify entry criteria aren't too strict
- Check if market is open
- Review alerts for signals

### **Trades Closing Too Early?**
- Adjust profit target (higher = hold longer)
- Check stop loss settings
- Review max days to hold

### **Too Many Losing Trades?**
- Tighten entry criteria
- Increase min volume/open interest
- Adjust stop loss
- Review symbol selection

---

## 📚 Next Steps

1. **Create Your First Automation**
2. **Monitor for a Week**
3. **Review Performance**
4. **Adjust Settings**
5. **Create More Automations**
6. **Build Your Strategy**

**Happy Paper Trading!** 🎉

