"""
Cache warming service to preload frequently accessed data.
This improves cache hit rates by proactively populating the cache.
"""

import logging
import hashlib
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from utils.redis_cache import get_redis_cache
from utils.cache_keys import quote_key, options_chain_key, expirations_key
from services.tradier_connector import TradierConnector
from services.cache_manager import CacheManager, set_cache, get_cache

logger = logging.getLogger(__name__)

# High-volume, options-friendly symbols for cache warming (used by warmer + warm_all_caches)
WARM_SYMBOLS = [
    # Index ETFs (highest options volume)
    'SPY', 'QQQ', 'IWM', 'DIA',
    # Mega-cap tech (heavy options activity)
    'AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL', 'AMZN', 'TSLA',
    # Other high-volume options
    'AMD', 'NFLX', 'COIN',
]


class CacheWarmer:
    """Preload frequently accessed data into Redis cache."""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.cache_manager = CacheManager()
        self.cache = get_redis_cache()
        self.popular_symbols = list(WARM_SYMBOLS)
        self._executor = ThreadPoolExecutor(max_workers=3)
        # Symbols for options chains (most liquid)
        self.options_symbols = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'META']
    
    def _get_next_friday(self) -> str:
        """Get next Friday's date for options expiration."""
        today = datetime.now()
        days_ahead = 4 - today.weekday()  # Friday = 4
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
    
    def _warm_one_quote(self, symbol: str) -> tuple:
        """Warm quote for one symbol. Returns (symbol, success, error_msg)."""
        try:
            quote = self.tradier.get_quote(symbol, use_cache=False)
            if quote is None or not isinstance(quote, dict):
                return (symbol, False, "None or invalid type")
            self.cache_manager.set_quote(symbol, quote)
            return (symbol, True, None)
        except Exception as e:
            return (symbol, False, str(e))

    def warm_quotes(self) -> int:
        """Preload quotes for WARM_SYMBOLS with batched concurrency (3 at a time)."""
        symbols = self.popular_symbols
        logger.info(f"📊 Starting quote warming for {len(symbols)} symbols (batch size 3)")
        warmed = 0
        failed = []
        batch_size = 3
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i : i + batch_size]
            logger.info(f"   Warming batch: {batch}")
            futures = [self._executor.submit(self._warm_one_quote, s) for s in batch]
            for future in as_completed(futures, timeout=35):
                try:
                    sym, ok, err = future.result(timeout=30)
                    if ok:
                        warmed += 1
                        logger.debug(f"   ✅ {sym} warmed")
                    else:
                        failed.append(f"{sym}: {err or 'fail'}")
                except Exception as e:
                    failed.append(f"batch: {e}")
        logger.info(f"✅ Quote warming: {warmed}/{len(symbols)} successful")
        if failed:
            logger.warning(f"⚠️ Failed: {', '.join(failed[:5])}")
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
            
            # Warm for common limit values using EXPLICIT cache keys
            # These match the keys used in api/opportunities.py
            for limit in [8, 10]:
                try:
                    movers = movers_service.get_market_movers(limit=limit)
                    
                    if movers:
                        # Use EXACT same cache key and function as the endpoint uses
                        cache_key = f'market_movers:limit_{limit}'
                        result = {'movers': movers, 'count': len(movers)}
                        # Use set_cache() from cache_manager (not self.cache) for consistency!
                        # TTL = 300s (5 min) - MUST be longer than warming interval (4 min)
                        set_cache(cache_key, result, timeout=360)
                        logger.info(f"✅ Warmed {cache_key}: {len(movers)} movers [TTL=300s]")
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
            # COMPREHENSIVE list - include ALL symbols commonly in user watchlists
            # This must match warm_all_caches() for consistency
            symbols_to_warm = [
                'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMD', 'TSLA',  # Most common
                'META', 'AMZN', 'GOOGL', 'BA', 'COIN', 'DIA', 'IWM'   # Also common
            ]
            
            for symbol in symbols_to_warm:
                try:
                    # Use EXACT same cache key format as the endpoint
                    cache_key = f'options_flow_analyze:{symbol.upper()}'
                    
                    # Check if already cached using get_cache() from cache_manager
                    existing = get_cache(cache_key)
                    if existing:
                        logger.debug(f"⏭️ Options flow for {symbol} already cached")
                        warmed += 1  # Count as warmed since it's cached
                        continue
                    
                    logger.info(f"  Warming options flow for {symbol}...")
                    
                    analyzer = OptionsFlowAnalyzer()
                    analysis = analyzer.analyze_flow(symbol)
                    
                    if analysis:
                        # Use set_cache() from cache_manager (not self.cache) for consistency!
                        set_cache(cache_key, analysis, timeout=360)
                        warmed += 1
                        logger.info(f"  ✅ Warmed options flow for {symbol} [TTL=300s]")
                    else:
                        logger.warning(f"  ⚠️ No analysis returned for {symbol}")
                    
                except Exception as e:
                    logger.error(f"  ❌ Error warming options flow for {symbol}: {e}")
            
            logger.info(f"✅ Warmed options flow for {warmed}/{len(symbols_to_warm)} symbols")
            return warmed
            
        except Exception as e:
            logger.error(f"❌ Error in options flow warming: {e}", exc_info=True)
            return 0
    
    def warm_opportunities(self) -> bool:
        """Warm opportunities:today endpoint cache"""
        try:
            logger.info("🎯 Warming opportunities:today cache...")
            
            # Get quotes for popular symbols
            popular_symbols = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL']
            quotes_dict = self.tradier.get_quotes(popular_symbols)
            
            if not quotes_dict:
                logger.warning("❌ No quotes returned for opportunities warming")
                return False
            
            # Build opportunities similar to the endpoint
            opportunities = []
            for symbol in popular_symbols:
                quote_data = quotes_dict.get(symbol)
                if not quote_data:
                    continue
                
                current_price = quote_data.get('last', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                
                if not current_price or current_price <= 0:
                    continue
                
                confidence = 0.60
                signal_direction = 'neutral'
                reason = 'Active trading opportunity'
                
                if abs(change_percent) > 2:
                    confidence = 0.70
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Strong price movement ({change_percent:.2f}%)'
                elif abs(change_percent) > 1:
                    confidence = 0.65
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Moderate price movement ({change_percent:.2f}%)'
                
                if volume and volume > 10000000:
                    confidence = min(0.75, confidence + 0.05)
                    reason += ' with high volume'
                
                opportunities.append({
                    'symbol': symbol,
                    'current_price': current_price,
                    'signal_direction': signal_direction,
                    'confidence': confidence,
                    'action': 'buy' if signal_direction == 'bullish' else 'sell' if signal_direction == 'bearish' else 'hold',
                    'reason': reason,
                    'iv_rank': 0,
                    'technical_indicators': {'rsi': None, 'trend': signal_direction},
                    'insights': None,
                    'timestamp': datetime.now().isoformat()
                })
            
            opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
            
            result = {
                'opportunities': opportunities[:5],
                'count': min(5, len(opportunities)),
                'source': 'popular_symbols'
            }
            
            # Cache with EXACT same key and function as the endpoint
            # Use set_cache() from cache_manager (not self.cache) for consistency!
            # TTL = 300s (5 min) - MUST be longer than warming interval (4 min)
            cache_key = 'opportunities:today'
            set_cache(cache_key, result, timeout=360)
            logger.info(f"✅ Warmed {cache_key}: {len(opportunities[:5])} opportunities")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error warming opportunities: {e}")
            return False

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
            'opportunities': False,
            'market_movers': False,
            'options_flow': 0,
            'duration_seconds': 0
        }
        
        # Phase 1: Warm quotes (fastest, used by most endpoints)
        logger.info("📊 Phase 1: Warming quotes...")
        results['quotes'] = self.warm_quotes()
        
        # Phase 2: Warm opportunities:today (most visited endpoint)
        logger.info("🎯 Phase 2: Warming opportunities:today...")
        results['opportunities'] = self.warm_opportunities()
        
        # Phase 3: Warm market movers (used by opportunities endpoints)
        logger.info("📈 Phase 3: Warming market movers...")
        results['market_movers'] = self.warm_market_movers()
        
        # Phase 4: Warm options chains
        logger.info("🔗 Phase 4: Warming options chains...")
        results['chains'] = self.warm_options_chains()
        
        # Phase 5: Warm expirations
        logger.info("📅 Phase 5: Warming expirations...")
        results['expirations'] = self.warm_expirations()
        
        # Phase 6: Warm options flow for popular symbols
        logger.info("📊 Phase 6: Warming options flow...")
        results['options_flow'] = self.warm_options_flow()
        
        # Summary
        results['duration_seconds'] = round(time.time() - start_time, 2)
        
        logger.info("=" * 60)
        logger.info(f"✅ CACHE WARMING COMPLETE in {results['duration_seconds']}s")
        logger.info(f"   Quotes: {results['quotes']}")
        logger.info(f"   Opportunities: {results['opportunities']}")
        logger.info(f"   Market Movers: {results['market_movers']}")
        logger.info(f"   Chains: {results['chains']}")
        logger.info(f"   Expirations: {results['expirations']}")
        logger.info(f"   Options Flow: {results['options_flow']}")
        logger.info("=" * 60)
        
        return results


def warm_all_caches():
    """
    SIMPLIFIED cache warming function with MAXIMUM logging
    
    Warms the following caches with EXPLICIT keys that match the endpoints:
    - opportunities:today (60s TTL)
    - market_movers:limit_8, market_movers:limit_10 (60s TTL)
    - options_flow_analyze:SYMBOL (300s TTL)
    """
    import sys
    
    # FORCE immediate output - these print statements CANNOT be suppressed
    print("=" * 80, flush=True)
    print(f"🔥 warm_all_caches() STARTED at {datetime.now().isoformat()}", flush=True)
    print("=" * 80, flush=True)
    sys.stdout.flush()
    
    logger.info("=" * 80)
    logger.info(f"🔥 warm_all_caches() STARTED at {datetime.now().isoformat()}")
    logger.info("=" * 80)
    
    results = {
        'cache_test': False,
        'quotes': 0,
        'opportunities': False,
        'market_movers': False,
        'options_flow': 0,
        'errors': []
    }
    
    try:
        # PHASE 1: Test basic cache operations
        print("🧪 PHASE 1: Testing cache operations...", flush=True)
        logger.info("🧪 PHASE 1: Testing cache operations...")
        
        try:
            test_key = 'cache_warmer_test'
            test_value = {'test': True, 'time': datetime.now().isoformat()}
            
            set_result = set_cache(test_key, test_value, timeout=60)
            get_result = get_cache(test_key)
            
            if get_result:
                print("   ✅ Cache operations WORKING", flush=True)
                logger.info("✅ Cache operations WORKING")
                results['cache_test'] = True
            else:
                print("   ❌ Cache GET returned None", flush=True)
                logger.error("❌ Cache GET returned None")
                
        except Exception as e:
            print(f"   ❌ Cache test FAILED: {e}", flush=True)
            logger.error(f"❌ Cache test FAILED: {e}", exc_info=True)
            results['errors'].append(f"Cache test: {e}")
        
        # PHASE 2: Warm quotes and build opportunities
        print("📊 PHASE 2: Warming quotes and opportunities:today...", flush=True)
        logger.info("📊 PHASE 2: Warming quotes and opportunities:today...")
        
        try:
            from services.tradier_connector import TradierConnector
            tradier = TradierConnector()
            popular_symbols = list(WARM_SYMBOLS)
            quotes = tradier.get_quotes(popular_symbols)
            results['quotes'] = len(quotes)
            print(f"   Got {len(quotes)} quotes", flush=True)
            
            # Build opportunities (same logic as the endpoint)
            opportunities = []
            for symbol in popular_symbols:
                quote_data = quotes.get(symbol)
                if not quote_data:
                    continue
                
                current_price = quote_data.get('last', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                
                if not current_price or current_price <= 0:
                    continue
                
                confidence = 0.60
                signal_direction = 'neutral'
                reason = 'Active trading opportunity'
                
                if abs(change_percent) > 2:
                    confidence = 0.70
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Strong price movement ({change_percent:.2f}%)'
                elif abs(change_percent) > 1:
                    confidence = 0.65
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Moderate price movement ({change_percent:.2f}%)'
                
                if volume and volume > 10000000:
                    confidence = min(0.75, confidence + 0.05)
                    reason += ' with high volume'
                
                opportunities.append({
                    'symbol': symbol,
                    'current_price': current_price,
                    'signal_direction': signal_direction,
                    'confidence': confidence,
                    'action': 'buy' if signal_direction == 'bullish' else 'sell' if signal_direction == 'bearish' else 'hold',
                    'reason': reason,
                    'iv_rank': 0,
                    'technical_indicators': {'rsi': None, 'trend': signal_direction},
                    'insights': None,
                    'timestamp': datetime.now().isoformat()
                })
            
            opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
            
            # Cache with EXACT same key as endpoint uses
            # TTL = 300 seconds (5 minutes) - MUST be longer than warming interval (4 min)
            opp_result = {
                'opportunities': opportunities[:5],
                'count': min(5, len(opportunities)),
                'source': 'popular_symbols'
            }
            set_cache('opportunities:today', opp_result, timeout=360)  # 6 min - longer than 4-min warmer
            results['opportunities'] = True
            print(f"   ✅ Cached opportunities:today ({len(opportunities[:5])} items) [TTL=360s]", flush=True)
            
        except Exception as e:
            print(f"   ❌ Opportunities warming FAILED: {e}", flush=True)
            logger.error(f"❌ Opportunities warming FAILED: {e}", exc_info=True)
            results['errors'].append(f"Opportunities: {e}")
        
        # PHASE 3: Warm market movers
        print("📈 PHASE 3: Warming market_movers...", flush=True)
        logger.info("📈 PHASE 3: Warming market_movers...")
        
        try:
            from services.market_movers import MarketMoversService
            movers_service = MarketMoversService()
            
            for limit in [8, 10]:
                try:
                    movers = movers_service.get_market_movers(limit=limit)
                    if movers:
                        cache_key = f'market_movers:limit_{limit}'
                        # TTL = 360s (6 min) - longer than 4-min warmer so keys never expire before next warm
                        set_cache(cache_key, {'movers': movers, 'count': len(movers)}, timeout=360)
                        print(f"   ✅ Cached {cache_key} ({len(movers)} items) [TTL=300s]", flush=True)
                        results['market_movers'] = True
                except Exception as e:
                    print(f"   ❌ market_movers limit={limit} error: {e}", flush=True)
            
        except Exception as e:
            print(f"   ❌ Market movers warming FAILED: {e}", flush=True)
            logger.error(f"❌ Market movers warming FAILED: {e}", exc_info=True)
            results['errors'].append(f"Market movers: {e}")
        
        # PHASE 4: Warm options flow for popular symbols
        print("🔗 PHASE 4: Warming options flow...", flush=True)
        logger.info("🔗 PHASE 4: Warming options flow...")
        
        try:
            from services.options_flow import OptionsFlowAnalyzer
            
            # COMPREHENSIVE list - include ALL symbols commonly in user watchlists
            # This must match CacheWarmer.warm_options_flow() for consistency
            symbols_to_warm = [
                'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMD', 'TSLA',  # Most common
                'META', 'AMZN', 'GOOGL', 'BA', 'COIN', 'DIA', 'IWM'   # Also common
            ]
            warmed = 0
            failed_symbols = []
            
            for symbol in symbols_to_warm:
                try:
                    cache_key = f'options_flow_analyze:{symbol}'
                    
                    # Check if already cached
                    existing = get_cache(cache_key)
                    if existing:
                        print(f"   ⏭️ {symbol} already cached", flush=True)
                        warmed += 1
                        continue
                    
                    print(f"   🔄 Warming {symbol}...", flush=True)
                    analyzer = OptionsFlowAnalyzer()
                    analysis = analyzer.analyze_flow(symbol)
                    
                    if analysis:
                        set_cache(cache_key, analysis, timeout=360)
                        print(f"   ✅ {symbol} cached", flush=True)
                        warmed += 1
                    else:
                        # Cache empty result to prevent repeated slow lookups
                        empty_result = {
                            'symbol': symbol,
                            'unusual_volume': [],
                            'summary': {'total_signals': 0, 'bullish': 0, 'bearish': 0},
                            'message': 'No unusual activity detected'
                        }
                        set_cache(cache_key, empty_result, timeout=360)
                        print(f"   ⚠️ {symbol} no data - cached empty result", flush=True)
                        warmed += 1
                        
                except Exception as e:
                    print(f"   ❌ {symbol} error: {type(e).__name__}: {e}", flush=True)
                    failed_symbols.append(symbol)
                    continue
            
            # Retry failed symbols once
            for symbol in failed_symbols:
                try:
                    cache_key = f'options_flow_analyze:{symbol}'
                    print(f"   🔄 Retrying {symbol}...", flush=True)
                    analyzer = OptionsFlowAnalyzer()
                    analysis = analyzer.analyze_flow(symbol)
                    if analysis:
                        set_cache(cache_key, analysis, timeout=360)
                        print(f"   ✅ {symbol} cached on retry", flush=True)
                        warmed += 1
                except Exception as e:
                    print(f"   ❌ {symbol} retry failed: {e}", flush=True)
            
            results['options_flow'] = warmed
            print(f"   Warmed {warmed}/{len(symbols_to_warm)} symbols", flush=True)
            
        except Exception as e:
            print(f"   ❌ Options flow warming FAILED: {e}", flush=True)
            logger.error(f"❌ Options flow warming FAILED: {e}", exc_info=True)
            results['errors'].append(f"Options flow: {e}")
        
        # DONE
        print("=" * 80, flush=True)
        print(f"✅ CACHE WARMING COMPLETE: {results}", flush=True)
        print("=" * 80, flush=True)
        sys.stdout.flush()
        
        logger.info("=" * 80)
        logger.info(f"✅ CACHE WARMING COMPLETE: {results}")
        logger.info("=" * 80)
        
        return results
        
    except Exception as e:
        import traceback
        error_msg = f"❌ CACHE WARMING CRASHED: {e}"
        tb = traceback.format_exc()
        
        print("=" * 80, flush=True)
        print(error_msg, flush=True)
        print(f"Traceback:\n{tb}", flush=True)
        print("=" * 80, flush=True)
        sys.stdout.flush()
        
        logger.error("=" * 80)
        logger.error(error_msg)
        logger.error(f"Traceback:\n{tb}")
        logger.error("=" * 80)
        
        return None


# Allow direct execution for testing
if __name__ == '__main__':
    print("=" * 80)
    print("Running cache warmer directly for testing...")
    print("=" * 80)
    result = warm_all_caches()
    print(f"Final result: {result}")

