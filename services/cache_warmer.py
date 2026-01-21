"""
Cache warming service to preload frequently accessed data.
This improves cache hit rates by proactively populating the cache.
"""

import logging
from datetime import datetime, timedelta
from utils.redis_cache import get_redis_cache
from utils.cache_keys import quote_key, options_chain_key, expirations_key
from services.tradier_connector import TradierConnector
from services.cache_manager import CacheManager

logger = logging.getLogger(__name__)


class CacheWarmer:
    """Preload frequently accessed data into Redis cache."""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.cache_manager = CacheManager()
        self.cache = get_redis_cache()
        
        # Popular symbols that are frequently accessed
        self.popular_symbols = [
            'SPY', 'QQQ', 'IWM', 'DIA',  # ETFs
            'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'GOOGL', 'AMZN',  # Tech
            'AMD', 'INTC', 'NFLX', 'DIS'  # Additional popular
        ]
    
    def _get_next_friday(self) -> str:
        """Get next Friday's date for options expiration."""
        today = datetime.now()
        days_ahead = 4 - today.weekday()  # Friday = 4
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
    
    def warm_quotes(self) -> int:
        """Preload quotes for popular symbols."""
        logger.info(f"🔥 Warming quotes for {len(self.popular_symbols)} popular symbols")
        warmed = 0
        
        for symbol in self.popular_symbols:
            try:
                # Use cache manager which has intelligent TTL
                quote = self.tradier.get_quote(symbol)
                if quote:
                    self.cache_manager.set_quote(symbol, quote)
                    warmed += 1
                    logger.debug(f"✅ Warmed quote: {symbol}")
            except Exception as e:
                logger.warning(f"Failed to warm quote for {symbol}: {e}")
        
        logger.info(f"✅ Warmed {warmed}/{len(self.popular_symbols)} quotes")
        return warmed
    
    def warm_options_chains(self) -> int:
        """Preload options chains for popular symbols."""
        logger.info("🔥 Warming options chains")
        warmed = 0
        expiration = self._get_next_friday()
        
        # Only warm top 5 most popular to avoid rate limits
        top_symbols = self.popular_symbols[:5]
        
        for symbol in top_symbols:
            try:
                chain = self.tradier.get_options_chain(symbol, expiration)
                if chain:
                    self.cache_manager.set_options_chain(symbol, expiration, chain)
                    warmed += 1
                    logger.debug(f"✅ Warmed chain: {symbol} {expiration}")
            except Exception as e:
                logger.warning(f"Failed to warm chain for {symbol}: {e}")
        
        logger.info(f"✅ Warmed {warmed}/{len(top_symbols)} options chains")
        return warmed
    
    def warm_expirations(self) -> int:
        """Preload expiration dates for popular symbols."""
        logger.info("🔥 Warming expiration dates")
        warmed = 0
        
        for symbol in self.popular_symbols[:10]:  # Top 10 only
            try:
                expirations = self.tradier.get_expirations(symbol)
                if expirations:
                    cache_key = expirations_key(symbol)
                    # Cache expirations for 1 hour (they don't change often)
                    self.cache.set(cache_key, expirations, timeout=3600)
                    warmed += 1
                    logger.debug(f"✅ Warmed expirations: {symbol}")
            except Exception as e:
                logger.warning(f"Failed to warm expirations for {symbol}: {e}")
        
        logger.info(f"✅ Warmed {warmed} expiration lists")
        return warmed
    
    def warm_all(self) -> dict:
        """Warm all caches."""
        logger.info("🔥 Starting comprehensive cache warming...")
        start_time = datetime.now()
        
        results = {
            'quotes': self.warm_quotes(),
            'chains': self.warm_options_chains(),
            'expirations': self.warm_expirations(),
            'duration_seconds': 0
        }
        
        duration = (datetime.now() - start_time).total_seconds()
        results['duration_seconds'] = round(duration, 2)
        
        total_warmed = sum(results.values()) - results['duration_seconds']
        logger.info(f"✅ Cache warming complete: {total_warmed} items in {duration:.2f}s")
        
        return results

