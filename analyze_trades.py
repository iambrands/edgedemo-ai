#!/usr/bin/env python3
"""Analyze trades to find calculation errors"""

import sys
import os

try:
    from app import create_app, db
    from models.trade import Trade
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
    users = User.query.filter_by(trading_mode='paper').all()
    
    for user in users:
        print(f"\n{'=' * 80}")
        print(f"User: {user.username} (ID: {user.id})")
        print(f"Current Paper Balance: ${user.paper_balance:,.2f}")
        print(f"{'=' * 80}")
        
        # Get all trades for this user
        trades = Trade.query.filter_by(user_id=user.id).order_by(Trade.executed_at).all()
        
        if not trades:
            print("No trades found")
            continue
        
        print(f"\nTrade History Analysis ({len(trades)} trades)")
        print("-" * 80)
        
        starting_balance = 100000.0
        calculated_balance = starting_balance
        total_buy_cost = 0
        total_sell_proceeds = 0
        
        option_trades = []
        stock_trades = []
        
        for trade in trades:
            # Determine if it's an option
            is_option = bool(
                trade.option_symbol or
                (trade.contract_type and trade.contract_type.lower() in ['call', 'put', 'option']) or
                (trade.expiration_date and trade.strike_price is not None)
            )
            
            # Calculate trade cost/proceeds
            multiplier = 100 if is_option else 1
            trade_value = trade.price * trade.quantity * multiplier
            
            if trade.action.lower() == 'buy':
                calculated_balance -= trade_value
                total_buy_cost += trade_value
                direction = "BUY"
            else:  # sell
                calculated_balance += trade_value
                total_sell_proceeds += trade_value
                direction = "SELL"
            
            trade_type = "OPTION" if is_option else "STOCK"
            
            if is_option:
                option_trades.append({
                    'trade': trade,
                    'value': trade_value,
                    'direction': direction,
                    'multiplier': multiplier
                })
            
            print(f"\n{trade.executed_at.strftime('%Y-%m-%d %H:%M')} - {direction} {trade.quantity} {trade.symbol} {trade_type}")
            print(f"  Price: ${trade.price:.2f}, Quantity: {trade.quantity}, Multiplier: {multiplier}")
            print(f"  Trade Value: ${trade_value:,.2f}")
            print(f"  Balance After: ${calculated_balance:,.2f}")
        
        print("\n" + "-" * 80)
        print("Summary:")
        print(f"  Starting Balance: ${starting_balance:,.2f}")
        print(f"  Total Buy Cost: ${total_buy_cost:,.2f}")
        print(f"  Total Sell Proceeds: ${total_sell_proceeds:,.2f}")
        print(f"  Calculated Balance: ${calculated_balance:,.2f}")
        print(f"  Actual Balance: ${user.paper_balance:,.2f}")
        print(f"  Difference: ${user.paper_balance - calculated_balance:,.2f}")
        
        if abs(user.paper_balance - calculated_balance) > 1:
            print("\n⚠️  ERROR: Balance mismatch!")
            print(f"   The actual balance doesn't match calculated balance.")
            print(f"   This indicates a bug in trade execution logic.")
        
        if option_trades:
            print(f"\n⚠️  Found {len(option_trades)} option trades")
            print("   Checking if multiplier (100) was applied correctly...")
            
            for opt_trade in option_trades[:5]:  # Show first 5
                trade = opt_trade['trade']
                expected_value = trade.price * trade.quantity * 100
                actual_value = opt_trade['value']
                
                if abs(expected_value - actual_value) > 0.01:
                    print(f"   ❌ Trade {trade.id}: Expected ${expected_value:,.2f}, got ${actual_value:,.2f}")

