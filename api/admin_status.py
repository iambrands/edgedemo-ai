"""Simple admin status endpoints - no authentication required for debugging"""

from flask import Blueprint, jsonify, current_app
from datetime import datetime
import logging
import sys
import os

logger = logging.getLogger(__name__)

admin_status_bp = Blueprint('admin_status', __name__)

@admin_status_bp.route('/admin/status', methods=['GET'])
def admin_status():
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

