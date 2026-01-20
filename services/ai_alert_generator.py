"""
AI-Powered Alert Message Generator using Claude Haiku
Generates dynamic, personalized alert messages based on real market data and user preferences
"""
from typing import Dict, Optional
from datetime import datetime
from flask import current_app
import os
from services.anthropic_client import get_anthropic_client

class AIAlertGenerator:
    """Generate intelligent, contextual alert messages using Claude Haiku"""
    
    def __init__(self):
        self.anthropic_client = get_anthropic_client()
        self.use_ai = self.anthropic_client.is_available()
    
    def generate_alert_message(self, alert_type: str, context: Dict, user_preferences: Dict = None) -> Dict:
        """
        Generate a dynamic, personalized alert message using OpenAI
        
        Args:
            alert_type: Type of alert (buy_signal, sell_signal, risk_alert, trade_executed)
            context: Market data and context (symbol, price, indicators, etc.)
            user_preferences: User's trading preferences and conditions
        
        Returns:
            Dict with title, message, and explanation
        """
        if not self.use_ai:
            return self._generate_fallback_message(alert_type, context)
        
        try:
            # Build prompt based on alert type
            prompt = self._build_prompt(alert_type, context, user_preferences)
            
            # Call Claude Haiku API
            response = self.anthropic_client.client.messages.create(
                model=self.anthropic_client.model,
                max_tokens=500,
                temperature=0.7,
                system="You are an expert options trading advisor. Provide clear, actionable, and personalized trading alerts based on real market data. Be concise but informative.",
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            ai_response = response.content[0].text.strip()
            
            # Parse AI response into structured format
            return self._parse_ai_response(ai_response, alert_type, context)
            
        except Exception as e:
            try:
                from flask import current_app
                current_app.logger.warning(f"Claude Haiku alert generation failed: {e}")
            except:
                pass
            return self._generate_fallback_message(alert_type, context)
    
    def _build_prompt(self, alert_type: str, context: Dict, user_preferences: Dict = None) -> str:
        """Build prompt for OpenAI based on alert type and context"""
        
        symbol = context.get('symbol', '')
        current_price = context.get('current_price', 0)
        confidence = context.get('confidence', 0)
        
        base_info = f"""
Symbol: {symbol}
Current Price: ${current_price:.2f}
Confidence: {confidence:.1%}
"""
        
        if alert_type == 'buy_signal':
            technical_data = context.get('technical_analysis', {})
            indicators = technical_data.get('indicators', {})
            signals = technical_data.get('signals', {})
            individual_signals = signals.get('signals', [])
            
            # Build list of triggered signals
            signal_list = "\n".join([
                f"- {s.get('name', 'Unknown')}: {s.get('description', '')} (Confidence: {s.get('confidence', 0):.1%}, Strength: {s.get('strength', 'medium')})"
                for s in individual_signals
            ]) if individual_signals else "No specific signals detected"
            
            prompt = f"""
Generate a personalized BUY SIGNAL alert for {symbol}.

Market Data:
{base_info}
Current Price: ${context.get('current_price', 0):.2f}

Technical Indicators:
- RSI (Relative Strength Index): {indicators.get('rsi', 0):.1f} (30=oversold, 70=overbought)
- Moving Averages: SMA20=${indicators.get('sma_20', 0):.2f}, SMA50=${indicators.get('sma_50', 0):.2f}, SMA200=${indicators.get('sma_200', 0):.2f}
- MACD: Line={indicators.get('macd', {}).get('line', 0):.4f}, Signal={indicators.get('macd', {}).get('signal', 0):.4f}, Histogram={indicators.get('macd', {}).get('histogram', 0):.4f}
- Volume: {indicators.get('volume', {}).get('ratio', 1.0):.2f}x average ({indicators.get('volume', {}).get('current', 0):,.0f} vs avg {indicators.get('volume', {}).get('average', 0):,.0f})
- Price Change: ${indicators.get('price_change', {}).get('dollars', 0):.2f} ({indicators.get('price_change', {}).get('percent', 0):.2f}%)

Triggered Signals:
{signal_list}

Overall Signal: {signals.get('overall', {}).get('direction', 'neutral')} with {signals.get('overall', {}).get('confidence', 0):.1%} confidence

User Preferences:
- Risk Tolerance: {user_preferences.get('risk_tolerance', 'moderate') if user_preferences else 'moderate'}
- Strategy: {user_preferences.get('strategy', 'balanced') if user_preferences else 'balanced'}
- Min Confidence: {user_preferences.get('min_confidence', 0.6) if user_preferences else 0.6}

Generate:
1. A concise, attention-grabbing title (max 60 chars)
2. A clear, actionable message explaining why this is a buy opportunity - SPECIFICALLY MENTION which technical indicators triggered the signal (e.g., "RSI oversold at 28.5", "Golden Cross pattern with price above all moving averages", "High volume breakout with 2.3x average volume")
3. A brief explanation listing the key technical factors: RSI value, moving average positions, MACD signal, volume analysis, etc.

IMPORTANT: Be specific about the actual indicator values and what they mean. Don't use generic phrases like "multiple technical indicators" - list them explicitly.

Format your response as:
TITLE: [title]
MESSAGE: [message - include specific indicator values]
EXPLANATION: [explanation - list the technical indicators that triggered this signal]
"""
        
        elif alert_type == 'sell_signal':
            position = context.get('position', {})
            pnl = context.get('unrealized_pnl', 0)
            pnl_percent = context.get('unrealized_pnl_percent', 0)
            exit_reason = context.get('exit_reason', '')
            
            prompt = f"""
Generate a personalized SELL SIGNAL alert for {symbol}.

Position Data:
{base_info}
Entry Price: ${position.get('entry_price', 0):.2f}
Current Price: ${position.get('current_price', 0):.2f}
Unrealized P/L: ${pnl:.2f} ({pnl_percent:.2f}%)
Exit Reason: {exit_reason}

User Preferences:
- Profit Target: {user_preferences.get('profit_target_percent', 10) if user_preferences else 10}%
- Stop Loss: {user_preferences.get('stop_loss_percent', 5) if user_preferences else 5}%

Generate:
1. A concise title indicating sell recommendation
2. A clear message explaining why to exit this position now
3. A brief explanation of the exit conditions met

Format your response as:
TITLE: [title]
MESSAGE: [message]
EXPLANATION: [explanation]
"""
        
        elif alert_type == 'risk_alert':
            risk_data = context.get('risk_data', {})
            violations = risk_data.get('violations', [])
            
            prompt = f"""
Generate a personalized RISK ALERT for the user's portfolio.

Risk Data:
{base_info}
Risk Violations: {', '.join(violations) if violations else 'Approaching limits'}
Daily Loss: ${risk_data.get('daily_loss', 0):.2f}
Max Daily Loss Limit: ${risk_data.get('max_daily_loss', 0):.2f}

User Preferences:
- Risk Tolerance: {user_preferences.get('risk_tolerance', 'moderate') if user_preferences else 'moderate'}

Generate:
1. A clear, urgent title
2. A message explaining the risk situation
3. A brief explanation of what actions to consider

Format your response as:
TITLE: [title]
MESSAGE: [message]
EXPLANATION: [explanation]
"""
        
        elif alert_type == 'trade_executed':
            trade = context.get('trade', {})
            action = trade.get('action', '')
            quantity = trade.get('quantity', 0)
            price = trade.get('price', 0)
            automation = context.get('automation', {})
            
            prompt = f"""
Generate a personalized TRADE EXECUTED alert for {symbol}.

Trade Details:
{base_info}
Action: {action.upper()}
Quantity: {quantity} contracts
Price: ${price:.2f} per contract
Automation: {automation.get('name', 'Automated Strategy')}

Generate:
1. A positive, informative title
2. A message confirming the trade execution
3. A brief explanation of what this trade means for the portfolio

Format your response as:
TITLE: [title]
MESSAGE: [message]
EXPLANATION: [explanation]
"""
        
        else:
            prompt = f"""
Generate a personalized alert for {symbol}.

Context:
{base_info}
Alert Type: {alert_type}
Additional Data: {context}

Generate:
1. A clear title
2. An informative message
3. A brief explanation

Format your response as:
TITLE: [title]
MESSAGE: [message]
EXPLANATION: [explanation]
"""
        
        return prompt
    
    def _parse_ai_response(self, ai_response: str, alert_type: str, context: Dict) -> Dict:
        """Parse OpenAI response into structured format"""
        lines = ai_response.split('\n')
        
        title = ""
        message = ""
        explanation = ""
        
        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith('TITLE:'):
                title = line.replace('TITLE:', '').strip()
                current_section = 'title'
            elif line.startswith('MESSAGE:'):
                message = line.replace('MESSAGE:', '').strip()
                current_section = 'message'
            elif line.startswith('EXPLANATION:'):
                explanation = line.replace('EXPLANATION:', '').strip()
                current_section = 'explanation'
            elif current_section == 'title' and not title:
                title = line
            elif current_section == 'message':
                message += " " + line if message else line
            elif current_section == 'explanation':
                explanation += " " + line if explanation else line
        
        # Fallback if parsing failed
        if not title:
            title = f"{alert_type.replace('_', ' ').title()}: {context.get('symbol', '')}"
        if not message:
            message = ai_response[:200]  # Use first 200 chars as message
        if not explanation:
            explanation = ai_response
        
        return {
            'title': title,
            'message': message,
            'explanation': explanation
        }
    
    def _generate_fallback_message(self, alert_type: str, context: Dict) -> Dict:
        """Generate rule-based fallback messages when OpenAI is not available"""
        symbol = context.get('symbol', '')
        confidence = context.get('confidence', 0)
        
        if alert_type == 'buy_signal':
            technical_data = context.get('technical_analysis', {})
            indicators = technical_data.get('indicators', {})
            signals = technical_data.get('signals', {})
            individual_signals = signals.get('signals', [])
            
            # Build indicator summary
            rsi = indicators.get('rsi', 0)
            sma_20 = indicators.get('sma_20', 0)
            sma_50 = indicators.get('sma_50', 0)
            volume_ratio = indicators.get('volume', {}).get('ratio', 1.0)
            macd_hist = indicators.get('macd', {}).get('histogram', 0)
            
            # List triggered signals
            signal_names = [s.get('name', '') for s in individual_signals if s.get('type') == 'bullish']
            signal_list = ", ".join(signal_names) if signal_names else "Technical indicators"
            
            message = f"Technical analysis suggests a buying opportunity for {symbol} with {confidence:.1%} confidence. "
            message += f"Triggered by: {signal_list}. "
            
            # Add specific indicator details
            indicator_details = []
            if rsi < 35:
                indicator_details.append(f"RSI oversold at {rsi:.1f}")
            if sma_20 > sma_50 > indicators.get('sma_200', 0):
                indicator_details.append(f"Golden Cross (price above all MAs)")
            if volume_ratio > 1.5:
                indicator_details.append(f"High volume ({volume_ratio:.1f}x average)")
            if macd_hist > 0:
                indicator_details.append("MACD bullish crossover")
            
            if indicator_details:
                message += "Key factors: " + ", ".join(indicator_details) + "."
            
            explanation = f"Technical indicators supporting this buy signal for {symbol}: "
            explanation += f"RSI={rsi:.1f}, SMA20=${sma_20:.2f}, SMA50=${sma_50:.2f}, Volume={volume_ratio:.1f}x avg, MACD Histogram={macd_hist:.4f}. "
            explanation += f"Consider reviewing the options chain for entry opportunities."
            
            return {
                'title': f"Buy Signal: {symbol}",
                'message': message,
                'explanation': explanation
            }
        elif alert_type == 'sell_signal':
            pnl = context.get('unrealized_pnl', 0)
            return {
                'title': f"Sell Signal: {symbol}",
                'message': f"Exit conditions met for {symbol} position. Current P/L: ${pnl:.2f}",
                'explanation': f"Your position in {symbol} has met exit criteria. Consider closing the position to lock in profits or limit losses."
            }
        elif alert_type == 'risk_alert':
            return {
                'title': "Portfolio Risk Alert",
                'message': "Your portfolio has exceeded risk limits or is approaching them.",
                'explanation': "Review your positions and consider reducing exposure to stay within your risk parameters."
            }
        elif alert_type == 'trade_executed':
            action = context.get('trade', {}).get('action', '')
            return {
                'title': f"Trade Executed: {action.upper()} {symbol}",
                'message': f"Your automation successfully executed a {action} trade for {symbol}.",
                'explanation': f"The automated trading system executed a {action} order for {symbol} based on your configured strategy."
            }
        else:
            return {
                'title': f"Alert: {symbol}",
                'message': f"An alert has been generated for {symbol}.",
                'explanation': "Review the details and take appropriate action."
            }

