#!/usr/bin/env python3
"""
One-time script to fix paper trading balance for option trades
Recalculates option trade costs (multiply by 100) and updates user balance
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models.user import User
from models.trade import Trade
from datetime import datetime

def fix_paper_balance():
    """Recalculate paper balance for all users based on their option trades"""
    app = create_app()
    
    with app.app_context():
        # Get all users with paper trading mode
        users = User.query.filter_by(trading_mode='paper').all()
        
        print(f"Found {len(users)} paper trading users")
        print("=" * 60)
        
        for user in users:
            print(f"\nProcessing user: {user.username} (ID: {user.id})")
            print(f"Current balance: ${user.paper_balance:,.2f}")
            
            # Get all buy trades for this user
            trades = Trade.query.filter_by(
                user_id=user.id,
                action='buy'
            ).order_by(Trade.trade_date).all()
            
            print(f"Found {len(trades)} buy trades")
            
            # Calculate what should have been deducted
            total_should_deduct = 0
            total_actually_deducted = 0
            option_trades = []
            
            for trade in trades:
                # Check if it's an option trade
                is_option = bool(
                    trade.option_symbol or
                    (trade.contract_type and trade.contract_type.lower() in ['call', 'put', 'option']) or
                    (trade.expiration_date and trade.strike_price)
                )
                
                if is_option:
                    # Should have been: price * quantity * 100
                    correct_cost = trade.price * trade.quantity * 100
                    # Actually deducted: price * quantity * 1 (wrong calculation)
                    wrong_cost = trade.price * trade.quantity
                    
                    total_should_deduct += correct_cost
                    total_actually_deducted += wrong_cost
                    
                    option_trades.append({
                        'id': trade.id,
                        'symbol': trade.symbol,
                        'date': trade.trade_date,
                        'quantity': trade.quantity,
                        'price': trade.price,
                        'correct_cost': correct_cost,
                        'wrong_cost': wrong_cost,
                        'difference': correct_cost - wrong_cost
                    })
                    
                    print(f"  Trade #{trade.id}: {trade.symbol} - {trade.quantity} contracts @ ${trade.price:.2f}")
                    print(f"    Should have cost: ${correct_cost:,.2f}")
                    print(f"    Actually cost: ${wrong_cost:,.2f}")
                    print(f"    Difference: ${correct_cost - wrong_cost:,.2f}")
            
            if option_trades:
                # Calculate the correction needed
                correction = total_should_deduct - total_actually_deducted
                print(f"\n  Total should have deducted: ${total_should_deduct:,.2f}")
                print(f"  Total actually deducted: ${total_actually_deducted:,.2f}")
                print(f"  Correction needed: ${correction:,.2f}")
                
                # Update balance
                original_balance = user.paper_balance
                # Add back what was incorrectly deducted, then deduct the correct amount
                user.paper_balance = user.paper_balance + total_actually_deducted - total_should_deduct
                
                print(f"\n  Balance before: ${original_balance:,.2f}")
                print(f"  Balance after: ${user.paper_balance:,.2f}")
                print(f"  Change: ${user.paper_balance - original_balance:,.2f}")
                
                # Save changes
                db.session.commit()
                print(f"  ✅ Balance updated successfully!")
            else:
                print("  No option trades found for this user")
            
            print("-" * 60)
        
        print("\n✅ Paper balance fix completed!")

if __name__ == '__main__':
    fix_paper_balance()

