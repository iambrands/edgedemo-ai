from typing import Dict, List, Optional
from flask import current_app
from services.tradier_connector import TradierConnector
from services.iv_analyzer import IVAnalyzer

class MarketMoversService:
    """Service to identify market movers - high volume/volatility stocks"""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.iv_analyzer = IVAnalyzer()
    
    def _get_top_symbols_list(self) -> List[str]:
        """
        Get comprehensive list of symbols to scan for market movers
        Returns top stocks across all sectors
        """
        return [
            # Major ETFs (high volume, good for options)
            'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'XLF', 'XLK', 'XLE', 'XLV',
            
            # Technology (high volume, high volatility)
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC',
            'NFLX', 'CRM', 'ORCL', 'ADBE', 'CSCO', 'AVGO', 'QCOM', 'TXN', 'MU', 'AMAT',
            
            # Finance (good options volume)
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'COF', 'AXP',
            
            # Healthcare (volatile, good for options)
            'JNJ', 'PFE', 'UNH', 'ABBV', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD',
            
            # Energy (volatile)
            'XOM', 'CVX', 'SLB', 'COP', 'EOG', 'MPC', 'VLO', 'PSX', 'HAL', 'OXY',
            
            # Consumer (high volume)
            'WMT', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'COST', 'TJX', 'DG',
            
            # Media/Entertainment
            'DIS', 'CMCSA', 'NFLX', 'FOXA', 'PARA', 'WBD',
            
            # Semiconductors (very volatile)
            'NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC',
            
            # Biotech (high volatility)
            'GILD', 'BIIB', 'REGN', 'VRTX', 'ILMN', 'ALXN', 'CELG', 'BMRN',
            
            # Retail
            'AMZN', 'WMT', 'TGT', 'HD', 'LOW', 'COST', 'TJX', 'DG', 'BBY', 'GPS',
            
            # Industrial
            'BA', 'CAT', 'GE', 'HON', 'LMT', 'RTX', 'DE', 'EMR', 'ETN', 'ITW',
            
            # Communication Services
            'GOOGL', 'META', 'NFLX', 'DIS', 'CMCSA', 'T', 'VZ', 'TMUS', 'CHTR',
            
            # Additional high-volume stocks
            'UBER', 'LYFT', 'RIVN', 'LCID', 'F', 'GM', 'FORD', 'PLTR', 'SOFI', 'HOOD',
            'RBLX', 'COIN', 'SQ', 'PYPL', 'SHOP', 'ZM', 'DOCU', 'CRWD', 'NET', 'DDOG',
        ]
    
    def get_market_movers(self, limit: int = 10) -> List[Dict]:
        """
        Get market movers - pre-selected high volume/volatility stocks and indices
        
        Returns a curated list of 10 stocks/indices that typically meet criteria:
        - High volume (always liquid)
        - High volatility (good for options trading)
        - Significant price movement potential
        
        Args:
            limit: Maximum number of movers to return (default 10)
            
        Returns:
            List of market mover symbols with current real-time metrics
        """
        # Pre-selected list of 10 stocks/indices that typically meet criteria
        # These are always high-volume, liquid, and good for options trading
        curated_symbols = [
            'SPY',   # S&P 500 ETF - most liquid, always high volume
            'QQQ',   # Nasdaq 100 ETF - tech-heavy, high volatility
            'IWM',   # Russell 2000 ETF - small cap volatility
            'AAPL',  # Apple - mega-cap, high volume
            'MSFT',  # Microsoft - mega-cap, high volume
            'NVDA',  # NVIDIA - high volatility, options favorite
            'TSLA',  # Tesla - very high volatility
            'AMZN',  # Amazon - mega-cap, high volume
            'META',  # Meta - high volatility
            'GOOGL', # Google - mega-cap, high volume
        ]
        
        movers = []
        
        try:
            from flask import current_app
            current_app.logger.info(f"📈 Fetching market movers for {len(curated_symbols)} pre-selected symbols")
        except (RuntimeError, AttributeError):
            pass
        
        # Fetch current prices for each symbol (fast - just quote calls)
        for symbol in curated_symbols[:limit]:
            try:
                # Get quote (fast API call)
                quote = self.tradier.get_quote(symbol)
                if 'quotes' not in quote or 'quote' not in quote['quotes']:
                    continue
                
                quote_data = quote['quotes']['quote']
                last = quote_data.get('last', 0)
                change = quote_data.get('change', 0)
                change_percent = quote_data.get('change_percentage', 0)
                volume = quote_data.get('volume', 0)
                avg_volume = quote_data.get('average_volume', 0)
                company_name = quote_data.get('description', symbol)
                
                if not last or last == 0:
                    continue
                
                # Calculate volume ratio
                volume_ratio = (volume / avg_volume) if avg_volume > 0 else 1.0
                
                # Create mover entry (all these symbols are considered "movers" by default)
                mover = {
                    'symbol': symbol,
                    'company_name': company_name,
                    'current_price': last,
                    'change': change,
                    'change_percent': round(change_percent, 2) if change_percent else 0,
                    'volume': volume,
                    'volume_ratio': round(volume_ratio, 2),
                    'iv_rank': 0,  # Not calculated for speed
                    'score': 10,  # Default score - all curated symbols are high-quality
                    'movement_type': 'up' if change > 0 else 'down' if change < 0 else 'neutral'
                }
                movers.append(mover)
                    
            except Exception as e:
                try:
                    from flask import current_app
                    current_app.logger.warning(f"Error fetching data for {symbol}: {e}")
                except (RuntimeError, AttributeError):
                    pass
                continue
        
        # Sort by price change percentage (most active first)
        movers.sort(key=lambda x: abs(x.get('change_percent', 0)), reverse=True)
        
        # Log results
        try:
            from flask import current_app
            current_app.logger.info(
                f"✅ Market movers fetched: {len(movers)} symbols with real-time data"
            )
            if movers:
                top_3 = [f"{m.get('symbol')} ({m.get('change_percent', 0):+.2f}%)" for m in movers[:3]]
                current_app.logger.info(f"   Top movers: {', '.join(top_3)}")
        except (RuntimeError, AttributeError):
            pass
        
        # Return all movers (up to limit)
        return movers[:limit]
    
    def get_market_movers_by_criteria(self, min_volume_ratio: float = 1.2, 
                                     min_change_percent: float = 1.0,
                                     min_iv_rank: float = 20.0,
                                     limit: int = 10) -> List[Dict]:
        """
        Get market movers filtered by specific criteria
        
        Args:
            min_volume_ratio: Minimum volume ratio (e.g., 1.2 = 20% above average)
            min_change_percent: Minimum price change percentage
            min_iv_rank: Minimum IV rank for options opportunities
            limit: Maximum number of movers to return
            
        Returns:
            List of market mover symbols that meet all criteria
        """
        all_movers = self.get_market_movers(limit=100)  # Get more to filter
        
        filtered = []
        for mover in all_movers:
            volume_ratio = mover.get('volume_ratio', 0)
            change_percent = abs(mover.get('change_percent', 0))
            iv_rank = mover.get('iv_rank', 0)
            
            if (volume_ratio >= min_volume_ratio and 
                change_percent >= min_change_percent and 
                iv_rank >= min_iv_rank):
                filtered.append(mover)
        
        return filtered[:limit]
