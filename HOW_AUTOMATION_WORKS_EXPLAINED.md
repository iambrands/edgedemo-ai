# 🤖 How the Automation System is Supposed to Work

## Overview

The automation system is designed to be a "set it and forget it" trading bot that:
1. **Monitors your automations** for entry opportunities
2. **Monitors your positions** for exit signals
3. **Executes trades automatically** when conditions are met
4. **Runs continuously** in the background

---

## 🔄 The Complete Flow

### Step 1: Create Automations (Manual Setup)

**What you do:**
- Go to Automations page
- Click "Create Automation"
- Fill in:
  - **Symbol**: Stock to watch (e.g., HOOD, AAPL, META)
  - **Strategy**: Long call, covered call, etc.
  - **Min Confidence**: How selective (0.30 = easy trigger, 0.70 = very selective)
  - **Profit Target**: % profit to take (e.g., 25%)
  - **Stop Loss**: % loss to exit (e.g., 10%)
  - **Max Days to Hold**: Maximum holding period

**What this creates:**
- A "watch rule" that says: "Watch HOOD, and if conditions are met, buy a call option"

---

### Step 2: Start the Engine (One-Time Action)

**What you do:**
- Click "Start Engine" button on Automations page

**What happens:**
- A background thread starts running
- The engine runs **automatically** every 5 minutes during market hours
- You don't need to click anything again - it runs continuously

---

### Step 3: Engine Cycle (Automatic - Every 5 Minutes)

Each cycle does **TWO main things**:

#### A. Monitor Existing Positions (Exit Checks)
1. Gets all your open positions
2. For each position:
   - Checks current price
   - Calculates P/L
   - Checks if exit conditions are met:
     - ✅ Profit target reached? → SELL
     - ✅ Stop loss triggered? → SELL
     - ✅ Max days to hold reached? → SELL
     - ✅ Risk management limit hit? → SELL
3. If exit condition met → Executes SELL trade automatically

#### B. Scan for New Opportunities (Entry Checks)
1. Gets all your **active automations** (is_active=True, is_paused=False)
2. For each automation:
   - Gets the symbol (e.g., HOOD)
   - **Checks if can trade:**
     - ❌ Already have open position? → Skip (unless allow_multiple=True)
     - ❌ Max positions reached? → Skip
     - ✅ Can trade → Continue
   
   - **Generates trading signals:**
     - Runs technical analysis (moving averages, RSI, MACD, etc.)
     - Calculates confidence score (0-100%)
     - Determines direction (bullish/bearish)
   
   - **Checks if signal meets criteria:**
     - ❌ Confidence < Min Confidence? → Skip
     - ❌ Signal not recommended? → Skip
     - ✅ Meets criteria → Continue
   
   - **Finds suitable option:**
     - Gets options expirations
     - Finds expiration matching preferred DTE (days to expiration)
     - Gets options chain
     - Filters by:
       - Direction (call for bullish, put for bearish)
       - Volume (min 20)
       - Open interest (min 100)
       - Spread (max 15%)
       - Delta (if specified)
     - Selects best option (highest score)
   
   - **If suitable option found:**
     - Creates "opportunity" object
     - Executes BUY trade automatically
     - Creates new position

---

## 🚨 Why It Might Not Be Producing Results

Based on the code, here are the **most common reasons** why the engine runs but finds no opportunities:

### 1. **Signal Confidence Too Low**
- Your automations have `min_confidence: 0.30`
- But the technical analysis might only generate 20% confidence
- **Result**: Signal doesn't meet threshold → No trade

### 2. **Signal Not Recommended**
- Technical analysis might say "HOLD" instead of "BUY"
- Even if confidence is high, if action = "hold", no trade executes
- **Result**: Signal says hold → No trade

### 3. **Already Have Open Position**
- If you already have a HOOD position open
- The automation skips it (unless allow_multiple=True)
- **Result**: Position exists → Skip this symbol

### 4. **No Suitable Options Found**
- Options chain might not have contracts meeting filters:
  - Volume too low (< 20)
  - Open interest too low (< 100)
  - Spread too wide (> 15%)
  - No expiration in preferred DTE range
- **Result**: No options pass filters → No trade

### 5. **Risk Limits Blocking**
- Max positions reached
- Daily loss limit hit
- Position size limits
- **Result**: Risk check fails → No trade

### 6. **Market Hours / Data Issues**
- Market closed
- API errors getting price data
- Options chain unavailable
- **Result**: Can't get data → No trade

---

## 📊 What "Run Cycle Now" Does

When you click "Run Cycle Now":
1. Runs **one complete cycle** immediately (doesn't wait 5 minutes)
2. Does both:
   - Checks all positions for exits
   - Scans all automations for entries
3. Returns diagnostic info showing:
   - How many automations were scanned
   - Why each automation didn't trigger (if it didn't)
   - Signal confidence levels
   - Whether options were found

This is useful for **testing** to see why trades aren't executing.

---

## 🎯 Current System Complexity

The system has **many layers of checks**:

1. ✅ Automation must be active and not paused
2. ✅ Can't already have position (unless allow_multiple)
3. ✅ Must not exceed max positions
4. ✅ Technical analysis must generate signal
5. ✅ Signal confidence ≥ min_confidence
6. ✅ Signal must be "recommended" (not "hold")
7. ✅ Must find suitable expiration date
8. ✅ Must find options chain data
9. ✅ Option must pass all filters (volume, OI, spread, delta)
10. ✅ Must pass risk management checks

**Any one of these failing = No trade**

---

## 💡 Potential Simplifications

We could simplify by:

1. **Remove complex signal generation** - Just use simple criteria (price movement, volume)
2. **Relax option filters** - Accept lower volume/OI options
3. **Lower confidence thresholds** - Make it easier to trigger
4. **Add "force trade" mode** - Bypass some checks for testing
5. **Show why trades aren't executing** - Better diagnostics on the page
6. **Pre-populate with working examples** - Default automations that work

Would you like me to implement any of these simplifications?

