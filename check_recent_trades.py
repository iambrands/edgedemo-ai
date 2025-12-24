#!/usr/bin/env python3
"""
Check recent trades to find the correct date format
"""

from app import create_app, db
from models.trade import Trade
from datetime import datetime, date

def check_recent_trades():
    """Check recent trades"""
    app = create_app()
    
    with app.app_context():
        # Get all recent SELL trades
        recent_sells = db.session.query(Trade).filter(
            Trade.action == 'sell'
        ).order_by(Trade.trade_date.desc()).limit(20).all()
        
        print("=" * 80)
        print("RECENT SELL TRADES")
        print("=" * 80)
        print()
        
        for trade in recent_sells:
            trade_date = trade.trade_date
            trade_date_only = trade_date.date() if isinstance(trade_date, datetime) else trade_date
            
            print(f"Trade ID: {trade.id}")
            print(f"  Symbol: {trade.symbol}")
            print(f"  Action: {trade.action}")
            print(f"  Trade Date (full): {trade.trade_date}")
            print(f"  Trade Date (date only): {trade_date_only}")
            print(f"  Price: ${trade.price}")
            print(f"  Realized P/L: ${trade.realized_pnl}")
            print(f"  Realized P/L %: {trade.realized_pnl_percent}")
            print()
        
        # Check for December 2025 trades
        print("=" * 80)
        print("DECEMBER 2025 SELL TRADES")
        print("=" * 80)
        print()
        
        dec_sells = db.session.query(Trade).filter(
            Trade.action == 'sell',
            db.func.extract('year', Trade.trade_date) == 2025,
            db.func.extract('month', Trade.trade_date) == 12
        ).order_by(Trade.trade_date.desc()).all()
        
        print(f"Found {len(dec_sells)} SELL trades in December 2025")
        print()
        
        for trade in dec_sells:
            trade_date = trade.trade_date
            trade_date_only = trade_date.date() if isinstance(trade_date, datetime) else trade_date
            
            print(f"Trade ID: {trade.id}")
            print(f"  Date: {trade_date_only}")
            print(f"  Symbol: {trade.symbol}")
            print(f"  Option Symbol: {trade.option_symbol}")
            print(f"  Quantity: {trade.quantity}")
            print(f"  Price: ${trade.price}")
            print(f"  Realized P/L: ${trade.realized_pnl}")
            print()

if __name__ == '__main__':
    check_recent_trades()

