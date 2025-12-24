#!/usr/bin/env python3
"""
Diagnostic script to investigate incorrect P/L calculations
Checks actual entry prices vs exit prices for closed trades
"""

from app import create_app, db
from models.trade import Trade
from models.position import Position
from datetime import datetime

def diagnose_trades():
    """Analyze recent trades to find P/L calculation issues"""
    app = create_app()
    
    with app.app_context():
        # Get recent SELL trades (position closes)
        recent_sells = db.session.query(Trade).filter(
            Trade.action == 'sell',
            Trade.contract_type.in_(['call', 'put', 'option']),
            Trade.realized_pnl.isnot(None)
        ).order_by(Trade.trade_date.desc()).limit(10).all()
        
        print("=" * 80)
        print("DIAGNOSING TRADE P/L CALCULATIONS")
        print("=" * 80)
        print()
        
        for sell_trade in recent_sells:
            print(f"SELL Trade ID: {sell_trade.id}")
            print(f"  Symbol: {sell_trade.symbol}")
            print(f"  Option Symbol: {sell_trade.option_symbol}")
            print(f"  Contract Type: {sell_trade.contract_type}")
            print(f"  Strike: ${sell_trade.strike_price}")
            print(f"  Quantity: {sell_trade.quantity}")
            print(f"  Exit Price: ${sell_trade.price}")
            print(f"  Exit Date: {sell_trade.trade_date}")
            print(f"  Realized P/L: ${sell_trade.realized_pnl}")
            print(f"  Realized P/L %: {sell_trade.realized_pnl_percent}%")
            print()
            
            # Find the corresponding BUY trade
            buy_trade = db.session.query(Trade).filter(
                Trade.symbol == sell_trade.symbol,
                Trade.option_symbol == sell_trade.option_symbol,
                Trade.action == 'buy',
                Trade.trade_date < sell_trade.trade_date
            ).order_by(Trade.trade_date.desc()).first()
            
            if buy_trade:
                print(f"  MATCHING BUY Trade ID: {buy_trade.id}")
                print(f"    Entry Price: ${buy_trade.price}")
                print(f"    Entry Date: {buy_trade.trade_date}")
                print(f"    Quantity: {buy_trade.quantity}")
                print()
                
                # Calculate what P/L should be
                is_option = sell_trade.contract_type and sell_trade.contract_type.lower() in ['call', 'put', 'option']
                contract_multiplier = 100 if is_option else 1
                
                expected_pnl = (sell_trade.price - buy_trade.price) * sell_trade.quantity * contract_multiplier
                expected_pnl_percent = ((sell_trade.price - buy_trade.price) / buy_trade.price * 100) if buy_trade.price > 0 else 0
                
                print(f"  CALCULATION CHECK:")
                print(f"    Entry Price: ${buy_trade.price}")
                print(f"    Exit Price: ${sell_trade.price}")
                print(f"    Price Diff: ${sell_trade.price - buy_trade.price}")
                print(f"    Quantity: {sell_trade.quantity}")
                print(f"    Contract Multiplier: {contract_multiplier}")
                print(f"    Expected P/L: ${expected_pnl:.2f}")
                print(f"    Actual P/L: ${sell_trade.realized_pnl}")
                print(f"    Difference: ${abs(expected_pnl - sell_trade.realized_pnl):.2f}")
                print(f"    Expected P/L %: {expected_pnl_percent:.2f}%")
                print(f"    Actual P/L %: {sell_trade.realized_pnl_percent}%")
                print()
                
                # Check if entry price seems wrong
                if is_option:
                    # For options, prices should typically be in a reasonable range
                    # QQQ options with $625 strike should cost more than $1-2
                    if buy_trade.price < 1.0:
                        print(f"  ⚠️  WARNING: Entry price ${buy_trade.price} seems too low for an option!")
                        print(f"     This might indicate the price was stored incorrectly (maybe divided by 100?)")
                    elif buy_trade.price < 10.0 and sell_trade.price > 100.0:
                        print(f"  ⚠️  WARNING: Large discrepancy between entry (${buy_trade.price}) and exit (${sell_trade.price})!")
                        print(f"     Entry might be in 'per share' format while exit is in 'per contract' format")
                
            else:
                print(f"  ⚠️  No matching BUY trade found!")
            
            print("-" * 80)
            print()
        
        # Also check positions that were closed
        closed_positions = db.session.query(Position).filter(
            Position.status == 'closed',
            Position.contract_type.in_(['call', 'put', 'option'])
        ).order_by(Position.entry_date.desc()).limit(5).all()
        
        print("=" * 80)
        print("CLOSED POSITIONS ANALYSIS")
        print("=" * 80)
        print()
        
        for position in closed_positions:
            print(f"Position ID: {position.id}")
            print(f"  Symbol: {position.symbol}")
            print(f"  Entry Price: ${position.entry_price}")
            print(f"  Current Price: ${position.current_price}")
            print(f"  Quantity: {position.quantity}")
            print(f"  Unrealized P/L: ${position.unrealized_pnl}")
            print(f"  Unrealized P/L %: {position.unrealized_pnl_percent}%")
            print()
            
            # Check if prices seem reasonable
            if position.entry_price < 1.0 and position.current_price > 100.0:
                print(f"  ⚠️  WARNING: Entry price ${position.entry_price} is very low compared to current ${position.current_price}")
                print(f"     This suggests entry price might have been stored incorrectly")
            print("-" * 80)
            print()

if __name__ == '__main__':
    diagnose_trades()

