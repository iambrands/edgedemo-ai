from flask import Blueprint, request, jsonify
from services.iv_analyzer import IVAnalyzer
from utils.decorators import token_required

iv_bp = Blueprint('iv', __name__)

def get_iv_analyzer():
    return IVAnalyzer()

@iv_bp.route('/<symbol>', methods=['GET'])
@token_required
def get_iv_metrics(current_user, symbol):
    """Get current IV rank and percentile for a symbol"""
    try:
        iv_analyzer = get_iv_analyzer()
        metrics = iv_analyzer.get_current_iv_metrics(symbol.upper())
        
        if not metrics:
            return jsonify({'error': 'No IV data available for this symbol'}), 404
        
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@iv_bp.route('/<symbol>/history', methods=['GET'])
@token_required
def get_iv_history(current_user, symbol):
    """Get IV history for a symbol"""
    try:
        iv_analyzer = get_iv_analyzer()
        days = request.args.get('days', 252, type=int)
        history = iv_analyzer.get_iv_history(symbol.upper(), days)
        return jsonify({'history': history, 'count': len(history)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@iv_bp.route('/<symbol>/store', methods=['POST'])
@token_required
def store_iv_data(current_user, symbol):
    """Store IV data for a symbol (typically called automatically)"""
    data = request.get_json()
    if not data or 'iv' not in data:
        return jsonify({'error': 'IV value required'}), 400
    
    try:
        iv_analyzer = get_iv_analyzer()
        iv_history = iv_analyzer.store_iv_data(
            symbol.upper(),
            data['iv'],
            data.get('stock_price')
        )
        return jsonify(iv_history.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

