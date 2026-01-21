from functools import wraps
from flask import jsonify, current_app, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import logging

logger = logging.getLogger(__name__)

def token_required(f):
    """Decorator to require JWT token authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return jsonify({}), 200
        
        # Check if auth is disabled (development mode)
        if current_app.config.get('DISABLE_AUTH', False):
            # Get first user or create a dummy user for testing
            from models.user import User
            db = current_app.extensions['sqlalchemy']
            user = db.session.query(User).first()
            if not user:
                # Create a default test user
                user = User(
                    username='testuser',
                    email='test@example.com',
                    default_strategy='balanced',
                    risk_tolerance='moderate'
                )
                user.set_password('testpass')
                db.session.add(user)
                db.session.commit()
            return f(user, *args, **kwargs)
        
        try:
            # Check if Authorization header is present
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                logger.warning(f"❌ Missing Authorization header for {request.method} {request.path}")
                return jsonify({'error': 'Missing Authorization Header'}), 401
            
            # Log token presence (but not the token itself)
            has_bearer = auth_header.startswith('Bearer ')
            logger.debug(f"🔐 Authorization header present: {has_bearer}, length: {len(auth_header)}")
            
            # Verify JWT token - disable CSRF check for API requests
            verify_jwt_in_request(locations=['headers'])
            current_user_id = get_jwt_identity()
            logger.debug(f"✅ Token verified, user_id: {current_user_id}")
            # Convert to int if it's a string (JWT identity is string)
            user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
            # Import here to avoid circular imports
            from models.user import User
            # Get db from current_app extensions
            db = current_app.extensions['sqlalchemy']
            # Use db.session.query() to avoid app context issues
            user = db.session.query(User).get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            return f(user, *args, **kwargs)
        except Exception as e:
            import traceback
            # Log the actual error for debugging
            error_type = type(e).__name__
            error_msg = str(e)
            
            # Clean up error message - remove variable names that might leak
            if error_msg and len(error_msg) < 5 and error_msg.isalpha():
                # If error message is just a short word like "db", it's likely a variable name leak
                error_msg = f"{error_type}: {error_msg}"
            
            try:
                current_app.logger.error(f"Token validation error ({error_type}): {error_msg}\n{traceback.format_exc()}")
            except:
                pass
            
            # Provide more specific error message
            if 'expired' in error_msg.lower() or 'expired' in error_type.lower():
                return jsonify({'error': 'Token expired. Please log in again.'}), 401
            elif 'invalid' in error_msg.lower() or 'malformed' in error_msg.lower() or 'invalid' in error_type.lower():
                return jsonify({'error': 'Invalid token. Please log in again.'}), 401
            elif 'name' in error_msg.lower() and 'not defined' in error_msg.lower():
                # NameError - don't expose variable names
                return jsonify({'error': 'Authentication error. Please log in again.'}), 401
            else:
                # Generic error - don't expose internal details
                return jsonify({'error': 'Authentication failed. Please log in again.'}), 401
    return decorated

