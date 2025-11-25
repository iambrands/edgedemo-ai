from flask import Blueprint, request, jsonify, current_app
from services.master_controller import AutomationMasterController
from services.market_hours import MarketHours
from utils.decorators import token_required
import threading

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
            
            # Try to generate signals to see what's happening
            try:
                signals = scanner.signal_generator.generate_signals(
                    symbol,
                    {'min_confidence': min_conf, 'strategy_type': automation.strategy_type}
                )
                
                signal_info = {
                    'automation_id': automation.id,
                    'automation_name': automation.name,
                    'symbol': symbol,
                    'min_confidence': min_conf,
                    'signal_confidence': signals.get('signals', {}).get('confidence', 0.0) if 'error' not in signals else None,
                    'signal_recommended': signals.get('signals', {}).get('recommended', False) if 'error' not in signals else False,
                    'signal_action': signals.get('signals', {}).get('action', 'hold') if 'error' not in signals else None,
                    'has_error': 'error' in signals,
                    'error_message': signals.get('error') if 'error' in signals else None
                }
            except Exception as e:
                signal_info = {
                    'automation_id': automation.id,
                    'automation_name': automation.name,
                    'symbol': symbol,
                    'has_error': True,
                    'error_message': str(e)
                }
            
            diagnostics['automation_details'].append(signal_info)
        
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

