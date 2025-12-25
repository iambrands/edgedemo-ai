from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required

account_bp = Blueprint('account', __name__)

@account_bp.route('/reset', methods=['POST'])
@token_required
def reset_account(current_user):
    """Reset user account - delete all positions, trades, and reset balance"""
    db = current_app.extensions['sqlalchemy']
    
    try:
        from models.trade import Trade
        from models.position import Position
        from models.user import User
        from models.automation import Automation
        
        # Get user
        user = db.session.query(User).get(current_user.id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Count items before deletion
        positions_count = db.session.query(Position).filter_by(user_id=current_user.id).count()
        trades_count = db.session.query(Trade).filter_by(user_id=current_user.id).count()
        automations_count = db.session.query(Automation).filter_by(user_id=current_user.id).count()
        
        # Delete all positions
        db.session.query(Position).filter_by(user_id=current_user.id).delete()
        
        # Delete all trades
        db.session.query(Trade).filter_by(user_id=current_user.id).delete()
        
        # Delete all automations
        db.session.query(Automation).filter_by(user_id=current_user.id).delete()
        
        # Reset balance to starting amount
        user.paper_balance = 100000.0
        
        db.session.commit()
        
        current_app.logger.info(
            f"Account reset for user {current_user.id}: "
            f"Deleted {positions_count} positions, {trades_count} trades, {automations_count} automations"
        )
        
        return jsonify({
            'message': 'Account reset successfully',
            'deleted': {
                'positions': positions_count,
                'trades': trades_count,
                'automations': automations_count
            },
            'new_balance': float(user.paper_balance)
        }), 200
        
    except Exception as e:
        import traceback
        error_msg = f"Failed to reset account: {str(e)}"
        current_app.logger.error(f"{error_msg}\n{traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': error_msg}), 500

