from typing import Dict, List
from datetime import datetime, timedelta
from services.options_analyzer import OptionsAnalyzer
from services.tradier_connector import TradierConnector
from flask import current_app

class AISignals:
    """AI-powered signal generation service"""
    
    def __init__(self):
        self.options_analyzer = OptionsAnalyzer()
        self.tradier = TradierConnector()
    
    def generate_signals(self, symbol: str, user_preference: str = 'balanced') -> List[Dict]:
        """
        Generate AI-powered trading signals for a symbol
        
        Args:
            symbol: Stock symbol
            user_preference: User's strategy preference
        
        Returns:
            List of signal recommendations
        """
        signals = []
        
        # Get stock quote
        quote = self.tradier.get_quote(symbol)
        if 'quotes' not in quote:
            return signals
        
        quote_data = quote['quotes']['quote']
        stock_price = quote_data.get('last', 0)
        
        # Get available expirations
        expirations = self.tradier.get_options_expirations(symbol)
        if not expirations:
            return signals
        
        # Analyze next 3 expirations
        for expiration in expirations[:3]:
            options = self.options_analyzer.analyze_options_chain(
                symbol=symbol,
                expiration=expiration,
                preference=user_preference,
                stock_price=stock_price
            )
            
            # Get top 3 recommendations
            top_options = options[:3]
            for option in top_options:
                signal = {
                    'symbol': symbol,
                    'option_symbol': option['option_symbol'],
                    'description': option['description'],
                    'contract_type': option['contract_type'],
                    'strike': option['strike'],
                    'expiration_date': option['expiration_date'],
                    'score': option['score'],
                    'category': option['category'],
                    'explanation': option['explanation'],
                    'current_price': option['mid_price'],
                    'delta': option['delta'],
                    'implied_volatility': option['implied_volatility'],
                    'days_to_expiration': option['days_to_expiration'],
                    'signal_type': self._determine_signal_type(option, user_preference),
                    'confidence': self._calculate_confidence(option['score']),
                    'generated_at': datetime.utcnow().isoformat()
                }
                signals.append(signal)
        
        # Sort by score
        signals.sort(key=lambda x: x['score'], reverse=True)
        return signals[:5]  # Return top 5 signals
    
    def _determine_signal_type(self, option: Dict, preference: str) -> str:
        """Determine signal type based on option and preference"""
        if preference == 'income':
            return 'income_generation'
        elif preference == 'growth':
            return 'growth_opportunity'
        else:
            return 'balanced_play'
    
    def _calculate_confidence(self, score: float) -> str:
        """Calculate confidence level from score"""
        if score >= 0.75:
            return 'high'
        elif score >= 0.60:
            return 'medium'
        else:
            return 'low'

