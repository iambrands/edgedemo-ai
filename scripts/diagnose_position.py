#!/usr/bin/env python3
"""
Diagnostic script to investigate why a position hasn't been updated.
Run this to check a specific position's update status.
"""

import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from models.position import Position
from services.position_monitor import PositionMonitor
from services.tradier_connector import TradierConnector

def diagnose_position(symbol: str = 'META', contract_type: str = 'PUT'):
    """Diagnose why a position hasn't been updated"""
    
    app = create_app()
    with app.app_context():
        # Find the position
        positions = db.session.query(Position).filter_by(
            symbol=symbol,
            contract_type=contract_type,
            status='open'
        ).all()
        
        if not positions:
            print(f"❌ No open {contract_type} positions found for {symbol}")
            return
        
        print(f"🔍 Found {len(positions)} open {contract_type} position(s) for {symbol}\n")
        
        for position in positions:
            print(f"Position ID: {position.id}")
            print(f"Symbol: {position.symbol}")
            print(f"Contract Type: {position.contract_type}")
            print(f"Strike: ${position.strike_price}")
            print(f"Expiration: {position.expiration_date}")
            print(f"Entry Date: {position.entry_date}")
            print(f"Last Updated: {position.last_updated}")
            print(f"Entry Price: ${position.entry_price}")
            print(f"Current Price: ${position.current_price}")
            print(f"Option Symbol: {position.option_symbol}")
            print()
            
            # Calculate time since last update
            if position.last_updated:
                time_since_update = datetime.utcnow() - position.last_updated
                print(f"⏰ Time since last update: {time_since_update.total_seconds() / 3600:.1f} hours ({time_since_update.days} days)")
            else:
                print("⏰ Last updated: NEVER")
            
            # Check if price is stale
            if position.entry_date:
                time_since_creation = datetime.utcnow() - position.entry_date
                print(f"📅 Position age: {time_since_creation.days} days")
            
            print()
            
            # Try to update the position
            print("🔄 Attempting to update position...")
            try:
                monitor = PositionMonitor()
                old_price = position.current_price
                old_updated = position.last_updated
                
                monitor.update_position_data(position, force_update=True)
                db.session.refresh(position)
                db.session.commit()
                
                new_price = position.current_price
                new_updated = position.last_updated
                
                print(f"✅ Update attempt completed")
                print(f"   Old price: ${old_price}")
                print(f"   New price: ${new_price}")
                print(f"   Price changed: {old_price != new_price}")
                print(f"   Old last_updated: {old_updated}")
                print(f"   New last_updated: {new_updated}")
                
                # Check if we can find the option in the chain
                if position.expiration_date and position.strike_price:
                    print()
                    print("🔍 Checking options chain...")
                    tradier = TradierConnector()
                    expiration_str = position.expiration_date.strftime('%Y-%m-%d')
                    chain = tradier.get_options_chain(position.symbol, expiration_str)
                    
                    print(f"   Chain length: {len(chain) if isinstance(chain, list) else 'N/A'}")
                    
                    # Look for matching option
                    position_strike = float(position.strike_price)
                    found = False
                    for option in chain[:20]:  # Check first 20
                        option_strike = option.get('strike') or option.get('strike_price')
                        option_type = option.get('type') or option.get('contract_type')
                        try:
                            option_strike_float = float(option_strike) if option_strike else None
                            if option_strike_float and abs(option_strike_float - position_strike) < 0.01:
                                if (option_type or '').lower() == (position.contract_type or '').lower():
                                    found = True
                                    bid = option.get('bid', 0) or 0
                                    ask = option.get('ask', 0) or 0
                                    last = option.get('last', 0) or 0
                                    print(f"   ✅ Found matching option:")
                                    print(f"      Strike: ${option_strike_float}")
                                    print(f"      Type: {option_type}")
                                    print(f"      Bid: ${bid}")
                                    print(f"      Ask: ${ask}")
                                    print(f"      Last: ${last}")
                                    break
                        except:
                            continue
                    
                    if not found:
                        print(f"   ❌ Could not find matching option in chain")
                        print(f"      Looking for: {position.contract_type} ${position_strike}")
                        print(f"      Available strikes (first 10):")
                        strikes = []
                        for opt in chain[:50]:
                            strike = opt.get('strike') or opt.get('strike_price')
                            opt_type = opt.get('type') or opt.get('contract_type')
                            if strike and (opt_type or '').lower() == (position.contract_type or '').lower():
                                strikes.append(float(strike))
                        strikes = sorted(set(strikes))[:10]
                        print(f"      {strikes}")
                
            except Exception as e:
                print(f"❌ Error updating position: {e}")
                import traceback
                traceback.print_exc()
            
            print("\n" + "="*60 + "\n")

if __name__ == '__main__':
    symbol = sys.argv[1] if len(sys.argv) > 1 else 'META'
    contract_type = sys.argv[2] if len(sys.argv) > 2 else 'PUT'
    diagnose_position(symbol, contract_type)

