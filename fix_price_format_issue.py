#!/usr/bin/env python3
"""
Script to identify and potentially fix price format issues in trades/positions
Option prices should be stored consistently - either all in "per share" or all in "per contract"
"""

from app import create_app, db
from models.trade import Trade
from models.position import Position
from sqlalchemy import and_

def analyze_price_formats():
    """Analyze if there are price format inconsistencies"""
    app = create_app()
    
    with app.app_context():
        print("=" * 80)
        print("ANALYZING PRICE FORMAT ISSUES")
        print("=" * 80)
        print()
        
        # Get all option trades
        option_trades = db.session.query(Trade).filter(
            Trade.contract_type.in_(['call', 'put', 'option']),
            Trade.option_symbol.isnot(None)
        ).order_by(Trade.trade_date.desc()).limit(20).all()
        
        print(f"Found {len(option_trades)} option trades")
        print()
        
        suspicious_trades = []
        
        for trade in option_trades:
            # Check if price seems wrong
            # Option premiums are typically between $0.01 and $100 per share
            # If we see prices > $100, they might be in "per contract" format (should be divided by 100)
            # If we see prices < $0.10 for expensive stocks, they might be wrong
            
            is_suspicious = False
            reason = ""
            
            if trade.price > 100.0:
                is_suspicious = True
                reason = f"Price ${trade.price} is very high for an option premium (might be per-contract instead of per-share)"
            elif trade.price < 0.10 and trade.strike_price and trade.strike_price > 50:
                is_suspicious = True
                reason = f"Price ${trade.price} is very low for an option on a stock with strike ${trade.strike_price}"
            
            if is_suspicious:
                suspicious_trades.append((trade, reason))
                print(f"Trade ID {trade.id}: {trade.symbol} {trade.contract_type} {trade.strike_price}")
                print(f"  Action: {trade.action}")
                print(f"  Price: ${trade.price}")
                print(f"  Strike: ${trade.strike_price}")
                print(f"  Date: {trade.trade_date}")
                print(f"  ⚠️  {reason}")
                print()
        
        print(f"\nFound {len(suspicious_trades)} suspicious trades")
        print()
        
        # Check positions
        print("=" * 80)
        print("CHECKING POSITIONS")
        print("=" * 80)
        print()
        
        option_positions = db.session.query(Position).filter(
            Position.contract_type.in_(['call', 'put', 'option']),
            Position.option_symbol.isnot(None)
        ).all()
        
        suspicious_positions = []
        
        for position in option_positions:
            is_suspicious = False
            reason = ""
            
            if position.entry_price > 100.0:
                is_suspicious = True
                reason = f"Entry price ${position.entry_price} is very high for an option premium"
            elif position.entry_price < 0.10 and position.strike_price and position.strike_price > 50:
                is_suspicious = True
                reason = f"Entry price ${position.entry_price} is very low for an option"
            
            if position.current_price and position.entry_price:
                # Check if there's a huge discrepancy
                if position.current_price > position.entry_price * 10:
                    is_suspicious = True
                    reason += f" | Large price jump: entry ${position.entry_price} -> current ${position.current_price}"
            
            if is_suspicious:
                suspicious_positions.append((position, reason))
                print(f"Position ID {position.id}: {position.symbol} {position.contract_type} {position.strike_price}")
                print(f"  Entry Price: ${position.entry_price}")
                print(f"  Current Price: ${position.current_price}")
                print(f"  ⚠️  {reason}")
                print()
        
        print(f"\nFound {len(suspicious_positions)} suspicious positions")
        print()
        
        # Summary
        print("=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Total suspicious trades: {len(suspicious_trades)}")
        print(f"Total suspicious positions: {len(suspicious_positions)}")
        print()
        print("RECOMMENDATION:")
        print("Option prices should be stored in 'per share' format (e.g., $3.57 for a $357 option).")
        print("If prices are stored in 'per contract' format, they need to be divided by 100.")
        print("If prices are stored in 'per share' format but exit prices are fetched differently,")
        print("there will be a mismatch causing incorrect P/L calculations.")

if __name__ == '__main__':
    analyze_price_formats()

