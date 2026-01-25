"""
User Performance Tracking Service
Automatically updates user and platform statistics when trades are executed
"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import func, desc
from app import db
from services.cache_manager import set_cache, get_cache, delete_cache

logger = logging.getLogger(__name__)


class UserPerformanceTracker:
    """Tracks and updates user and platform performance metrics"""
    
    @staticmethod
    def update_user_performance(user_id, trade):
        """
        Update user performance metrics when a trade is closed
        
        Args:
            user_id: User ID
            trade: Trade object (must have profit_loss calculated)
        """
        # Import here to avoid circular imports
        from models.user_performance import UserPerformance
        
        try:
            logger.info(f"[USER_PERF] Updating performance for user {user_id}, trade {trade.id}")
            
            # Get or create user performance record
            user_perf = UserPerformance.query.filter_by(user_id=user_id).first()
            
            if not user_perf:
                user_perf = UserPerformance(user_id=user_id)
                user_perf.first_trade_date = trade.created_at if hasattr(trade, 'created_at') else datetime.utcnow()
                db.session.add(user_perf)
                logger.info(f"[USER_PERF] Created new performance record for user {user_id}")
            
            # Update trade counts
            user_perf.total_trades += 1
            user_perf.last_trade_date = datetime.utcnow()
            
            # Get profit/loss - handle both Trade and Position models
            profit_loss = Decimal(0)
            if hasattr(trade, 'profit_loss') and trade.profit_loss is not None:
                profit_loss = Decimal(str(trade.profit_loss))
            elif hasattr(trade, 'realized_pnl') and trade.realized_pnl is not None:
                profit_loss = Decimal(str(trade.realized_pnl))
            
            user_perf.total_profit_loss = Decimal(str(user_perf.total_profit_loss or 0)) + profit_loss
            user_perf.mtd_pnl = Decimal(str(user_perf.mtd_pnl or 0)) + profit_loss
            user_perf.ytd_pnl = Decimal(str(user_perf.ytd_pnl or 0)) + profit_loss
            
            # Update capital deployed
            capital = Decimal(0)
            if hasattr(trade, 'entry_price') and hasattr(trade, 'quantity'):
                entry_price = Decimal(str(trade.entry_price or 0))
                quantity = Decimal(str(trade.quantity or 0))
                capital = entry_price * quantity * 100  # Options contract = 100 shares
            elif hasattr(trade, 'cost_basis') and trade.cost_basis:
                capital = Decimal(str(trade.cost_basis))
            
            user_perf.total_capital_deployed = Decimal(str(user_perf.total_capital_deployed or 0)) + capital
            
            # Track win/loss
            if profit_loss > 0:
                user_perf.winning_trades += 1
                user_perf.current_streak = max(1, (user_perf.current_streak or 0) + 1)
                user_perf.best_streak = max(user_perf.best_streak or 0, user_perf.current_streak)
                
                # Update win stats
                if profit_loss > Decimal(str(user_perf.largest_win or 0)):
                    user_perf.largest_win = profit_loss
                
                # Recalculate average win size
                if user_perf.winning_trades > 0:
                    prev_avg = Decimal(str(user_perf.avg_win_size or 0))
                    user_perf.avg_win_size = (
                        (prev_avg * (user_perf.winning_trades - 1) + profit_loss) 
                        / user_perf.winning_trades
                    )
                
            elif profit_loss < 0:
                user_perf.losing_trades += 1
                user_perf.current_streak = min(-1, (user_perf.current_streak or 0) - 1)
                
                # Update loss stats
                if profit_loss < Decimal(str(user_perf.largest_loss or 0)):
                    user_perf.largest_loss = profit_loss
                
                # Recalculate average loss size
                if user_perf.losing_trades > 0:
                    prev_avg = Decimal(str(user_perf.avg_loss_size or 0))
                    user_perf.avg_loss_size = (
                        (prev_avg * (user_perf.losing_trades - 1) + profit_loss) 
                        / user_perf.losing_trades
                    )
            
            # Track all-time high
            if user_perf.total_profit_loss > Decimal(str(user_perf.all_time_high_pnl or 0)):
                user_perf.all_time_high_pnl = user_perf.total_profit_loss
            
            # Track signal following if trade followed a signal
            if hasattr(trade, 'signal_id') and trade.signal_id:
                user_perf.signals_followed += 1
                if profit_loss > 0:
                    user_perf.signals_won += 1
            
            # Recalculate metrics
            user_perf.calculate_metrics()
            
            db.session.commit()
            
            logger.info(f"[USER_PERF] Updated user {user_id}: {user_perf.total_trades} trades, "
                       f"${user_perf.total_profit_loss} P&L, {user_perf.win_rate}% win rate")
            
            # Invalidate user's performance cache
            delete_cache(f'user_performance:{user_id}')
            
            return user_perf
            
        except Exception as e:
            logger.error(f"[USER_PERF] Error updating performance for user {user_id}: {e}", exc_info=True)
            db.session.rollback()
            return None
    
    @staticmethod
    def calculate_platform_stats():
        """
        Calculate and cache platform-wide aggregate statistics
        Called periodically by background job
        """
        # Import here to avoid circular imports
        from models.user_performance import UserPerformance
        from models.platform_stats import PlatformStats
        
        try:
            logger.info("[USER_PERF] Calculating platform aggregate statistics...")
            
            # Count total and active users
            total_users = db.session.query(func.count(UserPerformance.id)).scalar() or 0
            
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            active_users = db.session.query(func.count(UserPerformance.id)).filter(
                UserPerformance.last_trade_date >= thirty_days_ago
            ).scalar() or 0
            
            # Get aggregate statistics from users who allow performance display
            aggregate = db.session.query(
                func.count(UserPerformance.id).label('user_count'),
                func.sum(UserPerformance.total_trades).label('total_trades'),
                func.sum(UserPerformance.total_profit_loss).label('total_pnl'),
                func.sum(UserPerformance.total_capital_deployed).label('total_capital'),
                func.avg(UserPerformance.win_rate).label('avg_win_rate'),
                func.avg(UserPerformance.avg_return_pct).label('avg_return'),
                func.sum(UserPerformance.mtd_pnl).label('mtd_pnl'),
                func.sum(UserPerformance.ytd_pnl).label('ytd_pnl'),
                func.sum(UserPerformance.signals_followed).label('signals_followed'),
                func.sum(UserPerformance.signals_won).label('signals_won')
            ).filter(
                UserPerformance.allow_performance_display == True
            ).first()
            
            # Calculate top 10% performers average return
            top_10pct_avg_return = Decimal(0)
            if total_users > 0:
                top_10pct_count = max(1, int(total_users * 0.1))
                top_performers = db.session.query(
                    func.avg(UserPerformance.avg_return_pct).label('top_avg_return')
                ).filter(
                    UserPerformance.avg_return_pct.isnot(None)
                ).order_by(
                    desc(UserPerformance.avg_return_pct)
                ).limit(top_10pct_count).scalar()
                
                if top_performers:
                    top_10pct_avg_return = Decimal(str(top_performers))
            
            # Create or update platform stats
            stats = PlatformStats.query.first()
            if not stats:
                stats = PlatformStats()
                db.session.add(stats)
            
            stats.total_users = total_users
            stats.active_users_30d = active_users
            stats.total_trades = aggregate.total_trades or 0
            stats.total_profit_loss = Decimal(str(aggregate.total_pnl or 0))
            stats.total_capital_deployed = Decimal(str(aggregate.total_capital or 0))
            stats.platform_win_rate = Decimal(str(aggregate.avg_win_rate or 0))
            stats.platform_avg_return = Decimal(str(aggregate.avg_return or 0))
            stats.top_10pct_avg_return = top_10pct_avg_return
            stats.mtd_aggregate_pnl = Decimal(str(aggregate.mtd_pnl or 0))
            stats.ytd_aggregate_pnl = Decimal(str(aggregate.ytd_pnl or 0))
            stats.signals_followed = aggregate.signals_followed or 0
            
            if aggregate.signals_won:
                stats.signal_success_rate = Decimal(str(aggregate.signals_won or 0))
            
            if stats.signals_followed and stats.signals_followed > 0:
                stats.signal_success_rate = (Decimal(str(aggregate.signals_won or 0)) / stats.signals_followed) * 100
            
            stats.calculation_date = datetime.utcnow()
            
            db.session.commit()
            
            # Cache the results
            set_cache('platform_aggregate_stats', stats.to_dict(), timeout=300)  # 5 minutes
            
            logger.info(f"[USER_PERF] Platform stats updated: {stats.total_users} users, "
                       f"{stats.total_trades} trades, ${stats.total_profit_loss} total P&L")
            
            return stats
            
        except Exception as e:
            logger.error(f"[USER_PERF] Error calculating platform stats: {e}", exc_info=True)
            db.session.rollback()
            return None
    
    @staticmethod
    def reset_monthly_stats():
        """
        Reset monthly stats at the start of each month
        Called by scheduler on the 1st of each month
        """
        from models.user_performance import UserPerformance
        
        try:
            logger.info("[USER_PERF] Resetting monthly statistics...")
            
            db.session.query(UserPerformance).update({
                UserPerformance.mtd_pnl: 0
            })
            
            db.session.commit()
            logger.info("[USER_PERF] Monthly stats reset complete")
            
        except Exception as e:
            logger.error(f"[USER_PERF] Error resetting monthly stats: {e}", exc_info=True)
            db.session.rollback()
    
    @staticmethod
    def reset_yearly_stats():
        """
        Reset yearly stats at the start of each year
        Called by scheduler on January 1st
        """
        from models.user_performance import UserPerformance
        
        try:
            logger.info("[USER_PERF] Resetting yearly statistics...")
            
            db.session.query(UserPerformance).update({
                UserPerformance.ytd_pnl: 0
            })
            
            db.session.commit()
            logger.info("[USER_PERF] Yearly stats reset complete")
            
        except Exception as e:
            logger.error(f"[USER_PERF] Error resetting yearly stats: {e}", exc_info=True)
            db.session.rollback()
    
    @staticmethod
    def get_leaderboard(metric='total_pnl', limit=100):
        """
        Get top performers for leaderboard
        
        Args:
            metric: 'total_pnl', 'win_rate', 'avg_return', or 'total_trades'
            limit: Maximum number of results
        
        Returns:
            List of top performers who opted in
        """
        from models.user_performance import UserPerformance
        
        try:
            # Map metric to column
            metric_map = {
                'total_pnl': UserPerformance.total_profit_loss,
                'win_rate': UserPerformance.win_rate,
                'avg_return': UserPerformance.avg_return_pct,
                'total_trades': UserPerformance.total_trades
            }
            
            sort_column = metric_map.get(metric, UserPerformance.total_profit_loss)
            
            # Only get users who opted in to leaderboard
            top_users = db.session.query(UserPerformance).filter(
                UserPerformance.show_on_leaderboard == True,
                UserPerformance.total_trades >= 10  # Minimum 10 trades to qualify
            ).order_by(
                desc(sort_column)
            ).limit(limit).all()
            
            return [{
                'rank': idx + 1,
                'user_id': user.user_id if user.public_profile else None,
                'username': f"Trader_{user.user_id}" if not user.public_profile else f"Trader_{user.user_id}",
                'total_trades': user.total_trades,
                'win_rate': float(user.win_rate) if user.win_rate else 0,
                'total_profit_loss': float(user.total_profit_loss) if user.total_profit_loss else 0,
                'avg_return_pct': float(user.avg_return_pct) if user.avg_return_pct else 0,
                'account_age_days': user.account_age_days
            } for idx, user in enumerate(top_users)]
            
        except Exception as e:
            logger.error(f"[USER_PERF] Error getting leaderboard: {e}", exc_info=True)
            return []


# Create singleton instance
user_performance_tracker = UserPerformanceTracker()
