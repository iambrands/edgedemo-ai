"""Admin endpoints for manual cleanup and maintenance"""

from flask import Blueprint, jsonify, request
from services.cleanup_service import (
    cleanup_expired_positions, 
    get_expiring_today, 
    get_stale_positions,
    cleanup_old_closed_positions
)
from utils.redis_cache import get_redis_cache
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

# TODO: Add authentication middleware for production
# For now, these are unprotected - add auth before production launch


@admin_bp.route('/admin/cleanup/expired', methods=['POST'])
def manual_cleanup_expired():
    """Manually trigger expired position cleanup"""
    try:
        count = cleanup_expired_positions()
        return jsonify({
            'status': 'success',
            'message': f'Closed {count} expired positions',
            'count': count,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Manual cleanup failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/cleanup/cache', methods=['POST'])
def manual_cleanup_cache():
    """Manually clear cache"""
    try:
        cache = get_redis_cache()
        cache.clear_cache()
        return jsonify({
            'status': 'success',
            'message': 'All cache cleared',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/positions/expiring', methods=['GET'])
def check_expiring_positions():
    """Get positions expiring today"""
    try:
        expiring = get_expiring_today()
        return jsonify({
            'status': 'success',
            'count': len(expiring),
            'positions': [{
                'id': p.id,
                'symbol': p.symbol,
                'contract_type': p.contract_type or 'option',
                'strike': float(p.strike_price) if p.strike_price else None,
                'expiration_date': p.expiration_date.isoformat() if p.expiration_date else None,
                'unrealized_pnl_percent': float(p.unrealized_pnl_percent) if p.unrealized_pnl_percent else 0,
                'quantity': p.quantity
            } for p in expiring],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get expiring positions: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/positions/stale', methods=['GET'])
def check_stale_positions():
    """Find positions with stale price data"""
    try:
        hours = request.args.get('hours', 24, type=int)
        stale = get_stale_positions(hours=hours)
        
        return jsonify({
            'status': 'success',
            'count': len(stale),
            'hours_threshold': hours,
            'positions': [{
                'id': p.id,
                'symbol': p.symbol,
                'contract_type': p.contract_type or 'option',
                'strike': float(p.strike_price) if p.strike_price else None,
                'last_updated': p.last_updated.isoformat() if p.last_updated else None,
                'age_hours': (datetime.utcnow() - p.last_updated).total_seconds() / 3600 if p.last_updated else None,
                'current_price': float(p.current_price) if p.current_price else None,
                'entry_price': float(p.entry_price) if p.entry_price else None
            } for p in stale],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get stale positions: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/cache/stats', methods=['GET'])
def cache_stats():
    """Get detailed cache statistics"""
    try:
        cache = get_redis_cache()
        stats = cache.get_stats()
        return jsonify({
            'status': 'success',
            'stats': stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

