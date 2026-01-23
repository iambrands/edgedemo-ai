from flask import Blueprint, request, jsonify, current_app
from services.master_controller import AutomationMasterController
from services.market_hours import MarketHours
from utils.decorators import token_required
from datetime import datetime
import threading
import logging

logger = logging.getLogger(__name__)

automation_engine_bp = Blueprint('automation_engine', __name__)

# Global controller instance (would use Celery in production)
_controller = None
_controller_thread = None

def get_controller():
    """Get or create master controller instance"""
    global _controller
    if _controller is None:
        _controller = AutomationMasterController()
    return _controller

@automation_engine_bp.route('/status', methods=['GET'])
@token_required
def get_automation_status(current_user):
    """Get automation engine status"""
    try:
        controller = get_controller()
        status = controller.get_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@automation_engine_bp.route('/start', methods=['POST'])
@token_required
def start_automation(current_user):
    """Start the automation engine"""
    global _controller_thread
    
    try:
        controller = get_controller()
        
        if controller.is_running:
            return jsonify({'message': 'Automation engine is already running'}), 200
        
        # Start in background thread (would use Celery in production)
        _controller_thread = threading.Thread(target=controller.start, daemon=True)
        _controller_thread.start()
        
        return jsonify({
            'message': 'Automation engine started',
            'status': controller.get_status()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@automation_engine_bp.route('/stop', methods=['POST'])
@token_required
def stop_automation(current_user):
    """Stop the automation engine"""
    try:
        controller = get_controller()
        controller.stop()
        
        return jsonify({
            'message': 'Automation engine stopped',
            'status': controller.get_status()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@automation_engine_bp.route('/run-cycle', methods=['POST'])
@token_required
def run_single_cycle(current_user):
    """Run a single automation cycle (for testing)"""
    try:
        from services.opportunity_scanner import OpportunityScanner
        from models.automation import Automation
        from flask import current_app
        
        controller = get_controller()
        db = current_app.extensions['sqlalchemy']
        
        # Get diagnostic info before running
        active_automations = db.session.query(Automation).filter_by(
            user_id=current_user.id,
            is_active=True,
            is_paused=False
        ).all()
        
        diagnostics = {
            'automations_scanned': len(active_automations),
            'automation_details': []
        }
        
        # Run the cycle
        controller.run_automation_cycle()
        
        # Get diagnostic info after running
        scanner = OpportunityScanner()
        opportunities = scanner.scan_for_setups(user_id=current_user.id)
        
        # Add detailed diagnostics for each automation
        for automation in active_automations:
            symbol = automation.symbol
            min_conf = getattr(automation, 'min_confidence', 0.70)
            
            diagnostic_info = {
                'automation_id': automation.id,
                'automation_name': automation.name,
                'symbol': symbol,
                'min_confidence': min_conf,
                'strategy_type': automation.strategy_type,
                'can_trade': False,
                'can_trade_reason': '',
                'signal_confidence': None,
                'signal_recommended': False,
                'signal_action': None,
                'options_found': False,
                'options_count': 0,
                'has_error': False,
                'error_message': None,
                'blocking_reasons': []
            }
            
            # Check if we can trade this symbol
            try:
                can_trade = scanner.can_trade_symbol(automation, symbol)
                diagnostic_info['can_trade'] = can_trade
                
                if not can_trade:
                    # Check why we can't trade
                    from models.position import Position
                    existing_position = db.session.query(Position).filter_by(
                        user_id=automation.user_id,
                        symbol=symbol,
                        status='open'
                    ).first()
                    
                    if existing_position:
                        diagnostic_info['blocking_reasons'].append(f'Already have open position in {symbol}')
                    
                    risk_limits = scanner.risk_manager.get_risk_limits(automation.user_id)
                    open_positions = db.session.query(Position).filter_by(
                        user_id=automation.user_id,
                        status='open'
                    ).count()
                    
                    if open_positions >= risk_limits.max_open_positions:
                        diagnostic_info['blocking_reasons'].append(f'Max positions reached ({open_positions}/{risk_limits.max_open_positions})')
            except Exception as e:
                diagnostic_info['has_error'] = True
                diagnostic_info['error_message'] = f'Error checking trade eligibility: {str(e)}'
            
            # Try to generate signals to see what's happening
            try:
                signals = scanner.signal_generator.generate_signals(
                    symbol,
                    {'min_confidence': min_conf, 'strategy_type': automation.strategy_type}
                )
                
                if 'error' in signals:
                    diagnostic_info['has_error'] = True
                    diagnostic_info['error_message'] = signals.get('error')
                else:
                    signal_data = signals.get('signals', {})
                    diagnostic_info['signal_confidence'] = signal_data.get('confidence', 0.0)
                    diagnostic_info['signal_recommended'] = signal_data.get('recommended', False)
                    diagnostic_info['signal_action'] = signal_data.get('action', 'hold')
                    
                    if not diagnostic_info['signal_recommended']:
                        if diagnostic_info['signal_confidence'] < min_conf:
                            diagnostic_info['blocking_reasons'].append(
                                f'Signal confidence {diagnostic_info["signal_confidence"]:.2%} < min {min_conf:.2%}'
                            )
                        else:
                            diagnostic_info['blocking_reasons'].append('Signal not recommended (action=hold)')
                    
                    # If signal is good, check if options are available
                    if diagnostic_info['signal_recommended'] and diagnostic_info['can_trade']:
                        try:
                            opportunity = scanner.analyze_options_for_signal(
                                symbol,
                                signals,
                                automation
                            )
                            
                            if opportunity:
                                diagnostic_info['options_found'] = True
                                diagnostic_info['options_count'] = 1
                            else:
                                diagnostic_info['blocking_reasons'].append('No suitable options found (check volume, open interest, spread, DTE)')
                        except Exception as e:
                            diagnostic_info['blocking_reasons'].append(f'Error finding options: {str(e)}')
            except Exception as e:
                diagnostic_info['has_error'] = True
                diagnostic_info['error_message'] = str(e)
            
            diagnostics['automation_details'].append(diagnostic_info)
        
        return jsonify({
            'message': 'Automation cycle completed',
            'status': controller.get_status(),
            'diagnostics': {
                'opportunities_found': len(opportunities),
                'automations_scanned': diagnostics['automations_scanned'],
                'automation_details': diagnostics['automation_details']
            }
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@automation_engine_bp.route('/market-status', methods=['GET'])
@token_required
def get_market_status(current_user):
    """Get current market status"""
    try:
        status = MarketHours.get_market_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@automation_engine_bp.route('/test-trade/<int:automation_id>', methods=['POST'])
@token_required
def test_trade_automation(current_user, automation_id):
    """Force execute a test trade for an automation (bypasses some checks for testing)"""
    try:
        from services.opportunity_scanner import OpportunityScanner
        from services.master_controller import AutomationMasterController
        from models.automation import Automation
        from flask import current_app
        
        db = current_app.extensions['sqlalchemy']
        automation = db.session.query(Automation).filter_by(
            id=automation_id,
            user_id=current_user.id
        ).first()
        
        if not automation:
            return jsonify({'error': 'Automation not found'}), 404
        
        if not automation.is_active:
            return jsonify({
                'error': 'Automation is not active',
                'details': 'Please activate the automation before testing'
            }), 400
        
        if automation.is_paused:
            return jsonify({
                'error': 'Automation is paused',
                'details': 'Please resume the automation before testing'
            }), 400
        
        scanner = OpportunityScanner()
        controller = AutomationMasterController()
        
        # Generate signals with very low confidence threshold for testing
        signals = scanner.signal_generator.generate_signals(
            automation.symbol,
            {
                'min_confidence': 0.0,  # Bypass confidence check for testing
                'strategy_type': automation.strategy_type
            }
        )
        
        if 'error' in signals:
            return jsonify({
                'error': 'Failed to generate signals',
                'details': signals.get('error', 'Unknown error generating signals'),
                'symbol': symbol
            }), 400
        
        # Force find an option (relax filters for testing)
        symbol = automation.symbol
        expirations_list = scanner.tradier.get_options_expirations(symbol)
        
        if not expirations_list or len(expirations_list) == 0:
            return jsonify({
                'error': 'No option expirations available',
                'symbol': symbol,
                'details': f'No option expirations found for {symbol}. This might be due to market hours, symbol availability, or API limitations.'
            }), 400
        
        # Use first available expiration
        best_expiration = expirations_list[0]
        
        # Get options chain
        from services.options_analyzer import OptionsAnalyzer
        options_analyzer = OptionsAnalyzer()
        chain = options_analyzer.analyze_options_chain(
            symbol,
            best_expiration,
            preference='balanced'
        )
        
        if not chain or len(chain) == 0:
            return jsonify({
                'error': 'No options found in chain',
                'symbol': symbol,
                'expiration': best_expiration,
                'details': f'No options chain data available for {symbol} on {best_expiration}. This might be due to market hours, symbol availability, or API limitations.'
            }), 400
        
        # Find any suitable option (relaxed criteria for testing)
        # Get direction from signals - respect bearish signals for PUTs
        signal_data = signals.get('signals', {})
        action = signal_data.get('action', 'hold')
        direction = signal_data.get('direction', 'neutral')
        
        # Map action to direction if direction is neutral
        if direction == 'neutral' or not direction:
            if action == 'buy_call':
                direction = 'bullish'
            elif action == 'buy_put':
                direction = 'bearish'
            else:
                # For neutral with no clear action, use IV rank if available
                iv_metrics = signals.get('iv_metrics', {})
                iv_rank = iv_metrics.get('iv_rank', 50) if iv_metrics else 50
                if iv_rank > 60:
                    direction = 'bearish'  # High IV suggests bearish/puts
                else:
                    direction = 'bullish'  # Low IV suggests bullish/calls
        
        suitable_options = []
        
        # Check all options, not just first 20
        for option in chain:
            # Filter by direction
            if direction == 'bullish' and option.get('contract_type') != 'call':
                continue
            if direction == 'bearish' and option.get('contract_type') != 'put':
                continue
            
            # Very relaxed filters for testing - just need bid/ask
            bid = option.get('bid', 0) or option.get('last', 0) or 0
            ask = option.get('ask', 0) or option.get('last', 0) or 0
            mid_price = option.get('mid_price', 0) or ((bid + ask) / 2) if (bid > 0 and ask > 0) else option.get('last', 0) or 0
            
            # Accept if we have any price data
            if mid_price > 0 or bid > 0 or ask > 0:
                # Update option with calculated mid_price if missing
                if not option.get('mid_price'):
                    option['mid_price'] = mid_price
                suitable_options.append(option)
        
        if not suitable_options:
            # Try to find ANY option regardless of direction for testing
            any_options = []
            for option in chain[:50]:  # Check first 50
                bid = option.get('bid', 0) or option.get('last', 0) or 0
                ask = option.get('ask', 0) or option.get('last', 0) or 0
                mid_price = option.get('mid_price', 0) or ((bid + ask) / 2) if (bid > 0 and ask > 0) else option.get('last', 0) or 0
                
                if mid_price > 0 or bid > 0 or ask > 0:
                    if not option.get('mid_price'):
                        option['mid_price'] = mid_price
                    any_options.append(option)
            
            if any_options:
                # Use any option we found, override direction
                suitable_options = any_options[:1]
                direction = 'bullish' if any_options[0].get('contract_type') == 'call' else 'bearish'
            else:
                return jsonify({
                    'error': 'No suitable options found (even with relaxed filters)',
                    'symbol': symbol,
                    'expiration': best_expiration,
                    'direction': direction,
                    'chain_size': len(chain),
                    'details': f'Checked {len(chain)} options. None have valid bid/ask prices. This might be due to market hours or symbol availability.'
                }), 400
        
        # Use first suitable option
        test_option = suitable_options[0]
        
        # Normalize field names - options analyzer uses 'strike' but trade executor expects 'strike_price'
        if 'strike' in test_option and 'strike_price' not in test_option:
            test_option['strike_price'] = test_option['strike']
        elif 'strike_price' not in test_option:
            # Try to extract from option_symbol if available
            option_symbol = test_option.get('option_symbol', '')
            if option_symbol:
                # Option symbols typically end with strike price (e.g., NVDA250120C00150000 = $150 strike)
                # This is a fallback - ideally strike should be in the option data
                logger.warning(f"Strike price not found in option data for {option_symbol}")
        
        # Ensure contract has all required fields
        if not test_option.get('expiration_date'):
            test_option['expiration_date'] = best_expiration
        
        # Ensure we have option_symbol if it's missing
        if not test_option.get('option_symbol') and test_option.get('symbol'):
            test_option['option_symbol'] = test_option['symbol']
        
        # Ensure signal has action set for test trade
        signal_data = signals.get('signals', {})
        if not signal_data.get('action') or signal_data.get('action') == 'hold':
            # Force action based on contract type
            if test_option.get('contract_type') == 'call':
                signal_data['action'] = 'buy_call'
            elif test_option.get('contract_type') == 'put':
                signal_data['action'] = 'buy_put'
            else:
                signal_data['action'] = 'buy_call'  # Default to call
        
        # Get quantity from automation
        quantity = getattr(automation, 'quantity', 1)
        
        # Create opportunity dict with all required fields
        opportunity = {
            'symbol': symbol,
            'contract': test_option,
            'signal': signal_data,
            'automation_id': automation.id,
            'user_id': automation.user_id,
            'quantity': quantity,  # Include quantity in opportunity
            'entry_reason': f'TEST TRADE - Manual trigger for testing automation {automation.name}',
            'expiration': best_expiration,
            'dte': (datetime.strptime(best_expiration, '%Y-%m-%d').date() - datetime.now().date()).days
        }
        
        # Execute the opportunity with better error handling
        try:
            executed = controller.execute_opportunity(opportunity)
            
            if executed:
                return jsonify({
                    'message': 'Test trade executed successfully',
                    'symbol': symbol,
                    'option': {
                        'strike': test_option.get('strike_price'),
                        'expiration': best_expiration,
                        'contract_type': test_option.get('contract_type'),
                        'price': test_option.get('mid_price', 0)
                    },
                    'signal_confidence': signal_data.get('confidence', 0)
                }), 200
            else:
                return jsonify({
                    'error': 'Trade execution failed',
                    'details': 'The opportunity was found but execution returned False. This might be due to risk validation, insufficient balance, or missing required fields.',
                    'symbol': symbol,
                    'option': {
                        'strike': test_option.get('strike_price'),
                        'expiration': best_expiration,
                        'contract_type': test_option.get('contract_type'),
                        'price': test_option.get('mid_price', 0)
                    },
                    'debug': {
                        'signal_action': signal_data.get('action'),
                        'has_option_symbol': bool(test_option.get('option_symbol')),
                        'has_strike': bool(test_option.get('strike_price') or test_option.get('strike')),
                        'has_expiration': bool(test_option.get('expiration_date')),
                        'strike_value': test_option.get('strike_price') or test_option.get('strike'),
                        'option_fields': list(test_option.keys())
                    }
                }), 500
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Test trade execution error: {e}", exc_info=True)
            
            return jsonify({
                'error': 'Trade execution error',
                'details': str(e),
                'symbol': symbol,
                'option': {
                    'strike': test_option.get('strike_price'),
                    'expiration': best_expiration,
                    'contract_type': test_option.get('contract_type')
                },
                'traceback': error_trace
            }), 500
            
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@automation_engine_bp.route('/activity', methods=['GET'])
@token_required
def get_automation_activity(current_user):
    """Get recent automation activity for the user"""
    try:
        from models.trade import Trade
        from models.audit_log import AuditLog
        from datetime import datetime, timedelta
        from flask import current_app
        
        db = current_app.extensions['sqlalchemy']
        
        # Get recent automation trades (last 24 hours)
        since = datetime.utcnow() - timedelta(days=1)
        automation_trades = db.session.query(Trade).filter(
            Trade.user_id == current_user.id,
            Trade.strategy_source == 'automation',
            Trade.trade_date >= since
        ).order_by(Trade.trade_date.desc()).limit(20).all()
        
        # Get positions to match with trades
        from models.position import Position
        positions = db.session.query(Position).filter_by(
            user_id=current_user.id,
            status='open'
        ).all()
        
        # Enhance trades with position information
        enhanced_trades = []
        for trade in automation_trades:
            trade_dict = trade.to_dict()
            
            # Find matching position for BUY trades
            if trade.action.lower() == 'buy':
                matching_position = None
                for pos in positions:
                    if (pos.symbol == trade.symbol and
                        pos.option_symbol == trade.option_symbol and
                        (not trade.strike_price or pos.strike_price == trade.strike_price) and
                        (not trade.expiration_date or 
                         (pos.expiration_date and pos.expiration_date == trade.expiration_date))):
                        matching_position = pos
                        break
                
                if matching_position:
                    trade_dict['position_id'] = matching_position.id
                    trade_dict['position_status'] = matching_position.status
                    trade_dict['position_unrealized_pnl'] = matching_position.unrealized_pnl
                    trade_dict['position_unrealized_pnl_percent'] = matching_position.unrealized_pnl_percent
                    trade_dict['created_position'] = True
                else:
                    trade_dict['created_position'] = False
            elif trade.action.lower() == 'sell':
                # For SELL trades, check if it closed a position
                trade_dict['closed_position'] = trade.exit_trade_id is not None
                trade_dict['realized_pnl'] = trade.realized_pnl
                trade_dict['realized_pnl_percent'] = trade.realized_pnl_percent
            
            enhanced_trades.append(trade_dict)
        
        # Get recent automation audit logs
        automation_logs = db.session.query(AuditLog).filter(
            AuditLog.user_id == current_user.id,
            AuditLog.action_category == 'automation',
            AuditLog.timestamp >= since
        ).order_by(AuditLog.timestamp.desc()).limit(20).all()
        
        # Get automation execution counts
        from models.automation import Automation
        automations = db.session.query(Automation).filter_by(user_id=current_user.id).all()
        automation_stats = {
            a.id: {
                'name': a.name,
                'execution_count': a.execution_count,
                'last_executed': a.last_executed.isoformat() if a.last_executed else None
            }
            for a in automations
        }
        
        return jsonify({
            'recent_trades': enhanced_trades,
            'recent_activity': [log.to_dict() for log in automation_logs],
            'automation_stats': automation_stats,
            'total_trades_24h': len(automation_trades)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

