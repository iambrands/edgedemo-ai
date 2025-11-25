from flask import Blueprint, request, jsonify, current_app
from models.user import User
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt_identity, jwt_required
from utils.decorators import token_required
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

def get_db():
    """Get database instance from current app"""
    return current_app.extensions['sqlalchemy']

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
        # Get db from current_app extensions
        db = get_db()
        
        # Use db.session.query() instead of User.query to avoid app context issues
        if db.session.query(User).filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if db.session.query(User).filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            default_strategy=data.get('default_strategy', 'balanced'),
            risk_tolerance=data.get('risk_tolerance', 'moderate')
        )
        user.set_password(data['password'])
        
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
    """User login"""
    if request.method == 'OPTIONS':
        # Flask-CORS will handle this, just return empty response
        response = jsonify({})
        response.status_code = 200
        return response
    
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400
    
    try:
        db = get_db()
        user = db.session.query(User).filter_by(username=data['username']).first()
        
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
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

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

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        current_user_id = get_jwt_identity()
        new_token = create_access_token(identity=str(current_user_id))
        return jsonify({'access_token': new_token}), 200
    except Exception as e:
        return jsonify({'error': f'Token refresh failed: {str(e)}'}), 401

