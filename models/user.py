from app import db
from datetime import datetime
import bcrypt

class User(db.Model):
    """User model for authentication and preferences"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Preferences
    default_strategy = db.Column(db.String(20), default='balanced')  # conservative, balanced, aggressive
    risk_tolerance = db.Column(db.String(20), default='moderate')  # low, moderate, high
    notification_enabled = db.Column(db.Boolean, default=True)
    
    # Trading Mode
    trading_mode = db.Column(db.String(10), default='paper')  # paper, live
    paper_balance = db.Column(db.Float, default=100000.0)  # Starting paper trading balance
    
    # Relationships
    stocks = db.relationship('Stock', backref='user', lazy=True, cascade='all, delete-orphan')
    positions = db.relationship('Position', backref='user', lazy=True, cascade='all, delete-orphan')
    automations = db.relationship('Automation', backref='user', lazy=True, cascade='all, delete-orphan')
    trades = db.relationship('Trade', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        """Verify password"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'default_strategy': self.default_strategy,
            'risk_tolerance': self.risk_tolerance,
            'notification_enabled': self.notification_enabled,
            'trading_mode': self.trading_mode,
            'paper_balance': self.paper_balance,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

