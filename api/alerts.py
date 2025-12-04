from flask import Blueprint, request, jsonify
from models.alert import Alert
from models.alert_filters import AlertFilters
from services.alert_generator import AlertGenerator
from utils.decorators import token_required
from datetime import datetime

alerts_bp = Blueprint('alerts', __name__)

def get_alert_generator():
    return AlertGenerator()

def get_db():
    from flask import current_app
    return current_app.extensions['sqlalchemy']

@alerts_bp.route('', methods=['GET'])
@token_required
def get_alerts(current_user):
    """Get user's alerts"""
    db = get_db()
    
    # Filter parameters
    status = request.args.get('status', 'active')  # active, acknowledged, dismissed, all
    alert_type = request.args.get('type')  # buy_signal, sell_signal, risk_alert
    priority = request.args.get('priority')  # low, medium, high, critical
    
    query = db.session.query(Alert).filter_by(user_id=current_user.id)
    
    if status != 'all':
        query = query.filter_by(status=status)
    if alert_type:
        query = query.filter_by(alert_type=alert_type)
    if priority:
        query = query.filter_by(priority=priority)
    
    # Filter expired alerts
    query = query.filter(
        (Alert.expires_at.is_(None)) | (Alert.expires_at > datetime.utcnow())
    )
    
    alerts = query.order_by(Alert.created_at.desc()).limit(100).all()
    
    return jsonify({
        'alerts': [a.to_dict() for a in alerts],
        'count': len(alerts)
    }), 200

@alerts_bp.route('/<int:alert_id>/acknowledge', methods=['PUT'])
@token_required
def acknowledge_alert(current_user, alert_id):
    """Acknowledge an alert"""
    db = get_db()
    alert = db.session.query(Alert).filter_by(id=alert_id, user_id=current_user.id).first()
    
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    
    alert.status = 'acknowledged'
    alert.acknowledged_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Alert acknowledged',
        'alert': alert.to_dict()
    }), 200

@alerts_bp.route('/<int:alert_id>/dismiss', methods=['PUT'])
@token_required
def dismiss_alert(current_user, alert_id):
    """Dismiss an alert"""
    db = get_db()
    alert = db.session.query(Alert).filter_by(id=alert_id, user_id=current_user.id).first()
    
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    
    alert.status = 'dismissed'
    alert.dismissed_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Alert dismissed',
        'alert': alert.to_dict()
    }), 200

@alerts_bp.route('/generate', methods=['POST'])
@token_required
def generate_alerts(current_user):
    """Manually trigger alert generation"""
    try:
        alert_generator = get_alert_generator()
        results = alert_generator.scan_and_generate_alerts(current_user.id)
        
        return jsonify({
            'message': 'Alerts generated',
            'results': results
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alerts_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count(current_user):
    """Get count of unread alerts"""
    db = get_db()
    count = db.session.query(Alert).filter_by(
        user_id=current_user.id,
        status='active'
    ).filter(
        (Alert.expires_at.is_(None)) | (Alert.expires_at > datetime.utcnow())
    ).count()
    
    return jsonify({'count': count}), 200

@alerts_bp.route('/filters', methods=['GET'])
@token_required
def get_alert_filters(current_user):
    """Get user's alert filter preferences"""
    db = get_db()
    filters = db.session.query(AlertFilters).filter_by(user_id=current_user.id).first()
    
    if not filters:
        # Return defaults if no filters exist
        defaults = AlertFilters.get_defaults()
        return jsonify({
            'filters': defaults,
            'is_default': True
        }), 200
    
    return jsonify({
        'filters': filters.to_dict(),
        'is_default': False
    }), 200

@alerts_bp.route('/filters', methods=['PUT'])
@token_required
def update_alert_filters(current_user):
    """Update user's alert filter preferences"""
    db = get_db()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    filters = db.session.query(AlertFilters).filter_by(user_id=current_user.id).first()
    
    if not filters:
        # Create new filters
        filters = AlertFilters(user_id=current_user.id)
        db.session.add(filters)
    
    # Update filter fields
    for key, value in data.items():
        if hasattr(filters, key):
            setattr(filters, key, value)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Alert filters updated',
        'filters': filters.to_dict()
    }), 200

@alerts_bp.route('/filters/reset', methods=['POST'])
@token_required
def reset_alert_filters(current_user):
    """Reset alert filters to defaults"""
    db = get_db()
    filters = db.session.query(AlertFilters).filter_by(user_id=current_user.id).first()
    
    defaults = AlertFilters.get_defaults()
    
    if not filters:
        filters = AlertFilters(user_id=current_user.id, **defaults)
        db.session.add(filters)
    else:
        for key, value in defaults.items():
            setattr(filters, key, value)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Alert filters reset to defaults',
        'filters': filters.to_dict()
    }), 200

