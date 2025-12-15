from flask import Blueprint, jsonify, current_app
import os
import traceback

debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/debug/db')
def debug_database():
    """Debug endpoint to check database configuration and connection"""
    info = {
        'database_url_set': bool(os.environ.get('DATABASE_URL')),
        'database_url_preview': os.environ.get('DATABASE_URL', '')[:50] + '...' if os.environ.get('DATABASE_URL') else 'not set',
        'sqlalchemy_uri_set': bool(current_app.config.get('SQLALCHEMY_DATABASE_URI')),
        'engine_options': current_app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {}),
        'connection_test': 'not_tested'
    }
    
    # Try to test connection
    try:
        db = current_app.extensions.get('sqlalchemy')
        if db:
            # Test connection
            conn = db.engine.connect()
            result = conn.execute(db.text('SELECT version()'))
            version = result.scalar()
            conn.close()
            info['connection_test'] = 'success'
            info['postgres_version'] = version[:50]
        else:
            info['connection_test'] = 'db_not_initialized'
    except Exception as e:
        info['connection_test'] = f'failed: {str(e)[:200]}'
        info['traceback'] = traceback.format_exc()[:500]
    
    return jsonify(info), 200

