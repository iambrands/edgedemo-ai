#!/usr/bin/env python3
"""
Backfill missing positions from existing trades.

This script finds BUY trades that don't have corresponding positions
and creates the positions retroactively.

Usage:
    python scripts/backfill_positions_from_trades.py [--user_id USER_ID] [--dry-run]
"""

import sys
import os
import argparse
from datetime import datetime

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def backfill_positions(user_id=None, dry_run=False):
    """
    Create positions for trades that didn't create them.
    
    Args:
        user_id: Specific user ID to process, or None for all users
        dry_run: If True, only show what would be done without making changes
    """
    from app import app, db
    from models.trade import Trade
    from models.position import Position
    
    with app.app_context():
        # Find BUY trades
        query = db.session.query(Trade).filter(
            Trade.action.ilike('buy'),
            Trade.status.in_(['FILLED', 'filled', 'EXECUTED', 'executed', None])  # Include None for older trades
        )
        
        if user_id:
            query = query.filter(Trade.user_id == user_id)
        
        trades = query.order_by(Trade.trade_date.asc()).all()
        
        print(f"\n{'='*60}")
        print(f"BACKFILL POSITIONS FROM TRADES")
        print(f"{'='*60}")
        print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (making changes)'}")
        print(f"User filter: {user_id if user_id else 'All users'}")
        print(f"Total BUY trades found: {len(trades)}")
        print(f"{'='*60}\n")
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for trade in trades:
            try:
                # Determine how to look up the position
                if trade.option_symbol:
                    # Look for open position by option_symbol
                    existing_position = Position.query.filter_by(
                        user_id=trade.user_id,
                        option_symbol=trade.option_symbol,
                        status='open'
                    ).first()
                    
                    # Also check by strike + expiration if not found
                    if not existing_position and trade.strike_price and trade.expiration_date:
                        existing_position = Position.query.filter_by(
                            user_id=trade.user_id,
                            symbol=trade.symbol,
                            strike_price=trade.strike_price,
                            expiration_date=trade.expiration_date,
                            status='open'
                        ).first()
                else:
                    # Stock position
                    existing_position = Position.query.filter_by(
                        user_id=trade.user_id,
                        symbol=trade.symbol,
                        option_symbol=None,
                        status='open'
                    ).first()
                
                if existing_position:
                    print(f"  ⏭️  Trade {trade.id} ({trade.symbol}): Position exists (ID {existing_position.id})")
                    skipped_count += 1
                    continue
                
                # Check if there's a SELL trade that closed this (would mean position was already tracked)
                sell_trade = Trade.query.filter(
                    Trade.user_id == trade.user_id,
                    Trade.symbol == trade.symbol,
                    Trade.option_symbol == trade.option_symbol,
                    Trade.action.ilike('sell'),
                    Trade.trade_date > trade.trade_date
                ).first()
                
                # Check for closed position
                closed_position = None
                if trade.option_symbol:
                    closed_position = Position.query.filter_by(
                        user_id=trade.user_id,
                        option_symbol=trade.option_symbol,
                        status='closed'
                    ).first()
                else:
                    closed_position = Position.query.filter_by(
                        user_id=trade.user_id,
                        symbol=trade.symbol,
                        option_symbol=None,
                        status='closed'
                    ).first()
                
                if closed_position:
                    print(f"  ⏭️  Trade {trade.id} ({trade.symbol}): Already has CLOSED position (ID {closed_position.id})")
                    skipped_count += 1
                    continue
                
                if sell_trade:
                    # Already closed, create CLOSED position
                    status = 'closed'
                    exit_price = sell_trade.price
                    exit_date = sell_trade.trade_date
                    
                    # Calculate P&L
                    is_option = (
                        trade.contract_type and trade.contract_type.lower() in ['call', 'put', 'option']
                    ) or bool(trade.option_symbol)
                    multiplier = 100 if is_option else 1
                    realized_pnl = (exit_price - trade.price) * trade.quantity * multiplier
                    realized_pnl_percent = ((exit_price - trade.price) / trade.price * 100) if trade.price > 0 else 0
                    
                    print(f"  📦 Trade {trade.id} ({trade.symbol}): Creating CLOSED position (sold @ ${exit_price:.2f})")
                else:
                    # Create OPEN position
                    status = 'open'
                    exit_price = None
                    exit_date = None
                    realized_pnl = None
                    realized_pnl_percent = None
                    
                    print(f"  ✨ Trade {trade.id} ({trade.symbol}): Creating OPEN position")
                
                if dry_run:
                    created_count += 1
                    continue
                
                # Create the position
                position = Position(
                    user_id=trade.user_id,
                    symbol=trade.symbol,
                    option_symbol=trade.option_symbol,
                    contract_type=trade.contract_type,
                    quantity=trade.quantity if status == 'open' else 0,
                    entry_price=trade.price,
                    current_price=exit_price if exit_price else trade.price,
                    strike_price=trade.strike_price,
                    expiration_date=trade.expiration_date,
                    entry_date=trade.trade_date,
                    entry_delta=trade.delta,
                    entry_gamma=trade.gamma,
                    entry_theta=trade.theta,
                    entry_vega=trade.vega,
                    entry_iv=trade.implied_volatility,
                    current_delta=trade.delta,
                    current_gamma=trade.gamma,
                    current_theta=trade.theta,
                    current_vega=trade.vega,
                    current_iv=trade.implied_volatility,
                    unrealized_pnl=realized_pnl if status == 'closed' else 0.0,
                    unrealized_pnl_percent=realized_pnl_percent if status == 'closed' else 0.0,
                    automation_id=trade.automation_id,
                    status=status,
                    last_updated=datetime.utcnow()
                )
                
                db.session.add(position)
                created_count += 1
                
            except Exception as e:
                print(f"  ❌ Trade {trade.id} ({trade.symbol}): ERROR - {str(e)}")
                error_count += 1
                continue
        
        if not dry_run:
            db.session.commit()
            print("\n✅ Changes committed to database")
        
        print(f"\n{'='*60}")
        print(f"BACKFILL RESULTS")
        print(f"{'='*60}")
        print(f"Positions created: {created_count}")
        print(f"Positions updated: {updated_count}")
        print(f"Trades skipped (already have positions): {skipped_count}")
        print(f"Errors: {error_count}")
        print(f"Total trades processed: {len(trades)}")
        print(f"{'='*60}\n")
        
        return created_count


def verify_positions(user_id=None):
    """Verify positions vs trades for a user"""
    from app import app, db
    from models.trade import Trade
    from models.position import Position
    
    with app.app_context():
        query = db.session.query(Trade).filter(Trade.action.ilike('buy'))
        if user_id:
            query = query.filter(Trade.user_id == user_id)
        
        trades = query.order_by(Trade.trade_date.desc()).limit(20).all()
        
        print(f"\n{'='*60}")
        print(f"VERIFY TRADES vs POSITIONS (Last 20 BUY trades)")
        print(f"{'='*60}")
        
        for trade in trades:
            # Find matching position
            if trade.option_symbol:
                position = Position.query.filter_by(
                    user_id=trade.user_id,
                    option_symbol=trade.option_symbol
                ).first()
            else:
                position = Position.query.filter_by(
                    user_id=trade.user_id,
                    symbol=trade.symbol,
                    option_symbol=None
                ).first()
            
            status = "✅" if position else "❌"
            pos_info = f"Position ID {position.id} ({position.status})" if position else "NO POSITION"
            
            print(f"{status} Trade {trade.id}: {trade.symbol} {trade.contract_type or 'stock'} "
                  f"x{trade.quantity} @ ${trade.price:.2f} on {trade.trade_date.strftime('%Y-%m-%d')}")
            print(f"   └─ {pos_info}")
        
        print(f"{'='*60}\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Backfill positions from trades')
    parser.add_argument('--user_id', type=int, help='Specific user ID to process')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--verify', action='store_true', help='Only verify positions vs trades')
    
    args = parser.parse_args()
    
    if args.verify:
        verify_positions(user_id=args.user_id)
    else:
        backfill_positions(user_id=args.user_id, dry_run=args.dry_run)
