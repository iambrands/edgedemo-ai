from flask import Blueprint, request, jsonify, current_app
from services.stock_manager import StockManager
from services.iv_analyzer import IVAnalyzer
from services.earnings_calendar import EarningsCalendarService
from services.tradier_connector import TradierConnector
from utils.decorators import token_required
from utils.helpers import validate_symbol, sanitize_input, sanitize_symbol
from datetime import date, datetime, timedelta

watchlist_bp = Blueprint('watchlist', __name__)

# Cache for IV data (symbol -> (data, timestamp))
_iv_cache = {}
IV_CACHE_DURATION = 300  # 5 minutes

def get_stock_manager():
    return StockManager()

def get_iv_analyzer():
    return IVAnalyzer()

def get_earnings_service():
    return EarningsCalendarService()

def get_tradier():
    return TradierConnector()

def fetch_iv_from_tradier(symbol: str) -> float:
    """Fetch current IV from Tradier options chain (ATM option)"""
    global _iv_cache
    
    # Check cache first
    cache_key = symbol.upper()
    if cache_key in _iv_cache:
        cached_iv, cached_time = _iv_cache[cache_key]
        if (datetime.now() - cached_time).total_seconds() < IV_CACHE_DURATION:
            return cached_iv
    
    try:
        tradier = get_tradier()
        
        # Get quote for current price
        quote_data = tradier.get_quote(symbol)
        if not quote_data or 'quotes' not in quote_data:
            return None
        
        quote = quote_data.get('quotes', {}).get('quote', {})
        current_price = float(quote.get('last', 0))
        if current_price <= 0:
            return None
        
        # Get nearest expiration (7-45 days out)
        expirations = tradier.get_options_expirations(symbol)
        if not expirations:
            return None
        
        target_exp = None
        today = date.today()
        for exp in expirations:
            try:
                exp_date = datetime.strptime(exp, '%Y-%m-%d').date()
                days_out = (exp_date - today).days
                if 7 <= days_out <= 45:
                    target_exp = exp
                    break
            except:
                continue
        
        if not target_exp and expirations:
            target_exp = expirations[0]
        
        if not target_exp:
            return None
        
        # Get options chain
        chain = tradier.get_options_chain(symbol, target_exp)
        if not chain:
            return None
        
        # Find ATM option and get IV
        atm_option = None
        min_diff = float('inf')
        
        for opt in chain:
            strike = float(opt.get('strike', 0))
            diff = abs(strike - current_price)
            if diff < min_diff:
                min_diff = diff
                atm_option = opt
        
        if atm_option:
            # Get IV from greeks or directly
            greeks = atm_option.get('greeks', {})
            iv = greeks.get('mid_iv') or greeks.get('smv_vol') or atm_option.get('implied_volatility')
            
            if iv:
                iv_float = float(iv)
                # Cache the result
                _iv_cache[cache_key] = (iv_float, datetime.now())
                return iv_float
        
        return None
        
    except Exception as e:
        current_app.logger.debug(f"IV fetch for {symbol}: {e}")
        return None

def calculate_iv_rank_data(iv_rank: float = None, current_iv: float = None):
    """Calculate IV Rank category and color"""
    if iv_rank is None and current_iv is None:
        return None
    
    # Normalize IV to percentage
    if current_iv is not None:
        iv_percent = current_iv * 100 if current_iv < 1 else current_iv
    else:
        iv_percent = None
    
    if iv_rank is not None:
        # Calculate based on IV Rank (0-100 scale)
        if iv_rank < 30:
            category, color, label = 'low', 'green', 'Low IV'
            strategy_hint = 'Buy options (cheap premiums)'
        elif iv_rank < 70:
            category, color, label = 'medium', 'yellow', 'Normal'
            strategy_hint = 'Neutral strategies'
        else:
            category, color, label = 'high', 'red', 'High IV'
            strategy_hint = 'Sell premium (expensive options)'
        
        return {
            'iv_rank': round(iv_rank, 1),
            'category': category,
            'color': color,
            'label': label,
            'strategy_hint': strategy_hint,
            'current_iv': round(iv_percent, 1) if iv_percent else None
        }
    
    # Fallback to simple IV categorization based on absolute IV
    if iv_percent is not None:
        if iv_percent < 25:
            return {
                'iv_rank': None,
                'category': 'low',
                'color': 'green',
                'label': 'Low IV',
                'strategy_hint': 'Buy options (cheap premiums)',
                'current_iv': round(iv_percent, 1)
            }
        elif iv_percent < 50:
            return {
                'iv_rank': None,
                'category': 'medium',
                'color': 'yellow',
                'label': 'Normal',
                'strategy_hint': 'Neutral strategies',
                'current_iv': round(iv_percent, 1)
            }
        else:
            return {
                'iv_rank': None,
                'category': 'high',
                'color': 'red',
                'label': 'High IV',
                'strategy_hint': 'Sell premium (expensive options)',
                'current_iv': round(iv_percent, 1)
            }
    
    return None

@watchlist_bp.route('', methods=['GET'])
@token_required
def get_watchlist(current_user):
    """Get user's watchlist with IV Rank and Earnings data"""
    try:
        stock_manager = get_stock_manager()
        stocks = stock_manager.get_watchlist(current_user.id)
        
        # Get earnings service
        earnings_map = {}
        try:
            earnings_service = get_earnings_service()
            symbols = [s.symbol for s in stocks]
            earnings_list = earnings_service.get_upcoming_earnings(
                days_ahead=30, 
                user_id=current_user.id,
                symbols=symbols
            )
            earnings_map = {e['symbol']: e for e in earnings_list}
        except Exception as e:
            current_app.logger.debug(f"Earnings fetch: {e}")
        
        # Get IV analyzer for historical data
        iv_analyzer = None
        try:
            iv_analyzer = get_iv_analyzer()
        except Exception as e:
            current_app.logger.debug(f"IV analyzer init: {e}")
        
        # Build watchlist with enhanced data
        watchlist_data = []
        for stock in stocks:
            stock_dict = stock.to_dict()
            
            # Add IV Rank data - try multiple sources
            iv_rank_data = None
            
            # 1. Try IV analyzer (historical data)
            if iv_analyzer:
                try:
                    iv_metrics = iv_analyzer.get_current_iv_metrics(stock.symbol)
                    if iv_metrics and iv_metrics.get('iv_rank') is not None:
                        iv_rank_data = calculate_iv_rank_data(
                            iv_rank=iv_metrics.get('iv_rank'),
                            current_iv=iv_metrics.get('implied_volatility')
                        )
                except Exception:
                    pass
            
            # 2. Try stock's stored IV rank
            if not iv_rank_data and stock.iv_rank is not None:
                iv_rank_data = calculate_iv_rank_data(
                    iv_rank=stock.iv_rank,
                    current_iv=stock.implied_volatility
                )
            
            # 3. Fetch IV directly from Tradier options chain
            if not iv_rank_data:
                try:
                    current_iv = fetch_iv_from_tradier(stock.symbol)
                    if current_iv:
                        iv_rank_data = calculate_iv_rank_data(
                            iv_rank=None,
                            current_iv=current_iv
                        )
                except Exception as e:
                    current_app.logger.debug(f"Tradier IV fetch for {stock.symbol}: {e}")
            
            stock_dict['iv_rank_data'] = iv_rank_data
            
            # Add Earnings data
            stock_dict['earnings'] = earnings_map.get(stock.symbol)
            
            watchlist_data.append(stock_dict)
        
        return jsonify({
            'watchlist': watchlist_data,
            'count': len(watchlist_data)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Watchlist error: {e}")
        return jsonify({'error': str(e)}), 500

@watchlist_bp.route('/add', methods=['POST'])
@token_required
def add_to_watchlist(current_user):
    """Add stock to watchlist"""
    data = request.get_json()
    
    if not data or not data.get('symbol'):
        return jsonify({'error': 'Symbol required'}), 400
    
    # Sanitize inputs
    symbol = sanitize_symbol(data.get('symbol', ''))
    if not symbol:
        return jsonify({'error': 'Invalid symbol'}), 400
    
    # Sanitize tags and notes
    tags = []
    if data.get('tags'):
        if isinstance(data['tags'], list):
            tags = [sanitize_input(tag, max_length=50) for tag in data['tags'] if tag]
        else:
            tags = [sanitize_input(str(data['tags']), max_length=50)]
    
    notes = sanitize_input(data.get('notes', ''), max_length=1000) if data.get('notes') else None
    
    try:
        stock_manager = get_stock_manager()
        stock = stock_manager.add_to_watchlist(
            user_id=current_user.id,
            symbol=symbol,
            tags=tags,
            notes=notes
        )
        return jsonify({
            'message': 'Stock added to watchlist',
            'stock': stock.to_dict()
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@watchlist_bp.route('/refresh', methods=['POST'])
@token_required
def refresh_watchlist(current_user):
    """Refresh prices for all stocks in watchlist"""
    try:
        stock_manager = get_stock_manager()
        result = stock_manager.refresh_watchlist_prices(current_user.id)
        return jsonify({
            'message': 'Watchlist refreshed',
            'updated': result['updated'],
            'errors': result['errors']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@watchlist_bp.route('/<symbol>', methods=['DELETE'])
@token_required
def remove_from_watchlist(current_user, symbol):
    """Remove stock from watchlist"""
    symbol = sanitize_symbol(symbol)
    if not symbol:
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        stock_manager = get_stock_manager()
        success = stock_manager.remove_from_watchlist(current_user.id, symbol)
        if success:
            return jsonify({'message': 'Stock removed from watchlist'}), 200
        else:
            return jsonify({'error': 'Stock not found in watchlist'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@watchlist_bp.route('/<symbol>/notes', methods=['PUT'])
@token_required
def update_notes(current_user, symbol):
    """Update notes for a stock"""
    symbol = sanitize_symbol(symbol)
    if not symbol:
        return jsonify({'error': 'Invalid symbol'}), 400
    
    data = request.get_json()
    notes = sanitize_input(data.get('notes', ''), max_length=1000) if data and data.get('notes') else ''
    
    try:
        stock_manager = get_stock_manager()
        stock = stock_manager.update_stock_notes(current_user.id, symbol, notes)
        if stock:
            return jsonify({
                'message': 'Notes updated',
                'stock': stock.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Stock not found in watchlist'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@watchlist_bp.route('/<symbol>/tags', methods=['PUT'])
@token_required
def update_tags(current_user, symbol):
    """Update tags for a stock"""
    symbol = sanitize_symbol(symbol)
    if not symbol:
        return jsonify({'error': 'Invalid symbol'}), 400
    
    data = request.get_json()
    tags = []
    if data and data.get('tags'):
        if isinstance(data['tags'], list):
            tags = [sanitize_input(tag, max_length=50) for tag in data['tags'] if tag]
        else:
            tags = [sanitize_input(str(data['tags']), max_length=50)]
    
    try:
        stock_manager = get_stock_manager()
        stock = stock_manager.update_stock_tags(current_user.id, symbol, tags)
        if stock:
            return jsonify({
                'message': 'Tags updated',
                'stock': stock.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Stock not found in watchlist'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchlist_bp.route('/bulk-add', methods=['POST'])
@token_required
def bulk_add_to_watchlist(current_user):
    """
    Add multiple stocks to watchlist in one operation
    """
    data = request.get_json()
    
    if not data or not data.get('symbols'):
        return jsonify({'error': 'No symbols provided'}), 400
    
    symbols = data.get('symbols', [])
    
    # Validate and sanitize symbols
    valid_symbols = []
    for symbol in symbols:
        sanitized = sanitize_symbol(symbol)
        if sanitized:
            valid_symbols.append(sanitized)
    
    if not valid_symbols:
        return jsonify({'error': 'No valid symbols provided'}), 400
    
    # Remove duplicates
    valid_symbols = list(set(valid_symbols))
    
    try:
        stock_manager = get_stock_manager()
        result = stock_manager.bulk_add_to_watchlist(current_user.id, valid_symbols)
        
        return jsonify({
            'message': f"Successfully added {result['added']} stocks",
            'added': result['added'],
            'skipped': result['skipped'],
            'failed': result['failed'],
            'failed_symbols': result['failed_symbols']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


