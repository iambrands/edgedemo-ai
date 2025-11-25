from app import db
from datetime import datetime

class Position(db.Model):
    """Current trading positions"""
    __tablename__ = 'positions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    symbol = db.Column(db.String(10), nullable=False, index=True)
    option_symbol = db.Column(db.String(50))  # For options positions
    contract_type = db.Column(db.String(10))  # call, put
    quantity = db.Column(db.Integer, nullable=False)
    entry_price = db.Column(db.Float, nullable=False)
    current_price = db.Column(db.Float)
    strike_price = db.Column(db.Float)  # For options
    expiration_date = db.Column(db.Date)  # For options
    entry_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Greeks at entry
    entry_delta = db.Column(db.Float)
    entry_gamma = db.Column(db.Float)
    entry_theta = db.Column(db.Float)
    entry_vega = db.Column(db.Float)
    entry_iv = db.Column(db.Float)
    
    # Current Greeks
    current_delta = db.Column(db.Float)
    current_gamma = db.Column(db.Float)
    current_theta = db.Column(db.Float)
    current_vega = db.Column(db.Float)
    current_iv = db.Column(db.Float)
    
    # P/L tracking
    unrealized_pnl = db.Column(db.Float, default=0.0)
    unrealized_pnl_percent = db.Column(db.Float, default=0.0)
    
    # Automation tracking
    automation_id = db.Column(db.Integer, db.ForeignKey('automations.id'), nullable=True)
    status = db.Column(db.String(20), default='open')  # open, closed, pending_exit
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'option_symbol': self.option_symbol,
            'contract_type': self.contract_type,
            'quantity': self.quantity,
            'entry_price': self.entry_price,
            'current_price': self.current_price,
            'strike_price': self.strike_price,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'entry_date': self.entry_date.isoformat() if self.entry_date else None,
            'entry_delta': self.entry_delta,
            'entry_gamma': self.entry_gamma,
            'entry_theta': self.entry_theta,
            'entry_vega': self.entry_vega,
            'entry_iv': self.entry_iv,
            'current_delta': self.current_delta,
            'current_gamma': self.current_gamma,
            'current_theta': self.current_theta,
            'current_vega': self.current_vega,
            'current_iv': self.current_iv,
            'unrealized_pnl': self.unrealized_pnl,
            'unrealized_pnl_percent': self.unrealized_pnl_percent,
            'automation_id': self.automation_id,
            'status': self.status,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

