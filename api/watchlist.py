from flask import Blueprint, request, jsonify
from services.stock_manager import StockManager
from utils.decorators import token_required
from utils.helpers import validate_symbol

watchlist_bp = Blueprint('watchlist', __name__)

def get_stock_manager():
    return StockManager()

@watchlist_bp.route('', methods=['GET'])
@token_required
def get_watchlist(current_user):
    """Get user's watchlist"""
    try:
        stock_manager = get_stock_manager()
        stocks = stock_manager.get_watchlist(current_user.id)
        return jsonify({
            'watchlist': [stock.to_dict() for stock in stocks],
            'count': len(stocks)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@watchlist_bp.route('/add', methods=['POST'])
@token_required
def add_to_watchlist(current_user):
    """Add stock to watchlist"""
    data = request.get_json()
    
    if not data or not data.get('symbol'):
        return jsonify({'error': 'Symbol required'}), 400
    
    symbol = data['symbol'].upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        stock_manager = get_stock_manager()
        tags = data.get('tags', [])
        notes = data.get('notes')
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

@watchlist_bp.route('/quote/<symbol>', methods=['GET'])
@token_required
def get_quote(current_user, symbol):
    """Get current quote for a symbol - uses Yahoo Finance if enabled, otherwise Tradier"""
    from flask import current_app
    current_app.logger.info(f'=== QUOTE ENDPOINT CALLED ===')
    current_app.logger.info(f'Symbol: {symbol}')
    current_app.logger.info(f'User: {current_user.username if current_user else "None"}')
    
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        current_app.logger.error(f'Invalid symbol: {symbol}')
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        from flask import current_app
        use_yahoo = current_app.config.get('USE_YAHOO_DATA', False)
        
        # Try Yahoo Finance first if enabled
        if use_yahoo:
            try:
                from services.yahoo_connector import YahooConnector
                yahoo = YahooConnector()
                quote = yahoo.get_quote(symbol)
                
                if 'quotes' in quote and 'quote' in quote['quotes']:
                    quote_data = quote['quotes']['quote']
                    current_price = quote_data.get('last')
                    if current_price and current_price > 0:
                        return jsonify({
                            'symbol': symbol,
                            'current_price': float(current_price),
                            'change': quote_data.get('change', 0),
                            'change_percent': ((quote_data.get('change', 0) / quote_data.get('close', current_price)) * 100) if quote_data.get('close') else 0,
                            'volume': quote_data.get('volume', 0),
                            'high': None,  # Yahoo quote doesn't always have these
                            'low': None,
                            'open': None
                        }), 200
            except Exception as e:
                # Fallback to Tradier if Yahoo fails
                pass
        
        # Fallback to Tradier
        from services.tradier_connector import TradierConnector
        tradier = TradierConnector()
        quote = tradier.get_quote(symbol)
        
        if 'quotes' in quote and 'quote' in quote['quotes']:
            quote_data = quote['quotes']['quote']
            current_price = quote_data.get('last')
            if current_price and current_price > 0:
                return jsonify({
                    'symbol': symbol,
                    'current_price': float(current_price),
                    'change': quote_data.get('change', 0),
                    'change_percent': quote_data.get('change_percentage', 0),
                    'volume': quote_data.get('volume', 0),
                    'high': quote_data.get('high'),
                    'low': quote_data.get('low'),
                    'open': quote_data.get('open')
                }), 200
        
        return jsonify({'error': 'Quote not available'}), 404
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
    symbol = symbol.upper()
    if not validate_symbol(symbol):
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
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    data = request.get_json()
    notes = data.get('notes', '') if data else ''
    
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
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    data = request.get_json()
    tags = data.get('tags', []) if data else []
    
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


