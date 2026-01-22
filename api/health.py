"""Health check and system status endpoints"""

from flask import Blueprint, jsonify, current_app
from datetime import datetime, timedelta
import os
import logging

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)


@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    Lightweight health check for Railway/GCP deployment.
    Returns immediately without checking cache or database to avoid timeouts.
    """
    try:
        # Simple health check - just verify app is running
        # Don't check cache or database (those can be slow during startup)
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0'
        }), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 503


@health_bp.route('/health/cache', methods=['GET'])
def cache_health():
    """Detailed cache statistics with comprehensive status"""
    try:
        from utils.redis_cache import get_redis_cache
        from services.cache_manager import CacheManager
        from utils.cache_metrics import CacheMetrics
        
        cache = get_redis_cache()
        cache_manager = CacheManager()
        
        # Get stats from both implementations
        stats = cache.get_stats()
        
        # Add cache metrics
        metrics = CacheMetrics.get_stats()
        stats.update(metrics)
        
        # Determine status
        if cache.use_redis and cache.redis_client:
            try:
                cache.redis_client.ping()
                total_keys = cache.redis_client.dbsize()
                stats['enabled'] = True
                stats['connected'] = True
                stats['keys'] = total_keys
                stats['total_keys'] = total_keys
                stats['status'] = 'HEALTHY' if total_keys > 0 else 'CONNECTED'
            except Exception as e:
                stats['enabled'] = True
                stats['connected'] = False
                stats['status'] = 'ERROR'
                stats['error'] = str(e)
        elif cache_manager.enabled and cache_manager.redis:
            try:
                cache_manager.redis.ping()
                total_keys = cache_manager.redis.dbsize()
                stats['enabled'] = True
                stats['connected'] = True
                stats['keys'] = total_keys
                stats['total_keys'] = total_keys
                stats['status'] = 'HEALTHY' if total_keys > 0 else 'CONNECTED'
            except Exception as e:
                stats['enabled'] = True
                stats['connected'] = False
                stats['status'] = 'ERROR'
                stats['error'] = str(e)
        else:
            stats['enabled'] = False
            stats['connected'] = False
            stats['status'] = 'NOT_CONFIGURED'
        
        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Cache health check failed: {e}", exc_info=True)
        return jsonify({
            'enabled': False,
            'connected': False,
            'status': 'ERROR',
            'error': str(e)
        }), 500


@health_bp.route('/health/precompute', methods=['GET'])
def precompute_status():
    """Get precompute service status"""
    try:
        from services.precompute_service import PrecomputeService
        service = PrecomputeService()
        return jsonify(service.get_status()), 200
    except Exception as e:
        logger.error(f"Precompute status check failed: {e}", exc_info=True)
        return jsonify({'status': 'error', 'error': str(e)}), 500

@health_bp.route('/health/positions', methods=['GET'])
def positions_health():
    """Position monitoring health"""
    try:
        from models.position import Position
        from app import db
        
        open_positions = db.session.query(Position).filter_by(status='open').count()
        closed_positions = db.session.query(Position).filter_by(status='closed').count()
        
        # Check for stale positions (no update in 24 hours)
        cutoff = datetime.utcnow() - timedelta(hours=24)
        stale_positions = db.session.query(Position).filter(
            Position.status == 'open',
            Position.last_updated < cutoff
        ).count()
        
        # Check for expired positions still open
        today = datetime.utcnow().date()
        expired_open = db.session.query(Position).filter(
            Position.status == 'open',
            Position.expiration_date < today
        ).count()
        
        return jsonify({
            'status': 'healthy',
            'positions': {
                'open': open_positions,
                'closed': closed_positions,
                'stale': stale_positions,
                'expired_open': expired_open
            },
            'warnings': {
                'stale_positions': stale_positions > 0,
                'expired_open': expired_open > 0
            }
        }), 200
    except Exception as e:
        logger.error(f"Positions health check failed: {e}", exc_info=True)
        return jsonify({'status': 'error', 'error': str(e)}), 500

