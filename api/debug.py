from flask import Blueprint, jsonify, current_app
import os
import traceback

debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/debug/db')
def debug_database():
    """Debug endpoint to check database configuration and connection"""
    info = {
        'database_url_set': bool(os.environ.get('DATABASE_URL')),
        'database_url_preview': os.environ.get('DATABASE_URL', '')[:80] + '...' if os.environ.get('DATABASE_URL') else 'not set',
        'database_url_host': None,
        'database_url_port': None,
        'sqlalchemy_uri_set': bool(current_app.config.get('SQLALCHEMY_DATABASE_URI')),
        'engine_options': current_app.config.get('SQLALCHEMY_ENGINE_OPTIONS', {}),
        'connection_test': 'not_tested'
    }
    
    # Parse DATABASE_URL to show host/port
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(db_url)
            info['database_url_host'] = parsed.hostname
            info['database_url_port'] = parsed.port
        except Exception:
            pass
    
    # Try to test connection
    try:
        db = current_app.extensions.get('sqlalchemy')
        if db:
            # Test connection with retry
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    conn = db.engine.connect()
                    result = conn.execute(db.text('SELECT version()'))
                    version = result.scalar()
                    conn.close()
                    info['connection_test'] = 'success'
                    info['postgres_version'] = version[:50]
                    break
                except Exception as e:
                    if attempt < max_retries - 1:
                        import time
                        time.sleep(1)
                        # Dispose connection pool
                        try:
                            db.engine.dispose()
                        except:
                            pass
                    else:
                        raise
        else:
            info['connection_test'] = 'db_not_initialized'
    except Exception as e:
        error_msg = str(e)
        info['connection_test'] = f'failed: {error_msg[:200]}'
        info['error_type'] = type(e).__name__
        info['traceback'] = traceback.format_exc()[:1000]
    
    return jsonify(info), 200

