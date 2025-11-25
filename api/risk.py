from flask import Blueprint, request, jsonify, current_app
from services.risk_manager import RiskManager
from utils.decorators import token_required

risk_bp = Blueprint('risk', __name__)

def get_risk_manager():
    return RiskManager()

def get_db():
    """Get db instance from current app context"""
    return current_app.extensions['sqlalchemy']

@risk_bp.route('/limits', methods=['GET'])
@token_required
def get_risk_limits(current_user):
    """Get user's risk limits"""
    try:
        risk_manager = get_risk_manager()
        risk_limits = risk_manager.get_risk_limits(current_user.id)
        return jsonify(risk_limits.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@risk_bp.route('/limits', methods=['PUT'])
@token_required
def update_risk_limits(current_user):
    """Update user's risk limits"""
    from models.risk_limits import RiskLimits
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        db = get_db()
        risk_manager = get_risk_manager()
        risk_limits = risk_manager.get_risk_limits(current_user.id)
        
        # Update fields
        if 'max_position_size_percent' in data:
            risk_limits.max_position_size_percent = data['max_position_size_percent']
        if 'max_position_size_dollars' in data:
            risk_limits.max_position_size_dollars = data['max_position_size_dollars']
        if 'max_portfolio_delta' in data:
            risk_limits.max_portfolio_delta = data['max_portfolio_delta']
        if 'max_portfolio_theta' in data:
            risk_limits.max_portfolio_theta = data['max_portfolio_theta']
        if 'max_portfolio_vega' in data:
            risk_limits.max_portfolio_vega = data['max_portfolio_vega']
        if 'max_capital_at_risk_percent' in data:
            risk_limits.max_capital_at_risk_percent = data['max_capital_at_risk_percent']
        if 'max_open_positions' in data:
            risk_limits.max_open_positions = data['max_open_positions']
        if 'max_positions_per_symbol' in data:
            risk_limits.max_positions_per_symbol = data['max_positions_per_symbol']
        if 'max_daily_loss_percent' in data:
            risk_limits.max_daily_loss_percent = data['max_daily_loss_percent']
        if 'max_weekly_loss_percent' in data:
            risk_limits.max_weekly_loss_percent = data['max_weekly_loss_percent']
        if 'max_monthly_loss_percent' in data:
            risk_limits.max_monthly_loss_percent = data['max_monthly_loss_percent']
        if 'max_daily_loss_dollars' in data:
            risk_limits.max_daily_loss_dollars = data['max_daily_loss_dollars']
        if 'min_dte' in data:
            risk_limits.min_dte = data['min_dte']
        if 'max_dte' in data:
            risk_limits.max_dte = data['max_dte']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Risk limits updated',
            'risk_limits': risk_limits.to_dict()
        }), 200
    except Exception as e:
        db = get_db()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@risk_bp.route('/portfolio', methods=['GET'])
@token_required
def get_portfolio_risk(current_user):
    """Get current portfolio risk metrics"""
    try:
        risk_manager = get_risk_manager()
        portfolio_risk = risk_manager.check_portfolio_limits(current_user.id)
        
        # Add daily loss info
        daily_loss = risk_manager._calculate_daily_loss(current_user.id)
        risk_limits = risk_manager.get_risk_limits(current_user.id)
        from models.user import User
        db = get_db()
        user = db.session.query(User).get(current_user.id)
        
        if user.trading_mode == 'paper':
            starting_balance = 100000.0
            account_balance = max(starting_balance, user.paper_balance)
        else:
            account_balance = user.paper_balance
        
        max_daily_loss = account_balance * (risk_limits.max_daily_loss_percent / 100.0) if risk_limits.max_daily_loss_percent else None
        
        portfolio_risk['daily_loss'] = daily_loss
        portfolio_risk['max_daily_loss'] = max_daily_loss
        portfolio_risk['daily_loss_percent'] = (abs(daily_loss) / account_balance * 100) if daily_loss < 0 and account_balance > 0 else 0
        
        return jsonify(portfolio_risk), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@risk_bp.route('/validate', methods=['POST'])
@token_required
def validate_trade(current_user):
    """Validate a trade against risk limits"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        risk_manager = get_risk_manager()
        is_valid, error = risk_manager.validate_trade(
            user_id=current_user.id,
            symbol=data.get('symbol'),
            action=data.get('action'),
            quantity=data.get('quantity'),
            price=data.get('price'),
            option_symbol=data.get('option_symbol'),
            strike=data.get('strike'),
            expiration_date=data.get('expiration_date'),
            delta=data.get('delta')
        )
        
        if is_valid:
            return jsonify({'valid': True}), 200
        else:
            return jsonify({'valid': False, 'error': error}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

