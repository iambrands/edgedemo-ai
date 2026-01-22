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

@spreads_bp.route('/calculate-credit', methods=['POST'])
@token_required
def calculate_credit_spread_metrics(current_user):
    """Calculate credit spread metrics without executing (bull put, bear call)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        symbol = data.get('symbol', '').upper()
        option_type = data.get('option_type', '').lower()
        spread_type = data.get('spread_type', '').lower()  # bull_put or bear_call
        long_strike = data.get('long_strike')
        short_strike = data.get('short_strike')
        expiration = data.get('expiration')
        quantity = int(data.get('quantity', 1))
        
        # Validation
        if not symbol:
            return jsonify({'error': 'Symbol required'}), 400
        if option_type not in ['call', 'put']:
            return jsonify({'error': 'option_type must be "call" or "put"'}), 400
        if spread_type not in ['bull_put', 'bear_call']:
            return jsonify({'error': 'spread_type must be "bull_put" or "bear_call"'}), 400
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
        
        # Validate strike relationship for credit spreads
        if spread_type == 'bull_put':
            # Bull Put: Sell higher strike put, buy lower strike put
            if short_strike_float <= long_strike_float:
                return jsonify({'error': 'Bull put spread: short strike must be > long strike'}), 400
        else:  # bear_call
            # Bear Call: Sell lower strike call, buy higher strike call
            if short_strike_float >= long_strike_float:
                return jsonify({'error': 'Bear call spread: short strike must be < long strike'}), 400
        
        # Get option prices from Tradier
        tradier = get_tradier()
        
        # Get long leg quote (the protection leg we buy)
        long_quote = tradier.get_option_quote(
            symbol=symbol,
            option_type=option_type,
            strike=long_strike_float,
            expiration=expiration
        )
        
        # Get short leg quote (the premium leg we sell)
        short_quote = tradier.get_option_quote(
            symbol=symbol,
            option_type=option_type,
            strike=short_strike_float,
            expiration=expiration
        )
        
        if not long_quote or not short_quote:
            return jsonify({'error': 'Could not get option quotes'}), 400
        
        # Calculate premiums - use mid price or fall back to last
        long_premium = long_quote.get('mid') or long_quote.get('last') or 0
        short_premium = short_quote.get('mid') or short_quote.get('last') or 0
        
        if long_premium == 0 or short_premium == 0:
            return jsonify({'error': 'Invalid option prices (zero premiums)'}), 400
        
        # Credit spread calculations
        # Net credit = premium received (short) - premium paid (long)
        net_credit = short_premium - long_premium
        
        if net_credit <= 0:
            return jsonify({'error': f'Invalid credit spread: would be a debit of ${abs(net_credit):.2f}. Short premium (${short_premium:.2f}) must be greater than long premium (${long_premium:.2f})'}), 400
        
        # Strike width
        strike_width = abs(short_strike_float - long_strike_float)
        
        # Max profit = Net credit received (keep all the premium)
        max_profit = net_credit
        
        # Max loss = Strike width - Net credit
        max_loss = strike_width - net_credit
        
        # Breakeven calculation
        if spread_type == 'bull_put':
            # Bull put breakeven = Short strike - Net credit
            breakeven = short_strike_float - net_credit
        else:  # bear_call
            # Bear call breakeven = Short strike + Net credit
            breakeven = short_strike_float + net_credit
        
        logger.info(f"Credit spread calculated: {spread_type} {symbol} {short_strike_float}/{long_strike_float} = ${net_credit:.2f} credit")
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'spread_type': spread_type,
            'option_type': option_type,
            'long_strike': long_strike_float,
            'short_strike': short_strike_float,
            'long_premium': long_premium,
            'short_premium': short_premium,
            'net_credit': net_credit,
            'strike_width': strike_width,
            'max_profit': max_profit,
            'max_loss': max_loss,
            'breakeven': breakeven,
            'quantity': quantity,
            'total_credit': net_credit * quantity * 100,
            'total_max_profit': max_profit * quantity * 100,
            'total_max_loss': max_loss * quantity * 100,
            'is_credit': True
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Credit spread calculation failed: {e}", exc_info=True)
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

@spreads_bp.route('/<int:spread_id>/refresh', methods=['POST'])
@token_required
def refresh_spread(current_user, spread_id):
    """Refresh spread price and P/L"""
    try:
        spread = Spread.query.get_or_404(spread_id)
        
        # Check ownership
        if spread.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Only refresh open spreads
        if spread.status != 'open':
            return jsonify({
                'success': True,
                'spread': spread.to_dict(),
                'message': 'Spread is already closed'
            }), 200
        
        # Get current prices
        tradier = get_tradier()
        executor = SpreadExecutor(tradier)
        
        try:
            # Calculate current spread value
            metrics = executor.calculate_spread_metrics(
                symbol=spread.symbol,
                option_type='call' if 'call' in spread.spread_type else 'put',
                long_strike=spread.long_strike,
                short_strike=spread.short_strike,
                expiration=spread.expiration.isoformat(),
                quantity=spread.quantity
            )
            
            # Update spread with current values
            if metrics and 'net_debit' in metrics:
                current_value = abs(metrics['net_debit'])
                spread.current_value = current_value
                spread.unrealized_pnl = current_value - spread.net_debit
                if spread.net_debit != 0:
                    spread.unrealized_pnl_percent = (spread.unrealized_pnl / spread.net_debit) * 100
                else:
                    spread.unrealized_pnl_percent = 0
                
                from datetime import datetime
                spread.last_updated = datetime.utcnow()
                db.session.commit()
                
                logger.info(f"Refreshed spread {spread_id}: current_value=${current_value:.2f}, pnl=${spread.unrealized_pnl:.2f}")
            
        except Exception as e:
            logger.warning(f"Could not get live prices for spread {spread_id}: {e}")
            # Return existing data even if refresh failed
        
        return jsonify({
            'success': True,
            'spread': spread.to_dict(),
            'message': 'Spread refreshed'
        }), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Spread refresh failed: {e}", exc_info=True)
        return jsonify({'error': 'Refresh failed', 'details': str(e)}), 500

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

