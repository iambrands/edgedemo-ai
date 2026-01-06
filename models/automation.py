from app import db
from datetime import datetime

class Automation(db.Model):
    """Automated trading strategy configurations"""
    __tablename__ = 'automations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    symbol = db.Column(db.String(10), nullable=False, index=True)
    
    # Strategy configuration
    strategy_type = db.Column(db.String(50), nullable=False)  # covered_call, cash_secured_put, etc.
    target_delta = db.Column(db.Float)  # Target delta range
    min_delta = db.Column(db.Float)
    max_delta = db.Column(db.Float)
    preferred_dte = db.Column(db.Integer)  # Preferred days to expiration
    min_dte = db.Column(db.Integer)
    max_dte = db.Column(db.Integer)
    
    # Entry criteria
    min_confidence = db.Column(db.Float, default=0.70)  # Minimum signal confidence (0-1)
    entry_condition = db.Column(db.String(50))  # iv_rank_above, price_above, etc.
    entry_value = db.Column(db.Float)  # Threshold value for entry condition
    max_premium = db.Column(db.Float)  # Maximum option premium to pay
    min_volume = db.Column(db.Integer, default=20)
    min_open_interest = db.Column(db.Integer, default=100)
    max_spread_percent = db.Column(db.Float, default=15.0)
    
    # Exit criteria
    profit_target_1 = db.Column(db.Float, default=25.0)  # First profit target (%)
    profit_target_2 = db.Column(db.Float, default=50.0)  # Second profit target (%)
    profit_target_percent = db.Column(db.Float, nullable=False)  # Legacy field (use profit_target_1)
    stop_loss_percent = db.Column(db.Float, default=-15.0)
    trailing_stop_percent = db.Column(db.Float)  # Trailing stop loss %
    trailing_stop_activation = db.Column(db.Float, default=30.0)  # Activate trailing stop at this profit %
    trailing_stop_distance = db.Column(db.Float, default=10.0)  # Trailing stop distance (%)
    max_days_to_hold = db.Column(db.Integer, default=45)
    min_dte_exit = db.Column(db.Integer, default=21)  # Exit if DTE falls below this
    exit_at_profit_target = db.Column(db.Boolean, default=True)
    exit_at_stop_loss = db.Column(db.Boolean, default=True)
    exit_at_max_days = db.Column(db.Boolean, default=True)
    
    # Partial exit strategy
    partial_exit_percent = db.Column(db.Float)  # Exit X% of position at Y% profit
    partial_exit_profit_target = db.Column(db.Float)  # Profit % to trigger partial exit
    
    # Roll strategy
    roll_at_profit_percent = db.Column(db.Float)  # Auto-roll if profitable by X%
    roll_to_next_expiration = db.Column(db.Boolean, default=False)
    
    # Greeks-based exits
    exit_if_delta_exceeds = db.Column(db.Float)  # Exit if delta exceeds threshold
    exit_if_theta_exceeds = db.Column(db.Float)  # Exit if theta exceeds threshold
    
    # Risk management
    max_portfolio_exposure = db.Column(db.Float, default=0.20)  # Max % of portfolio at risk
    max_position_size = db.Column(db.Float, default=0.05)  # Max % of portfolio per position
    allow_multiple_positions = db.Column(db.Boolean, default=False)  # Allow multiple positions in same symbol
    quantity = db.Column(db.Integer, default=1)  # Number of contracts to buy per trade
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_paused = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_executed = db.Column(db.DateTime)
    execution_count = db.Column(db.Integer, default=0)
    
    # Relationships
    positions = db.relationship('Position', backref='automation', lazy=True)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'symbol': self.symbol,
            'strategy_type': self.strategy_type,
            'target_delta': self.target_delta,
            'min_delta': self.min_delta,
            'max_delta': self.max_delta,
            'preferred_dte': self.preferred_dte,
            'min_dte': self.min_dte,
            'max_dte': self.max_dte,
            'entry_condition': self.entry_condition,
            'entry_value': self.entry_value,
            'min_confidence': self.min_confidence,
            'max_premium': self.max_premium,
            'min_volume': self.min_volume,
            'min_open_interest': self.min_open_interest,
            'max_spread_percent': self.max_spread_percent,
            'profit_target_1': self.profit_target_1,
            'profit_target_2': self.profit_target_2,
            'profit_target_percent': self.profit_target_percent,
            'stop_loss_percent': self.stop_loss_percent,
            'trailing_stop_percent': self.trailing_stop_percent,
            'trailing_stop_activation': self.trailing_stop_activation,
            'trailing_stop_distance': self.trailing_stop_distance,
            'min_dte_exit': self.min_dte_exit,
            'max_days_to_hold': self.max_days_to_hold,
            'exit_at_profit_target': self.exit_at_profit_target,
            'exit_at_stop_loss': self.exit_at_stop_loss,
            'exit_at_max_days': self.exit_at_max_days,
            'partial_exit_percent': self.partial_exit_percent,
            'partial_exit_profit_target': self.partial_exit_profit_target,
            'roll_at_profit_percent': self.roll_at_profit_percent,
            'roll_to_next_expiration': self.roll_to_next_expiration,
            'exit_if_delta_exceeds': self.exit_if_delta_exceeds,
            'exit_if_theta_exceeds': self.exit_if_theta_exceeds,
            'max_portfolio_exposure': self.max_portfolio_exposure,
            'max_position_size': self.max_position_size,
            'allow_multiple_positions': self.allow_multiple_positions,
            'quantity': self.quantity,
            'is_active': self.is_active,
            'is_paused': self.is_paused,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_executed': self.last_executed.isoformat() if self.last_executed else None,
            'execution_count': self.execution_count
        }

