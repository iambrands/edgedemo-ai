from flask import Blueprint, request, jsonify
from services.performance_tracker import PerformanceTracker
from utils.decorators import token_required

performance_bp = Blueprint('performance', __name__)

def get_performance_tracker():
    return PerformanceTracker()

@performance_bp.route('/automation/<int:automation_id>', methods=['GET'])
@token_required
def get_automation_performance(current_user, automation_id):
    """Get performance metrics for a specific automation"""
    try:
        tracker = get_performance_tracker()
        performance = tracker.get_automation_performance(automation_id)
        
        # Verify automation belongs to user
        from flask import current_app
        db = current_app.extensions['sqlalchemy']
        from models.automation import Automation
        automation = db.session.query(Automation).filter_by(
            id=automation_id,
            user_id=current_user.id
        ).first()
        
        if not automation:
            return jsonify({'error': 'Automation not found'}), 404
        
        return jsonify(performance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@performance_bp.route('/user', methods=['GET'])
@token_required
def get_user_performance(current_user):
    """Get overall performance metrics for user"""
    try:
        tracker = get_performance_tracker()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        performance = tracker.get_user_performance(
            current_user.id,
            start_date,
            end_date
        )
        
        return jsonify(performance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@performance_bp.route('/portfolio', methods=['GET'])
@token_required
def get_portfolio_analytics(current_user):
    """Get comprehensive portfolio analytics"""
    try:
        tracker = get_performance_tracker()
        analytics = tracker.get_portfolio_analytics(current_user.id)
        
        return jsonify(analytics), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

