from flask import Blueprint, request, jsonify, current_app
from models.user import User
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from utils.decorators import token_required
from utils.db_helpers import with_db_retry, get_db_with_retry
from sqlalchemy.exc import OperationalError, DisconnectionError
from datetime import datetime
import time

auth_bp = Blueprint('auth', __name__)

def get_db():
    """Get database instance from current app with retry logic"""
    return get_db_with_retry()

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    """User registration"""
    if request.method == 'OPTIONS':
        # Flask-CORS will handle this, just return empty response
        response = jsonify({})
        response.status_code = 200
        return response
    
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Import sanitization functions
        from utils.helpers import sanitize_input, sanitize_email
        
        # Sanitize all inputs
        username = sanitize_input(data.get('username'), max_length=80)
        email = sanitize_email(data.get('email'))
        password = data.get('password', '')
        
        # Validate inputs
        if not username or len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if not email:
            return jsonify({'error': 'Invalid email address'}), 400
        
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Get db from current_app extensions
        db = get_db()
        
        # Use db.session.query() instead of User.query to avoid app context issues
        if db.session.query(User).filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if db.session.query(User).filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user with sanitized inputs
        user = User(
            username=username,
            email=email,
            default_strategy=sanitize_input(data.get('default_strategy', 'balanced'), max_length=20),
            risk_tolerance=sanitize_input(data.get('risk_tolerance', 'moderate'), max_length=20)
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Generate tokens - identity must be a string
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        response = jsonify({
            'message': 'User created successfully',
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        })
        response.status_code = 201
        return response
    except Exception as e:
        try:
            db = get_db()
            db.session.rollback()
        except:
            pass
        error_msg = str(e)
        return jsonify({'error': f'Registration failed: {error_msg}'}), 500

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """User login with database retry logic - supports both username and email"""
    if request.method == 'OPTIONS':
        # Flask-CORS will handle this, just return empty response
        response = jsonify({})
        response.status_code = 200
        return response
    
    data = request.get_json()
    
    # Accept either 'username' or 'email' field
    identifier = data.get('username') or data.get('email')
    
    if not data or not identifier or not data.get('password'):
        return jsonify({'error': 'Username/email and password required'}), 400
    
    # Retry logic for database connection
    max_retries = 3
    retry_delay = 1
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            db = get_db()
            # Try username first, then email
            user = db.session.query(User).filter_by(username=identifier).first()
            if not user:
                user = db.session.query(User).filter_by(email=identifier).first()
            
            if not user or not user.check_password(data['password']):
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Generate tokens - identity must be a string
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            response = jsonify({
                'message': 'Login successful',
                'user': user.to_dict(),
                'access_token': access_token,
                'refresh_token': refresh_token
            })
            response.status_code = 200
            return response
            
        except (OperationalError, DisconnectionError) as e:
            last_exception = e
            if attempt < max_retries - 1:
                current_app.logger.warning(
                    f"Database connection error during login (attempt {attempt + 1}/{max_retries}): {str(e)[:200]}. "
                    f"Retrying in {retry_delay} seconds..."
                )
                time.sleep(retry_delay)
                # Try to dispose connection pool to force reconnection
                try:
                    db = current_app.extensions.get('sqlalchemy')
                    if db and hasattr(db, 'engine'):
                        db.engine.dispose()
                except Exception:
                    pass
            else:
                current_app.logger.error(f"Database connection failed after {max_retries} attempts: {str(e)[:200]}")
                return jsonify({
                    'error': 'Database connection failed. Please try again in a moment.',
                    'details': str(e)[:200]
                }), 503
        except Exception as e:
            # For non-connection errors, don't retry
            current_app.logger.error(f"Login error: {str(e)}")
            return jsonify({'error': f'Login failed: {str(e)}'}), 500
    
    # Should never reach here, but just in case
    if last_exception:
        return jsonify({
            'error': 'Database connection failed. Please try again in a moment.',
            'details': str(last_exception)[:200]
        }), 503
    return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/user', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user information"""
    return jsonify({'user': current_user.to_dict()}), 200

@auth_bp.route('/user', methods=['PUT'])
@token_required
def update_user(current_user):
    """Update user preferences including risk tolerance"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        db = get_db()
        
        # Update allowed fields
        if 'default_strategy' in data:
            if data['default_strategy'] in ['income', 'growth', 'balanced']:
                current_user.default_strategy = data['default_strategy']
        
        if 'risk_tolerance' in data:
            if data['risk_tolerance'] in ['low', 'moderate', 'high']:
                old_risk_tolerance = current_user.risk_tolerance
                current_user.risk_tolerance = data['risk_tolerance']
                
                # If risk tolerance changed, update risk limits to new defaults
                if old_risk_tolerance != data['risk_tolerance']:
                    from services.risk_manager import RiskManager
                    risk_manager = RiskManager()
                    risk_limits = risk_manager.get_risk_limits(current_user.id)
                    
                    # Get new defaults based on updated risk tolerance
                    defaults = risk_manager._get_default_risk_limits(current_user)
                    
                    # Update risk limits to match new risk tolerance
                    for key, value in defaults.items():
                        setattr(risk_limits, key, value)
        
        # Allow paper balance reset for paper trading mode
        if 'paper_balance' in data and current_user.trading_mode == 'paper':
            current_user.paper_balance = float(data['paper_balance'])
        
        if 'notification_enabled' in data:
            current_user.notification_enabled = bool(data['notification_enabled'])
        
        if 'trading_mode' in data:
            if data['trading_mode'] in ['paper', 'live']:
                current_user.trading_mode = data['trading_mode']
        
        db.session.commit()
        
        return jsonify({
            'message': 'User preferences updated',
            'user': current_user.to_dict()
        }), 200
    except Exception as e:
        db = get_db()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST', 'OPTIONS'])
def refresh():
    """Refresh access token"""
    if request.method == 'OPTIONS':
        # Flask-CORS will handle this, just return empty response
        response = jsonify({})
        response.status_code = 200
        return response
    
    try:
        # Verify refresh token
        from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
        verify_jwt_in_request(refresh=True)
        current_user_id = get_jwt_identity()
        new_token = create_access_token(identity=str(current_user_id))
        return jsonify({'access_token': new_token}), 200
    except Exception as e:
        return jsonify({'error': f'Token refresh failed: {str(e)}'}), 401

