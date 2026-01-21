"""
Cache metrics tracking for monitoring hit rates and performance.
"""

import logging
from utils.redis_cache import get_redis_cache

logger = logging.getLogger(__name__)


class CacheMetrics:
    """Track cache hit/miss rates and performance metrics."""
    
    METRICS_KEY = 'cache:metrics'
    KEY_STATS_KEY = 'cache:metrics:keys'
    
    @staticmethod
    def record_hit(key: str):
        """Record a cache hit."""
        try:
            cache = get_redis_cache()
            if cache.use_redis and cache.redis_client:
                cache.redis_client.hincrby(CacheMetrics.METRICS_KEY, 'hits', 1)
                cache.redis_client.hincrby(CacheMetrics.KEY_STATS_KEY, key, 1)
        except Exception as e:
            logger.debug(f"Failed to record cache hit: {e}")
    
    @staticmethod
    def record_miss(key: str):
        """Record a cache miss."""
        try:
            cache = get_redis_cache()
            if cache.use_redis and cache.redis_client:
                cache.redis_client.hincrby(CacheMetrics.METRICS_KEY, 'misses', 1)
        except Exception as e:
            logger.debug(f"Failed to record cache miss: {e}")
    
    @staticmethod
    def get_hit_rate() -> float:
        """Calculate current hit rate percentage."""
        try:
            cache = get_redis_cache()
            if not cache.use_redis or not cache.redis_client:
                return 0.0
            
            metrics = cache.redis_client.hgetall(CacheMetrics.METRICS_KEY)
            hits = int(metrics.get(b'hits', 0) or metrics.get('hits', 0) or 0)
            misses = int(metrics.get(b'misses', 0) or metrics.get('misses', 0) or 0)
            total = hits + misses
            
            if total == 0:
                return 0.0
            
            return (hits / total) * 100
        except Exception as e:
            logger.error(f"Error calculating hit rate: {e}")
            return 0.0
    
    @staticmethod
    def get_stats() -> dict:
        """Get comprehensive cache statistics."""
        try:
            cache = get_redis_cache()
            if not cache.use_redis or not cache.redis_client:
                return {
                    'hit_rate': 0.0,
                    'hits': 0,
                    'misses': 0,
                    'total_keys': 0,
                    'using_redis': False
                }
            
            metrics = cache.redis_client.hgetall(CacheMetrics.METRICS_KEY)
            hits = int(metrics.get(b'hits', 0) or metrics.get('hits', 0) or 0)
            misses = int(metrics.get(b'misses', 0) or metrics.get('misses', 0) or 0)
            total = hits + misses
            hit_rate = (hits / total * 100) if total > 0 else 0.0
            
            # Get Redis info
            info = cache.redis_client.info('memory')
            total_keys = cache.redis_client.dbsize()
            
            return {
                'hit_rate': round(hit_rate, 2),
                'hits': hits,
                'misses': misses,
                'total': total,
                'total_keys': total_keys,
                'memory_used': info.get('used_memory_human', 'N/A'),
                'using_redis': True
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {
                'hit_rate': 0.0,
                'hits': 0,
                'misses': 0,
                'total_keys': 0,
                'using_redis': False,
                'error': str(e)
            }
    
    @staticmethod
    def reset_metrics():
        """Reset all cache metrics (for testing/debugging)."""
        try:
            cache = get_redis_cache()
            if cache.use_redis and cache.redis_client:
                cache.redis_client.delete(CacheMetrics.METRICS_KEY)
                cache.redis_client.delete(CacheMetrics.KEY_STATS_KEY)
                logger.info("Cache metrics reset")
        except Exception as e:
            logger.error(f"Error resetting metrics: {e}")

