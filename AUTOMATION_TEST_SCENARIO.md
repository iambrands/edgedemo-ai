# Automation Engine Test Scenario Guide

## Why Your Automation Might Not Be Triggering

The automation engine requires **multiple conditions** to be met before executing a trade:

1. ✅ **Automation must be Active** (`is_active=True`, `is_paused=False`)
2. ✅ **Technical Signal** must have confidence ≥ `min_confidence` (default 0.70)
3. ✅ **Signal must be "Recommended"** (bullish/bearish with sufficient confidence)
4. ✅ **Options Chain** must have suitable contracts matching your criteria
5. ✅ **Risk Limits** must allow the trade
6. ✅ **No Existing Position** (unless `allow_multiple_positions=True`)

**Most Common Issue:** The technical analysis is generating signals with confidence below your `min_confidence` threshold (default 0.70).

---

## Quick Test Scenario: Make It Easy to Trigger

### Step 1: Create a Test Automation with Relaxed Criteria

**Recommended Settings for Testing:**

1. **Go to Automations page** → Create New Automation

2. **Basic Settings:**
   - **Name:** "Test Automation - Easy Trigger"
   - **Symbol:** `AAPL` (or any liquid stock)
   - **Strategy Type:** `covered_call` or `cash_secured_put`

3. **Entry Criteria (Make it Easy):**
   - **Min Confidence:** `0.30` (lower from default 0.70) ⚠️ **KEY CHANGE**
   - **Max Premium:** `$10.00` (or leave blank)
   - **Min Volume:** `10` (lower from default 20)
   - **Min Open Interest:** `50` (lower from default 100)
   - **Max Spread %:** `20.0` (increase from default 15.0)

4. **Delta Settings (Optional):**
   - **Min Delta:** Leave blank
   - **Max Delta:** Leave blank
   - **Target Delta:** Leave blank

5. **DTE Settings:**
   - **Preferred DTE:** `30`
   - **Min DTE:** `21`
   - **Max DTE:** `60`

6. **Exit Criteria:**
   - **Profit Target 1:** `25.0%`
   - **Stop Loss:** `-15.0%`
   - **Max Days to Hold:** `45`

7. **Risk Settings:**
   - **Max Position Size:** `5%` (default)
   - **Allow Multiple Positions:** `False` (unless testing multiple)

8. **Status:**
   - **Active:** ✅ Checked
   - **Paused:** ❌ Unchecked

---

## Step 2: Start the Automation Engine

1. **Go to Automations page**
2. **Click "Start Engine"** button
3. **Wait for status to show "Running"**

---

## Step 3: Manually Trigger a Cycle (For Testing)

**Instead of waiting for automatic cycles, manually trigger one:**

1. **On Automations page, click "Run Cycle Now"** button
2. **This will immediately:**
   - Scan all active automations
   - Check for entry opportunities
   - Execute trades if conditions are met

**What Happens:**
- The engine scans your automation
- Generates technical signals for the symbol
- Checks if confidence meets threshold
- Finds suitable options contracts
- Validates against risk limits
- Executes trade if all conditions pass

---

## Step 4: Check Activity Logs

**After running a cycle, check:**

1. **Automation Activity Section** on Automations page
   - Shows recent trades
   - Shows audit logs
   - Shows execution counts

2. **Server Logs** (if you have access):
   - Look for messages like:
     - `"Starting automation cycle #X"`
     - `"Found X trading opportunities"`
     - `"Executing trade for automation Y"`

---

## Understanding the Signal Generation

### How Signals Are Generated

The automation engine uses **Technical Analysis** to generate signals:

1. **Technical Indicators:**
   - Moving Averages (SMA 20, 50, 200)
   - RSI (Relative Strength Index)
   - MACD
   - Volume Analysis
   - Support/Resistance Levels

2. **Signal Types:**
   - **Bullish Signals:** Golden Cross, RSI Oversold, High Volume Breakout, MACD Bullish
   - **Bearish Signals:** Death Cross, RSI Overbought, High Volume Breakdown, MACD Bearish

3. **Confidence Calculation:**
   - Each signal has a confidence score (0.0 - 1.0)
   - Multiple signals are combined
   - IV Rank can boost confidence
   - Final confidence must be ≥ `min_confidence` to trigger

### Why Signals Might Be Low

**Current Limitation:** The technical analyzer uses **simplified/mock data** for some indicators:
- RSI defaults to 50 (neutral)
- Moving averages are approximated
- This can result in lower confidence scores

**Solution for Testing:** Lower `min_confidence` to 0.30-0.40 to make it easier to trigger.

---

## Test Scenario: Force a Signal

### Option 1: Lower Confidence Threshold

**Create automation with:**
- `min_confidence: 0.30` (very low threshold)
- This will trigger on almost any signal

### Option 2: Use a Volatile Stock

**Try symbols that are more likely to generate signals:**
- `TSLA` (high volatility)
- `NVDA` (high volume)
- `SPY` (liquid options)

### Option 3: Check Market Hours

**The engine only runs during market hours:**
- Regular hours: 9:30 AM - 4:00 PM ET
- Extended hours: 4:00 AM - 9:30 AM, 4:00 PM - 8:00 PM ET
- Closed: Hourly checks only

**To test outside market hours:**
- Use "Run Cycle Now" button (bypasses market hours check)

---

## Expected Behavior When Working

### Successful Execution Flow:

1. **Engine Starts:**
   ```
   "Automation engine started"
   Status: Running
   ```

2. **Cycle Runs:**
   ```
   "Starting automation cycle #1"
   "Step 1: Monitoring existing positions..."
   "Step 2: Scanning for new opportunities..."
   "Found 1 trading opportunities"
   ```

3. **Trade Executes:**
   ```
   "Executing trade for automation: Test Automation"
   "Trade executed successfully"
   ```

4. **Activity Logs:**
   - New trade appears in "Recent Trades"
   - Audit log entry created
   - Execution count increments
   - Position created

5. **Dashboard Updates:**
   - New position appears
   - Account balance updated
   - Trade history updated

---

## Troubleshooting Checklist

### ✅ Automation Not Triggering?

1. **Check Automation Status:**
   - Is `is_active=True`?
   - Is `is_paused=False`?
   - Go to Automations page and verify

2. **Check Min Confidence:**
   - Lower it to 0.30 for testing
   - Default 0.70 might be too high

3. **Check Symbol:**
   - Is the symbol valid?
   - Does it have options?
   - Is it liquid enough?

4. **Check Risk Limits:**
   - Do you have available balance?
   - Are you at position limit?
   - Check Settings → Risk Limits

5. **Check Existing Positions:**
   - Do you already have a position in this symbol?
   - Set `allow_multiple_positions=True` if needed

6. **Check Options Chain:**
   - Are there contracts matching your criteria?
   - Check volume, open interest, spread
   - Lower your filters if needed

7. **Check Engine Status:**
   - Is the engine running?
   - Click "Start Engine" if not
   - Check status indicator

8. **Manually Trigger:**
   - Click "Run Cycle Now"
   - Check server logs for errors
   - Check browser console for errors

---

## Demo Scenario: Step-by-Step

### For Investor Demo:

1. **Pre-Setup (Before Demo):**
   ```
   - Create automation with min_confidence: 0.30
   - Use AAPL or SPY (liquid, reliable)
   - Set relaxed filters (low volume/OI requirements)
   - Ensure engine is started
   ```

2. **During Demo:**
   ```
   Step 1: Show Automation Settings
   - "This automation watches AAPL"
   - "It triggers when confidence ≥ 30%"
   - "It's currently Active and Running"
   
   Step 2: Show Engine Status
   - "The automation engine is running"
   - "It checks every 15 minutes during market hours"
   - "We can also trigger it manually"
   
   Step 3: Trigger Manual Cycle
   - Click "Run Cycle Now"
   - Show: "Scanning for opportunities..."
   - Show: "Found X opportunities" or "No opportunities found"
   
   Step 4: If Trade Executes
   - Show new position on Dashboard
   - Show trade in history
   - Show execution count increment
   - Show audit log entry
   
   Step 5: Show Position Monitoring
   - "The engine monitors this position"
   - "It will exit at profit target or stop loss"
   - "It checks every cycle"
   ```

3. **If Nothing Happens:**
   ```
   - Explain: "The engine is working, but conditions aren't met"
   - Show: "Min confidence is 0.70, current signal is 0.45"
   - Show: "This is actually good - it means we're being selective"
   - Lower confidence to 0.30 and try again
   ```

---

## Advanced: Understanding the Full Flow

### Complete Automation Cycle:

```
1. Master Controller Starts
   └─> Checks market hours
   └─> Runs every 15 minutes (market hours)
   └─> Runs every 30 minutes (extended hours)
   └─> Runs hourly (market closed)

2. Position Monitor (Step 1)
   └─> Gets all open positions
   └─> Updates prices and Greeks
   └─> Checks exit conditions:
       - Profit target reached?
       - Stop loss hit?
       - Max days exceeded?
       - Greeks threshold exceeded?
   └─> Executes exits if needed

3. Opportunity Scanner (Step 2)
   └─> Gets all active automations
   └─> For each automation:
       ├─> Checks if can trade (no existing position, risk limits OK)
       ├─> Generates technical signals
       ├─> Checks signal confidence ≥ min_confidence
       ├─> Finds suitable options contracts
       ├─> Filters by automation preferences
       └─> Creates opportunity if found

4. Trade Executor (Step 3)
   └─> For each opportunity:
       ├─> Validates against risk limits
       ├─> Calculates position size
       ├─> Executes trade (paper or live)
       ├─> Creates Position record
       ├─> Creates Trade record
       └─> Logs audit entry

5. Notifications (Step 4)
   └─> Sends notifications (if configured)
   └─> Updates dashboard
   └─> Logs activity
```

---

## Quick Reference: Key Settings

### To Make Automation Trigger Easier:

| Setting | Default | Test Value | Purpose |
|---------|---------|------------|---------|
| `min_confidence` | 0.70 | **0.30** | Lower threshold for signals |
| `min_volume` | 20 | **10** | Lower volume requirement |
| `min_open_interest` | 100 | **50** | Lower OI requirement |
| `max_spread_percent` | 15.0 | **20.0** | Allow wider spreads |
| `max_premium` | None | **$10.00** | Limit premium (optional) |

### To Make Automation More Selective:

| Setting | Default | Selective Value | Purpose |
|---------|---------|-----------------|---------|
| `min_confidence` | 0.70 | **0.80** | Higher quality signals |
| `min_volume` | 20 | **50** | More liquid contracts |
| `min_open_interest` | 100 | **500** | More interest |
| `max_spread_percent` | 15.0 | **10.0** | Tighter spreads |

---

## API Endpoints for Testing

### Manual Cycle Trigger:
```bash
POST http://localhost:5000/api/automation_engine/run-cycle
Headers: Authorization: Bearer <token>
```

### Check Status:
```bash
GET http://localhost:5000/api/automation_engine/status
Headers: Authorization: Bearer <token>
```

### Get Activity:
```bash
GET http://localhost:5000/api/automation_engine/activity
Headers: Authorization: Bearer <token>
```

---

## Summary: Quick Test Steps

1. ✅ **Create automation** with `min_confidence: 0.30`
2. ✅ **Use liquid symbol** (AAPL, SPY, TSLA)
3. ✅ **Lower filters** (volume: 10, OI: 50)
4. ✅ **Start engine** (click "Start Engine")
5. ✅ **Trigger cycle** (click "Run Cycle Now")
6. ✅ **Check activity** (look for trades/logs)
7. ✅ **Verify position** (check Dashboard)

**If still not working:**
- Check server logs for errors
- Check browser console for errors
- Verify automation is active and not paused
- Verify you have account balance
- Verify risk limits allow the trade

---

*Last Updated: January 2025*

