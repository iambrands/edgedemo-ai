"""Simple in-memory caching for API responses"""

from functools import wraps
from flask import request
import hashlib
import json
import time
import logging

logger = logging.getLogger(__name__)

# Simple in-memory cache
_cache = {}
_cache_timestamps = {}


def cached(timeout=300):
    """
    Cache decorator for API endpoints
    
    Usage:
        @app.route('/api/expensive-endpoint')
        @cached(timeout=60)  # Cache for 60 seconds
        def expensive_endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Generate cache key from route + args
            cache_key = f"{request.path}:{json.dumps(request.args.to_dict(), sort_keys=True)}"
            cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Check if cached and not expired
            if cache_key in _cache:
                cached_time = _cache_timestamps.get(cache_key, 0)
                if time.time() - cached_time < timeout:
                    logger.debug(f"Cache HIT: {request.path}")
                    return _cache[cache_key]
            
            # Execute function and cache result
            logger.debug(f"Cache MISS: {request.path}")
            result = f(*args, **kwargs)
            _cache[cache_key] = result
            _cache_timestamps[cache_key] = time.time()
            
            return result
        
        return decorated_function
    return decorator


def clear_cache():
    """Clear all cached data"""
    global _cache, _cache_timestamps
    _cache = {}
    _cache_timestamps = {}
    logger.info("Cache cleared")


def get_cache_stats():
    """Get cache statistics"""
    return {
        'entries': len(_cache),
        'total_size': sum(len(str(v)) for v in _cache.values())
    }

