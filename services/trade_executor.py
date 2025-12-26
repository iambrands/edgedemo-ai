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
            # Check if it's an option by:
            # 1. option_symbol is set
            # 2. contract_type is 'call', 'put', or 'option'
            # 3. expiration_date AND strike are both set (definitive indicator)
            is_option = bool(option_symbol) or \
                       (contract_type and contract_type.lower() in ['call', 'put', 'option']) or \
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
        # CRITICAL: If price is provided and valid (> 0), use it - don't overwrite it!
        # Only fetch if price is None or 0
        if price is None or price == 0:
            # For options, we MUST get the option price, not the stock price
            if option_symbol:
                # Try to get option price from options chain
                try:
                    if expiration_date:
                        expiration_str = expiration_date
                        options_chain = self.tradier.get_options_chain(symbol, expiration_str)
                        
                        # Find matching option
                        for option in options_chain:
                            option_strike = option.get('strike') or option.get('strike_price')
                            option_type = (option.get('type') or option.get('contract_type') or '').lower()
                            contract_type_lower = (contract_type or '').lower()
                            
                            # Match strike and type
                            if (strike and abs(float(option_strike) - float(strike)) < 0.01 and
                                (option_type == contract_type_lower or 
                                 contract_type_lower == 'option' or
                                 not contract_type_lower)):
                                # Use mid price if available
                                bid = option.get('bid', 0) or 0
                                ask = option.get('ask', 0) or 0
                                last = option.get('last', 0) or option.get('lastPrice', 0) or 0
                                
                                if bid > 0 and ask > 0:
                                    price = (bid + ask) / 2
                                elif last > 0:
                                    price = last
                                else:
                                    price = 0.0
                                break
                        
                        # CRITICAL: Tradier's get_quote returns STOCK PRICE for option symbols, not option premium!
                        # Do NOT use get_quote for options - it will return the wrong price
                        # If price is still None/0, we couldn't find it in the chain - that's okay, let it be 0
                        if price is None or price == 0.0:
                            try:
                                from flask import current_app
                                current_app.logger.warning(
                                    f"⚠️ Could not find option price in chain for {option_symbol}. "
                                    f"Price will be set to 0.0 (user should provide price manually)."
                                )
                            except:
                                pass
                            price = 0.0
                    else:
                        price = 0.0
                except Exception as e:
                    try:
                        current_app.logger.warning(f"Failed to fetch option price: {e}")
                    except RuntimeError:
                        pass
                    price = 0.0
            else:
                # For stocks, get stock price
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
        position_created = self._update_position(user_id, symbol, action, quantity, price, option_symbol,
                            strike, expiration_date, contract_type, delta, gamma, theta, vega, iv)
        
        db.session.commit()
        
        # If a new position was created, update its current price immediately
        if position_created and action.lower() == 'buy':
            try:
                from services.position_monitor import PositionMonitor
                monitor = PositionMonitor()
                # Get the position we just created
                if option_symbol:
                    position = db.session.query(Position).filter_by(
                        user_id=user_id,
                        option_symbol=option_symbol,
                        status='open'
                    ).order_by(Position.entry_date.desc()).first()
                else:
                    position = db.session.query(Position).filter_by(
                        user_id=user_id,
                        symbol=symbol,
                        option_symbol=None,
                        status='open'
                    ).order_by(Position.entry_date.desc()).first()
                
                if position:
                    monitor.update_position_data(position)
                    db.session.refresh(position)
                    db.session.commit()
            except Exception as e:
                # Log but don't fail the trade
                try:
                    current_app.logger.warning(f"Failed to update position price after creation: {e}")
                except RuntimeError:
                    pass
        
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
                        vega: float = None, iv: float = None) -> bool:
        """Update position based on trade
        
        Returns:
            bool: True if a new position was created, False if existing position was updated
        """
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
                return False  # Existing position updated
            else:
                # Create new position
                position = Position(
                    user_id=user_id,
                    symbol=symbol,
                    option_symbol=option_symbol,
                    contract_type=contract_type,
                    quantity=quantity,
                    entry_price=price,
                    current_price=price,  # Will be updated immediately after creation
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
                return True  # New position created
        elif action.lower() == 'sell':
            if position:
                if position.quantity <= quantity:
                    # Close position
                    position.status = 'closed'
                    # Calculate realized P/L (multiply by 100 for options)
                    is_option = (
                        (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
                        bool(position.option_symbol) or
                        (position.expiration_date and position.strike_price is not None)
                    )
                    contract_multiplier = 100 if is_option else 1
                    pnl = (price - position.entry_price) * position.quantity * contract_multiplier
                    pnl_percent = ((price - position.entry_price) / position.entry_price * 100) if position.entry_price > 0 else 0
                    # Update trade with P/L
                    # This would be done when closing the position
                else:
                    # Reduce position
                    position.quantity -= quantity
            return False  # No new position created for sell
    
    def get_positions(self, user_id: int, update_prices: bool = False) -> List[Dict]:
        """Get all open positions for user
        
        Args:
            user_id: User ID
            update_prices: If True, update position prices (slow). If False, return cached prices (fast).
        """
        db = self._get_db()
        
        try:
            from flask import current_app
            current_app.logger.info(
                f"🔍 TradeExecutor.get_positions - user_id={user_id}, update_prices={update_prices}"
            )
        except:
            pass
        
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        
        try:
            from flask import current_app
            current_app.logger.info(
                f"📊 Found {len(positions)} open positions for user {user_id}"
            )
            for pos in positions:
                current_app.logger.info(
                    f"   Position {pos.id}: {pos.symbol} {pos.contract_type} "
                    f"qty={pos.quantity} entry=${pos.entry_price:.2f} current=${pos.current_price or 0:.2f}"
                )
        except:
            pass
        
        # Only update prices if explicitly requested (for performance)
        if update_prices and positions:
            from services.position_monitor import PositionMonitor
            monitor = PositionMonitor()
            
            # Update each position
            for position in positions:
                try:
                    monitor.update_position_data(position)
                    # Refresh the position object to get updated values from DB
                    db.session.refresh(position)
                except Exception as e:
                    # Log but don't fail - continue with other positions
                    try:
                        from flask import current_app
                        current_app.logger.warning(f"Failed to update position {position.id}: {e}")
                    except RuntimeError:
                        pass
            
            # Commit all updates
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                try:
                    from flask import current_app
                    current_app.logger.error(f"Failed to commit position updates: {e}")
                except RuntimeError:
                    pass
        
        # Always return positions - use the ones we have (they should be updated in memory)
        # If update_prices was True, they've been refreshed, otherwise they're cached
        result = [p.to_dict() for p in positions]
        
        try:
            from flask import current_app
            current_app.logger.info(
                f"✅ TradeExecutor.get_positions - returning {len(result)} positions"
            )
        except:
            pass
        
        return result
    
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
        
        # CRITICAL: Determine if this is an option position BEFORE fetching price
        is_option_position = (
            (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
            (position.expiration_date and position.strike_price is not None) or
            bool(position.option_symbol)
        )
        
        if exit_price is None:
            # FOR OPTIONS: ALWAYS re-fetch the option premium, NEVER trust current_price
            # This is critical because current_price might be a stock price from a previous failed lookup
            if is_option_position:
                exit_price = None  # Force fresh fetch below - don't use current_price
                try:
                    from flask import current_app
                    current_app.logger.info(
                        f"Closing option position {position.id} ({position.symbol}): "
                        f"Re-fetching option premium (ignoring current_price=${position.current_price})"
                    )
                except:
                    pass
            else:
                # For stocks, try to update position to get current price
                try:
                    monitor = PositionMonitor()
                    monitor.update_position_data(position)
                    exit_price = position.current_price
                except Exception as e:
                    try:
                        from flask import current_app
                        current_app.logger.warning(f"Could not update position data for close: {str(e)}")
                    except:
                        pass
                    exit_price = position.current_price or position.entry_price
            
            # If still no price, try to get it (but handle errors gracefully)
            # CRITICAL: Check if this is an option position BEFORE falling back to stock price
            is_option_position = (
                (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
                (position.expiration_date and position.strike_price is not None) or
                bool(position.option_symbol)
            )
            
            if not exit_price or exit_price <= 0:
                try:
                    if is_option_position:
                        # CRITICAL: Tradier's /markets/quotes endpoint returns STOCK PRICE for option symbols!
                        # NEVER use get_quote for options - it returns the underlying stock price, not the option premium
                        # ALWAYS use get_options_chain to get the correct option premium
                        
                        # Skip direct quote entirely - go straight to options chain lookup
                        # This is the ONLY reliable way to get option premiums from Tradier
                        if position.expiration_date and position.strike_price:
                            expiration_str = position.expiration_date.strftime('%Y-%m-%d')
                            
                            try:
                                from flask import current_app
                                current_app.logger.info(
                                    f"🔍 CLOSE POSITION: Direct quote failed, trying options chain for "
                                    f"{position.symbol} exp={expiration_str} strike=${position.strike_price} "
                                    f"type={position.contract_type} option_symbol={position.option_symbol}"
                                )
                            except:
                                pass
                            
                            try:
                                options_chain = self.tradier.get_options_chain(position.symbol, expiration_str)
                            except Exception as e:
                                try:
                                    from flask import current_app
                                    current_app.logger.error(
                                        f"❌ CLOSE POSITION: Options chain fetch FAILED for {position.symbol} "
                                        f"exp={expiration_str}: {e}"
                                    )
                                except:
                                    pass
                                options_chain = []
                            
                            try:
                                from flask import current_app
                                current_app.logger.info(
                                    f"🔍 CLOSE POSITION: Options chain response type: {type(options_chain)}, "
                                    f"length: {len(options_chain) if isinstance(options_chain, list) else 'N/A'}"
                                )
                            except:
                                pass
                            
                            # Handle both dict and list formats
                            if isinstance(options_chain, dict) and 'options' in options_chain:
                                options_list = options_chain['options'].get('option', [])
                                if not isinstance(options_list, list):
                                    options_list = [options_list] if options_list else []
                            elif isinstance(options_chain, list):
                                options_list = options_chain
                            else:
                                options_list = []
                            
                            try:
                                from flask import current_app
                                current_app.logger.info(
                                    f"🔍 CLOSE POSITION: Parsed {len(options_list)} options from chain. "
                                    f"Looking for strike=${position.strike_price}, type={position.contract_type}"
                                )
                            except:
                                pass
                            
                            position_contract_type = (position.contract_type or '').lower()
                            position_strike = float(position.strike_price)
                            
                            matching_options = []
                            for option in options_list:
                                option_strike = option.get('strike') or option.get('strike_price')
                                option_type = (option.get('type') or option.get('contract_type') or '').lower()
                                
                                try:
                                    option_strike_float = float(option_strike) if option_strike is not None else None
                                except (ValueError, TypeError):
                                    continue
                                
                                # Match strike and contract type
                                strike_match = (option_strike_float is not None and 
                                             abs(option_strike_float - position_strike) < 0.01)
                                
                                # Handle contract_type='option' - it should match both 'call' and 'put'
                                # But we need to know which one. Check option_symbol or infer from delta
                                if position_contract_type == 'option':
                                    # If we have option_symbol, check if it's C or P
                                    if position.option_symbol:
                                        is_call = 'C' in position.option_symbol[-10:]
                                        is_put = 'P' in position.option_symbol[-10:]
                                        if is_call:
                                            type_match = option_type == 'call'
                                        elif is_put:
                                            type_match = option_type == 'put'
                                        else:
                                            # Can't determine, match either
                                            type_match = option_type in ['call', 'put']
                                    else:
                                        # No option_symbol, match either call or put
                                        type_match = option_type in ['call', 'put']
                                else:
                                    # Normal matching: call matches call, put matches put
                                    type_match = (
                                        option_type == position_contract_type or
                                        (not position_contract_type and option_type in ['call', 'put'])
                                    )
                                
                                if strike_match and type_match:
                                    bid = option.get('bid', 0) or 0
                                    ask = option.get('ask', 0) or 0
                                    last = option.get('last', 0) or option.get('lastPrice', 0) or 0
                                    
                                    # CRITICAL: Validate that prices are option premiums, not stock prices
                                    max_price = max(bid, ask, last) if (bid or ask or last) else 0
                                    if max_price > 50:
                                        try:
                                            from flask import current_app
                                            current_app.logger.error(
                                                f"🚨 CLOSE POSITION: Found matching option but prices are STOCK PRICES! "
                                                f"strike=${position.strike_price}, bid=${bid:.2f}, ask=${ask:.2f}, last=${last:.2f} "
                                                f"(max=${max_price:.2f} > $50). REJECTING."
                                            )
                                        except:
                                            pass
                                        continue  # Skip this option - it has stock prices
                                    
                                    matching_options.append(option)
                                    try:
                                        from flask import current_app
                                        current_app.logger.info(
                                            f"✅ CLOSE POSITION: Found matching option - bid=${bid:.2f}, ask=${ask:.2f}, last=${last:.2f}"
                                        )
                                    except:
                                        pass
                                    
                                    # CRITICAL VALIDATION: Reject stock prices
                                    if bid > 0 and ask > 0:
                                        potential_price = (bid + ask) / 2
                                        if potential_price > 50:
                                            try:
                                                from flask import current_app
                                                current_app.logger.error(
                                                    f"🚨 CRITICAL: Options chain returned STOCK PRICE ${potential_price:.2f} "
                                                    f"for {position.symbol} option! REJECTING."
                                                )
                                            except:
                                                pass
                                            continue  # Skip this option, try next
                                        else:
                                            exit_price = potential_price
                                            try:
                                                from flask import current_app
                                                current_app.logger.info(
                                                    f"✅ CLOSE POSITION: Using option premium ${exit_price:.2f} from chain (bid/ask)"
                                                )
                                            except:
                                                pass
                                            break
                                    elif last > 0:
                                        if last > 50:
                                            try:
                                                from flask import current_app
                                                current_app.logger.error(
                                                    f"🚨 CRITICAL: Options chain 'last' is STOCK PRICE ${last:.2f} "
                                                    f"for {position.symbol} option! REJECTING."
                                                )
                                            except:
                                                pass
                                            continue  # Skip this option
                                        else:
                                            exit_price = last
                                            try:
                                                from flask import current_app
                                                current_app.logger.info(
                                                    f"✅ CLOSE POSITION: Using option premium ${exit_price:.2f} from chain (last)"
                                                )
                                            except:
                                                pass
                                            break
                            
                            if not exit_price and matching_options:
                                try:
                                    from flask import current_app
                                    current_app.logger.warning(
                                        f"⚠️ CLOSE POSITION: Found {len(matching_options)} matching options but all had invalid prices"
                                    )
                                except:
                                    pass
                            elif not matching_options:
                                try:
                                    from flask import current_app
                                    current_app.logger.error(
                                        f"❌ CLOSE POSITION: No matching option found in chain for "
                                        f"{position.symbol} strike=${position.strike_price} type={position.contract_type} "
                                        f"exp={expiration_str}. Chain had {len(options_list)} options."
                                    )
                                    # Log sample options and available strikes for debugging
                                    if options_list:
                                        available_strikes = set()
                                        sample_options = options_list[:10]
                                        for opt in sample_options:
                                            opt_strike = opt.get('strike') or opt.get('strike_price')
                                            opt_type = opt.get('type') or opt.get('contract_type')
                                            if opt_strike:
                                                available_strikes.add(float(opt_strike))
                                            current_app.logger.info(
                                                f"   Sample: strike=${opt_strike}, type={opt_type}, "
                                                f"bid=${opt.get('bid', 0):.2f}, ask=${opt.get('ask', 0):.2f}"
                                            )
                                        
                                        if available_strikes:
                                            closest_strike = min(available_strikes, key=lambda x: abs(x - position_strike))
                                            current_app.logger.warning(
                                                f"   Available strikes: {sorted(list(available_strikes))[:15]}. "
                                                f"Closest to ${position.strike_price}: ${closest_strike:.2f} "
                                                f"(diff: ${abs(closest_strike - position_strike):.2f})"
                                            )
                                except:
                                    pass
                    else:
                        # For stocks ONLY (not options), get stock price
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
                
                # Final validation: NEVER accept stock price for options
                if is_option_position:
                    # If exit_price looks like stock price (>$50 for an option), it's WRONG
                    if exit_price and exit_price > 50:
                        try:
                            from flask import current_app
                            current_app.logger.error(
                                f"CRITICAL ERROR: exit_price ${exit_price:.2f} is STOCK PRICE for option position {position.id} "
                                f"({position.symbol} {position.contract_type} ${position.strike_price} {position.expiration_date}). "
                                f"REJECTING and using entry_price ${position.entry_price:.2f} as fallback. "
                                f"This should NEVER happen - option lookup failed!"
                            )
                        except:
                            pass
                        exit_price = position.entry_price  # Use entry price as safer fallback
                    elif not exit_price or exit_price <= 0:
                        # No price found - use entry price
                        exit_price = position.entry_price
                        try:
                            from flask import current_app
                            current_app.logger.warning(
                                f"Could not fetch option premium for position {position.id}. Using entry_price ${exit_price:.2f}"
                            )
                        except:
                            pass
                else:
                    # For stocks, use current_price or entry_price
                    if not exit_price or exit_price <= 0:
                        exit_price = position.current_price if position.current_price and position.current_price > 0 else position.entry_price
        
        # CRITICAL: Validate exit_price before executing trade
        # NEVER allow 0 or None for option positions - use entry_price as absolute fallback
        if is_option_position:
            if not exit_price or exit_price <= 0:
                try:
                    from flask import current_app
                    current_app.logger.error(
                        f"🚨 CRITICAL: exit_price is {exit_price} for option position {position.id}. "
                        f"Using entry_price ${position.entry_price:.2f} as absolute fallback."
                    )
                except:
                    pass
                exit_price = position.entry_price if position.entry_price and position.entry_price > 0 else 0.01
            # Double-check: if exit_price still looks like stock price, reject it
            if exit_price > 50:
                try:
                    from flask import current_app
                    current_app.logger.error(
                        f"🚨 CRITICAL: exit_price ${exit_price:.2f} still looks like stock price. "
                        f"Using entry_price ${position.entry_price:.2f} instead."
                    )
                except:
                    pass
                exit_price = position.entry_price if position.entry_price and position.entry_price > 0 else 0.01
        
        # Log final exit_price before trade execution
        try:
            from flask import current_app
            current_app.logger.info(
                f"✅ CLOSE POSITION: Final exit_price for position {position.id} ({position.symbol}): ${exit_price:.2f}"
            )
        except:
            pass
        
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
            price=exit_price,  # CRITICAL: This must be a valid option premium, not 0 or stock price
            strategy_source='manual',
            notes='Position close',
            skip_risk_check=True
        )
        
        # Update position
        position.status = 'closed'
        # For options, multiply by 100 (contract multiplier)
        is_option = (
            (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
            bool(position.option_symbol) or
            (position.expiration_date and position.strike_price is not None)
        )
        contract_multiplier = 100 if is_option else 1
        
        position.unrealized_pnl = (exit_price - position.entry_price) * position.quantity * contract_multiplier
        position.unrealized_pnl_percent = ((exit_price - position.entry_price) / position.entry_price * 100) if position.entry_price > 0 else 0
        
        # Update trade with realized P/L
        if 'trade' in result:
            trade = db.session.query(Trade).filter_by(id=result['trade']['id']).first()
            if trade:
                trade.realized_pnl = position.unrealized_pnl
                trade.realized_pnl_percent = position.unrealized_pnl_percent
        
        db.session.commit()
        return result

