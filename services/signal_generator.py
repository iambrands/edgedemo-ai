from typing import Dict, List, Optional
from datetime import datetime
from services.technical_analyzer import TechnicalAnalyzer
from services.options_analyzer import OptionsAnalyzer
from services.iv_analyzer import IVAnalyzer
from flask import current_app

class SignalGenerator:
    """Generate trading signals from technical and options analysis"""
    
    def __init__(self):
        self.technical_analyzer = TechnicalAnalyzer()
        self.options_analyzer = OptionsAnalyzer()
        self.iv_analyzer = IVAnalyzer()
    
    def generate_signals(self, symbol: str, automation_preferences: Dict = None, custom_filters: Dict = None) -> Dict:
        """
        Generate comprehensive trading signals for a symbol
        
        Args:
            symbol: Stock symbol
            automation_preferences: User automation preferences (min_confidence, etc.)
            custom_filters: Custom alert filter settings
        
        Returns:
            Dict with signals and recommendations
        """
        # Run technical analysis with custom filters
        technical_analysis = self.technical_analyzer.analyze(symbol, custom_filters=custom_filters)
        
        if 'error' in technical_analysis:
            return {'error': technical_analysis['error']}
        
        # Get IV metrics
        iv_metrics = self.iv_analyzer.get_current_iv_metrics(symbol)
        
        # Get options chain for best expiration
        # (Would need to determine best expiration based on preferences)
        # For now, use a default expiration
        
        # Combine signals
        signals = self._combine_signals(
            technical_analysis,
            iv_metrics,
            automation_preferences or {}
        )
        
        return {
            'symbol': symbol,
            'signals': signals,
            'technical_analysis': technical_analysis,
            'iv_metrics': iv_metrics,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _combine_signals(self, technical_analysis: Dict, iv_metrics: Optional[Dict], 
                        preferences: Dict) -> Dict:
        """Combine technical and IV signals into final recommendations"""
        
        technical_signals = technical_analysis.get('signals', {})
        overall_technical = technical_signals.get('overall', {})
        
        # Base confidence from technical analysis
        base_confidence = overall_technical.get('confidence', 0.0)
        direction = overall_technical.get('direction', 'neutral')
        
        # Adjust based on IV
        iv_adjustment = 0.0
        iv_reason = ""
        
        if iv_metrics:
            iv_rank = iv_metrics.get('iv_rank')
            iv_percentile = iv_metrics.get('iv_percentile')
            
            if iv_rank is not None:
                # High IV rank (70+) is good for selling options
                # Low IV rank (30-) is good for buying options
                if direction == 'bullish' or direction == 'bearish':
                    if iv_rank > 70:
                        # High IV - good for selling premium
                        iv_adjustment = 0.10
                        iv_reason = f"High IV Rank ({iv_rank:.1f}) - favorable for option selling"
                    elif iv_rank < 30:
                        # Low IV - good for buying options
                        iv_adjustment = 0.05
                        iv_reason = f"Low IV Rank ({iv_rank:.1f}) - favorable for option buying"
                else:
                    # Neutral - high IV is still good
                    if iv_rank > 70:
                        iv_adjustment = 0.05
                        iv_reason = f"High IV Rank ({iv_rank:.1f}) - consider selling premium"
        
        # Final confidence
        final_confidence = min(1.0, base_confidence + iv_adjustment)
        
        # Filter by minimum confidence if specified
        min_confidence = preferences.get('min_confidence', 0.0)
        if final_confidence < min_confidence:
            return {
                'action': 'hold',
                'reason': f'Confidence ({final_confidence:.2f}) below minimum ({min_confidence:.2f})',
                'confidence': final_confidence,
                'direction': direction
            }
        
        # Determine action
        if direction == 'bullish' and final_confidence >= min_confidence:
            action = 'buy_call'
            reason = f"Bullish signal with {final_confidence:.1%} confidence. {iv_reason}" if iv_reason else f"Bullish signal with {final_confidence:.1%} confidence"
        elif direction == 'bearish' and final_confidence >= min_confidence:
            action = 'buy_put'
            reason = f"Bearish signal with {final_confidence:.1%} confidence. {iv_reason}" if iv_reason else f"Bearish signal with {final_confidence:.1%} confidence"
        else:
            action = 'hold'
            reason = f"Neutral or low confidence signal ({final_confidence:.1%})"
        
        return {
            'action': action,
            'direction': direction,
            'confidence': final_confidence,
            'reason': reason,
            'technical_confidence': base_confidence,
            'iv_adjustment': iv_adjustment,
            'signal_count': overall_technical.get('signal_count', 0),
            'recommended': final_confidence >= min_confidence
        }

