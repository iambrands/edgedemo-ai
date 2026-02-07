from app import db
from datetime import datetime, date

class IVHistory(db.Model):
    """Historical implied volatility data"""
    __tablename__ = 'iv_history'
    
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(10), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    
    # IV metrics
    implied_volatility = db.Column(db.Float)  # Current IV
    iv_rank = db.Column(db.Float)  # IV Rank (0-100)
    iv_percentile = db.Column(db.Float)  # IV Percentile (0-100)
    
    # Historical IV data
    iv_30d = db.Column(db.Float)  # 30-day IV
    iv_60d = db.Column(db.Float)  # 60-day IV
    iv_90d = db.Column(db.Float)  # 90-day IV
    iv_252d = db.Column(db.Float)  # 252-day (1 year) IV
    
    # Price data
    stock_price = db.Column(db.Numeric(14, 4, asdecimal=False))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('symbol', 'date', name='unique_symbol_date'),)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'symbol': self.symbol,
            'date': self.date.isoformat() if self.date else None,
            'implied_volatility': self.implied_volatility,
            'iv_rank': self.iv_rank,
            'iv_percentile': self.iv_percentile,
            'iv_30d': self.iv_30d,
            'iv_60d': self.iv_60d,
            'iv_90d': self.iv_90d,
            'iv_252d': self.iv_252d,
            'stock_price': self.stock_price,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

