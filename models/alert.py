from app import db
from datetime import datetime

class Alert(db.Model):
    """Trading alerts and signals"""
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Alert details
    alert_type = db.Column(db.String(50), nullable=False, index=True)  # 'buy_signal', 'sell_signal', 'risk_alert', etc.
    priority = db.Column(db.String(20), default='medium')  # 'low', 'medium', 'high', 'critical'
    status = db.Column(db.String(20), default='active')  # 'active', 'acknowledged', 'dismissed', 'expired'
    
    # Signal details
    symbol = db.Column(db.String(10), nullable=False, index=True)
    signal_direction = db.Column(db.String(20))  # 'bullish', 'bearish', 'neutral'
    confidence = db.Column(db.Float)  # 0-1
    signal_strength = db.Column(db.String(20))  # 'low', 'medium', 'high'
    
    # Alert content
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text)  # Plain English explanation
    
    # Context
    details = db.Column(db.JSON)  # Additional context (option details, technical indicators, etc.)
    option_symbol = db.Column(db.String(50))
    strike_price = db.Column(db.Float)
    expiration_date = db.Column(db.Date)
    
    # Related entities
    position_id = db.Column(db.Integer, db.ForeignKey('positions.id'), nullable=True)
    automation_id = db.Column(db.Integer, db.ForeignKey('automations.id'), nullable=True)
    trade_id = db.Column(db.Integer, db.ForeignKey('trades.id'), nullable=True)
    
    # Notification delivery
    notification_method = db.Column(db.String(50), default='in_app')  # 'in_app', 'email', 'sms', 'push', 'all'
    sent_at = db.Column(db.DateTime)
    acknowledged_at = db.Column(db.DateTime)
    dismissed_at = db.Column(db.DateTime)
    
    # Expiration
    expires_at = db.Column(db.DateTime)  # Alert expires at this time
    is_expired = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'alert_type': self.alert_type,
            'priority': self.priority,
            'status': self.status,
            'symbol': self.symbol,
            'signal_direction': self.signal_direction,
            'confidence': self.confidence,
            'signal_strength': self.signal_strength,
            'title': self.title,
            'message': self.message,
            'explanation': self.explanation,
            'details': self.details,
            'option_symbol': self.option_symbol,
            'strike_price': self.strike_price,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'position_id': self.position_id,
            'automation_id': self.automation_id,
            'trade_id': self.trade_id,
            'notification_method': self.notification_method,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'dismissed_at': self.dismissed_at.isoformat() if self.dismissed_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

