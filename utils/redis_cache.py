"""Redis-based caching with fallback to in-memory cache"""

import redis
import json
import hashlib
from functools import wraps
from flask import request, current_app
from typing import Optional, Any
import logging
import time

logger = logging.getLogger(__name__)

# Fallback in-memory cache (used if Redis unavailable)
_in_memory_cache = {}
_in_memory_timestamps = {}


class RedisCache:
    """Redis-based caching with fallback to in-memory"""
    
    def __init__(self):
        self.redis_client = None
        self.use_redis = False
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            # Try to get Redis URL from config
            redis_url = None
            try:
                redis_url = current_app.config.get('REDIS_URL')
            except RuntimeError:
                # Outside app context - check environment directly
                import os
                redis_url = os.environ.get('REDIS_URL')
            
            if redis_url:
                try:
                    self.redis_client = redis.from_url(
                        redis_url,
                        decode_responses=True,
                        socket_connect_timeout=2,
                        socket_timeout=2,
                        retry_on_timeout=True,
                        health_check_interval=30
                    )
                    # Test connection with short timeout
                    self.redis_client.ping()
                    self.use_redis = True
                    logger.info("✅ Redis cache connected")
                except redis.ConnectionError as e:
                    logger.warning(f"⚠️ Redis connection error: {e}, using in-memory cache")
                    self.use_redis = False
                    self.redis_client = None
                except Exception as e:
                    logger.warning(f"⚠️ Redis initialization error: {e}, using in-memory cache")
                    self.use_redis = False
                    self.redis_client = None
            else:
                logger.debug("REDIS_URL not set, using in-memory cache")
                self.use_redis = False
                self.redis_client = None
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}, using in-memory cache")
            self.use_redis = False
            self.redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if self.use_redis and self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
            except redis.ConnectionError:
                logger.warning("Redis connection lost, falling back to in-memory")
                self.use_redis = False
            except json.JSONDecodeError:
                logger.error(f"Failed to decode cached value for key: {key}")
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        
        # Fallback to in-memory cache
        if key in _in_memory_cache:
            cached_time = _in_memory_timestamps.get(key, 0)
            # In-memory cache doesn't have TTL, so we'll use a default 5-minute expiration
            if time.time() - cached_time < 300:
                return _in_memory_cache[key]
            else:
                # Expired, remove it
                _in_memory_cache.pop(key, None)
                _in_memory_timestamps.pop(key, None)
        
        return None
    
    def set(self, key: str, value: Any, timeout: int = 300):
        """Set value in cache with TTL"""
        if self.use_redis and self.redis_client:
            try:
                self.redis_client.setex(
                    key,
                    timeout,
                    json.dumps(value, default=str)
                )
                return True
            except redis.ConnectionError:
                logger.warning("Redis connection lost, falling back to in-memory")
                self.use_redis = False
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        # Fallback to in-memory cache
        _in_memory_cache[key] = value
        _in_memory_timestamps[key] = time.time()
        return True
    
    def delete(self, key: str):
        """Delete key from cache"""
        if self.use_redis and self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        
        # Also remove from in-memory cache
        _in_memory_cache.pop(key, None)
        _in_memory_timestamps.pop(key, None)
    
    def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern"""
        if self.use_redis and self.redis_client:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis clear_pattern error: {e}")
        
        # Also clear from in-memory cache (simple prefix match)
        keys_to_delete = [k for k in _in_memory_cache.keys() if pattern.replace('*', '') in k]
        for key in keys_to_delete:
            _in_memory_cache.pop(key, None)
            _in_memory_timestamps.pop(key, None)
    
    def get_stats(self):
        """Get cache statistics"""
        stats = {
            'using_redis': self.use_redis,
            'in_memory_entries': len(_in_memory_cache)
        }
        
        if self.use_redis and self.redis_client:
            try:
                info = self.redis_client.info('memory')
                stats['redis_memory_used'] = info.get('used_memory_human', 'N/A')
                stats['redis_keys'] = self.redis_client.dbsize()
            except Exception as e:
                logger.error(f"Error getting Redis stats: {e}")
        
        return stats


# Global instance
_redis_cache = None


def get_redis_cache():
    """Get Redis cache instance (singleton)"""
    global _redis_cache
    if _redis_cache is None:
        _redis_cache = RedisCache()
    return _redis_cache


def cached(timeout=300, key_prefix='cache'):
    """
    Redis-based cache decorator with fallback to in-memory
    
    Usage:
        @app.route('/api/endpoint')
        @cached(timeout=60, key_prefix='api')
        def endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache = get_redis_cache()
            
            # Generate cache key from route + args
            cache_key_parts = [request.path]
            if request.args:
                cache_key_parts.append(json.dumps(request.args.to_dict(), sort_keys=True))
            if request.method == 'POST' and request.is_json:
                try:
                    cache_key_parts.append(json.dumps(request.get_json(), sort_keys=True))
                except:
                    pass
            
            cache_key_str = ':'.join(cache_key_parts)
            cache_key_hash = hashlib.md5(cache_key_str.encode()).hexdigest()
            cache_key = f"{key_prefix}:{cache_key_hash}"
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache HIT: {request.path}")
                return cached_value
            
            # Execute function
            logger.debug(f"Cache MISS: {request.path}")
            result = f(*args, **kwargs)
            
            # Cache result (only if it's a valid response)
            if result and hasattr(result, 'status_code') and result.status_code == 200:
                try:
                    # Extract JSON from response if it's a Flask response
                    if hasattr(result, 'get_json'):
                        json_data = result.get_json()
                        cache.set(cache_key, json_data, timeout=timeout)
                    else:
                        # Assume it's already JSON-serializable
                        cache.set(cache_key, result, timeout=timeout)
                except Exception as e:
                    logger.warning(f"Failed to cache response: {e}")
            
            return result
        
        return decorated_function
    return decorator

