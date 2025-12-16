from typing import Dict, List, Optional
from flask import current_app
from services.tradier_connector import TradierConnector
from services.iv_analyzer import IVAnalyzer

class MarketMoversService:
    """Service to identify market movers - high volume/volatility stocks"""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.iv_analyzer = IVAnalyzer()
    
    def get_market_movers(self, limit: int = 10) -> List[Dict]:
        """
        Get market movers - stocks with high volume, volatility, or price movement
        
        Args:
            limit: Maximum number of movers to return
            
        Returns:
            List of market mover symbols with metrics
        """
        # Popular symbols to scan (can be expanded)
        symbols_to_scan = [
            'SPY', 'QQQ', 'IWM', 'DIA',  # ETFs
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',  # Tech
            'JPM', 'BAC', 'WFC', 'GS',  # Finance
            'JNJ', 'PFE', 'UNH',  # Healthcare
            'XOM', 'CVX',  # Energy
            'NFLX', 'DIS',  # Media
            'AMD', 'INTC',  # Semiconductors
        ]
        
        movers = []
        
        for symbol in symbols_to_scan[:20]:  # Limit to avoid timeout
            try:
                # Get quote
                quote = self.tradier.get_quote(symbol)
                if 'quotes' not in quote or 'quote' not in quote['quotes']:
                    continue
                
                quote_data = quote['quotes']['quote']
                last = quote_data.get('last', 0)
                change = quote_data.get('change', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                avg_volume = quote_data.get('average_volume', 0)
                
                if not last or last == 0:
                    continue
                
                # Calculate volume ratio
                volume_ratio = (volume / avg_volume) if avg_volume > 0 else 0
                
                # Get IV rank
                iv_metrics = self.iv_analyzer.get_current_iv_metrics(symbol)
                iv_rank = iv_metrics.get('iv_rank', 0) if iv_metrics else 0
                
                # Calculate score based on multiple factors
                score = 0
                
                # Price movement (0-30 points)
                abs_change_percent = abs(change_percent)
                if abs_change_percent > 5:
                    score += 30
                elif abs_change_percent > 3:
                    score += 20
                elif abs_change_percent > 1:
                    score += 10
                
                # Volume spike (0-30 points)
                if volume_ratio > 2.0:
                    score += 30
                elif volume_ratio > 1.5:
                    score += 20
                elif volume_ratio > 1.2:
                    score += 10
                
                # IV rank (0-20 points) - high IV = more options opportunities
                if iv_rank > 70:
                    score += 20
                elif iv_rank > 50:
                    score += 15
                elif iv_rank > 30:
                    score += 10
                
                # Absolute volume (0-20 points)
                if volume > 10_000_000:
                    score += 20
                elif volume > 5_000_000:
                    score += 15
                elif volume > 1_000_000:
                    score += 10
                
                # Only include if score is significant
                if score >= 20:
                    mover = {
                        'symbol': symbol,
                        'current_price': last,
                        'change': change,
                        'change_percent': change_percent,
                        'volume': volume,
                        'volume_ratio': round(volume_ratio, 2),
                        'iv_rank': round(iv_rank, 1) if iv_rank else 0,
                        'score': score,
                        'movement_type': 'up' if change > 0 else 'down' if change < 0 else 'neutral'
                    }
                    movers.append(mover)
                    
            except Exception as e:
                current_app.logger.warning(f"Error getting market mover data for {symbol}: {e}")
                continue
        
        # Sort by score (highest first)
        movers.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return movers[:limit]

