from typing import Dict, Optional
from datetime import datetime
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class NotificationSystem:
    """Notification system for trade alerts"""
    
    def __init__(self):
        # In production, would initialize email service, push notification service, etc.
        pass
    
    def send_position_opened(self, user_id: int, position: Dict, opportunity: Dict):
        """Send notification when position is opened"""
        try:
            # Get user email
            db = current_app.extensions['sqlalchemy']
            from models.user import User
            user = db.session.query(User).get(user_id)
            
            if not user or not user.notification_enabled:
                return
            
            symbol = position.get('symbol', 'Unknown')
            contract_symbol = position.get('option_symbol', 'N/A')
            quantity = position.get('quantity', 0)
            entry_price = position.get('entry_price', 0)
            total_cost = entry_price * quantity * 100
            
            entry_reason = opportunity.get('entry_reason', 'Automated entry')
            
            message = f"""
Your IAB OptionsBot just opened a new position:

Stock: {symbol}
Contract: {contract_symbol}
Action: Bought to Open
Quantity: {quantity} contracts
Entry Price: ${entry_price:.2f} per contract
Total Cost: ${total_cost:.2f}

ENTRY REASONING:
{entry_reason}

The bot will automatically manage this position according to your automation settings.
            """.strip()
            
            # Log notification (would send email/push in production)
            logger.info(f"Position opened notification for user {user_id}: {message}")
            
            # In production:
            # send_email(user.email, "New Position Opened", message)
            # send_push_notification(user, "Position opened", f"{symbol}")
            
        except Exception as e:
            logger.error(f"Error sending position opened notification: {e}")
    
    def send_position_closed(self, user_id: int, position: Dict, exit_reason: str, pnl: float):
        """Send notification when position is closed"""
        try:
            db = current_app.extensions['sqlalchemy']
            from models.user import User
            user = db.session.query(User).get(user_id)
            
            if not user or not user.notification_enabled:
                return
            
            symbol = position.get('symbol', 'Unknown')
            exit_price = position.get('exit_price', 0)
            quantity = position.get('quantity', 0)
            pnl_percent = (pnl / (position.get('entry_price', 1) * quantity * 100)) * 100 if position.get('entry_price', 0) > 0 else 0
            
            message = f"""
Your IAB OptionsBot closed a position:

Stock: {symbol}
Exit Price: ${exit_price:.2f}
Quantity: {quantity} contracts
P/L: ${pnl:.2f} ({pnl_percent:+.1f}%)

EXIT REASON:
{exit_reason}
            """.strip()
            
            logger.info(f"Position closed notification for user {user_id}: {message}")
            
            # In production:
            # send_email(user.email, "Position Closed", message)
            # send_push_notification(user, "Position closed", f"{symbol} - {pnl_percent:+.1f}%")
            
        except Exception as e:
            logger.error(f"Error sending position closed notification: {e}")
    
    def send_error_notification(self, user_id: int, error_message: str, context: Dict = None):
        """Send error notification to user"""
        try:
            db = current_app.extensions['sqlalchemy']
            from models.user import User
            user = db.session.query(User).get(user_id)
            
            if not user or not user.notification_enabled:
                return
            
            message = f"""
An error occurred in your IAB OptionsBot automation:

Error: {error_message}

Context: {context or 'None'}

The automation will continue running, but please review this error.
            """.strip()
            
            logger.warning(f"Error notification for user {user_id}: {message}")
            
            # In production:
            # send_email(user.email, "Automation Error", message)
            
        except Exception as e:
            logger.error(f"Error sending error notification: {e}")
    
    def send_spread_alert(self, user_id: int, spread: Dict, reason: str):
        """Send alert notification when spread hits stop loss threshold"""
        try:
            db = current_app.extensions['sqlalchemy']
            from models.user import User
            user = db.session.query(User).get(user_id)
            
            if not user or not user.notification_enabled:
                return
            
            symbol = spread.get('symbol', 'Unknown')
            spread_type = spread.get('spread_type', 'spread').upper().replace('_', ' ')
            long_strike = spread.get('long_strike', 0)
            short_strike = spread.get('short_strike', 0)
            quantity = spread.get('quantity', 0)
            entry_cost = abs(spread.get('net_debit', 0))
            current_value = spread.get('current_value', 0)
            unrealized_pnl = spread.get('unrealized_pnl', 0)
            unrealized_pnl_percent = spread.get('unrealized_pnl_percent', 0)
            expiration = spread.get('expiration', 'Unknown')
            
            message = f"""
⚠️ SPREAD STOP LOSS ALERT ⚠️

Your {symbol} {spread_type} has exceeded your stop loss threshold!

Position Details:
• Symbol: {symbol}
• Type: {spread_type}
• Strikes: ${long_strike} / ${short_strike}
• Quantity: {quantity} spreads
• Expiration: {expiration}

P/L Status:
• Entry Cost: ${entry_cost:.2f}
• Current Value: ${current_value:.2f}
• Unrealized P/L: ${unrealized_pnl:.2f} ({unrealized_pnl_percent:+.1f}%)

REASON: {reason}

ACTION REQUIRED:
Review this position and consider closing it manually to limit further losses.
The system cannot auto-close spread positions - manual intervention is required.

Go to Portfolio > Spreads to manage this position.
            """.strip()
            
            logger.warning(f"Spread stop loss alert for user {user_id}: {symbol} {spread_type}")
            logger.info(f"Spread alert details: {message}")
            
            # In production:
            # send_email(user.email, f"⚠️ Spread Stop Loss Alert: {symbol}", message)
            # send_push_notification(user, "Spread Stop Loss Alert", f"{symbol} down {unrealized_pnl_percent:.1f}%")
            
        except Exception as e:
            logger.error(f"Error sending spread alert notification: {e}")

# Global instance
_notification_system = None

def get_notification_system():
    """Get notification system instance"""
    global _notification_system
    if _notification_system is None:
        _notification_system = NotificationSystem()
    return _notification_system

