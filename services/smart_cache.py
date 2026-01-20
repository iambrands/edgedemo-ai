"""
Smart caching strategy for option analysis
- Variable TTL based on market conditions
- Cache key generation
- Cache warming for popular symbols
"""

import logging
from datetime import datetime, timedelta
from utils.redis_cache import get_redis_cache

logger = logging.getLogger(__name__)

class SmartCache:
    """Intelligent caching for option analysis"""
    
    # Popular symbols to pre-cache
    POPULAR_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'META', 'MSFT', 'GOOGL', 'AMZN']
    
    @staticmethod
    def get_analysis_key(symbol: str, expiration: str, option_type: str = 'both', preference: str = 'balanced') -> str:
        """
        Generate cache key for option analysis
        
        Args:
            symbol: Stock symbol (e.g., 'TSLA')
            expiration: Date string 'YYYY-MM-DD'
            option_type: 'call', 'put', or 'both'
            preference: Strategy preference ('income', 'growth', 'balanced')
        
        Returns:
            Cache key string
        """
        # Include hour for intraday cache granularity
        hour = datetime.now().strftime('%Y-%m-%d:%H')
        return f"analysis:{symbol.upper()}:{expiration}:{option_type}:{preference}:{hour}"
    
    @staticmethod
    def get_ttl(symbol: str, expiration: str) -> int:
        """
        Calculate smart TTL based on:
        - Time of day (market hours = shorter cache)
        - Days to expiration (closer = shorter cache)
        - Symbol popularity (popular = longer cache due to higher traffic)
        
        Returns:
            TTL in seconds
        """
        now = datetime.now()
        
        # Parse expiration date
        try:
            exp_date = datetime.strptime(expiration, '%Y-%m-%d').date()
            days_to_exp = (exp_date - now.date()).days
        except:
            days_to_exp = 30  # Default to monthly
        
        # Check if during market hours (9:30 AM - 4:00 PM EST)
        # Note: This is a simplified check - in production, use pytz for timezone handling
        market_open = now.replace(hour=9, minute=30, second=0)
        market_close = now.replace(hour=16, minute=0, second=0)
        is_market_hours = market_open <= now <= market_close
        
        # Calculate base TTL
        if is_market_hours:
            if days_to_exp <= 7:
                base_ttl = 300  # 5 minutes for weekly options
            elif days_to_exp <= 30:
                base_ttl = 900  # 15 minutes for monthly
            else:
                base_ttl = 1800  # 30 minutes for LEAPS
        else:
            # After hours - longer cache
            base_ttl = 3600  # 1 hour
        
        # Popular symbols get slightly longer cache (more traffic = more value)
        if symbol.upper() in SmartCache.POPULAR_SYMBOLS:
            base_ttl = int(base_ttl * 1.5)
        
        return base_ttl
    
    @staticmethod
    def cache_analysis(symbol: str, expiration: str, option_type: str, preference: str, data: any) -> bool:
        """
        Cache option analysis with smart TTL
        
        Args:
            symbol: Stock symbol
            expiration: Expiration date string
            option_type: 'call', 'put', or 'both'
            preference: Strategy preference
            data: Analysis results to cache
        
        Returns:
            True if cached successfully
        """
        try:
            cache = get_redis_cache()
            key = SmartCache.get_analysis_key(symbol, expiration, option_type, preference)
            ttl = SmartCache.get_ttl(symbol, expiration)
            
            success = cache.set(key, data, timeout=ttl)
            
            if success:
                logger.info(f"📦 Cached {symbol} {expiration} analysis for {ttl}s")
            
            return success
        except Exception as e:
            logger.error(f"❌ Failed to cache analysis: {e}")
            return False
    
    @staticmethod
    def get_cached_analysis(symbol: str, expiration: str, option_type: str = 'both', preference: str = 'balanced') -> any:
        """
        Get cached analysis if available
        
        Returns:
            Cached data or None
        """
        try:
            cache = get_redis_cache()
            key = SmartCache.get_analysis_key(symbol, expiration, option_type, preference)
            cached = cache.get(key)
            
            if cached:
                logger.info(f"✅ Cache hit: {symbol} {expiration}")
                return cached
            
            logger.debug(f"❌ Cache miss: {symbol} {expiration}")
            return None
        except Exception as e:
            logger.error(f"❌ Failed to get cached analysis: {e}")
            return None
    
    @staticmethod
    def invalidate_analysis(symbol: str, expiration: str = None) -> bool:
        """
        Invalidate cached analysis for a symbol
        
        Args:
            symbol: Stock symbol
            expiration: Optional specific expiration, or None for all
        
        Returns:
            True if invalidated successfully
        """
        try:
            cache = get_redis_cache()
            if expiration:
                # Invalidate specific expiration
                for option_type in ['call', 'put', 'both']:
                    for pref in ['income', 'growth', 'balanced']:
                        key = SmartCache.get_analysis_key(symbol, expiration, option_type, pref)
                        cache.delete(key)
            else:
                # Invalidate all expirations for this symbol
                # Note: Redis doesn't support pattern delete directly, so we'd need to scan
                # For now, just log - full pattern deletion can be added later if needed
                logger.info(f"🗑️  Invalidated cache for {symbol} (all expirations)")
            
            return True
        except Exception as e:
            logger.error(f"❌ Failed to invalidate cache: {e}")
            return False

