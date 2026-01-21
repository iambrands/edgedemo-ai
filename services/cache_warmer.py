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
        
        # Expanded popular symbols list for better cache coverage
        self.popular_symbols = [
            # Major Indices
            'SPY', 'QQQ', 'IWM', 'DIA',
            # Mega Cap Tech
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA',
            # Popular Stocks
            'TSLA', 'AMD', 'NFLX', 'DIS', 'BA',
            # Finance
            'JPM', 'BAC', 'GS',
            # Other Popular
            'COIN', 'UBER', 'SHOP'
        ]  # Now 20 symbols
        
        # Symbols for options chains (most liquid)
        self.options_symbols = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'META']
    
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
        failed = 0
        
        for symbol in self.popular_symbols:
            try:
                # Get quote from Tradier
                quote = self.tradier.get_quote(symbol)
                
                # Debug logging
                if quote is None:
                    logger.debug(f"⚠️ No quote data returned for {symbol}")
                    failed += 1
                    continue
                
                # Check if quote has required fields
                if not isinstance(quote, dict) or 'symbol' not in quote:
                    logger.debug(f"⚠️ Invalid quote format for {symbol}: {type(quote)}")
                    failed += 1
                    continue
                
                # Use cache manager which has intelligent TTL
                self.cache_manager.set_quote(symbol, quote)
                warmed += 1
                logger.debug(f"✅ Warmed quote: {symbol}")
                
            except Exception as e:
                logger.warning(f"Failed to warm quote for {symbol}: {e}", exc_info=True)
                failed += 1
        
        logger.info(f"✅ Warmed {warmed}/{len(self.popular_symbols)} quotes (failed: {failed})")
        return warmed
    
    def warm_options_chains(self) -> int:
        """Preload options chains for popular symbols."""
        logger.info("🔥 Warming options chains")
        warmed = 0
        expiration = self._get_next_friday()
        
        # Use options_symbols list (most liquid symbols)
        top_symbols = self.options_symbols
        
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
        
        # Check if method exists (it's called get_options_expirations, not get_expirations)
        if not hasattr(self.tradier, 'get_options_expirations'):
            logger.warning("TradierConnector.get_options_expirations() not available - skipping expiration warming")
            return 0
        
        for symbol in self.popular_symbols[:10]:  # Top 10 only
            try:
                # Use the correct method name
                expirations = self.tradier.get_options_expirations(symbol, use_cache=False)
                if expirations and len(expirations) > 0:
                    cache_key = expirations_key(symbol)
                    # Cache expirations for 1 hour (they don't change often)
                    self.cache.set(cache_key, expirations, timeout=3600)
                    warmed += 1
                    logger.debug(f"✅ Warmed {len(expirations)} expirations for {symbol}")
                else:
                    logger.debug(f"No expirations found for {symbol}")
            except AttributeError as e:
                logger.warning(f"Method not available: {e}")
                return 0  # Stop trying if method doesn't exist
            except Exception as e:
                logger.warning(f"Failed to warm expirations for {symbol}: {e}")
        
        if warmed > 0:
            logger.info(f"✅ Warmed expirations for {warmed}/{min(10, len(self.popular_symbols))} symbols")
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
        
        total_warmed = results['quotes'] + results['chains'] + results['expirations']
        logger.info(
            f"✅ Cache warming complete: {total_warmed} items in {duration:.2f}s "
            f"(Quotes: {results['quotes']}, Chains: {results['chains']}, "
            f"Expirations: {results['expirations']})"
        )
        
        return results

