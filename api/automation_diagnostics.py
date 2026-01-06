from flask import Blueprint, jsonify, current_app
from utils.decorators import token_required
from services.opportunity_scanner import OpportunityScanner
from models.automation import Automation
from models.position import Position

automation_diagnostics_bp = Blueprint('automation_diagnostics', __name__)

@automation_diagnostics_bp.route('/diagnostics', methods=['GET'])
@token_required
def get_automation_diagnostics(current_user):
    """Get diagnostics for all automations showing why they are/aren't triggering"""
    try:
        db = current_app.extensions['sqlalchemy']
        scanner = OpportunityScanner()
        
        # Get all automations for this user
        automations = db.session.query(Automation).filter_by(user_id=current_user.id).all()
        
        diagnostics = []
        
        for automation in automations:
            symbol = automation.symbol
            min_conf = getattr(automation, 'min_confidence', 0.30)
            
            diagnostic = {
                'automation_id': automation.id,
                'automation_name': automation.name,
                'symbol': symbol,
                'is_active': automation.is_active,
                'is_paused': automation.is_paused,
                'min_confidence': min_conf,
                'strategy_type': automation.strategy_type,
                'quantity': getattr(automation, 'quantity', 1),
                'status': 'unknown',
                'can_trade': False,
                'signal_confidence': None,
                'signal_recommended': False,
                'signal_action': None,
                'options_found': False,
                'options_count': 0,
                'blocking_reasons': [],
                'ready_to_trade': False
            }
            
            # Check if automation is active
            if not automation.is_active:
                diagnostic['status'] = 'inactive'
                diagnostic['blocking_reasons'].append('Automation is not active')
                diagnostics.append(diagnostic)
                continue
            
            if automation.is_paused:
                diagnostic['status'] = 'paused'
                diagnostic['blocking_reasons'].append('Automation is paused')
                diagnostics.append(diagnostic)
                continue
            
            # Check if we can trade this symbol
            try:
                can_trade = scanner.can_trade_symbol(automation, symbol)
                diagnostic['can_trade'] = can_trade
                
                if not can_trade:
                    # Check why we can't trade
                    existing_position = db.session.query(Position).filter_by(
                        user_id=automation.user_id,
                        symbol=symbol,
                        status='open'
                    ).first()
                    
                    if existing_position:
                        diagnostic['blocking_reasons'].append(
                            f'Already have open position in {symbol} (Position ID: {existing_position.id})'
                        )
                    
                    from services.risk_manager import RiskManager
                    risk_manager = RiskManager()
                    risk_limits = risk_manager.get_risk_limits(automation.user_id)
                    open_positions = db.session.query(Position).filter_by(
                        user_id=automation.user_id,
                        status='open'
                    ).count()
                    
                    if open_positions >= risk_limits.max_open_positions:
                        diagnostic['blocking_reasons'].append(
                            f'Max positions reached ({open_positions}/{risk_limits.max_open_positions})'
                        )
            except Exception as e:
                diagnostic['blocking_reasons'].append(f'Error checking trade eligibility: {str(e)}')
            
            # Generate signals to see what's happening
            try:
                signals = scanner.signal_generator.generate_signals(
                    symbol,
                    {'min_confidence': min_conf, 'strategy_type': automation.strategy_type}
                )
                
                if 'error' in signals:
                    diagnostic['blocking_reasons'].append(f'Signal generation error: {signals.get("error")}')
                else:
                    signal_data = signals.get('signals', {})
                    diagnostic['signal_confidence'] = signal_data.get('confidence', 0.0)
                    diagnostic['signal_recommended'] = signal_data.get('recommended', False)
                    diagnostic['signal_action'] = signal_data.get('action', 'hold')
                    diagnostic['signal_direction'] = signal_data.get('direction', 'neutral')
                    diagnostic['signal_reason'] = signal_data.get('reason', '')
                    
                    if not diagnostic['signal_recommended']:
                        if diagnostic['signal_confidence'] < min_conf:
                            diagnostic['blocking_reasons'].append(
                                f'Signal confidence {diagnostic["signal_confidence"]:.1%} < min {min_conf:.1%}'
                            )
                        else:
                            diagnostic['blocking_reasons'].append(
                                f'Signal not recommended (action={diagnostic["signal_action"]})'
                            )
                    
                    # If signal is good and can trade, check if options are available
                    if diagnostic['signal_recommended'] and diagnostic['can_trade']:
                        try:
                            opportunity = scanner.analyze_options_for_signal(
                                symbol,
                                signals,
                                automation
                            )
                            
                            if opportunity:
                                diagnostic['options_found'] = True
                                diagnostic['options_count'] = 1
                                diagnostic['ready_to_trade'] = True
                                diagnostic['status'] = 'ready'
                            else:
                                diagnostic['blocking_reasons'].append(
                                    'No suitable options found (check volume, open interest, spread, DTE)'
                                )
                                diagnostic['status'] = 'no_options'
                        except Exception as e:
                            diagnostic['blocking_reasons'].append(f'Error finding options: {str(e)}')
                            diagnostic['status'] = 'error'
            except Exception as e:
                diagnostic['blocking_reasons'].append(f'Error generating signals: {str(e)}')
                diagnostic['status'] = 'error'
            
            # Determine overall status
            if diagnostic['status'] == 'unknown':
                if diagnostic['ready_to_trade']:
                    diagnostic['status'] = 'ready'
                elif diagnostic['blocking_reasons']:
                    diagnostic['status'] = 'blocked'
                else:
                    diagnostic['status'] = 'checking'
            
            diagnostics.append(diagnostic)
        
        return jsonify({
            'diagnostics': diagnostics,
            'total_automations': len(automations),
            'ready_count': sum(1 for d in diagnostics if d['ready_to_trade']),
            'blocked_count': sum(1 for d in diagnostics if d['status'] == 'blocked')
        }), 200
        
    except Exception as e:
        import traceback
        current_app.logger.error(f"Error getting diagnostics: {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

