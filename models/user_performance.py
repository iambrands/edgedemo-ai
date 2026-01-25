"""
User Performance Tracking Model
Stores aggregate performance metrics for each user
"""
from app import db
from datetime import datetime
from sqlalchemy import func


class UserPerformance(db.Model):
    """
    Tracks individual user performance metrics
    Updated automatically when trades are executed
    """
    __tablename__ = 'user_performance'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    
    # Overall statistics
    total_trades = db.Column(db.Integer, default=0)
    winning_trades = db.Column(db.Integer, default=0)
    losing_trades = db.Column(db.Integer, default=0)
    total_profit_loss = db.Column(db.Numeric(12, 2), default=0)
    total_capital_deployed = db.Column(db.Numeric(12, 2), default=0)
    
    # Time-based performance
    mtd_pnl = db.Column(db.Numeric(12, 2), default=0)  # Month-to-date P&L
    ytd_pnl = db.Column(db.Numeric(12, 2), default=0)  # Year-to-date P&L
    all_time_high_pnl = db.Column(db.Numeric(12, 2), default=0)
    
    # Performance metrics
    win_rate = db.Column(db.Numeric(5, 2), default=0)  # Percentage
    avg_return_pct = db.Column(db.Numeric(5, 2), default=0)
    avg_win_size = db.Column(db.Numeric(10, 2), default=0)
    avg_loss_size = db.Column(db.Numeric(10, 2), default=0)
    largest_win = db.Column(db.Numeric(10, 2), default=0)
    largest_loss = db.Column(db.Numeric(10, 2), default=0)
    
    # Risk metrics
    sharpe_ratio = db.Column(db.Numeric(5, 2))
    max_drawdown = db.Column(db.Numeric(10, 2))
    current_streak = db.Column(db.Integer, default=0)  # Positive = winning streak, negative = losing
    best_streak = db.Column(db.Integer, default=0)
    
    # Signal following statistics
    signals_followed = db.Column(db.Integer, default=0)
    signals_won = db.Column(db.Integer, default=0)
    signal_follow_rate = db.Column(db.Numeric(5, 2), default=0)
    
    # Privacy & visibility settings
    public_profile = db.Column(db.Boolean, default=False)
    show_on_leaderboard = db.Column(db.Boolean, default=False)
    allow_performance_display = db.Column(db.Boolean, default=True)  # Allow in aggregate stats
    
    # Metadata
    first_trade_date = db.Column(db.DateTime)
    last_trade_date = db.Column(db.DateTime)
    account_age_days = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='performance', lazy=True)
    
    def __repr__(self):
        return f'<UserPerformance user_id={self.user_id} pnl={self.total_profit_loss}>'
    
    def to_dict(self, include_private=False):
        """Convert to dictionary for API responses"""
        data = {
            'user_id': self.user_id,
            'total_trades': self.total_trades,
            'win_rate': float(self.win_rate) if self.win_rate else 0,
            'total_profit_loss': float(self.total_profit_loss) if self.total_profit_loss else 0,
            'avg_return_pct': float(self.avg_return_pct) if self.avg_return_pct else 0,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_private:
            # Include detailed stats for the user's own dashboard
            data.update({
                'winning_trades': self.winning_trades,
                'losing_trades': self.losing_trades,
                'total_capital_deployed': float(self.total_capital_deployed) if self.total_capital_deployed else 0,
                'mtd_pnl': float(self.mtd_pnl) if self.mtd_pnl else 0,
                'ytd_pnl': float(self.ytd_pnl) if self.ytd_pnl else 0,
                'all_time_high_pnl': float(self.all_time_high_pnl) if self.all_time_high_pnl else 0,
                'avg_win_size': float(self.avg_win_size) if self.avg_win_size else 0,
                'avg_loss_size': float(self.avg_loss_size) if self.avg_loss_size else 0,
                'largest_win': float(self.largest_win) if self.largest_win else 0,
                'largest_loss': float(self.largest_loss) if self.largest_loss else 0,
                'sharpe_ratio': float(self.sharpe_ratio) if self.sharpe_ratio else 0,
                'max_drawdown': float(self.max_drawdown) if self.max_drawdown else 0,
                'current_streak': self.current_streak,
                'best_streak': self.best_streak,
                'signals_followed': self.signals_followed,
                'signals_won': self.signals_won,
                'signal_follow_rate': float(self.signal_follow_rate) if self.signal_follow_rate else 0,
                'account_age_days': self.account_age_days,
                'first_trade_date': self.first_trade_date.isoformat() if self.first_trade_date else None,
                'last_trade_date': self.last_trade_date.isoformat() if self.last_trade_date else None,
                'public_profile': self.public_profile,
                'show_on_leaderboard': self.show_on_leaderboard,
                'allow_performance_display': self.allow_performance_display
            })
        
        return data
    
    def calculate_metrics(self):
        """Recalculate all derived metrics"""
        if self.total_trades > 0:
            self.win_rate = (self.winning_trades / self.total_trades) * 100
            
            if self.total_capital_deployed and float(self.total_capital_deployed) > 0:
                self.avg_return_pct = (float(self.total_profit_loss) / float(self.total_capital_deployed)) * 100
        
        if self.signals_followed > 0:
            self.signal_follow_rate = (self.signals_won / self.signals_followed) * 100
        
        # Calculate account age
        if self.first_trade_date:
            self.account_age_days = (datetime.utcnow() - self.first_trade_date).days
