"""Service for cleaning up expired positions and maintaining data hygiene"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


def cleanup_expired_positions() -> int:
    """
    Auto-close positions that have passed their expiration date.
    Should run daily after market close (4 PM ET).
    
    Returns: Number of positions closed
    """
    try:
        from models.position import Position
        from app import db
        
        # Find all open positions past expiration
        today = datetime.utcnow().date()
        expired = db.session.query(Position).filter(
            Position.expiration_date < today,
            Position.status == 'open'
        ).all()
        
        if not expired:
            logger.info("✅ No expired positions to cleanup")
            return 0
        
        closed_count = 0
        for pos in expired:
            logger.info(
                f"🔄 Auto-closing expired position {pos.id}: "
                f"{pos.symbol} {pos.contract_type or 'option'} "
                f"${pos.strike_price} exp {pos.expiration_date}"
            )
            
            # Mark as closed
            pos.status = 'closed'
            pos.exit_price = 0.0  # Expired worthless
            pos.exit_date = datetime.utcnow()
            
            # Calculate final P&L (100% loss for expired long options)
            is_option = (
                (pos.contract_type and pos.contract_type.lower() in ['call', 'put', 'option']) or
                bool(pos.option_symbol) or
                (pos.expiration_date and pos.strike_price is not None)
            )
            
            contract_multiplier = 100 if is_option else 1
            pos.unrealized_pnl = -pos.entry_price * pos.quantity * contract_multiplier
            pos.unrealized_pnl_percent = -100.0
            
            # Update current price to 0
            pos.current_price = 0.0
            
            closed_count += 1
        
        # Commit all changes
        db.session.commit()
        logger.info(f"✅ Successfully auto-closed {closed_count} expired positions")
        return closed_count
        
    except Exception as e:
        logger.error(f"❌ Failed to cleanup expired positions: {e}", exc_info=True)
        try:
            db.session.rollback()
        except:
            pass
        return 0


def get_expiring_today() -> List:
    """
    Get positions expiring today for special handling.
    Returns: List of Position objects
    """
    try:
        from models.position import Position
        from app import db
        
        today = datetime.utcnow().date()
        expiring = db.session.query(Position).filter(
            Position.expiration_date == today,
            Position.status == 'open'
        ).all()
        
        if expiring:
            logger.warning(f"⚠️ {len(expiring)} positions expiring TODAY")
            for pos in expiring:
                pnl_pct = pos.unrealized_pnl_percent or 0
                logger.warning(
                    f"  → Position {pos.id}: {pos.symbol} {pos.contract_type or 'option'} "
                    f"${pos.strike_price} (P/L: {pnl_pct:.1f}%)"
                )
        
        return expiring
        
    except Exception as e:
        logger.error(f"Failed to get expiring positions: {e}", exc_info=True)
        return []


def get_stale_positions(hours: int = 24) -> List:
    """
    Find positions with stale price data (no update in specified hours).
    
    Args:
        hours: Number of hours since last update to consider stale
    
    Returns: List of Position objects
    """
    try:
        from models.position import Position
        from app import db
        
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        stale = db.session.query(Position).filter(
            Position.status == 'open',
            Position.last_updated < cutoff
        ).all()
        
        if stale:
            logger.warning(f"⚠️ Found {len(stale)} positions with stale price data (> {hours} hours old)")
        
        return stale
        
    except Exception as e:
        logger.error(f"Failed to get stale positions: {e}", exc_info=True)
        return []


def cleanup_old_closed_positions(days: int = 90) -> int:
    """
    Archive or delete closed positions older than specified days.
    Default: 90 days
    
    Note: This is a soft delete - positions are marked as archived.
    You'll need to add an 'archived' column to Position model if you want this.
    
    Returns: Number of positions archived
    """
    try:
        from models.position import Position
        from app import db
        
        cutoff_date = datetime.utcnow().date() - timedelta(days=days)
        
        # Find closed positions older than cutoff
        old_positions = db.session.query(Position).filter(
            Position.status == 'closed',
            Position.exit_date < cutoff_date
        ).all()
        
        if not old_positions:
            logger.info(f"✅ No old positions to archive (older than {days} days)")
            return 0
        
        # For now, just log - implement soft delete if needed
        logger.info(f"📦 Found {len(old_positions)} old closed positions (>{days} days)")
        
        # TODO: Add archived flag to Position model if you want soft delete
        # for pos in old_positions:
        #     pos.archived = True
        
        # db.session.commit()
        return len(old_positions)
        
    except Exception as e:
        logger.error(f"Failed to archive old positions: {e}", exc_info=True)
        return 0

