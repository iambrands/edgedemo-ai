from app import db
from datetime import datetime

class Stock(db.Model):
    """Stock watchlist model"""
    __tablename__ = 'stocks'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    symbol = db.Column(db.String(10), nullable=False, index=True)
    company_name = db.Column(db.String(200))
    current_price = db.Column(db.Float)
    change_percent = db.Column(db.Float)
    volume = db.Column(db.Integer)
    market_cap = db.Column(db.BigInteger)
    tags = db.Column(db.String(500))  # Comma-separated tags
    notes = db.Column(db.Text)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Options analysis metadata
    implied_volatility = db.Column(db.Float)
    iv_rank = db.Column(db.Float)  # IV Rank (0-100)
    has_options_signals = db.Column(db.Boolean, default=False)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'symbol', name='unique_user_stock'),)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'company_name': self.company_name,
            'current_price': self.current_price,
            'change_percent': self.change_percent,
            'volume': self.volume,
            'market_cap': self.market_cap,
            'tags': self.tags.split(',') if self.tags else [],
            'notes': self.notes,
            'implied_volatility': self.implied_volatility,
            'iv_rank': self.iv_rank,
            'has_options_signals': self.has_options_signals,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

