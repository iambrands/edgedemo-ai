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
    
    try:
        # Import sanitization functions
        from utils.helpers import sanitize_symbol, sanitize_input, sanitize_int, sanitize_float
        
        # Sanitize and validate inputs
        symbol = sanitize_symbol(data.get('symbol', ''))
        if not symbol:
            return jsonify({'error': 'Invalid symbol'}), 400
        
        action = sanitize_input(data.get('action', ''), max_length=10).lower()
        if action not in ['buy', 'sell']:
            return jsonify({'error': 'Invalid action. Must be "buy" or "sell"'}), 400
        
        quantity = sanitize_int(data.get('quantity'), min_val=1, max_val=10000)
        if not quantity:
            return jsonify({'error': 'Invalid quantity. Must be between 1 and 10000'}), 400
        
        # Handle optional fields - only sanitize if they exist
        option_symbol = None
        if data.get('option_symbol'):
            option_symbol = sanitize_input(data.get('option_symbol', ''), max_length=50)
            if not option_symbol:
                option_symbol = None
        
        strike = None
        if data.get('strike') is not None:
            # For options, strike can be any positive number (even very small)
            strike_val = sanitize_float(data.get('strike'), min_val=0.001, max_val=100000.0)
            if strike_val is not None:
                strike = strike_val
        
        expiration_date = None
        if data.get('expiration_date'):
            exp_date = sanitize_input(data.get('expiration_date', ''), max_length=10)
            if exp_date:
                expiration_date = exp_date
        
        contract_type = None
        if data.get('contract_type'):
            ct = sanitize_input(data.get('contract_type', ''), max_length=10).lower()
            if ct in ['call', 'put', 'stock', 'option']:
                contract_type = ct
        
        price = None
        if data.get('price') is not None:
            price_val = sanitize_float(data.get('price'), min_val=0.0, max_val=100000.0)
            if price_val is not None:
                price = price_val
        strategy_source = sanitize_input(data.get('strategy_source', 'manual'), max_length=20)
        automation_id = sanitize_int(data.get('automation_id'), min_val=1) if data.get('automation_id') else None
        notes = sanitize_input(data.get('notes', ''), max_length=500) if data.get('notes') else None
        
        current_app.logger.info(f'Executing trade: symbol={symbol}, action={action}, quantity={quantity}, strike={strike}, expiration={expiration_date}, contract_type={contract_type}, price={price}')
        trade_executor = get_trade_executor()
        result = trade_executor.execute_trade(
            user_id=current_user.id,
            symbol=symbol,
            action=action,
            quantity=quantity,
            option_symbol=option_symbol,
            strike=strike,
            expiration_date=expiration_date,
            contract_type=contract_type,
            price=price,
            strategy_source=strategy_source,
            automation_id=automation_id,
            notes=notes
        )
        current_app.logger.info(f'Trade executed successfully: {result.get("trade_id")}')
        return jsonify(result), 201
    except ValueError as e:
        # Validation errors - return 400
        current_app.logger.warning(f'Trade validation error: {str(e)}')
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        # Other errors - return 500 with detailed logging
        import traceback
        error_trace = traceback.format_exc()
        current_app.logger.error(f'Trade execution error: {str(e)}\n{error_trace}', exc_info=True)
        return jsonify({
            'error': 'Failed to execute trade. Please try again or contact support if the issue persists.',
            'details': str(e) if current_app.config.get('DEBUG') else None
        }), 500

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

@trades_bp.route('/positions/check-exits', methods=['POST', 'OPTIONS'])
@token_required
def check_position_exits(current_user):
    """Manually check all positions for exit conditions and trigger exits if needed"""
    # OPTIONS is handled by token_required decorator
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    
    try:
        from services.position_monitor import PositionMonitor
        from models.position import Position
        
        position_monitor = PositionMonitor()
        
        # Get all open positions for this user
        db = current_app.extensions['sqlalchemy']
        user_positions = db.session.query(Position).filter_by(
            user_id=current_user.id,
            status='open'
        ).all()
        
        user_results = {
            'monitored': len(user_positions),
            'exits_triggered': 0,
            'positions_checked': [],
            'errors': []
        }
        
        # Check each user position individually
        for position in user_positions:
            try:
                # Refresh position data first to ensure we have current prices
                db.session.refresh(position)
                
                # Skip positions without required price data
                if not position.entry_price:
                    user_results['errors'].append(f"Position {position.id} missing entry_price")
                    continue
                
                # Update position data to get current prices
                try:
                    position_monitor.update_position_data(position)
                    db.session.commit()
                except Exception as update_error:
                    # If price update fails, log but continue
                    current_app.logger.warning(f"Failed to update position {position.id} prices: {str(update_error)}")
                    # If no current_price, skip this position
                    if not position.current_price:
                        user_results['errors'].append(f"Position {position.id} has no current_price after update attempt")
                        continue
                
                # Now check exit conditions
                exit_triggered = position_monitor.check_and_exit_position(position)
                
                # Refresh position from DB again to get updated values after check
                try:
                    db.session.refresh(position)
                except:
                    pass  # Position might have been deleted if closed
                
                position_info = {
                    'position_id': position.id,
                    'symbol': position.symbol,
                    'unrealized_pnl_percent': position.unrealized_pnl_percent or 0,
                    'exit_triggered': exit_triggered
                }
                user_results['positions_checked'].append(position_info)
                if exit_triggered:
                    user_results['exits_triggered'] += 1
            except Exception as e:
                import traceback
                error_msg = f"Error checking position {position.id if position else 'unknown'}: {str(e)}"
                error_trace = traceback.format_exc()
                user_results['errors'].append(error_msg)
                current_app.logger.error(f"{error_msg}\n{error_trace}")
                # Continue with next position even if one fails
        
        return jsonify({
            'message': 'Position exit check completed',
            'results': user_results
        }), 200
    except Exception as e:
        import traceback
        error_msg = f"Failed to check position exits: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        return jsonify({'error': error_msg}), 500

@trades_bp.route('/revert-incorrect-sells', methods=['POST'])
@token_required
def revert_incorrect_sells(current_user):
    """Revert incorrect SELL trades from 12/23/25 and reopen positions"""
    # Get db early to avoid scope issues
    db = current_app.extensions['sqlalchemy']
    
    try:
        from models.trade import Trade
        from models.position import Position
        from models.user import User
        from datetime import date, datetime
        from sqlalchemy import func
        
        data = request.get_json() or {}
        target_date = data.get('date', '2025-12-23')
        trade_ids = data.get('trade_ids')  # Optional: specific trade IDs
        
        # Parse date
        try:
            if isinstance(target_date, str):
                target_date = datetime.strptime(target_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Find SELL trades
        query = db.session.query(Trade).filter(
            Trade.action == 'sell'
        )
        
        if trade_ids:
            query = query.filter(Trade.id.in_(trade_ids))
        else:
            query = query.filter(func.date(Trade.trade_date) == target_date)
        
        sell_trades = query.order_by(Trade.trade_date).all()
        
        if not sell_trades:
            return jsonify({
                'message': 'No SELL trades found for the specified criteria',
                'reverted': 0,
                'positions_reopened': 0
            }), 200
        positions_reopened = []
        trades_reverted = []
        balance_adjustments = {}
        
        for sell_trade in sell_trades:
            # Find corresponding closed position
            if sell_trade.option_symbol:
                position = db.session.query(Position).filter(
                    Position.user_id == sell_trade.user_id,
                    Position.option_symbol == sell_trade.option_symbol,
                    Position.status == 'closed'
                ).order_by(Position.entry_date.desc()).first()
            else:
                position = db.session.query(Position).filter(
                    Position.user_id == sell_trade.user_id,
                    Position.symbol == sell_trade.symbol,
                    Position.option_symbol == None,
                    Position.status == 'closed'
                ).order_by(Position.entry_date.desc()).first()
            
            if position:
                # Reopen position
                position.status = 'open'
                position.unrealized_pnl = None
                position.unrealized_pnl_percent = None
                # Set current_price to entry_price initially, will be updated by monitor
                position.current_price = position.entry_price
                positions_reopened.append(position.id)
                
                # Update position with current market price
                try:
                    from services.position_monitor import PositionMonitor
                    monitor = PositionMonitor()
                    monitor.update_position_data(position)
                    db.session.refresh(position)
                except Exception as e:
                    current_app.logger.warning(f"Could not update position {position.id} price: {e}")
            else:
                # Try to recreate from BUY trade
                buy_trade = db.session.query(Trade).filter(
                    Trade.user_id == sell_trade.user_id,
                    Trade.symbol == sell_trade.symbol,
                    Trade.option_symbol == sell_trade.option_symbol,
                    Trade.action == 'buy',
                    Trade.trade_date < sell_trade.trade_date
                ).order_by(Trade.trade_date.desc()).first()
                
                if buy_trade:
                    new_position = Position(
                        user_id=buy_trade.user_id,
                        symbol=buy_trade.symbol,
                        option_symbol=buy_trade.option_symbol,
                        contract_type=buy_trade.contract_type,
                        quantity=buy_trade.quantity,
                        entry_price=buy_trade.price,
                        current_price=buy_trade.price,
                        strike_price=buy_trade.strike_price,
                        expiration_date=buy_trade.expiration_date,
                        entry_delta=buy_trade.delta,
                        entry_gamma=buy_trade.gamma,
                        entry_theta=buy_trade.theta,
                        entry_vega=buy_trade.vega,
                        entry_iv=buy_trade.implied_volatility,
                        current_delta=buy_trade.delta,
                        current_gamma=buy_trade.gamma,
                        current_theta=buy_trade.theta,
                        current_vega=buy_trade.vega,
                        current_iv=buy_trade.implied_volatility,
                        status='open'
                    )
                    db.session.add(new_position)
                    db.session.flush()
                    positions_reopened.append(new_position.id)
                    
                    # Update position with current market price
                    try:
                        from services.position_monitor import PositionMonitor
                        monitor = PositionMonitor()
                        monitor.update_position_data(new_position)
                        db.session.refresh(new_position)
                    except Exception as e:
                        current_app.logger.warning(f"Could not update new position {new_position.id} price: {e}")
            
            # Clear realized P/L
            trades_reverted.append(sell_trade.id)
            sell_trade.realized_pnl = None
            sell_trade.realized_pnl_percent = None
            sell_trade.notes = (sell_trade.notes or '') + ' [REVERTED - Incorrect sell]'
            
            # Calculate balance adjustment
            is_option = (
                sell_trade.contract_type and 
                sell_trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(sell_trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            sell_proceeds = sell_trade.price * sell_trade.quantity * contract_multiplier
            
            if sell_trade.user_id not in balance_adjustments:
                balance_adjustments[sell_trade.user_id] = 0
            balance_adjustments[sell_trade.user_id] -= sell_proceeds
        
        # Apply balance adjustments
        for user_id, adjustment in balance_adjustments.items():
            user = db.session.query(User).get(user_id)
            if user:
                user.paper_balance += adjustment
        
        db.session.commit()
        
        return jsonify({
            'message': 'Successfully reverted incorrect SELL trades',
            'reverted': len(trades_reverted),
            'positions_reopened': len(positions_reopened),
            'trade_ids': trades_reverted,
            'position_ids': positions_reopened,
            'balance_adjustments': {
                str(uid): float(adj) for uid, adj in balance_adjustments.items()
            }
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Failed to revert incorrect sells: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        try:
            if 'db' in locals() and db:
                db.session.rollback()
        except Exception as rollback_error:
            current_app.logger.warning(f"Could not rollback: {rollback_error}")
        return jsonify({'error': error_msg}), 500

