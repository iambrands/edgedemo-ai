from app import db
from datetime import datetime

class Feedback(db.Model):
    """User feedback model for beta testing"""
    __tablename__ = 'feedback'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    feedback_type = db.Column(db.String(20), nullable=False)  # bug, feature, general, question
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    page_url = db.Column(db.String(500))  # Where they were when submitting
    browser_info = db.Column(db.String(200))  # Browser/device info
    status = db.Column(db.String(20), default='new')  # new, reviewed, resolved, closed
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    admin_notes = db.Column(db.Text)  # Internal notes
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='feedback')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'feedback_type': self.feedback_type,
            'title': self.title,
            'message': self.message,
            'page_url': self.page_url,
            'browser_info': self.browser_info,
            'status': self.status,
            'priority': self.priority,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

