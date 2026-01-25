from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required
from utils.performance import log_performance
from services.cache_manager import get_cache, set_cache  # CRITICAL: Use same cache as warmer
from services.opportunity_scanner import OpportunityScanner
from services.signal_generator import SignalGenerator
from services.market_movers import MarketMoversService
from services.ai_symbol_recommender import AISymbolRecommender
from services.opportunity_insights import OpportunityInsights
from models.stock import Stock
from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)

opportunities_bp = Blueprint('opportunities', __name__)

def get_db():
    """Get db instance from current app context"""
    return current_app.extensions['sqlalchemy']

@opportunities_bp.route('/test-cache', methods=['GET'])
def test_cache():
    """
    Test endpoint to verify cache is working - NO AUTH REQUIRED
    
    This checks if the cache warmer's data is accessible from endpoints.
    """
    import sys
    
    # Force output to logs
    print("=" * 60, file=sys.stderr, flush=True)
    print("🧪 [TEST-CACHE] Endpoint called", file=sys.stderr, flush=True)
    
    try:
        # Test write
        test_result = set_cache('test_endpoint_key', {'hello': 'world', 'time': datetime.utcnow().isoformat()}, timeout=60)
        print(f"🧪 [TEST-CACHE] set_cache result: {test_result}", file=sys.stderr, flush=True)
        
        # Test read
        read_result = get_cache('test_endpoint_key')
        print(f"🧪 [TEST-CACHE] get_cache result: {read_result}", file=sys.stderr, flush=True)
        
        # Check warmed caches
        warmed_caches = {
            'opportunities:today': get_cache('opportunities:today'),
            'market_movers:limit_8': get_cache('market_movers:limit_8'),
            'market_movers:limit_10': get_cache('market_movers:limit_10'),
            'options_flow_analyze:AAPL': get_cache('options_flow_analyze:AAPL'),
            'options_flow_analyze:SPY': get_cache('options_flow_analyze:SPY'),
        }
        
        cache_status = {}
        for key, value in warmed_caches.items():
            is_cached = value is not None
            cache_status[key] = {
                'cached': is_cached,
                'data_preview': str(value)[:100] if value else None
            }
            print(f"🧪 [TEST-CACHE] {key}: {'✅ FOUND' if is_cached else '❌ NOT FOUND'}", file=sys.stderr, flush=True)
        
        print("=" * 60, file=sys.stderr, flush=True)
        
        return jsonify({
            'status': 'ok',
            'cache_read_write_works': read_result is not None,
            'test_value': read_result,
            'warmed_caches': cache_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        import traceback
        print(f"🧪 [TEST-CACHE] ERROR: {e}", file=sys.stderr, flush=True)
        print(traceback.format_exc(), file=sys.stderr, flush=True)
        return jsonify({
            'status': 'error',
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@opportunities_bp.route('/today', methods=['GET'])
# @token_required  # Temporarily disabled for testing
@log_performance(threshold=2.0)
def get_today_opportunities(current_user=None):
    """Get today's top trading opportunities - optimized for speed"""
    import sys
    
    # DIAGNOSTIC: Log at very start
    print("🔍 [OPPORTUNITIES/TODAY] Endpoint called", file=sys.stderr, flush=True)
    logger.info("🔍 [OPPORTUNITIES/TODAY] Endpoint called")
    
    try:
        # CRITICAL: Check cache FIRST using same functions as cache warmer
        cache_key = 'opportunities:today'
        
        print(f"🔍 [OPPORTUNITIES/TODAY] Checking cache: {cache_key}", file=sys.stderr, flush=True)
        logger.info(f"🔍 [OPPORTUNITIES/TODAY] Checking cache: {cache_key}")
        
        cached_data = get_cache(cache_key)
        
        print(f"🔍 [OPPORTUNITIES/TODAY] Cache result: {cached_data is not None}", file=sys.stderr, flush=True)
        
        if cached_data:
            print(f"✅ [OPPORTUNITIES/TODAY] Cache HIT: {cache_key}", file=sys.stderr, flush=True)
            logger.info(f"✅ [OPPORTUNITIES/TODAY] Cache HIT: {cache_key}")
            current_app.logger.info(f"✅ [OPPORTUNITIES] Cache HIT: {cache_key}")
            return jsonify(cached_data), 200
        
        start_time = time.time()
        print(f"⚠️ [OPPORTUNITIES/TODAY] Cache MISS: {cache_key}", file=sys.stderr, flush=True)
        logger.warning(f"⚠️ [OPPORTUNITIES/TODAY] Cache MISS: {cache_key}")
        current_app.logger.warning(f"⚠️ [OPPORTUNITIES] Cache MISS: {cache_key}")
        
        # If no user, return empty array immediately
        if current_user is None:
            current_app.logger.info("No user provided, returning empty opportunities")
            return jsonify({
                'opportunities': [],
                'count': 0,
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        
        current_app.logger.info(f"Fetching opportunities for user {current_user.id if hasattr(current_user, 'id') else 'unknown'}")
        
        db = get_db()
        
        # Get user's watchlist
        watchlist = db.session.query(Stock).filter_by(user_id=current_user.id).all()
        watchlist_symbols = [stock.symbol for stock in watchlist]
        
        # Use hardcoded list of 10 high-volume symbols (same as Market Movers for consistency)
        # If user has watchlist, prioritize those, but limit to 10 for speed
        curated_symbols = [
            'SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'
        ]
        
        # Combine watchlist with curated symbols, prioritize watchlist
        if watchlist_symbols:
            # Use watchlist symbols first, then fill with curated if needed
            symbols_to_scan = (watchlist_symbols + curated_symbols)[:10]
            source = 'watchlist'
        else:
            symbols_to_scan = curated_symbols[:10]
            source = 'popular_symbols'
            try:
                current_app.logger.info(f"User {current_user.id} has empty watchlist, using curated symbols")
            except:
                pass
        
        opportunities = []
        from services.tradier_connector import TradierConnector
        tradier = TradierConnector()
        
        # OPTIMIZED: Get all quotes in ONE batch API call (10x faster)
        quotes_dict = tradier.get_quotes(symbols_to_scan)
        current_app.logger.info(f"Batch fetched {len(quotes_dict)} quotes for {len(symbols_to_scan)} symbols")
        
        # Fast scan - process quotes from batch response
        for symbol in symbols_to_scan:
            try:
                # Get quote from batch response (no API call needed)
                quote_data = quotes_dict.get(symbol)
                if not quote_data:
                    continue
                
                current_price = quote_data.get('last', 0)
                change = quote_data.get('change', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                
                if not current_price or current_price <= 0:
                    continue
                
                # Fast signal calculation based on price movement and volume
                # Skip slow technical analysis and IV rank for speed
                confidence = 0.60  # Default moderate confidence
                signal_direction = 'neutral'
                reason = 'Active trading opportunity'
                
                # Boost confidence based on price movement
                if abs(change_percent) > 2:
                    confidence = 0.70
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Strong price movement ({change_percent:.2f}%)'
                elif abs(change_percent) > 1:
                    confidence = 0.65
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Moderate price movement ({change_percent:.2f}%)'
                
                # Boost confidence for high volume
                if volume and volume > 10000000:  # 10M+ volume
                    confidence = min(0.75, confidence + 0.05)
                    reason += ' with high volume'
                
                # Get insights (earnings, IV, unusual activity) - with timeout protection
                insights = None
                try:
                    import threading
                    import queue
                    insights_queue = queue.Queue()
                    
                    def fetch_insights():
                        try:
                            insights_service = OpportunityInsights()
                            result = insights_service.get_symbol_insights(symbol, current_user.id)
                            insights_queue.put(result)
                        except Exception as e:
                            insights_queue.put(None)  # Return None on error
                    
                    # Fetch insights with 5 second timeout
                    insights_thread = threading.Thread(target=fetch_insights, daemon=True)
                    insights_thread.start()
                    insights_thread.join(timeout=5)  # 5 second timeout
                    
                    if not insights_queue.empty():
                        insights = insights_queue.get()
                except Exception as e:
                    try:
                        current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                    except:
                        pass
                
                opportunity = {
                    'symbol': symbol,
                    'current_price': current_price,
                    'signal_direction': signal_direction,
                    'confidence': confidence,
                    'action': 'buy' if signal_direction == 'bullish' else 'sell' if signal_direction == 'bearish' else 'hold',
                    'reason': reason,
                    'iv_rank': 0,  # Not calculated for speed
                    'technical_indicators': {
                        'rsi': None,  # Not calculated for speed
                        'trend': signal_direction
                    },
                    'insights': insights,  # Add insights (earnings, IV context, unusual activity)
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                opportunities.append(opportunity)
                        
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error scanning {symbol} for opportunities: {e}")
                except:
                    pass
                continue
        
        # Sort by confidence (highest first)
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        # Return top 5
        max_opportunities = 5
        result = {
            'opportunities': opportunities[:max_opportunities],
            'count': len(opportunities[:max_opportunities]),
            'source': source
        }
        
        # Cache the result for 300 seconds (5 min) - MUST match warmer TTL
        duration_ms = (time.time() - start_time) * 1000
        set_cache(cache_key, result, timeout=300)
        current_app.logger.info(f"💾 [OPPORTUNITIES] Cached {cache_key} ({duration_ms:.0f}ms) [TTL=300s]")
        
        return jsonify(result), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"❌ ERROR in get_todays_opportunities: {str(e)}")
            current_app.logger.error(f"Error type: {type(e).__name__}")
            current_app.logger.exception(e)  # Full stack trace
        except:
            pass
        # Return empty array instead of 500 to prevent frontend crash
        return jsonify({
            'opportunities': [],
            'count': 0,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 200  # Return 200, not 500

@opportunities_bp.route('/quick-scan', methods=['POST'])
@token_required
def quick_scan(current_user):
    """Quick scan of popular symbols - optimized for speed"""
    try:
        # Use same curated list as main opportunities endpoint
        popular_symbols = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL']
        
        opportunities = []
        from services.tradier_connector import TradierConnector
        tradier = TradierConnector()
        
        # OPTIMIZED: Get all quotes in ONE batch API call (10x faster)
        quotes_dict = tradier.get_quotes(popular_symbols)
        current_app.logger.info(f"Quick scan batch fetched {len(quotes_dict)} quotes")
        
        # Fast scan - process quotes from batch response
        for symbol in popular_symbols:
            try:
                # Get quote from batch response (no API call needed)
                quote_data = quotes_dict.get(symbol)
                if not quote_data:
                    continue
                
                current_price = quote_data.get('last', 0)
                change = quote_data.get('change', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                
                if not current_price or current_price <= 0:
                    continue
                
                # Fast signal calculation
                confidence = 0.60
                signal_direction = 'neutral'
                reason = 'Quick scan opportunity'
                
                if abs(change_percent) > 2:
                    confidence = 0.70
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Strong movement ({change_percent:.2f}%)'
                elif abs(change_percent) > 1:
                    confidence = 0.65
                    signal_direction = 'bullish' if change_percent > 0 else 'bearish'
                    reason = f'Moderate movement ({change_percent:.2f}%)'
                
                if volume and volume > 10000000:
                    confidence = min(0.75, confidence + 0.05)
                    reason += ' with high volume'
                
                # Get insights
                insights = None
                try:
                    insights_service = OpportunityInsights()
                    insights = insights_service.get_symbol_insights(symbol, current_user.id)
                except Exception as e:
                    try:
                        current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                    except:
                        pass
                
                opportunity = {
                    'symbol': symbol,
                    'current_price': current_price,
                    'price_change': change,
                    'signal_direction': signal_direction,
                    'confidence': confidence,
                    'action': 'buy' if signal_direction == 'bullish' else 'sell' if signal_direction == 'bearish' else 'hold',
                    'reason': reason,
                    'iv_rank': 0,
                    'technical_indicators': {
                        'rsi': None,
                        'trend': signal_direction
                    },
                    'insights': insights,  # Add insights
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                opportunities.append(opportunity)
                        
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error scanning {symbol} in quick scan: {e}")
                except:
                    pass
                continue
        
        # Sort by confidence (highest first)
        opportunities.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        max_opportunities = 5
        return jsonify({
            'opportunities': opportunities[:max_opportunities],
            'count': len(opportunities[:max_opportunities]),
            'source': 'quick_scan'
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error in quick scan: {e}", exc_info=True)
        except:
            pass
        # Return 200 with empty results instead of 500 to prevent frontend crash
        return jsonify({
            'opportunities': [],
            'count': 0,
            'error': 'Failed to perform quick scan',
            'details': str(e)
        }), 200

@opportunities_bp.route('/market-movers', methods=['GET'])
# @token_required  # Temporarily disabled for testing
@log_performance(threshold=2.0)
def get_market_movers(current_user=None):
    """Get market movers - high volume/volatility stocks"""
    import sys
    
    # DIAGNOSTIC: Log at very start
    print("🔍 [MARKET_MOVERS] Endpoint called", file=sys.stderr, flush=True)
    logger.info("🔍 [MARKET_MOVERS] Endpoint called")
    
    try:
        limit = request.args.get('limit', 10, type=int)
        include_insights = request.args.get('include_insights', 'false').lower() == 'true'
        
        # CRITICAL: Check cache FIRST using same functions as cache warmer
        cache_key = f'market_movers:limit_{limit}'
        
        print(f"🔍 [MARKET_MOVERS] Checking cache: {cache_key}", file=sys.stderr, flush=True)
        logger.info(f"🔍 [MARKET_MOVERS] Checking cache: {cache_key}")
        
        cached_data = get_cache(cache_key)
        
        print(f"🔍 [MARKET_MOVERS] Cache result: {cached_data is not None}", file=sys.stderr, flush=True)
        
        if cached_data:
            print(f"✅ [MARKET_MOVERS] Cache HIT: {cache_key}", file=sys.stderr, flush=True)
            logger.info(f"✅ [MARKET_MOVERS] Cache HIT: {cache_key}")
            current_app.logger.info(f"✅ [MARKET_MOVERS] Cache HIT: {cache_key}")
            return jsonify(cached_data), 200
        
        start_time = time.time()
        user_id = current_user.id if current_user and hasattr(current_user, 'id') else 'anonymous'
        print(f"⚠️ [MARKET_MOVERS] Cache MISS: {cache_key}", file=sys.stderr, flush=True)
        logger.warning(f"⚠️ [MARKET_MOVERS] Cache MISS: {cache_key}")
        current_app.logger.warning(f"⚠️ [MARKET_MOVERS] Cache MISS: {cache_key} (user={user_id})")
        
        # Add timeout protection - limit processing time
        import threading
        import queue
        
        movers_queue = queue.Queue()
        error_queue = queue.Queue()
        
        def fetch_movers():
            try:
                movers_service = MarketMoversService()
                movers = movers_service.get_market_movers(limit=limit)
                movers_queue.put(movers)
            except Exception as e:
                error_queue.put(e)
        
        # Run in thread with timeout
        mover_thread = threading.Thread(target=fetch_movers, daemon=True)
        mover_thread.start()
        mover_thread.join(timeout=15)  # 15 second timeout
        
        if mover_thread.is_alive():
            # Timeout occurred
            current_app.logger.warning(f"⚠️ Market movers request timed out after 15s")
            return jsonify({
                'movers': [],
                'count': 0,
                'error': 'Request timed out',
                'message': 'Market movers request took too long. Please try again.'
            }), 200  # Return 200 with empty array instead of error
        
        if not error_queue.empty():
            error = error_queue.get()
            current_app.logger.error(f"❌ Error in market movers service: {error}")
            # Return empty array instead of error to prevent frontend crash
            return jsonify({
                'movers': [],
                'count': 0,
                'error': str(error)
            }), 200
        
        if movers_queue.empty():
            current_app.logger.warning("⚠️ Market movers service returned no data")
            return jsonify({
                'movers': [],
                'count': 0
            }), 200
        
        movers = movers_queue.get()
        
        # Optionally add insights (can be slow, so make it optional and skip if timeout risk)
        if include_insights and movers:
            try:
                insights_service = OpportunityInsights()
                # Limit insights to first 5 to prevent timeout
                for mover in movers[:5]:
                    symbol = mover.get('symbol')
                    if symbol:
                        try:
                            mover['insights'] = insights_service.get_symbol_insights(symbol, current_user.id)
                        except Exception as e:
                            try:
                                current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                            except:
                                pass
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error adding insights to market movers: {e}")
                except:
                    pass
        
        current_app.logger.info(f"✅ Found {len(movers)} market movers")
        if movers:
            current_app.logger.info(f"   Top movers: {[m.get('symbol') for m in movers[:5]]}")
        else:
            current_app.logger.warning("⚠️ No market movers found - all symbols may have failed or none met criteria")
        
        result = {
            'movers': movers,
            'count': len(movers)
        }
        
        # Cache the result for 300 seconds (5 min) - MUST match warmer TTL
        duration_ms = (time.time() - start_time) * 1000
        set_cache(cache_key, result, timeout=300)
        current_app.logger.info(f"💾 [MARKET_MOVERS] Cached {cache_key} ({duration_ms:.0f}ms) [TTL=300s]")
        
        return jsonify(result), 200
        
    except Exception as e:
        import traceback
        try:
            current_app.logger.error(f"❌ Error getting market movers: {e}\n{traceback.format_exc()}", exc_info=True)
        except:
            pass
        # Return empty array instead of error to prevent frontend crash
        return jsonify({
            'movers': [],
            'count': 0,
            'error': 'Failed to load market movers',
            'details': str(e)
        }), 200  # Changed from 500 to 200 to prevent frontend crash

@opportunities_bp.route('/ai-suggestions', methods=['GET'])
@token_required
@log_performance(threshold=2.0)
def get_ai_suggestions(current_user):
    """Get AI-powered personalized symbol recommendations"""
    try:
        limit = request.args.get('limit', 8, type=int)
        
        # CRITICAL: Check cache FIRST using same functions as cache warmer
        cache_key = f'ai_suggestions:user_{current_user.id}:limit_{limit}'
        
        cached_data = get_cache(cache_key)
        if cached_data:
            current_app.logger.info(f"✅ [AI_SUGGESTIONS] Cache HIT: {cache_key}")
            return jsonify(cached_data), 200
        
        start_time = time.time()
        current_app.logger.warning(f"⚠️ [AI_SUGGESTIONS] Cache MISS: {cache_key}")
        
        recommender = AISymbolRecommender()
        recommendations = recommender.get_personalized_recommendations(
            current_user.id, 
            limit=limit
        )
        
        result = {
            'recommendations': recommendations,
            'count': len(recommendations)
        }
        
        # Cache the result for 10 minutes using SAME function as warmer
        duration_ms = (time.time() - start_time) * 1000
        set_cache(cache_key, result, timeout=600)
        current_app.logger.info(f"💾 [AI_SUGGESTIONS] Cached {cache_key} ({duration_ms:.0f}ms)")
        
        return jsonify(result), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error getting AI suggestions: {e}", exc_info=True)
        except:
            pass
        return jsonify({
            'recommendations': [],
            'count': 0,
            'error': str(e)
        }), 200


@opportunities_bp.route('/high-probability', methods=['GET'])
# @token_required  # Temporarily disabled for testing
def get_high_probability(current_user=None):
    """Get high probability opportunities."""
    try:
        current_app.logger.info("High probability opportunities requested")
        limit = request.args.get('limit', 20, type=int)
        
        # TODO: Implement actual logic
        # For now, return empty array so page loads
        opportunities = []
        
        return jsonify({
            'opportunities': opportunities,
            'count': len(opportunities)
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error loading high probability: {str(e)}", exc_info=True)
        except:
            pass
        return jsonify({
            'opportunities': [],
            'count': 0
        }), 200


@opportunities_bp.route('/earnings', methods=['GET'])
# @token_required  # Temporarily disabled for testing
def get_earnings_plays(current_user=None):
    """Get earnings plays."""
    try:
        current_app.logger.info("Earnings plays requested")
        limit = request.args.get('limit', 20, type=int)
        
        # TODO: Implement actual logic
        opportunities = []
        
        return jsonify({
            'opportunities': opportunities,
            'count': len(opportunities)
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error loading earnings: {str(e)}", exc_info=True)
        except:
            pass
        return jsonify({
            'opportunities': [],
            'count': 0
        }), 200


@opportunities_bp.route('/unusual-activity', methods=['GET'])
# @token_required  # Temporarily disabled for testing
def get_unusual_activity(current_user=None):
    """Get unusual activity."""
    try:
        current_app.logger.info("Unusual activity requested")
        limit = request.args.get('limit', 20, type=int)
        
        # TODO: Implement actual logic
        opportunities = []
        
        return jsonify({
            'opportunities': opportunities,
            'count': len(opportunities)
        }), 200
        
    except Exception as e:
        try:
            current_app.logger.error(f"Error loading unusual activity: {str(e)}", exc_info=True)
        except:
            pass
        return jsonify({
            'opportunities': [],
            'count': 0
        }), 200


@opportunities_bp.route('/test', methods=['GET'])
def test():
    """Test endpoint to verify opportunities blueprint is registered."""
    return jsonify({
        'status': 'ok',
        'message': 'Opportunities API is working',
        'endpoints': [
            '/api/opportunities/high-probability',
            '/api/opportunities/earnings',
            '/api/opportunities/unusual-activity',
            '/api/opportunities/market-movers',
            '/api/opportunities/today',
            '/api/opportunities/ai-suggestions'
        ]
    }), 200

