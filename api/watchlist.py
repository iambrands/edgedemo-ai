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


