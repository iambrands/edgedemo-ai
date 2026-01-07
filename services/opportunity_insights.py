from typing import Dict, List, Optional
from datetime import datetime, date, timedelta
from flask import current_app
from services.earnings_calendar import EarningsCalendarService
from services.iv_analyzer import IVAnalyzer
from services.options_flow import OptionsFlowAnalyzer
from services.tradier_connector import TradierConnector

class OpportunityInsights:
    """Combined service for earnings, IV context, and unusual options activity"""
    
    def __init__(self):
        self.earnings_service = EarningsCalendarService()
        self.iv_analyzer = IVAnalyzer()
        self.flow_analyzer = OptionsFlowAnalyzer()
        self.tradier = TradierConnector()
    
    def get_symbol_insights(self, symbol: str, user_id: int = None) -> Dict:
        """
        Get comprehensive insights for a symbol:
        - Earnings information
        - IV Rank context
        - Unusual options activity
        """
        symbol = symbol.upper()
        insights = {
            'symbol': symbol,
            'earnings': None,
            'iv_context': None,
            'unusual_activity': None,
            'summary': {}
        }
        
        # 1. Get earnings information
        try:
            earnings = self.earnings_service.get_or_fetch_earnings_for_symbol(symbol, user_id)
            if earnings:
                today = date.today()
                days_until = (earnings['earnings_date'] - today).days
                insights['earnings'] = {
                    **earnings,
                    'days_until': days_until,
                    'is_this_week': days_until <= 7,
                    'is_this_month': days_until <= 30,
                    'has_upcoming': True
                }
        except Exception as e:
            try:
                current_app.logger.warning(f"Error fetching earnings for {symbol}: {e}")
            except:
                pass
        
        # 2. Get IV Rank context
        try:
            iv_metrics = self.iv_analyzer.get_current_iv_metrics(symbol)
            if iv_metrics:
                iv_rank = iv_metrics.get('iv_rank', 0)
                iv_percentile = iv_metrics.get('iv_percentile', 0)
                current_iv = iv_metrics.get('implied_volatility', 0)
                
                # Determine IV context
                iv_level = 'low'
                iv_recommendation = 'buy'
                if iv_rank >= 70:
                    iv_level = 'high'
                    iv_recommendation = 'sell'
                elif iv_rank >= 50:
                    iv_level = 'moderate'
                    iv_recommendation = 'neutral'
                
                insights['iv_context'] = {
                    **iv_metrics,
                    'iv_level': iv_level,
                    'iv_recommendation': iv_recommendation,
                    'interpretation': self._get_iv_interpretation(iv_rank, iv_percentile)
                }
        except Exception as e:
            try:
                current_app.logger.warning(f"Error fetching IV context for {symbol}: {e}")
            except:
                pass
        
        # 3. Get unusual options activity (quick check)
        try:
            unusual_volume = self.flow_analyzer.detect_unusual_volume(symbol)
            insights['unusual_activity'] = {
                'unusual_volume_count': len(unusual_volume),
                'has_unusual_activity': len(unusual_volume) > 0,
                'top_3_unusual': unusual_volume[:3] if unusual_volume else []
            }
        except Exception as e:
            try:
                current_app.logger.warning(f"Error fetching unusual activity for {symbol}: {e}")
            except:
                pass
        
        # Generate summary
        insights['summary'] = self._generate_summary(insights)
        
        return insights
    
    def _get_iv_interpretation(self, iv_rank: float, iv_percentile: float) -> str:
        """Get human-readable IV interpretation"""
        if iv_rank is None:
            return "IV data not available"
        
        if iv_rank >= 75:
            return f"Very High IV Rank ({iv_rank:.0f}%) - Options are expensive. Consider selling premium strategies."
        elif iv_rank >= 60:
            return f"High IV Rank ({iv_rank:.0f}%) - Options are relatively expensive. Good for selling, cautious buying."
        elif iv_rank >= 40:
            return f"Moderate IV Rank ({iv_rank:.0f}%) - Options fairly priced. Balanced approach works."
        elif iv_rank >= 25:
            return f"Low IV Rank ({iv_rank:.0f}%) - Options are relatively cheap. Good for buying strategies."
        else:
            return f"Very Low IV Rank ({iv_rank:.0f}%) - Options are cheap. Consider buying, avoid selling premium."
    
    def _generate_summary(self, insights: Dict) -> Dict:
        """Generate actionable summary"""
        summary = {
            'key_insights': [],
            'action_items': [],
            'risk_level': 'moderate'
        }
        
        # Earnings insights
        if insights.get('earnings') and insights['earnings'].get('has_upcoming'):
            days_until = insights['earnings']['days_until']
            if days_until <= 7:
                summary['key_insights'].append(f"⚠️ Earnings in {days_until} days - High volatility expected")
                summary['action_items'].append("Consider closing positions before earnings or selling premium")
                summary['risk_level'] = 'high'
            elif days_until <= 30:
                summary['key_insights'].append(f"📅 Earnings in {days_until} days - IV may increase")
                summary['action_items'].append("Monitor IV levels as earnings approach")
        
        # IV insights
        iv_context = insights.get('iv_context')
        if iv_context:
            iv_level = iv_context.get('iv_level', 'moderate')
            if iv_level == 'high':
                summary['key_insights'].append(f"📈 High IV Rank ({iv_context.get('iv_rank', 0):.0f}%) - Options expensive")
                summary['action_items'].append("Consider selling premium (covered calls, cash-secured puts)")
            elif iv_level == 'low':
                summary['key_insights'].append(f"📉 Low IV Rank ({iv_context.get('iv_rank', 0):.0f}%) - Options cheap")
                summary['action_items'].append("Consider buying strategies (long calls/puts)")
        
        # Unusual activity
        unusual = insights.get('unusual_activity')
        if unusual and unusual.get('has_unusual_activity'):
            count = unusual.get('unusual_volume_count', 0)
            summary['key_insights'].append(f"🔥 {count} unusual volume option(s) detected")
            summary['action_items'].append("Review unusual activity - may indicate institutional interest")
        
        return summary
    
    def get_batch_insights(self, symbols: List[str], user_id: int = None) -> Dict[str, Dict]:
        """Get insights for multiple symbols"""
        results = {}
        for symbol in symbols:
            try:
                results[symbol] = self.get_symbol_insights(symbol, user_id)
            except Exception as e:
                try:
                    current_app.logger.warning(f"Error getting insights for {symbol}: {e}")
                except:
                    pass
                results[symbol] = {'symbol': symbol, 'error': str(e)}
        return results

