"""
Spread Executor Service
Handles execution and management of vertical debit/credit spreads
"""

import logging
from typing import Optional, Dict
from datetime import datetime
from app import db
from models.spread import Spread
from models.user import User
from services.tradier_connector import TradierConnector

logger = logging.getLogger(__name__)

class SpreadExecutor:
    """Execute and manage vertical spreads"""
    
    def __init__(self, tradier_connector: Optional[TradierConnector] = None):
        self.tradier = tradier_connector or TradierConnector()
    
    def calculate_spread_metrics(self, symbol: str, option_type: str, long_strike: float,
                                 short_strike: float, expiration: str, quantity: int = 1) -> Dict:
        """
        Calculate spread metrics without executing
        
        Returns:
            Dict with spread metrics including net_debit, max_profit, max_loss, breakeven
        """
        try:
            # Get current option prices
            long_option = self.tradier.get_option_quote(symbol, option_type, long_strike, expiration)
            short_option = self.tradier.get_option_quote(symbol, option_type, short_strike, expiration)
            
            if not long_option or not short_option:
                raise ValueError("Unable to get option quotes for both legs")
            
            long_premium = long_option.get('mid', 0) or long_option.get('last', 0)
            short_premium = short_option.get('mid', 0) or short_option.get('last', 0)
            
            if long_premium <= 0 or short_premium <= 0:
                raise ValueError("Invalid option prices - cannot calculate spread")
            
            # Calculate spread economics
            strike_width = abs(long_strike - short_strike)
            net_debit = (long_premium - short_premium) * quantity * 100
            max_profit = (strike_width * 100 * quantity) - abs(net_debit)
            max_loss = abs(net_debit)
            
            # Calculate breakeven
            if option_type == 'put':
                # PUT debit spread: buy higher, sell lower
                # Breakeven = long_strike - (net_debit / (quantity * 100))
                breakeven = long_strike - (abs(net_debit) / (quantity * 100))
            else:  # call
                # CALL debit spread: buy lower, sell higher
                # Breakeven = long_strike + (net_debit / (quantity * 100))
                breakeven = long_strike + (abs(net_debit) / (quantity * 100))
            
            return_on_risk = (max_profit / max_loss * 100) if max_loss > 0 else 0
            
            return {
                'long_premium': long_premium,
                'short_premium': short_premium,
                'net_debit': net_debit,
                'max_profit': max_profit,
                'max_loss': max_loss,
                'breakeven': breakeven,
                'strike_width': strike_width,
                'return_on_risk': return_on_risk
            }
            
        except Exception as e:
            logger.error(f"Error calculating spread metrics: {e}", exc_info=True)
            raise
    
    def execute_debit_spread(self, user: User, symbol: str, option_type: str, 
                            long_strike: float, short_strike: float, expiration: str, 
                            quantity: int, account_type: str = 'paper') -> Spread:
        """
        Execute a vertical debit spread
        
        For PUT debit spread: Buy higher strike, sell lower strike
        For CALL debit spread: Buy lower strike, sell higher strike
        
        Args:
            user: User executing the spread
            symbol: Stock symbol
            option_type: 'call' or 'put'
            long_strike: Strike price of long leg (buy)
            short_strike: Strike price of short leg (sell)
            expiration: Expiration date 'YYYY-MM-DD'
            quantity: Number of spreads
            account_type: 'paper' or 'live'
        """
        try:
            # Validate strikes
            if option_type == 'put':
                if long_strike <= short_strike:
                    raise ValueError("PUT debit spread: long strike must be > short strike")
            else:  # call
                if long_strike >= short_strike:
                    raise ValueError("CALL debit spread: long strike must be < short strike")
            
            # Get current option prices
            long_option = self.tradier.get_option_quote(symbol, option_type, long_strike, expiration)
            short_option = self.tradier.get_option_quote(symbol, option_type, short_strike, expiration)
            
            if not long_option or not short_option:
                raise ValueError("Unable to get option quotes for both legs")
            
            long_premium = long_option.get('mid', 0) or long_option.get('last', 0)
            short_premium = short_option.get('mid', 0) or short_option.get('last', 0)
            
            if long_premium <= 0 or short_premium <= 0:
                raise ValueError("Invalid option prices")
            
            # Calculate spread economics
            strike_width = abs(long_strike - short_strike)
            net_debit = (long_premium - short_premium) * quantity * 100
            max_profit = (strike_width * 100 * quantity) - abs(net_debit)
            max_loss = abs(net_debit)
            
            # Calculate breakeven
            if option_type == 'put':
                breakeven = long_strike - (abs(net_debit) / (quantity * 100))
            else:  # call
                breakeven = long_strike + (abs(net_debit) / (quantity * 100))
            
            # Validate balance
            account_balance = user.paper_balance if account_type == 'paper' else (user.live_balance or 0)
            if account_balance < abs(net_debit):
                raise ValueError(
                    f"Insufficient balance: ${account_balance:,.2f} < ${abs(net_debit):,.2f} "
                    f"(need ${abs(net_debit) - account_balance:,.2f} more)"
                )
            
            # Create spread record
            spread = Spread(
                user_id=user.id,
                symbol=symbol.upper(),
                spread_type=f'debit_{option_type}',
                expiration=datetime.strptime(expiration, '%Y-%m-%d').date(),
                quantity=quantity,
                long_strike=long_strike,
                long_premium=long_premium,
                short_strike=short_strike,
                short_premium=short_premium,
                net_debit=net_debit,
                max_profit=max_profit,
                max_loss=max_loss,
                breakeven=breakeven,
                strike_width=strike_width,
                account_type=account_type,
                status='open'
            )
            
            # Deduct cost from account
            if account_type == 'paper':
                user.paper_balance -= abs(net_debit)
            else:
                user.live_balance = (user.live_balance or 0) - abs(net_debit)
            
            db.session.add(spread)
            db.session.commit()
            
            logger.info(
                f"✅ Executed {option_type.upper()} debit spread: {symbol} "
                f"${long_strike}/${short_strike} for ${abs(net_debit):,.2f}"
            )
            
            return spread
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error executing spread: {e}", exc_info=True)
            raise
    
    def close_spread(self, spread_id: int) -> Spread:
        """Close a spread and calculate P&L"""
        spread = Spread.query.get_or_404(spread_id)
        
        if spread.status != 'open':
            raise ValueError(f"Spread is not open (status: {spread.status})")
        
        option_type = 'put' if 'put' in spread.spread_type else 'call'
        expiration_str = spread.expiration.isoformat()
        
        # Get current prices
        long_option = self.tradier.get_option_quote(
            spread.symbol, option_type, spread.long_strike, expiration_str
        )
        short_option = self.tradier.get_option_quote(
            spread.symbol, option_type, spread.short_strike, expiration_str
        )
        
        if not long_option or not short_option:
            raise ValueError("Unable to get current option quotes for closing")
        
        current_long_price = long_option.get('mid', 0) or long_option.get('last', 0)
        current_short_price = short_option.get('mid', 0) or short_option.get('last', 0)
        
        # Calculate closing value (what we get back)
        # To close: sell long leg, buy back short leg
        closing_credit = (current_long_price - current_short_price) * spread.quantity * 100
        
        # Calculate P&L
        # Original net_debit is negative (we paid), closing_credit is what we get back
        realized_pnl = closing_credit - abs(spread.net_debit)
        
        # Update spread
        spread.current_value = closing_credit
        spread.realized_pnl = realized_pnl
        spread.unrealized_pnl_percent = (realized_pnl / abs(spread.net_debit) * 100) if spread.net_debit != 0 else 0
        spread.status = 'closed'
        spread.closed_at = datetime.utcnow()
        spread.last_updated = datetime.utcnow()
        
        # Credit account
        user = User.query.get(spread.user_id)
        if spread.account_type == 'paper':
            user.paper_balance += closing_credit
        else:
            user.live_balance = (user.live_balance or 0) + closing_credit
        
        db.session.commit()
        
        logger.info(
            f"✅ Closed spread #{spread_id}: P&L ${realized_pnl:,.2f} "
            f"({spread.unrealized_pnl_percent:.2f}%)"
        )
        
        return spread

