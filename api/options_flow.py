from flask import Blueprint, request, jsonify, current_app
from services.options_flow import OptionsFlowAnalyzer
from utils.decorators import token_required
from utils.redis_cache import get_redis_cache
import time

options_flow_bp = Blueprint('options_flow', __name__)

def get_flow_analyzer():
    return OptionsFlowAnalyzer()


def cache_key_for_symbol(prefix: str, symbol: str) -> str:
    """Generate cache key for symbol-based endpoints"""
    return f"{prefix}:{symbol.upper()}"


@options_flow_bp.route('/analyze/<symbol>', methods=['GET'])
@token_required
def analyze_flow(current_user, symbol):
    """
    Analyze options flow for a symbol
    
    Cached for 5 minutes to improve performance (expensive operation)
    """
    try:
        symbol = symbol.upper()
        cache_key = cache_key_for_symbol('options_flow_analyze', symbol)
        
        # Check cache first (5 minute cache)
        try:
            cache = get_redis_cache()
            cached_result = cache.get(cache_key)
            if cached_result:
                current_app.logger.info(f"✅ Cache HIT: options flow analysis for {symbol}")
                return jsonify(cached_result), 200
        except Exception as e:
            current_app.logger.debug(f"Cache lookup failed: {e}")
        
        # Cache miss - fetch from API
        start_time = time.time()
        analyzer = get_flow_analyzer()
        analysis = analyzer.analyze_flow(symbol)
        duration_ms = (time.time() - start_time) * 1000
        
        current_app.logger.info(f"📊 Options flow analysis for {symbol} took {duration_ms:.0f}ms")
        
        # Cache the result for 5 minutes
        try:
            cache = get_redis_cache()
            cache.set(cache_key, analysis, timeout=300)  # 5 minutes
        except Exception as e:
            current_app.logger.debug(f"Cache write failed: {e}")
        
        return jsonify(analysis), 200
    except Exception as e:
        current_app.logger.error(f"Error analyzing options flow for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500


@options_flow_bp.route('/unusual-volume/<symbol>', methods=['GET'])
@token_required
def get_unusual_volume(current_user, symbol):
    """
    Get unusual volume options
    
    Cached for 3 minutes
    """
    try:
        symbol = symbol.upper()
        expiration = request.args.get('expiration', '')
        cache_key = f"options_unusual_volume:{symbol}:{expiration}"
        
        # Check cache first (3 minute cache)
        try:
            cache = get_redis_cache()
            cached_result = cache.get(cache_key)
            if cached_result:
                current_app.logger.info(f"✅ Cache HIT: unusual volume for {symbol}")
                return jsonify(cached_result), 200
        except Exception as e:
            current_app.logger.debug(f"Cache lookup failed: {e}")
        
        # Cache miss
        start_time = time.time()
        analyzer = get_flow_analyzer()
        unusual = analyzer.detect_unusual_volume(symbol, expiration if expiration else None)
        duration_ms = (time.time() - start_time) * 1000
        
        current_app.logger.info(f"📊 Unusual volume for {symbol} took {duration_ms:.0f}ms")
        
        result = {
            'symbol': symbol,
            'unusual_volume': unusual,
            'count': len(unusual)
        }
        
        # Cache for 3 minutes
        try:
            cache = get_redis_cache()
            cache.set(cache_key, result, timeout=180)
        except Exception as e:
            current_app.logger.debug(f"Cache write failed: {e}")
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error getting unusual volume for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500


@options_flow_bp.route('/large-blocks/<symbol>', methods=['GET'])
@token_required
def get_large_blocks(current_user, symbol):
    """
    Get large block trades
    
    Cached for 3 minutes
    """
    try:
        symbol = symbol.upper()
        min_contracts = request.args.get('min_contracts', 1000, type=int)
        cache_key = f"options_large_blocks:{symbol}:{min_contracts}"
        
        # Check cache first (3 minute cache)
        try:
            cache = get_redis_cache()
            cached_result = cache.get(cache_key)
            if cached_result:
                current_app.logger.info(f"✅ Cache HIT: large blocks for {symbol}")
                return jsonify(cached_result), 200
        except Exception as e:
            current_app.logger.debug(f"Cache lookup failed: {e}")
        
        # Cache miss
        start_time = time.time()
        analyzer = get_flow_analyzer()
        blocks = analyzer.detect_large_blocks(symbol, min_contracts)
        duration_ms = (time.time() - start_time) * 1000
        
        current_app.logger.info(f"📊 Large blocks for {symbol} took {duration_ms:.0f}ms")
        
        result = {
            'symbol': symbol,
            'large_blocks': blocks,
            'count': len(blocks)
        }
        
        # Cache for 3 minutes
        try:
            cache = get_redis_cache()
            cache.set(cache_key, result, timeout=180)
        except Exception as e:
            current_app.logger.debug(f"Cache write failed: {e}")
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error getting large blocks for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500


@options_flow_bp.route('/sweeps/<symbol>', methods=['GET'])
@token_required
def get_sweeps(current_user, symbol):
    """
    Get sweep orders
    
    Cached for 3 minutes
    """
    try:
        symbol = symbol.upper()
        cache_key = cache_key_for_symbol('options_sweeps', symbol)
        
        # Check cache first (3 minute cache)
        try:
            cache = get_redis_cache()
            cached_result = cache.get(cache_key)
            if cached_result:
                current_app.logger.info(f"✅ Cache HIT: sweeps for {symbol}")
                return jsonify(cached_result), 200
        except Exception as e:
            current_app.logger.debug(f"Cache lookup failed: {e}")
        
        # Cache miss
        start_time = time.time()
        analyzer = get_flow_analyzer()
        sweeps = analyzer.detect_sweep_orders(symbol)
        duration_ms = (time.time() - start_time) * 1000
        
        current_app.logger.info(f"📊 Sweeps for {symbol} took {duration_ms:.0f}ms")
        
        result = {
            'symbol': symbol,
            'sweep_orders': sweeps,
            'count': len(sweeps)
        }
        
        # Cache for 3 minutes
        try:
            cache = get_redis_cache()
            cache.set(cache_key, result, timeout=180)
        except Exception as e:
            current_app.logger.debug(f"Cache write failed: {e}")
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error getting sweeps for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500

