"""
User Performance Analytics API
Public and private endpoints for performance statistics
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from services.cache_manager import get_cache, set_cache
import logging

logger = logging.getLogger(__name__)

user_performance_bp = Blueprint('user_performance', __name__, url_prefix='/api/stats')


@user_performance_bp.route('/platform-stats', methods=['GET'])
def get_platform_stats():
    """
    PUBLIC ENDPOINT - Platform-wide aggregate statistics
    
    LEGAL: Showing actual aggregate results, not giving investment advice
    
    Returns:
        Aggregate statistics for all users who opt-in to performance display
    """
    from models.platform_stats import PlatformStats
    from services.user_performance_tracker import user_performance_tracker
    
    try:
        # Try cache first
        cache_key = 'platform_aggregate_stats'
        cached_stats = get_cache(cache_key)
        
        if cached_stats:
            logger.debug("[PERF API] Platform stats cache hit")
            return jsonify({
                'status': 'success',
                'data': cached_stats,
                'cached': True,
                'disclaimer': 'Past performance does not guarantee future results. Individual results may vary.'
            }), 200
        
        # Get from database
        stats = PlatformStats.query.first()
        
        if not stats:
            # Calculate if doesn't exist
            stats = user_performance_tracker.calculate_platform_stats()
        
        if not stats:
            return jsonify({
                'status': 'success',
                'data': {
                    'total_users': 0,
                    'active_users_30d': 0,
                    'total_trades': 0,
                    'total_profit_loss': 0,
                    'platform_win_rate': 0,
                    'platform_avg_return': 0,
                    'message': 'No performance data available yet'
                },
                'disclaimer': 'Past performance does not guarantee future results. Individual results may vary.'
            }), 200
        
        stats_dict = stats.to_dict()
        
        # Cache for 5 minutes
        set_cache(cache_key, stats_dict, timeout=300)
        
        return jsonify({
            'status': 'success',
            'data': stats_dict,
            'cached': False,
            'disclaimer': 'Past performance does not guarantee future results. Individual results may vary.'
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error getting platform stats: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve platform statistics'
        }), 500


@user_performance_bp.route('/marketing-stats', methods=['GET'])
def get_marketing_stats():
    """
    PUBLIC ENDPOINT - Marketing-friendly platform statistics
    
    Returns formatted statistics suitable for homepage/marketing display
    """
    from models.platform_stats import PlatformStats
    from services.user_performance_tracker import user_performance_tracker
    
    try:
        # Try cache first
        cache_key = 'platform_marketing_stats'
        cached_stats = get_cache(cache_key)
        
        if cached_stats:
            return jsonify({
                'status': 'success',
                'data': cached_stats,
                'cached': True,
                'disclaimer': 'Past performance does not guarantee future results.'
            }), 200
        
        # Get from database
        stats = PlatformStats.query.first()
        
        if not stats:
            stats = user_performance_tracker.calculate_platform_stats()
        
        if not stats:
            return jsonify({
                'status': 'success',
                'data': {
                    'total_user_profits': '$0',
                    'active_traders': '0',
                    'average_monthly_return': '0%',
                    'win_rate': '0%'
                },
                'disclaimer': 'Past performance does not guarantee future results.'
            }), 200
        
        marketing_dict = stats.to_marketing_dict()
        
        # Cache for 5 minutes
        set_cache(cache_key, marketing_dict, timeout=300)
        
        return jsonify({
            'status': 'success',
            'data': marketing_dict,
            'cached': False,
            'disclaimer': 'Past performance does not guarantee future results.'
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error getting marketing stats: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve statistics'
        }), 500


@user_performance_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """
    PUBLIC ENDPOINT - Top performing users leaderboard
    
    LEGAL: Only shows users who opted-in to public display
    
    Query params:
        - metric: 'total_pnl' | 'win_rate' | 'avg_return' | 'total_trades' (default: total_pnl)
        - limit: Number of results (default: 100, max: 500)
    """
    from services.user_performance_tracker import user_performance_tracker
    
    try:
        metric = request.args.get('metric', 'total_pnl')
        limit = min(int(request.args.get('limit', 100)), 500)
        
        # Validate metric
        valid_metrics = ['total_pnl', 'win_rate', 'avg_return', 'total_trades']
        if metric not in valid_metrics:
            metric = 'total_pnl'
        
        leaderboard = user_performance_tracker.get_leaderboard(metric=metric, limit=limit)
        
        return jsonify({
            'status': 'success',
            'data': {
                'leaderboard': leaderboard,
                'metric': metric,
                'total_users': len(leaderboard)
            },
            'disclaimer': 'Past performance does not guarantee future results. Leaderboard shows opt-in users only.'
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error getting leaderboard: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve leaderboard'
        }), 500


@user_performance_bp.route('/my-performance', methods=['GET'])
@jwt_required()
def get_my_performance():
    """
    PRIVATE ENDPOINT - Current user's detailed performance
    
    Returns all performance metrics for the authenticated user
    """
    from models.user_performance import UserPerformance
    
    try:
        user_id = get_jwt_identity()
        
        user_perf = UserPerformance.query.filter_by(user_id=user_id).first()
        
        if not user_perf:
            # Create empty performance record
            user_perf = UserPerformance(user_id=user_id)
            db.session.add(user_perf)
            db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': user_perf.to_dict(include_private=True)
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error getting user performance: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve performance data'
        }), 500


@user_performance_bp.route('/privacy-settings', methods=['GET', 'POST'])
@jwt_required()
def manage_privacy_settings():
    """
    PRIVATE ENDPOINT - Manage user's performance privacy settings
    
    GET: Retrieve current settings
    POST: Update settings
    """
    from models.user_performance import UserPerformance
    
    try:
        user_id = get_jwt_identity()
        user_perf = UserPerformance.query.filter_by(user_id=user_id).first()
        
        if not user_perf:
            user_perf = UserPerformance(user_id=user_id)
            db.session.add(user_perf)
            db.session.commit()
        
        if request.method == 'GET':
            return jsonify({
                'status': 'success',
                'data': {
                    'public_profile': user_perf.public_profile,
                    'show_on_leaderboard': user_perf.show_on_leaderboard,
                    'allow_performance_display': user_perf.allow_performance_display
                }
            }), 200
        
        # POST - Update settings
        data = request.json or {}
        
        if 'public_profile' in data:
            user_perf.public_profile = bool(data['public_profile'])
        
        if 'show_on_leaderboard' in data:
            user_perf.show_on_leaderboard = bool(data['show_on_leaderboard'])
        
        if 'allow_performance_display' in data:
            user_perf.allow_performance_display = bool(data['allow_performance_display'])
        
        db.session.commit()
        
        logger.info(f"[PERF API] Updated privacy settings for user {user_id}")
        
        return jsonify({
            'status': 'success',
            'message': 'Privacy settings updated successfully',
            'data': {
                'public_profile': user_perf.public_profile,
                'show_on_leaderboard': user_perf.show_on_leaderboard,
                'allow_performance_display': user_perf.allow_performance_display
            }
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error managing privacy settings: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to update privacy settings'
        }), 500


@user_performance_bp.route('/refresh-stats', methods=['POST'])
@jwt_required()
def refresh_platform_stats():
    """
    PRIVATE ENDPOINT - Force refresh of platform statistics
    Admin/debugging use only
    """
    from services.user_performance_tracker import user_performance_tracker
    
    try:
        user_id = get_jwt_identity()
        
        logger.info(f"[PERF API] Manual stats refresh triggered by user {user_id}")
        
        stats = user_performance_tracker.calculate_platform_stats()
        
        if not stats:
            return jsonify({
                'status': 'error',
                'message': 'Failed to calculate statistics'
            }), 500
        
        return jsonify({
            'status': 'success',
            'message': 'Platform statistics refreshed successfully',
            'data': stats.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error refreshing stats: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Failed to refresh statistics'
        }), 500


@user_performance_bp.route('/recalculate-mine', methods=['POST'])
@jwt_required()
def recalculate_my_performance():
    """
    PRIVATE ENDPOINT - Recalculate performance from trade history
    
    Useful for fixing data or after importing historical trades
    """
    from models.user_performance import UserPerformance
    from models.position import Position
    
    try:
        user_id = get_jwt_identity()
        
        logger.info(f"[PERF API] Recalculating performance for user {user_id}")
        
        # Get or create user performance record
        user_perf = UserPerformance.query.filter_by(user_id=user_id).first()
        
        if not user_perf:
            user_perf = UserPerformance(user_id=user_id)
            db.session.add(user_perf)
        
        # Reset stats
        user_perf.total_trades = 0
        user_perf.winning_trades = 0
        user_perf.losing_trades = 0
        user_perf.total_profit_loss = 0
        user_perf.total_capital_deployed = 0
        user_perf.largest_win = 0
        user_perf.largest_loss = 0
        user_perf.current_streak = 0
        user_perf.best_streak = 0
        
        # Get all closed positions for user
        closed_positions = Position.query.filter_by(
            user_id=user_id,
            status='closed'
        ).order_by(Position.close_date).all()
        
        first_trade = None
        last_trade = None
        
        for position in closed_positions:
            if not first_trade:
                first_trade = position.open_date
            last_trade = position.close_date
            
            user_perf.total_trades += 1
            
            # Get P&L
            pnl = position.realized_pnl or 0
            user_perf.total_profit_loss += pnl
            
            # Capital deployed
            if position.cost_basis:
                user_perf.total_capital_deployed += position.cost_basis
            
            # Win/loss tracking
            if pnl > 0:
                user_perf.winning_trades += 1
                user_perf.current_streak = max(1, user_perf.current_streak + 1)
                user_perf.best_streak = max(user_perf.best_streak, user_perf.current_streak)
                
                if pnl > user_perf.largest_win:
                    user_perf.largest_win = pnl
            elif pnl < 0:
                user_perf.losing_trades += 1
                user_perf.current_streak = min(-1, user_perf.current_streak - 1)
                
                if pnl < user_perf.largest_loss:
                    user_perf.largest_loss = pnl
        
        user_perf.first_trade_date = first_trade
        user_perf.last_trade_date = last_trade
        
        # Recalculate derived metrics
        user_perf.calculate_metrics()
        
        db.session.commit()
        
        logger.info(f"[PERF API] Recalculated performance for user {user_id}: "
                   f"{user_perf.total_trades} trades, ${user_perf.total_profit_loss} P&L")
        
        return jsonify({
            'status': 'success',
            'message': f'Recalculated from {user_perf.total_trades} closed positions',
            'data': user_perf.to_dict(include_private=True)
        }), 200
        
    except Exception as e:
        logger.error(f"[PERF API] Error recalculating performance: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to recalculate performance'
        }), 500
