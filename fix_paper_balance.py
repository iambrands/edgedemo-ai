#!/usr/bin/env python3
"""Fix paper trading balance - reset to $100,000 and recalculate"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models.user import User
from models.position import Position
from models.trade import Trade

app = create_app()

with app.app_context():
    users = User.query.filter_by(trading_mode='paper').all()
    
    if not users:
        print("❌ No paper trading users found!")
        sys.exit(1)
    
    print("Fixing Paper Trading Balances")
    print("=" * 80)
    
    for user in users:
        print(f"\nUser: {user.username} (ID: {user.id})")
        print(f"Current Balance: ${user.paper_balance:,.2f}")
        
        if user.paper_balance >= 0:
            print("✅ Balance is positive, skipping...")
            continue
        
        print("⚠️  Negative balance detected!")
        
        # Option 1: Simple reset to $100,000
        print("\nOption 1: Simple reset to $100,000")
        print("  This will reset balance without recalculating positions")
        
        # Option 2: Recalculate from trades
        print("\nOption 2: Recalculate from trade history")
        trades = Trade.query.filter_by(user_id=user.id).order_by(Trade.executed_at).all()
        
        if trades:
            starting_balance = 100000.0
            calculated_balance = starting_balance
            
            for trade in trades:
                is_option = bool(
                    trade.option_symbol or
                    (trade.contract_type and trade.contract_type.lower() in ['call', 'put', 'option']) or
                    (trade.expiration_date and trade.strike_price is not None)
                )
                multiplier = 100 if is_option else 1
                trade_value = trade.price * trade.quantity * multiplier
                
                if trade.action.lower() == 'buy':
                    calculated_balance -= trade_value
                else:  # sell
                    calculated_balance += trade_value
            
            print(f"  Calculated balance from trades: ${calculated_balance:,.2f}")
            
            # Option 3: Recalculate from open positions
            print("\nOption 3: Recalculate from open positions")
            positions = Position.query.filter_by(user_id=user.id, status='open').all()
            
            if positions:
                total_position_cost = sum(
                    pos.entry_price * pos.quantity * 100 
                    for pos in positions
                )
                balance_from_positions = 100000.0 - total_position_cost
                print(f"  Balance after positions: ${balance_from_positions:,.2f}")
        
        # Apply fix: Reset to $100,000
        print("\n✅ Applying fix: Resetting balance to $100,000.00")
        original_balance = user.paper_balance
        user.paper_balance = 100000.00
        db.session.commit()
        
        print(f"  Balance updated: ${original_balance:,.2f} → ${user.paper_balance:,.2f}")
    
    print("\n" + "=" * 80)
    print("✅ Paper balance fix completed!")
