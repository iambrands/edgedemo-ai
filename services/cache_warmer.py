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
        """Preload quotes for popular symbols with detailed logging."""
        logger.info(f"📊 Starting quote warming for {len(self.popular_symbols)} symbols")
        warmed = 0
        failed = []
        
        for symbol in self.popular_symbols:
            try:
                # Get quote from Tradier
                quote = self.tradier.get_quote(symbol)
                
                if quote is None:
                    logger.warning(f"❌ Quote returned None for {symbol}")
                    failed.append(f"{symbol}: None")
                    continue
                
                if not isinstance(quote, dict):
                    logger.warning(f"❌ Invalid quote type for {symbol}: {type(quote)}")
                    failed.append(f"{symbol}: Invalid type")
                    continue
                
                # Use cache manager which has intelligent TTL
                self.cache_manager.set_quote(symbol, quote)
                warmed += 1
                logger.debug(f"✅ Warmed quote: {symbol}")
                
            except Exception as e:
                logger.error(f"❌ Exception warming {symbol}: {e}", exc_info=True)
                failed.append(f"{symbol}: {str(e)}")
        
        logger.info(f"✅ Quote warming: {warmed}/{len(self.popular_symbols)} successful")
        if failed:
            logger.warning(f"⚠️ Failed symbols: {', '.join(failed[:5])}")  # Show first 5
        
        return warmed
    
    def warm_options_chains(self) -> int:
        """Preload options chains for popular symbols with detailed logging."""
        logger.info(f"🔗 Starting chain warming for {len(self.options_symbols)} symbols")
        warmed = 0
        failed = []
        expiration = self._get_next_friday()
        
        for symbol in self.options_symbols:
            try:
                chain = self.tradier.get_options_chain(symbol, expiration)
                if chain and isinstance(chain, list) and len(chain) > 0:
                    self.cache_manager.set_options_chain(symbol, expiration, chain)
                    warmed += 1
                    logger.debug(f"✅ Warmed chain: {symbol} {expiration} ({len(chain)} options)")
                else:
                    logger.warning(f"❌ Invalid chain for {symbol}: {type(chain)}")
                    failed.append(f"{symbol}: Invalid chain")
            except Exception as e:
                logger.error(f"❌ Exception warming chain for {symbol}: {e}", exc_info=True)
                failed.append(f"{symbol}: {str(e)}")
        
        logger.info(f"✅ Chain warming: {warmed}/{len(self.options_symbols)} successful")
        if failed:
            logger.warning(f"⚠️ Failed symbols: {', '.join(failed[:5])}")
        return warmed
    
    def warm_expirations(self) -> int:
        """Preload expiration dates for popular symbols with detailed logging."""
        logger.info(f"📅 Starting expiration warming for {min(10, len(self.popular_symbols))} symbols")
        warmed = 0
        failed = []
        
        # Check if method exists (it's called get_options_expirations, not get_expirations)
        if not hasattr(self.tradier, 'get_options_expirations'):
            logger.warning("❌ TradierConnector.get_options_expirations() not available - skipping expiration warming")
            return 0
        
        for symbol in self.popular_symbols[:10]:  # Top 10 only
            try:
                # Use the correct method name
                expirations = self.tradier.get_options_expirations(symbol, use_cache=False)
                if expirations and len(expirations) > 0:
                    cache_key = expirations_key(symbol)
                    # Cache expirations for 2 hours (they don't change often)
                    self.cache.set(cache_key, expirations, timeout=7200)
                    warmed += 1
                    logger.debug(f"✅ Warmed {len(expirations)} expirations for {symbol}")
                else:
                    logger.warning(f"❌ No expirations found for {symbol}")
                    failed.append(f"{symbol}: No expirations")
            except AttributeError as e:
                logger.warning(f"❌ Method not available: {e}")
                return 0  # Stop trying if method doesn't exist
            except Exception as e:
                logger.error(f"❌ Exception warming expirations for {symbol}: {e}", exc_info=True)
                failed.append(f"{symbol}: {str(e)}")
        
        logger.info(f"✅ Expiration warming: {warmed}/{min(10, len(self.popular_symbols))} successful")
        if failed:
            logger.warning(f"⚠️ Failed symbols: {', '.join(failed[:5])}")
        return warmed
    
    def warm_all(self) -> dict:
        """Warm all caches with comprehensive logging."""
        import time
        
        start_time = time.time()
        
        logger.info("=" * 60)
        logger.info("🔥 CACHE WARMING STARTED")
        logger.info("=" * 60)
        
        results = {
            'quotes': 0,
            'chains': 0,
            'expirations': 0,
            'duration_seconds': 0
        }
        
        # Phase 1: Warm quotes
        logger.info("📊 Phase 1: Warming quotes...")
        results['quotes'] = self.warm_quotes()
        
        # Phase 2: Warm chains
        logger.info("🔗 Phase 2: Warming options chains...")
        results['chains'] = self.warm_options_chains()
        
        # Phase 3: Warm expirations
        logger.info("📅 Phase 3: Warming expirations...")
        results['expirations'] = self.warm_expirations()
        
        # Summary
        results['duration_seconds'] = round(time.time() - start_time, 2)
        
        logger.info("=" * 60)
        logger.info(f"✅ CACHE WARMING COMPLETE in {results['duration_seconds']}s")
        logger.info(f"   Quotes: {results['quotes']}")
        logger.info(f"   Chains: {results['chains']}")
        logger.info(f"   Expirations: {results['expirations']}")
        logger.info("=" * 60)
        
        return results

