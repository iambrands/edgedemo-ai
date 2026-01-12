"""Performance monitoring utilities"""

import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)


def log_performance(threshold=1.0):
    """
    Decorator to log slow endpoints
    
    Args:
        threshold: Log if endpoint takes longer than this (seconds)
    
    Usage:
        @app.route('/api/endpoint')
        @log_performance(threshold=1.0)
        def endpoint():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            start = time.time()
            result = f(*args, **kwargs)
            duration = time.time() - start
            
            if duration > threshold:
                logger.warning(
                    f"⚠️ Slow endpoint: {f.__name__} took {duration:.2f}s "
                    f"(threshold: {threshold}s)"
                )
            else:
                logger.debug(f"✅ {f.__name__} took {duration:.3f}s")
            
            return result
        return decorated
    return decorator

