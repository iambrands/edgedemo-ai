"""Simple admin status endpoints"""

from flask import Blueprint, jsonify, current_app
from utils.decorators import token_required
from functools import wraps
from datetime import datetime
import logging
import sys
import os

logger = logging.getLogger(__name__)

admin_status_bp = Blueprint('admin_status', __name__)

def admin_required(f):
    """Decorator to require admin access."""
    @wraps(f)
    @token_required
    def decorated_function(current_user, *args, **kwargs):
        if not current_user.is_admin():
            logger.warning(f"Non-admin user {current_user.email} attempted to access admin status endpoint")
            return jsonify({
                'error': 'Admin access required',
                'message': 'You do not have permission to access this resource'
            }), 403
        return f(current_user, *args, **kwargs)
    return decorated_function

@admin_status_bp.route('/admin/status', methods=['GET'])
@admin_required
def admin_status(current_user):
    """Simple admin status endpoint - shows system health"""
    try:
        status = {
            'status': 'operational',
            'timestamp': datetime.utcnow().isoformat(),
            'services': {}
        }
        
        # Check database
        try:
            from sqlalchemy import text
            db = current_app.extensions.get('sqlalchemy')
            if db:
                db.session.execute(text('SELECT 1'))
                status['services']['database'] = {'status': 'connected', 'message': 'Database connection successful'}
            else:
                status['services']['database'] = {'status': 'unknown', 'message': 'Database not initialized'}
        except Exception as e:
            status['services']['database'] = {'status': 'error', 'message': str(e)[:100]}
            status['status'] = 'degraded'
        
        # Check Redis
        try:
            from utils.redis_cache import get_redis_cache
            cache = get_redis_cache()
            if cache.redis_client:
                cache.redis_client.ping()
                status['services']['redis'] = {'status': 'connected', 'message': 'Redis connection successful'}
            else:
                status['services']['redis'] = {'status': 'not_configured', 'message': 'Redis not configured'}
        except Exception as e:
            status['services']['redis'] = {'status': 'error', 'message': str(e)[:100]}
        
        # Check Tradier
        try:
            from services.tradier_connector import TradierConnector
            tradier = TradierConnector()
            if tradier.api_key:
                status['services']['tradier'] = {'status': 'configured', 'message': f'API key present ({len(tradier.api_key)} chars)'}
            else:
                status['services']['tradier'] = {'status': 'not_configured', 'message': 'API key missing'}
        except Exception as e:
            status['services']['tradier'] = {'status': 'error', 'message': str(e)[:100]}
        
        # Route registration check
        try:
            admin_routes = []
            for rule in current_app.url_map.iter_rules():
                if 'admin' in rule.rule:
                    admin_routes.append(str(rule))
            status['admin_routes_registered'] = len(admin_routes)
            status['admin_routes'] = admin_routes
        except Exception as e:
            status['admin_routes_registered'] = 0
            status['admin_routes_error'] = str(e)[:100]
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"Admin status check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

