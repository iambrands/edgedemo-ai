from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required
from services.opportunity_insights import OpportunityInsights
from datetime import datetime

opportunity_insights_bp = Blueprint('opportunity_insights', __name__)

@opportunity_insights_bp.route('/symbol/<symbol>', methods=['GET'])
@token_required
def get_symbol_insights(current_user, symbol):
    """Get comprehensive insights for a symbol (earnings, IV, unusual activity)"""
    try:
        service = OpportunityInsights()
        insights = service.get_symbol_insights(symbol.upper(), current_user.id)
        
        return jsonify({
            'insights': insights,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        try:
            current_app.logger.error(f"Error getting insights for {symbol}: {e}")
        except:
            pass
        return jsonify({'error': f'Failed to get insights: {str(e)}'}), 500

@opportunity_insights_bp.route('/batch', methods=['POST'])
@token_required
def get_batch_insights(current_user):
    """Get insights for multiple symbols at once"""
    try:
        data = request.get_json() or {}
        symbols = data.get('symbols', [])
        
        if not symbols:
            return jsonify({'error': 'symbols array required'}), 400
        
        service = OpportunityInsights()
        insights = service.get_batch_insights(symbols, current_user.id)
        
        return jsonify({
            'insights': insights,
            'count': len(insights),
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        try:
            current_app.logger.error(f"Error getting batch insights: {e}")
        except:
            pass
        return jsonify({'error': f'Failed to get insights: {str(e)}'}), 500

