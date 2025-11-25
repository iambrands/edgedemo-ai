from app import db
from datetime import datetime, date

class EarningsCalendar(db.Model):
    """Earnings calendar for tracking earnings dates"""
    __tablename__ = 'earnings_calendar'
    
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), nullable=False, index=True)
    earnings_date = db.Column(db.Date, nullable=False, index=True)
    earnings_time = db.Column(db.String(20))  # 'before_market', 'after_market', 'during_market'
    fiscal_quarter = db.Column(db.String(10))  # 'Q1 2024', etc.
    fiscal_year = db.Column(db.Integer)
    estimated_eps = db.Column(db.Float)
    actual_eps = db.Column(db.Float)
    estimated_revenue = db.Column(db.Float)
    actual_revenue = db.Column(db.Float)
    
    # Historical impact
    historical_iv_change = db.Column(db.Float)  # IV change after earnings
    historical_price_change = db.Column(db.Float)  # Price change after earnings
    historical_iv_crush = db.Column(db.Float)  # IV crush percentage
    
    # User tracking
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    auto_pause_enabled = db.Column(db.Boolean, default=True)  # Auto-pause automations before earnings
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'earnings_date': self.earnings_date.isoformat() if self.earnings_date else None,
            'earnings_time': self.earnings_time,
            'fiscal_quarter': self.fiscal_quarter,
            'fiscal_year': self.fiscal_year,
            'estimated_eps': self.estimated_eps,
            'actual_eps': self.actual_eps,
            'estimated_revenue': self.estimated_revenue,
            'actual_revenue': self.actual_revenue,
            'historical_iv_change': self.historical_iv_change,
            'historical_price_change': self.historical_price_change,
            'historical_iv_crush': self.historical_iv_crush,
            'user_id': self.user_id,
            'auto_pause_enabled': self.auto_pause_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

