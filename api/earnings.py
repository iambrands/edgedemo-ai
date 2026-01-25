from flask import Blueprint, request, jsonify, current_app
from services.earnings_calendar import EarningsCalendarService
from services.finnhub_client import get_finnhub_client
from services.cache_manager import get_cache, set_cache
from utils.decorators import token_required
from datetime import datetime, date
import logging
import time

logger = logging.getLogger(__name__)

earnings_bp = Blueprint('earnings', __name__)

def get_earnings_service():
    return EarningsCalendarService()

@earnings_bp.route('', methods=['GET'])
@token_required
def get_upcoming_earnings(current_user):
    """Get upcoming earnings dates - CACHED for 1 hour"""
    try:
        days_ahead = request.args.get('days_ahead', 30, type=int)
        
        # CACHE CHECK - 1 hour TTL (earnings calendar changes infrequently)
        cache_key = f'earnings:{current_user.id}:{days_ahead}'
        cached_data = get_cache(cache_key)
        if cached_data:
            current_app.logger.info(f"💾 Earnings cache hit for user {current_user.id}")
            return jsonify(cached_data), 200
        
        start_time = time.time()
        service = get_earnings_service()
        earnings = service.get_upcoming_earnings(days_ahead, current_user.id)
        duration_ms = (time.time() - start_time) * 1000
        
        current_app.logger.info(f"📊 Earnings fetch took {duration_ms:.0f}ms for user {current_user.id}")
        
        result = {
            'earnings': earnings,
            'count': len(earnings)
        }
        
        # CACHE SET - 1 hour
        set_cache(cache_key, result, timeout=3600)
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Earnings error: {e}")
        return jsonify({'error': str(e)}), 500

@earnings_bp.route('/symbol/<symbol>', methods=['GET'])
@token_required
def get_symbol_earnings(current_user, symbol):
    """Get earnings dates for a specific symbol - CACHED for 24 hours"""
    try:
        symbol = symbol.upper()
        
        # CACHE CHECK - 24 hour TTL (symbol-specific earnings change rarely)
        cache_key = f'earnings_symbol:{symbol}'
        cached_data = get_cache(cache_key)
        if cached_data:
            current_app.logger.info(f"💾 Symbol earnings cache hit for {symbol}")
            return jsonify(cached_data), 200
        
        service = get_earnings_service()
        earnings = service.get_earnings_for_symbol(symbol, current_user.id)
        
        result = {
            'symbol': symbol,
            'earnings': earnings,
            'count': len(earnings)
        }
        
        # CACHE SET - 24 hours
        set_cache(cache_key, result, timeout=86400)
        
        return jsonify(result), 200
    except Exception as e:
        current_app.logger.error(f"Symbol earnings error for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500

@earnings_bp.route('', methods=['POST'])
@token_required
def add_earnings_date(current_user):
    """Add or update earnings date"""
    try:
        data = request.get_json()
        
        if not data or not data.get('symbol') or not data.get('earnings_date'):
            return jsonify({'error': 'Symbol and earnings_date required'}), 400
        
        service = get_earnings_service()
        
        earnings_date = datetime.strptime(data['earnings_date'], '%Y-%m-%d').date()
        
        earnings = service.add_earnings_date(
            symbol=data['symbol'].upper(),
            earnings_date=earnings_date,
            earnings_time=data.get('earnings_time', 'after_market'),
            fiscal_quarter=data.get('fiscal_quarter'),
            user_id=current_user.id
        )
        
        return jsonify({
            'message': 'Earnings date added',
            'earnings': earnings.to_dict()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@earnings_bp.route('/historical/<symbol>', methods=['GET'])
@token_required
def get_historical_impact(current_user, symbol):
    """Get historical earnings impact for a symbol"""
    try:
        service = get_earnings_service()
        impact = service.get_historical_impact(symbol.upper())
        
        return jsonify(impact), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@earnings_bp.route('/check-pause', methods=['POST'])
@token_required
def check_and_pause(current_user):
    """Manually trigger earnings check and auto-pause"""
    try:
        service = get_earnings_service()
        days_before = request.json.get('days_before', 3) if request.json else 3
        
        result = service.check_and_pause_automations(days_before)
        
        return jsonify({
            'message': 'Earnings check completed',
            'result': result
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# ECONOMIC CALENDAR ENDPOINTS (Finnhub)
# ============================================================

@earnings_bp.route('/economic', methods=['GET'])
@token_required
def get_economic_calendar(current_user):
    """
    Get economic calendar events (GDP, unemployment, etc.)
    
    Query params:
        days: Number of days to look ahead (default: 7)
    
    Returns:
        - events: List of economic events
        - total: Total event count
        - high_impact: High impact event count
    """
    try:
        days = request.args.get('days', 7, type=int)
        
        # Limit to 30 days max
        days = min(days, 30)
        
        finnhub = get_finnhub_client()
        
        if not finnhub.is_available():
            return jsonify({
                'events': [],
                'total': 0,
                'high_impact': 0,
                'error': 'Finnhub API not configured. Set FINNHUB_API_KEY environment variable.'
            }), 200
        
        result = finnhub.get_economic_calendar(days_ahead=days)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error fetching economic calendar: {e}", exc_info=True)
        return jsonify({
            'events': [],
            'total': 0,
            'error': str(e)
        }), 500


@earnings_bp.route('/economic/high-impact', methods=['GET'])
@token_required
def get_high_impact_economic_events(current_user):
    """
    Get only high-impact economic events
    
    Query params:
        days: Number of days to look ahead (default: 7)
    """
    try:
        days = request.args.get('days', 7, type=int)
        days = min(days, 30)
        
        finnhub = get_finnhub_client()
        
        if not finnhub.is_available():
            return jsonify({
                'events': [],
                'error': 'Finnhub API not configured'
            }), 200
        
        result = finnhub.get_economic_calendar(days_ahead=days)
        
        # Filter to high impact only
        high_impact_events = [
            e for e in result.get('events', [])
            if e.get('impact') == 'high'
        ]
        
        return jsonify({
            'events': high_impact_events,
            'total': len(high_impact_events),
            'from_date': result.get('from_date'),
            'to_date': result.get('to_date')
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching high-impact economic events: {e}", exc_info=True)
        return jsonify({'events': [], 'error': str(e)}), 500


@earnings_bp.route('/finnhub/earnings', methods=['GET'])
@token_required
def get_finnhub_earnings_calendar(current_user):
    """
    Get earnings calendar from Finnhub (alternative to local DB)
    
    Query params:
        days: Number of days to look ahead (default: 7)
    
    CACHED for 1 hour (earnings calendar doesn't change frequently)
    """
    try:
        days = request.args.get('days', 7, type=int)
        days = min(days, 30)
        
        # CRITICAL: Check cache FIRST - earnings don't change frequently
        cache_key = f'finnhub_earnings:days_{days}'
        cached_data = get_cache(cache_key)
        if cached_data:
            logger.info(f"✅ [EARNINGS] Cache HIT: {cache_key}")
            return jsonify(cached_data), 200
        
        logger.warning(f"⚠️ [EARNINGS] Cache MISS: {cache_key}")
        
        finnhub = get_finnhub_client()
        
        if not finnhub.is_available():
            return jsonify({
                'earnings': [],
                'error': 'Finnhub API not configured'
            }), 200
        
        start_time = time.time()
        result = finnhub.get_earnings_calendar(days_ahead=days)
        duration_ms = (time.time() - start_time) * 1000
        
        # Cache for 1 hour (earnings calendar doesn't change often)
        set_cache(cache_key, result, timeout=3600)
        logger.info(f"💾 [EARNINGS] Cached {cache_key} ({duration_ms:.0f}ms)")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error fetching Finnhub earnings: {e}", exc_info=True)
        return jsonify({'earnings': [], 'error': str(e)}), 500


@earnings_bp.route('/finnhub/symbol/<symbol>', methods=['GET'])
@token_required
def get_finnhub_symbol_earnings(current_user, symbol):
    """
    Get earnings for specific symbol from Finnhub
    
    Returns upcoming earnings date and past earnings history
    """
    try:
        finnhub = get_finnhub_client()
        
        if not finnhub.is_available():
            return jsonify({
                'symbol': symbol.upper(),
                'upcoming': None,
                'error': 'Finnhub API not configured'
            }), 200
        
        result = finnhub.get_symbol_earnings(symbol)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error fetching Finnhub earnings for {symbol}: {e}", exc_info=True)
        return jsonify({
            'symbol': symbol.upper(),
            'error': str(e)
        }), 500


@earnings_bp.route('/finnhub/status', methods=['GET'])
@token_required
def get_finnhub_status(current_user):
    """Check Finnhub API status and configuration"""
    try:
        finnhub = get_finnhub_client()
        
        return jsonify({
            'configured': finnhub.is_available(),
            'api_key_present': bool(finnhub.api_key),
            'api_key_preview': finnhub.api_key[:8] + '...' if finnhub.api_key else None,
            'base_url': finnhub.base_url
        }), 200
        
    except Exception as e:
        return jsonify({
            'configured': False,
            'error': str(e)
        }), 500

