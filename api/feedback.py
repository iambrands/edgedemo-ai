from flask import Blueprint, request, jsonify, current_app
from utils.decorators import token_required
from utils.helpers import sanitize_input
from utils.email_service import get_email_service
from models.feedback import Feedback
from datetime import datetime

feedback_bp = Blueprint('feedback', __name__)

def get_db():
    """Get database instance"""
    return current_app.extensions['sqlalchemy']

@feedback_bp.route('', methods=['POST'])
@token_required
def submit_feedback(current_user):
    """Submit user feedback"""
    data = request.get_json()
    
    if not data or not data.get('feedback_type') or not data.get('title') or not data.get('message'):
        return jsonify({'error': 'Missing required fields: feedback_type, title, and message'}), 400
    
    try:
        db = get_db()
        
        # Sanitize inputs
        feedback_type = sanitize_input(data.get('feedback_type'), max_length=20).lower()
        if feedback_type not in ['bug', 'feature', 'general', 'question']:
            return jsonify({'error': 'Invalid feedback_type. Must be: bug, feature, general, or question'}), 400
        
        title = sanitize_input(data.get('title'), max_length=200)
        message = sanitize_input(data.get('message'), max_length=5000)
        page_url = sanitize_input(data.get('page_url'), max_length=500) if data.get('page_url') else None
        
        # Get browser info
        browser_info = request.headers.get('User-Agent', 'Unknown')[:200]
        
        # Create feedback
        feedback = Feedback(
            user_id=current_user.id,
            feedback_type=feedback_type,
            title=title,
            message=message,
            page_url=page_url,
            browser_info=browser_info,
            priority='high' if feedback_type == 'bug' else 'medium'
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        # Send email notification to default recipient
        try:
            email_service = get_email_service()
            if email_service:
                feedback_dict = feedback.to_dict()
                feedback_dict['user_id'] = current_user.id
                email_service.send_feedback_email(feedback_dict)
        except Exception as email_error:
            # Don't fail the request if email fails
            current_app.logger.warning(f'Failed to send feedback email: {email_error}')
        
        current_app.logger.info(f'Feedback submitted by user {current_user.id}: {feedback_type} - {title}')
        
        return jsonify({
            'message': 'Thank you for your feedback! We appreciate your input.',
            'feedback': feedback.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f'Error submitting feedback: {str(e)}')
        db.session.rollback()
        return jsonify({'error': f'Failed to submit feedback: {str(e)}'}), 500

@feedback_bp.route('', methods=['GET'])
@token_required
def get_user_feedback(current_user):
    """Get user's submitted feedback"""
    try:
        db = get_db()
        feedback_list = db.session.query(Feedback).filter_by(user_id=current_user.id).order_by(Feedback.created_at.desc()).all()
        
        return jsonify({
            'feedback': [f.to_dict() for f in feedback_list],
            'count': len(feedback_list)
        }), 200
    except Exception as e:
        current_app.logger.error(f'Error fetching feedback: {str(e)}')
        return jsonify({'error': str(e)}), 500

