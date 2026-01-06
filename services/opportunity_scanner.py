from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from models.automation import Automation
from models.stock import Stock
from models.position import Position
from services.signal_generator import SignalGenerator
from services.options_analyzer import OptionsAnalyzer
from services.risk_manager import RiskManager
from services.tradier_connector import TradierConnector

class OpportunityScanner:
    """Scans watchlists for trading opportunities"""
    
    def __init__(self):
        self.signal_generator = SignalGenerator()
        self.options_analyzer = OptionsAnalyzer()
        self.risk_manager = RiskManager()
        self.tradier = TradierConnector()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def scan_for_setups(self, user_id: int = None) -> List[Dict]:
        """
        Scan all active automations for entry opportunities
        
        Args:
            user_id: Optional user ID to scan only for specific user
        
        Returns:
            List of opportunities found
        """
        db = self._get_db()
        
        # Get active automations
        query = db.session.query(Automation).filter_by(is_active=True, is_paused=False)
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        active_automations = query.all()
        
        opportunities = []
        
        for automation in active_automations:
            # Get watchlist for this automation
            # For now, use the symbol from automation (would expand to full watchlist)
            symbol = automation.symbol
            
            # Check if we can trade this symbol
            if not self.can_trade_symbol(automation, symbol):
                continue
            
            # Generate signals
            signals = self.signal_generator.generate_signals(
                symbol,
                {
                    'min_confidence': getattr(automation, 'min_confidence', 0.70),
                    'strategy_type': automation.strategy_type
                }
            )
            
            if 'error' in signals:
                continue
            
            # Check if signal meets criteria
            if not signals['signals'].get('recommended', False):
                continue
            
            # Find optimal option for this signal
            opportunity = self.analyze_options_for_signal(
                symbol,
                signals,
                automation
            )
            
            if opportunity:
                opportunities.append(opportunity)
        
        return opportunities
    
    def can_trade_symbol(self, automation: Automation, symbol: str) -> bool:
        """Check if we should trade this symbol"""
        db = self._get_db()
        
        # Check if already have open position
        existing_position = db.session.query(Position).filter_by(
            user_id=automation.user_id,
            symbol=symbol,
            status='open'
        ).first()
        
        # Check automation settings for multiple positions
        allow_multiple = getattr(automation, 'allow_multiple_positions', False)
        if existing_position and not allow_multiple:
            return False
        
        # Check risk limits
        risk_limits = self.risk_manager.get_risk_limits(automation.user_id)
        
        # Check position count
        open_positions = db.session.query(Position).filter_by(
            user_id=automation.user_id,
            status='open'
        ).count()
        
        if open_positions >= risk_limits.max_open_positions:
            return False
        
        return True
    
    def analyze_options_for_signal(self, symbol: str, signals: Dict, 
                                  automation: Automation) -> Optional[Dict]:
        """
        Find the best option contract for this signal
        
        Returns:
            Opportunity dict or None
        """
        # Get options chain
        # Determine expiration based on automation preferences
        preferred_dte = getattr(automation, 'preferred_dte', 30)
        min_dte = getattr(automation, 'min_dte', 21)
        max_dte = getattr(automation, 'max_dte', 60)
        
        # Get expirations
        expirations_list = self.tradier.get_options_expirations(symbol)
        
        if not expirations_list:
            return None
        
        # Find expiration closest to preferred DTE
        target_date = datetime.now().date() + timedelta(days=preferred_dte)
        best_expiration = None
        best_dte_diff = float('inf')
        
        for exp_date_str in expirations_list:
            try:
                exp_date = datetime.strptime(exp_date_str, '%Y-%m-%d').date()
                dte = (exp_date - datetime.now().date()).days
                
                if min_dte <= dte <= max_dte:
                    diff = abs(dte - preferred_dte)
                    if diff < best_dte_diff:
                        best_dte_diff = diff
                        best_expiration = exp_date_str
            except (ValueError, TypeError):
                # Skip invalid date formats
                continue
        
        if not best_expiration:
            return None
        
        # Get options chain for this expiration
        chain = self.options_analyzer.analyze_options_chain(
            symbol,
            best_expiration,
            preference='balanced'  # Would use automation preference
        )
        
        if not chain:
            return None
        
        # Filter by automation preferences
        filtered_contracts = self.filter_by_preferences(
            chain,
            signals['signals']['direction'],
            automation
        )
        
        if not filtered_contracts:
            return None
        
        # Get best contract (highest score)
        best_contract = filtered_contracts[0]
        
        # Generate entry explanation
        entry_reason = self.generate_entry_explanation(
            signals,
            best_contract,
            automation
        )
        
        # Get quantity from automation
        quantity = getattr(automation, 'quantity', 1)
        
        return {
            'symbol': symbol,
            'contract': best_contract,
            'signal': signals['signals'],
            'automation_id': automation.id,
            'user_id': automation.user_id,
            'quantity': quantity,  # Include quantity in opportunity
            'entry_reason': entry_reason,
            'expiration': best_expiration,
            'dte': (datetime.strptime(best_expiration, '%Y-%m-%d').date() - datetime.now().date()).days
        }
    
    def filter_by_preferences(self, chain: List[Dict], direction: str, 
                             automation: Automation) -> List[Dict]:
        """Filter options chain by automation preferences"""
        filtered = []
        
        max_premium = getattr(automation, 'max_premium', None)
        min_volume = getattr(automation, 'min_volume', 5)  # Lowered from 20
        min_open_interest = getattr(automation, 'min_open_interest', 10)  # Lowered from 100
        max_spread_percent = getattr(automation, 'max_spread_percent', 30.0)  # Increased from 15
        target_delta = getattr(automation, 'target_delta', None)
        min_delta = getattr(automation, 'min_delta', None)
        max_delta = getattr(automation, 'max_delta', None)
        
        for option in chain:
            # Filter by direction
            if direction == 'bullish' and option.get('contract_type') != 'call':
                continue
            if direction == 'bearish' and option.get('contract_type') != 'put':
                continue
            
            # Filter by premium
            if max_premium and option.get('mid_price', 0) > max_premium:
                continue
            
            # Filter by volume
            if option.get('volume', 0) < min_volume:
                continue
            
            # Filter by open interest
            if option.get('open_interest', 0) < min_open_interest:
                continue
            
            # Filter by spread
            bid = option.get('bid', 0)
            ask = option.get('ask', 0)
            if bid > 0 and ask > 0:
                spread_percent = ((ask - bid) / bid * 100) if bid > 0 else 0
                if spread_percent > max_spread_percent:
                    continue
            
            # Filter by delta
            delta = option.get('delta')
            if delta is not None:
                if target_delta and abs(delta - target_delta) > 0.1:
                    continue
                if min_delta and delta < min_delta:
                    continue
                if max_delta and delta > max_delta:
                    continue
            
            filtered.append(option)
        
        # Sort by score (highest first)
        filtered.sort(key=lambda x: x.get('score', 0), reverse=True)
        
        return filtered
    
    def generate_entry_explanation(self, signals: Dict, contract: Dict, 
                                  automation: Automation) -> str:
        """Generate plain English explanation for entry"""
        signal_info = signals['signals']
        direction = signal_info.get('direction', 'neutral')
        confidence = signal_info.get('confidence', 0.0)
        reason = signal_info.get('reason', '')
        
        contract_type = contract.get('contract_type', 'option')
        strike = contract.get('strike_price', 0)
        expiration = contract.get('expiration_date', '')
        premium = contract.get('mid_price', 0)
        
        explanation = f"""
Based on technical analysis showing {direction} signals with {confidence:.1%} confidence, 
I'm recommending a {contract_type} option at ${strike:.2f} strike expiring {expiration} 
for ${premium:.2f} per contract.

{reason}

This aligns with your {automation.strategy_type} strategy preferences.
        """.strip()
        
        return explanation

