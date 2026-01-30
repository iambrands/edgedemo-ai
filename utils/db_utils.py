"""
Database transaction utilities. Ensures rollback on error to prevent
InFailedSqlTransaction and poisoned connection pool under load.
"""
from functools import wraps
import logging

logger = logging.getLogger(__name__)


def with_db_rollback(f):
    """
    Decorator that ensures database transactions are rolled back on error.
    Use on any function that performs database operations.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            try:
                from flask import current_app
                db = current_app.extensions.get('sqlalchemy')
                if db:
                    db.session.rollback()
            except Exception:
                pass
            logger.error("Database error in %s: %s", f.__name__, e)
            raise
    return decorated_function


def safe_db_operation(operation, *args, **kwargs):
    """
    Execute a database operation with automatic rollback on failure.

    Usage:
        result = safe_db_operation(lambda: User.query.filter_by(id=1).first())
    """
    try:
        return operation(*args, **kwargs)
    except Exception as e:
        logger.error("Database operation failed: %s", e)
        try:
            from flask import current_app
            db = current_app.extensions.get('sqlalchemy')
            if db:
                db.session.rollback()
        except Exception:
            pass
        raise
