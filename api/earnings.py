from flask import Blueprint, request, jsonify
from services.earnings_calendar import EarningsCalendarService
from utils.decorators import token_required
from datetime import datetime, date

earnings_bp = Blueprint('earnings', __name__)

def get_earnings_service():
    return EarningsCalendarService()

@earnings_bp.route('', methods=['GET'])
@token_required
def get_upcoming_earnings(current_user):
    """Get upcoming earnings dates"""
    try:
        service = get_earnings_service()
        days_ahead = request.args.get('days_ahead', 30, type=int)
        
        earnings = service.get_upcoming_earnings(days_ahead, current_user.id)
        
        return jsonify({
            'earnings': earnings,
            'count': len(earnings)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@earnings_bp.route('/symbol/<symbol>', methods=['GET'])
@token_required
def get_symbol_earnings(current_user, symbol):
    """Get earnings dates for a specific symbol"""
    try:
        service = get_earnings_service()
        earnings = service.get_earnings_for_symbol(symbol.upper(), current_user.id)
        
        return jsonify({
            'symbol': symbol.upper(),
            'earnings': earnings,
            'count': len(earnings)
        }), 200
    except Exception as e:
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

