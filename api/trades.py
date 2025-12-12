from flask import Blueprint, request, jsonify, current_app
from services.trade_executor import TradeExecutor
from utils.decorators import token_required
from utils.helpers import validate_symbol

trades_bp = Blueprint('trades', __name__)

def get_trade_executor():
    return TradeExecutor()

@trades_bp.route('/execute', methods=['POST'])
@token_required
def execute_trade(current_user):
    """Execute a trade"""
    data = request.get_json()
    
    if not data or not data.get('symbol') or not data.get('action') or not data.get('quantity'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    symbol = data['symbol'].upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        current_app.logger.info(f'Executing trade: {data}')
        trade_executor = get_trade_executor()
        result = trade_executor.execute_trade(
            user_id=current_user.id,
            symbol=symbol,
            action=data['action'],
            quantity=int(data['quantity']),
            option_symbol=data.get('option_symbol'),
            strike=data.get('strike'),
            expiration_date=data.get('expiration_date'),
            contract_type=data.get('contract_type'),
            price=data.get('price'),
            strategy_source=data.get('strategy_source', 'manual'),
            automation_id=data.get('automation_id'),
            notes=data.get('notes')
        )
        current_app.logger.info(f'Trade executed successfully: {result.get("trade_id")}')
        return jsonify(result), 201
    except Exception as e:
        current_app.logger.error(f'Trade execution error: {str(e)}', exc_info=True)
        return jsonify({'error': str(e)}), 500

@trades_bp.route('/history', methods=['GET'])
@token_required
def get_trade_history(current_user):
    """Get trade history with optional filters"""
    symbol = request.args.get('symbol')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    strategy_source = request.args.get('strategy_source')
    
    try:
        trade_executor = get_trade_executor()
        trades = trade_executor.get_trade_history(
            user_id=current_user.id,
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            strategy_source=strategy_source
        )
        return jsonify({
            'trades': trades,
            'count': len(trades)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@trades_bp.route('/positions', methods=['GET'])
@token_required
def get_positions(current_user):
    """Get current positions"""
    try:
        from services.position_monitor import PositionMonitor
        from models.position import Position
        from flask import current_app
        
        trade_executor = get_trade_executor()
        db = current_app.extensions['sqlalchemy']
        
        # Get positions (fast - without price updates by default)
        # Only update prices if update_prices parameter is true (default: false for speed)
        update_prices = request.args.get('update_prices', 'false').lower() == 'true'
        positions = trade_executor.get_positions(current_user.id, update_prices=update_prices)
        
        return jsonify({
            'positions': positions,
            'count': len(positions)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting positions: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@trades_bp.route('/positions/<int:position_id>/refresh', methods=['POST', 'OPTIONS'])
@token_required
def refresh_position(current_user, position_id):
    """Manually refresh a specific position's price and Greeks"""
    # OPTIONS is handled by token_required decorator
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        from services.position_monitor import PositionMonitor
        from models.position import Position
        from flask import current_app
        
        db = current_app.extensions['sqlalchemy']
        position = db.session.query(Position).filter_by(
            id=position_id, 
            user_id=current_user.id,
            status='open'
        ).first()
        
        if not position:
            return jsonify({'error': 'Position not found'}), 404
        
        # Update position data
        monitor = PositionMonitor()
        monitor.update_position_data(position)
        db.session.refresh(position)
        db.session.commit()
        
        return jsonify({
            'message': 'Position refreshed',
            'position': position.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error refreshing position {position_id}: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@trades_bp.route('/positions/<int:position_id>/close', methods=['POST', 'OPTIONS'])
@token_required
def close_position(current_user, position_id):
    """Close a position"""
    # OPTIONS is handled by token_required decorator
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    data = request.get_json() or {}
    exit_price = data.get('exit_price')
    
    try:
        trade_executor = get_trade_executor()
        result = trade_executor.close_position(
            user_id=current_user.id,
            position_id=position_id,
            exit_price=exit_price
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

