from flask import Blueprint, request, jsonify
from services.options_flow import OptionsFlowAnalyzer
from utils.decorators import token_required

options_flow_bp = Blueprint('options_flow', __name__)

def get_flow_analyzer():
    return OptionsFlowAnalyzer()

@options_flow_bp.route('/analyze/<symbol>', methods=['GET'])
@token_required
def analyze_flow(current_user, symbol):
    """Analyze options flow for a symbol"""
    try:
        analyzer = get_flow_analyzer()
        analysis = analyzer.analyze_flow(symbol.upper())
        
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_flow_bp.route('/unusual-volume/<symbol>', methods=['GET'])
@token_required
def get_unusual_volume(current_user, symbol):
    """Get unusual volume options"""
    try:
        analyzer = get_flow_analyzer()
        expiration = request.args.get('expiration')
        
        unusual = analyzer.detect_unusual_volume(symbol.upper(), expiration)
        
        return jsonify({
            'symbol': symbol.upper(),
            'unusual_volume': unusual,
            'count': len(unusual)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_flow_bp.route('/large-blocks/<symbol>', methods=['GET'])
@token_required
def get_large_blocks(current_user, symbol):
    """Get large block trades"""
    try:
        analyzer = get_flow_analyzer()
        min_contracts = request.args.get('min_contracts', 1000, type=int)
        
        blocks = analyzer.detect_large_blocks(symbol.upper(), min_contracts)
        
        return jsonify({
            'symbol': symbol.upper(),
            'large_blocks': blocks,
            'count': len(blocks)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@options_flow_bp.route('/sweeps/<symbol>', methods=['GET'])
@token_required
def get_sweeps(current_user, symbol):
    """Get sweep orders"""
    try:
        analyzer = get_flow_analyzer()
        sweeps = analyzer.detect_sweep_orders(symbol.upper())
        
        return jsonify({
            'symbol': symbol.upper(),
            'sweep_orders': sweeps,
            'count': len(sweeps)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

