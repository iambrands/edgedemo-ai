from typing import Dict, List, Optional
from datetime import datetime, date, timedelta
from flask import current_app
from sqlalchemy import func
from models.iv_history import IVHistory
from services.tradier_connector import TradierConnector

class IVAnalyzer:
    """IV Rank and Percentile calculation service"""
    
    def __init__(self):
        self.tradier = TradierConnector()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def calculate_iv_rank(self, symbol: str, current_iv: float, lookback_days: int = 252) -> Optional[float]:
        """
        Calculate IV Rank (0-100)
        
        IV Rank = (Current IV - Min IV) / (Max IV - Min IV) * 100
        """
        db = self._get_db()
        
        # Get historical IV data
        cutoff_date = date.today() - timedelta(days=lookback_days)
        iv_history = db.session.query(IVHistory).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_date,
            IVHistory.implied_volatility.isnot(None)
        ).order_by(IVHistory.date).all()
        
        if not iv_history or len(iv_history) < 10:
            # Not enough data, return None
            return None
        
        iv_values = [h.implied_volatility for h in iv_history if h.implied_volatility]
        
        if not iv_values:
            return None
        
        min_iv = min(iv_values)
        max_iv = max(iv_values)
        
        if max_iv == min_iv:
            return 50.0  # Neutral if all IVs are the same
        
        iv_rank = ((current_iv - min_iv) / (max_iv - min_iv)) * 100
        return max(0, min(100, iv_rank))  # Clamp to 0-100
    
    def calculate_iv_percentile(self, symbol: str, current_iv: float, lookback_days: int = 252) -> Optional[float]:
        """
        Calculate IV Percentile (0-100)
        
        IV Percentile = % of days where IV was lower than current IV
        """
        db = self._get_db()
        
        # Get historical IV data
        cutoff_date = date.today() - timedelta(days=lookback_days)
        iv_history = db.session.query(IVHistory).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_date,
            IVHistory.implied_volatility.isnot(None)
        ).all()
        
        if not iv_history or len(iv_history) < 10:
            return None
        
        iv_values = [h.implied_volatility for h in iv_history if h.implied_volatility]
        
        if not iv_values:
            return None
        
        # Count how many days had lower IV
        lower_count = sum(1 for iv in iv_values if iv < current_iv)
        iv_percentile = (lower_count / len(iv_values)) * 100
        
        return iv_percentile
    
    def store_iv_data(self, symbol: str, iv: float, stock_price: float = None) -> IVHistory:
        """Store IV data for a symbol on current date"""
        db = self._get_db()
        today = date.today()
        
        # Check if already exists
        iv_history = db.session.query(IVHistory).filter_by(
            symbol=symbol.upper(),
            date=today
        ).first()
        
        if iv_history:
            iv_history.implied_volatility = iv
            if stock_price:
                iv_history.stock_price = stock_price
        else:
            iv_history = IVHistory(
                symbol=symbol.upper(),
                date=today,
                implied_volatility=iv,
                stock_price=stock_price
            )
            db.session.add(iv_history)
        
        # Calculate and store IV rank and percentile
        iv_rank = self.calculate_iv_rank(symbol, iv)
        iv_percentile = self.calculate_iv_percentile(symbol, iv)
        
        if iv_rank is not None:
            iv_history.iv_rank = iv_rank
        if iv_percentile is not None:
            iv_history.iv_percentile = iv_percentile
        
        # Calculate historical IV averages
        cutoff_30d = date.today() - timedelta(days=30)
        cutoff_60d = date.today() - timedelta(days=60)
        cutoff_90d = date.today() - timedelta(days=90)
        cutoff_252d = date.today() - timedelta(days=252)
        
        iv_30d = db.session.query(func.avg(IVHistory.implied_volatility)).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_30d
        ).scalar()
        
        iv_60d = db.session.query(func.avg(IVHistory.implied_volatility)).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_60d
        ).scalar()
        
        iv_90d = db.session.query(func.avg(IVHistory.implied_volatility)).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_90d
        ).scalar()
        
        iv_252d = db.session.query(func.avg(IVHistory.implied_volatility)).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_252d
        ).scalar()
        
        if iv_30d:
            iv_history.iv_30d = iv_30d
        if iv_60d:
            iv_history.iv_60d = iv_60d
        if iv_90d:
            iv_history.iv_90d = iv_90d
        if iv_252d:
            iv_history.iv_252d = iv_252d
        
        db.session.commit()
        return iv_history
    
    def get_iv_history(self, symbol: str, days: int = 252) -> List[Dict]:
        """Get IV history for a symbol"""
        db = self._get_db()
        cutoff_date = date.today() - timedelta(days=days)
        
        iv_history = db.session.query(IVHistory).filter(
            IVHistory.symbol == symbol.upper(),
            IVHistory.date >= cutoff_date
        ).order_by(IVHistory.date).all()
        
        return [h.to_dict() for h in iv_history]
    
    def get_current_iv_metrics(self, symbol: str) -> Optional[Dict]:
        """Get current IV rank and percentile for a symbol"""
        db = self._get_db()
        today = date.today()
        
        iv_history = db.session.query(IVHistory).filter_by(
            symbol=symbol.upper(),
            date=today
        ).first()
        
        if not iv_history:
            return None
        
        return {
            'symbol': symbol.upper(),
            'date': today.isoformat(),
            'implied_volatility': iv_history.implied_volatility,
            'iv_rank': iv_history.iv_rank,
            'iv_percentile': iv_history.iv_percentile,
            'iv_30d': iv_history.iv_30d,
            'iv_60d': iv_history.iv_60d,
            'iv_90d': iv_history.iv_90d,
            'iv_252d': iv_history.iv_252d,
            'stock_price': iv_history.stock_price
        }

