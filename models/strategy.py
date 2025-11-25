from app import db
from datetime import datetime

class Strategy(db.Model):
    """Multi-leg options strategy"""
    __tablename__ = 'strategies'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Strategy info
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    strategy_type = db.Column(db.String(50), nullable=False)  # 'covered_call', 'vertical_spread', 'iron_condor', etc.
    
    # Underlying
    symbol = db.Column(db.String(10), nullable=False, index=True)
    
    # Strategy Greeks (net)
    target_delta = db.Column(db.Float)
    target_theta = db.Column(db.Float)
    target_vega = db.Column(db.Float)
    
    # Entry/Exit criteria
    entry_iv_rank_min = db.Column(db.Float)
    entry_iv_rank_max = db.Column(db.Float)
    profit_target_percent = db.Column(db.Float)
    stop_loss_percent = db.Column(db.Float)
    
    # Status
    status = db.Column(db.String(20), default='active')  # active, closed, paused
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    closed_at = db.Column(db.DateTime)
    
    # Relationships
    legs = db.relationship('StrategyLeg', backref='strategy', lazy=True, cascade='all, delete-orphan')
    # Note: Positions are linked via StrategyLeg.position_id, not directly
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'strategy_type': self.strategy_type,
            'symbol': self.symbol,
            'target_delta': self.target_delta,
            'target_theta': self.target_theta,
            'target_vega': self.target_vega,
            'entry_iv_rank_min': self.entry_iv_rank_min,
            'entry_iv_rank_max': self.entry_iv_rank_max,
            'profit_target_percent': self.profit_target_percent,
            'stop_loss_percent': self.stop_loss_percent,
            'status': self.status,
            'legs': [leg.to_dict() for leg in self.legs],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None
        }

class StrategyLeg(db.Model):
    """Individual leg of a multi-leg strategy"""
    __tablename__ = 'strategy_legs'
    
    id = db.Column(db.Integer, primary_key=True)
    strategy_id = db.Column(db.Integer, db.ForeignKey('strategies.id'), nullable=False, index=True)
    
    # Leg details
    leg_number = db.Column(db.Integer, nullable=False)  # 1, 2, 3, 4
    action = db.Column(db.String(10), nullable=False)  # 'buy', 'sell'
    contract_type = db.Column(db.String(10), nullable=False)  # 'call', 'put'
    quantity = db.Column(db.Integer, nullable=False, default=1)
    
    # Option details
    strike_price = db.Column(db.Float, nullable=False)
    expiration_date = db.Column(db.Date, nullable=False)
    
    # Greeks at entry
    entry_delta = db.Column(db.Float)
    entry_gamma = db.Column(db.Float)
    entry_theta = db.Column(db.Float)
    entry_vega = db.Column(db.Float)
    entry_iv = db.Column(db.Float)
    entry_price = db.Column(db.Float)
    
    # Status
    filled = db.Column(db.Boolean, default=False)
    filled_at = db.Column(db.DateTime)
    position_id = db.Column(db.Integer, db.ForeignKey('positions.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'strategy_id': self.strategy_id,
            'leg_number': self.leg_number,
            'action': self.action,
            'contract_type': self.contract_type,
            'quantity': self.quantity,
            'strike_price': self.strike_price,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'entry_delta': self.entry_delta,
            'entry_gamma': self.entry_gamma,
            'entry_theta': self.entry_theta,
            'entry_vega': self.entry_vega,
            'entry_iv': self.entry_iv,
            'entry_price': self.entry_price,
            'filled': self.filled,
            'filled_at': self.filled_at.isoformat() if self.filled_at else None,
            'position_id': self.position_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

