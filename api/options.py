from flask import Blueprint, request, jsonify, current_app
from services.options_analyzer import OptionsAnalyzer
from services.tradier_connector import TradierConnector
from services.ai_signals import AISignals
from utils.decorators import token_required
from utils.helpers import validate_symbol

options_bp = Blueprint('options', __name__)

def get_analyzer():
    return OptionsAnalyzer()

def get_tradier():
    return TradierConnector()

def get_ai_signals():
    return AISignals()

@options_bp.route('/analyze', methods=['POST'])
@token_required
def analyze_options(current_user):
    """Analyze options chain with AI-powered explanations"""
    data = request.get_json()
    
    if not data or not data.get('symbol'):
        return jsonify({'error': 'Symbol required'}), 400
    
    symbol = data['symbol'].upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    expiration = data.get('expiration')
    if not expiration:
        return jsonify({'error': 'Expiration date required'}), 400
    
    preference = data.get('preference', current_user.default_strategy)
    if preference not in ['income', 'growth', 'balanced']:
        preference = 'balanced'
    
    try:
        user_risk_tolerance = current_user.risk_tolerance or 'moderate'
        
        analyzer = get_analyzer()
        results = analyzer.analyze_options_chain(
            symbol=symbol,
            expiration=expiration,
            preference=preference,
            user_risk_tolerance=user_risk_tolerance
        )
        
        return jsonify({
            'symbol': symbol,
            'expiration': expiration,
            'preference': preference,
            'options': results,
            'count': len(results)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_bp.route('/chain/<symbol>/<expiration>', methods=['GET'])
@token_required
def get_options_chain(current_user, symbol, expiration):
    """Get options chain for symbol and expiration"""
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        tradier = get_tradier()
        chain = tradier.get_options_chain(symbol, expiration)
        return jsonify({
            'symbol': symbol,
            'expiration': expiration,
            'chain': chain
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_bp.route('/expirations/<symbol>', methods=['GET'])
@token_required
def get_expirations(current_user, symbol):
    """Get available expiration dates for symbol"""
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        tradier = get_tradier()
        expirations = tradier.get_options_expirations(symbol)
        return jsonify({
            'symbol': symbol,
            'expirations': expirations
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_bp.route('/signals/<symbol>', methods=['GET'])
@token_required
def get_signals(current_user, symbol):
    """Get AI-generated signals for symbol"""
    symbol = symbol.upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    preference = request.args.get('preference', current_user.default_strategy)
    if preference not in ['income', 'growth', 'balanced']:
        preference = 'balanced'
    
    try:
        ai_signals = get_ai_signals()
        signals = ai_signals.generate_signals(symbol, preference)
        return jsonify({
            'symbol': symbol,
            'signals': signals,
            'count': len(signals)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

