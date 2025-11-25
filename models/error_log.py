from app import db
from datetime import datetime

class ErrorLog(db.Model):
    """Error logging for system failures"""
    __tablename__ = 'error_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Error details
    error_type = db.Column(db.String(100), nullable=False, index=True)  # 'APIError', 'ValidationError', etc.
    error_message = db.Column(db.Text, nullable=False)
    error_code = db.Column(db.String(50))
    
    # Context
    context = db.Column(db.JSON)  # JSON field with error context
    symbol = db.Column(db.String(10), index=True)
    trade_id = db.Column(db.Integer, db.ForeignKey('trades.id'), nullable=True)
    position_id = db.Column(db.Integer, db.ForeignKey('positions.id'), nullable=True)
    automation_id = db.Column(db.Integer, db.ForeignKey('automations.id'), nullable=True)
    
    # Stack trace
    stack_trace = db.Column(db.Text)
    
    # Resolution
    resolved = db.Column(db.Boolean, default=False)
    resolved_at = db.Column(db.DateTime)
    resolution_notes = db.Column(db.Text)
    
    # Request context
    ip_address = db.Column(db.String(45))
    endpoint = db.Column(db.String(100))
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'error_type': self.error_type,
            'error_message': self.error_message,
            'error_code': self.error_code,
            'context': self.context,
            'symbol': self.symbol,
            'trade_id': self.trade_id,
            'position_id': self.position_id,
            'automation_id': self.automation_id,
            'stack_trace': self.stack_trace,
            'resolved': self.resolved,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'resolution_notes': self.resolution_notes,
            'ip_address': self.ip_address,
            'endpoint': self.endpoint,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

