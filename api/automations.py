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
    
    symbol = data['symbol'].upper()
    if not validate_symbol(symbol):
        return jsonify({'error': 'Invalid symbol'}), 400
    
    try:
        db = get_db()
        automation = Automation(
            user_id=current_user.id,
            name=data['name'],
            description=data.get('description'),
            symbol=symbol,
            strategy_type=data.get('strategy_type', 'covered_call'),
            target_delta=data.get('target_delta'),
            min_delta=data.get('min_delta'),
            max_delta=data.get('max_delta'),
            preferred_dte=data.get('preferred_dte', 30),
            min_dte=data.get('min_dte', 21),
            max_dte=data.get('max_dte', 60),
            entry_condition=data.get('entry_condition'),
            entry_value=data.get('entry_value'),
            min_confidence=data.get('min_confidence', 0.70),
            min_volume=data.get('min_volume', 20),
            min_open_interest=data.get('min_open_interest', 100),
            max_spread_percent=data.get('max_spread_percent', 15.0),
            profit_target_percent=data.get('profit_target_percent', 50.0),
            stop_loss_percent=data.get('stop_loss_percent'),
            max_days_to_hold=data.get('max_days_to_hold'),
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
        if 'stop_loss_percent' in data:
            automation.stop_loss_percent = data['stop_loss_percent']
        
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

