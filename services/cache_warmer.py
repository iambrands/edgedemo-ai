"""
Cache warming service to preload frequently accessed data.
This improves cache hit rates by proactively populating the cache.
"""

import logging
import hashlib
import json
from datetime import datetime, timedelta
from utils.redis_cache import get_redis_cache
from utils.cache_keys import quote_key, options_chain_key, expirations_key
from services.tradier_connector import TradierConnector
from services.cache_manager import CacheManager, set_cache, get_cache

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
    
    def _make_decorator_cache_key(self, key_prefix: str, path: str, args: dict = None) -> str:
        """Generate the same cache key as the @cached decorator uses"""
        cache_key_parts = [path]
        if args:
            cache_key_parts.append(json.dumps(args, sort_keys=True))
        cache_key_str = ':'.join(cache_key_parts)
        cache_key_hash = hashlib.md5(cache_key_str.encode()).hexdigest()
        return f"{key_prefix}:{cache_key_hash}"
    
    def warm_market_movers(self) -> bool:
        """Warm market movers endpoint cache"""
        try:
            logger.info("📈 Warming market movers cache...")
            
            from services.market_movers import MarketMoversService
            
            movers_service = MarketMoversService()
            
            # Warm for common limit values
            for limit in [8, 10]:
                try:
                    movers = movers_service.get_market_movers(limit=limit)
                    
                    if movers:
                        # Use the same cache key format as the @cached decorator
                        cache_key = self._make_decorator_cache_key(
                            'market_movers',
                            '/api/opportunities/market-movers',
                            {'limit': str(limit)}
                        )
                        
                        # Also cache without args for default calls
                        if limit == 10:
                            cache_key_default = self._make_decorator_cache_key(
                                'market_movers',
                                '/api/opportunities/market-movers'
                            )
                            result = {'movers': movers, 'count': len(movers)}
                            self.cache.set(cache_key_default, result, timeout=60)
                        
                        result = {'movers': movers, 'count': len(movers)}
                        self.cache.set(cache_key, result, timeout=60)
                        logger.info(f"✅ Warmed market movers (limit={limit}): {len(movers)} items")
                except Exception as e:
                    logger.error(f"❌ Error warming market movers limit={limit}: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error warming market movers: {e}")
            return False
    
    def warm_options_flow(self) -> int:
        """Warm options flow analysis for popular symbols"""
        try:
            logger.info("📊 Warming options flow cache...")
            
            from services.options_flow import OptionsFlowAnalyzer
            
            warmed = 0
            # Expanded list - include all symbols users commonly look at
            symbols_to_warm = ['AAPL', 'AMD', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'BA', 'COIN', 'DIA', 'META', 'MSFT']
            
            for symbol in symbols_to_warm:
                try:
                    # Use EXACT same cache key format as the endpoint
                    cache_key = f'options_flow_analyze:{symbol.upper()}'
                    
                    # Check if already cached using the same cache method as endpoint
                    existing = self.cache.get(cache_key)
                    if existing:
                        logger.debug(f"⏭️ Options flow for {symbol} already cached")
                        warmed += 1  # Count as warmed since it's cached
                        continue
                    
                    logger.info(f"  Warming options flow for {symbol}...")
                    
                    analyzer = OptionsFlowAnalyzer()
                    analysis = analyzer.analyze_flow(symbol)
                    
                    if analysis:
                        # Cache using the SAME cache instance as the endpoint
                        self.cache.set(cache_key, analysis, timeout=300)  # 5 minutes
                        warmed += 1
                        logger.info(f"  ✅ Warmed options flow for {symbol}")
                    else:
                        logger.warning(f"  ⚠️ No analysis returned for {symbol}")
                    
                except Exception as e:
                    logger.error(f"  ❌ Error warming options flow for {symbol}: {e}")
            
            logger.info(f"✅ Warmed options flow for {warmed}/{len(symbols_to_warm)} symbols")
            return warmed
            
        except Exception as e:
            logger.error(f"❌ Error in options flow warming: {e}", exc_info=True)
            return 0
    
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
            'market_movers': False,
            'options_flow': 0,
            'duration_seconds': 0
        }
        
        # Phase 1: Warm quotes (fastest, used by most endpoints)
        logger.info("📊 Phase 1: Warming quotes...")
        results['quotes'] = self.warm_quotes()
        
        # Phase 2: Warm market movers (used by opportunities endpoints)
        logger.info("📈 Phase 2: Warming market movers...")
        results['market_movers'] = self.warm_market_movers()
        
        # Phase 3: Warm options chains
        logger.info("🔗 Phase 3: Warming options chains...")
        results['chains'] = self.warm_options_chains()
        
        # Phase 4: Warm expirations
        logger.info("📅 Phase 4: Warming expirations...")
        results['expirations'] = self.warm_expirations()
        
        # Phase 5: Warm options flow for popular symbols
        logger.info("📊 Phase 5: Warming options flow...")
        results['options_flow'] = self.warm_options_flow()
        
        # Summary
        results['duration_seconds'] = round(time.time() - start_time, 2)
        
        logger.info("=" * 60)
        logger.info(f"✅ CACHE WARMING COMPLETE in {results['duration_seconds']}s")
        logger.info(f"   Quotes: {results['quotes']}")
        logger.info(f"   Market Movers: {results['market_movers']}")
        logger.info(f"   Chains: {results['chains']}")
        logger.info(f"   Expirations: {results['expirations']}")
        logger.info(f"   Options Flow: {results['options_flow']}")
        logger.info("=" * 60)
        
        return results


def warm_all_caches():
    """
    Convenience function to warm all caches - called by scheduler
    
    This function has EXTENSIVE logging to debug why it might be silent
    """
    import sys
    
    # Force immediate output with print (bypasses logging config issues)
    print("=" * 80, flush=True)
    print(f"🔥 CACHE WARMER FUNCTION CALLED at {datetime.now().isoformat()}", flush=True)
    print("=" * 80, flush=True)
    sys.stdout.flush()
    
    # Also log via logger
    logger.info("=" * 80)
    logger.info(f"🔥 warm_all_caches() CALLED at {datetime.now().isoformat()}")
    logger.info("=" * 80)
    
    try:
        logger.info("Creating CacheWarmer instance...")
        print("Creating CacheWarmer instance...", flush=True)
        
        warmer = CacheWarmer()
        
        logger.info("CacheWarmer created, calling warm_all()...")
        print("CacheWarmer created, calling warm_all()...", flush=True)
        
        result = warmer.warm_all()
        
        logger.info(f"warm_all() completed with result: {result}")
        print(f"warm_all() completed with result: {result}", flush=True)
        
        return result
        
    except Exception as e:
        import traceback
        error_msg = f"❌ Cache warming CRASHED: {e}"
        tb = traceback.format_exc()
        
        logger.error(error_msg)
        logger.error(f"Traceback:\n{tb}")
        
        print(error_msg, flush=True)
        print(f"Traceback:\n{tb}", flush=True)
        sys.stdout.flush()
        
        return None


# Allow direct execution for testing
if __name__ == '__main__':
    print("=" * 80)
    print("Running cache warmer directly for testing...")
    print("=" * 80)
    result = warm_all_caches()
    print(f"Final result: {result}")

