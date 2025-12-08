#!/usr/bin/env python3
"""
Recalculate P/L for all existing positions with the correct 100 multiplier for options.
This script fixes positions that were created before the P/L calculation fix.
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models.position import Position
from services.position_monitor import PositionMonitor

# Import app creation function
def create_app():
    from app import create_app
    return create_app()

def recalculate_all_positions():
    """Recalculate P/L for all open positions"""
    app = create_app()
    with app.app_context():
        from app import db
        monitor = PositionMonitor()
        
        # Get all open positions
        positions = db.session.query(Position).filter_by(status='open').all()
        
        print(f"Found {len(positions)} open positions to recalculate...")
        
        updated_count = 0
        for position in positions:
            try:
                # Check if it's an option
                is_option = (
                    (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
                    bool(position.option_symbol) or
                    (position.expiration_date and position.strike_price is not None)
                )
                
                if is_option and position.current_price and position.entry_price:
                    # Recalculate with 100 multiplier
                    contract_multiplier = 100
                    old_pnl = position.unrealized_pnl or 0
                    new_pnl = (position.current_price - position.entry_price) * position.quantity * contract_multiplier
                    
                    position.unrealized_pnl = new_pnl
                    
                    if position.entry_price > 0:
                        position.unrealized_pnl_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100
                    
                    print(f"Position {position.id} ({position.symbol}): ${old_pnl:.2f} -> ${new_pnl:.2f}")
                    updated_count += 1
                elif not is_option and position.current_price and position.entry_price:
                    # For stocks, recalculate without multiplier (should already be correct, but let's be sure)
                    old_pnl = position.unrealized_pnl or 0
                    new_pnl = (position.current_price - position.entry_price) * position.quantity
                    
                    position.unrealized_pnl = new_pnl
                    
                    if position.entry_price > 0:
                        position.unrealized_pnl_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100
                    
                    print(f"Position {position.id} ({position.symbol} - STOCK): ${old_pnl:.2f} -> ${new_pnl:.2f}")
                    updated_count += 1
                else:
                    print(f"Position {position.id} ({position.symbol}): Skipping - missing price data")
                    
            except Exception as e:
                print(f"Error updating position {position.id}: {e}")
                continue
        
        # Commit all changes
        db.session.commit()
        print(f"\n✅ Successfully recalculated {updated_count} positions!")
        print(f"Total positions processed: {len(positions)}")

if __name__ == '__main__':
    recalculate_all_positions()

