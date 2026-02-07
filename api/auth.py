from flask import Blueprint, request, jsonify, current_app
from models.user import User
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from utils.decorators import token_required
from utils.db_helpers import with_db_retry, get_db_with_retry
from services.cache_manager import get_cache, set_cache, delete_cache
from sqlalchemy.exc import OperationalError, DisconnectionError
from datetime import datetime
import logging
import time
import os

auth_logger = logging.getLogger(__name__)
auth_bp = Blueprint('auth', __name__)


def _rate_limit(limit_string):
    """Apply rate limiting if limiter is available, otherwise no-op."""
    def decorator(f):
        try:
            limiter = current_app.limiter
            if limiter:
                return limiter.limit(limit_string)(f)
        except (RuntimeError, AttributeError):
            pass
        return f
    return decorator


def _audit_auth_event(action_type, description, user_id=None, success=True, details=None):
    """Log an authentication event to the audit trail."""
    try:
        from utils.audit_logger import log_audit
        log_audit(
            action_type=action_type,
            action_category='auth',
            description=description,
            user_id=user_id,
            details=details or {},
            success=success,
        )
    except Exception:
        pass  # Don't let audit logging break auth

def get_db():
    """Get database instance from current app with retry logic"""
    return get_db_with_retry()

@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    """User registration. Requires beta code when BETA_REGISTRATION_REQUIRED=true.
    Rate limited: 3 per hour per IP."""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.status_code = 200
        return response
    
    # Manual rate limiting for registration
    try:
        limiter = current_app.limiter
        if limiter:
            from flask_limiter import RateLimitExceeded
    except (RuntimeError, AttributeError):
        pass

    data = request.get_json()

    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        from utils.helpers import sanitize_input, sanitize_email
        from models.beta_code import BetaCode, BetaCodeUsage

        username = sanitize_input(data.get('username'), max_length=80)
        email = sanitize_email(data.get('email'))
        password = data.get('password', '')
        beta_code_str = (data.get('beta_code') or '').strip().upper()

        if not username or len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        if not email:
            return jsonify({'error': 'Invalid email address'}), 400
        if not password or len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        db = get_db()

        # Beta code required when BETA_REGISTRATION_REQUIRED is true
        beta_required = os.environ.get('BETA_REGISTRATION_REQUIRED', 'true').lower() == 'true'
        code = None
        if beta_required:
            if not beta_code_str:
                return jsonify({'error': 'Beta code required for registration'}), 400
            code = db.session.query(BetaCode).filter_by(code=beta_code_str).first()
            if not code:
                return jsonify({'error': 'Invalid beta code'}), 400
            if not code.is_valid():
                if code.max_uses > 0 and code.current_uses >= code.max_uses:
                    return jsonify({'error': 'Beta code has reached maximum uses'}), 400
                if code.valid_until and datetime.utcnow() > code.valid_until:
                    return jsonify({'error': 'Beta code has expired'}), 400
                return jsonify({'error': 'Beta code is not active'}), 400
        elif beta_code_str:
            code = db.session.query(BetaCode).filter_by(code=beta_code_str).first()
            if code and not code.is_valid():
                return jsonify({'error': 'Beta code is invalid or expired'}), 400

        if db.session.query(User).filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        if db.session.query(User).filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400

        user = User(
            username=username,
            email=email,
            default_strategy=sanitize_input(data.get('default_strategy', 'balanced'), max_length=20),
            risk_tolerance=sanitize_input(data.get('risk_tolerance', 'moderate'), max_length=20),
            beta_code_used=beta_code_str if beta_code_str else None
        )
        user.set_password(password)

        db.session.add(user)
        db.session.flush()  # get user.id

        if code and beta_code_str:
            code.current_uses += 1
            usage = BetaCodeUsage(beta_code_id=code.id, user_id=user.id)
            db.session.add(usage)

        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        _audit_auth_event(
            'user_registered', f'New user registered: {username}',
            user_id=user.id, success=True,
            details={'email': email, 'ip': request.remote_addr}
        )
        auth_logger.info(f"New user registered: {username} ({email})")

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
        except Exception:
            pass
        auth_logger.warning(f"Registration failed: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    """User login with database retry logic - supports both username and email.
    Rate limited: 5 per 15 minutes per IP."""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.status_code = 200
        return response
    
    # Rate limiting for login - 5 attempts per 15 minutes per IP
    try:
        ip = request.remote_addr or 'unknown'
        rate_key = f'login_attempts:{ip}'
        attempts = get_cache(rate_key)
        if attempts and int(attempts) >= 5:
            auth_logger.warning(f"Rate limit exceeded for IP {ip}")
            _audit_auth_event(
                'login_rate_limited', f'Login rate limit exceeded for IP {ip}',
                details={'ip': ip}
            )
            return jsonify({
                'error': 'Too many login attempts. Please try again in 15 minutes.'
            }), 429
        # Increment attempts
        new_count = (int(attempts) + 1) if attempts else 1
        set_cache(rate_key, new_count, timeout=900)  # 15 minutes
    except Exception:
        pass  # Don't let rate limiting break login
    
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
                _audit_auth_event(
                    'login_failed', f'Failed login for: {identifier}',
                    success=False,
                    details={'identifier': identifier, 'ip': request.remote_addr}
                )
                auth_logger.warning(f"Failed login attempt for: {identifier} from {request.remote_addr}")
                return jsonify({'error': 'Invalid credentials'}), 401
            
            # Successful login - clear rate limit counter
            try:
                ip = request.remote_addr or 'unknown'
                delete_cache(f'login_attempts:{ip}')
            except Exception:
                pass
            
            # Generate tokens - identity must be a string
            access_token = create_access_token(identity=str(user.id))
            refresh_token = create_refresh_token(identity=str(user.id))
            
            _audit_auth_event(
                'login_success', f'User logged in: {user.username}',
                user_id=user.id, success=True,
                details={'ip': request.remote_addr}
            )
            
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
    # CACHE CHECK - 60 second TTL
    cache_key = f'user:{current_user.id}'
    cached_data = get_cache(cache_key)
    if cached_data:
        return jsonify(cached_data), 200
    
    result = {'user': current_user.to_dict()}
    
    # CACHE SET - 60 seconds
    set_cache(cache_key, result, timeout=60)
    
    return jsonify(result), 200

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
        
        # Handle timezone update - validate it's a valid IANA timezone
        if 'timezone' in data:
            import pytz
            timezone_value = data['timezone']
            # Validate timezone is a valid IANA timezone
            if timezone_value in pytz.all_timezones:
                current_user.timezone = timezone_value
            else:
                # If invalid, default to America/New_York
                current_user.timezone = 'America/New_York'
        
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

