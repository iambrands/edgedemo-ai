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
    Comprehensive health check endpoint.
    Returns system status and configuration.
    """
    try:
        from models.position import Position
        from app import db
        from services.tradier_connector import TradierConnector
        from utils.redis_cache import get_redis_cache
        
        # Database check with timeout
        db_healthy = True
        position_count = None
        open_positions = None
        try:
            # Quick connection test with timeout
            db.session.execute('SELECT 1')
            db.session.commit()
            
            # Try to get counts, but don't fail if it times out
            try:
                position_count = db.session.query(Position).count()
                open_positions = db.session.query(Position).filter_by(status='open').count()
            except Exception as count_error:
                logger.warning(f"Could not get position counts: {count_error}")
                # Database is connected but query timed out - still healthy
                position_count = 0
                open_positions = 0
        except Exception as e:
            db_healthy = False
            logger.error(f"Database health check failed: {e}")
        
        # Tradier check
        tradier_config = {}
        try:
            tradier = TradierConnector()
            tradier_config = {
                'sandbox': tradier.sandbox,
                'base_url': tradier.base_url,
                'api_key_present': bool(tradier.api_key),
                'use_mock': tradier.use_mock
            }
        except Exception as e:
            logger.error(f"Tradier config check failed: {e}")
            tradier_config = {'error': str(e)}
        
        # Cache check
        cache_stats = {}
        try:
            cache = get_redis_cache()
            cache_stats = cache.get_stats()
        except Exception as e:
            logger.error(f"Cache stats check failed: {e}")
            cache_stats = {'error': str(e)}
        
        # Environment info
        env_info = {
            'environment': os.getenv('FLASK_ENV', 'production'),
            'debug_mode': os.getenv('DEBUG', 'false').lower() == 'true',
            'cache_enabled': cache_stats.get('using_redis', False),
            'redis_url_present': bool(os.getenv('REDIS_URL'))
        }
        
        # Overall health - be more lenient
        # System is healthy if Tradier is configured, even if DB has issues
        # DB issues might be temporary (connection pool, query timeout)
        overall_healthy = tradier_config.get('api_key_present', False) and db_healthy
        # But allow degraded status if only DB has issues (not critical for read-only endpoints)
        is_degraded = not db_healthy and tradier_config.get('api_key_present', False)
        
        status = 'healthy' if overall_healthy else ('degraded' if is_degraded else 'unhealthy')
        
        return jsonify({
            'status': status,
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'components': {
                'database': {
                    'status': 'healthy' if db_healthy else 'unhealthy',
                    'total_positions': position_count,
                    'open_positions': open_positions
                },
                'tradier_api': {
                    'status': 'configured' if tradier_config.get('api_key_present') else 'not_configured',
                    'config': tradier_config
                },
                'cache': {
                    'status': 'healthy' if cache_stats.get('using_redis') else 'degraded',
                    'stats': cache_stats
                }
            },
            'environment': env_info
        }), 200 if overall_healthy else (503 if is_degraded else 503)
        
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

