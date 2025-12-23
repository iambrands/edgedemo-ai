#!/usr/bin/env python3
"""
Execute the revert of incorrect SELL trades from 12/23/25
This script directly modifies the database to revert trades
"""

from app import create_app, db
from models.trade import Trade
from models.position import Position
from models.user import User
from datetime import datetime, date
from sqlalchemy import func

def execute_revert():
    """Execute the revert directly"""
    app = create_app()
    
    with app.app_context():
        print("=" * 80)
        print("REVERTING INCORRECT SELL TRADES FROM 12/23/25")
        print("=" * 80)
        print()
        
        # Find all SELL trades from 12/23/25
        target_date = date(2025, 12, 23)
        
        # Try exact date match first
        sell_trades = db.session.query(Trade).filter(
            Trade.action == 'sell',
            func.date(Trade.trade_date) == target_date
        ).order_by(Trade.trade_date).all()
        
        # If no exact match, try date range
        if not sell_trades:
            start_datetime = datetime(2025, 12, 23, 0, 0, 0)
            end_datetime = datetime(2025, 12, 23, 23, 59, 59)
            sell_trades = db.session.query(Trade).filter(
                Trade.action == 'sell',
                Trade.trade_date >= start_datetime,
                Trade.trade_date <= end_datetime
            ).order_by(Trade.trade_date).all()
        
        # If still no matches, get all recent SELL trades with high P/L
        if not sell_trades:
            print("⚠️  No exact matches for 12/23/25, looking for suspicious trades...")
            sell_trades = db.session.query(Trade).filter(
                Trade.action == 'sell',
                Trade.realized_pnl_percent.isnot(None),
                Trade.realized_pnl_percent >= 1000  # Very high P/L indicates incorrect sells
            ).order_by(Trade.trade_date.desc()).all()
        
        print(f"Found {len(sell_trades)} SELL trades to process")
        print()
        
        if not sell_trades:
            print("❌ No SELL trades found to revert.")
            return
        
        # Show what will be reverted
        print("Trades to be reverted:")
        for trade in sell_trades:
            trade_date = trade.trade_date.date() if isinstance(trade.trade_date, datetime) else trade.trade_date
            print(f"  - Trade ID {trade.id}: {trade.symbol} on {trade_date} - P/L: ${trade.realized_pnl} ({trade.realized_pnl_percent}%)")
        print()
        
        # Process each SELL trade
        positions_reopened = []
        trades_reverted = []
        balance_adjustments = {}
        
        for sell_trade in sell_trades:
            print(f"Processing Trade ID: {sell_trade.id}")
            print(f"  Symbol: {sell_trade.symbol}")
            print(f"  Option Symbol: {sell_trade.option_symbol}")
            print(f"  Quantity: {sell_trade.quantity}")
            print(f"  Price: ${sell_trade.price}")
            print(f"  Realized P/L: ${sell_trade.realized_pnl}")
            print()
            
            # Find corresponding closed position
            if sell_trade.option_symbol:
                position = db.session.query(Position).filter(
                    Position.user_id == sell_trade.user_id,
                    Position.option_symbol == sell_trade.option_symbol,
                    Position.status == 'closed'
                ).order_by(Position.entry_date.desc()).first()
            else:
                position = db.session.query(Position).filter(
                    Position.user_id == sell_trade.user_id,
                    Position.symbol == sell_trade.symbol,
                    Position.option_symbol == None,
                    Position.status == 'closed'
                ).order_by(Position.entry_date.desc()).first()
            
            if position:
                print(f"  ✅ Found closed position ID: {position.id}")
                print(f"     Entry Price: ${position.entry_price}")
                print(f"     Quantity: {position.quantity}")
                
                # Reopen position
                position.status = 'open'
                position.unrealized_pnl = None
                position.unrealized_pnl_percent = None
                position.current_price = position.entry_price
                positions_reopened.append(position.id)
                
                # Update position with current market price
                try:
                    from services.position_monitor import PositionMonitor
                    monitor = PositionMonitor()
                    monitor.update_position_data(position)
                    db.session.refresh(position)
                    print(f"     Updated current price: ${position.current_price}")
                except Exception as e:
                    print(f"     ⚠️  Could not update price: {e}")
                
                print(f"  ✅ Position {position.id} reopened")
            else:
                print(f"  ⚠️  No closed position found, looking for BUY trade...")
                # Try to recreate from BUY trade
                buy_trade = db.session.query(Trade).filter(
                    Trade.user_id == sell_trade.user_id,
                    Trade.symbol == sell_trade.symbol,
                    Trade.option_symbol == sell_trade.option_symbol,
                    Trade.action == 'buy',
                    Trade.trade_date < sell_trade.trade_date
                ).order_by(Trade.trade_date.desc()).first()
                
                if buy_trade:
                    print(f"  ✅ Found matching BUY trade ID: {buy_trade.id}")
                    print(f"     Entry Price: ${buy_trade.price}")
                    print(f"     Creating new position...")
                    
                    # Create new position from BUY trade
                    new_position = Position(
                        user_id=buy_trade.user_id,
                        symbol=buy_trade.symbol,
                        option_symbol=buy_trade.option_symbol,
                        contract_type=buy_trade.contract_type,
                        quantity=buy_trade.quantity,
                        entry_price=buy_trade.price,
                        current_price=buy_trade.price,
                        strike_price=buy_trade.strike_price,
                        expiration_date=buy_trade.expiration_date,
                        entry_delta=buy_trade.delta,
                        entry_gamma=buy_trade.gamma,
                        entry_theta=buy_trade.theta,
                        entry_vega=buy_trade.vega,
                        entry_iv=buy_trade.implied_volatility,
                        current_delta=buy_trade.delta,
                        current_gamma=buy_trade.gamma,
                        current_theta=buy_trade.theta,
                        current_vega=buy_trade.vega,
                        current_iv=buy_trade.implied_volatility,
                        status='open'
                    )
                    db.session.add(new_position)
                    db.session.flush()
                    positions_reopened.append(new_position.id)
                    
                    # Update position with current market price
                    try:
                        from services.position_monitor import PositionMonitor
                        monitor = PositionMonitor()
                        monitor.update_position_data(new_position)
                        db.session.refresh(new_position)
                        print(f"     Updated current price: ${new_position.current_price}")
                    except Exception as e:
                        print(f"     ⚠️  Could not update price: {e}")
                    
                    print(f"  ✅ New position {new_position.id} created")
                else:
                    print(f"  ❌ No matching BUY trade found")
            
            # Clear realized P/L
            trades_reverted.append(sell_trade.id)
            sell_trade.realized_pnl = None
            sell_trade.realized_pnl_percent = None
            sell_trade.notes = (sell_trade.notes or '') + ' [REVERTED - Incorrect sell on 12/23/25]'
            
            print(f"  ✅ Trade {sell_trade.id} P/L cleared")
            
            # Calculate balance adjustment
            is_option = (
                sell_trade.contract_type and 
                sell_trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(sell_trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            sell_proceeds = sell_trade.price * sell_trade.quantity * contract_multiplier
            
            if sell_trade.user_id not in balance_adjustments:
                balance_adjustments[sell_trade.user_id] = 0
            
            # Subtract the proceeds that were incorrectly added
            balance_adjustments[sell_trade.user_id] -= sell_proceeds
            
            print(f"  Balance adjustment: -${sell_proceeds:.2f}")
            print()
        
        # Apply balance adjustments
        print("=" * 80)
        print("APPLYING BALANCE ADJUSTMENTS")
        print("=" * 80)
        print()
        
        for user_id, adjustment in balance_adjustments.items():
            user = db.session.query(User).get(user_id)
            if user:
                old_balance = user.paper_balance
                user.paper_balance += adjustment  # adjustment is already negative
                new_balance = user.paper_balance
                
                print(f"User ID {user_id}:")
                print(f"  Old balance: ${old_balance:.2f}")
                print(f"  Adjustment: ${adjustment:.2f}")
                print(f"  New balance: ${new_balance:.2f}")
                print()
            else:
                print(f"  ⚠️  User {user_id} not found!")
        
        # Commit all changes
        print("=" * 80)
        print("COMMITTING CHANGES")
        print("=" * 80)
        print()
        
        try:
            db.session.commit()
            print(f"✅ Successfully reverted {len(trades_reverted)} SELL trades")
            print(f"✅ Reopened {len(positions_reopened)} positions")
            print(f"✅ Adjusted balances for {len(balance_adjustments)} users")
            print()
            
            print("Summary:")
            print(f"  Positions reopened: {len(positions_reopened)}")
            for pos_id in positions_reopened:
                print(f"    - Position ID: {pos_id}")
            
            print(f"  Trades reverted: {len(trades_reverted)}")
            for tid in trades_reverted:
                print(f"    - Trade ID: {tid}")
            
            print(f"  Balance adjustments: {len(balance_adjustments)}")
            for user_id, adj in balance_adjustments.items():
                print(f"    - User {user_id}: ${adj:.2f}")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error committing changes: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == '__main__':
    execute_revert()

