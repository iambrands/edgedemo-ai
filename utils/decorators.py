from functools import wraps
from flask import jsonify, current_app, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

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
                return jsonify({'error': 'Missing Authorization Header'}), 401
            
            # Verify JWT token - disable CSRF check for API requests
            verify_jwt_in_request(locations=['headers'])
            current_user_id = get_jwt_identity()
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
            error_msg = str(e)
            try:
                current_app.logger.error(f"Token validation error: {error_msg}\n{traceback.format_exc()}")
            except:
                pass
            # Provide more specific error message
            if 'expired' in error_msg.lower():
                return jsonify({'error': f'Token expired: {error_msg}'}), 401
            elif 'invalid' in error_msg.lower() or 'malformed' in error_msg.lower():
                return jsonify({'error': f'Invalid token: {error_msg}'}), 401
            else:
                return jsonify({'error': f'Invalid or missing token: {error_msg}'}), 401
    return decorated

