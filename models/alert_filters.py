from app import db
from datetime import datetime

class AlertFilters(db.Model):
    """User-defined alert filter preferences"""
    __tablename__ = 'alert_filters'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    
    # General settings
    min_confidence = db.Column(db.Float, default=0.6)  # Minimum confidence to generate alert (0-1)
    enabled = db.Column(db.Boolean, default=True)  # Whether custom filters are enabled
    
    # Technical Indicator Filters
    # RSI
    rsi_enabled = db.Column(db.Boolean, default=True)
    rsi_oversold_threshold = db.Column(db.Float, default=30.0)  # RSI < this = oversold (bullish)
    rsi_overbought_threshold = db.Column(db.Float, default=70.0)  # RSI > this = overbought (bearish)
    
    # Moving Averages
    ma_enabled = db.Column(db.Boolean, default=True)
    require_golden_cross = db.Column(db.Boolean, default=True)  # Require price > all MAs
    require_death_cross = db.Column(db.Boolean, default=False)  # Require price < all MAs
    min_ma_separation_percent = db.Column(db.Float, default=0.0)  # Min % separation between MAs
    
    # MACD
    macd_enabled = db.Column(db.Boolean, default=True)
    require_macd_bullish = db.Column(db.Boolean, default=True)  # MACD line > signal
    require_macd_bearish = db.Column(db.Boolean, default=False)  # MACD line < signal
    min_macd_histogram = db.Column(db.Float, default=0.0)  # Minimum histogram value
    
    # Volume
    volume_enabled = db.Column(db.Boolean, default=True)
    min_volume_ratio = db.Column(db.Float, default=1.0)  # Min volume vs average (1.0 = average, 1.5 = 50% above)
    require_volume_confirmation = db.Column(db.Boolean, default=False)  # Require high volume for signals
    
    # Price Change
    price_change_enabled = db.Column(db.Boolean, default=False)
    min_price_change_percent = db.Column(db.Float, default=0.0)  # Min % price change
    max_price_change_percent = db.Column(db.Float, default=100.0)  # Max % price change
    
    # Support/Resistance
    support_resistance_enabled = db.Column(db.Boolean, default=False)
    near_support_threshold = db.Column(db.Float, default=105.0)  # % of 52-week low (105 = 5% above low)
    near_resistance_threshold = db.Column(db.Float, default=95.0)  # % of 52-week high (95 = 5% below high)
    
    # Signal Requirements
    min_signal_count = db.Column(db.Integer, default=1)  # Minimum number of signals that must agree
    require_all_signals_bullish = db.Column(db.Boolean, default=False)  # All signals must be bullish
    require_all_signals_bearish = db.Column(db.Boolean, default=False)  # All signals must be bearish
    
    # IV (Implied Volatility) Filters
    iv_enabled = db.Column(db.Boolean, default=False)
    min_iv_rank = db.Column(db.Float)  # Minimum IV rank (0-100)
    max_iv_rank = db.Column(db.Float)  # Maximum IV rank (0-100)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'min_confidence': self.min_confidence,
            'enabled': self.enabled,
            'rsi_enabled': self.rsi_enabled,
            'rsi_oversold_threshold': self.rsi_oversold_threshold,
            'rsi_overbought_threshold': self.rsi_overbought_threshold,
            'ma_enabled': self.ma_enabled,
            'require_golden_cross': self.require_golden_cross,
            'require_death_cross': self.require_death_cross,
            'min_ma_separation_percent': self.min_ma_separation_percent,
            'macd_enabled': self.macd_enabled,
            'require_macd_bullish': self.require_macd_bullish,
            'require_macd_bearish': self.require_macd_bearish,
            'min_macd_histogram': self.min_macd_histogram,
            'volume_enabled': self.volume_enabled,
            'min_volume_ratio': self.min_volume_ratio,
            'require_volume_confirmation': self.require_volume_confirmation,
            'price_change_enabled': self.price_change_enabled,
            'min_price_change_percent': self.min_price_change_percent,
            'max_price_change_percent': self.max_price_change_percent,
            'support_resistance_enabled': self.support_resistance_enabled,
            'near_support_threshold': self.near_support_threshold,
            'near_resistance_threshold': self.near_resistance_threshold,
            'min_signal_count': self.min_signal_count,
            'require_all_signals_bullish': self.require_all_signals_bullish,
            'require_all_signals_bearish': self.require_all_signals_bearish,
            'iv_enabled': self.iv_enabled,
            'min_iv_rank': self.min_iv_rank,
            'max_iv_rank': self.max_iv_rank,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @staticmethod
    def get_defaults():
        """Get default filter settings"""
        return {
            'min_confidence': 0.6,
            'enabled': False,  # Default to using platform defaults
            'rsi_enabled': True,
            'rsi_oversold_threshold': 30.0,
            'rsi_overbought_threshold': 70.0,
            'ma_enabled': True,
            'require_golden_cross': True,
            'require_death_cross': False,
            'min_ma_separation_percent': 0.0,
            'macd_enabled': True,
            'require_macd_bullish': True,
            'require_macd_bearish': False,
            'min_macd_histogram': 0.0,
            'volume_enabled': True,
            'min_volume_ratio': 1.0,
            'require_volume_confirmation': False,
            'price_change_enabled': False,
            'min_price_change_percent': 0.0,
            'max_price_change_percent': 100.0,
            'support_resistance_enabled': False,
            'near_support_threshold': 105.0,
            'near_resistance_threshold': 95.0,
            'min_signal_count': 1,
            'require_all_signals_bullish': False,
            'require_all_signals_bearish': False,
            'iv_enabled': False,
            'min_iv_rank': None,
            'max_iv_rank': None
        }

