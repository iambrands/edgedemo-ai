"""Database helper utilities with retry logic for connection issues"""
from functools import wraps
from sqlalchemy.exc import OperationalError, DisconnectionError
import time
import logging

logger = logging.getLogger(__name__)

def with_db_retry(max_retries=3, retry_delay=1):
    """Decorator to retry database operations on connection errors"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (OperationalError, DisconnectionError) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        error_msg = str(e)
                        logger.warning(
                            f"Database connection error (attempt {attempt + 1}/{max_retries}): {error_msg[:200]}. "
                            f"Retrying in {retry_delay} seconds..."
                        )
                        time.sleep(retry_delay)
                        # Try to invalidate the connection pool
                        try:
                            from flask import current_app
                            db = current_app.extensions.get('sqlalchemy')
                            if db and hasattr(db, 'engine'):
                                # Dispose of the connection pool to force reconnection
                                db.engine.dispose()
                        except Exception:
                            pass
                    else:
                        logger.error(f"Database connection failed after {max_retries} attempts: {error_msg[:200]}")
                except Exception as e:
                    # For non-connection errors, don't retry
                    raise
            
            # If we get here, all retries failed
            raise last_exception
        return wrapper
    return decorator

def get_db_with_retry():
    """Get database instance with retry logic"""
    from flask import current_app
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            db = current_app.extensions['sqlalchemy']
            # Test connection by creating a session
            db.session.execute(db.text('SELECT 1'))
            return db
        except (OperationalError, DisconnectionError) as e:
            if attempt < max_retries - 1:
                logger.warning(
                    f"Database connection test failed (attempt {attempt + 1}/{max_retries}): {str(e)[:200]}. "
                    f"Retrying in {retry_delay} seconds..."
                )
                time.sleep(retry_delay)
                # Dispose connection pool
                try:
                    db = current_app.extensions.get('sqlalchemy')
                    if db and hasattr(db, 'engine'):
                        db.engine.dispose()
                except Exception:
                    pass
            else:
                logger.error(f"Database connection test failed after {max_retries} attempts")
                raise
        except Exception as e:
            # For other errors, just return the db instance
            return current_app.extensions['sqlalchemy']
    
    return current_app.extensions['sqlalchemy']

