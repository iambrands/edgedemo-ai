"""
Standardized cache key generation for consistent key naming across the application.
This ensures cache keys match between requests and improves hit rates.
"""

def quote_key(symbol: str) -> str:
    """Generate cache key for stock quote."""
    return f"quote:{symbol.upper()}"

def options_chain_key(symbol: str, expiration: str) -> str:
    """Generate cache key for options chain."""
    return f"chain:{symbol.upper()}:{expiration}"

def user_positions_key(user_id: int) -> str:
    """Generate cache key for user positions."""
    return f"positions:user:{user_id}"

def rate_limit_key(user_id: int, endpoint: str) -> str:
    """Generate cache key for rate limiting."""
    return f"ratelimit:{user_id}:{endpoint}"

def symbol_info_key(symbol: str) -> str:
    """Generate cache key for symbol info."""
    return f"symbol:{symbol.upper()}"

def analysis_key(symbol: str, expiration: str, preference: str) -> str:
    """Generate cache key for options analysis."""
    return f"analysis:{symbol.upper()}:{expiration}:{preference}"

def expirations_key(symbol: str) -> str:
    """Generate cache key for option expirations list."""
    return f"expirations:{symbol.upper()}"

def historical_data_key(symbol: str, start_date: str, end_date: str) -> str:
    """Generate cache key for historical data."""
    return f"history:{symbol.upper()}:{start_date}:{end_date}"

def user_profile_key(user_id: int) -> str:
    """Generate cache key for user profile."""
    return f"user:{user_id}:profile"

def watchlist_key(user_id: int) -> str:
    """Generate cache key for user watchlist."""
    return f"watchlist:user:{user_id}"

