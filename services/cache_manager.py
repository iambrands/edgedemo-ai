"""
Intelligent cache manager with tiered TTL strategy and market-aware caching.
"""

import redis
from redis.connection import ConnectionPool
import json
import logging
import time
import os
from datetime import datetime, date
from decimal import Decimal
import pytz
from typing import Dict, Optional, Any, Union

logger = logging.getLogger(__name__)


def safe_serialize(obj: Any) -> Any:
    """
    Recursively convert objects to JSON-serializable format.
    
    Handles:
    - datetime/date objects → ISO format strings
    - Decimal numbers → floats
    - bytes → UTF-8 strings
    - Custom objects with __dict__ → dictionaries
    - Nested dicts and lists
    - None, bool, int, float, str pass through unchanged
    """
    if obj is None:
        return None
    elif isinstance(obj, (bool, int, float, str)):
        return obj
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, bytes):
        try:
            return obj.decode('utf-8')
        except:
            return str(obj)
    elif isinstance(obj, dict):
        return {str(k): safe_serialize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [safe_serialize(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        # Custom object - convert to dict
        return safe_serialize(obj.__dict__)
    else:
        # Fallback - convert to string
        return str(obj)


def safe_json_dumps(data: Any) -> str:
    """
    Safely serialize any data to JSON string.
    
    First converts to safe format, then serializes.
    """
    try:
        serializable = safe_serialize(data)
        return json.dumps(serializable)
    except Exception as e:
        logger.error(f"JSON serialization failed: {e}")
        # Last resort: convert everything to string
        return json.dumps(str(data))


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
    
    def get_options_chain(self, symbol: str, expiration: str) -> Optional[Any]:
        """Get cached options chain data"""
        if not self.enabled or not self.redis:
            return None
        
        try:
            from utils.cache_keys import options_chain_key
            from utils.cache_metrics import CacheMetrics
            
            key = options_chain_key(symbol, expiration)
            cached = self.redis.get(key)
            if cached:
                logger.info(f"💾 Cache HIT: {key}")
                CacheMetrics.record_hit(key)
                
                parsed = json.loads(cached)
                
                # Handle wrapped data format (new format with 'data' key)
                if isinstance(parsed, dict) and 'data' in parsed:
                    return parsed['data']
                
                # Handle legacy format (data stored directly)
                return parsed
                
            logger.debug(f"❌ Cache MISS: {key}")
            CacheMetrics.record_miss(key)
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Cache JSON decode failed for {key}, deleting corrupt entry: {e}")
            try:
                self.redis.delete(key)
            except:
                pass
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set_options_chain(self, symbol: str, expiration: str, data: Any, ttl: int = None) -> bool:
        """
        Cache options chain with intelligent TTL.
        
        Strategy:
        - Popular symbols: 60 minutes (expensive to fetch, high demand)
        - Complex symbols: 50 minutes (expensive due to size)
        - Standard symbols: 40 minutes (default)
        
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.enabled or not self.redis:
            return False
        
        # Generate key BEFORE try block to ensure it's in scope for error handling
        from utils.cache_keys import options_chain_key
        key = options_chain_key(symbol, expiration)
        
        try:
            # Wrap data with cache metadata (handles both dict and list data)
            cache_wrapper = {
                '_cache_time': time.time(),
                '_cache_key': key,
                '_symbol': symbol,
                '_expiration': expiration,
                'data': data  # Original data wrapped inside
            }
            
            # Intelligent TTL based on symbol characteristics
            if ttl is None:
                POPULAR_SYMBOLS = ['SPY', 'QQQ', 'IWM', 'DIA', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'GOOGL']
                COMPLEX_SYMBOLS = ['SPY', 'QQQ', 'TSLA', 'AAPL']  # Large chains, expensive to fetch
                
                if symbol.upper() in POPULAR_SYMBOLS:
                    ttl = 3600  # 60 minutes for popular symbols
                elif symbol.upper() in COMPLEX_SYMBOLS:
                    ttl = 3000  # 50 minutes for complex symbols
                else:
                    ttl = 2400  # 40 minutes default
            
            # Use safe serialization that handles all types
            serialized_data = safe_json_dumps(cache_wrapper)
            self.redis.setex(key, ttl, serialized_data)
            
            size_kb = len(serialized_data) / 1024
            logger.info(f"💾 Cached chain: {key} (TTL: {ttl}s, size: {size_kb:.1f}KB)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache set failed for key '{key}': {type(e).__name__}: {e}")
            return False
    
    def get_quote(self, symbol: str) -> Optional[Any]:
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
                
                parsed = json.loads(cached)
                
                # Handle wrapped format (new format with 'data' key)
                if isinstance(parsed, dict) and 'data' in parsed:
                    return parsed['data']
                
                # Handle legacy format
                return parsed
                
            logger.debug(f"❌ Cache MISS: {key}")
            CacheMetrics.record_miss(key)
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Cache JSON decode failed for {key}, deleting corrupt entry: {e}")
            try:
                self.redis.delete(key)
            except:
                pass
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set_quote(self, symbol: str, data: Any, ttl: int = None) -> bool:
        """
        Cache quote with market-aware TTL.
        
        Strategy:
        - During market hours: 5 minutes (fresher data)
        - After hours: 10 minutes (less critical)
        
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.enabled or not self.redis:
            return False
        
        # Generate key BEFORE try block to ensure it's in scope for error handling
        from utils.cache_keys import quote_key
        key = quote_key(symbol)
        
        try:
            # Check if market is open (Market-aware TTL)
            if ttl is None:
                now = datetime.now(pytz.timezone('US/Eastern'))
                is_market_open = (
                    now.weekday() < 5 and  # Monday-Friday
                    9 <= now.hour < 16 and
                    not (now.hour == 9 and now.minute < 30)
                )
                
                # 5min during market hours, 10min after hours
                ttl = 300 if is_market_open else 600
            
            # Wrap data with cache metadata
            cache_wrapper = {
                '_cache_time': time.time(),
                '_symbol': symbol,
                'data': data
            }
            
            # Use safe serialization
            serialized_data = safe_json_dumps(cache_wrapper)
            self.redis.setex(key, ttl, serialized_data)
            logger.debug(f"💾 Cached quote: {key} (TTL: {ttl}s)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache set failed for key '{key}': {type(e).__name__}: {e}")
            return False
    
    def get_analysis(self, symbol: str, expiration: str, preference: str) -> Optional[Any]:
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
                
                parsed = json.loads(cached)
                
                # Handle wrapped format (new format with 'data' key)
                if isinstance(parsed, dict) and 'data' in parsed:
                    return parsed['data']
                
                # Handle legacy format
                return parsed
                
            logger.debug(f"❌ Cache MISS: {key}")
            CacheMetrics.record_miss(key)
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Cache JSON decode failed for {key}, deleting corrupt entry: {e}")
            try:
                self.redis.delete(key)
            except:
                pass
            return None
        except Exception as e:
            logger.warning(f"Cache get failed: {e}")
            return None
    
    def set_analysis(self, symbol: str, expiration: str, preference: str, data: Any, ttl: int = 1800) -> bool:
        """
        Cache analysis result
        
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.enabled or not self.redis:
            return False
        
        # Generate key BEFORE try block to ensure it's in scope for error handling
        from utils.cache_keys import analysis_key
        key = analysis_key(symbol, expiration, preference)
        
        try:
            # Wrap data with cache metadata
            cache_wrapper = {
                '_cache_time': time.time(),
                '_symbol': symbol,
                '_expiration': expiration,
                '_preference': preference,
                'data': data
            }
            
            # Use safe serialization
            serialized_data = safe_json_dumps(cache_wrapper)
            self.redis.setex(key, ttl, serialized_data)
            
            size_kb = len(serialized_data) / 1024
            logger.debug(f"💾 Cached analysis: {key} (TTL: {ttl}s, size: {size_kb:.1f}KB)")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache set failed for key '{key}': {type(e).__name__}: {e}")
            return False
    
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

