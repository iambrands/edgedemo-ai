# Paper Balance Diagnostic Scripts

## 🚀 QUICKEST FIX: Railway Shell (No Dependencies!)

The **easiest way** to fix the balance is using Railway's built-in shell:

1. Go to: https://railway.app → `iab-options-bot` → `web` service
2. Click **Deployments** → Click active deployment → **Shell** button
3. Run this command:

```bash
bash fix_balance_railway_shell.sh
```

Or paste this Python code directly:

```python
from app import create_app, db
from models.user import User

app = create_app()
with app.app_context():
    users = User.query.filter(User.paper_balance.isnot(None)).all()
    for user in users:
        if user.paper_balance < 0:
            print(f"Fixing User {user.id}: ${user.paper_balance:,.2f} → $100,000")
            user.paper_balance = 100000.00
    db.session.commit()
    print("✅ Fixed all negative balances")
```

---

## 📊 SQL Method (Direct Database Access)

If you have direct database access:

1. Go to Railway Dashboard → `iab-options-bot` → `Postgres` database
2. Click **Data** tab → **Query** button
3. Paste the contents of `fix_balance_railway.sql`
4. Click **Run**

This shows detailed diagnostics before fixing.

---

## 🐍 Simple Python Script (Minimal Dependencies)

If you want to run locally with minimal setup:

```bash
# Set DATABASE_URL (get it from Railway environment variables)
export DATABASE_URL="postgresql://user:pass@host:port/db"

# Run (only needs psycopg2-binary)
python3 fix_balance_simple.py
```

This script only requires `psycopg2-binary` (install with `pip install psycopg2-binary`).

---

## Quick Fix: Run on Railway (Full Scripts)

The easiest way to run these scripts is directly on Railway:

1. Go to Railway Dashboard: https://railway.app
2. Select your project: **iab-options-bot**
3. Click on the **web** service
4. Click **Deployments** tab
5. Click **Open Shell** (terminal icon)
6. Run any of the scripts:

```bash
# Check and fix paper balance
python3 check_paper_account.py

# Analyze positions
python3 analyze_positions.py

# Analyze trades
python3 analyze_trades.py

# Fix balance manually
python3 fix_paper_balance.py
```

---

## Run Locally (Alternative)

If you want to run locally, first install dependencies:

```bash
# Install all dependencies
pip install -r requirements.txt

# Then run scripts
python3 check_paper_account.py
```

---

## Scripts Overview

### 1. `check_paper_account.py`
**Purpose:** Check current paper balance and auto-fix negative balances

**What it does:**
- Lists all paper trading users
- Shows current balance for each
- Auto-resets negative balances to $100,000

**Usage:**
```bash
python3 check_paper_account.py
```

---

### 2. `analyze_positions.py`
**Purpose:** Analyze open positions to find cost basis issues

**What it does:**
- Lists all open positions
- Calculates total cost basis
- Shows if positions are causing negative balance

**Usage:**
```bash
python3 analyze_positions.py
```

---

### 3. `analyze_trades.py`
**Purpose:** Analyze trade history to find calculation errors

**What it does:**
- Recalculates balance from trade history
- Checks if option multiplier (×100) was applied correctly
- Compares calculated vs. actual balance
- Identifies problematic trades

**Usage:**
```bash
python3 analyze_trades.py
```

---

### 4. `fix_paper_balance.py`
**Purpose:** Interactive script to fix paper balance

**What it does:**
- Shows multiple fix options
- Allows you to choose how to fix
- Resets balance to $100,000

**Usage:**
```bash
python3 fix_paper_balance.py
```

---

## Recommended Workflow

1. **First, check the balance:**
   ```bash
   python3 check_paper_account.py
   ```
   This will auto-fix if negative.

2. **If balance is still wrong, analyze trades:**
   ```bash
   python3 analyze_trades.py
   ```
   This will show you where the error occurred.

3. **Check positions:**
   ```bash
   python3 analyze_positions.py
   ```
   This will show if open positions are causing issues.

---

## Expected Output

### check_paper_account.py
```
Paper Trading Users:
================================================================================
User ID: 1
Username: user@example.com
Email: user@example.com
Trading Mode: paper
Paper Balance: $-8,976,640.50
Status: ❌ NEGATIVE!

⚠️  FIXING NEGATIVE BALANCE...
✅ Reset from $-8,976,640.50 to $100,000.00
```

### analyze_trades.py
```
Trade History Analysis (50 trades)
--------------------------------------------------------------------------------
Summary:
  Starting Balance: $100,000.00
  Total Buy Cost: $107,664.50
  Total Sell Proceeds: $0.00
  Calculated Balance: $-7,664.50
  Actual Balance: $-8,976,640.50
  Difference: $-8,969,976.00

⚠️  ERROR: Balance mismatch!
```

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'apscheduler'"
**Solution:** Install dependencies:
```bash
pip install -r requirements.txt
```

Or run the script on Railway (see "Quick Fix" above).

### "Connection refused" or database errors
**Solution:** Make sure DATABASE_URL environment variable is set:
```bash
export DATABASE_URL="your-database-url"
```

Or run on Railway where environment variables are automatically set.

---

## After Fixing Balance

Once the balance is fixed:

1. The system will now validate balance before trades
2. Negative balances will auto-reset to $100,000
3. All future trades will check sufficient balance

The fix is permanent - validation is now built into `services/trade_executor.py`.

