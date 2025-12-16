from app import db
from datetime import datetime

class RiskLimits(db.Model):
    """User risk management limits"""
    __tablename__ = 'risk_limits'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    
    # Position sizing
    max_position_size_percent = db.Column(db.Float, default=2.0)  # % of portfolio per position
    max_position_size_dollars = db.Column(db.Float)  # Absolute dollar limit (optional)
    
    # Portfolio limits
    max_portfolio_delta = db.Column(db.Float)  # Maximum total delta exposure
    max_portfolio_theta = db.Column(db.Float)  # Maximum total theta exposure
    max_portfolio_vega = db.Column(db.Float)  # Maximum total vega exposure
    max_capital_at_risk_percent = db.Column(db.Float, default=10.0)  # Max % of portfolio at risk
    
    # Position limits
    max_open_positions = db.Column(db.Integer, default=10)  # Maximum number of open positions
    max_positions_per_symbol = db.Column(db.Integer, default=3)  # Max positions per symbol
    
    # Loss limits
    max_daily_loss_percent = db.Column(db.Float, default=5.0)  # Max daily loss %
    max_weekly_loss_percent = db.Column(db.Float, default=10.0)  # Max weekly loss %
    max_monthly_loss_percent = db.Column(db.Float, default=20.0)  # Max monthly loss %
    max_daily_loss_dollars = db.Column(db.Float)  # Absolute daily loss limit
    
    # Greeks limits
    max_delta_per_position = db.Column(db.Float)  # Max delta per position
    max_theta_per_position = db.Column(db.Float)  # Max theta per position
    
    # Other limits
    min_dte = db.Column(db.Integer, default=7)  # Minimum days to expiration
    max_dte = db.Column(db.Integer, default=1095)  # Maximum days to expiration (3 years for LEAPS)
    min_iv_rank = db.Column(db.Float)  # Minimum IV rank to enter (optional)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'max_position_size_percent': self.max_position_size_percent,
            'max_position_size_dollars': self.max_position_size_dollars,
            'max_portfolio_delta': self.max_portfolio_delta,
            'max_portfolio_theta': self.max_portfolio_theta,
            'max_portfolio_vega': self.max_portfolio_vega,
            'max_capital_at_risk_percent': self.max_capital_at_risk_percent,
            'max_open_positions': self.max_open_positions,
            'max_positions_per_symbol': self.max_positions_per_symbol,
            'max_daily_loss_percent': self.max_daily_loss_percent,
            'max_weekly_loss_percent': self.max_weekly_loss_percent,
            'max_monthly_loss_percent': self.max_monthly_loss_percent,
            'max_daily_loss_dollars': self.max_daily_loss_dollars,
            'max_delta_per_position': self.max_delta_per_position,
            'max_theta_per_position': self.max_theta_per_position,
            'min_dte': self.min_dte,
            'max_dte': self.max_dte,
            'min_iv_rank': self.min_iv_rank,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

