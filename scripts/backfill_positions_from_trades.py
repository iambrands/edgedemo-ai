#!/usr/bin/env python3
"""
Backfill missing positions from existing trades.

This script groups trades by option (same symbol, strike, expiration) and creates
positions with the combined quantity and weighted average entry price.

Usage:
    python scripts/backfill_positions_from_trades.py [--user_id USER_ID] [--dry-run] [--verify]
"""

import sys
import os
import argparse
from datetime import datetime
from collections import defaultdict

# Add parent directory to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_app():
    """Get or create the Flask app instance"""
    from app import create_app, db
    app = create_app()
    return app, db


def backfill_positions(user_id=None, dry_run=False):
    """
    Create positions for trades that didn't create them.
    Groups trades by option and combines quantities/prices.
    
    Args:
        user_id: Specific user ID to process, or None for all users
        dry_run: If True, only show what would be done without making changes
    
    Returns:
        dict with results
    """
    app, db = get_app()
    from models.trade import Trade
    from models.position import Position
    
    with app.app_context():
        # Find all BUY trades
        query = db.session.query(Trade).filter(
            Trade.action.ilike('buy')
        )
        
        if user_id:
            query = query.filter(Trade.user_id == user_id)
        
        buy_trades = query.order_by(Trade.trade_date.asc()).all()
        
        print(f"\n{'='*60}")
        print(f"BACKFILL POSITIONS FROM TRADES")
        print(f"{'='*60}")
        print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE (making changes)'}")
        print(f"User filter: {user_id if user_id else 'All users'}")
        print(f"Total BUY trades found: {len(buy_trades)}")
        print(f"{'='*60}\n")
        
        # Group trades by option (same user, symbol, contract_type, strike, expiration)
        grouped_trades = defaultdict(list)
        
        for trade in buy_trades:
            # Create unique key for this option
            # Use strike_price and expiration_date to identify unique options
            option_key = (
                trade.user_id,
                trade.symbol,
                (trade.contract_type or '').lower(),
                trade.strike_price,
                trade.expiration_date.isoformat() if trade.expiration_date else None
            )
            grouped_trades[option_key].append(trade)
        
        print(f"Grouped into {len(grouped_trades)} unique options\n")
        
        created_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0
        
        for option_key, option_trades in grouped_trades.items():
            user_id_key, symbol, contract_type, strike_price, expiration_str = option_key
            
            try:
                # Calculate totals across all trades for this option
                total_bought = sum(t.quantity for t in option_trades)
                total_cost = sum(t.price * t.quantity for t in option_trades)
                avg_entry_price = total_cost / total_bought if total_bought > 0 else 0
                
                # Get first trade's data for option_symbol and dates
                first_trade = option_trades[0]
                expiration_date = first_trade.expiration_date
                option_symbol = first_trade.option_symbol
                automation_id = first_trade.automation_id
                
                print(f"--- {symbol} ${strike_price} {contract_type.upper()} exp {expiration_str} ---")
                print(f"  Trades: {len(option_trades)} | Total qty: {total_bought} | Avg price: ${avg_entry_price:.2f}")
                
                # Check if position already exists (open or closed)
                existing_position = Position.query.filter_by(
                    user_id=user_id_key,
                    symbol=symbol,
                    strike_price=strike_price,
                    expiration_date=expiration_date,
                    status='open'
                ).first()
                
                # Also check by option_symbol if available
                if not existing_position and option_symbol:
                    existing_position = Position.query.filter_by(
                        user_id=user_id_key,
                        option_symbol=option_symbol,
                        status='open'
                    ).first()
                
                if existing_position:
                    # Position exists - check if quantity needs updating
                    if existing_position.quantity == total_bought:
                        print(f"  ⏭️  Position exists (ID {existing_position.id}) with correct qty {total_bought}")
                        skipped_count += 1
                        continue
                    else:
                        print(f"  🔧 Position exists (ID {existing_position.id}) but qty wrong: {existing_position.quantity} → {total_bought}")
                        
                        if not dry_run:
                            existing_position.quantity = total_bought
                            existing_position.entry_price = avg_entry_price
                            existing_position.last_updated = datetime.utcnow()
                        
                        updated_count += 1
                        continue
                
                # Check for closed position
                closed_position = Position.query.filter_by(
                    user_id=user_id_key,
                    symbol=symbol,
                    strike_price=strike_price,
                    expiration_date=expiration_date,
                    status='closed'
                ).first()
                
                if closed_position:
                    print(f"  ⏭️  Closed position exists (ID {closed_position.id})")
                    skipped_count += 1
                    continue
                
                # Check for SELL trades that closed this position
                sell_trades = Trade.query.filter(
                    Trade.user_id == user_id_key,
                    Trade.symbol == symbol,
                    Trade.strike_price == strike_price,
                    Trade.expiration_date == expiration_date,
                    Trade.action.ilike('sell')
                ).order_by(Trade.trade_date.asc()).all()
                
                total_sold = sum(t.quantity for t in sell_trades)
                remaining_qty = total_bought - total_sold
                
                print(f"  Bought: {total_bought} | Sold: {total_sold} | Remaining: {remaining_qty}")
                
                if remaining_qty <= 0:
                    # Fully closed position
                    print(f"  💀 Position fully closed")
                    
                    if not dry_run:
                        # Calculate realized P&L
                        avg_sell_price = sum(t.price * t.quantity for t in sell_trades) / total_sold if total_sold > 0 else 0
                        is_option = contract_type in ['call', 'put', 'option'] or bool(option_symbol)
                        multiplier = 100 if is_option else 1
                        realized_pnl = (avg_sell_price - avg_entry_price) * total_bought * multiplier
                        realized_pnl_percent = ((avg_sell_price - avg_entry_price) / avg_entry_price * 100) if avg_entry_price > 0 else 0
                        
                        position = Position(
                            user_id=user_id_key,
                            symbol=symbol,
                            option_symbol=option_symbol,
                            contract_type=contract_type,
                            strike_price=strike_price,
                            quantity=0,
                            entry_price=avg_entry_price,
                            current_price=avg_sell_price,
                            expiration_date=expiration_date,
                            entry_date=first_trade.trade_date,
                            entry_delta=first_trade.delta,
                            entry_gamma=first_trade.gamma,
                            entry_theta=first_trade.theta,
                            entry_vega=first_trade.vega,
                            entry_iv=first_trade.implied_volatility,
                            unrealized_pnl=realized_pnl,
                            unrealized_pnl_percent=realized_pnl_percent,
                            automation_id=automation_id,
                            status='closed',
                            last_updated=datetime.utcnow()
                        )
                        db.session.add(position)
                    
                    created_count += 1
                    
                else:
                    # Open position (full or partial)
                    print(f"  ✅ Creating OPEN position: {remaining_qty} contracts @ ${avg_entry_price:.2f}")
                    
                    if not dry_run:
                        position = Position(
                            user_id=user_id_key,
                            symbol=symbol,
                            option_symbol=option_symbol,
                            contract_type=contract_type,
                            strike_price=strike_price,
                            quantity=remaining_qty,
                            entry_price=avg_entry_price,
                            current_price=avg_entry_price,  # Will be updated by price refresh
                            expiration_date=expiration_date,
                            entry_date=first_trade.trade_date,
                            entry_delta=first_trade.delta,
                            entry_gamma=first_trade.gamma,
                            entry_theta=first_trade.theta,
                            entry_vega=first_trade.vega,
                            entry_iv=first_trade.implied_volatility,
                            current_delta=first_trade.delta,
                            current_gamma=first_trade.gamma,
                            current_theta=first_trade.theta,
                            current_vega=first_trade.vega,
                            current_iv=first_trade.implied_volatility,
                            unrealized_pnl=0.0,
                            unrealized_pnl_percent=0.0,
                            automation_id=automation_id,
                            status='open',
                            last_updated=datetime.utcnow()
                        )
                        db.session.add(position)
                    
                    created_count += 1
                
                print()
                
            except Exception as e:
                print(f"  ❌ ERROR: {str(e)}")
                error_count += 1
                continue
        
        if not dry_run:
            db.session.commit()
            print("\n✅ Changes committed to database")
            
            # Update prices for newly created open positions
            try:
                from services.position_monitor import PositionMonitor
                monitor = PositionMonitor()
                
                open_positions = Position.query.filter_by(
                    user_id=user_id,
                    status='open'
                ).all()
                
                print(f"\n📊 Updating prices for {len(open_positions)} open positions...")
                for pos in open_positions:
                    try:
                        monitor.update_position_data(pos, force_update=True)
                    except Exception as e:
                        print(f"  ⚠️  Could not update price for position {pos.id}: {e}")
                
                db.session.commit()
                print("✅ Prices updated")
            except Exception as e:
                print(f"⚠️  Could not update prices: {e}")
        else:
            print("\n🔍 DRY RUN - No changes made")
        
        print(f"\n{'='*60}")
        print(f"BACKFILL RESULTS")
        print(f"{'='*60}")
        print(f"Positions created: {created_count}")
        print(f"Positions updated: {updated_count}")
        print(f"Already correct: {skipped_count}")
        print(f"Errors: {error_count}")
        print(f"Total unique options: {len(grouped_trades)}")
        print(f"Total trades processed: {len(buy_trades)}")
        print(f"{'='*60}\n")
        
        return {
            'created': created_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'errors': error_count,
            'total_options': len(grouped_trades),
            'total_trades': len(buy_trades)
        }


def verify_positions(user_id=None):
    """Verify positions vs trades for a user - shows grouped totals"""
    app, db = get_app()
    from models.trade import Trade
    from models.position import Position
    
    with app.app_context():
        # Get all BUY trades grouped by option
        query = db.session.query(Trade).filter(Trade.action.ilike('buy'))
        if user_id:
            query = query.filter(Trade.user_id == user_id)
        
        trades = query.order_by(Trade.trade_date.desc()).all()
        
        # Group trades
        grouped_trades = defaultdict(list)
        for trade in trades:
            option_key = (
                trade.user_id,
                trade.symbol,
                (trade.contract_type or '').lower(),
                trade.strike_price,
                trade.expiration_date.isoformat() if trade.expiration_date else None
            )
            grouped_trades[option_key].append(trade)
        
        print(f"\n{'='*60}")
        print(f"VERIFY TRADES vs POSITIONS (Grouped by Option)")
        print(f"{'='*60}")
        
        for option_key, option_trades in grouped_trades.items():
            user_id_key, symbol, contract_type, strike_price, expiration_str = option_key
            
            total_qty = sum(t.quantity for t in option_trades)
            avg_price = sum(t.price * t.quantity for t in option_trades) / total_qty if total_qty > 0 else 0
            
            # Find matching position
            position = Position.query.filter_by(
                user_id=user_id_key,
                symbol=symbol,
                strike_price=strike_price,
                expiration_date=option_trades[0].expiration_date
            ).first()
            
            if position:
                qty_match = "✅" if position.quantity == total_qty else "❌"
                status = f"Position ID {position.id} - qty: {position.quantity} ({position.status})"
            else:
                qty_match = "❌"
                status = "NO POSITION"
            
            print(f"\n{qty_match} {symbol} ${strike_price} {contract_type.upper()} exp {expiration_str}")
            print(f"   Trades: {len(option_trades)} totaling {total_qty} contracts @ avg ${avg_price:.2f}")
            print(f"   └─ {status}")
        
        print(f"\n{'='*60}\n")


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
