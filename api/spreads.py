"""
API endpoints for vertical spreads
"""

from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required
from services.spread_executor import SpreadExecutor
from services.tradier_connector import TradierConnector
from models.spread import Spread
from app import db
import logging

logger = logging.getLogger(__name__)

spreads_bp = Blueprint('spreads', __name__)

def get_tradier():
    """Get Tradier connector instance"""
    return TradierConnector()

@spreads_bp.route('/calculate', methods=['POST'])
@token_required
def calculate_spread_metrics(current_user):
    """Calculate spread metrics without executing"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        symbol = data.get('symbol', '').upper()
        option_type = data.get('option_type', '').lower()
        long_strike = data.get('long_strike')
        short_strike = data.get('short_strike')
        expiration = data.get('expiration')
        quantity = int(data.get('quantity', 1))
        
        # Validation
        if not symbol:
            return jsonify({'error': 'Symbol required'}), 400
        if option_type not in ['call', 'put']:
            return jsonify({'error': 'option_type must be "call" or "put"'}), 400
        if not long_strike or not short_strike:
            return jsonify({'error': 'Both long_strike and short_strike required'}), 400
        if not expiration:
            return jsonify({'error': 'Expiration date required'}), 400
        if quantity < 1:
            return jsonify({'error': 'Quantity must be >= 1'}), 400
        
        try:
            long_strike_float = float(long_strike)
            short_strike_float = float(short_strike)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid strike prices'}), 400
        
        # Validate strike relationship
        if option_type == 'put':
            if long_strike_float <= short_strike_float:
                return jsonify({'error': 'PUT debit spread: long strike must be > short strike'}), 400
        else:  # call
            if long_strike_float >= short_strike_float:
                return jsonify({'error': 'CALL debit spread: long strike must be < short strike'}), 400
        
        # Calculate metrics
        tradier = get_tradier()
        executor = SpreadExecutor(tradier)
        
        metrics = executor.calculate_spread_metrics(
            symbol=symbol,
            option_type=option_type,
            long_strike=long_strike_float,
            short_strike=short_strike_float,
            expiration=expiration,
            quantity=quantity
        )
        
        return jsonify({
            'success': True,
            **metrics
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Spread calculation failed: {e}", exc_info=True)
        return jsonify({'error': 'Calculation failed', 'details': str(e)}), 500

@spreads_bp.route('/execute', methods=['POST'])
@token_required
def execute_spread(current_user):
    """Execute a debit spread"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        symbol = data.get('symbol', '').upper()
        option_type = data.get('option_type', '').lower()
        long_strike = data.get('long_strike')
        short_strike = data.get('short_strike')
        expiration = data.get('expiration')
        quantity = int(data.get('quantity', 1))
        account_type = data.get('account_type', 'paper')
        
        # Validation
        if not symbol:
            return jsonify({'error': 'Symbol required'}), 400
        if option_type not in ['call', 'put']:
            return jsonify({'error': 'option_type must be "call" or "put"'}), 400
        if not long_strike or not short_strike:
            return jsonify({'error': 'Both long_strike and short_strike required'}), 400
        if not expiration:
            return jsonify({'error': 'Expiration date required'}), 400
        if quantity < 1:
            return jsonify({'error': 'Quantity must be >= 1'}), 400
        if account_type not in ['paper', 'live']:
            return jsonify({'error': 'account_type must be "paper" or "live"'}), 400
        
        try:
            long_strike_float = float(long_strike)
            short_strike_float = float(short_strike)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid strike prices'}), 400
        
        # Execute spread
        tradier = get_tradier()
        executor = SpreadExecutor(tradier)
        
        spread = executor.execute_debit_spread(
            user=current_user,
            symbol=symbol,
            option_type=option_type,
            long_strike=long_strike_float,
            short_strike=short_strike_float,
            expiration=expiration,
            quantity=quantity,
            account_type=account_type
        )
        
        return jsonify({
            'success': True,
            'spread': spread.to_dict(),
            'message': f"Spread executed for ${abs(spread.net_debit):,.2f}"
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Spread execution failed: {e}", exc_info=True)
        return jsonify({'error': 'Execution failed', 'details': str(e)}), 500

@spreads_bp.route('/<int:spread_id>/close', methods=['POST'])
@token_required
def close_spread(current_user, spread_id):
    """Close a spread"""
    try:
        spread = Spread.query.get_or_404(spread_id)
        
        # Check ownership
        if spread.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Close spread
        tradier = get_tradier()
        executor = SpreadExecutor(tradier)
        
        spread = executor.close_spread(spread_id)
        
        pnl_status = "Profit" if spread.realized_pnl > 0 else "Loss"
        
        return jsonify({
            'success': True,
            'spread': spread.to_dict(),
            'message': f"{pnl_status}: ${abs(spread.realized_pnl):,.2f}"
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Spread close failed: {e}", exc_info=True)
        return jsonify({'error': 'Close failed', 'details': str(e)}), 500

@spreads_bp.route('', methods=['GET'])
@token_required
def get_spreads(current_user):
    """Get all spreads for current user"""
    try:
        status = request.args.get('status', 'open')  # open, closed, all
        
        query = Spread.query.filter_by(user_id=current_user.id)
        
        if status != 'all':
            query = query.filter_by(status=status)
        
        spreads = query.order_by(Spread.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'spreads': [s.to_dict() for s in spreads],
            'count': len(spreads)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get spreads: {e}", exc_info=True)
        return jsonify({'error': 'Failed to get spreads'}), 500

