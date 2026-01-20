#!/usr/bin/env python3
"""Analyze positions to find why balance is negative"""

import sys
import os

try:
    from app import create_app, db
    from models.position import Position
    from models.user import User
except ImportError as e:
    print("=" * 80)
    print("❌ Missing dependencies!")
    print("=" * 80)
    print(f"Error: {e}")
    print()
    print("To install dependencies, run:")
    print("  pip install -r requirements.txt")
    print()
    print("Or run this script on Railway:")
    print("  Railway Dashboard → Deployments → Open Shell")
    print("=" * 80)
    sys.exit(1)

app = create_app()

with app.app_context():
    # Get all users
    users = User.query.all()
    
    for user in users:
        if user.trading_mode != 'paper':
            continue
            
        print(f"\n{'=' * 80}")
        print(f"User: {user.username} (ID: {user.id})")
        print(f"Paper Balance: ${user.paper_balance:,.2f}")
        print(f"{'=' * 80}")
        
        # Get all positions for this user
        positions = Position.query.filter_by(user_id=user.id, status='open').all()
        
        if not positions:
            print("No open positions")
            continue
        
        print(f"\nOpen Positions Analysis ({len(positions)} positions)")
        print("-" * 80)
        
        total_cost = 0
        total_value = 0
        
        for pos in positions:
            # Calculate cost basis (what was paid)
            cost = pos.entry_price * pos.quantity * 100  # Options are 100 shares per contract
            
            # Calculate current value
            current_value = (pos.current_price or pos.entry_price) * pos.quantity * 100
            
            pnl = current_value - cost
            pnl_percent = (pnl / cost * 100) if cost > 0 else 0
            
            print(f"\n{pos.symbol} {pos.contract_type} ${pos.strike_price} exp {pos.expiration_date}")
            print(f"  Entry: ${pos.entry_price:.2f} x {pos.quantity} contracts = ${cost:,.2f}")
            print(f"  Current: ${pos.current_price:.2f} x {pos.quantity} contracts = ${current_value:,.2f}")
            print(f"  P/L: ${pnl:,.2f} ({pnl_percent:+.1f}%)")
            
            total_cost += cost
            total_value += current_value
        
        print("\n" + "-" * 80)
        print(f"Total Cost Basis: ${total_cost:,.2f}")
        print(f"Total Current Value: ${total_value:,.2f}")
        print(f"Total P/L: ${total_value - total_cost:,.2f}")
        print()
        
        # Check if total cost > starting balance
        starting_balance = 100000.0
        expected_balance = starting_balance - total_cost
        print(f"Starting Balance: ${starting_balance:,.2f}")
        print(f"Expected Balance (after positions): ${expected_balance:,.2f}")
        print(f"Actual Balance: ${user.paper_balance:,.2f}")
        print(f"Difference: ${user.paper_balance - expected_balance:,.2f}")
        
        if total_cost > starting_balance:
            print("\n⚠️  WARNING: Total position cost exceeds starting balance!")
            print(f"   This would cause a negative balance.")
        
        if abs(user.paper_balance - expected_balance) > 100:
            print("\n⚠️  WARNING: Balance mismatch detected!")
            print(f"   The balance doesn't match expected value.")
            print(f"   This suggests a calculation error in trade execution.")

