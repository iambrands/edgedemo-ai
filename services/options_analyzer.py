from typing import Dict, List, Optional
from datetime import datetime, date
from services.tradier_connector import TradierConnector
from services.ai_options_analyzer import AIOptionsAnalyzer
from flask import current_app

class OptionsAnalyzer:
    """Core options analysis engine with scoring algorithm"""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.ai_analyzer = AIOptionsAnalyzer()
    
    def analyze_options_chain(self, symbol: str, expiration: str, 
                            preference: str = 'balanced', 
                            stock_price: float = None,
                            user_risk_tolerance: str = 'moderate') -> List[Dict]:
        """
        Analyze options chain and return scored recommendations
        
        Args:
            symbol: Stock symbol
            expiration: Expiration date (YYYY-MM-DD)
            preference: Strategy preference ('income', 'growth', 'balanced')
            stock_price: Current stock price (optional, will fetch if not provided)
            user_risk_tolerance: User's risk tolerance ('low', 'moderate', 'high')
        
        Returns:
            List of analyzed options with scores and explanations
        """
        try:
            current_app.logger.info(f'Getting stock price for {symbol}...')
        except RuntimeError:
            pass
        
        # Get stock price if not provided
        if stock_price is None:
            quote = self.tradier.get_quote(symbol)
            if 'quotes' in quote and 'quote' in quote['quotes']:
                stock_price = quote['quotes']['quote']['last']
            else:
                stock_price = 100.0  # Fallback
        
        try:
            current_app.logger.info(f'Stock price: ${stock_price}, fetching options chain for {symbol} expiration {expiration}...')
        except RuntimeError:
            pass
        
        # Get options chain
        options = self.tradier.get_options_chain(symbol, expiration)
        
        try:
            current_app.logger.info(f'Received {len(options)} options from chain')
        except RuntimeError:
            pass
        
        if not options:
            try:
                current_app.logger.warning(f'No options returned for {symbol} expiration {expiration}')
            except RuntimeError:
                pass
            return []
        
        analyzed_options = []
        try:
            current_app.logger.info(f'Analyzing {len(options)} options...')
        except RuntimeError:
            pass
        
        for i, option in enumerate(options):
            analyzed = self._analyze_option(option, preference, stock_price, user_risk_tolerance)
            if analyzed:
                analyzed_options.append(analyzed)
            if (i + 1) % 50 == 0:
                try:
                    current_app.logger.info(f'Analyzed {i + 1}/{len(options)} options...')
                except RuntimeError:
                    pass
        
        try:
            current_app.logger.info(f'Analysis complete: {len(analyzed_options)} options analyzed successfully')
        except RuntimeError:
            pass
        
        # Sort by score (highest first)
        analyzed_options.sort(key=lambda x: x['score'], reverse=True)
        
        return analyzed_options
    
    def _analyze_option(self, option: Dict, preference: str, stock_price: float, user_risk_tolerance: str = 'moderate') -> Optional[Dict]:
        """Analyze a single option contract"""
        try:
            # Extract option data - handle None values
            contract_type = option.get('type', '').lower()
            strike = float(option.get('strike') or 0)
            last_price = float(option.get('last') or 0)
            bid = float(option.get('bid') or 0)
            ask = float(option.get('ask') or 0)
            volume = int(option.get('volume') or 0)
            open_interest = int(option.get('open_interest') or 0)
            
            # Extract Greeks - handle None values
            greeks = option.get('greeks', {}) or {}
            delta = float(greeks.get('delta') or 0)
            gamma = float(greeks.get('gamma') or 0)
            theta = float(greeks.get('theta') or 0)
            vega = float(greeks.get('vega') or 0)
            iv = float(greeks.get('mid_iv') or greeks.get('iv') or 0)
            
            # Calculate spread
            if bid > 0 and ask > 0:
                mid_price = (bid + ask) / 2
                spread = ask - bid
                spread_percent = (spread / mid_price * 100) if mid_price > 0 else 100
            else:
                mid_price = last_price
                spread_percent = 15.0  # Default penalty for no bid/ask
            
            # Calculate days to expiration
            expiration_date = datetime.strptime(option.get('expiration_date', ''), '%Y-%m-%d').date()
            days_to_expiration = (expiration_date - date.today()).days
            
            # Score the option
            score = self._score_option(
                volume=volume,
                open_interest=open_interest,
                spread_percent=spread_percent,
                days_to_expiration=days_to_expiration,
                delta=delta,
                preference=preference
            )
            
            # Generate explanation
            explanation = self._generate_explanation(
                option=option,
                score=score,
                preference=preference,
                spread_percent=spread_percent,
                days_to_expiration=days_to_expiration,
                delta=delta,
                volume=volume,
                open_interest=open_interest
            )
            
            # Determine category based on calculated score
            category = self._categorize_recommendation(score)
            
            # Get AI-powered analysis
            try:
                ai_analysis = self.ai_analyzer.analyze_option_with_ai(
                    option={
                        'type': contract_type,
                        'strike': strike,
                        'expiration_date': option.get('expiration_date'),
                        'mid_price': mid_price,
                        'bid': bid,
                        'ask': ask,
                        'last': last_price,
                        'volume': volume,
                        'open_interest': open_interest,
                        'greeks': greeks
                    },
                    stock_price=stock_price,
                    user_risk_tolerance=user_risk_tolerance
                )
                
                # Use AI analysis for explanation if available
                # But keep the calculated score (don't override with AI score)
                # Only use AI category if it's valid (Conservative, Balanced, Aggressive)
                if ai_analysis:
                    explanation = ai_analysis.get('explanation', explanation)
                    ai_category = ai_analysis.get('category', category)
                    # Only use AI category if it matches our expected values
                    if ai_category in ['Conservative', 'Balanced', 'Aggressive']:
                        category = ai_category
                    # Keep the calculated score - don't override with AI score
                    # This ensures scores vary based on actual option characteristics
            except Exception as e:
                # Log error but don't fail the entire analysis
                try:
                    from flask import current_app
                    current_app.logger.error(f"AI analysis error: {str(e)}")
                except:
                    pass
                ai_analysis = {}
            
            return {
                'option_symbol': option.get('symbol'),
                'description': option.get('description'),
                'contract_type': contract_type,
                'strike': strike,
                'expiration_date': option.get('expiration_date'),
                'last_price': last_price,
                'bid': bid,
                'ask': ask,
                'mid_price': mid_price,
                'spread': spread if bid > 0 and ask > 0 else None,
                'spread_percent': spread_percent,
                'volume': volume,
                'open_interest': open_interest,
                'delta': delta,
                'gamma': gamma,
                'theta': theta,
                'vega': vega,
                'implied_volatility': iv,
                'days_to_expiration': days_to_expiration,
                'score': round(score, 4),
                'category': category,
                'explanation': explanation,
                'stock_price': stock_price,
                'ai_analysis': ai_analysis  # Add AI analysis
            }
        except Exception as e:
            try:
                from flask import current_app
                current_app.logger.error(f"Error analyzing option: {str(e)}")
            except:
                pass
            return None
    
    def _score_option(self, volume: int, open_interest: int, spread_percent: float,
                     days_to_expiration: int, delta: float, preference: str) -> float:
        """
        Score option based on multiple factors (0-1.0 scale)
        
        Scoring breakdown:
        - Liquidity: 0-0.3 (volume and open interest)
        - Spread: 0-0.2 (lower spread is better)
        - Days to expiration: 0-0.2 (preference-based)
        - Delta: 0-0.3 (strategy-based target)
        """
        # Liquidity score (0-0.3)
        # Volume > 20 and OI > 100 are considered good
        volume_score = min(0.15, (volume / 100) * 0.15) if volume > 0 else 0
        oi_score = min(0.15, (open_interest / 500) * 0.15) if open_interest > 0 else 0
        liquidity_score = volume_score + oi_score
        
        # Spread score (0-0.2) - lower spread is better
        # Spread < 10% gets full score, > 15% gets penalized
        spread_score = 0.2 * max(0, 1 - (spread_percent / 10))
        
        # Days to expiration relevance (0-0.2)
        if preference == 'income':
            # Income strategies prefer shorter DTE (around 21 days)
            days_score = 0.2 * max(0, 1 - abs(21 - days_to_expiration) / 30)
        elif preference == 'growth':
            # Growth strategies prefer longer DTE (up to 60 days)
            days_score = 0.2 * min(1, days_to_expiration / 60)
        else:  # balanced
            # Balanced strategies prefer 30-45 DTE
            days_score = 0.2 * max(0, 1 - abs(38 - days_to_expiration) / 30)
        
        # Delta score (0-0.3)
        # Target deltas based on preference
        target_deltas = {
            'income': 0.35,
            'growth': 0.65,
            'balanced': 0.50
        }
        target_delta = target_deltas.get(preference, 0.50)
        # Use absolute delta for scoring
        abs_delta = abs(delta)
        delta_score = 0.3 * max(0, 1 - abs(target_delta - abs_delta) / 0.35)
        
        total_score = liquidity_score + spread_score + days_score + delta_score
        return min(1.0, max(0.0, total_score))
    
    def _generate_explanation(self, option: Dict, score: float, preference: str,
                            spread_percent: float, days_to_expiration: int,
                            delta: float, volume: int, open_interest: int) -> str:
        """Generate plain English explanation for the recommendation"""
        contract_type = option.get('type', '').lower()
        strike = option.get('strike')
        
        explanations = []
        
        # Score-based opening
        if score >= 0.7:
            explanations.append("This is a strong option with excellent characteristics.")
        elif score >= 0.5:
            explanations.append("This option shows good potential with solid fundamentals.")
        else:
            explanations.append("This option has some limitations but may still be viable.")
        
        # Liquidity assessment
        if volume >= 20 and open_interest >= 100:
            explanations.append(f"Good liquidity with {volume} contracts traded and {open_interest} open interest.")
        elif volume < 20:
            explanations.append(f"Low volume ({volume} contracts) may make entry/exit more challenging.")
        elif open_interest < 100:
            explanations.append(f"Low open interest ({open_interest}) suggests limited market participation.")
        
        # Spread assessment
        if spread_percent < 5:
            explanations.append("Tight bid-ask spread indicates efficient pricing.")
        elif spread_percent < 10:
            explanations.append("Reasonable spread, though you may pay a small premium.")
        else:
            explanations.append(f"Wide spread ({spread_percent:.1f}%) means you'll pay more to enter/exit.")
        
        # DTE assessment
        if preference == 'income':
            if 15 <= days_to_expiration <= 30:
                explanations.append(f"Good DTE ({days_to_expiration} days) for income generation.")
            else:
                explanations.append(f"DTE of {days_to_expiration} days may not be optimal for income strategies.")
        elif preference == 'growth':
            if days_to_expiration >= 45:
                explanations.append(f"Longer DTE ({days_to_expiration} days) provides time for growth.")
            else:
                explanations.append(f"Shorter DTE ({days_to_expiration} days) may limit growth potential.")
        else:  # balanced
            if 30 <= days_to_expiration <= 45:
                explanations.append(f"Optimal DTE range ({days_to_expiration} days) for balanced approach.")
            else:
                explanations.append(f"DTE of {days_to_expiration} days is outside the ideal range.")
        
        # Delta assessment
        abs_delta = abs(delta)
        if preference == 'income':
            if 0.30 <= abs_delta <= 0.40:
                explanations.append(f"Delta of {delta:.2f} is ideal for income strategies.")
            else:
                explanations.append(f"Delta of {delta:.2f} may not align perfectly with income goals.")
        elif preference == 'growth':
            if 0.60 <= abs_delta <= 0.70:
                explanations.append(f"Delta of {delta:.2f} provides good growth potential.")
            else:
                explanations.append(f"Delta of {delta:.2f} may not maximize growth opportunities.")
        else:  # balanced
            if 0.45 <= abs_delta <= 0.55:
                explanations.append(f"Delta of {delta:.2f} offers balanced risk/reward.")
            else:
                explanations.append(f"Delta of {delta:.2f} is slightly outside the balanced range.")
        
        return " ".join(explanations)
    
    def _categorize_recommendation(self, score: float) -> str:
        """Categorize recommendation based on score"""
        if score >= 0.7:
            return 'Aggressive'
        elif score >= 0.5:
            return 'Balanced'
        else:
            return 'Conservative'

