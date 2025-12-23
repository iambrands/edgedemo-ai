#!/usr/bin/env python3
"""
Revert incorrect SELL trades - Production version
Targets trades with suspiciously high P/L percentages (indicating incorrect sells)
Can also target specific trade IDs or date ranges
"""

from app import create_app, db
from models.trade import Trade
from models.position import Position
from models.user import User
from datetime import datetime, date, timedelta
import sys

def revert_incorrect_sells(trade_ids=None, target_date=None, min_pnl_percent=1000):
    """
    Revert incorrect SELL trades
    
    Args:
        trade_ids: List of specific trade IDs to revert (optional)
        target_date: Specific date to target (YYYY-MM-DD format, optional)
        min_pnl_percent: Minimum P/L percentage to consider suspicious (default 1000%)
    """
    app = create_app()
    
    with app.app_context():
        print("=" * 80)
        print("REVERTING INCORRECT SELL TRADES")
        print("=" * 80)
        print()
        
        # Build query
        query = db.session.query(Trade).filter(Trade.action == 'sell')
        
        if trade_ids:
            # Target specific trade IDs
            query = query.filter(Trade.id.in_(trade_ids))
            print(f"Targeting specific trade IDs: {trade_ids}")
        elif target_date:
            # Target specific date
            if isinstance(target_date, str):
                target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
            query = query.filter(db.func.date(Trade.trade_date) == target_date)
            print(f"Targeting date: {target_date}")
        else:
            # Target trades with suspiciously high P/L percentages
            query = query.filter(
                Trade.realized_pnl_percent.isnot(None),
                Trade.realized_pnl_percent >= min_pnl_percent
            )
            print(f"Targeting trades with P/L % >= {min_pnl_percent}%")
        
        sell_trades = query.order_by(Trade.trade_date).all()
        
        print(f"Found {len(sell_trades)} SELL trades to process")
        print()
        
        if not sell_trades:
            print("No SELL trades found matching criteria.")
            return
        
        # Show what will be reverted
        print("Trades to be reverted:")
        for trade in sell_trades:
            trade_date = trade.trade_date.date() if isinstance(trade.trade_date, datetime) else trade.trade_date
            print(f"  Trade ID {trade.id}: {trade.symbol} on {trade_date}")
            print(f"    Price: ${trade.price}, P/L: ${trade.realized_pnl} ({trade.realized_pnl_percent}%)")
        print()
        
        # Process each SELL trade
        positions_reopened = []
        trades_reverted = []
        balance_adjustments = {}
        
        for sell_trade in sell_trades:
            print(f"Processing SELL Trade ID: {sell_trade.id}")
            print(f"  Symbol: {sell_trade.symbol}")
            print(f"  Option Symbol: {sell_trade.option_symbol}")
            print(f"  Contract Type: {sell_trade.contract_type}")
            print(f"  Quantity: {sell_trade.quantity}")
            print(f"  Price: ${sell_trade.price}")
            print(f"  Realized P/L: ${sell_trade.realized_pnl}")
            print(f"  User ID: {sell_trade.user_id}")
            print()
            
            # Find the corresponding position (should be closed)
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
                print(f"  Found closed position ID: {position.id}")
                print(f"    Entry Price: ${position.entry_price}")
                print(f"    Quantity: {position.quantity}")
                
                # Reopen the position
                position.status = 'open'
                position.unrealized_pnl = None
                position.unrealized_pnl_percent = None
                
                # Update current price back to entry price (will be updated by monitor later)
                position.current_price = position.entry_price
                
                positions_reopened.append({
                    'position_id': position.id,
                    'symbol': position.symbol,
                    'option_symbol': position.option_symbol
                })
                
                print(f"  ✅ Position {position.id} reopened")
            else:
                print(f"  ⚠️  No closed position found for this trade")
                # Try to find matching BUY trade and recreate position
                buy_trade = db.session.query(Trade).filter(
                    Trade.user_id == sell_trade.user_id,
                    Trade.symbol == sell_trade.symbol,
                    Trade.option_symbol == sell_trade.option_symbol,
                    Trade.action == 'buy',
                    Trade.trade_date < sell_trade.trade_date
                ).order_by(Trade.trade_date.desc()).first()
                
                if buy_trade:
                    print(f"  Found matching BUY trade ID: {buy_trade.id}")
                    print(f"    Creating new position from BUY trade...")
                    
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
                    db.session.flush()  # Get the ID
                    
                    positions_reopened.append({
                        'position_id': new_position.id,
                        'symbol': new_position.symbol,
                        'option_symbol': new_position.option_symbol
                    })
                    print(f"  ✅ New position {new_position.id} created")
            
            # Clear realized P/L from SELL trade
            original_pnl = sell_trade.realized_pnl
            original_pnl_percent = sell_trade.realized_pnl_percent
            
            sell_trade.realized_pnl = None
            sell_trade.realized_pnl_percent = None
            sell_trade.notes = (sell_trade.notes or '') + ' [REVERTED - Incorrect sell on 12/23/25]'
            
            trades_reverted.append({
                'trade_id': sell_trade.id,
                'original_pnl': original_pnl,
                'original_pnl_percent': original_pnl_percent
            })
            
            print(f"  ✅ SELL trade {sell_trade.id} P/L cleared")
            
            # Calculate balance adjustment
            # When a SELL trade happened, money was added to paper balance
            # We need to subtract it back
            is_option = (
                sell_trade.contract_type and 
                sell_trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(sell_trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            sell_proceeds = sell_trade.price * sell_trade.quantity * contract_multiplier
            
            user_id = sell_trade.user_id
            if user_id not in balance_adjustments:
                balance_adjustments[user_id] = 0
            
            # Subtract the proceeds that were incorrectly added
            balance_adjustments[user_id] -= sell_proceeds
            
            print(f"  Balance adjustment for user {user_id}: -${sell_proceeds:.2f}")
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
            for pos in positions_reopened:
                print(f"    - Position {pos['position_id']}: {pos['symbol']} {pos['option_symbol'] or ''}")
            
            print(f"  Trades reverted: {len(trades_reverted)}")
            for trade in trades_reverted:
                print(f"    - Trade ID {trade['trade_id']}: P/L ${trade['original_pnl']:.2f} ({trade['original_pnl_percent']:.2f}%) cleared")
            
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
    # Allow command line arguments
    trade_ids = None
    target_date = None
    
    if len(sys.argv) > 1:
        if sys.argv[1].startswith('--ids='):
            # Specific trade IDs
            ids_str = sys.argv[1].split('=')[1]
            trade_ids = [int(x.strip()) for x in ids_str.split(',')]
        elif sys.argv[1].startswith('--date='):
            # Specific date
            target_date = sys.argv[1].split('=')[1]
        elif sys.argv[1] == '--date=2025-12-23':
            target_date = '2025-12-23'
    
    revert_incorrect_sells(trade_ids=trade_ids, target_date=target_date)

