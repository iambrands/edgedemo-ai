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
        
        current_app.logger.info(f'Executing trade: symbol={symbol}, action={action}, quantity={quantity}, strike={strike}, expiration={expiration_date}, contract_type={contract_type}, price={price}, option_symbol={option_symbol}')
        
        # Validate that options trades have required fields
        is_option = bool(option_symbol) or (contract_type and contract_type.lower() in ['call', 'put', 'option']) or (expiration_date and strike is not None)
        if is_option:
            if not strike or strike <= 0:
                return jsonify({'error': 'Strike price is required for options trades'}), 400
            if not expiration_date:
                return jsonify({'error': 'Expiration date is required for options trades'}), 400
            if not contract_type or contract_type.lower() not in ['call', 'put', 'option']:
                return jsonify({'error': 'Contract type (call/put) is required for options trades'}), 400
        
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
        # Validation errors - return 400 with detailed error message
        error_msg = str(e)
        current_app.logger.warning(f'Trade validation error: {error_msg}')
        return jsonify({'error': error_msg}), 400
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
        
        current_app.logger.info(
            f"📊 GET /api/trades/positions - user_id={current_user.id}, update_prices={update_prices}"
        )
        
        positions = trade_executor.get_positions(current_user.id, update_prices=update_prices)
        
        current_app.logger.info(
            f"✅ GET /api/trades/positions - returning {len(positions)} positions for user {current_user.id}"
        )
        
        return jsonify({
            'positions': positions,
            'count': len(positions)
        }), 200
    except Exception as e:
        import traceback
        current_app.logger.error(
            f"❌ Error getting positions for user {current_user.id}: {str(e)}\n{traceback.format_exc()}"
        )
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
        target_dates = data.get('dates', [])  # Optional: multiple dates
        trade_ids = data.get('trade_ids')  # Optional: specific trade IDs
        target_symbol = data.get('symbol')  # Optional: filter by symbol (e.g., 'SPY')
        
        # Support both single date and multiple dates
        dates_to_process = []
        if target_dates and isinstance(target_dates, list):
            dates_to_process = target_dates
        elif target_date:
            dates_to_process = [target_date]
        
        # Parse dates
        parsed_dates = []
        for date_str in dates_to_process:
            try:
                if isinstance(date_str, str):
                    parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    parsed_dates.append(parsed_date)
            except ValueError:
                return jsonify({'error': f'Invalid date format: {date_str}. Use YYYY-MM-DD'}), 400
        
        if not parsed_dates:
            return jsonify({'error': 'No valid dates provided'}), 400
        
        # Find SELL trades for current user only
        query = db.session.query(Trade).filter(
            Trade.action == 'sell',
            Trade.user_id == current_user.id  # CRITICAL: Only revert current user's trades
        )
        
        if trade_ids:
            query = query.filter(Trade.id.in_(trade_ids))
        else:
            # Filter by date(s) - use IN clause for multiple dates
            if len(parsed_dates) == 1:
                query = query.filter(func.date(Trade.trade_date) == parsed_dates[0])
            else:
                query = query.filter(func.date(Trade.trade_date).in_(parsed_dates))
        
        # Optional: filter by symbol if provided
        if target_symbol:
            query = query.filter(Trade.symbol == target_symbol.upper())
        
        sell_trades = query.order_by(Trade.trade_date).all()
        
        current_app.logger.info(
            f"Found {len(sell_trades)} SELL trades for user {current_user.id} on date(s): {[str(d) for d in parsed_dates]}"
        )
        
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
                # Check if entry_price looks wrong (too high for option premium)
                # If entry_price > $50, it's likely a stock price, not option premium
                is_option = (
                    position.contract_type and 
                    position.contract_type.lower() in ['call', 'put', 'option']
                ) or bool(position.option_symbol) or (position.expiration_date and position.strike_price)
                
                entry_price_corrected = False
                if is_option and position.entry_price and position.entry_price > 50:
                    # Likely stored stock price instead of option premium - fetch correct premium
                    try:
                        from services.tradier_connector import TradierConnector
                        tradier = TradierConnector()
                        
                        if position.expiration_date and position.strike_price:
                            expiration_str = position.expiration_date.strftime('%Y-%m-%d')
                            options_chain = tradier.get_options_chain(position.symbol, expiration_str)
                            
                            # Find matching option
                            contract_type = (position.contract_type or '').lower()
                            if contract_type == 'option':
                                # Try to infer from delta if available
                                contract_type = 'put' if (position.entry_delta or 0) < 0 else 'call'
                            
                            matching_option = None
                            for opt in options_chain:
                                opt_strike = float(opt.get('strike', 0))
                                opt_type = (opt.get('type', '') or '').lower()
                                if abs(opt_strike - position.strike_price) < 0.01 and opt_type == contract_type:
                                    matching_option = opt
                                    break
                            
                            if matching_option:
                                # Use mid price if available, otherwise last price
                                bid = float(matching_option.get('bid', 0) or 0)
                                ask = float(matching_option.get('ask', 0) or 0)
                                last = float(matching_option.get('last', 0) or 0)
                                
                                if bid > 0 and ask > 0:
                                    correct_premium = (bid + ask) / 2
                                elif last > 0:
                                    correct_premium = last
                                else:
                                    correct_premium = None
                                
                                if correct_premium and correct_premium > 0:
                                    old_price = position.entry_price
                                    position.entry_price = correct_premium
                                    position.current_price = correct_premium
                                    entry_price_corrected = True
                                    current_app.logger.info(
                                        f"Corrected position {position.id} entry_price from ${old_price:.2f} "
                                        f"(stock price) to ${correct_premium:.2f} (option premium)"
                                    )
                    except Exception as e:
                        current_app.logger.warning(f"Could not correct entry_price for position {position.id}: {e}")
                
                # Reopen position
                position.status = 'open'
                position.unrealized_pnl = None
                position.unrealized_pnl_percent = None
                if not entry_price_corrected:
                    # Set current_price to entry_price initially, will be updated by monitor
                    position.current_price = position.entry_price
                
                # IMPORTANT: Clear automation_id to prevent immediate re-closing
                # The automation engine will close positions that meet exit conditions
                # By clearing the automation_id, we prevent automatic monitoring
                original_automation_id = position.automation_id
                position.automation_id = None
                
                positions_reopened.append(position.id)
                
                # Update position with current market price (but don't check exits yet)
                try:
                    from services.position_monitor import PositionMonitor
                    monitor = PositionMonitor()
                    # Only update price data, don't check exit conditions
                    monitor.update_position_data(position)
                    db.session.refresh(position)
                    current_app.logger.info(f"Reopened position {position.id} (automation {original_automation_id} disabled)")
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
                    # Check if BUY trade price looks wrong (too high for option premium)
                    is_option = (
                        buy_trade.contract_type and 
                        buy_trade.contract_type.lower() in ['call', 'put', 'option']
                    ) or bool(buy_trade.option_symbol)
                    
                    buy_price = buy_trade.price
                    buy_price_corrected = False
                    
                    if is_option and buy_trade.price and buy_trade.price > 50:
                        # Likely stored stock price instead of option premium - fetch correct premium
                        try:
                            from services.tradier_connector import TradierConnector
                            tradier = TradierConnector()
                            
                            if buy_trade.expiration_date and buy_trade.strike_price:
                                expiration_str = buy_trade.expiration_date.strftime('%Y-%m-%d')
                                options_chain = tradier.get_options_chain(buy_trade.symbol, expiration_str)
                                
                                # Find matching option
                                contract_type = (buy_trade.contract_type or '').lower()
                                if contract_type == 'option':
                                    # Try to infer from delta if available
                                    contract_type = 'put' if (buy_trade.delta or 0) < 0 else 'call'
                                
                                matching_option = None
                                for opt in options_chain:
                                    opt_strike = float(opt.get('strike', 0))
                                    opt_type = (opt.get('type', '') or '').lower()
                                    if abs(opt_strike - buy_trade.strike_price) < 0.01 and opt_type == contract_type:
                                        matching_option = opt
                                        break
                                
                                if matching_option:
                                    # Use mid price if available, otherwise last price
                                    bid = float(matching_option.get('bid', 0) or 0)
                                    ask = float(matching_option.get('ask', 0) or 0)
                                    last = float(matching_option.get('last', 0) or 0)
                                    
                                    if bid > 0 and ask > 0:
                                        correct_premium = (bid + ask) / 2
                                    elif last > 0:
                                        correct_premium = last
                                    else:
                                        correct_premium = None
                                    
                                    if correct_premium and correct_premium > 0:
                                        old_price = buy_trade.price
                                        buy_price = correct_premium
                                        buy_trade.price = correct_premium  # Update the BUY trade too
                                        buy_price_corrected = True
                                        current_app.logger.info(
                                            f"Corrected BUY trade {buy_trade.id} price from ${old_price:.2f} "
                                            f"(stock price) to ${correct_premium:.2f} (option premium)"
                                        )
                        except Exception as e:
                            current_app.logger.warning(f"Could not correct BUY trade {buy_trade.id} price: {e}")
                    
                    new_position = Position(
                        user_id=buy_trade.user_id,
                        symbol=buy_trade.symbol,
                        option_symbol=buy_trade.option_symbol,
                        contract_type=buy_trade.contract_type,
                        quantity=buy_trade.quantity,
                        entry_price=buy_price,  # Use corrected price
                        current_price=buy_price,  # Use corrected price
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
                        status='open',
                        automation_id=None  # Don't link to automation to prevent auto-closing
                    )
                    db.session.add(new_position)
                    db.session.flush()
                    positions_reopened.append(new_position.id)
                    
                    # Update position with current market price (but don't check exits)
                    try:
                        from services.position_monitor import PositionMonitor
                        monitor = PositionMonitor()
                        monitor.update_position_data(new_position)
                        db.session.refresh(new_position)
                        current_app.logger.info(f"Recreated position {new_position.id} from BUY trade")
                    except Exception as e:
                        current_app.logger.warning(f"Could not update new position {new_position.id} price: {e}")
            
            # Clear realized P/L
            trades_reverted.append(sell_trade.id)
            sell_trade.realized_pnl = None
            sell_trade.realized_pnl_percent = None
            sell_trade.notes = (sell_trade.notes or '') + ' [REVERTED - Incorrect sell]'
            
            # Calculate balance adjustment
            # We need to subtract the sell proceeds (which were incorrectly added)
            # AND add back the buy cost (which was incorrectly deducted)
            is_option = (
                sell_trade.contract_type and 
                sell_trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(sell_trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            
            # Find the corresponding BUY trade to get the correct buy price
            buy_trade_for_balance = None
            if sell_trade.option_symbol:
                buy_trade_for_balance = db.session.query(Trade).filter(
                    Trade.user_id == sell_trade.user_id,
                    Trade.option_symbol == sell_trade.option_symbol,
                    Trade.action == 'buy',
                    Trade.trade_date < sell_trade.trade_date
                ).order_by(Trade.trade_date.desc()).first()
            else:
                buy_trade_for_balance = db.session.query(Trade).filter(
                    Trade.user_id == sell_trade.user_id,
                    Trade.symbol == sell_trade.symbol,
                    Trade.option_symbol == None,
                    Trade.action == 'buy',
                    Trade.trade_date < sell_trade.trade_date
                ).order_by(Trade.trade_date.desc()).first()
            
            # Calculate adjustments
            # Subtract the incorrect sell proceeds (what was added when sold)
            sell_proceeds = sell_trade.price * sell_trade.quantity * contract_multiplier
            
            # Add back the buy cost (what was deducted when bought)
            # Use the corrected buy price if available, otherwise use the stored price
            buy_cost = 0
            if buy_trade_for_balance:
                # If buy price was corrected earlier in this loop, use that
                # Otherwise, if it's suspiciously high (>$50 for options), we'll need to correct it
                buy_price = buy_trade_for_balance.price
                if is_option and buy_price and buy_price > 50:
                    # Try to get correct premium (similar to what we did for positions)
                    try:
                        from services.tradier_connector import TradierConnector
                        tradier = TradierConnector()
                        if buy_trade_for_balance.expiration_date and buy_trade_for_balance.strike_price:
                            expiration_str = buy_trade_for_balance.expiration_date.strftime('%Y-%m-%d')
                            options_chain = tradier.get_options_chain(buy_trade_for_balance.symbol, expiration_str)
                            
                            contract_type = (buy_trade_for_balance.contract_type or '').lower()
                            if contract_type == 'option':
                                contract_type = 'put' if (buy_trade_for_balance.delta or 0) < 0 else 'call'
                            
                            matching_option = None
                            for opt in options_chain:
                                opt_strike = float(opt.get('strike', 0))
                                opt_type = (opt.get('type', '') or '').lower()
                                if abs(opt_strike - buy_trade_for_balance.strike_price) < 0.01 and opt_type == contract_type:
                                    matching_option = opt
                                    break
                            
                            if matching_option:
                                bid = float(matching_option.get('bid', 0) or 0)
                                ask = float(matching_option.get('ask', 0) or 0)
                                if bid > 0 and ask > 0:
                                    buy_price = (bid + ask) / 2
                                    buy_trade_for_balance.price = buy_price  # Update the trade record
                    except Exception as e:
                        current_app.logger.warning(f"Could not correct buy price for balance calc: {e}")
                
                buy_cost = buy_price * buy_trade_for_balance.quantity * contract_multiplier
            
            # Net adjustment: subtract sell proceeds, add back buy cost
            net_adjustment = -sell_proceeds + buy_cost
            
            if sell_trade.user_id not in balance_adjustments:
                balance_adjustments[sell_trade.user_id] = 0
            balance_adjustments[sell_trade.user_id] += net_adjustment
            
            current_app.logger.info(
                f"Balance adjustment for trade {sell_trade.id}: "
                f"sell_proceeds=${sell_proceeds:.2f}, buy_cost=${buy_cost:.2f}, "
                f"net=${net_adjustment:.2f}"
            )
        
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

@trades_bp.route('/recalculate-balance', methods=['POST'])
@token_required
def recalculate_balance(current_user):
    """Recalculate paper balance from scratch based on all trades"""
    db = current_app.extensions['sqlalchemy']
    
    try:
        from models.trade import Trade
        from models.user import User
        from datetime import datetime
        
        # Start with default paper trading balance
        starting_balance = 100000.0
        calculated_balance = starting_balance
        
        # Get all trades for this user, ordered by date
        all_trades = db.session.query(Trade).filter(
            Trade.user_id == current_user.id
        ).order_by(Trade.trade_date).all()
        
        current_app.logger.info(f"Recalculating balance for user {current_user.id} from {len(all_trades)} trades")
        
        # Process each trade
        for trade in all_trades:
            is_option = (
                trade.contract_type and 
                trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            trade_cost = trade.price * trade.quantity * contract_multiplier
            
            if trade.action.lower() == 'buy':
                calculated_balance -= trade_cost
            else:  # sell
                calculated_balance += trade_cost
        
        # Update user balance
        old_balance = current_user.paper_balance
        current_user.paper_balance = calculated_balance
        
        db.session.commit()
        
        return jsonify({
            'message': 'Balance recalculated successfully',
            'old_balance': float(old_balance),
            'new_balance': float(calculated_balance),
            'difference': float(calculated_balance - old_balance),
            'trades_processed': len(all_trades)
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Failed to recalculate balance: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': error_msg}), 500

@trades_bp.route('/cleanup-and-recalculate', methods=['POST'])
@token_required
def cleanup_and_recalculate(current_user):
    """Delete bogus trades and recalculate balance based on valid trades and active positions"""
    db = current_app.extensions['sqlalchemy']
    
    try:
        from models.trade import Trade
        from models.position import Position
        from models.user import User
        from datetime import datetime, date
        from sqlalchemy import func
        
        data = request.get_json() or {}
        delete_dates = data.get('dates', [])  # Dates to delete trades from (e.g., ['2025-12-24', '2025-12-25'])
        delete_symbols = data.get('symbols', [])  # Optional: specific symbols to delete (e.g., ['SPY', 'QQQ'])
        
        deleted_trades = []
        starting_balance = 100000.0
        
        # Step 1: Delete bogus trades
        if delete_dates:
            query = db.session.query(Trade).filter(
                Trade.user_id == current_user.id,
                Trade.action == 'sell'  # Only delete SELL trades (the bogus ones)
            )
            
            # Filter by dates
            parsed_dates = []
            for date_str in delete_dates:
                try:
                    parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    parsed_dates.append(parsed_date)
                except ValueError:
                    continue
            
            if parsed_dates:
                if len(parsed_dates) == 1:
                    query = query.filter(func.date(Trade.trade_date) == parsed_dates[0])
                else:
                    query = query.filter(func.date(Trade.trade_date).in_(parsed_dates))
            
            # Optional: filter by symbols
            if delete_symbols:
                query = query.filter(Trade.symbol.in_([s.upper() for s in delete_symbols]))
            
            bogus_trades = query.all()
            
            for trade in bogus_trades:
                # Check if price looks like stock price (for options)
                is_option = (
                    trade.contract_type and 
                    trade.contract_type.lower() in ['call', 'put', 'option']
                ) or bool(trade.option_symbol)
                
                # If it's an option and price > $50, it's likely a bogus trade
                if is_option and trade.price and trade.price > 50:
                    deleted_trades.append({
                        'id': trade.id,
                        'symbol': trade.symbol,
                        'action': trade.action,
                        'price': trade.price,
                        'quantity': trade.quantity,
                        'date': trade.trade_date.isoformat() if trade.trade_date else None
                    })
                    db.session.delete(trade)
                elif not is_option:
                    # For stocks, delete if it's in the date range (user specified)
                    deleted_trades.append({
                        'id': trade.id,
                        'symbol': trade.symbol,
                        'action': trade.action,
                        'price': trade.price,
                        'quantity': trade.quantity,
                        'date': trade.trade_date.isoformat() if trade.trade_date else None
                    })
                    db.session.delete(trade)
            
            db.session.flush()  # Flush deletions before recalculating
        
        # Step 2: Recalculate balance from remaining valid trades
        all_trades = db.session.query(Trade).filter(
            Trade.user_id == current_user.id
        ).order_by(Trade.trade_date).all()
        
        calculated_balance = starting_balance
        
        for trade in all_trades:
            is_option = (
                trade.contract_type and 
                trade.contract_type.lower() in ['call', 'put', 'option']
            ) or bool(trade.option_symbol)
            
            contract_multiplier = 100 if is_option else 1
            trade_cost = trade.price * trade.quantity * contract_multiplier
            
            if trade.action.lower() == 'buy':
                calculated_balance -= trade_cost
            else:  # sell
                calculated_balance += trade_cost
        
        # Step 3: Account for active positions (unrealized P/L)
        # The balance should reflect: starting balance - all buy costs + all sell proceeds
        # Active positions are already accounted for (we bought them, haven't sold)
        # So the balance is correct as calculated above
        
        # Update user balance
        old_balance = current_user.paper_balance
        current_user.paper_balance = calculated_balance
        
        db.session.commit()
        
        # Get active positions info
        active_positions = db.session.query(Position).filter(
            Position.user_id == current_user.id,
            Position.status == 'open'
        ).all()
        
        return jsonify({
            'message': 'Cleanup and recalculation completed successfully',
            'deleted_trades': deleted_trades,
            'trades_deleted': len(deleted_trades),
            'old_balance': float(old_balance),
            'new_balance': float(calculated_balance),
            'difference': float(calculated_balance - old_balance),
            'valid_trades_processed': len(all_trades),
            'active_positions': len(active_positions),
            'active_positions_details': [
                {
                    'id': p.id,
                    'symbol': p.symbol,
                    'quantity': p.quantity,
                    'entry_price': float(p.entry_price) if p.entry_price else None,
                    'current_price': float(p.current_price) if p.current_price else None,
                    'unrealized_pnl': float(p.unrealized_pnl) if p.unrealized_pnl else None
                }
                for p in active_positions
            ]
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Failed to cleanup and recalculate: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': error_msg}), 500

