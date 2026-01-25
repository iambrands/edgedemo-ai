"""
Platform-wide aggregate statistics
Cached and updated periodically
"""
from app import db
from datetime import datetime


class PlatformStats(db.Model):
    """
    Stores platform-wide aggregate statistics
    Updated every 5 minutes by background job
    """
    __tablename__ = 'platform_stats'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # User metrics
    total_users = db.Column(db.Integer, default=0)
    active_users_30d = db.Column(db.Integer, default=0)
    verified_users = db.Column(db.Integer, default=0)
    
    # Trading metrics
    total_trades = db.Column(db.Integer, default=0)
    total_profit_loss = db.Column(db.Numeric(15, 2), default=0)
    total_capital_deployed = db.Column(db.Numeric(15, 2), default=0)
    
    # Performance metrics
    platform_win_rate = db.Column(db.Numeric(5, 2), default=0)
    platform_avg_return = db.Column(db.Numeric(5, 2), default=0)
    top_10pct_avg_return = db.Column(db.Numeric(5, 2), default=0)
    
    # Time-based
    mtd_aggregate_pnl = db.Column(db.Numeric(15, 2), default=0)
    ytd_aggregate_pnl = db.Column(db.Numeric(15, 2), default=0)
    
    # Signals
    total_signals_generated = db.Column(db.Integer, default=0)
    signals_followed = db.Column(db.Integer, default=0)
    signal_success_rate = db.Column(db.Numeric(5, 2), default=0)
    
    # Metadata
    calculation_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PlatformStats users={self.total_users} pnl={self.total_profit_loss}>'
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'total_users': self.total_users,
            'active_users_30d': self.active_users_30d,
            'verified_users': self.verified_users,
            'total_trades': self.total_trades,
            'total_profit_loss': float(self.total_profit_loss) if self.total_profit_loss else 0,
            'total_capital_deployed': float(self.total_capital_deployed) if self.total_capital_deployed else 0,
            'platform_win_rate': float(self.platform_win_rate) if self.platform_win_rate else 0,
            'platform_avg_return': float(self.platform_avg_return) if self.platform_avg_return else 0,
            'top_10pct_avg_return': float(self.top_10pct_avg_return) if self.top_10pct_avg_return else 0,
            'mtd_aggregate_pnl': float(self.mtd_aggregate_pnl) if self.mtd_aggregate_pnl else 0,
            'ytd_aggregate_pnl': float(self.ytd_aggregate_pnl) if self.ytd_aggregate_pnl else 0,
            'total_signals_generated': self.total_signals_generated,
            'signals_followed': self.signals_followed,
            'signal_success_rate': float(self.signal_success_rate) if self.signal_success_rate else 0,
            'last_updated': self.calculation_date.isoformat() if self.calculation_date else None
        }
    
    def to_marketing_dict(self):
        """
        Convert to dictionary optimized for marketing/homepage display
        Rounds numbers for better presentation
        """
        total_pnl = float(self.total_profit_loss) if self.total_profit_loss else 0
        total_capital = float(self.total_capital_deployed) if self.total_capital_deployed else 0
        
        # Format large numbers nicely
        def format_currency(amount):
            if abs(amount) >= 1_000_000:
                return f"${amount/1_000_000:.1f}M+"
            elif abs(amount) >= 1_000:
                return f"${amount/1_000:.0f}K+"
            else:
                return f"${amount:.0f}"
        
        return {
            'total_user_profits': format_currency(total_pnl),
            'total_user_profits_raw': total_pnl,
            'total_capital_deployed': format_currency(total_capital),
            'total_capital_deployed_raw': total_capital,
            'active_traders': f"{self.active_users_30d:,}",
            'active_traders_raw': self.active_users_30d,
            'average_monthly_return': f"{float(self.platform_avg_return) if self.platform_avg_return else 0:.1f}%",
            'average_monthly_return_raw': float(self.platform_avg_return) if self.platform_avg_return else 0,
            'win_rate': f"{float(self.platform_win_rate) if self.platform_win_rate else 0:.0f}%",
            'win_rate_raw': float(self.platform_win_rate) if self.platform_win_rate else 0,
            'top_performers_return': f"{float(self.top_10pct_avg_return) if self.top_10pct_avg_return else 0:.1f}%",
            'last_updated': self.calculation_date.isoformat() if self.calculation_date else None
        }
