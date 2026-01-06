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
        Get market movers - stocks with high volume, volatility, or price movement
        
        Automatically discovers stocks that meet criteria:
        - High volume (above average)
        - High volatility (IV rank > 30)
        - Significant price movement (>1%)
        
        Args:
            limit: Maximum number of movers to return
            
        Returns:
            List of market mover symbols with metrics
        """
        symbols_to_scan = self._get_top_symbols_list()
        movers = []
        errors = 0
        max_errors = 20  # Increased to allow more errors before stopping
        scanned_count = 0
        
        # Limit initial scan to first 50 symbols for speed (can expand if needed)
        # Focus on most liquid/high-volume stocks first
        symbols_to_scan_limited = symbols_to_scan[:50]
        
        try:
            from flask import current_app
            current_app.logger.info(f"📈 Starting market movers scan: {len(symbols_to_scan_limited)} symbols (from {len(symbols_to_scan)} total)")
        except (RuntimeError, AttributeError):
            pass
        
        # Scan symbols (with error handling)
        for symbol in symbols_to_scan_limited:
            scanned_count += 1
            if errors >= max_errors:
                try:
                    from flask import current_app
                    current_app.logger.warning(f"Too many errors ({errors}), stopping market movers scan")
                except (RuntimeError, AttributeError):
                    pass
                break
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
                company_name = quote_data.get('description', symbol)
                
                if not last or last == 0:
                    continue
                
                # Calculate volume ratio
                volume_ratio = (volume / avg_volume) if avg_volume > 0 else 0
                
                # Get IV rank (for options opportunities)
                iv_metrics = self.iv_analyzer.get_current_iv_metrics(symbol)
                iv_rank = iv_metrics.get('iv_rank', 0) if iv_metrics else 0
                
                # Calculate score based on multiple factors
                score = 0
                
                # Price movement (0-30 points) - significant moves are important
                abs_change_percent = abs(change_percent) if change_percent else 0
                if abs_change_percent > 5:
                    score += 30
                elif abs_change_percent > 3:
                    score += 20
                elif abs_change_percent > 1:
                    score += 10
                elif abs_change_percent > 0.5:
                    score += 5
                
                # Volume spike (0-30 points) - high volume = interest
                if volume_ratio > 2.0:
                    score += 30
                elif volume_ratio > 1.5:
                    score += 20
                elif volume_ratio > 1.2:
                    score += 10
                elif volume_ratio > 1.0:
                    score += 5
                
                # IV rank (0-20 points) - high IV = more options opportunities
                if iv_rank > 70:
                    score += 20
                elif iv_rank > 50:
                    score += 15
                elif iv_rank > 30:
                    score += 10
                elif iv_rank > 20:
                    score += 5
                
                # Absolute volume (0-20 points) - very high volume stocks
                if volume > 20_000_000:
                    score += 20
                elif volume > 10_000_000:
                    score += 15
                elif volume > 5_000_000:
                    score += 10
                elif volume > 1_000_000:
                    score += 5
                
                # Lower the threshold significantly to ensure we get results
                # Changed from score >= 20 to score >= 5 to catch more opportunities
                # This ensures we find stocks even on quiet days
                if score >= 5:
                    mover = {
                        'symbol': symbol,
                        'company_name': company_name,
                        'current_price': last,
                        'change': change,
                        'change_percent': round(change_percent, 2) if change_percent else 0,
                        'volume': volume,
                        'volume_ratio': round(volume_ratio, 2),
                        'iv_rank': round(iv_rank, 1) if iv_rank else 0,
                        'score': score,
                        'movement_type': 'up' if change > 0 else 'down' if change < 0 else 'neutral'
                    }
                    movers.append(mover)
                    
            except Exception as e:
                errors += 1
                try:
                    from flask import current_app
                    current_app.logger.warning(f"Error getting market mover data for {symbol}: {e}")
                except (RuntimeError, AttributeError):
                    pass
                continue
        
        # If we didn't find enough movers, try a fallback with lower threshold
        if len(movers) < limit:
            try:
                from flask import current_app
                current_app.logger.info(f"Found {len(movers)} movers, trying fallback with lower threshold")
            except (RuntimeError, AttributeError):
                pass
            # Re-scan with lower score threshold
            for symbol in symbols_to_scan:
                if len(movers) >= limit * 2:  # Get 2x to have options
                    break
                if symbol in [m.get('symbol') for m in movers]:
                    continue  # Skip already found
                
                try:
                    quote = self.tradier.get_quote(symbol)
                    if 'quotes' not in quote or 'quote' not in quote['quotes']:
                        continue
                    
                    quote_data = quote['quotes']['quote']
                    last = quote_data.get('last', 0)
                    change_percent = quote_data.get('change_percentage', 0)
                    volume = quote_data.get('volume', 0)
                    avg_volume = quote_data.get('average_volume', 0)
                    company_name = quote_data.get('description', symbol)
                    
                    if not last or last == 0:
                        continue
                    
                    volume_ratio = (volume / avg_volume) if avg_volume > 0 else 0
                    iv_metrics = self.iv_analyzer.get_current_iv_metrics(symbol)
                    iv_rank = iv_metrics.get('iv_rank', 0) if iv_metrics else 0
                    
                    # Lower threshold - just need some activity
                    if (abs(change_percent) > 0.5 or volume_ratio > 1.0 or iv_rank > 15):
                        score = 5  # Minimum score
                        mover = {
                            'symbol': symbol,
                            'company_name': company_name,
                            'current_price': last,
                            'change': quote_data.get('change', 0),
                            'change_percent': round(change_percent, 2) if change_percent else 0,
                            'volume': volume,
                            'volume_ratio': round(volume_ratio, 2),
                            'iv_rank': round(iv_rank, 1) if iv_rank else 0,
                            'score': score,
                            'movement_type': 'up' if quote_data.get('change', 0) > 0 else 'down' if quote_data.get('change', 0) < 0 else 'neutral'
                        }
                        movers.append(mover)
                except:
                    continue
        
        # Sort by score (highest first)
        movers.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        # If still no movers found, return top volume stocks as fallback
        # This ensures the page always shows something
        if len(movers) == 0:
            try:
                from flask import current_app
                current_app.logger.warning(
                    f"⚠️ No market movers found with criteria. Returning top volume stocks as fallback."
                )
            except (RuntimeError, AttributeError):
                pass
            
            # Fallback: return top 10 most liquid stocks (ETFs and mega-caps)
            fallback_symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'IWM']
            for symbol in fallback_symbols[:limit]:
                try:
                    quote = self.tradier.get_quote(symbol)
                    if 'quotes' not in quote or 'quote' not in quote['quotes']:
                        continue
                    
                    quote_data = quote['quotes']['quote']
                    last = quote_data.get('last', 0)
                    change = quote_data.get('change', 0)
                    change_percent = quote_data.get('change_percentage', 0)
                    volume = quote_data.get('volume', 0)
                    company_name = quote_data.get('description', symbol)
                    
                    if last and last > 0:
                        movers.append({
                            'symbol': symbol,
                            'company_name': company_name,
                            'current_price': last,
                            'change': change,
                            'change_percent': round(change_percent, 2) if change_percent else 0,
                            'volume': volume,
                            'volume_ratio': 1.0,  # Default
                            'iv_rank': 0,  # Will be calculated if needed
                            'score': 5,  # Minimum score for fallback
                            'movement_type': 'up' if change > 0 else 'down' if change < 0 else 'neutral'
                        })
                except:
                    continue
        
        # Log results
        try:
            from flask import current_app
            current_app.logger.info(
                f"📊 Market movers scan complete: {len(movers)} movers found "
                f"(scanned {scanned_count} symbols, {errors} errors)"
            )
            if movers:
                top_5 = [f"{m.get('symbol')} (score:{m.get('score')})" for m in movers[:5]]
                current_app.logger.info(f"   Top 5: {', '.join(top_5)}")
        except (RuntimeError, AttributeError):
            pass
        
        # Return top movers
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
