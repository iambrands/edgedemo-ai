"""
Intelligent cache manager with tiered TTL strategy and market-aware caching.
"""

import redis
from redis.connection import ConnectionPool
import json
import logging
import time
import os
from datetime import datetime
import pytz
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class CacheManager:
    """
    Intelligent cache manager with connection pooling and tiered TTLs.
    
    Features:
    - Connection pooling (shared across instances)
    - Intelligent TTLs based on symbol popularity and market hours
    - Market-aware caching (shorter TTLs during trading hours)
    """
    
    # Class-level connection pool (shared across all instances)
    _pool = None
    
    def __init__(self):
        redis_url = os.getenv('REDIS_URL')
        self.enabled = os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
        
        if redis_url and self.enabled:
            try:
                # Create pool once, reuse for all connections
                if CacheManager._pool is None:
                    CacheManager._pool = ConnectionPool.from_url(
                        redis_url,
                        max_connections=20,
                        socket_connect_timeout=2,
                        socket_timeout=2,
                        decode_responses=True,
                        health_check_interval=30
                    )
                    logger.info("✅ Redis connection pool created (max=20)")
                
                # Use pool for this connection
                self.redis = redis.Redis(connection_pool=CacheManager._pool)
                
                # Test connection
                self.redis.ping()
                logger.info("✅ CacheManager initialized with connection pool")
            except Exception as e:
                logger.warning(f"⚠️ Redis connection failed, caching disabled: {e}")
                self.enabled = False
                self.redis = None
        else:
            logger.info("ℹ️ Redis caching disabled (CACHE_ENABLED=false or no REDIS_URL)")
            self.redis = None
    
    def get_options_chain(self, symbol: str, expiration: str) -> Optional[Dict]:
        """Get cached options chain data"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            from utils.cache_keys import options_chain_key
            from utils.cache_metrics import CacheMetrics
            
            key = options_chain_key(symbol, expiration)
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"💾 Cache HIT: {key}")
                CacheMetrics.record_hit(key)
                return json.loads(cached)
            logger.debug(f"❌ Cache MISS: {key}")
            CacheMetrics.record_miss(key)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set_options_chain(self, symbol: str, expiration: str, data: Dict, ttl: int = None) -> None:
        """
        Cache options chain with intelligent TTL.
        
        Strategy:
        - Popular symbols: 30 minutes (expensive to fetch, high demand)
        - Standard symbols: 20 minutes (default)
        - Complex symbols: 25 minutes (expensive due to size)
        """
        if not self.enabled or not self.redis:
            return
        
        try:
            from utils.cache_keys import options_chain_key
            key = options_chain_key(symbol, expiration)
            
            # Add cache metadata
            data['_cache_time'] = time.time()
            data['_cache_key'] = key
            
            # Intelligent TTL based on symbol characteristics - INCREASED for better hit rates
            if ttl is None:
                POPULAR_SYMBOLS = ['SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'GOOGL']
                COMPLEX_SYMBOLS = ['SPY', 'QQQ', 'TSLA', 'AAPL']  # Large chains, expensive to fetch
                
                if symbol.upper() in POPULAR_SYMBOLS:
                    ttl = 3600  # 60 minutes for popular symbols (increased from 30min for better hit rate)
                elif symbol.upper() in COMPLEX_SYMBOLS:
                    ttl = 3000  # 50 minutes for complex symbols (increased from 25min)
                else:
                    ttl = 2400  # 40 minutes default (increased from 20min)
            
            # Serialize data to JSON
            serialized_data = json.dumps(data, default=str)
            self.redis.setex(key, ttl, serialized_data)
            logger.debug(f"💾 Cached chain: {key} (TTL: {ttl}s)")
        except (TypeError, ValueError) as e:
            logger.warning(f"Cache set failed for key '{key}': JSON serialization error - {e}")
        except Exception as e:
            logger.warning(f"Cache set failed for key '{key}': {e}")
    
    def get_quote(self, symbol: str) -> Optional[Dict]:
        """Get cached quote data"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            from utils.cache_keys import quote_key
            from utils.cache_metrics import CacheMetrics
            
            key = quote_key(symbol)
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"💾 Cache HIT: {key}")
                CacheMetrics.record_hit(key)
                return json.loads(cached)
            logger.debug(f"❌ Cache MISS: {key}")
            CacheMetrics.record_miss(key)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set_quote(self, symbol: str, data: Dict, ttl: int = None) -> None:
        """
        Cache quote with market-aware TTL.
        
        Strategy:
        - During market hours: 30 seconds (fresher data)
        - After hours: 5 minutes (less critical)
        """
        if not self.enabled or not self.redis:
            return
        
            from utils.cache_keys import quote_key
            key = quote_key(symbol)
            
        try:
            # Check if market is open (Market-aware TTL) - INCREASED for better hit rates
            if ttl is None:
                now = datetime.now(pytz.timezone('US/Eastern'))
                is_market_open = (
                    now.weekday() < 5 and  # Monday-Friday
                    9 <= now.hour < 16 and
                    not (now.hour == 9 and now.minute < 30)
                )
                
                # Increased TTLs: 5min during market hours (increased from 60s), 10min after hours
                ttl = 300 if is_market_open else 600
            
            data['_cache_time'] = time.time()
            # Serialize data to JSON
            serialized_data = json.dumps(data, default=str)
            self.redis.setex(key, ttl, serialized_data)
            logger.debug(f"💾 Cached quote: {key} (TTL: {ttl}s)")
        except (TypeError, ValueError) as e:
            logger.warning(f"Cache set failed for key '{key}': JSON serialization error - {e}")
        except Exception as e:
            logger.warning(f"Cache set failed for key '{key}': {e}")
    
    def get_analysis(self, symbol: str, expiration: str, preference: str) -> Optional[Dict]:
        """Get cached analysis result"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            from utils.cache_keys import analysis_key
            from utils.cache_metrics import CacheMetrics
            
            key = analysis_key(symbol, expiration, preference)
            cached = self.redis.get(key)
            if cached:
                logger.debug(f"💾 Cache HIT: {key}")
                CacheMetrics.record_hit(key)
                return json.loads(cached)
            logger.debug(f"❌ Cache MISS: {key}")
            CacheMetrics.record_miss(key)
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set_analysis(self, symbol: str, expiration: str, preference: str, data: Dict, ttl: int = 1800) -> None:
        """Cache analysis result"""
        if not self.enabled or not self.redis:
            return
        
        try:
            from utils.cache_keys import analysis_key
            key = analysis_key(symbol, expiration, preference)
            data['_cache_time'] = time.time()
            # Serialize data to JSON
            serialized_data = json.dumps(data, default=str)
            self.redis.setex(key, ttl, serialized_data)
            logger.debug(f"💾 Cached analysis: {key} (TTL: {ttl}s)")
        except (TypeError, ValueError) as e:
            logger.warning(f"Cache set failed for key '{key}': JSON serialization error - {e}")
        except Exception as e:
            logger.warning(f"Cache set failed for key '{key}': {e}")
    
    def clear_expired_chains(self) -> int:
        """Clear cache for expired options contracts"""
        if not self.enabled or not self.redis:
            return 0
        
        try:
            cleared = 0
            pattern = "chain:*:*"
            for key in self.redis.scan_iter(match=pattern, count=100):
                # Parse expiration from key: "chain:AAPL:2026-01-23"
                parts = key.split(':')
                if len(parts) >= 3:
                    try:
                        exp_date = datetime.strptime(parts[2], '%Y-%m-%d').date()
                        if exp_date < datetime.now().date():
                            self.redis.delete(key)
                            cleared += 1
                    except ValueError:
                        continue
            
            if cleared > 0:
                logger.info(f"🧹 Cleared {cleared} expired cache entries")
            return cleared
        except Exception as e:
            logger.error(f"Failed to clear expired cache: {e}")
            return 0
    
    def get_stats(self) -> Dict:
        """Get cache statistics"""
        if not self.enabled or not self.redis:
            return {'enabled': False}
        
        try:
            info = self.redis.info()
            return {
                'enabled': True,
                'connected': True,
                'keys': self.redis.dbsize(),
                'memory_used': info.get('used_memory_human', 'N/A'),
                'pool_size': info.get('connected_clients', 'N/A')
            }
        except Exception as e:
            return {'enabled': True, 'connected': False, 'error': str(e)}

