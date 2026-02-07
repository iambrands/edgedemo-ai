from app import db
from datetime import datetime

class Spread(db.Model):
    """Vertical debit/credit spreads"""
    __tablename__ = 'spreads'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Basic info
    symbol = db.Column(db.String(10), nullable=False, index=True)
    spread_type = db.Column(db.String(20), nullable=False)  # 'debit_put', 'debit_call', 'credit_put', 'credit_call'
    expiration = db.Column(db.Date, nullable=False, index=True)
    quantity = db.Column(db.Integer, nullable=False)
    
    # Long leg (buy)
    long_strike = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    long_premium = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    long_option_symbol = db.Column(db.String(50))  # Tradier option symbol
    
    # Short leg (sell)
    short_strike = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    short_premium = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    short_option_symbol = db.Column(db.String(50))  # Tradier option symbol
    
    # Economics
    net_debit = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)  # Total cost paid (negative for credit)
    max_profit = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    max_loss = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    breakeven = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    strike_width = db.Column(db.Numeric(14, 4, asdecimal=False), nullable=False)
    
    # P&L tracking
    current_value = db.Column(db.Numeric(14, 4, asdecimal=False), default=0.0)
    unrealized_pnl = db.Column(db.Numeric(14, 4, asdecimal=False), default=0.0)
    unrealized_pnl_percent = db.Column(db.Float, default=0.0)
    realized_pnl = db.Column(db.Numeric(14, 4, asdecimal=False))
    
    # Status
    status = db.Column(db.String(20), default='open', index=True)  # open, closed, expired
    account_type = db.Column(db.String(10), default='paper')  # paper, live
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    closed_at = db.Column(db.DateTime)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='spreads')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'spread_type': self.spread_type,
            'expiration': self.expiration.isoformat() if self.expiration else None,
            'quantity': self.quantity,
            'long_strike': self.long_strike,
            'long_premium': self.long_premium,
            'long_option_symbol': self.long_option_symbol,
            'short_strike': self.short_strike,
            'short_premium': self.short_premium,
            'short_option_symbol': self.short_option_symbol,
            'net_debit': self.net_debit,
            'max_profit': self.max_profit,
            'max_loss': self.max_loss,
            'breakeven': self.breakeven,
            'strike_width': self.strike_width,
            'current_value': self.current_value,
            'unrealized_pnl': self.unrealized_pnl,
            'unrealized_pnl_percent': self.unrealized_pnl_percent,
            'realized_pnl': self.realized_pnl,
            'status': self.status,
            'account_type': self.account_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }

