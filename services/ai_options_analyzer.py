"""
AI-Powered Options Analysis Service
Explains Greeks and provides plain English trade analysis using OpenAI
"""
from typing import Dict, List, Optional
from datetime import datetime, date
from flask import current_app
import os

class AIOptionsAnalyzer:
    """AI-powered options analysis with plain English explanations using OpenAI and Claude"""
    
    def __init__(self):
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        self.anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY')
        self.use_openai = bool(self.openai_api_key)
        self.use_claude = bool(self.anthropic_api_key)
        self.quota_exceeded = False  # Track if OpenAI quota is exceeded
        self.claude_quota_exceeded = False  # Track if Claude quota is exceeded
        
        if self.use_openai:
            try:
                import openai
                openai.api_key = self.openai_api_key
            except ImportError:
                self.use_openai = False
                try:
                    from flask import current_app
                    current_app.logger.warning("OpenAI package not installed")
                except RuntimeError:
                    pass  # Outside application context
        
        if self.use_claude:
            try:
                import anthropic
            except ImportError:
                self.use_claude = False
                try:
                    from flask import current_app
                    current_app.logger.warning("Anthropic package not installed")
                except RuntimeError:
                    pass  # Outside application context
    
    def _generate_openai_analysis(self, option: Dict, stock_price: float,
                                  delta: float, gamma: float, theta: float,
                                  vega: float, iv: float, days_to_expiration: int,
                                  user_risk_tolerance: str) -> Optional[Dict]:
        """Generate AI-powered analysis using OpenAI"""
        try:
            import openai
            
            contract_type = option.get('type', '').lower()
            strike = float(option.get('strike', 0))
            mid_price = option.get('mid_price', 0)
            volume = int(option.get('volume', 0))
            open_interest = int(option.get('open_interest', 0))
            
            prompt = f"""You are an expert options trading analyst. Analyze this option trade and provide a comprehensive, easy-to-understand analysis.

Option Details:
- Symbol: {option.get('symbol', 'N/A')}
- Type: {contract_type.upper()}
- Strike: ${strike:.2f}
- Current Stock Price: ${stock_price:.2f}
- Premium (Mid Price): ${mid_price:.2f}
- Days to Expiration: {days_to_expiration}
- Volume: {volume}
- Open Interest: {open_interest}

Greeks:
- Delta: {delta:.4f}
- Gamma: {gamma:.4f}
- Theta: {theta:.4f}
- Vega: {vega:.4f}
- Implied Volatility: {iv*100:.2f}%

User Risk Tolerance: {user_risk_tolerance}

Provide a comprehensive analysis in the following format:

**AI Recommendation:** [Buy/Consider/Consider Carefully/Avoid] (Confidence: High/Medium/Low)
**Suitability:** [Suitable/Moderately Suitable/Not Suitable] for {user_risk_tolerance} risk tolerance
**Reasoning:** [2-3 sentence explanation]

**Greeks Explained:**
**Delta:** [Plain English explanation of what this delta means for the trade]
**Gamma:** [Plain English explanation of gamma's impact]
**Theta:** [Plain English explanation of time decay implications]
**Vega:** [Plain English explanation of volatility sensitivity]
**Implied Volatility:** [Plain English explanation of IV level and implications]

**Trade Analysis:**
**Overview:** [Overall trade assessment]
**Best Case:** [Best case scenario]
**Worst Case:** [Worst case scenario]
**Break-Even:** [Break-even calculation and explanation]
**Profit Potential:** [Profit potential analysis]
**Time Considerations:** [Time-related factors]

**Risk Assessment:**
**Overall Risk Level:** [Low/Moderate/High]
**Risk Factors:** [List key risk factors]
**Warnings:** [Any important warnings]

Be concise, practical, and tailored to a {user_risk_tolerance} risk tolerance trader."""
            
            # Use OpenAI client with timeout and no retries for 429 errors
            from openai import OpenAI
            client = OpenAI(
                api_key=self.openai_api_key,
                timeout=10.0,  # 10 second timeout
                max_retries=0  # Disable automatic retries - we'll handle errors ourselves
            )
            
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert options trading analyst providing clear, actionable, and educational analysis. Focus on practical insights and risk awareness."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7,
            )
            
            ai_content = response.choices[0].message.content.strip()
            
            # Parse the AI response into structured format
            # Extract recommendation
            recommendation_match = None
            if "**AI Recommendation:**" in ai_content:
                rec_line = ai_content.split("**AI Recommendation:**")[1].split("\n")[0].strip()
                if "Buy" in rec_line:
                    action = "buy"
                elif "Consider Carefully" in rec_line:
                    action = "consider_carefully"
                elif "Consider" in rec_line:
                    action = "consider"
                else:
                    action = "avoid"
                
                confidence = "high" if "High" in rec_line else "medium" if "Medium" in rec_line else "low"
            else:
                action = "consider"
                confidence = "medium"
            
            # Extract suitability
            suitability = "suitable"
            if "**Suitability:**" in ai_content:
                suit_line = ai_content.split("**Suitability:**")[1].split("\n")[0].strip()
                if "Not Suitable" in suit_line:
                    suitability = "not_suitable"
                elif "Moderately" in suit_line:
                    suitability = "moderately_suitable"
            
            # Extract reasoning
            reasoning = ""
            if "**Reasoning:**" in ai_content:
                reasoning = ai_content.split("**Reasoning:**")[1].split("**")[0].strip()
            
            # Map to score and category
            score = self._map_recommendation_to_score(action, confidence)
            category = self._map_recommendation_to_category(action)
            
            return {
                'score': score,
                'category': category,
                'explanation': ai_content,  # Use full AI-generated explanation
                'greeks_explanation': {},  # Will be extracted from explanation
                'trade_analysis': {},  # Will be extracted from explanation
                'risk_assessment': {},  # Will be extracted from explanation
                'recommendation': {
                    'action': action,
                    'confidence': confidence,
                    'suitability': suitability,
                    'reasoning': reasoning
                },
                'ai_generated_at': datetime.utcnow().isoformat(),
                'ai_generated': True
            }
        except Exception as e:
            # Check if it's a quota exceeded error (429)
            error_str = str(e)
            if '429' in error_str or 'quota' in error_str.lower() or 'insufficient_quota' in error_str.lower():
                self.quota_exceeded = True
                try:
                    from flask import current_app
                    current_app.logger.warning("OpenAI quota exceeded - disabling AI analysis for this session")
                except RuntimeError:
                    pass
            else:
                try:
                    from flask import current_app
                    current_app.logger.error(f"OpenAI analysis error: {e}")
                except RuntimeError:
                    pass  # Outside application context
            return None
    
    def analyze_option_with_ai(self, option: Dict, stock_price: float, 
                               user_risk_tolerance: str = 'moderate') -> Dict:
        """
        Provide comprehensive AI-powered analysis of an option
        
        Returns:
            Dict with AI analysis including:
            - greeks_explanation: Plain English explanation of each Greek
            - trade_analysis: Overall trade assessment
            - risk_assessment: Risk analysis
            - recommendation: Buy/Hold/Avoid recommendation
        """
        # Extract Greeks
        greeks = option.get('greeks', {})
        delta = float(greeks.get('delta', 0))
        gamma = float(greeks.get('gamma', 0))
        theta = float(greeks.get('theta', 0))
        vega = float(greeks.get('vega', 0))
        iv = float(greeks.get('mid_iv', 0))
        
        contract_type = option.get('type', '').lower()
        strike = float(option.get('strike', 0))
        expiration_date = option.get('expiration_date', '')
        try:
            if expiration_date:
                days_to_expiration = (datetime.strptime(expiration_date, '%Y-%m-%d').date() - date.today()).days
            else:
                days_to_expiration = 0
        except (ValueError, TypeError):
            days_to_expiration = 0
        
        # Try OpenAI first if available and quota not exceeded
        if self.use_openai and not self.quota_exceeded:
            try:
                ai_result = self._generate_openai_analysis(
                    option=option,
                    stock_price=stock_price,
                    delta=delta,
                    gamma=gamma,
                    theta=theta,
                    vega=vega,
                    iv=iv,
                    days_to_expiration=days_to_expiration,
                    user_risk_tolerance=user_risk_tolerance
                )
                if ai_result:
                    ai_result['ai_provider'] = 'openai'  # Mark as OpenAI-generated
                    return ai_result
            except Exception as e:
                # Check if it's a quota error
                error_str = str(e)
                if '429' in error_str or 'quota' in error_str.lower() or 'insufficient_quota' in error_str.lower():
                    self.quota_exceeded = True
                    try:
                        from flask import current_app
                        current_app.logger.warning("OpenAI quota exceeded - trying Claude API")
                    except RuntimeError:
                        pass
                else:
                    # Try Claude if OpenAI fails for other reasons
                    try:
                        from flask import current_app
                        current_app.logger.warning(f"OpenAI analysis failed, trying Claude: {e}")
                    except RuntimeError:
                        pass  # Outside application context
        
        # Try Claude if OpenAI is unavailable or quota exceeded
        if self.use_claude and not self.claude_quota_exceeded:
            try:
                ai_result = self._generate_claude_analysis(
                    option=option,
                    stock_price=stock_price,
                    delta=delta,
                    gamma=gamma,
                    theta=theta,
                    vega=vega,
                    iv=iv,
                    days_to_expiration=days_to_expiration,
                    user_risk_tolerance=user_risk_tolerance
                )
                if ai_result:
                    return ai_result
            except Exception as e:
                # Check if it's a quota error
                error_str = str(e)
                if '429' in error_str or 'quota' in error_str.lower() or 'rate_limit' in error_str.lower():
                    self.claude_quota_exceeded = True
                    try:
                        from flask import current_app
                        current_app.logger.warning("Claude quota exceeded - falling back to rule-based analysis")
                    except RuntimeError:
                        pass
                else:
                    # Fallback to rule-based if Claude fails for other reasons
                    try:
                        from flask import current_app
                        current_app.logger.warning(f"Claude analysis failed, using rule-based: {e}")
                    except RuntimeError:
                        pass  # Outside application context
        
        # Generate rule-based explanations (fallback)
        greeks_explanation = self._explain_greeks(
            delta=delta,
            gamma=gamma,
            theta=theta,
            vega=vega,
            iv=iv,
            contract_type=contract_type,
            strike=strike,
            stock_price=stock_price,
            days_to_expiration=days_to_expiration
        )
        
        trade_analysis = self._analyze_trade(
            option=option,
            stock_price=stock_price,
            delta=delta,
            gamma=gamma,
            theta=theta,
            vega=vega,
            iv=iv,
            days_to_expiration=days_to_expiration,
            user_risk_tolerance=user_risk_tolerance
        )
        
        risk_assessment = self._assess_risks(
            option=option,
            delta=delta,
            gamma=gamma,
            theta=theta,
            vega=vega,
            iv=iv,
            days_to_expiration=days_to_expiration
        )
        
        recommendation = self._generate_recommendation(
            option=option,
            trade_analysis=trade_analysis,
            risk_assessment=risk_assessment,
            user_risk_tolerance=user_risk_tolerance
        )
        
        # Map recommendation to score and category
        score = self._map_recommendation_to_score(recommendation['action'], recommendation['confidence'])
        category = self._map_recommendation_to_category(recommendation['action'])
        
        # Build full explanation
        full_explanation_parts = [
            f"**AI Recommendation:** {recommendation['action'].replace('_', ' ').title()} (Confidence: {recommendation['confidence'].title()})",
            f"**Suitability:** {recommendation['suitability'].replace('_', ' ').title()}",
            f"**Reasoning:** {recommendation['reasoning']}",
            "\n---",
            "**Greeks Explained:**",
            "\n".join([f"**{k.title()}:** {v}" for k, v in greeks_explanation.items()]),
            "\n---",
            "**Trade Analysis:**",
            f"**Overview:** {trade_analysis['overview']}",
            f"**Best Case:** {trade_analysis['best_case']}",
            f"**Worst Case:** {trade_analysis['worst_case']}",
            f"**Break-Even:** {trade_analysis['break_even']}",
            f"**Profit Potential:** {trade_analysis['profit_potential']}",
            f"**Time Considerations:** {trade_analysis['time_considerations']}",
            "\n---",
            "**Risk Assessment:**",
            f"**Overall Risk Level:** {risk_assessment['overall_risk_level'].title()}",
            f"**Risk Factors:** {', '.join(risk_assessment['risk_factors']) if risk_assessment['risk_factors'] else 'None identified.'}",
            f"**Warnings:** {', '.join(risk_assessment['warnings']) if risk_assessment['warnings'] else 'None.'}"
        ]
        full_explanation = "\n\n".join(full_explanation_parts)
        
        return {
            'score': score,
            'category': category,
            'explanation': full_explanation,
            'greeks_explanation': greeks_explanation,
            'trade_analysis': trade_analysis,
            'risk_assessment': risk_assessment,
            'recommendation': recommendation,
            'ai_generated_at': datetime.utcnow().isoformat()
        }
    
    def _explain_greeks(self, delta: float, gamma: float, theta: float, 
                        vega: float, iv: float, contract_type: str,
                        strike: float, stock_price: float, 
                        days_to_expiration: int) -> Dict[str, str]:
        """Explain each Greek in plain English"""
        explanations = {}
        
        # Delta Explanation
        abs_delta = abs(delta)
        is_call = contract_type == 'call'
        is_itm = (is_call and stock_price > strike) or (not is_call and stock_price < strike)
        is_otm = (is_call and stock_price < strike) or (not is_call and stock_price > strike)
        
        if abs_delta < 0.20:
            delta_explanation = f"Delta of {delta:.2f} means this is an OUT-OF-THE-MONEY option. "
            delta_explanation += f"For every $1 the stock moves, this option will change by about ${abs_delta:.2f}. "
            delta_explanation += "This is a lower probability trade but cheaper to enter."
        elif abs_delta < 0.50:
            delta_explanation = f"Delta of {delta:.2f} means this is an AT-THE-MONEY option. "
            delta_explanation += f"For every $1 the stock moves, this option will change by about ${abs_delta:.2f}. "
            delta_explanation += "This provides a balanced risk/reward profile."
        else:
            delta_explanation = f"Delta of {delta:.2f} means this is an IN-THE-MONEY option. "
            delta_explanation += f"For every $1 the stock moves, this option will change by about ${abs_delta:.2f}. "
            delta_explanation += "This option behaves more like owning the stock itself."
        
        if is_call:
            delta_explanation += f" Since this is a CALL, positive delta means it gains value when the stock goes up."
        else:
            delta_explanation += f" Since this is a PUT, negative delta means it gains value when the stock goes down."
        
        explanations['delta'] = delta_explanation
        
        # Gamma Explanation
        if gamma < 0.01:
            gamma_explanation = f"Gamma of {gamma:.4f} is relatively low. "
            gamma_explanation += "This means your delta won't change much as the stock price moves. "
            gamma_explanation += "The option's sensitivity to stock movement stays fairly constant."
        elif gamma < 0.05:
            gamma_explanation = f"Gamma of {gamma:.4f} is moderate. "
            gamma_explanation += "As the stock price moves, your delta will change at a reasonable rate. "
            gamma_explanation += "This is typical for at-the-money options."
        else:
            gamma_explanation = f"Gamma of {gamma:.4f} is high. "
            gamma_explanation += "This means your delta will change rapidly as the stock moves. "
            gamma_explanation += "The option's sensitivity increases quickly - higher risk and reward potential."
        
        explanations['gamma'] = gamma_explanation
        
        # Theta Explanation (Time Decay)
        daily_theta_loss = abs(theta)
        weekly_theta_loss = daily_theta_loss * 7
        monthly_theta_loss = daily_theta_loss * 30
        
        if days_to_expiration <= 7:
            theta_explanation = f"Theta of {theta:.4f} means you're losing about ${daily_theta_loss:.2f} per day in time decay. "
            theta_explanation += f"With only {days_to_expiration} days left, time decay is ACCELERATING rapidly. "
            theta_explanation += f"You'll lose approximately ${weekly_theta_loss:.2f} this week just from time passing."
        elif days_to_expiration <= 21:
            theta_explanation = f"Theta of {theta:.4f} means you're losing about ${daily_theta_loss:.2f} per day in time decay. "
            theta_explanation += f"With {days_to_expiration} days to expiration, time decay is MODERATE. "
            theta_explanation += f"You'll lose approximately ${weekly_theta_loss:.2f} per week as time passes."
        else:
            theta_explanation = f"Theta of {theta:.4f} means you're losing about ${daily_theta_loss:.2f} per day in time decay. "
            theta_explanation += f"With {days_to_expiration} days to expiration, time decay is SLOW but steady. "
            theta_explanation += f"You'll lose approximately ${monthly_theta_loss:.2f} per month as time passes."
        
        theta_explanation += " This is the cost of holding the option - time is literally money here."
        
        explanations['theta'] = theta_explanation
        
        # Vega Explanation (Volatility Impact)
        iv_percent = iv * 100
        if vega < 0.05:
            vega_explanation = f"Vega of {vega:.4f} means this option has LOW sensitivity to volatility changes. "
            vega_explanation += f"With IV at {iv_percent:.1f}%, a 1% increase in volatility would add about ${vega:.2f} to the option price. "
            vega_explanation += "This option is less affected by volatility swings."
        elif vega < 0.15:
            vega_explanation = f"Vega of {vega:.4f} means this option has MODERATE sensitivity to volatility. "
            vega_explanation += f"With IV at {iv_percent:.1f}%, a 1% increase in volatility would add about ${vega:.2f} to the option price. "
            vega_explanation += "Volatility changes will have a noticeable impact on this option's value."
        else:
            vega_explanation = f"Vega of {vega:.4f} means this option has HIGH sensitivity to volatility. "
            vega_explanation += f"With IV at {iv_percent:.1f}%, a 1% increase in volatility would add about ${vega:.2f} to the option price. "
            vega_explanation += "This option will move significantly with volatility changes - good if IV rises, bad if it falls."
        
        if iv_percent > 50:
            vega_explanation += " WARNING: IV is very high - you're paying a premium for volatility."
        elif iv_percent < 20:
            vega_explanation += " IV is relatively low - you're getting a good price on volatility."
        
        explanations['vega'] = vega_explanation
        
        # Implied Volatility Explanation
        if iv_percent < 20:
            iv_explanation = f"Implied Volatility of {iv_percent:.1f}% is LOW. "
            iv_explanation += "This means the market expects relatively small price swings. "
            iv_explanation += "Options are cheaper when IV is low - good for buying, not great for selling."
        elif iv_percent < 40:
            iv_explanation = f"Implied Volatility of {iv_percent:.1f}% is MODERATE. "
            iv_explanation += "This is a normal range - the market expects typical price movements. "
            iv_explanation += "Options are fairly priced at this IV level."
        else:
            iv_explanation = f"Implied Volatility of {iv_percent:.1f}% is HIGH. "
            iv_explanation += "This means the market expects large price swings. "
            iv_explanation += "Options are expensive when IV is high - good for selling premium, expensive for buying."
        
        explanations['implied_volatility'] = iv_explanation
        
        return explanations
    
    def _analyze_trade(self, option: Dict, stock_price: float, delta: float,
                      gamma: float, theta: float, vega: float, iv: float,
                      days_to_expiration: int, user_risk_tolerance: str) -> Dict:
        """Provide overall trade analysis"""
        contract_type = option.get('type', '').lower()
        strike = float(option.get('strike', 0))
        mid_price = option.get('mid_price', 0)
        volume = int(option.get('volume', 0))
        open_interest = int(option.get('open_interest', 0))
        
        analysis = {
            'overview': '',
            'best_case': '',
            'worst_case': '',
            'break_even': '',
            'profit_potential': '',
            'time_considerations': ''
        }
        
        # Calculate break-even
        if contract_type == 'call':
            break_even = strike + mid_price
            analysis['break_even'] = f"Break-even: Stock needs to reach ${break_even:.2f} (strike ${strike:.2f} + premium ${mid_price:.2f})"
            analysis['best_case'] = f"Best case: Stock rallies significantly above ${break_even:.2f}. "
            analysis['best_case'] += f"With delta of {delta:.2f}, you'll profit roughly ${abs(delta):.2f} for every $1 the stock moves up."
            analysis['worst_case'] = f"Worst case: Stock stays below ${strike:.2f} or drops. "
            analysis['worst_case'] += f"You lose the entire premium (${mid_price:.2f} per contract = ${mid_price * 100:.2f} total)."
        else:  # put
            break_even = strike - mid_price
            analysis['break_even'] = f"Break-even: Stock needs to drop to ${break_even:.2f} (strike ${strike:.2f} - premium ${mid_price:.2f})"
            analysis['best_case'] = f"Best case: Stock drops significantly below ${break_even:.2f}. "
            analysis['best_case'] += f"With delta of {delta:.2f}, you'll profit roughly ${abs(delta):.2f} for every $1 the stock moves down."
            analysis['worst_case'] = f"Worst case: Stock stays above ${strike:.2f} or rises. "
            analysis['worst_case'] += f"You lose the entire premium (${mid_price:.2f} per contract = ${mid_price * 100:.2f} total)."
        
        # Overview
        analysis['overview'] = f"This is a {contract_type.upper()} option with a ${strike:.2f} strike price. "
        analysis['overview'] += f"Current stock price is ${stock_price:.2f}. "
        
        if contract_type == 'call':
            if stock_price > strike:
                analysis['overview'] += f"The stock is ${stock_price - strike:.2f} ABOVE the strike - this option is IN-THE-MONEY. "
            else:
                analysis['overview'] += f"The stock is ${strike - stock_price:.2f} BELOW the strike - this option is OUT-OF-THE-MONEY. "
        else:
            if stock_price < strike:
                analysis['overview'] += f"The stock is ${strike - stock_price:.2f} BELOW the strike - this option is IN-THE-MONEY. "
            else:
                analysis['overview'] += f"The stock is ${stock_price - strike:.2f} ABOVE the strike - this option is OUT-OF-THE-MONEY. "
        
        # Profit potential
        if contract_type == 'call':
            move_needed = break_even - stock_price
            move_percent = (move_needed / stock_price) * 100
            analysis['profit_potential'] = f"Stock needs to move UP by ${move_needed:.2f} ({move_percent:.1f}%) to break even. "
        else:
            move_needed = stock_price - break_even
            move_percent = (move_needed / stock_price) * 100
            analysis['profit_potential'] = f"Stock needs to move DOWN by ${move_needed:.2f} ({move_percent:.1f}%) to break even. "
        
        analysis['profit_potential'] += f"With {days_to_expiration} days left, you need the stock to move in your favor relatively quickly."
        
        # Time considerations
        if days_to_expiration <= 7:
            analysis['time_considerations'] = f"⚠️ URGENT: Only {days_to_expiration} days until expiration! "
            analysis['time_considerations'] += f"Time decay is accelerating - you're losing ${abs(theta):.2f} per day. "
            analysis['time_considerations'] += "This is a high-risk, short-term play. The stock needs to move NOW."
        elif days_to_expiration <= 21:
            analysis['time_considerations'] = f"You have {days_to_expiration} days until expiration. "
            analysis['time_considerations'] += f"Time decay is moderate - losing ${abs(theta):.2f} per day. "
            analysis['time_considerations'] += "You have a reasonable timeframe, but time is working against you."
        else:
            analysis['time_considerations'] = f"You have {days_to_expiration} days until expiration. "
            analysis['time_considerations'] += f"Time decay is slow - losing ${abs(theta):.2f} per day. "
            analysis['time_considerations'] += "You have time for the trade to work, but you're still paying for time."
        
        # Liquidity note
        if volume < 10 or open_interest < 50:
            analysis['time_considerations'] += " ⚠️ WARNING: Low liquidity - may be difficult to exit at a good price."
        
        return analysis
    
    def _assess_risks(self, option: Dict, delta: float, gamma: float,
                     theta: float, vega: float, iv: float,
                     days_to_expiration: int) -> Dict:
        """Assess risks of the trade"""
        risks = {
            'overall_risk_level': 'moderate',
            'risk_factors': [],
            'risk_score': 0.5,
            'warnings': []
        }
        
        risk_score = 0.5  # Start at moderate
        risk_factors = []
        warnings = []
        
        # Time decay risk
        if days_to_expiration <= 7:
            risk_score += 0.3
            risk_factors.append("High time decay risk - very short expiration")
            warnings.append(f"⚠️ Only {days_to_expiration} days left - time decay is accelerating rapidly")
        elif days_to_expiration <= 21:
            risk_score += 0.1
            risk_factors.append("Moderate time decay risk")
        
        # Volatility risk
        iv_percent = iv * 100
        if iv_percent > 60:
            risk_score += 0.2
            risk_factors.append("Very high IV - paying premium for volatility")
            warnings.append(f"⚠️ IV of {iv_percent:.1f}% is extremely high - options are expensive")
        elif iv_percent < 15:
            risk_score -= 0.1
            risk_factors.append("Low IV - options are relatively cheap")
        
        # Gamma risk (for high gamma)
        if gamma > 0.05:
            risk_score += 0.15
            risk_factors.append("High gamma - delta will change rapidly with stock movement")
            warnings.append("⚠️ High gamma means rapid price changes as stock moves")
        
        # Theta risk
        if abs(theta) > 0.05:
            risk_score += 0.1
            risk_factors.append(f"High time decay - losing ${abs(theta):.2f} per day")
        
        # Liquidity risk
        volume = int(option.get('volume', 0))
        open_interest = int(option.get('open_interest', 0))
        if volume < 10:
            risk_score += 0.2
            risk_factors.append("Very low volume - difficult to enter/exit")
            warnings.append("⚠️ Low volume - may not be able to exit at desired price")
        elif volume < 50:
            risk_score += 0.1
            risk_factors.append("Low volume - moderate liquidity risk")
        
        if open_interest < 50:
            risk_score += 0.1
            risk_factors.append("Low open interest - limited market participation")
        
        # Determine overall risk level
        risk_score = max(0.0, min(1.0, risk_score))
        if risk_score >= 0.7:
            risks['overall_risk_level'] = 'high'
        elif risk_score >= 0.4:
            risks['overall_risk_level'] = 'moderate'
        else:
            risks['overall_risk_level'] = 'low'
        
        risks['risk_score'] = risk_score
        risks['risk_factors'] = risk_factors
        risks['warnings'] = warnings
        
        return risks
    
    def _generate_recommendation(self, option: Dict, trade_analysis: Dict,
                                risk_assessment: Dict, user_risk_tolerance: str) -> Dict:
        """Generate AI recommendation"""
        risk_level = risk_assessment['overall_risk_level']
        risk_score = risk_assessment['risk_score']
        warnings = risk_assessment['warnings']
        
        # Base recommendation on risk and user tolerance
        if risk_level == 'high' and user_risk_tolerance == 'low':
            action = 'avoid'
            confidence = 'low'
            reasoning = "This trade has high risk factors that don't align with your conservative risk tolerance."
        elif risk_level == 'high' and user_risk_tolerance in ['moderate', 'high']:
            action = 'consider_carefully'
            confidence = 'medium'
            reasoning = "This is a high-risk trade, but may be acceptable for your risk tolerance. Proceed with caution."
        elif risk_level == 'low':
            action = 'consider'
            confidence = 'high'
            reasoning = "This trade has manageable risk levels and appears suitable for most traders."
        else:
            action = 'consider'
            confidence = 'medium'
            reasoning = "This trade has moderate risk. Review the analysis carefully before proceeding."
        
        # Add specific reasoning
        if warnings:
            reasoning += f" Key concerns: {', '.join(warnings[:2])}."
        
        recommendation = {
            'action': action,  # 'buy', 'consider', 'consider_carefully', 'avoid'
            'confidence': confidence,  # 'high', 'medium', 'low'
            'reasoning': reasoning,
            'suitability': self._assess_suitability(risk_level, user_risk_tolerance)
        }
        
        return recommendation

    def _assess_suitability(self, risk_level: str, user_risk_tolerance: str) -> str:
        """Assess if trade is suitable for user's risk tolerance"""
        if risk_level == 'low':
            return 'suitable_for_all'
        elif risk_level == 'moderate':
            if user_risk_tolerance == 'low':
                return 'may_be_too_risky'
            else:
                return 'suitable'
        else:  # high
            if user_risk_tolerance == 'low':
                return 'not_suitable'
            elif user_risk_tolerance == 'moderate':
                return 'proceed_with_caution'
            else:
                return 'suitable_for_aggressive'
    
    def _map_recommendation_to_score(self, action: str, confidence: str) -> float:
        """Map recommendation action and confidence to a score (0-1.0)"""
        action_scores = {
            'buy': 0.9,
            'consider': 0.7,
            'consider_carefully': 0.5,
            'avoid': 0.2
        }
        confidence_multipliers = {
            'high': 1.0,
            'medium': 0.9,
            'low': 0.7
        }
        
        base_score = action_scores.get(action, 0.5)
        multiplier = confidence_multipliers.get(confidence, 0.8)
        return min(1.0, max(0.0, base_score * multiplier))
    
    def _map_recommendation_to_category(self, action: str) -> str:
        """Map recommendation action to category (Conservative, Balanced, Aggressive)"""
        # Map to the same categories used by the scoring system
        category_map = {
            'buy': 'Aggressive',  # High confidence buys are aggressive
            'consider': 'Balanced',  # Moderate recommendations are balanced
            'consider_carefully': 'Conservative',  # Cautious recommendations are conservative
            'avoid': 'Conservative'  # Avoid recommendations are conservative
        }
        return category_map.get(action, 'Balanced')
