from flask import Blueprint, request, jsonify, current_app
from services.options_flow import OptionsFlowAnalyzer
from utils.decorators import token_required
from services.cache_manager import get_cache, set_cache  # CRITICAL: Use same cache as warmer
import time
import logging
import sys

logger = logging.getLogger(__name__)

options_flow_bp = Blueprint('options_flow', __name__)

def get_flow_analyzer():
    return OptionsFlowAnalyzer()


def cache_key_for_symbol(prefix: str, symbol: str) -> str:
    """Generate cache key for symbol-based endpoints"""
    return f"{prefix}:{symbol.upper()}"


@options_flow_bp.route('/analyze/<symbol>', methods=['GET'])
def analyze_flow(symbol):
    """
    Analyze options flow for a symbol
    
    Cached for 5 minutes to improve performance (expensive operation)
    
    NOTE: Cache check happens BEFORE auth to allow instant cache hits.
    Auth is only required for cache misses (expensive API calls).
    """
    # DIAGNOSTIC: Log at very start
    print(f"🔍 [OPTIONS_FLOW] Endpoint called for {symbol}", file=sys.stderr, flush=True)
    logger.info(f"🔍 [OPTIONS_FLOW] Endpoint called for {symbol}")
    
    try:
        symbol = symbol.upper()
        cache_key = cache_key_for_symbol('options_flow_analyze', symbol)
        
        print(f"🔍 [OPTIONS_FLOW] Checking cache: {cache_key}", file=sys.stderr, flush=True)
        
        # CRITICAL: Check cache FIRST - no auth needed for cached data
        cached_result = get_cache(cache_key)
        
        if cached_result:
            print(f"✅ [OPTIONS_FLOW] Cache HIT: {cache_key}", file=sys.stderr, flush=True)
            logger.info(f"✅ [OPTIONS_FLOW] Cache HIT: {cache_key}")
            return jsonify(cached_result), 200
        
        # Cache miss - NOW require auth for expensive API call
        print(f"⚠️ [OPTIONS_FLOW] Cache MISS: {cache_key} - requiring auth", file=sys.stderr, flush=True)
        
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        from models.user import User
        
        try:
            verify_jwt_in_request(locations=['headers'])
            current_user_id = get_jwt_identity()
        except Exception as auth_error:
            logger.warning(f"Auth failed for cache miss: {auth_error}")
            return jsonify({'error': 'Authentication required for uncached data'}), 401
        
        # Fetch from API (expensive)
        start_time = time.time()
        logger.warning(f"⚠️ [OPTIONS_FLOW] Cache MISS: {cache_key}")
        
        analyzer = get_flow_analyzer()
        analysis = analyzer.analyze_flow(symbol)
        duration_ms = (time.time() - start_time) * 1000
        
        # Cache the result for 5 minutes
        set_cache(cache_key, analysis, timeout=300)
        logger.info(f"💾 [OPTIONS_FLOW] Cached {cache_key} ({duration_ms:.0f}ms)")
        
        return jsonify(analysis), 200
    except Exception as e:
        logger.error(f"Error analyzing options flow for {symbol}: {e}")
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
        
        # CRITICAL: Check cache FIRST
        cached_result = get_cache(cache_key)
        if cached_result:
            current_app.logger.info(f"✅ [UNUSUAL_VOL] Cache HIT: {cache_key}")
            return jsonify(cached_result), 200
        
        # Cache miss
        start_time = time.time()
        current_app.logger.warning(f"⚠️ [UNUSUAL_VOL] Cache MISS: {cache_key}")
        
        analyzer = get_flow_analyzer()
        unusual = analyzer.detect_unusual_volume(symbol, expiration if expiration else None)
        duration_ms = (time.time() - start_time) * 1000
        
        result = {
            'symbol': symbol,
            'unusual_volume': unusual,
            'count': len(unusual)
        }
        
        # Cache for 3 minutes
        set_cache(cache_key, result, timeout=180)
        current_app.logger.info(f"💾 [UNUSUAL_VOL] Cached {cache_key} ({duration_ms:.0f}ms)")
        
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
        
        # CRITICAL: Check cache FIRST
        cached_result = get_cache(cache_key)
        if cached_result:
            current_app.logger.info(f"✅ [LARGE_BLOCKS] Cache HIT: {cache_key}")
            return jsonify(cached_result), 200
        
        # Cache miss
        start_time = time.time()
        current_app.logger.warning(f"⚠️ [LARGE_BLOCKS] Cache MISS: {cache_key}")
        
        analyzer = get_flow_analyzer()
        blocks = analyzer.detect_large_blocks(symbol, min_contracts)
        duration_ms = (time.time() - start_time) * 1000
        
        result = {
            'symbol': symbol,
            'large_blocks': blocks,
            'count': len(blocks)
        }
        
        # Cache for 3 minutes
        set_cache(cache_key, result, timeout=180)
        current_app.logger.info(f"💾 [LARGE_BLOCKS] Cached {cache_key} ({duration_ms:.0f}ms)")
        
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
        
        # CRITICAL: Check cache FIRST
        cached_result = get_cache(cache_key)
        if cached_result:
            current_app.logger.info(f"✅ [SWEEPS] Cache HIT: {cache_key}")
            return jsonify(cached_result), 200
        
        # Cache miss
        start_time = time.time()
        current_app.logger.warning(f"⚠️ [SWEEPS] Cache MISS: {cache_key}")
        
        analyzer = get_flow_analyzer()
        sweeps = analyzer.detect_sweep_orders(symbol)
        duration_ms = (time.time() - start_time) * 1000
        
        result = {
            'symbol': symbol,
            'sweep_orders': sweeps,
            'count': len(sweeps)
        }
        
        # Cache for 3 minutes
        set_cache(cache_key, result, timeout=180)
        current_app.logger.info(f"💾 [SWEEPS] Cached {cache_key} ({duration_ms:.0f}ms)")
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Error getting sweeps for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500

