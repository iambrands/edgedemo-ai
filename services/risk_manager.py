from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from flask import current_app
from models.risk_limits import RiskLimits
from models.position import Position
from models.trade import Trade
from models.user import User

class RiskManager:
    """Risk management and position sizing service"""
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def _get_default_risk_limits(self, user: User) -> Dict:
        """
        Get default risk limits based on user's risk tolerance and trading mode
        
        Returns:
            Dictionary of default risk limit values
        """
        is_paper = user.trading_mode == 'paper'
        risk_tolerance = user.risk_tolerance or 'moderate'
        
        # Base defaults for paper vs live trading
        if is_paper:
            # Paper trading defaults (more lenient for testing)
            base_defaults = {
                'max_position_size_percent': 2.0,
                'max_capital_at_risk_percent': 10.0,
                'max_open_positions': 10,
                'max_positions_per_symbol': 3,
                'max_daily_loss_percent': 50.0,
                'max_weekly_loss_percent': 75.0,
                'max_monthly_loss_percent': 100.0,  # No monthly limit for paper
                'min_dte': 7,
                'max_dte': 60
            }
        else:
            # Live trading defaults (more conservative)
            base_defaults = {
                'max_position_size_percent': 2.0,
                'max_capital_at_risk_percent': 10.0,
                'max_open_positions': 10,
                'max_positions_per_symbol': 3,
                'max_daily_loss_percent': 5.0,
                'max_weekly_loss_percent': 10.0,
                'max_monthly_loss_percent': 20.0,
                'min_dte': 7,
                'max_dte': 60
            }
        
        # Adjust based on risk tolerance
        if risk_tolerance == 'low':
            # Conservative: Lower limits
            base_defaults['max_position_size_percent'] = 1.0
            base_defaults['max_capital_at_risk_percent'] = 5.0
            base_defaults['max_open_positions'] = 5
            if is_paper:
                base_defaults['max_daily_loss_percent'] = 25.0
            else:
                base_defaults['max_daily_loss_percent'] = 2.0
            base_defaults['max_weekly_loss_percent'] = base_defaults['max_daily_loss_percent'] * 2
            base_defaults['max_monthly_loss_percent'] = base_defaults['max_daily_loss_percent'] * 4
            base_defaults['min_dte'] = 14  # Prefer longer DTE
            base_defaults['max_dte'] = 45
            
        elif risk_tolerance == 'high':
            # Aggressive: Higher limits
            base_defaults['max_position_size_percent'] = 5.0
            base_defaults['max_capital_at_risk_percent'] = 20.0
            base_defaults['max_open_positions'] = 20
            if is_paper:
                base_defaults['max_daily_loss_percent'] = 75.0
            else:
                base_defaults['max_daily_loss_percent'] = 10.0
            base_defaults['max_weekly_loss_percent'] = base_defaults['max_daily_loss_percent'] * 2
            base_defaults['max_monthly_loss_percent'] = base_defaults['max_daily_loss_percent'] * 4
            base_defaults['min_dte'] = 0  # Allow same-day expiration
            base_defaults['max_dte'] = 90
            
        # 'moderate' uses base_defaults as-is
        
        return base_defaults
    
    def get_risk_limits(self, user_id: int) -> Optional[RiskLimits]:
        """Get user's risk limits, create default if not exists based on risk tolerance"""
        db = self._get_db()
        risk_limits = db.session.query(RiskLimits).filter_by(user_id=user_id).first()
        
        if not risk_limits:
            # Create default risk limits based on user's risk tolerance
            user = db.session.query(User).get(user_id)
            if not user:
                return None
            
            defaults = self._get_default_risk_limits(user)
            
            risk_limits = RiskLimits(
                user_id=user_id,
                **defaults
            )
            db.session.add(risk_limits)
            db.session.commit()
        
        return risk_limits
    
    def calculate_position_size(self, user_id: int, symbol: str, price: float, 
                                option_symbol: str = None) -> Tuple[int, Optional[str]]:
        """
        Calculate appropriate position size based on risk limits
        
        Returns:
            Tuple of (quantity, error_message)
        """
        db = self._get_db()
        user = db.session.query(User).get(user_id)
        if not user:
            return (0, "User not found")
        
        risk_limits = self.get_risk_limits(user_id)
        
        # Get account balance (paper or live)
        if user.trading_mode == 'paper':
            account_balance = user.paper_balance
        else:
            # In live mode, get from Tradier account
            # For now, use paper balance as placeholder
            account_balance = user.paper_balance
        
        # Calculate max position size
        max_position_value = account_balance * (risk_limits.max_position_size_percent / 100.0)
        
        # If absolute dollar limit is set, use the smaller of the two
        if risk_limits.max_position_size_dollars:
            max_position_value = min(max_position_value, risk_limits.max_position_size_dollars)
        
        # Calculate quantity (for options, multiply by 100)
        contract_multiplier = 100 if option_symbol else 1
        max_quantity = int(max_position_value / (price * contract_multiplier))
        
        # Ensure minimum of 1 contract/share
        quantity = max(1, max_quantity)
        
        return (quantity, None)
    
    def validate_trade(self, user_id: int, symbol: str, action: str, quantity: int,
                      price: float, option_symbol: str = None, strike: float = None,
                      expiration_date: str = None, delta: float = None) -> Tuple[bool, Optional[str]]:
        """
        Validate trade against risk limits
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        db = self._get_db()
        risk_limits = self.get_risk_limits(user_id)
        user = db.session.query(User).get(user_id)
        
        # Check position count limits
        open_positions = db.session.query(Position).filter_by(
            user_id=user_id, 
            status='open'
        ).count()
        
        if open_positions >= risk_limits.max_open_positions:
            return (False, f"Maximum open positions ({risk_limits.max_open_positions}) reached")
        
        # Check positions per symbol
        symbol_positions = db.session.query(Position).filter_by(
            user_id=user_id,
            symbol=symbol,
            status='open'
        ).count()
        
        if symbol_positions >= risk_limits.max_positions_per_symbol:
            return (False, f"Maximum positions per symbol ({risk_limits.max_positions_per_symbol}) reached for {symbol}")
        
        # Check DTE limits for options
        if expiration_date:
            exp_date = datetime.strptime(expiration_date, '%Y-%m-%d').date()
            dte = (exp_date - datetime.now().date()).days
            
            if dte < risk_limits.min_dte:
                return (False, f"Days to expiration ({dte}) below minimum ({risk_limits.min_dte})")
            
            if dte > risk_limits.max_dte:
                return (False, f"Days to expiration ({dte}) above maximum ({risk_limits.max_dte})")
        
        # Check delta limits
        if delta is not None and risk_limits.max_delta_per_position:
            position_delta = abs(delta * quantity * 100 if option_symbol else delta * quantity)
            if position_delta > risk_limits.max_delta_per_position:
                return (False, f"Position delta ({position_delta}) exceeds limit ({risk_limits.max_delta_per_position})")
        
        # Check portfolio delta limit
        if delta is not None and risk_limits.max_portfolio_delta:
            portfolio_delta = self._calculate_portfolio_delta(user_id)
            new_position_delta = (delta * quantity * 100 if option_symbol else delta * quantity)
            if action.lower() == 'buy':
                new_portfolio_delta = portfolio_delta + new_position_delta
            else:
                new_portfolio_delta = portfolio_delta - new_position_delta
            
            if abs(new_portfolio_delta) > risk_limits.max_portfolio_delta:
                return (False, f"Portfolio delta ({new_portfolio_delta}) would exceed limit ({risk_limits.max_portfolio_delta})")
        
        # Check buying power
        if action.lower() == 'buy':
            trade_cost = price * quantity * (100 if option_symbol else 1)
            if user.trading_mode == 'paper':
                if trade_cost > user.paper_balance:
                    return (False, f"Insufficient paper balance. Need ${trade_cost:.2f}, have ${user.paper_balance:.2f}")
            # In live mode, would check Tradier account balance
        
        # Check daily loss limit
        daily_loss = self._calculate_daily_loss(user_id)
        if daily_loss < 0 and risk_limits.max_daily_loss_percent:  # Only check if there's a loss
            # Use starting balance (100k for paper) or current balance, whichever is higher
            # This prevents the limit from shrinking as you lose money
            if user.trading_mode == 'paper':
                # For paper trading, use starting balance of 100k or current balance
                starting_balance = 100000.0  # Default paper trading starting balance
                account_balance = max(starting_balance, user.paper_balance)
            else:
                account_balance = user.paper_balance
            
            max_daily_loss = account_balance * (risk_limits.max_daily_loss_percent / 100.0)
            if abs(daily_loss) >= max_daily_loss:
                return (False, f"Daily loss limit ({risk_limits.max_daily_loss_percent}%) reached. Current loss: ${abs(daily_loss):.2f}, Limit: ${max_daily_loss:.2f}")
        
        return (True, None)
    
    def _calculate_portfolio_delta(self, user_id: int) -> float:
        """Calculate total portfolio delta"""
        db = self._get_db()
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        
        total_delta = 0.0
        for position in positions:
            if position.current_delta:
                # For options, multiply by 100
                multiplier = 100 if position.option_symbol else 1
                total_delta += position.current_delta * position.quantity * multiplier
        
        return total_delta
    
    def _calculate_daily_loss(self, user_id: int) -> float:
        """Calculate today's realized and unrealized loss"""
        db = self._get_db()
        today = datetime.now().date()
        
        # Get today's trades
        today_trades = db.session.query(Trade).filter(
            Trade.user_id == user_id,
            db.func.date(Trade.trade_date) == today
        ).all()
        
        # Calculate realized P/L from closed positions
        realized_pnl = sum(t.realized_pnl or 0 for t in today_trades if t.realized_pnl)
        
        # Calculate unrealized P/L from open positions
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        unrealized_pnl = sum(p.unrealized_pnl or 0 for p in positions)
        
        return realized_pnl + unrealized_pnl
    
    def check_portfolio_limits(self, user_id: int) -> Dict[str, any]:
        """Check current portfolio against all risk limits"""
        db = self._get_db()
        risk_limits = self.get_risk_limits(user_id)
        
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        
        # Calculate portfolio metrics
        portfolio_delta = self._calculate_portfolio_delta(user_id)
        portfolio_theta = sum((p.current_theta or 0) * p.quantity * (100 if p.option_symbol else 1) for p in positions)
        portfolio_vega = sum((p.current_vega or 0) * p.quantity * (100 if p.option_symbol else 1) for p in positions)
        
        # Check limits
        violations = []
        
        if risk_limits.max_portfolio_delta and abs(portfolio_delta) > risk_limits.max_portfolio_delta:
            violations.append(f"Portfolio delta ({portfolio_delta:.2f}) exceeds limit ({risk_limits.max_portfolio_delta})")
        
        if risk_limits.max_portfolio_theta and abs(portfolio_theta) > risk_limits.max_portfolio_theta:
            violations.append(f"Portfolio theta ({portfolio_theta:.2f}) exceeds limit ({risk_limits.max_portfolio_theta})")
        
        if risk_limits.max_portfolio_vega and abs(portfolio_vega) > risk_limits.max_portfolio_vega:
            violations.append(f"Portfolio vega ({portfolio_vega:.2f}) exceeds limit ({risk_limits.max_portfolio_vega})")
        
        return {
            'portfolio_delta': portfolio_delta,
            'portfolio_theta': portfolio_theta,
            'portfolio_vega': portfolio_vega,
            'open_positions': len(positions),
            'violations': violations,
            'within_limits': len(violations) == 0
        }

