from typing import Dict, List
from datetime import datetime
import time
import logging
from flask import current_app
from services.opportunity_scanner import OpportunityScanner
from services.position_monitor import PositionMonitor
from services.risk_manager import RiskManager
from services.trade_executor import TradeExecutor
from services.market_hours import MarketHours
from services.alert_generator import AlertGenerator
from utils.error_logger import log_error
from utils.audit_logger import log_audit
from utils.notifications import get_notification_system

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AutomationMasterController:
    """
    Main automation loop that orchestrates all bot activities
    Runs continuously during market hours
    """
    
    def __init__(self):
        self.opportunity_scanner = OpportunityScanner()
        self.position_monitor = PositionMonitor()
        self.risk_manager = RiskManager()
        self.trade_executor = TradeExecutor()
        self.alert_generator = AlertGenerator()
        self.is_running = False
        self.cycle_count = 0
        self.last_cycle_time = None
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def start(self):
        """Start the automation engine"""
        logger.info("Starting Automation Master Controller...")
        self.is_running = True
        
        while self.is_running:
            try:
                if MarketHours.is_market_open():
                    # Run every 5 minutes during market hours for faster position monitoring
                    logger.info("Market is open - running automation cycle")
                    self.run_automation_cycle()
                    time.sleep(300)  # 5 minutes (reduced from 15 for faster exit checks)
                elif MarketHours.is_trading_hours():
                    # Pre-market or after-hours - check every 10 minutes
                    logger.info("Extended hours - running light cycle")
                    self.run_light_cycle()
                    time.sleep(600)  # 10 minutes (reduced from 30)
                else:
                    # Outside trading hours - check every 15 minutes (still monitor positions)
                    logger.info("Market closed - running light cycle to monitor positions")
                    self.run_light_cycle()
                    time.sleep(900)  # 15 minutes (reduced from 60 minutes)
            except KeyboardInterrupt:
                logger.info("Received stop signal - shutting down")
                self.stop()
                break
            except Exception as e:
                logger.error(f"Error in automation loop: {e}", exc_info=True)
                log_error('AutomationLoopError', str(e), context={'cycle_count': self.cycle_count})
                # Wait before retrying
                time.sleep(300)  # 5 minutes
    
    def stop(self):
        """Stop the automation engine"""
        logger.info("Stopping Automation Master Controller...")
        self.is_running = False
    
    def run_automation_cycle(self):
        """
        Single cycle of automation:
        1. Monitor existing positions (check exits)
        2. Scan for new opportunities (check entries)
        3. Manage portfolio risk
        """
        cycle_start = datetime.utcnow()
        self.cycle_count += 1
        
        logger.info(f"Starting automation cycle #{self.cycle_count}")
        
        try:
            # Step 1: Check exits first (existing positions)
            logger.info("Step 1: Monitoring existing positions...")
            position_results = self.position_monitor.monitor_all_positions()
            logger.info(f"Monitored {position_results['monitored']} positions, triggered {position_results['exits_triggered']} exits")
            
            if position_results['errors']:
                logger.warning(f"Position monitoring errors: {position_results['errors']}")
            
            # Step 2: Check for new entry opportunities
            logger.info("Step 2: Scanning for new opportunities...")
            opportunities = self.opportunity_scanner.scan_for_setups()
            logger.info(f"Found {len(opportunities)} trading opportunities")
            
            # Execute opportunities
            executed_count = 0
            notifications = get_notification_system()
            
            for opportunity in opportunities:
                try:
                    if self.execute_opportunity(opportunity):
                        executed_count += 1
                        # Send notification
                        if 'trade' in opportunity:
                            notifications.send_position_opened(
                                opportunity.get('user_id'),
                                opportunity.get('trade', {}),
                                opportunity
                            )
                except Exception as e:
                    logger.error(f"Error executing opportunity for {opportunity.get('symbol')}: {e}")
                    log_error(
                        'OpportunityExecutionError',
                        str(e),
                        user_id=opportunity.get('user_id'),
                        symbol=opportunity.get('symbol'),
                        context={'opportunity': opportunity}
                    )
                    # Send error notification
                    notifications.send_error_notification(
                        opportunity.get('user_id'),
                        str(e),
                        {'symbol': opportunity.get('symbol')}
                    )
            
            logger.info(f"Executed {executed_count} opportunities")
            
            # Step 3: Portfolio-level risk checks
            logger.info("Step 3: Verifying portfolio health...")
            # This would check all users' portfolios
            # For now, just log that we're checking
            
            # Step 4: Generate alerts for all users
            logger.info("Step 4: Generating alerts...")
            # Get all active users and generate alerts
            db = self._get_db()
            from models.user import User
            active_users = db.session.query(User).filter_by(notification_enabled=True).all()
            
            total_alerts = 0
            for user in active_users:
                try:
                    alert_results = self.alert_generator.scan_and_generate_alerts(user.id)
                    total_alerts += alert_results['total']
                except Exception as e:
                    logger.error(f"Error generating alerts for user {user.id}: {e}")
            
            logger.info(f"Generated {total_alerts} alerts")
            
            cycle_duration = (datetime.utcnow() - cycle_start).total_seconds()
            self.last_cycle_time = datetime.utcnow()
            
            logger.info(f"Automation cycle #{self.cycle_count} completed in {cycle_duration:.2f} seconds")
            
            # Log audit
            log_audit(
                action_type='automation_cycle_completed',
                action_category='system',
                description=f'Automation cycle #{self.cycle_count} completed',
                details={
                    'cycle_count': self.cycle_count,
                    'duration_seconds': cycle_duration,
                    'positions_monitored': position_results['monitored'],
                    'exits_triggered': position_results['exits_triggered'],
                    'opportunities_found': len(opportunities),
                    'opportunities_executed': executed_count
                },
                success=True
            )
            
        except Exception as e:
            logger.error(f"Automation cycle error: {e}", exc_info=True)
            log_error(
                'AutomationCycleError',
                str(e),
                context={'cycle_count': self.cycle_count}
            )
            # Don't raise - continue to next cycle
    
    def run_light_cycle(self):
        """Light cycle for pre-market/after-hours (only monitor positions)"""
        logger.info("Running light cycle (position monitoring only)")
        
        try:
            position_results = self.position_monitor.monitor_all_positions()
            logger.info(f"Light cycle: Monitored {position_results['monitored']} positions")
        except Exception as e:
            logger.error(f"Light cycle error: {e}", exc_info=True)
    
    def execute_opportunity(self, opportunity: Dict) -> bool:
        """
        Execute a trading opportunity
        
        Returns:
            True if executed successfully, False otherwise
        """
        user_id = opportunity.get('user_id')
        symbol = opportunity.get('symbol')
        contract = opportunity.get('contract', {})
        automation_id = opportunity.get('automation_id')
        
        if not user_id or not symbol or not contract:
            logger.warning(f"Invalid opportunity: {opportunity}")
            return False
        
        try:
            # Determine action based on signal
            signal = opportunity.get('signal', {})
            action = signal.get('action', 'hold')
            
            # If action is hold or missing, try to infer from contract
            if action == 'hold' or not action:
                contract = opportunity.get('contract', {})
                contract_type_from_contract = contract.get('contract_type', '').lower()
                if contract_type_from_contract == 'call':
                    action = 'buy_call'
                elif contract_type_from_contract == 'put':
                    action = 'buy_put'
                else:
                    # Default to buy_call if we can't determine
                    action = 'buy_call'
                    logger.info(f"No action in signal, defaulting to buy_call for {symbol}")
            
            if action == 'hold':
                logger.warning(f"Action is still 'hold' for {symbol}, cannot execute")
                return False
            
            # Map action to buy/sell
            if action == 'buy_call':
                contract_type = 'call'
                trade_action = 'buy'
            elif action == 'buy_put':
                contract_type = 'put'
                trade_action = 'buy'
            else:
                logger.warning(f"Unknown action: {action} for {symbol}")
                return False
            
            # Get contract details - normalize field names
            option_symbol = contract.get('option_symbol') or contract.get('symbol')
            # Options analyzer uses 'strike', trade executor expects 'strike_price'
            strike = contract.get('strike_price') or contract.get('strike')
            expiration = contract.get('expiration_date') or contract.get('expiration')
            price = contract.get('mid_price') or contract.get('last_price') or contract.get('last')
            
            # Validate required fields
            if not strike or strike == 0:
                logger.error(f"Missing or invalid strike price in contract: {contract}")
                return False
            
            if not expiration:
                logger.error(f"Missing expiration date in contract: {contract}")
                return False
            
            # Get quantity from opportunity or automation
            quantity = opportunity.get('quantity', 1)  # Check opportunity first
            if quantity == 1 and automation_id:  # Only check automation if not in opportunity
                try:
                    db = self._get_db()
                    from models.automation import Automation
                    automation = db.session.query(Automation).get(automation_id)
                    if automation and automation.quantity:
                        quantity = automation.quantity
                except Exception as e:
                    logger.warning(f"Could not get quantity from automation {automation_id}: {e}")
            
            # Execute trade
            result = self.trade_executor.execute_trade(
                user_id=user_id,
                symbol=symbol,
                action=trade_action,
                quantity=quantity,
                option_symbol=option_symbol,
                strike=strike,
                expiration_date=expiration,
                contract_type=contract_type,
                price=price,
                strategy_source='automation',
                automation_id=automation_id,
                notes=opportunity.get('entry_reason', 'Automated entry')
            )
            
            if result and 'trade' in result:
                logger.info(f"Successfully executed opportunity for {symbol}")
                return True
            else:
                logger.warning(f"Trade execution returned no result for {symbol}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing opportunity: {e}", exc_info=True)
            return False
    
    def get_status(self) -> Dict:
        """Get current automation status"""
        return {
            'is_running': self.is_running,
            'cycle_count': self.cycle_count,
            'last_cycle_time': self.last_cycle_time.isoformat() if self.last_cycle_time else None,
            'market_status': MarketHours.get_market_status()
        }

