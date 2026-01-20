#!/usr/bin/env python3
"""Simple balance fix - minimal dependencies (only psycopg2 needed)

Usage:
    # Set DATABASE_URL environment variable
    export DATABASE_URL="postgresql://user:pass@host:port/db"
    
    # Run script
    python3 fix_balance_simple.py

Or on Railway:
    Railway Dashboard → web service → Deployments → Shell
    python3 fix_balance_simple.py
"""

import os
import sys
from datetime import datetime

# Try to import psycopg2 (should be available on Railway)
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print("=" * 80)
    print("❌ Missing psycopg2 module!")
    print("=" * 80)
    print("Install it with: pip install psycopg2-binary")
    print("Or run this script on Railway where psycopg2 is already installed")
    print("=" * 80)
    sys.exit(1)

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("=" * 80)
    print("❌ DATABASE_URL not found in environment")
    print("=" * 80)
    print("Set it with: export DATABASE_URL='your-db-url'")
    print("On Railway, DATABASE_URL is automatically set")
    print("=" * 80)
    sys.exit(1)

print("=" * 80)
print("PAPER BALANCE DIAGNOSTIC & FIX")
print("=" * 80)
print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Step 1: Check current balances
    print("STEP 1: Current Balances")
    print("-" * 80)
    cur.execute("""
        SELECT id, email, paper_balance, trading_mode
        FROM users
        WHERE paper_balance IS NOT NULL
        ORDER BY paper_balance ASC
    """)
    
    users = cur.fetchall()
    if not users:
        print("❌ No users with paper_balance found")
    else:
        negative_count = 0
        for user in users:
            balance = float(user['paper_balance'])
            status = "❌ NEGATIVE" if balance < 0 else "⚠️ LOW" if balance < 10000 else "✅ OK"
            if balance < 0:
                negative_count += 1
            print(f"User {user['id']} ({user['email']}): ${balance:,.2f} {status}")
        
        if negative_count > 0:
            print(f"\n⚠️  Found {negative_count} user(s) with negative balance")
    
    print()
    
    # Step 2: Check positions
    print("STEP 2: Open Positions Analysis")
    print("-" * 80)
    cur.execute("""
        SELECT 
            COUNT(*) as count,
            COALESCE(SUM(entry_price * quantity * 100), 0) as total_cost,
            COALESCE(SUM(COALESCE(current_price, entry_price) * quantity * 100), 0) as total_value
        FROM positions
        WHERE status = 'open'
    """)
    
    result = cur.fetchone()
    count = result['count'] or 0
    total_cost = float(result['total_cost'] or 0)
    total_value = float(result['total_value'] or 0)
    total_pnl = total_value - total_cost
    
    print(f"Open Positions: {count}")
    print(f"Total Cost Basis: ${total_cost:,.2f}")
    print(f"Total Current Value: ${total_value:,.2f}")
    print(f"Total P/L: ${total_pnl:,.2f}")
    
    if total_cost > 100000:
        print(f"\n⚠️  WARNING: Total position cost (${total_cost:,.2f}) exceeds starting balance!")
        print(f"   This could cause negative balances.")
    
    print()
    
    # Step 3: Recent trades
    print("STEP 3: Recent Trades (Last 5)")
    print("-" * 80)
    cur.execute("""
        SELECT symbol, action, quantity, price, 
               (price * quantity * 100) as amount, 
               created_at
        FROM trades
        ORDER BY created_at DESC
        LIMIT 5
    """)
    
    trades = cur.fetchall()
    if trades:
        for trade in trades:
            amount = float(trade['amount'] or 0)
            print(f"{trade['symbol']} {trade['action']} x{trade['quantity']} @ ${trade['price']:.2f} = ${amount:,.2f} ({trade['created_at']})")
    else:
        print("No trades found")
    
    print()
    
    # Step 4: Fix negative balances
    print("STEP 4: Fixing Negative Balances")
    print("-" * 80)
    cur.execute("""
        UPDATE users
        SET paper_balance = 100000.00
        WHERE paper_balance < 0
        RETURNING id, email, 100000.00 as new_balance
    """)
    
    fixed = cur.fetchall()
    if fixed:
        for user in fixed:
            print(f"✅ Fixed User {user['id']} ({user['email']}): Reset to ${user['new_balance']:,.2f}")
        conn.commit()
        print(f"\n✅ Fixed {len(fixed)} user(s)")
    else:
        print("✅ No negative balances found - nothing to fix")
    
    print()
    
    # Step 5: Verify
    print("STEP 5: Final Balances")
    print("-" * 80)
    cur.execute("""
        SELECT id, email, paper_balance
        FROM users
        WHERE paper_balance IS NOT NULL
        ORDER BY paper_balance DESC
    """)
    
    final_users = cur.fetchall()
    for user in final_users:
        balance = float(user['paper_balance'])
        print(f"User {user['id']} ({user['email']}): ${balance:,.2f} ✅")
    
    print()
    print("=" * 80)
    print("✅ DIAGNOSTIC COMPLETE")
    print("=" * 80)
    
    cur.close()
    conn.close()
    
except psycopg2.Error as e:
    print(f"❌ Database Error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

