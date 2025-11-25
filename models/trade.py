from app import db
from datetime import datetime

class Trade(db.Model):
    """Complete trade history"""
    __tablename__ = 'trades'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    symbol = db.Column(db.String(10), nullable=False, index=True)
    option_symbol = db.Column(db.String(50))  # For options trades
    contract_type = db.Column(db.String(10))  # call, put
    action = db.Column(db.String(10), nullable=False)  # buy, sell
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    strike_price = db.Column(db.Float)  # For options
    expiration_date = db.Column(db.Date)  # For options
    trade_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Greeks at trade time
    delta = db.Column(db.Float)
    gamma = db.Column(db.Float)
    theta = db.Column(db.Float)
    vega = db.Column(db.Float)
    implied_volatility = db.Column(db.Float)
    
    # Trade metadata
    strategy_source = db.Column(db.String(50))  # manual, automation, signal
    automation_id = db.Column(db.Integer, db.ForeignKey('automations.id'), nullable=True)
    notes = db.Column(db.Text)
    
    # P/L (for closed positions)
    realized_pnl = db.Column(db.Float)
    realized_pnl_percent = db.Column(db.Float)
    commission = db.Column(db.Float, default=0.0)
    
    # Entry/Exit tracking
    entry_trade_id = db.Column(db.Integer, db.ForeignKey('trades.id'), nullable=True)  # For exit trades
    exit_trade_id = db.Column(db.Integer, nullable=True)  # For entry trades
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'option_symbol': self.option_symbol,
            'contract_type': self.contract_type,
            'action': self.action,
            'quantity': self.quantity,
            'price': self.price,
            'strike_price': self.strike_price,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None,
            'trade_date': self.trade_date.isoformat() if self.trade_date else None,
            'delta': self.delta,
            'gamma': self.gamma,
            'theta': self.theta,
            'vega': self.vega,
            'implied_volatility': self.implied_volatility,
            'strategy_source': self.strategy_source,
            'automation_id': self.automation_id,
            'notes': self.notes,
            'realized_pnl': self.realized_pnl,
            'realized_pnl_percent': self.realized_pnl_percent,
            'commission': self.commission,
            'entry_trade_id': self.entry_trade_id,
            'exit_trade_id': self.exit_trade_id
        }

