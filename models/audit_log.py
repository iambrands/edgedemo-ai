from app import db
from datetime import datetime

class AuditLog(db.Model):
    """Audit trail for all system actions"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Action details
    action_type = db.Column(db.String(50), nullable=False, index=True)  # 'trade_executed', 'automation_triggered', etc.
    action_category = db.Column(db.String(30))  # 'trade', 'automation', 'risk', 'system'
    description = db.Column(db.Text)
    
    # Context
    details = db.Column(db.JSON)  # JSON field with action-specific details
    symbol = db.Column(db.String(10), index=True)
    trade_id = db.Column(db.Integer, db.ForeignKey('trades.id'), nullable=True)
    position_id = db.Column(db.Integer, db.ForeignKey('positions.id'), nullable=True)
    automation_id = db.Column(db.Integer, db.ForeignKey('automations.id'), nullable=True)
    
    # Request context
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    endpoint = db.Column(db.String(100))
    
    # Result
    success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text)
    
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action_type': self.action_type,
            'action_category': self.action_category,
            'description': self.description,
            'details': self.details,
            'symbol': self.symbol,
            'trade_id': self.trade_id,
            'position_id': self.position_id,
            'automation_id': self.automation_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'endpoint': self.endpoint,
            'success': self.success,
            'error_message': self.error_message,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

