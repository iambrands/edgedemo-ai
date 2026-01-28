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
    
    # Tradier Credentials (encrypted in production)
    tradier_api_key = db.Column(db.String(255), nullable=True)
    tradier_account_id = db.Column(db.String(50), nullable=True)
    tradier_environment = db.Column(db.String(20), default='sandbox')  # sandbox, live
    
    # Rate Limiting for AI Analysis
    daily_ai_analyses = db.Column(db.Integer, default=0)  # Counter for daily AI analyses
    last_analysis_reset = db.Column(db.Date, default=datetime.utcnow)  # Date of last counter reset
    
    # User Preferences
    timezone = db.Column(db.String(50), default='America/New_York')  # IANA timezone name (e.g., America/Chicago)
    
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
    
    def can_analyze(self):
        """Check if user can make AI analysis request"""
        from datetime import date
        # Reset counter if new day
        today = date.today()
        if self.last_analysis_reset != today:
            self.daily_ai_analyses = 0
            self.last_analysis_reset = today
            db.session.commit()
        
        # Free tier limit: 100 analyses per day (generous for now)
        # You can adjust this later or add tier system
        return self.daily_ai_analyses < 100
    
    def increment_analysis_count(self):
        """Increment AI analysis counter"""
        from datetime import date
        # Reset if needed
        today = date.today()
        if self.last_analysis_reset != today:
            self.daily_ai_analyses = 0
            self.last_analysis_reset = today
        
        self.daily_ai_analyses += 1
        db.session.commit()
    
    def get_analysis_usage(self):
        """Get current usage stats"""
        from datetime import date, datetime, timedelta
        # Reset if needed
        today = date.today()
        if self.last_analysis_reset != today:
            self.daily_ai_analyses = 0
            self.last_analysis_reset = today
        
        # Calculate reset time (midnight EST)
        reset_at = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        return {
            'used': self.daily_ai_analyses,
            'limit': 100,
            'remaining': 100 - self.daily_ai_analyses,
            'reset_at': reset_at.isoformat()
        }
    
    def is_admin(self):
        """Check if user is an admin."""
        return self.email == 'leslie@iabadvisors.com'
    
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
            'timezone': self.timezone or 'America/New_York',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

