from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from models.alert import Alert
from services.signal_generator import SignalGenerator
from services.technical_analyzer import TechnicalAnalyzer
from services.position_monitor import PositionMonitor
from services.risk_manager import RiskManager
from services.ai_alert_generator import AIAlertGenerator

class AlertGenerator:
    """Generate and manage trading alerts"""
    
    def __init__(self):
        self.signal_generator = SignalGenerator()
        self.technical_analyzer = TechnicalAnalyzer()
        self.position_monitor = PositionMonitor()
        self.risk_manager = RiskManager()
        self.ai_alert_generator = AIAlertGenerator()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def generate_buy_signals(self, user_id: int, symbol: str, user_preferences: Dict = None) -> List[Alert]:
        """Generate buy signals for a symbol"""
        db = self._get_db()
        
        # Get user preferences if not provided
        if user_preferences is None:
            from models.user import User
            user = db.session.query(User).get(user_id)
            if user:
                user_preferences = {
                    'risk_tolerance': user.risk_tolerance or 'moderate',
                    'strategy': user.default_strategy or 'balanced',
                    'min_confidence': getattr(user, 'min_confidence', 0.6)
                }
        
        # Get signals
        signals = self.signal_generator.generate_signals(symbol, user_preferences or {})
        
        if 'error' in signals or not signals.get('signals', {}).get('recommended', False):
            return []
        
        signal_info = signals['signals']
        technical_analysis = signals.get('technical_analysis', {})
        
        # Get current quote for context
        quote = self.technical_analyzer.tradier.get_quote(symbol)
        quote_data = quote.get('quotes', {}).get('quote', {}) if 'quotes' in quote else {}
        current_price = quote_data.get('last', 0)
        
        # Generate AI-powered alert message
        context = {
            'symbol': symbol,
            'current_price': current_price,
            'confidence': signal_info['confidence'],
            'technical_analysis': technical_analysis,
            'volume_change_percent': quote_data.get('volume', 0)  # Simplified for now
        }
        
        ai_message = self.ai_alert_generator.generate_alert_message(
            'buy_signal',
            context,
            user_preferences
        )
        
        # Extract technical indicators and signals for details
        indicators = technical_analysis.get('indicators', {})
        technical_signals = technical_analysis.get('signals', {})
        individual_signals = technical_signals.get('signals', [])
        
        # Create alert with AI-generated content
        alert = Alert(
            user_id=user_id,
            alert_type='buy_signal',
            priority='high' if signal_info['confidence'] >= 0.75 else 'medium',
            symbol=symbol,
            signal_direction=signal_info['direction'],
            confidence=signal_info['confidence'],
            signal_strength='high' if signal_info['confidence'] >= 0.75 else 'medium' if signal_info['confidence'] >= 0.6 else 'low',
            title=ai_message['title'],
            message=ai_message['message'],
            explanation=ai_message['explanation'],
            details={
                'technical_confidence': signal_info.get('technical_confidence'),
                'iv_adjustment': signal_info.get('iv_adjustment'),
                'signal_count': signal_info.get('signal_count'),
                'ai_generated': True,
                # Include actual technical indicator values
                'indicators': {
                    'rsi': round(indicators.get('rsi', 0), 2),
                    'sma_20': round(indicators.get('sma_20', 0), 2),
                    'sma_50': round(indicators.get('sma_50', 0), 2),
                    'sma_200': round(indicators.get('sma_200', 0), 2),
                    'macd': {
                        'line': round(indicators.get('macd', {}).get('line', 0), 4),
                        'signal': round(indicators.get('macd', {}).get('signal', 0), 4),
                        'histogram': round(indicators.get('macd', {}).get('histogram', 0), 4)
                    },
                    'volume': {
                        'current': indicators.get('volume', {}).get('current', 0),
                        'average': round(indicators.get('volume', {}).get('average', 0), 0),
                        'ratio': round(indicators.get('volume', {}).get('ratio', 1.0), 2)
                    },
                    'price_change': {
                        'dollars': round(indicators.get('price_change', {}).get('dollars', 0), 2),
                        'percent': round(indicators.get('price_change', {}).get('percent', 0), 2)
                    }
                },
                # Include which specific signals triggered
                'triggered_signals': [
                    {
                        'name': s.get('name', ''),
                        'type': s.get('type', ''),
                        'description': s.get('description', ''),
                        'confidence': s.get('confidence', 0),
                        'strength': s.get('strength', 'medium')
                    }
                    for s in individual_signals
                ]
            },
            expires_at=datetime.utcnow() + timedelta(hours=24)  # Alerts expire after 24 hours
        )
        
        db.session.add(alert)
        db.session.commit()
        
        return [alert]
    
    def generate_sell_signals(self, user_id: int, position_id: int) -> Optional[Alert]:
        """Generate sell signal for a position"""
        db = self._get_db()
        from models.position import Position
        from models.user import User
        
        position = db.session.query(Position).get(position_id)
        if not position:
            return None
        
        # Check exit conditions
        automation = None
        if position.automation_id:
            from models.automation import Automation
            automation = db.session.query(Automation).get(position.automation_id)
        
        should_exit, reason = self.position_monitor.check_exit_conditions(position, automation)
        
        if not should_exit:
            return None
        
        # Get user preferences
        user = db.session.query(User).get(user_id)
        user_preferences = {}
        if user:
            user_preferences = {
                'risk_tolerance': user.risk_tolerance or 'moderate',
                'profit_target_percent': getattr(automation, 'profit_target_percent', 10) if automation else 10,
                'stop_loss_percent': getattr(automation, 'stop_loss_percent', 5) if automation else 5
            }
        
        # Generate AI-powered alert message
        context = {
            'symbol': position.symbol,
            'current_price': position.current_price or position.entry_price,
            'position': {
                'entry_price': position.entry_price,
                'current_price': position.current_price,
                'quantity': position.quantity
            },
            'unrealized_pnl': position.unrealized_pnl,
            'unrealized_pnl_percent': position.unrealized_pnl_percent,
            'exit_reason': reason
        }
        
        ai_message = self.ai_alert_generator.generate_alert_message(
            'sell_signal',
            context,
            user_preferences
        )
        
        # Create sell alert with AI-generated content
        alert = Alert(
            user_id=position.user_id,
            alert_type='sell_signal',
            priority='high' if 'stop loss' in reason.lower() or 'expired' in reason.lower() else 'medium',
            symbol=position.symbol,
            signal_direction='exit',
            title=ai_message['title'],
            message=ai_message['message'],
            explanation=ai_message['explanation'],
            position_id=position_id,
            automation_id=position.automation_id,
            details={
                'current_pnl': position.unrealized_pnl,
                'current_pnl_percent': position.unrealized_pnl_percent,
                'entry_price': position.entry_price,
                'current_price': position.current_price,
                'ai_generated': True
            },
            expires_at=datetime.utcnow() + timedelta(hours=1)  # Sell alerts expire quickly
        )
        
        db.session.add(alert)
        db.session.commit()
        
        return alert
    
    def generate_risk_alerts(self, user_id: int) -> List[Alert]:
        """Generate risk alerts for user's portfolio"""
        db = self._get_db()
        from models.user import User
        alerts = []
        
        # Get user preferences
        user = db.session.query(User).get(user_id)
        user_preferences = {
            'risk_tolerance': user.risk_tolerance or 'moderate' if user else 'moderate'
        }
        
        # Check portfolio risk
        portfolio_risk = self.risk_manager.check_portfolio_limits(user_id)
        
        if not portfolio_risk.get('within_limits', True):
            violations = portfolio_risk.get('violations', [])
            for violation in violations:
                # Generate AI-powered alert message
                context = {
                    'symbol': None,
                    'current_price': 0,
                    'risk_data': {
                        'violations': violations,
                        'daily_loss': portfolio_risk.get('daily_loss', 0),
                        'max_daily_loss': portfolio_risk.get('max_daily_loss', 0)
                    }
                }
                
                ai_message = self.ai_alert_generator.generate_alert_message(
                    'risk_alert',
                    context,
                    user_preferences
                )
                
                alert = Alert(
                    user_id=user_id,
                    alert_type='risk_alert',
                    priority='critical',
                    symbol=None,
                    title=ai_message['title'],
                    message=ai_message['message'],
                    explanation=ai_message['explanation'],
                    details={
                        **portfolio_risk,
                        'ai_generated': True
                    },
                    expires_at=datetime.utcnow() + timedelta(hours=12)
                )
                alerts.append(alert)
                db.session.add(alert)
        
        # Check daily loss limit
        risk_limits = self.risk_manager.get_risk_limits(user_id)
        daily_loss = self.risk_manager._calculate_daily_loss(user_id)
        
        if daily_loss < 0 and risk_limits.max_daily_loss_percent:
            account_balance = user.paper_balance if user and user.trading_mode == 'paper' else 100000
            max_daily_loss = account_balance * (risk_limits.max_daily_loss_percent / 100.0)
            
            if abs(daily_loss) >= max_daily_loss * 0.8:  # Alert at 80% of limit
                # Generate AI-powered alert message
                context = {
                    'symbol': None,
                    'current_price': 0,
                    'risk_data': {
                        'violations': [],
                        'daily_loss': daily_loss,
                        'max_daily_loss': max_daily_loss
                    }
                }
                
                ai_message = self.ai_alert_generator.generate_alert_message(
                    'risk_alert',
                    context,
                    user_preferences
                )
                
                alert = Alert(
                    user_id=user_id,
                    alert_type='risk_alert',
                    priority='high',
                    symbol=None,
                    title=ai_message['title'],
                    message=ai_message['message'],
                    explanation=ai_message['explanation'],
                    details={
                        'daily_loss': daily_loss,
                        'max_daily_loss': max_daily_loss,
                        'ai_generated': True
                    },
                    expires_at=datetime.utcnow() + timedelta(hours=24)
                )
                alerts.append(alert)
                db.session.add(alert)
        
        if alerts:
            db.session.commit()
        
        return alerts
    
    def scan_and_generate_alerts(self, user_id: int) -> Dict:
        """Scan for all alert opportunities"""
        db = self._get_db()
        from models.stock import Stock
        
        results = {
            'buy_signals': 0,
            'sell_signals': 0,
            'risk_alerts': 0,
            'total': 0
        }
        
        # Get user preferences
        from models.user import User
        user = db.session.query(User).get(user_id)
        user_preferences = None
        if user:
            user_preferences = {
                'risk_tolerance': user.risk_tolerance or 'moderate',
                'strategy': user.default_strategy or 'balanced',
                'min_confidence': 0.6  # Default, can be customized
            }
        
        # Generate buy signals for watchlist
        watchlist = db.session.query(Stock).filter_by(user_id=user_id).all()
        for stock in watchlist:
            try:
                buy_alerts = self.generate_buy_signals(user_id, stock.symbol, user_preferences)
                results['buy_signals'] += len(buy_alerts)
            except Exception as e:
                # Log error but continue
                pass
        
        # Generate sell signals for positions
        from models.position import Position
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        for position in positions:
            try:
                sell_alert = self.generate_sell_signals(user_id, position.id)
                if sell_alert:
                    results['sell_signals'] += 1
            except Exception as e:
                # Log error but continue
                pass
        
        # Generate risk alerts
        try:
            risk_alerts = self.generate_risk_alerts(user_id)
            results['risk_alerts'] += len(risk_alerts)
        except Exception as e:
            # Log error but continue
            pass
        
        results['total'] = results['buy_signals'] + results['sell_signals'] + results['risk_alerts']
        
        return results

