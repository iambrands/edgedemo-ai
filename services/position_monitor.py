from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from models.position import Position
from models.automation import Automation
from services.trade_executor import TradeExecutor
from services.tradier_connector import TradierConnector
from utils.notifications import get_notification_system

class PositionMonitor:
    """Real-time position monitoring and automatic exit service"""
    
    def __init__(self):
        self.trade_executor = TradeExecutor()
        self.tradier = TradierConnector()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def monitor_all_positions(self) -> Dict[str, any]:
        """Monitor all open positions and execute exits if needed"""
        db = self._get_db()
        positions = db.session.query(Position).filter_by(status='open').all()
        
        results = {
            'monitored': len(positions),
            'exits_triggered': 0,
            'errors': []
        }
        
        for position in positions:
            try:
                exit_triggered = self.check_and_exit_position(position)
                if exit_triggered:
                    results['exits_triggered'] += 1
            except Exception as e:
                results['errors'].append(f"Error monitoring position {position.id}: {str(e)}")
        
        return results
    
    def check_and_exit_position(self, position: Position) -> bool:
        """Check exit conditions for a position and exit if needed"""
        db = self._get_db()
        
        # Update position Greeks and prices
        self.update_position_data(position)
        
        # Get automation if exists
        automation = None
        if position.automation_id:
            automation = db.session.query(Automation).get(position.automation_id)
        
        # Check exit conditions
        should_exit, reason = self.check_exit_conditions(position, automation)
        
        if should_exit:
            # Execute exit
            try:
                exit_price = position.current_price
                result = self.trade_executor.close_position(
                    user_id=position.user_id,
                    position_id=position.id,
                    exit_price=exit_price
                )
                
                # Log exit
                if automation:
                    automation.execution_count += 1
                    automation.last_executed = datetime.utcnow()
                
                # Send notification
                notifications = get_notification_system()
                notifications.send_position_closed(
                    position.user_id,
                    position.to_dict(),
                    reason,
                    position.unrealized_pnl or 0
                )
                
                db.session.commit()
                return True
            except Exception as e:
                db.session.rollback()
                # Log error
                from models.error_log import ErrorLog
                error_log = ErrorLog(
                    user_id=position.user_id,
                    error_type='PositionExitError',
                    error_message=str(e),
                    position_id=position.id,
                    context={'reason': reason}
                )
                db.session.add(error_log)
                db.session.commit()
                return False
        
        return False
    
    def _parse_strike_from_option_symbol(self, option_symbol: str) -> Optional[float]:
        """Parse strike price from option symbol (e.g., NVDA20251226C00126000 -> 126.0)"""
        if not option_symbol:
            return None
        
        import re
        # Format: SYMBOL + YYYYMMDD + C/P + STRIKE*1000 (8 digits)
        match = re.search(r'([CP])(\d{8})$', option_symbol)
        if match:
            strike_encoded = match.group(2)
            try:
                strike = float(strike_encoded) / 1000.0
                return strike
            except (ValueError, TypeError):
                return None
        return None
    
    def _construct_option_symbol(self, position: Position) -> Optional[str]:
        """Construct option symbol from position data if missing
        Format: SYMBOL + YYYYMMDD + C/P + STRIKE*1000 (8 digits zero-padded)
        Example: HOOD20260219P00140000
        """
        if not position.symbol or not position.expiration_date or not position.strike_price:
            return None
        
        # Determine contract type (C for call, P for put)
        contract_type = (position.contract_type or '').lower()
        if contract_type == 'call':
            option_type = 'C'
        elif contract_type == 'put':
            option_type = 'P'
        elif contract_type == 'option':
            # If contract_type is just 'option', try to infer from delta if available
            # Negative delta usually means put, positive means call
            if position.current_delta is not None:
                option_type = 'P' if position.current_delta < 0 else 'C'
            elif position.entry_delta is not None:
                option_type = 'P' if position.entry_delta < 0 else 'C'
            else:
                # Default to call if we can't determine
                option_type = 'C'
        else:
            # Default to call if unknown
            option_type = 'C'
        
        # Format: SYMBOL + YYYYMMDD + C/P + STRIKE*1000 (8 digits)
        expiration_str = position.expiration_date.strftime('%Y%m%d')
        strike_encoded = f"{int(position.strike_price * 1000):08d}"
        
        return f"{position.symbol}{expiration_str}{option_type}{strike_encoded}"
    
    def update_position_data(self, position: Position):
        """Update position with current prices and Greeks"""
        db = self._get_db()
        
        # Check if current_price is suspiciously low (likely a bug) and needs correction
        # If current_price is less than 1% of entry_price, it's probably wrong
        needs_correction = (
            position.current_price is not None and 
            position.entry_price is not None and 
            position.entry_price > 0 and
            position.current_price < (position.entry_price * 0.01)
        )
        
        if needs_correction:
            try:
                from flask import current_app
                current_app.logger.warning(
                    f"Position {position.id} has suspiciously low current_price ${position.current_price:.2f} "
                    f"(entry: ${position.entry_price:.2f}). Forcing price update."
                )
            except RuntimeError:
                pass
            # Reset to None to force fresh lookup
            position.current_price = None
        
        # For options positions, get current option premium (not stock price)
        # Check if it's an options position by contract_type (call/put/option) OR by having expiration_date and strike
        is_option_position = (
            (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
            (position.expiration_date and position.strike_price) or
            bool(position.option_symbol)
        )
        
        if is_option_position:
            if not position.expiration_date:
                # Missing expiration - can't find option
                # If current_price looks like stock price, set to entry price
                if position.current_price and position.current_price > position.entry_price * 10:
                    position.current_price = position.entry_price
                position.last_updated = datetime.utcnow()
                db.session.commit()
                return
            
            # Format expiration string for use in error messages and API calls
            expiration_str = position.expiration_date.strftime('%Y-%m-%d')
            
            # If strike_price is missing but we have option_symbol, parse it
            if not position.strike_price and position.option_symbol:
                parsed_strike = self._parse_strike_from_option_symbol(position.option_symbol)
                if parsed_strike:
                    position.strike_price = parsed_strike
                    db.session.commit()
            
            if not position.strike_price:
                # Still missing strike price - can't find exact option
                # If current_price looks like stock price (too high for option premium), set to entry price
                # Option premiums are typically < $100, stock prices can be much higher
                if position.current_price and (position.current_price > 100 or position.current_price > position.entry_price * 5):
                    position.current_price = position.entry_price
                position.last_updated = datetime.utcnow()
                db.session.commit()
                return
            
            # Construct option_symbol if missing (needed for direct quote)
            if not position.option_symbol:
                constructed_symbol = self._construct_option_symbol(position)
                if constructed_symbol:
                    position.option_symbol = constructed_symbol
                    try:
                        from flask import current_app
                        current_app.logger.info(
                            f"Position {position.id} ({position.symbol}): "
                            f"Constructed option_symbol: {constructed_symbol} "
                            f"(contract_type={position.contract_type}, "
                            f"delta={position.current_delta or position.entry_delta}, "
                            f"strike={position.strike_price}, exp={expiration_str})"
                        )
                    except RuntimeError:
                        pass
                    db.session.commit()
                else:
                    try:
                        from flask import current_app
                        current_app.logger.warning(
                            f"Position {position.id} ({position.symbol}): "
                            f"Could not construct option_symbol - missing data: "
                            f"symbol={bool(position.symbol)}, "
                            f"expiration={bool(position.expiration_date)}, "
                            f"strike={bool(position.strike_price)}"
                        )
                    except RuntimeError:
                        pass
            
            # Try direct quote first if option_symbol is available (faster and more reliable)
            option_found = None
            if position.option_symbol:
                try:
                    try:
                        from flask import current_app
                        current_app.logger.info(
                            f"Position {position.id} ({position.symbol}): "
                            f"Trying direct quote for option_symbol: {position.option_symbol}"
                        )
                    except RuntimeError:
                        pass
                    
                    option_quote = self.tradier.get_quote(position.option_symbol)
                    if 'quotes' in option_quote and 'quote' in option_quote['quotes']:
                        quote_data = option_quote['quotes']['quote']
                        bid = quote_data.get('bid', 0) or 0
                        ask = quote_data.get('ask', 0) or 0
                        last = quote_data.get('last', 0) or 0
                        
                        try:
                            from flask import current_app
                            current_app.logger.info(
                                f"Position {position.id} ({position.symbol}): "
                                f"Direct quote result - bid={bid}, ask={ask}, last={last}"
                            )
                        except RuntimeError:
                            pass
                        
                        # If we have valid pricing data, use it
                        if bid > 0 and ask > 0:
                            position.current_price = (bid + ask) / 2
                            # Mark as found so we skip chain lookup
                            option_found = {'direct_quote': True, 'bid': bid, 'ask': ask, 'last': last}
                            try:
                                from flask import current_app
                                current_app.logger.info(
                                    f"Position {position.id} ({position.symbol}): "
                                    f"Updated price from direct quote: ${position.current_price:.2f}"
                                )
                            except RuntimeError:
                                pass
                        elif last > 0:
                            position.current_price = last
                            option_found = {'direct_quote': True, 'last': last}
                            try:
                                from flask import current_app
                                current_app.logger.info(
                                    f"Position {position.id} ({position.symbol}): "
                                    f"Updated price from direct quote (last): ${position.current_price:.2f}"
                                )
                            except RuntimeError:
                                pass
                        else:
                            try:
                                from flask import current_app
                                current_app.logger.warning(
                                    f"Position {position.id} ({position.symbol}): "
                                    f"Direct quote returned no valid prices (bid={bid}, ask={ask}, last={last})"
                                )
                            except RuntimeError:
                                pass
                except Exception as e:
                    # Log but continue to chain lookup
                    try:
                        from flask import current_app
                        current_app.logger.warning(
                            f"Position {position.id} ({position.symbol}): "
                            f"Direct quote failed for {position.option_symbol}: {e}. Trying chain lookup."
                        )
                    except RuntimeError:
                        pass
            
            # If direct quote didn't work, try options chain lookup
            if not option_found:
                options_chain = self.tradier.get_options_chain(position.symbol, expiration_str)
                
                # Find the specific option contract
                position_strike = float(position.strike_price)
                
                for option in options_chain:
                    # Match by strike and contract type (primary method)
                    option_strike = option.get('strike') or option.get('strike_price')
                    option_type = option.get('type') or option.get('contract_type')
                    
                    # Convert to float for comparison (handle numpy types)
                    try:
                        option_strike_float = float(option_strike) if option_strike is not None else None
                    except (ValueError, TypeError):
                        option_strike_float = None
                    
                    # Match strike price
                    strike_match = (option_strike_float is not None and 
                                   abs(option_strike_float - position_strike) < 0.01)
                    
                    # Match contract type - handle 'option' as a wildcard (matches both call and put)
                    position_contract_type = (position.contract_type or '').lower()
                    option_contract_type = (option_type or '').lower()
                    type_match = (
                        option_contract_type == position_contract_type or
                        (position_contract_type == 'option' and option_contract_type in ['call', 'put']) or
                        (not position_contract_type and option_contract_type in ['call', 'put'])
                    )
                    
                    if strike_match and type_match:
                        option_found = option
                        break
                    
                    # Also try matching by option_symbol if available
                    if position.option_symbol and option.get('symbol') == position.option_symbol:
                        option_found = option
                        break
                
                # If exact strike not found, find closest strike (for deep OTM options)
                if not option_found and options_chain:
                    closest_option = None
                    closest_diff = float('inf')
                    for option in options_chain:
                        option_strike = option.get('strike') or option.get('strike_price')
                        option_type = option.get('type') or option.get('contract_type')
                        try:
                            option_strike_float = float(option_strike) if option_strike is not None else None
                        except (ValueError, TypeError):
                            continue
                        
                        # Match contract type - handle 'option' as a wildcard
                        position_contract_type = (position.contract_type or '').lower()
                        option_contract_type = (option_type or '').lower()
                        type_match = (
                            option_contract_type == position_contract_type or
                            (position_contract_type == 'option' and option_contract_type in ['call', 'put']) or
                            (not position_contract_type and option_contract_type in ['call', 'put'])
                        )
                        
                        if option_strike_float is not None and type_match:
                            diff = abs(option_strike_float - position_strike)
                            if diff < closest_diff:
                                closest_diff = diff
                                closest_option = option
                    
                    # Use closest if within reasonable range (within 5% of strike)
                    if closest_option and closest_diff < (position_strike * 0.05):
                        option_found = closest_option
            
            if option_found:
                # Check if this was from direct quote (already set current_price)
                if option_found.get('direct_quote'):
                    # Price already set from direct quote above
                    # Try to get Greeks from chain if available
                    if not option_found.get('greeks'):
                        try:
                            expiration_str = position.expiration_date.strftime('%Y-%m-%d')
                            options_chain = self.tradier.get_options_chain(position.symbol, expiration_str)
                            position_strike = float(position.strike_price)
                            for option in options_chain:
                                option_strike = option.get('strike') or option.get('strike_price')
                                option_type = option.get('type') or option.get('contract_type')
                                try:
                                    option_strike_float = float(option_strike) if option_strike is not None else None
                                except (ValueError, TypeError):
                                    continue
                                
                                if (option_strike_float is not None and 
                                    abs(option_strike_float - position_strike) < 0.01 and
                                    ((position.contract_type or '').lower() == (option_type or '').lower() or
                                     (position.option_symbol and option.get('symbol') == position.option_symbol))):
                                    greeks = option.get('greeks', {})
                                    if isinstance(greeks, dict):
                                        position.current_delta = greeks.get('delta')
                                        position.current_gamma = greeks.get('gamma')
                                        position.current_theta = greeks.get('theta')
                                        position.current_vega = greeks.get('vega')
                                        position.current_iv = greeks.get('mid_iv') or greeks.get('implied_volatility')
                                    break
                        except Exception:
                            pass  # Greeks update failed, but price is set
                else:
                    # From chain lookup - get current option premium
                    bid = option_found.get('bid', 0) or 0
                    ask = option_found.get('ask', 0) or 0
                    last = option_found.get('last', 0) or option_found.get('lastPrice', 0) or 0
                    
                    # Use mid price if available, otherwise use last price
                    if bid > 0 and ask > 0:
                        position.current_price = (bid + ask) / 2
                    elif last > 0:
                        position.current_price = last
                    else:
                        # Fallback to entry price if no current price available
                        position.current_price = position.entry_price
                    
                    # Update Greeks from options chain
                    greeks = option_found.get('greeks', {})
                    if isinstance(greeks, dict):
                        position.current_delta = greeks.get('delta')
                        position.current_gamma = greeks.get('gamma')
                        position.current_theta = greeks.get('theta')
                        position.current_vega = greeks.get('vega')
                        position.current_iv = greeks.get('mid_iv') or greeks.get('implied_volatility')
            else:
                # Couldn't find option in chain or via direct quote
                # Always use entry price as fallback - NEVER set to 0.01
                try:
                    from flask import current_app
                    current_app.logger.warning(
                        f"Could not find option for position {position.id}: "
                        f"{position.symbol} {position.contract_type} {position.strike_price} {expiration_str}. "
                        f"Using entry price ${position.entry_price:.2f} as fallback."
                    )
                except RuntimeError:
                    pass
                
                # ALWAYS use entry price as fallback if we couldn't get current price
                # This ensures we never leave a position with 0.01 or other bad values
                if position.entry_price and position.entry_price > 0:
                    position.current_price = position.entry_price
                elif not position.current_price or position.current_price < 0.1:
                    # If entry_price is also missing/bad, at least set to a reasonable default
                    # But this should never happen in practice
                    position.current_price = position.entry_price if position.entry_price else 0.0
        else:
            # For stock positions, get current stock price
            quote = self.tradier.get_quote(position.symbol)
            if 'quotes' in quote and 'quote' in quote['quotes']:
                quote_data = quote['quotes']['quote']
                position.current_price = quote_data.get('last', position.current_price)
        
        # Calculate unrealized P/L
        if position.current_price and position.entry_price:
            # For options, multiply by 100 (contract multiplier)
            # Check if it's an option by contract_type, option_symbol, or expiration_date + strike
            is_option = (
                (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
                bool(position.option_symbol) or
                (position.expiration_date and position.strike_price is not None)
            )
            
            contract_multiplier = 100 if is_option else 1
            position.unrealized_pnl = (position.current_price - position.entry_price) * position.quantity * contract_multiplier
            
            if position.entry_price > 0:
                position.unrealized_pnl_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100
        
        position.last_updated = datetime.utcnow()
        db.session.commit()
    
    def check_exit_conditions(self, position: Position, automation: Automation = None) -> tuple:
        """
        Check if position should be exited
        
        Returns:
            Tuple of (should_exit, reason)
        """
        if not position.current_price or not position.entry_price:
            return (False, "Missing price data")
        
        # Check profit targets (profit_target_1 and profit_target_2)
        if automation:
            profit_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100
            
            # Check profit target 1 (partial exit)
            if automation.profit_target_1 and profit_percent >= automation.profit_target_1:
                if automation.partial_exit_percent and automation.partial_exit_profit_target:
                    # Partial exit
                    if profit_percent >= automation.partial_exit_profit_target:
                        return (True, f"Partial exit at profit target 1: {profit_percent:.2f}%")
                else:
                    # Full exit at target 1 if no partial exit configured
                    if automation.exit_at_profit_target:
                        return (True, f"Profit target 1 reached ({profit_percent:.2f}%)")
            
            # Check profit target 2 (full exit)
            if automation.profit_target_2 and profit_percent >= automation.profit_target_2:
                if automation.exit_at_profit_target:
                    return (True, f"Profit target 2 reached ({profit_percent:.2f}%)")
            
            # Legacy profit_target_percent support
            if automation.profit_target_percent and profit_percent >= automation.profit_target_percent:
                if automation.exit_at_profit_target:
                    return (True, f"Profit target reached ({profit_percent:.2f}%)")
        
        # Check stop loss
        if automation and automation.stop_loss_percent and automation.exit_at_stop_loss:
            loss_percent = ((position.entry_price - position.current_price) / position.entry_price) * 100
            # Normalize stop_loss_percent - it might be stored as positive (10) or negative (-10)
            # We always compare as positive loss percentages
            stop_loss_threshold = abs(automation.stop_loss_percent)
            if loss_percent >= stop_loss_threshold:
                return (True, f"Stop loss triggered ({loss_percent:.2f}% loss, threshold: {stop_loss_threshold}%)")
        
        # Check max days to hold
        if automation and automation.max_days_to_hold and automation.exit_at_max_days:
            days_held = (datetime.utcnow() - position.entry_date).days
            if days_held >= automation.max_days_to_hold:
                return (True, f"Max holding period reached ({days_held} days)")
        
        # Check min DTE exit
        if automation and automation.min_dte_exit:
            if position.expiration_date:
                days_to_exp = (position.expiration_date - datetime.now().date()).days
                if days_to_exp <= automation.min_dte_exit:
                    return (True, f"Days to expiration ({days_to_exp}) below minimum ({automation.min_dte_exit})")
        
        # Check expiration (close before expiration)
        if position.expiration_date:
            days_to_exp = (position.expiration_date - datetime.now().date()).days
            if days_to_exp <= 0:
                return (True, "Position expired")
            # Close if within 1 day of expiration
            if days_to_exp <= 1:
                return (True, f"Closing before expiration ({days_to_exp} days)")
        
        # Check trailing stop
        if automation and automation.trailing_stop_percent and automation.trailing_stop_activation:
            # Would need to track highest price reached
            # For now, simplified check
            profit_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100
            if profit_percent >= automation.trailing_stop_activation:
                # Trailing stop activated - check if price dropped
                # (Would need to track highest_price in position model)
                pass
        
        # Check trailing stop (if implemented in automation)
        # This would require storing the highest price reached
        
        return (False, None)

