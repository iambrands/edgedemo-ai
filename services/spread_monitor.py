"""
Spread Position Monitor Service

Monitors spread positions for stop-loss thresholds and generates alerts
when user's risk limits are exceeded.
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from flask import current_app
import logging

logger = logging.getLogger(__name__)


class SpreadMonitor:
    """Monitor spread positions and generate alerts for risk thresholds"""
    
    def __init__(self):
        from services.tradier_connector import TradierConnector
        self.tradier = TradierConnector()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def get_option_price(self, symbol: str, expiration: str, strike: float, 
                         option_type: str) -> Optional[float]:
        """
        Fetch current price for a single option leg.
        
        Args:
            symbol: Underlying symbol (e.g., 'TSLA')
            expiration: Expiration date as string 'YYYY-MM-DD'
            strike: Strike price
            option_type: 'call' or 'put'
            
        Returns:
            Mid price of the option, or None if not found
        """
        try:
            # Get options chain for the expiration
            chain = self.tradier.get_options_chain(symbol, expiration)
            
            if not chain:
                logger.warning(f"No options chain for {symbol} {expiration}")
                return None
            
            # Find the specific option
            for option in chain:
                if not isinstance(option, dict):
                    continue
                
                opt_strike = option.get('strike') or option.get('strike_price')
                opt_type = (
                    option.get('option_type') or 
                    option.get('type') or 
                    option.get('contract_type') or ''
                ).lower()
                
                if opt_strike is None:
                    continue
                
                # Match strike and type
                if abs(float(opt_strike) - strike) < 0.01 and opt_type == option_type.lower():
                    bid = option.get('bid', 0) or 0
                    ask = option.get('ask', 0) or 0
                    last = option.get('last', 0) or 0
                    
                    # Calculate mid price
                    if bid > 0 and ask > 0:
                        return (bid + ask) / 2
                    elif last > 0:
                        return last
                    elif bid > 0:
                        return bid
                    elif ask > 0:
                        return ask
                    
            logger.warning(f"Option not found: {symbol} {option_type} ${strike} {expiration}")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching option price: {e}")
            return None
    
    def calculate_spread_value(self, spread) -> Tuple[Optional[float], Dict]:
        """
        Calculate current value of a spread position.
        
        Args:
            spread: Spread model instance
            
        Returns:
            Tuple of (current_value, pricing_details)
        """
        expiration_str = spread.expiration.strftime('%Y-%m-%d') if spread.expiration else None
        if not expiration_str:
            return None, {'error': 'No expiration date'}
        
        # Determine option type based on spread type
        if spread.spread_type in ['debit_call', 'credit_call']:
            option_type = 'call'
        else:
            option_type = 'put'
        
        # Fetch prices for both legs
        long_price = self.get_option_price(
            spread.symbol, 
            expiration_str, 
            spread.long_strike, 
            option_type
        )
        
        short_price = self.get_option_price(
            spread.symbol, 
            expiration_str, 
            spread.short_strike, 
            option_type
        )
        
        pricing_details = {
            'long_strike': spread.long_strike,
            'short_strike': spread.short_strike,
            'long_price': long_price,
            'short_price': short_price,
            'option_type': option_type,
            'expiration': expiration_str
        }
        
        if long_price is None or short_price is None:
            pricing_details['error'] = 'Could not fetch option prices'
            return None, pricing_details
        
        # Calculate spread value (for debit spreads: long - short)
        # For credit spreads, we'd flip this
        if spread.spread_type in ['debit_call', 'debit_put']:
            current_value = (long_price - short_price) * spread.quantity * 100
        else:
            # Credit spread: value is what you'd pay to close
            current_value = (long_price - short_price) * spread.quantity * 100
        
        pricing_details['spread_value_per_contract'] = long_price - short_price
        pricing_details['total_value'] = current_value
        
        return current_value, pricing_details
    
    def update_spread_prices(self, spread) -> bool:
        """
        Update a spread's current value and P/L.
        
        Args:
            spread: Spread model instance
            
        Returns:
            True if update was successful
        """
        db = self._get_db()
        
        current_value, details = self.calculate_spread_value(spread)
        
        if current_value is None:
            logger.warning(
                f"Could not price spread {spread.id} ({spread.symbol}): {details.get('error')}"
            )
            return False
        
        # Update spread
        spread.current_value = current_value
        
        # Calculate P/L (net_debit is the entry cost)
        entry_cost = abs(spread.net_debit)  # Entry cost as positive number
        
        if spread.spread_type in ['debit_call', 'debit_put']:
            # Debit spread: P/L = current value - entry cost
            spread.unrealized_pnl = current_value - entry_cost
        else:
            # Credit spread: P/L = entry credit - cost to close
            spread.unrealized_pnl = entry_cost - abs(current_value)
        
        if entry_cost > 0:
            spread.unrealized_pnl_percent = (spread.unrealized_pnl / entry_cost) * 100
        
        spread.last_updated = datetime.utcnow()
        
        try:
            db.session.commit()
            logger.info(
                f"Updated spread {spread.id} ({spread.symbol}): "
                f"value=${current_value:.2f}, P/L=${spread.unrealized_pnl:.2f} "
                f"({spread.unrealized_pnl_percent:.1f}%)"
            )
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving spread update: {e}")
            return False
    
    def check_spread_stop_loss(self, spread, risk_limits) -> Tuple[bool, Optional[str]]:
        """
        Check if a spread has hit the user's stop loss threshold.
        
        Args:
            spread: Spread model instance
            risk_limits: RiskLimits model instance
            
        Returns:
            Tuple of (threshold_exceeded, reason)
        """
        if not risk_limits or not risk_limits.max_daily_loss_percent:
            return False, None
        
        # Calculate loss percentage (negative unrealized_pnl_percent means loss)
        loss_percent = abs(spread.unrealized_pnl_percent) if spread.unrealized_pnl_percent < 0 else 0
        
        if loss_percent >= risk_limits.max_daily_loss_percent:
            reason = (
                f"Stop loss threshold exceeded: {loss_percent:.1f}% loss "
                f"(limit: {risk_limits.max_daily_loss_percent}%)"
            )
            return True, reason
        
        return False, None
    
    def generate_spread_alert(self, spread, reason: str, user_id: int) -> Optional[int]:
        """
        Generate an alert for a spread that has hit its stop loss.
        
        Args:
            spread: Spread model instance
            reason: Reason for the alert
            user_id: User ID
            
        Returns:
            Alert ID if created, None otherwise
        """
        db = self._get_db()
        from models.alert import Alert
        
        # Check if we already have an active alert for this spread
        existing_alert = db.session.query(Alert).filter(
            Alert.user_id == user_id,
            Alert.alert_type == 'spread_stop_loss',
            Alert.symbol == spread.symbol,
            Alert.status == 'active',
            Alert.details.contains({'spread_id': spread.id})
        ).first()
        
        if existing_alert:
            logger.debug(f"Alert already exists for spread {spread.id}")
            return existing_alert.id
        
        # Calculate days to expiration
        dte = (spread.expiration - datetime.now().date()).days if spread.expiration else 0
        
        # Create the alert
        alert = Alert(
            user_id=user_id,
            alert_type='spread_stop_loss',
            priority='high',
            status='active',
            symbol=spread.symbol,
            signal_direction='exit',
            title=f"⚠️ {spread.symbol} Spread Stop Loss Alert",
            message=(
                f"Your {spread.spread_type.upper().replace('_', ' ')} spread on {spread.symbol} "
                f"has exceeded your stop loss threshold.\n\n"
                f"Current Loss: ${abs(spread.unrealized_pnl):.2f} ({abs(spread.unrealized_pnl_percent):.1f}%)\n"
                f"Entry Cost: ${abs(spread.net_debit):.2f}\n"
                f"Current Value: ${spread.current_value:.2f}\n"
                f"Days to Expiration: {dte}\n\n"
                f"Consider closing this position to limit further losses."
            ),
            explanation=(
                f"This alert was triggered because your {spread.symbol} spread "
                f"is down {abs(spread.unrealized_pnl_percent):.1f}%, which exceeds your "
                f"configured stop loss of {reason.split('limit:')[1].strip() if 'limit:' in reason else '5%'}. "
                f"Review the position and decide whether to close it manually."
            ),
            details={
                'spread_id': spread.id,
                'spread_type': spread.spread_type,
                'long_strike': spread.long_strike,
                'short_strike': spread.short_strike,
                'quantity': spread.quantity,
                'expiration': spread.expiration.isoformat() if spread.expiration else None,
                'entry_cost': abs(spread.net_debit),
                'current_value': spread.current_value,
                'unrealized_pnl': spread.unrealized_pnl,
                'unrealized_pnl_percent': spread.unrealized_pnl_percent,
                'max_profit': spread.max_profit,
                'max_loss': spread.max_loss,
                'breakeven': spread.breakeven,
                'dte': dte,
                'reason': reason
            },
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        
        db.session.add(alert)
        
        try:
            db.session.commit()
            logger.info(
                f"Created spread stop loss alert for {spread.symbol} spread {spread.id} "
                f"(loss: {spread.unrealized_pnl_percent:.1f}%)"
            )
            return alert.id
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating spread alert: {e}")
            return None
    
    def monitor_all_spreads(self, user_id: int = None) -> Dict:
        """
        Monitor all open spreads and generate alerts for stop loss violations.
        
        Args:
            user_id: Optional user ID to filter by
            
        Returns:
            Results dictionary with monitoring stats
        """
        db = self._get_db()
        from models.spread import Spread
        from services.risk_manager import RiskManager
        
        risk_manager = RiskManager()
        
        # Get open spreads
        query = db.session.query(Spread).filter_by(status='open')
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        spreads = query.all()
        
        results = {
            'spreads_monitored': len(spreads),
            'spreads_updated': 0,
            'alerts_generated': 0,
            'errors': []
        }
        
        for spread in spreads:
            try:
                # Update spread prices
                if self.update_spread_prices(spread):
                    results['spreads_updated'] += 1
                
                # Check stop loss
                risk_limits = risk_manager.get_risk_limits(spread.user_id)
                exceeded, reason = self.check_spread_stop_loss(spread, risk_limits)
                
                if exceeded:
                    alert_id = self.generate_spread_alert(spread, reason, spread.user_id)
                    if alert_id:
                        results['alerts_generated'] += 1
                        
                        # Send notification
                        try:
                            from utils.notifications import get_notification_system
                            notifications = get_notification_system()
                            notifications.send_spread_alert(
                                spread.user_id,
                                spread.to_dict(),
                                reason
                            )
                        except Exception as e:
                            logger.warning(f"Could not send notification: {e}")
                            
            except Exception as e:
                error_msg = f"Error monitoring spread {spread.id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
        
        logger.info(
            f"Spread monitoring complete: {results['spreads_updated']}/{results['spreads_monitored']} "
            f"updated, {results['alerts_generated']} alerts generated"
        )
        
        return results


# Singleton instance
_spread_monitor = None

def get_spread_monitor() -> SpreadMonitor:
    """Get or create spread monitor instance"""
    global _spread_monitor
    if _spread_monitor is None:
        _spread_monitor = SpreadMonitor()
    return _spread_monitor
