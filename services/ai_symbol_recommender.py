from typing import Dict, List, Optional
from datetime import datetime
from flask import current_app
from services.signal_generator import SignalGenerator
from services.tradier_connector import TradierConnector
from services.iv_analyzer import IVAnalyzer
from models.stock import Stock
from models.position import Position
from models.trade import Trade

class AISymbolRecommender:
    """AI-powered symbol recommendation service based on user preferences and patterns"""
    
    def __init__(self):
        self.signal_generator = SignalGenerator()
        self.tradier = TradierConnector()
        self.iv_analyzer = IVAnalyzer()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def get_personalized_recommendations(self, user_id: int, limit: int = 10) -> List[Dict]:
        """
        Get personalized symbol recommendations for a user
        
        Args:
            user_id: User ID
            limit: Maximum number of recommendations to return
            
        Returns:
            List of recommended symbols with reasoning
        """
        db = self._get_db()
        
        # Get user preferences
        from models.user import User
        user = db.session.query(User).get(user_id)
        if not user:
            return []
        
        risk_tolerance = user.risk_tolerance or 'moderate'
        
        # Analyze user's trading patterns
        user_patterns = self._analyze_user_patterns(user_id)
        
        # Get candidate symbols from multiple sources
        candidates = []
        
        # 1. Symbols from user's watchlist (if they have one)
        watchlist = db.session.query(Stock).filter_by(user_id=user_id).all()
        watchlist_symbols = [stock.symbol for stock in watchlist]
        
        # 2. Popular symbols that match user's risk profile (always return these as fallback)
        popular_symbols = self._get_risk_appropriate_symbols(risk_tolerance)
        
        # 3. Symbols similar to user's successful trades
        similar_symbols = self._get_similar_symbols(user_patterns)
        
        # Combine all candidates (remove duplicates)
        all_candidates = list(set(watchlist_symbols + popular_symbols + similar_symbols))
        
        # Always ensure we have at least the popular symbols (fallback)
        if not all_candidates:
            all_candidates = popular_symbols
        
        # Limit to avoid timeout - use fewer symbols for faster response
        all_candidates = all_candidates[:10]
        
        # Score each candidate (with timeout protection)
        recommendations = []
        for symbol in all_candidates:
            try:
                # Quick scoring - skip slow signal generation for speed
                score_data = self._score_symbol_fast(symbol, user, user_patterns, risk_tolerance)
                if score_data['score'] > 0:
                    recommendations.append({
                        'symbol': symbol,
                        'score': score_data['score'],
                        'confidence': score_data['confidence'],
                        'reason': score_data.get('reason', score_data.get('reasoning', 'Good match for your risk profile')),
                        'strategy': score_data.get('strategy', 'balanced'),
                        'risk_level': score_data['risk_level'],
                        'signal_direction': score_data.get('signal_direction', 'neutral'),
                        'iv_rank': score_data.get('iv_rank', 0),
                        'current_price': score_data.get('current_price'),
                        'match_reasons': score_data.get('match_reasons', [])
                    })
            except Exception as e:
                current_app.logger.warning(f"Error scoring symbol {symbol}: {e}")
                # Add symbol anyway with default score if scoring fails
                recommendations.append({
                    'symbol': symbol,
                    'score': 50,
                    'confidence': 0.6,
                    'reason': f'Recommended based on your {risk_tolerance} risk tolerance',
                    'strategy': 'balanced',
                    'risk_level': 'moderate_opportunity',
                    'signal_direction': 'neutral',
                    'iv_rank': 0,
                    'current_price': None,
                    'match_reasons': [f'Matches {risk_tolerance} risk profile']
                })
                continue
        
        # Sort by score (highest first)
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        # Always return at least the popular symbols if we have no recommendations
        if not recommendations:
            for symbol in popular_symbols[:limit]:
                recommendations.append({
                    'symbol': symbol,
                    'score': 50,
                    'confidence': 0.6,
                    'reason': f'Recommended based on your {risk_tolerance} risk tolerance',
                    'strategy': 'balanced',
                    'risk_level': 'moderate_opportunity',
                    'signal_direction': 'neutral',
                    'iv_rank': 0,
                    'current_price': None,
                    'match_reasons': [f'Matches {risk_tolerance} risk profile']
                })
        
        return recommendations[:limit]
    
    def _analyze_user_patterns(self, user_id: int) -> Dict:
        """Analyze user's trading patterns to understand preferences"""
        db = self._get_db()
        
        patterns = {
            'favorite_symbols': [],
            'preferred_sectors': [],
            'avg_position_size': 0,
            'preferred_strategy': 'balanced',
            'success_rate': 0,
            'total_trades': 0
        }
        
        # Get user's trades
        trades = db.session.query(Trade).filter_by(user_id=user_id).all()
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        
        if not trades and not positions:
            return patterns
        
        # Count symbol frequency
        symbol_counts = {}
        for trade in trades:
            symbol = trade.symbol
            symbol_counts[symbol] = symbol_counts.get(symbol, 0) + 1
        
        # Get top 5 most traded symbols
        patterns['favorite_symbols'] = sorted(
            symbol_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]
        patterns['favorite_symbols'] = [s[0] for s in patterns['favorite_symbols']]
        
        # Calculate success rate
        profitable_trades = [t for t in trades if t.realized_pnl and t.realized_pnl > 0]
        patterns['total_trades'] = len(trades)
        if patterns['total_trades'] > 0:
            patterns['success_rate'] = len(profitable_trades) / patterns['total_trades']
        
        # Calculate average position size
        if positions:
            total_size = sum(p.quantity * p.entry_price for p in positions)
            patterns['avg_position_size'] = total_size / len(positions)
        
        return patterns
    
    def _get_risk_appropriate_symbols(self, risk_tolerance: str) -> List[str]:
        """Get symbols appropriate for user's risk tolerance"""
        # Conservative: Large cap, stable stocks
        if risk_tolerance == 'low':
            return ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'JNJ', 'PG', 'KO', 'V', 'MA']
        
        # Moderate: Mix of large and mid cap
        elif risk_tolerance == 'moderate':
            return ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX']
        
        # Aggressive: Higher volatility, growth stocks
        else:  # high
            return ['TSLA', 'NVDA', 'AMD', 'NFLX', 'META', 'SQ', 'PLTR', 'RIVN', 'LCID', 'SPY']
    
    def _get_similar_symbols(self, user_patterns: Dict) -> List[str]:
        """Get symbols similar to user's trading patterns"""
        # If user has favorite symbols, suggest similar ones
        favorite_symbols = user_patterns.get('favorite_symbols', [])
        
        # For now, return empty - could expand to sector/industry analysis
        # This would require additional data sources
        return []
    
    def _score_symbol_fast(self, symbol: str, user, user_patterns: Dict, risk_tolerance: str) -> Dict:
        """Fast scoring without slow signal generation"""
        score = 0
        match_reasons = []
        confidence = 0.6  # Default confidence
        
        try:
            # Get quote (fast)
            quote = self.tradier.get_quote(symbol)
            current_price = None
            if 'quotes' in quote and 'quote' in quote['quotes']:
                current_price = quote['quotes']['quote'].get('last', 0)
            
            # Skip slow signal generation and IV rank for speed
            # Just use basic scoring based on user patterns
            
            # 1. User's favorite symbols (0-40 points)
            if symbol in user_patterns.get('favorite_symbols', []):
                score += 40
                match_reasons.append("You've traded this symbol before")
                confidence = 0.8
            
            # 2. Risk alignment (0-30 points)
            if risk_tolerance == 'low' and symbol in ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL']:
                score += 30
                match_reasons.append("Matches your conservative risk profile")
            elif risk_tolerance == 'moderate' and symbol in ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META']:
                score += 30
                match_reasons.append("Matches your moderate risk profile")
            elif risk_tolerance == 'high' and symbol in ['TSLA', 'NVDA', 'AMD', 'NFLX', 'META', 'SQ', 'PLTR']:
                score += 30
                match_reasons.append("Matches your aggressive risk profile")
            
            # 3. Default score for popular symbols (0-30 points)
            if symbol in ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META']:
                score += 30
                match_reasons.append("High-volume, liquid stock - good for options")
            
            # Determine risk level
            if score >= 60:
                risk_level = 'high_opportunity'
            elif score >= 40:
                risk_level = 'moderate_opportunity'
            else:
                risk_level = 'low_opportunity'
            
            # Generate simple reasoning
            reasons_text = ", ".join(match_reasons[:2]) if match_reasons else f"Good match for {risk_tolerance} risk tolerance"
            reasoning = f"{symbol} is recommended based on your {risk_tolerance} risk profile. {reasons_text}."
            
            return {
                'score': score if score > 0 else 50,  # Minimum score
                'confidence': confidence,
                'reasoning': reasoning,
                'reason': reasoning,  # Alias for frontend
                'strategy': 'balanced',
                'risk_level': risk_level,
                'signal_direction': 'neutral',
                'iv_rank': 0,
                'current_price': current_price,
                'match_reasons': match_reasons
            }
            
        except Exception as e:
            current_app.logger.error(f"Error in fast scoring for {symbol}: {e}")
            return {
                'score': 50,
                'confidence': 0.6,
                'reasoning': f'Recommended based on your {risk_tolerance} risk tolerance',
                'reason': f'Recommended based on your {risk_tolerance} risk tolerance',
                'strategy': 'balanced',
                'risk_level': 'moderate_opportunity',
                'signal_direction': 'neutral',
                'iv_rank': 0,
                'current_price': None,
                'match_reasons': [f'Matches {risk_tolerance} risk profile']
            }
    
    def _score_symbol(self, symbol: str, user, user_patterns: Dict, risk_tolerance: str) -> Dict:
        """Score a symbol based on multiple factors"""
        score = 0
        match_reasons = []
        confidence = 0.0
        
        try:
            # Get current signals
            signals = self.signal_generator.generate_signals(
                symbol,
                {
                    'min_confidence': 0.50,
                    'strategy_type': 'balanced'
                }
            )
            
            if 'error' in signals:
                return {
                    'score': 0,
                    'confidence': 0,
                    'reasoning': 'Unable to analyze symbol',
                    'risk_level': 'unknown'
                }
            
            signal_data = signals.get('signals', {})
            confidence = signal_data.get('confidence', 0)
            signal_direction = signal_data.get('direction', 'neutral')
            
            # Get quote
            quote = self.tradier.get_quote(symbol)
            current_price = None
            if 'quotes' in quote and 'quote' in quote['quotes']:
                current_price = quote['quotes']['quote'].get('last', 0)
            
            # Get IV metrics
            iv_metrics = self.iv_analyzer.get_current_iv_metrics(symbol)
            iv_rank = iv_metrics.get('iv_rank', 0) if iv_metrics else 0
            
            # Scoring factors (0-100 scale)
            
            # 1. Signal confidence (0-30 points)
            if confidence >= 0.70:
                score += 30
                match_reasons.append(f"Strong signal ({confidence*100:.0f}% confidence)")
            elif confidence >= 0.60:
                score += 20
                match_reasons.append(f"Good signal ({confidence*100:.0f}% confidence)")
            elif confidence >= 0.50:
                score += 10
                match_reasons.append(f"Moderate signal ({confidence*100:.0f}% confidence)")
            
            # 2. User's favorite symbols (0-25 points)
            if symbol in user_patterns.get('favorite_symbols', []):
                score += 25
                match_reasons.append("You've traded this symbol before")
            
            # 3. Risk alignment (0-20 points)
            if risk_tolerance == 'low' and symbol in ['SPY', 'QQQ', 'AAPL', 'MSFT', 'GOOGL']:
                score += 20
                match_reasons.append("Matches your conservative risk profile")
            elif risk_tolerance == 'moderate' and symbol in ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT']:
                score += 20
                match_reasons.append("Matches your moderate risk profile")
            elif risk_tolerance == 'high' and symbol in ['TSLA', 'NVDA', 'AMD', 'NFLX', 'META']:
                score += 20
                match_reasons.append("Matches your aggressive risk profile")
            
            # 4. IV Rank for options opportunities (0-15 points)
            if iv_rank > 70:
                score += 15
                match_reasons.append(f"High IV rank ({iv_rank:.0f}%) - good for selling")
            elif iv_rank > 50:
                score += 10
                match_reasons.append(f"Moderate IV rank ({iv_rank:.0f}%)")
            elif iv_rank < 30:
                score += 5
                match_reasons.append(f"Low IV rank ({iv_rank:.0f}%) - good for buying")
            
            # 5. Signal direction (0-10 points)
            if signal_direction == 'bullish' and risk_tolerance in ['moderate', 'high']:
                score += 10
                match_reasons.append("Bullish signal detected")
            elif signal_direction == 'bearish' and risk_tolerance == 'low':
                score += 5
                match_reasons.append("Bearish signal - consider protective strategies")
            
            # Determine risk level
            if score >= 60:
                risk_level = 'high_opportunity'
            elif score >= 40:
                risk_level = 'moderate_opportunity'
            else:
                risk_level = 'low_opportunity'
            
            # Generate reasoning
            reasoning = self._generate_reasoning(symbol, score, match_reasons, risk_tolerance, confidence)
            
            return {
                'score': score,
                'confidence': confidence,
                'reasoning': reasoning,
                'risk_level': risk_level,
                'signal_direction': signal_direction,
                'iv_rank': round(iv_rank, 1),
                'current_price': current_price,
                'match_reasons': match_reasons
            }
            
        except Exception as e:
            current_app.logger.error(f"Error scoring symbol {symbol}: {e}")
            return {
                'score': 0,
                'confidence': 0,
                'reasoning': 'Error analyzing symbol',
                'risk_level': 'unknown'
            }
    
    def _generate_reasoning(self, symbol: str, score: int, match_reasons: List[str], 
                           risk_tolerance: str, confidence: float) -> str:
        """Generate human-readable reasoning for recommendation"""
        if score >= 60:
            quality = "excellent"
        elif score >= 40:
            quality = "good"
        else:
            quality = "moderate"
        
        reasons_text = ", ".join(match_reasons[:3])  # Top 3 reasons
        
        reasoning = f"""
Based on your {risk_tolerance} risk tolerance and trading patterns, {symbol} is a {quality} match.
        
Key factors: {reasons_text}
        
This symbol shows {confidence*100:.0f}% confidence in current signals, making it worth analyzing for options opportunities.
        """.strip()
        
        return reasoning

