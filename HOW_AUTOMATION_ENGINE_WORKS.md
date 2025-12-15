# 🔄 How the Automation Engine Works - Detailed Explanation

## Overview

The Automation Engine runs **automatically** in the background once you click "Start Engine". It continuously monitors your positions and scans for new opportunities without any manual intervention.

---

## 🚀 Starting the Engine

### Automatic vs Manual

**The engine runs AUTOMATICALLY** once started:
- ✅ You click "Start Engine" **once**
- ✅ Engine runs **continuously** in the background
- ✅ No need to click anything again
- ✅ Runs every 15 minutes during market hours
- ✅ Runs every 30 minutes during extended hours (pre-market/after-hours)
- ✅ Runs hourly when market is closed

**Manual Options:**
- "Run Cycle Now" - Manually trigger one scan cycle (for testing)
- "Stop Engine" - Stop the automatic scanning

---

## 🔍 How It Scans for NEW Opportunities (Entry Trades)

### Step-by-Step Process:

#### 1. **Engine Starts a Cycle** (Every 15 minutes)
```
Time: 9:30 AM → Engine runs
Time: 9:45 AM → Engine runs again
Time: 10:00 AM → Engine runs again
... and so on
```

#### 2. **Gets All Active Automations**
- Finds all automations where:
  - `is_active = True`
  - `is_paused = False`
- Example: You have 3 automations (TSLA, AAPL, NVDA)

#### 3. **For Each Automation, Scans the Symbol**
For each automation (e.g., TSLA automation):
- **Checks if symbol is in watchlist** (or uses automation's symbol)
- **Runs technical analysis**:
  - Gets current stock price
  - Calculates moving averages (SMA 20, 50, 200)
  - Calculates RSI (Relative Strength Index)
  - Calculates MACD
  - Analyzes volume patterns
- **Generates trading signal**:
  - Determines if it's a BUY signal (bullish) or HOLD
  - Calculates confidence score (0-100%)
  - Example: "TSLA shows Golden Cross pattern, 77% confidence"

#### 4. **Checks if Signal Meets Criteria**
- **Is confidence ≥ Min Confidence?**
  - If Min Confidence = 0.30 (30%) and signal confidence = 77% → ✅ PASS
  - If Min Confidence = 0.80 (80%) and signal confidence = 77% → ❌ FAIL (skip)
- **Is signal recommended?**
  - Signal must be "bullish" (not "hold" or "bearish")

#### 5. **Finds Suitable Options**
If signal passes:
- **Gets options chain** for the symbol
- **Filters options** based on automation settings:
  - Preferred DTE (days to expiration) - e.g., 30 days
  - Delta range - e.g., 0.30-0.40
  - Min volume - e.g., 20 contracts
  - Min open interest - e.g., 100 contracts
  - Max spread % - e.g., 15%
- **Selects best option** that meets all criteria

#### 6. **Validates Risk Limits**
- Checks if you have enough balance
- Checks if you're within position limits
- Checks if you already have a position in this symbol (unless `allow_multiple_positions = True`)

#### 7. **Executes Trade**
If everything passes:
- **Executes BUY trade automatically**
- Creates a new position
- Records the trade
- Sends notification (if enabled)

---

## 📊 How It Monitors EXISTING Positions (Exit Trades)

### Step-by-Step Process:

#### 1. **Engine Gets All Open Positions** (Every Cycle)
- Queries database: `SELECT * FROM positions WHERE status = 'open'`
- Example: You have 4 open positions (TSLA call, AAPL call, NVDA put, HOOD call)

#### 2. **For Each Position, Updates Prices & Greeks**
For each position (e.g., TSLA call):
- **Fetches current option price** from Tradier API
- **Updates position.current_price** with latest price
- **Updates Greeks** (delta, gamma, theta, vega, IV)
- **Calculates unrealized P/L**:
  ```
  P/L = (current_price - entry_price) × quantity × 100 (for options)
  P/L % = ((current_price - entry_price) / entry_price) × 100
  ```

#### 3. **Gets Automation Settings for Position**
- If position was created by an automation, gets the automation
- Reads exit criteria:
  - `profit_target_1` = 25% (sell when up 25%)
  - `stop_loss_percent` = 10% (sell when down 10%)
  - `max_days_to_hold` = 30 (sell after 30 days)
  - `exit_at_profit_target` = True
  - `exit_at_stop_loss` = True

#### 4. **Checks Exit Conditions**

**A. Profit Target Check:**
```python
current_price = $12.50
entry_price = $10.00
profit_percent = ((12.50 - 10.00) / 10.00) × 100 = 25%

if profit_percent >= profit_target_1 (25%):
    → ✅ SELL! (Profit target reached)
```

**B. Stop Loss Check:**
```python
current_price = $9.00
entry_price = $10.00
loss_percent = ((10.00 - 9.00) / 10.00) × 100 = 10%

if loss_percent >= stop_loss_percent (10%):
    → ✅ SELL! (Stop loss triggered)
```

**C. Max Days Check:**
```python
entry_date = Jan 1, 2025
current_date = Jan 31, 2025
days_held = 30 days

if days_held >= max_days_to_hold (30):
    → ✅ SELL! (Max holding period reached)
```

**D. Expiration Check:**
```python
expiration_date = Feb 15, 2025
current_date = Feb 14, 2025
days_to_exp = 1 day

if days_to_exp <= 1:
    → ✅ SELL! (Expiring soon)
```

#### 5. **Executes SELL Trade**
If ANY condition is met:
- **Executes SELL trade automatically**
- Closes the position
- Records realized P/L
- Updates automation execution count
- Sends notification

---

## 🔄 Complete Automation Cycle Flow

Here's what happens every 15 minutes when the engine is running:

```
┌─────────────────────────────────────────────────┐
│  AUTOMATION CYCLE (Every 15 Minutes)            │
└─────────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  STEP 1: Monitor Positions   │
    │  - Get all open positions    │
    │  - Update prices & Greeks     │
    │  - Check exit conditions      │
    │  - Execute SELL if needed     │
    └───────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  STEP 2: Scan Opportunities  │
    │  - Get active automations     │
    │  - Run technical analysis     │
    │  - Generate signals           │
    │  - Find suitable options      │
    │  - Execute BUY if signal good │
    └───────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  STEP 3: Risk Management      │
    │  - Check portfolio limits     │
    │  - Validate risk parameters   │
    └───────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  STEP 4: Generate Alerts       │
    │  - Create buy/sell alerts      │
    │  - Create risk alerts          │
    └───────────────────────────────┘
                    │
                    ▼
            Wait 15 minutes
                    │
                    ▼
            Repeat Cycle
```

---

## 📝 Real-World Example

### Scenario: TSLA Automation

**Setup:**
- Automation: "TSLA Calls"
- Symbol: TSLA
- Min Confidence: 0.30 (30%)
- Profit Target: 25%
- Stop Loss: 10%
- Max Days: 30

**Day 1 - 9:30 AM (Market Opens):**
1. Engine starts cycle
2. Scans TSLA → No signal (confidence = 20%)
3. No positions to monitor
4. **Result**: No trades

**Day 1 - 9:45 AM:**
1. Engine runs again
2. Scans TSLA → **Golden Cross detected!** (confidence = 77%)
3. 77% ≥ 30% → ✅ Signal passes
4. Finds TSLA call option (strike $460, exp 30 days, delta 0.35)
5. Validates risk → ✅ Passes
6. **Executes BUY trade** → Creates position
7. **Result**: New TSLA call position opened

**Day 5 - 10:00 AM:**
1. Engine runs cycle
2. **Monitors existing TSLA position**:
   - Entry price: $10.00
   - Current price: $12.50
   - Profit: 25% ✅
3. **Profit target reached!** → Executes SELL
4. **Result**: Position closed, profit locked in

**Day 5 - 10:15 AM:**
1. Engine runs again
2. Scans TSLA → Another signal (confidence = 45%)
3. 45% ≥ 30% → ✅ Signal passes
4. Finds new TSLA call option
5. **Executes BUY trade** → New position opened
6. **Result**: New TSLA call position opened

---

## 🎯 Key Points

### ✅ Automatic Scanning
- **Once started, runs automatically**
- No manual intervention needed
- Scans every 15 minutes during market hours
- Monitors positions every cycle

### ✅ Position Monitoring
- **Automatically checks all open positions**
- Updates prices in real-time
- Checks exit conditions every cycle
- Executes SELL trades automatically when conditions are met

### ✅ Entry Opportunities
- **Scans watchlist symbols** from your automations
- Runs technical analysis automatically
- Finds suitable options automatically
- Executes BUY trades when signals are strong enough

### ✅ Exit Conditions
- **Profit Target**: Sells when position is up by X%
- **Stop Loss**: Sells when position is down by X%
- **Max Days**: Sells after holding for X days
- **Expiration**: Sells before option expires

---

## 🔧 How to Verify It's Working

### Check Engine Status:
1. Go to **Automations** page
2. Look at "Automation Engine" section
3. Should show: **🟢 Running** (if started)
4. "Last Cycle" shows when it last ran

### Check Recent Activity:
1. On **Automations** page, see "Recent Activity" section
2. Shows trades executed by automations
3. Green "Position Created" = BUY trade executed
4. "Position Closed" = SELL trade executed

### Check Positions:
1. Go to **Dashboard**
2. See "Active Positions" - these are monitored every cycle
3. Prices update automatically
4. Positions close automatically when exit conditions are met

### Check Alerts:
1. Go to **Alerts** page
2. See "Trade Executed" alerts when automations trade
3. See "Sell Signal" alerts when positions hit exit conditions

---

## ❓ Common Questions

### Q: Do I need to click "Generate Alerts" for automations to work?
**A:** No! "Generate Alerts" is separate. Automations work independently. The engine scans automatically every 15 minutes.

### Q: How often does it check my positions?
**A:** Every 15 minutes during market hours. So if your position hits a profit target at 10:05 AM, it will be sold by 10:20 AM (next cycle).

### Q: What if the engine stops?
**A:** Positions remain open, but no new trades will execute. Restart the engine to resume automation.

### Q: Can I manually close a position that automation is monitoring?
**A:** Yes! You can manually close any position on the Dashboard. The automation will stop monitoring it once it's closed.

### Q: Does it work when market is closed?
**A:** The engine runs less frequently (hourly) when market is closed, but it still monitors positions. New trades only execute during market hours.

---

## 📊 Summary

**Scanning for New Opportunities:**
- ✅ **Automatic** - Runs every 15 minutes
- ✅ Scans all active automations
- ✅ Runs technical analysis
- ✅ Finds suitable options
- ✅ Executes BUY trades when signals are strong

**Monitoring Existing Positions:**
- ✅ **Automatic** - Checks every 15 minutes
- ✅ Updates prices and Greeks
- ✅ Checks profit targets, stop losses, max days, expiration
- ✅ Executes SELL trades when exit conditions are met

**Once you click "Start Engine", everything runs automatically!** 🚀

