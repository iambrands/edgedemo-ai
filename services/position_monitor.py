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
        
        # CRITICAL: Update prices FIRST (always, regardless of cooldown)
        # Prices should update frequently so traders can see current P/L
        # The cooldown only applies to EXIT CHECKS, not price updates
        self.update_position_data(position, force_update=False)
        
        # CRITICAL: Add cooldown period for EXIT CHECKS only (not price updates)
        # Prevent immediate exits due to mock data or stale prices
        # INCREASED to 30 minutes to give more time for prices to stabilize and prevent premature exits
        # BUT: Risk management limits (stop loss) should ALWAYS be checked, even during cooldown
        in_cooldown = False
        if position.entry_date:
            time_since_creation = datetime.utcnow() - position.entry_date
            exit_cooldown_minutes = 30  # 30 minute cooldown before checking exits
            if time_since_creation.total_seconds() < (exit_cooldown_minutes * 60):
                in_cooldown = True
                try:
                    from flask import current_app
                    current_app.logger.info(
                        f"⏳ Position {position.id} ({position.symbol}) is in exit cooldown period. "
                        f"Created {time_since_creation.total_seconds()/60:.1f} minutes ago. "
                        f"Will still check risk management limits (stop loss)."
                    )
                except:
                    pass
                # Don't return False here - we'll check risk limits even during cooldown
        
        # Get automation if exists
        automation = None
        if position.automation_id:
            automation = db.session.query(Automation).get(position.automation_id)
        
        # Check exit conditions
        # Pass in_cooldown flag so risk management limits are still checked
        should_exit, reason = self.check_exit_conditions(position, automation, in_cooldown=in_cooldown)
        
        if should_exit:
            # Execute exit
            try:
                # CRITICAL: Log the exit reason BEFORE executing
                # Calculate P/L for logging (recalculate here since we're in a different scope)
                try:
                    from flask import current_app
                    profit_pct = ((position.current_price - position.entry_price) / position.entry_price) * 100 if position.entry_price else 0
                    loss_pct = ((position.entry_price - position.current_price) / position.entry_price) * 100 if position.entry_price else 0
                    current_app.logger.warning(
                        f"🚨 EXIT TRIGGERED: Position {position.id} ({position.symbol}) - "
                        f"Reason: {reason}, "
                        f"Entry=${position.entry_price:.2f}, Current=${position.current_price:.2f}, "
                        f"Profit={profit_pct:.2f}%, Loss={loss_pct:.2f}%, "
                        f"Automation={automation.id if automation else 'None'}"
                    )
                except:
                    pass
                
                # CRITICAL: NEVER use position.current_price for options - it might be stock price!
                # Let close_position fetch the option premium fresh
                is_option = (
                    (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
                    (position.expiration_date and position.strike_price is not None) or
                    bool(position.option_symbol)
                )
                
                if is_option:
                    # For options, pass None to force fresh fetch (never trust current_price)
                    try:
                        from flask import current_app
                        current_app.logger.info(
                            f"🚨 AUTOMATIC EXIT: Closing option position {position.id} ({position.symbol}). "
                            f"NOT using current_price=${position.current_price} - forcing fresh option premium fetch."
                        )
                    except:
                        pass
                    exit_price = None  # Force fresh fetch
                else:
                    # For stocks, current_price is fine
                    exit_price = position.current_price
                
                result = self.trade_executor.close_position(
                    user_id=position.user_id,
                    position_id=position.id,
                    exit_price=exit_price
                )
                
                # CRITICAL: Check if close_position returned an error
                if result and 'error' in result:
                    try:
                        from flask import current_app
                        current_app.logger.error(
                            f"🚨🚨🚨 FAILED TO CLOSE POSITION {position.id} ({position.symbol}): {result['error']}. "
                            f"Exit reason was: {reason}. Position will remain open."
                        )
                    except:
                        pass
                    # Don't close the position - return False to keep it open
                    return False
                
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
    
    def update_position_data(self, position: Position, force_update: bool = False):
        """Update position with current prices and Greeks
        
        Args:
            position: Position to update
            force_update: If True, bypass cooldown (used for initial price fetch after creation)
        """
        db = self._get_db()
        
        # CRITICAL: Reduced cooldown for price updates to 2 minutes
        # Prices need to update frequently so traders can see current P/L
        # Cooldown is based on last_updated timestamp, not entry_date
        # This ensures old positions that haven't been updated recently will still get updated
        if not force_update:
            price_update_cooldown_minutes = 2  # 2 minute cooldown for price updates
            
            # Use last_updated if available, otherwise use entry_date
            # If last_updated is None or very old, always allow update
            if position.last_updated:
                time_since_last_update = datetime.utcnow() - position.last_updated
                # If last update was more than 2 minutes ago, allow update
                if time_since_last_update.total_seconds() < (price_update_cooldown_minutes * 60):
                    try:
                        from flask import current_app
                        current_app.logger.debug(
                            f"⏳ Position {position.id} ({position.symbol}) price update cooldown. "
                            f"Last updated {time_since_last_update.total_seconds()/60:.1f} minutes ago. "
                            f"Will update again in {price_update_cooldown_minutes} minutes."
                        )
                    except:
                        pass
                    return  # Skip price update during cooldown
            # If last_updated is None or missing, always allow update (position needs initial update)
        
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
            
            # CRITICAL: Tradier's get_quote endpoint often returns STOCK PRICE for option symbols
            # Instead of direct quote, ALWAYS use options chain lookup which is reliable
            # Skip direct quote entirely to avoid getting stock prices
            option_found = None
            
            # NOTE: We skip direct quote because Tradier's /markets/quotes endpoint
            # returns the underlying stock price for option symbols, not the option premium
            # This is why positions were closing with incorrect prices
            
            # If direct quote didn't work, try options chain lookup
            if not option_found:
                try:
                    from flask import current_app
                    current_app.logger.info(
                        f"🔍 Position {position.id} ({position.symbol}): Fetching options chain for {expiration_str}..."
                    )
                except:
                    pass
                
                try:
                    options_chain = self.tradier.get_options_chain(position.symbol, expiration_str)
                except Exception as e:
                    try:
                        from flask import current_app
                        current_app.logger.error(
                            f"❌ Position {position.id} ({position.symbol}): Failed to fetch chain: {str(e)}"
                        )
                    except:
                        pass
                    options_chain = []
                
                if not options_chain:
                    try:
                        from flask import current_app
                        current_app.logger.error(
                            f"❌ Position {position.id} ({position.symbol}): Empty or failed chain fetch. "
                            f"Keeping current price: ${position.current_price}"
                        )
                    except:
                        pass
                    
                    # Update last_updated so we don't retry immediately
                    position.last_updated = datetime.utcnow()
                    db.session.commit()
                    # Return early - can't update price without chain
                    return
                
                # get_options_chain returns a list directly (validated_options)
                # Handle both list and dict formats for safety
                if isinstance(options_chain, list):
                    chain_list = options_chain
                elif isinstance(options_chain, dict):
                    # Handle Tradier's raw response format: {'options': {'option': [...]}}
                    if 'options' in options_chain:
                        options_data = options_chain['options']
                        if isinstance(options_data, dict) and 'option' in options_data:
                            chain_list = options_data['option'] if isinstance(options_data['option'], list) else [options_data['option']]
                        elif isinstance(options_data, list):
                            chain_list = options_data
                        else:
                            chain_list = []
                    else:
                        chain_list = []
                else:
                    chain_list = []
                
                # Log chain results for debugging
                try:
                    from flask import current_app
                    current_app.logger.info(
                        f"📊 Position {position.id} ({position.symbol}): Received {len(chain_list)} options from chain"
                    )
                except:
                    pass
                
                # Find the specific option contract
                position_strike = float(position.strike_price)
                position_contract_type = (position.contract_type or '').lower()
                
                # Log what we're looking for
                try:
                    from flask import current_app
                    current_app.logger.info(
                        f"🔍 Position {position.id} ({position.symbol}): Looking for "
                        f"{position_contract_type} ${position_strike} in {len(chain_list)} options"
                    )
                except:
                    pass
                
                for option in chain_list:
                    if not isinstance(option, dict):
                        continue
                    
                    # Get strike from multiple possible field names
                    option_strike = (
                        option.get('strike') or 
                        option.get('strike_price') or 
                        option.get('strikePrice')
                    )
                    
                    if not option_strike:
                        continue
                    
                    # CRITICAL FIX: Tradier uses 'option_type', not 'type'
                    # Check multiple field names for compatibility
                    option_type = (
                        option.get('option_type') or      # ← Tradier uses this
                        option.get('type') or              # Fallback for other APIs
                        option.get('contract_type') or     # Another fallback
                        option.get('contractType') or
                        ''
                    )
                    
                    # Convert to float for comparison (handle numpy types)
                    try:
                        option_strike_float = float(option_strike)
                    except (ValueError, TypeError):
                        continue
                    
                    # Match strike price (within $0.01)
                    strike_match = abs(option_strike_float - position_strike) < 0.01
                    
                    # Match contract type - Tradier returns "put" or "call" in lowercase
                    option_contract_type = (option_type or '').lower().strip()
                    type_match = (
                        option_contract_type == position_contract_type or
                        (position_contract_type == 'option' and option_contract_type in ['call', 'put']) or
                        (not position_contract_type and option_contract_type in ['call', 'put'])
                    )
                    
                    if strike_match and type_match:
                        option_found = option
                        try:
                            from flask import current_app
                            current_app.logger.info(
                                f"✅ Position {position.id} ({position.symbol}): Found matching option! "
                                f"{option_contract_type} ${option_strike_float}, "
                                f"bid=${option.get('bid', 0)}, ask=${option.get('ask', 0)}, last=${option.get('last', 0)}"
                            )
                        except:
                            pass
                        break
                    
                    # Also try matching by option_symbol if available
                    if position.option_symbol and option.get('symbol') == position.option_symbol:
                        option_found = option
                        try:
                            from flask import current_app
                            current_app.logger.info(
                                f"✅ Position {position.id} ({position.symbol}): Found by option_symbol match!"
                            )
                        except:
                            pass
                        break
                
                # If exact strike not found, find closest strike (for deep OTM options)
                if not option_found and chain_list:
                    try:
                        from flask import current_app
                        current_app.logger.warning(
                            f"⚠️ Position {position.id} ({position.symbol}): Exact match not found, "
                            f"searching for closest {position_contract_type} strike to ${position_strike}"
                        )
                        
                        # Show available strikes by type for debugging
                        available_puts = [
                            float(o.get('strike', 0)) 
                            for o in chain_list 
                            if isinstance(o, dict) and 
                            (o.get('option_type') or o.get('type') or '').lower() == 'put' and
                            o.get('strike')
                        ]
                        available_calls = [
                            float(o.get('strike', 0)) 
                            for o in chain_list 
                            if isinstance(o, dict) and 
                            (o.get('option_type') or o.get('type') or '').lower() == 'call' and
                            o.get('strike')
                        ]
                        
                        current_app.logger.info(
                            f"   Available PUT strikes: {sorted(set(available_puts))[:20]}"
                        )
                        current_app.logger.info(
                            f"   Available CALL strikes: {sorted(set(available_calls))[:20]}"
                        )
                    except:
                        pass
                    
                    closest_option = None
                    closest_diff = float('inf')
                    for option in chain_list:
                        if not isinstance(option, dict):
                            continue
                        option_strike = option.get('strike') or option.get('strike_price')
                        
                        # CRITICAL FIX: Use 'option_type' first (Tradier's field name)
                        option_type = (
                            option.get('option_type') or
                            option.get('type') or
                            option.get('contract_type') or
                            ''
                        )
                        
                        try:
                            option_strike_float = float(option_strike) if option_strike is not None else None
                        except (ValueError, TypeError):
                            continue
                        
                        # Match contract type - handle 'option' as a wildcard
                        option_contract_type = (option_type or '').lower().strip()
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
                        try:
                            from flask import current_app
                            closest_strike = float(closest_option.get('strike') or closest_option.get('strike_price'))
                            closest_type = (
                                closest_option.get('option_type') or 
                                closest_option.get('type') or 
                                ''
                            ).lower().strip()
                            current_app.logger.info(
                                f"🎯 Position {position.id} ({position.symbol}): Using closest match - "
                                f"{closest_type} ${closest_strike} (diff: ${closest_diff:.2f})"
                            )
                        except:
                            pass
                    elif closest_option:
                        try:
                            from flask import current_app
                            closest_strike = float(closest_option.get('strike') or closest_option.get('strike_price'))
                            closest_type = (
                                closest_option.get('option_type') or 
                                closest_option.get('type') or 
                                ''
                            ).lower().strip()
                            current_app.logger.warning(
                                f"⚠️ Position {position.id} ({position.symbol}): Closest match too far - "
                                f"{closest_type} ${closest_strike} (diff: ${closest_diff:.2f}, "
                                f"threshold: ${position_strike * 0.05:.2f})"
                            )
                        except:
                            pass
            
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
                    # CRITICAL: Validate that the price is reasonable for an option premium
                    candidate_price = None
                    if bid > 0 and ask > 0:
                        candidate_price = (bid + ask) / 2
                    elif last > 0:
                        candidate_price = last
                    
                    # CRITICAL VALIDATION: Option premiums should NEVER exceed $50
                    # If the price is >$50, it's likely a stock price, not an option premium
                    if candidate_price and candidate_price > 50:
                        try:
                            from flask import current_app
                            current_app.logger.error(
                                f"🚨 Position {position.id} ({position.symbol}): "
                                f"Options chain returned suspiciously high price ${candidate_price:.2f} "
                                f"(entry=${position.entry_price:.2f}). This is likely a stock price, not option premium. "
                                f"Using entry_price instead."
                            )
                        except:
                            pass
                        # Reject the suspicious price and use entry_price instead
                        position.current_price = position.entry_price
                    elif candidate_price:
                        # Store previous price for volatility checking
                        if not hasattr(position, '_last_verified_price'):
                            position._last_verified_price = position.current_price if position.current_price else None
                        else:
                            # Update last verified price
                            if position.current_price and position.current_price != position.entry_price:
                                position._last_verified_price = position.current_price
                        
                        position.current_price = candidate_price
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
                    
                    # CRITICAL: Explicitly update last_updated when option is found
                    position.last_updated = datetime.utcnow()
                    
                    # CRITICAL: Explicitly update last_updated timestamp
                    position.last_updated = datetime.utcnow()
            else:
                # Couldn't find option in chain or via direct quote
                # Always use entry price as fallback - NEVER set to 0.01
                try:
                    from flask import current_app
                    # Log available strikes for debugging
                    available_strikes = []
                    available_puts = []
                    available_calls = []
                    all_strikes = []
                    sample_options = []
                    
                    # Use the same chain_list we already parsed above
                    # Check all options, not just first 20
                    for i, opt in enumerate(chain_list):
                        if not isinstance(opt, dict):
                            continue
                        opt_strike = opt.get('strike') or opt.get('strike_price')
                        opt_type = (opt.get('type') or opt.get('contract_type') or opt.get('option_type') or '').lower()
                        
                        # Collect sample for debugging
                        if i < 5:
                            sample_options.append({
                                'strike': opt_strike,
                                'type': opt_type,
                                'keys': list(opt.keys())[:10]  # First 10 keys
                            })
                        
                        if opt_strike:
                            try:
                                strike_float = float(opt_strike)
                                all_strikes.append(strike_float)
                                if opt_type == 'put':
                                    available_puts.append(strike_float)
                                elif opt_type == 'call':
                                    available_calls.append(strike_float)
                            except:
                                pass
                    
                    # Show available strikes for the contract type we're looking for
                    position_type = (position.contract_type or '').lower()
                    if position_type == 'put':
                        available_strikes = sorted(set(available_puts))[:20]
                    elif position_type == 'call':
                        available_strikes = sorted(set(available_calls))[:20]
                    else:
                        available_strikes = sorted(set(available_puts + available_calls))[:20]
                    
                    # Log detailed debugging info
                    try:
                        from flask import current_app
                        current_app.logger.warning(
                            f"🔍 Position {position.id} ({position.symbol}): Chain analysis - "
                            f"Total options: {len(chain_list)}, "
                            f"All strikes: {len(set(all_strikes))}, "
                            f"PUT strikes: {len(set(available_puts))}, "
                            f"CALL strikes: {len(set(available_calls))}, "
                            f"Sample options: {sample_options}"
                        )
                    except:
                        pass
                    
                    current_app.logger.warning(
                        f"❌ Could not find option for position {position.id}: "
                        f"{position.symbol} {position.contract_type} ${position.strike_price} {expiration_str}. "
                        f"Available {position.contract_type} strikes: {available_strikes}. "
                        f"Using entry price ${position.entry_price:.2f} as fallback."
                    )
                except RuntimeError:
                    pass
                except Exception as e:
                    try:
                        from flask import current_app
                        current_app.logger.error(f"Error logging option lookup failure: {e}")
                    except:
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
    
    def check_exit_conditions(self, position: Position, automation: Automation = None, in_cooldown: bool = False) -> tuple:
        """
        Check if position should be exited
        
        Returns:
            Tuple of (should_exit, reason)
        """
        # CRITICAL: Double-check cooldown here as well (defense in depth)
        # BUT: Risk management limits (stop loss) should ALWAYS be checked, even during cooldown
        # This ensures user's safety settings are always enforced
        if in_cooldown:
            try:
                from flask import current_app
                current_app.logger.info(
                    f"⏳ Position {position.id} ({position.symbol}) in cooldown - "
                    f"will still check risk management limits (stop loss from Settings)"
                )
            except:
                pass
            # Don't return here - we'll check risk limits even during cooldown
        
        if not position.current_price or not position.entry_price:
            return (False, "Missing price data")
        
        # CRITICAL: Validate that current_price is reasonable BEFORE calculating P/L
        # This prevents false exits due to incorrect prices
        is_option = (
            (position.contract_type and position.contract_type.lower() in ['call', 'put', 'option']) or
            (position.expiration_date and position.strike_price is not None) or
            bool(position.option_symbol)
        )
        
        if is_option:
            # For options, validate price is reasonable with STRICTER checks
            # 1. Check if price is suspiciously high (>$50 is almost always wrong for options)
            if position.current_price > 50:
                try:
                    from flask import current_app
                    current_app.logger.error(
                        f"🚨 Position {position.id} ({position.symbol}): "
                        f"current_price=${position.current_price:.2f} is suspiciously high for an option! "
                        f"Entry price was ${position.entry_price:.2f}. Likely a stock price. Rejecting exit check."
                    )
                except:
                    pass
                return (False, f"Suspicious price data (${position.current_price:.2f} too high for option)")
            
            # 2. Check if price change is suspiciously large (STRICTER: >5x instead of 10x)
            # This catches cases where price is wrong but still <$50
            if position.entry_price > 0:
                price_ratio = position.current_price / position.entry_price
                # STRICTER: If current price is more than 5x entry price, it's likely wrong
                # (options rarely move 500%+ in a short time unless it's a meme stock)
                if price_ratio > 5:
                    try:
                        from flask import current_app
                        current_app.logger.error(
                            f"🚨 Position {position.id} ({position.symbol}): "
                            f"Suspicious price ratio: current=${position.current_price:.2f} vs entry=${position.entry_price:.2f} "
                            f"(ratio={price_ratio:.1f}x). This is likely incorrect price data. Rejecting exit check."
                        )
                    except:
                        pass
                    return (False, f"Suspicious price ratio ({price_ratio:.1f}x change - likely incorrect data)")
                
                # 3. Check if price dropped to near zero suspiciously fast (STRICTER: <2% instead of 1%)
                # This catches cases where price was incorrectly set to a very low value
                if position.current_price < (position.entry_price * 0.02) and position.entry_price > 1:
                    try:
                        from flask import current_app
                        current_app.logger.error(
                            f"🚨 Position {position.id} ({position.symbol}): "
                            f"Suspicious price drop: current=${position.current_price:.2f} vs entry=${position.entry_price:.2f} "
                            f"(98%+ drop). This is likely incorrect price data. Rejecting exit check."
                        )
                    except:
                        pass
                    return (False, f"Suspicious price drop (98%+ - likely incorrect data)")
                
                # 4. NEW: Check if price changed dramatically since last update (price volatility check)
                # If we have a previous price stored, check if current price is dramatically different
                # This catches cases where price jumps suddenly due to bad data
                if hasattr(position, '_last_verified_price') and position._last_verified_price:
                    last_price = position._last_verified_price
                    if last_price > 0:
                        price_change_ratio = abs(position.current_price - last_price) / last_price
                        # If price changed by more than 50% since last check, require re-verification
                        if price_change_ratio > 0.5:
                            try:
                                from flask import current_app
                                current_app.logger.error(
                                    f"🚨 Position {position.id} ({position.symbol}): "
                                    f"Price volatility detected: current=${position.current_price:.2f} vs last verified=${last_price:.2f} "
                                    f"({price_change_ratio*100:.1f}% change). Requiring re-verification before allowing exits."
                                )
                            except:
                                pass
                            # Force a fresh price update before allowing exit
                            self.update_position_data(position, force_update=True)
                            # Re-check price after update
                            if abs(position.current_price - last_price) / last_price > 0.5:
                                return (False, f"Price volatility too high ({price_change_ratio*100:.1f}% - requiring re-verification)")
        
        # Calculate profit/loss percentages (only after validation passes)
        profit_percent = ((position.current_price - position.entry_price) / position.entry_price) * 100
        loss_percent = ((position.entry_price - position.current_price) / position.entry_price) * 100
        
        # CRITICAL: Additional validation - if profit_percent is suspiciously high (STRICTER: >500% instead of 1000%), 
        # it's likely a stock price was used instead of option premium
        if is_option and profit_percent > 500:
            try:
                from flask import current_app
                current_app.logger.error(
                    f"🚨 Position {position.id} ({position.symbol}): "
                    f"Suspicious profit calculation: {profit_percent:.2f}% "
                    f"(entry=${position.entry_price:.2f}, current=${position.current_price:.2f}). "
                    f"This is likely a stock price, not option premium. REJECTING EXIT."
                )
            except:
                pass
            return (False, f"Suspicious profit calculation ({profit_percent:.2f}% - likely stock price, not option premium)")
        
        # CRITICAL: Additional validation - if loss_percent is suspiciously high (>95%), 
        # it's likely incorrect price data (options rarely go to near-zero that fast)
        if is_option and loss_percent > 95 and position.entry_price > 1:
            try:
                from flask import current_app
                current_app.logger.error(
                    f"🚨 Position {position.id} ({position.symbol}): "
                    f"Suspicious loss calculation: {loss_percent:.2f}% "
                    f"(entry=${position.entry_price:.2f}, current=${position.current_price:.2f}). "
                    f"This is likely incorrect price data. REJECTING EXIT."
                )
            except:
                pass
            return (False, f"Suspicious loss calculation ({loss_percent:.2f}% - likely incorrect price data)")
        
        # CRITICAL: NEVER exit at exactly 0% profit/loss (entry_price = current_price)
        # This indicates the price hasn't updated or is stale - don't exit based on stale data
        # Only allow expiration-related exits when profit is 0%
        price_unchanged = abs(profit_percent) < 0.01 and abs(loss_percent) < 0.01
        
        # Also check if position is very new (less than 1 hour old)
        position_age_hours = 0
        position_age_minutes = 0
        if position.entry_date:
            time_since_creation = datetime.utcnow() - position.entry_date
            position_age_hours = time_since_creation.total_seconds() / 3600
            position_age_minutes = time_since_creation.total_seconds() / 60
        
        # CRITICAL: If price is unchanged, NEVER exit (except expiration)
        if price_unchanged:
            try:
                from flask import current_app
                current_app.logger.error(
                    f"🚨🚨🚨 Position {position.id} ({position.symbol}): "
                    f"PRICE UNCHANGED - entry=${position.entry_price:.2f} = current=${position.current_price:.2f}, "
                    f"P/L=0%, age={position_age_minutes:.1f} minutes. "
                    f"THIS INDICATES STALE PRICE DATA. REJECTING ALL EXITS EXCEPT EXPIRATION."
                )
            except:
                pass
            # Store flag to only allow expiration exits
            allow_only_expiration_exit = True
        elif position_age_minutes < 60 and abs(profit_percent) < 5.0 and abs(loss_percent) < 5.0:
            # Position is less than 1 hour old and P/L is very small (<5%)
            # This is likely due to price not updating properly - be extra cautious
            try:
                from flask import current_app
                current_app.logger.warning(
                    f"⚠️ Position {position.id} ({position.symbol}): "
                    f"Very new position ({position_age_minutes:.1f} minutes old) with minimal P/L ({profit_percent:.2f}%). "
                    f"Price may not have updated. REJECTING EXITS to prevent premature closure."
                )
            except:
                pass
            allow_only_expiration_exit = True  # Changed to True - reject exits for new positions with minimal P/L
        else:
            allow_only_expiration_exit = False
        
        # Log the prices being used for exit check (for debugging)
        try:
            from flask import current_app
            current_app.logger.info(
                f"🔍 Position {position.id} ({position.symbol}): Exit check - "
                f"entry=${position.entry_price:.2f}, current=${position.current_price:.2f}, "
                f"P/L={profit_percent:.2f}%, loss={loss_percent:.2f}%"
            )
        except:
            pass
        
        # If no automation, try to find one for this symbol or use user defaults
        if not automation and position.automation_id:
            db = self._get_db()
            automation = db.session.query(Automation).get(position.automation_id)
        
        # If still no automation, try to find active automation for this symbol
        if not automation:
            db = self._get_db()
            automation = db.session.query(Automation).filter_by(
                user_id=position.user_id,
                symbol=position.symbol,
                is_active=True,
                is_paused=False
            ).first()
        
        # CRITICAL: Log automation details for debugging
        try:
            from flask import current_app
            if automation:
                current_app.logger.info(
                    f"🔍 Position {position.id} ({position.symbol}): Using automation - "
                    f"profit_target_1={automation.profit_target_1}, profit_target_2={automation.profit_target_2}, "
                    f"profit_target_percent={automation.profit_target_percent}, stop_loss={automation.stop_loss_percent}, "
                    f"exit_at_profit={automation.exit_at_profit_target}, exit_at_stop={automation.exit_at_stop_loss}"
                )
            else:
                current_app.logger.info(
                    f"🔍 Position {position.id} ({position.symbol}): No automation - using defaults - "
                    f"profit_target=25%, stop_loss=10%"
                )
        except (RuntimeError, ImportError, NameError) as e:
            # Silently ignore - current_app not available in this context
            pass
        
        # CRITICAL: Check user's risk management limits (from Settings)
        # RISK MANAGEMENT SHOULD ALWAYS RUN - it's a safety feature that overrides other protections
        # However, we still need to validate that the price is reasonable (not a data error)
        from services.risk_manager import RiskManager
        risk_manager = RiskManager()
        risk_limits = risk_manager.get_risk_limits(position.user_id)
        
        # CRITICAL: Risk management stop loss should ALWAYS be checked if:
        # 1. We have valid price data (not None, not zero, reasonable for option)
        # 2. Price is different from entry (not stale/unchanged)
        # 3. Loss is actually occurring (loss_percent > 0)
        # We DON'T check allow_only_expiration_exit here - risk management overrides that!
        price_is_valid_for_risk_check = (
            position.current_price is not None and
            position.current_price > 0 and
            position.entry_price is not None and
            position.entry_price > 0 and
            not price_unchanged and  # Price has actually changed from entry
            position.current_price != position.entry_price  # Price is different from entry
        )
        
        # Check if position loss exceeds user's risk management stop loss
        # Use max_daily_loss_percent as per-position stop loss if set
        # CRITICAL: This should ALWAYS run if price is valid, regardless of cooldown or other protections
        if (risk_limits and risk_limits.max_daily_loss_percent and loss_percent > 0 and 
            price_is_valid_for_risk_check):
            # Use the daily loss limit as a per-position stop loss
            risk_stop_loss = risk_limits.max_daily_loss_percent
            if loss_percent >= risk_stop_loss:
                try:
                    from flask import current_app
                    current_app.logger.warning(
                        f"🛡️ Position {position.id} ({position.symbol}): "
                        f"Risk management stop loss triggered - {loss_percent:.2f}% loss "
                        f"exceeds user limit of {risk_stop_loss}% (from Settings). "
                        f"OVERRIDING cooldown and other protections - closing position for safety."
                    )
                except:
                    pass
                return (True, f"Risk management stop loss triggered ({loss_percent:.2f}% loss, limit: {risk_stop_loss}% from Settings)")
        elif (risk_limits and risk_limits.max_daily_loss_percent and loss_percent > 0 and 
              not price_is_valid_for_risk_check):
            # Price data is not valid for risk check - log but don't trigger
            # This prevents false triggers from bad data
            try:
                from flask import current_app
                current_app.logger.warning(
                    f"⚠️ Position {position.id} ({position.symbol}): "
                    f"Risk management stop loss would trigger ({loss_percent:.2f}% loss), "
                    f"but price data is not valid (unchanged={price_unchanged}, "
                    f"current_price={position.current_price}, entry_price={position.entry_price}). "
                    f"Skipping exit to prevent false trigger from bad data."
                )
            except:
                pass
        
        # Also check daily loss limit - if user is approaching/exceeding daily loss, close losing positions
        if risk_limits and risk_limits.max_daily_loss_percent:
            daily_loss = risk_manager._calculate_daily_loss(position.user_id)
            from models.user import User
            db = self._get_db()
            user = db.session.query(User).get(position.user_id)
            
            if user and daily_loss < 0:  # Only if there's a loss
                # Calculate max daily loss based on starting balance
                if user.trading_mode == 'paper':
                    starting_balance = 100000.0
                    account_balance = max(starting_balance, user.paper_balance)
                else:
                    account_balance = user.paper_balance
                
                max_daily_loss = account_balance * (risk_limits.max_daily_loss_percent / 100.0)
                current_daily_loss = abs(daily_loss)
                
                # If we're at or exceeding daily loss limit, close all losing positions
                if current_daily_loss >= max_daily_loss and loss_percent > 0:
                    try:
                        from flask import current_app
                        current_app.logger.warning(
                            f"🛡️ Position {position.id} ({position.symbol}): "
                            f"Daily loss limit reached (${current_daily_loss:.2f} >= ${max_daily_loss:.2f}). "
                            f"Closing losing position ({loss_percent:.2f}% loss)."
                        )
                    except:
                        pass
                    return (True, f"Daily loss limit reached - closing position ({loss_percent:.2f}% loss, daily loss: ${current_daily_loss:.2f})")
        
        # CRITICAL: If price is unchanged (0% P/L), only allow expiration exits
        # Don't check profit/loss targets with stale data
        if allow_only_expiration_exit:
            # Skip profit/loss checks - only check expiration
            pass
        else:
            # Check profit targets (profit_target_1 and profit_target_2)
            if automation:
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
            
            # Check stop loss (for both automation and default)
            stop_loss_threshold = None
            if automation and automation.stop_loss_percent and automation.exit_at_stop_loss:
                # Normalize stop_loss_percent - it might be stored as positive (10) or negative (-10)
                # We always compare as positive loss percentages
                stop_loss_threshold = abs(automation.stop_loss_percent)
            elif not automation:
                # Use default stop loss if no automation (5-10% range, use 10% as default)
                stop_loss_threshold = 10.0  # Default 10% stop loss
            
            if stop_loss_threshold and loss_percent >= stop_loss_threshold:
                return (True, f"Stop loss triggered ({loss_percent:.2f}% loss, threshold: {stop_loss_threshold}%)")
            
            # If no automation found, also check default profit target (25-30% range, use 25% as default)
            if not automation and profit_percent >= 25.0:
                return (True, f"Profit target reached ({profit_percent:.2f}%, default: 25%)")
        
        # Check max days to hold (only if price has changed)
        if not allow_only_expiration_exit:
            if automation and automation.max_days_to_hold and automation.exit_at_max_days:
                days_held = (datetime.utcnow() - position.entry_date).days
                if days_held >= automation.max_days_to_hold:
                    return (True, f"Max holding period reached ({days_held} days)")
            
            # Check min DTE exit (only if price has changed)
            if automation and automation.min_dte_exit:
                if position.expiration_date:
                    days_to_exp = (position.expiration_date - datetime.now().date()).days
                    if days_to_exp <= automation.min_dte_exit:
                        return (True, f"Days to expiration ({days_to_exp}) below minimum ({automation.min_dte_exit})")
        
        # Check expiration (close before expiration) - ALWAYS check this, even if price unchanged
        # This is the only exit condition allowed when price is stale
        if position.expiration_date:
            days_to_exp = (position.expiration_date - datetime.now().date()).days
            if days_to_exp <= 0:
                return (True, "Position expired")
            # Close if within 1 day of expiration (but log if price is unchanged)
            if days_to_exp <= 1:
                if allow_only_expiration_exit:
                    try:
                        from flask import current_app
                        current_app.logger.warning(
                            f"⚠️ Position {position.id} ({position.symbol}): "
                            f"Closing due to expiration ({days_to_exp} days) even though price is unchanged. "
                            f"This is the ONLY exit allowed when price data is stale."
                        )
                    except:
                        pass
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

