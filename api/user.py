"""
User management API endpoints
"""
from flask import Blueprint, jsonify, request, current_app
from utils.decorators import token_required
from models.user import User
from app import db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/has-tradier-credentials', methods=['GET'])
@token_required
def has_tradier_credentials(current_user):
    """Check if user has saved Tradier credentials."""
    try:
        has_credentials = bool(
            current_user.tradier_api_key and 
            current_user.tradier_account_id
        )
        
        return jsonify({
            'has_credentials': has_credentials
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking credentials: {str(e)}")
        return jsonify({'has_credentials': False}), 200


@user_bp.route('/tradier-credentials', methods=['POST'])
@token_required
def save_tradier_credentials(current_user):
    """Save Tradier API credentials (encrypted in production)."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body required'
            }), 400
        
        api_key = data.get('api_key')
        account_id = data.get('account_id')
        environment = data.get('environment', 'sandbox')
        
        if not api_key or not account_id:
            return jsonify({
                'success': False,
                'message': 'API key and account ID are required'
            }), 400
        
        # TODO: Encrypt before storing in production
        # For now, store as-is (should be encrypted in production)
        current_user.tradier_api_key = api_key
        current_user.tradier_account_id = account_id
        current_user.tradier_environment = environment
        
        db.session.commit()
        
        logger.info(f"✅ Saved Tradier credentials for user {current_user.id}")
        
        return jsonify({
            'success': True,
            'message': 'Credentials saved successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error saving credentials: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Failed to save credentials'
        }), 500


@user_bp.route('/tradier-credentials', methods=['GET'])
@token_required
def get_tradier_credentials(current_user):
    """Get Tradier credentials status (without exposing actual keys)."""
    try:
        return jsonify({
            'has_credentials': bool(current_user.tradier_api_key and current_user.tradier_account_id),
            'environment': current_user.tradier_environment or 'sandbox',
            'account_id': current_user.tradier_account_id if current_user.tradier_account_id else None
        }), 200
    except Exception as e:
        logger.error(f"Error getting credentials: {str(e)}")
        return jsonify({
            'has_credentials': False,
            'environment': 'sandbox'
        }), 200


@user_bp.route('/acknowledge-risk', methods=['POST'])
@token_required
def acknowledge_risk(current_user):
    """Record user's risk acknowledgment and terms acceptance."""
    try:
        now = datetime.utcnow()
        current_version = '1.0'

        current_user.risk_acknowledged_at = now
        current_user.risk_acknowledgment_version = current_version
        current_user.terms_accepted_at = now
        current_user.terms_version = current_version
        db.session.commit()

        # Log the acknowledgment for audit
        try:
            from utils.audit_logger import log_audit
            log_audit(
                action_type='risk_acknowledged',
                action_category='compliance',
                description=f'User acknowledged risk disclosures v{current_version}',
                user_id=current_user.id,
                details={
                    'version': current_version,
                    'ip_address': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent', ''),
                },
                success=True,
            )
        except Exception as audit_err:
            logger.warning(f"Failed to write audit log for risk ack: {audit_err}")

        logger.info(f"User {current_user.id} acknowledged risk disclosures v{current_version}")

        return jsonify({
            'success': True,
            'acknowledged_at': now.isoformat(),
            'version': current_version,
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error recording risk acknowledgment: {str(e)}")
        return jsonify({'error': 'Failed to record acknowledgment'}), 500


@user_bp.route('/risk-status', methods=['GET'])
@token_required
def get_risk_status(current_user):
    """Check if user has acknowledged risks and current version status."""
    current_version = '1.0'
    acknowledged = current_user.risk_acknowledged_at is not None
    needs_reacknowledgment = (
        current_user.risk_acknowledgment_version != current_version
        if current_user.risk_acknowledgment_version
        else True
    )

    return jsonify({
        'acknowledged': acknowledged,
        'acknowledged_at': (
            current_user.risk_acknowledged_at.isoformat()
            if current_user.risk_acknowledged_at
            else None
        ),
        'version': current_user.risk_acknowledgment_version,
        'current_version': current_version,
        'needs_reacknowledgment': needs_reacknowledgment,
    }), 200

