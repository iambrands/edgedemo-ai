from typing import Dict, List, Optional
from datetime import datetime
from models.trade import Trade
from models.position import Position
from models.user import User
from services.tradier_connector import TradierConnector
from services.risk_manager import RiskManager
from utils.audit_logger import log_audit
from utils.error_logger import log_error
from flask import current_app

class TradeExecutor:
    """Trade execution and position management service"""
    
    def __init__(self):
        self.tradier = TradierConnector()
        self.risk_manager = RiskManager()
    
    def _get_db(self):
        """Get db instance from current app context"""
        try:
            from app import db
            return db
        except ImportError:
            # Fallback: get from current_app
            try:
                return current_app.extensions.get('sqlalchemy')
            except (RuntimeError, AttributeError):
                # Last resort: try to get from flask_sqlalchemy
                from flask_sqlalchemy import SQLAlchemy
                return SQLAlchemy()
    
    def execute_trade(self, user_id: int, symbol: str, action: str, quantity: int,
                     option_symbol: str = None, strike: float = None,
                     expiration_date: str = None, contract_type: str = None,
                     price: float = None, strategy_source: str = 'manual',
                     automation_id: int = None, notes: str = None,
                     skip_risk_check: bool = False) -> Dict:
        """
        Execute a trade and record it
        
        Args:
            user_id: User ID
            symbol: Stock symbol
            action: 'buy' or 'sell'
            quantity: Number of contracts/shares
            option_symbol: Option symbol if trading options
            strike: Strike price
            expiration_date: Expiration date
            contract_type: 'call' or 'put'
            price: Execution price (optional, will use market if not provided)
            strategy_source: 'manual', 'automation', or 'signal'
            automation_id: ID of automation if automated
            notes: Trade notes
            skip_risk_check: Skip risk validation (for exits/closes)
        
        Returns:
            Dict with trade details
        """
        db = self._get_db()
        user = db.session.query(User).get(user_id)
        
        if not user:
            raise ValueError("User not found")
        
        # Get execution price
        if price is None:
            quote = self.tradier.get_quote(symbol)
            if 'quotes' in quote and 'quote' in quote['quotes']:
                price = quote['quotes']['quote']['last']
            else:
                price = 0.0
        
        # Risk validation (skip for exits)
        if not skip_risk_check and action.lower() == 'buy':
            # Calculate position size if not provided
            if quantity is None or quantity == 0:
                quantity, error = self.risk_manager.calculate_position_size(
                    user_id, symbol, price, option_symbol
                )
                if error:
                    log_error('RiskValidationError', error, user_id, 
                            {'symbol': symbol, 'action': action})
                    raise ValueError(error)
            
            # Validate trade against risk limits
            is_valid, error = self.risk_manager.validate_trade(
                user_id, symbol, action, quantity, price,
                option_symbol, strike, expiration_date
            )
            
            if not is_valid:
                log_error('RiskValidationError', error, user_id,
                         {'symbol': symbol, 'action': action, 'quantity': quantity})
                raise ValueError(error)
        
        # Place order (paper or live)
        if user.trading_mode == 'paper':
            # Paper trading - simulate order
            order_result = {
                'order': {
                    'id': f"PAPER_{datetime.utcnow().timestamp()}",
                    'status': 'filled'
                }
            }
            
            # Update paper balance
            # Options trades: multiply by 100 (contract multiplier)
            # Check if it's an option by contract_type OR option_symbol OR expiration_date
            # If we have expiration_date and strike, it's definitely an option
            is_option = bool(option_symbol) or \
                       (contract_type and contract_type.lower() in ['call', 'put']) or \
                       (expiration_date and strike is not None)
            
            trade_cost = price * quantity * (100 if is_option else 1)
            
            try:
                current_app.logger.info(f'Paper trade cost calculation: price={price}, quantity={quantity}, contract_type={contract_type}, option_symbol={option_symbol}, expiration_date={expiration_date}, strike={strike}, is_option={is_option}, trade_cost={trade_cost}, balance_before={user.paper_balance}')
            except RuntimeError:
                pass
            
            if action.lower() == 'buy':
                user.paper_balance -= trade_cost
            else:
                user.paper_balance += trade_cost
            
            try:
                current_app.logger.info(f'Balance after trade: {user.paper_balance}')
            except RuntimeError:
                pass
        else:
            # Live trading - place real order
            order_result = self.tradier.place_order(
                symbol=symbol,
                side=action,
                quantity=quantity,
                order_type='market' if price is None else 'limit',
                price=price,
                option_symbol=option_symbol
            )
        
        # Get execution price (use provided price or fetch from order)
        if price is None:
            # In real implementation, get from order execution
            quote = self.tradier.get_quote(symbol)
            if 'quotes' in quote and 'quote' in quote['quotes']:
                price = quote['quotes']['quote']['last']
            else:
                price = 0.0
        
        # Get Greeks if options trade
        delta = gamma = theta = vega = iv = None
        if option_symbol:
            # In real implementation, get Greeks from options chain
            # For now, use placeholder values
            delta = 0.5
            gamma = 0.01
            theta = -0.02
            vega = 0.05
            iv = 0.25
        
        db = self._get_db()
        
        # Parse expiration date safely
        expiration_date_obj = None
        if expiration_date:
            try:
                expiration_date_obj = datetime.strptime(expiration_date, '%Y-%m-%d').date()
            except (ValueError, TypeError) as e:
                try:
                    current_app.logger.warning(f'Invalid expiration date format: {expiration_date}, error: {e}')
                except RuntimeError:
                    pass
        
        # Create trade record
        trade = Trade(
            user_id=user_id,
            symbol=symbol,
            option_symbol=option_symbol,
            contract_type=contract_type,
            action=action,
            quantity=quantity,
            price=price,
            strike_price=strike,
            expiration_date=expiration_date_obj,
            trade_date=datetime.utcnow(),
            delta=delta,
            gamma=gamma,
            theta=theta,
            vega=vega,
            implied_volatility=iv,
            strategy_source=strategy_source,
            automation_id=automation_id,
            notes=notes
        )
        
        db.session.add(trade)
        
        # Update position
        self._update_position(user_id, symbol, action, quantity, price, option_symbol,
                            strike, expiration_date, contract_type, delta, gamma, theta, vega, iv)
        
        db.session.commit()
        
        # Log audit
        log_audit(
            action_type='trade_executed',
            action_category='trade',
            description=f"{action.upper()} {quantity} {symbol} @ ${price:.2f}",
            user_id=user_id,
            details={
                'symbol': symbol,
                'action': action,
                'quantity': quantity,
                'price': price,
                'option_symbol': option_symbol,
                'strategy_source': strategy_source
            },
            symbol=symbol,
            trade_id=trade.id,
            automation_id=automation_id,
            success=True
        )
        
        # Create alert for trade execution (especially for automated trades)
        if strategy_source == 'automation':
            try:
                from models.alert import Alert
                from datetime import timedelta
                from services.ai_alert_generator import AIAlertGenerator
                # User is already imported at the top of the file
                
                # Get position if it was created (for BUY trades)
                position = None
                if action.lower() == 'buy':
                    # Position is already imported at the top of the file
                    position = db.session.query(Position).filter_by(
                        user_id=user_id,
                        symbol=symbol,
                        option_symbol=option_symbol,
                        status='open'
                    ).order_by(Position.entry_date.desc()).first()
                
                # Get automation details
                automation = None
                if automation_id:
                    from models.automation import Automation
                    automation = db.session.query(Automation).get(automation_id)
                
                # Get user preferences
                user_obj = db.session.query(User).get(user_id)
                user_preferences = {
                    'risk_tolerance': user_obj.risk_tolerance or 'moderate' if user_obj else 'moderate'
                }
                
                # Generate AI-powered alert message
                ai_generator = AIAlertGenerator()
                context = {
                    'symbol': symbol,
                    'current_price': price,
                    'trade': {
                        'action': action,
                        'quantity': quantity,
                        'price': price,
                        'contract_type': contract_type
                    },
                    'automation': {
                        'name': automation.name if automation else 'Automated Strategy',
                        'strategy_type': automation.strategy_type if automation else 'unknown'
                    }
                }
                
                ai_message = ai_generator.generate_alert_message(
                    'trade_executed',
                    context,
                    user_preferences
                )
                
                # Create trade execution alert with AI-generated content
                alert = Alert(
                    user_id=user_id,
                    alert_type='trade_executed' if action.lower() == 'buy' else 'sell_signal',
                    priority='high' if automation_id else 'medium',
                    symbol=symbol,
                    signal_direction='bullish' if action.lower() == 'buy' else 'bearish',
                    title=ai_message['title'],
                    message=ai_message['message'],
                    explanation=ai_message['explanation'],
                    option_symbol=option_symbol,
                    strike_price=strike,
                    expiration_date=datetime.strptime(expiration_date, '%Y-%m-%d').date() if expiration_date else None,
                    position_id=position.id if position else None,
                    automation_id=automation_id,
                    trade_id=trade.id,
                    details={
                        'quantity': quantity,
                        'price': price,
                        'contract_type': contract_type,
                        'strategy_source': strategy_source,
                        'ai_generated': True
                    },
                    expires_at=datetime.utcnow() + timedelta(hours=24)
                )
                db.session.add(alert)
                db.session.commit()
            except Exception as e:
                # Don't fail trade execution if alert creation fails
                log_error('AlertCreationError', str(e), user_id=user_id, trade_id=trade.id)
        
        return {
            'trade': trade.to_dict(),
            'order_id': order_result.get('order', {}).get('id') if 'order' in order_result else None,
            'status': 'executed',
            'trading_mode': user.trading_mode,
            'paper_balance': user.paper_balance if user.trading_mode == 'paper' else None
        }
    
    def _update_position(self, user_id: int, symbol: str, action: str, quantity: int,
                        price: float, option_symbol: str = None, strike: float = None,
                        expiration_date: str = None, contract_type: str = None,
                        delta: float = None, gamma: float = None, theta: float = None,
                        vega: float = None, iv: float = None):
        """Update position based on trade"""
        db = self._get_db()
        
        if option_symbol:
            # Options position
            position = db.session.query(Position).filter_by(
                user_id=user_id,
                option_symbol=option_symbol
            ).first()
        else:
            # Stock position
            position = db.session.query(Position).filter_by(
                user_id=user_id,
                symbol=symbol,
                option_symbol=None
            ).first()
        
        if action.lower() == 'buy':
            if position:
                # Add to existing position
                total_cost = (position.quantity * position.entry_price) + (quantity * price)
                position.quantity += quantity
                position.entry_price = total_cost / position.quantity
            else:
                # Create new position
                position = Position(
                    user_id=user_id,
                    symbol=symbol,
                    option_symbol=option_symbol,
                    contract_type=contract_type,
                    quantity=quantity,
                    entry_price=price,
                    current_price=price,
                    strike_price=strike,
                    expiration_date=datetime.strptime(expiration_date, '%Y-%m-%d').date() if expiration_date else None,
                    entry_delta=delta,
                    entry_gamma=gamma,
                    entry_theta=theta,
                    entry_vega=vega,
                    entry_iv=iv,
                    current_delta=delta,
                    current_gamma=gamma,
                    current_theta=theta,
                    current_vega=vega,
                    current_iv=iv
                )
                db.session.add(position)
        elif action.lower() == 'sell':
            if position:
                if position.quantity <= quantity:
                    # Close position
                    position.status = 'closed'
                    # Calculate realized P/L
                    pnl = (price - position.entry_price) * position.quantity
                    pnl_percent = ((price - position.entry_price) / position.entry_price * 100) if position.entry_price > 0 else 0
                    # Update trade with P/L
                    # This would be done when closing the position
                else:
                    # Reduce position
                    position.quantity -= quantity
    
    def get_positions(self, user_id: int) -> List[Dict]:
        """Get all open positions for user"""
        from services.position_monitor import PositionMonitor
        
        db = self._get_db()
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        
        # Update current prices and P/L using position monitor (handles options correctly)
        monitor = PositionMonitor()
        for position in positions:
            try:
                monitor.update_position_data(position)
            except Exception as e:
                # Log but don't fail - continue with other positions
                try:
                    from flask import current_app
                    current_app.logger.warning(f"Failed to update position {position.id}: {e}")
                except RuntimeError:
                    pass
        
        return [p.to_dict() for p in positions]
    
    def get_trade_history(self, user_id: int, symbol: str = None, 
                         start_date: str = None, end_date: str = None,
                         strategy_source: str = None) -> List[Dict]:
        """Get trade history with filtering"""
        db = self._get_db()
        query = db.session.query(Trade).filter_by(user_id=user_id)
        
        if symbol:
            query = query.filter_by(symbol=symbol.upper())
        if strategy_source:
            query = query.filter_by(strategy_source=strategy_source)
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Trade.trade_date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Trade.trade_date <= end)
        
        trades = query.order_by(Trade.trade_date.desc()).all()
        return [t.to_dict() for t in trades]
    
    def close_position(self, user_id: int, position_id: int, exit_price: float = None) -> Dict:
        """Close a position and calculate P/L"""
        from services.position_monitor import PositionMonitor
        
        db = self._get_db()
        position = db.session.query(Position).filter_by(id=position_id, user_id=user_id).first()
        if not position:
            return {'error': 'Position not found'}
        
        if exit_price is None:
            # Try to update position to get current price (handles options correctly)
            # But don't fail if Tradier API is unavailable
            try:
                monitor = PositionMonitor()
                monitor.update_position_data(position)
                exit_price = position.current_price
            except Exception as e:
                # If update fails (e.g., Tradier API unavailable), log but continue
                try:
                    from flask import current_app
                    current_app.logger.warning(f"Could not update position data for close: {str(e)}")
                except:
                    pass
                exit_price = position.current_price or position.entry_price
            
            # If still no price, try to get it (but handle errors gracefully)
            if not exit_price or exit_price <= 0:
                try:
                    if position.option_symbol and position.expiration_date and position.strike_price:
                        # For options, get from options chain
                        expiration_str = position.expiration_date.strftime('%Y-%m-%d')
                        options_chain = self.tradier.get_options_chain(position.symbol, expiration_str)
                        if options_chain and isinstance(options_chain, dict) and 'options' in options_chain:
                            options_list = options_chain['options'].get('option', [])
                            if not isinstance(options_list, list):
                                options_list = [options_list] if options_list else []
                            for option in options_list:
                                if (option.get('strike') == position.strike_price and 
                                    option.get('type') == position.contract_type):
                                    bid = option.get('bid', 0)
                                    ask = option.get('ask', 0)
                                    exit_price = (bid + ask) / 2 if (bid > 0 and ask > 0) else option.get('last', 0)
                                    break
                    else:
                        # For stocks, get stock price
                        quote = self.tradier.get_quote(position.symbol)
                        if 'quotes' in quote and 'quote' in quote['quotes']:
                            exit_price = quote['quotes']['quote'].get('last', 0)
                except Exception as e:
                    # If Tradier API fails, use fallback
                    try:
                        from flask import current_app
                        current_app.logger.warning(f"Could not fetch price from Tradier for close: {str(e)}")
                    except:
                        pass
                
                # Final fallback: use entry price or current price
                if not exit_price or exit_price <= 0:
                    exit_price = position.current_price if position.current_price and position.current_price > 0 else position.entry_price
        
        # Execute sell trade (skip risk checks for exits)
        result = self.execute_trade(
            user_id=user_id,
            symbol=position.symbol,
            action='sell',
            quantity=position.quantity,
            option_symbol=position.option_symbol,
            strike=position.strike_price,
            expiration_date=position.expiration_date.isoformat() if position.expiration_date else None,
            contract_type=position.contract_type,
            price=exit_price,
            strategy_source='manual',
            notes='Position close',
            skip_risk_check=True
        )
        
        # Update position
        position.status = 'closed'
        position.unrealized_pnl = (exit_price - position.entry_price) * position.quantity
        position.unrealized_pnl_percent = ((exit_price - position.entry_price) / position.entry_price * 100) if position.entry_price > 0 else 0
        
        # Update trade with realized P/L
        if 'trade' in result:
            trade = db.session.query(Trade).filter_by(id=result['trade']['id']).first()
            if trade:
                trade.realized_pnl = position.unrealized_pnl
                trade.realized_pnl_percent = position.unrealized_pnl_percent
        
        db.session.commit()
        return result

