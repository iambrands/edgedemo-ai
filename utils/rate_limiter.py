"""
Rate limiting utility for API calls
Prevents hitting API rate limits by throttling requests
"""
import time
from collections import defaultdict
from functools import wraps
from typing import Callable, Any
from flask import current_app

class RateLimiter:
    """Simple in-memory rate limiter for API calls"""
    
    def __init__(self, max_calls: int = 60, period: int = 60):
        """
        Initialize rate limiter
        
        Args:
            max_calls: Maximum number of calls allowed
            period: Time period in seconds (default 60 = 1 minute)
        """
        self.max_calls = max_calls
        self.period = period
        self.calls = defaultdict(list)  # Track calls per endpoint/function
    
    def __call__(self, func: Callable) -> Callable:
        """Decorator to rate limit a function"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            # Use function name as key (could also use endpoint)
            key = func.__name__
            
            # Remove calls outside the time period
            self.calls[key] = [t for t in self.calls[key] if now - t < self.period]
            
            # Check if we've exceeded the limit
            if len(self.calls[key]) >= self.max_calls:
                # Calculate how long to wait
                oldest_call = self.calls[key][0]
                sleep_time = self.period - (now - oldest_call)
                
                if sleep_time > 0:
                    try:
                        current_app.logger.warning(
                            f"Rate limit reached for {key}. Waiting {sleep_time:.2f} seconds."
                        )
                    except RuntimeError:
                        pass
                    
                    time.sleep(sleep_time)
                    # Update now after sleep
                    now = time.time()
                    # Clean up again after sleep
                    self.calls[key] = [t for t in self.calls[key] if now - t < self.period]
            
            # Record this call
            self.calls[key].append(now)
            
            # Execute the function
            return func(*args, **kwargs)
        
        return wrapper
    
    def reset(self, key: str = None):
        """Reset rate limit for a specific key or all keys"""
        if key:
            self.calls.pop(key, None)
        else:
            self.calls.clear()

# Global rate limiter instance for Tradier API
# Tradier Sandbox: 120 requests/minute
# Tradier Production: 60 requests/minute
# Using conservative 60 requests/minute to be safe
tradier_rate_limiter = RateLimiter(max_calls=60, period=60)

