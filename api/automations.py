from flask import Blueprint, request, jsonify, current_app
from models.automation import Automation
from utils.decorators import token_required
from utils.helpers import validate_symbol
from datetime import datetime

automations_bp = Blueprint('automations', __name__)

def get_db():
    """Get db instance from current app context"""
    return current_app.extensions['sqlalchemy']

@automations_bp.route('', methods=['GET'])
@token_required
def get_automations(current_user):
    """Get all automations for user"""
    try:
        db = get_db()
        automations = db.session.query(Automation).filter_by(user_id=current_user.id).all()
        return jsonify({
            'automations': [a.to_dict() for a in automations],
            'count': len(automations)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@automations_bp.route('/create', methods=['POST'])
@token_required
def create_automation(current_user):
    """Create a new automation"""
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('symbol'):
        return jsonify({'error': 'Name and symbol required'}), 400
    
    try:
        # Import sanitization functions
        from utils.helpers import sanitize_input, sanitize_symbol, sanitize_float, sanitize_int
        
        # Sanitize all inputs
        name = sanitize_input(data.get('name'), max_length=100)
        description = sanitize_input(data.get('description', ''), max_length=1000) if data.get('description') else None
        symbol = sanitize_symbol(data.get('symbol', ''))
        
        # Validate required fields
        if not name or len(name) < 1:
            return jsonify({'error': 'Name is required'}), 400
        
        if not symbol:
            return jsonify({'error': 'Invalid symbol'}), 400
        
        # Sanitize numeric inputs
        min_confidence = sanitize_float(data.get('min_confidence'), min_val=0.0, max_val=1.0) or 0.70
        profit_target_percent = sanitize_float(data.get('profit_target_percent'), min_val=0.0, max_val=1000.0) or 50.0
        stop_loss_percent = sanitize_float(data.get('stop_loss_percent'), min_val=0.0, max_val=100.0) or 15.0
        max_days_to_hold = sanitize_int(data.get('max_days_to_hold'), min_val=1, max_val=365) or None
        preferred_dte = sanitize_int(data.get('preferred_dte'), min_val=1, max_val=365) or 30
        min_dte = sanitize_int(data.get('min_dte'), min_val=0, max_val=365) or 21
        max_dte = sanitize_int(data.get('max_dte'), min_val=1, max_val=1095) or 60
        target_delta = sanitize_float(data.get('target_delta'), min_val=-1.0, max_val=1.0) if data.get('target_delta') else None
        min_delta = sanitize_float(data.get('min_delta'), min_val=-1.0, max_val=1.0) if data.get('min_delta') else None
        max_delta = sanitize_float(data.get('max_delta'), min_val=-1.0, max_val=1.0) if data.get('max_delta') else None
        min_volume = sanitize_int(data.get('min_volume'), min_val=0, max_val=1000000) or 5  # Lowered from 20
        min_open_interest = sanitize_int(data.get('min_open_interest'), min_val=0, max_val=10000000) or 10  # Lowered from 100
        max_spread_percent = sanitize_float(data.get('max_spread_percent'), min_val=0.0, max_val=100.0) or 30.0  # Increased from 15
        quantity = sanitize_int(data.get('quantity'), min_val=1, max_val=100) or 1
        
        # Validate contract_types
        contract_types = data.get('contract_types', 'both')
        if contract_types not in ['call', 'put', 'both']:
            contract_types = 'both'
        
        db = get_db()
        automation = Automation(
            user_id=current_user.id,
            name=name,
            description=description,
            symbol=symbol,
            strategy_type=sanitize_input(data.get('strategy_type', 'covered_call'), max_length=50),
            contract_types=contract_types,
            target_delta=target_delta,
            min_delta=min_delta,
            max_delta=max_delta,
            preferred_dte=preferred_dte,
            min_dte=min_dte,
            max_dte=max_dte,
            entry_condition=sanitize_input(data.get('entry_condition'), max_length=50) if data.get('entry_condition') else None,
            entry_value=sanitize_float(data.get('entry_value')) if data.get('entry_value') else None,
            min_confidence=min_confidence,
            min_volume=min_volume,
            min_open_interest=min_open_interest,
            max_spread_percent=max_spread_percent,
            quantity=quantity,
            profit_target_percent=profit_target_percent,
            profit_target_1=profit_target_percent,  # Set profit_target_1 from profit_target_percent
            stop_loss_percent=-abs(stop_loss_percent),  # Normalize to negative
            max_days_to_hold=max_days_to_hold,
            exit_at_profit_target=data.get('exit_at_profit_target', True),
            exit_at_stop_loss=data.get('exit_at_stop_loss', True),
            exit_at_max_days=data.get('exit_at_max_days', True),
            is_active=data.get('is_active', True),
            is_paused=data.get('is_paused', False)
        )
        
        db.session.add(automation)
        db.session.commit()
        
        return jsonify({
            'message': 'Automation created',
            'automation': automation.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@automations_bp.route('/<int:automation_id>', methods=['PUT'])
@token_required
def update_automation(current_user, automation_id):
    """Update an automation"""
    db = get_db()
    automation = db.session.query(Automation).filter_by(id=automation_id, user_id=current_user.id).first()
    if not automation:
        return jsonify({'error': 'Automation not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Update fields
        if 'name' in data:
            automation.name = data['name']
        if 'description' in data:
            automation.description = data['description']
        if 'is_active' in data:
            automation.is_active = data['is_active']
        if 'is_paused' in data:
            automation.is_paused = data['is_paused']
        if 'min_confidence' in data:
            automation.min_confidence = data['min_confidence']
        if 'profit_target_percent' in data:
            automation.profit_target_percent = data['profit_target_percent']
            automation.profit_target_1 = data['profit_target_percent']  # Also update profit_target_1
        if 'stop_loss_percent' in data:
            # Normalize stop_loss_percent to always be negative
            automation.stop_loss_percent = -abs(data['stop_loss_percent'])
        if 'quantity' in data:
            from utils.helpers import sanitize_int
            automation.quantity = sanitize_int(data['quantity'], min_val=1, max_val=100) or 1
        if 'max_days_to_hold' in data:
            from utils.helpers import sanitize_int
            automation.max_days_to_hold = sanitize_int(data['max_days_to_hold'], min_val=1, max_val=365)
        if 'contract_types' in data:
            contract_types = data['contract_types']
            if contract_types in ['call', 'put', 'both']:
                automation.contract_types = contract_types
        
        db.session.commit()
        
        return jsonify({
            'message': 'Automation updated',
            'automation': automation.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@automations_bp.route('/<int:automation_id>/toggle', methods=['PUT'])
@token_required
def toggle_automation(current_user, automation_id):
    """Toggle automation active/paused status"""
    db = get_db()
    automation = db.session.query(Automation).filter_by(id=automation_id, user_id=current_user.id).first()
    if not automation:
        return jsonify({'error': 'Automation not found'}), 404
    
    data = request.get_json() or {}
    action = data.get('action', 'toggle')
    
    try:
        if action == 'pause':
            automation.is_paused = True
        elif action == 'resume':
            automation.is_paused = False
        elif action == 'activate':
            automation.is_active = True
            automation.is_paused = False
        elif action == 'deactivate':
            automation.is_active = False
        else:  # toggle
            if automation.is_paused:
                automation.is_paused = False
            else:
                automation.is_paused = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Automation status updated',
            'automation': automation.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@automations_bp.route('/<int:automation_id>', methods=['DELETE'])
@token_required
def delete_automation(current_user, automation_id):
    """Delete an automation"""
    db = get_db()
    automation = db.session.query(Automation).filter_by(id=automation_id, user_id=current_user.id).first()
    if not automation:
        return jsonify({'error': 'Automation not found'}), 404
    
    try:
        db.session.delete(automation)
        db.session.commit()
        
        return jsonify({'message': 'Automation deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

