from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from services.tradier_connector import TradierConnector

class OptionsFlowAnalyzer:
    """Analyze options flow for unusual activity"""
    
    def __init__(self):
        self.tradier = TradierConnector()
    
    def detect_unusual_volume(self, symbol: str, expiration: str = None) -> List[Dict]:
        """
        Detect unusual options volume
        
        Returns options with volume significantly above average
        """
        # Get options chain
        if expiration:
            options = self.tradier.get_options_chain(symbol, expiration)
        else:
            # Get all expirations and analyze
            expirations = self.tradier.get_options_expirations(symbol)
            all_options = []
            for exp in expirations[:3]:  # Check next 3 expirations
                options = self.tradier.get_options_chain(symbol, exp)
                all_options.extend(options)
            options = all_options
        
        if not options:
            return []
        
        # Calculate average volume
        volumes = [opt.get('volume', 0) for opt in options if opt.get('volume', 0) > 0]
        if not volumes:
            return []
        
        avg_volume = sum(volumes) / len(volumes)
        threshold = avg_volume * 3  # 3x average is unusual
        
        unusual = []
        for option in options:
            volume = option.get('volume', 0)
            if volume > threshold and volume > 50:  # Minimum volume threshold
                # Get contract type from various possible field names
                contract_type = (
                    option.get('type') or 
                    option.get('option_type') or 
                    option.get('contract_type') or
                    option.get('putCall') or  # Some APIs use this
                    ''
                )
                # Normalize to 'call' or 'put'
                if contract_type:
                    ct_lower = contract_type.lower().strip()
                    if ct_lower in ['call', 'c']:
                        contract_type = 'call'
                    elif ct_lower in ['put', 'p']:
                        contract_type = 'put'
                
                unusual.append({
                    'option_symbol': option.get('option_symbol') or option.get('symbol') or '',
                    'contract_type': contract_type,
                    'strike': option.get('strike') or option.get('strike_price', 0),
                    'expiration': option.get('expiration_date') or option.get('expiration', ''),
                    'volume': volume,
                    'open_interest': option.get('open_interest', 0),
                    'volume_ratio': round(volume / avg_volume, 2) if avg_volume > 0 else 0,
                    'last_price': option.get('last') or option.get('lastPrice', 0),
                    'bid': option.get('bid', 0),
                    'ask': option.get('ask', 0),
                    'detected_at': datetime.utcnow().isoformat()
                })
        
        # Sort by volume ratio (highest first)
        unusual.sort(key=lambda x: x['volume_ratio'], reverse=True)
        
        return unusual[:20]  # Return top 20
    
    def detect_large_blocks(self, symbol: str, min_contracts: int = 1000) -> List[Dict]:
        """
        Detect large block trades
        
        Large blocks are typically institutional trades
        """
        # This would require real-time trade data from Tradier
        # For now, we'll use open interest as a proxy
        expirations = self.tradier.get_options_expirations(symbol)
        large_blocks = []
        
        for expiration in expirations[:3]:
            options = self.tradier.get_options_chain(symbol, expiration)
            
            for option in options:
                open_interest = option.get('open_interest', 0)
                volume = option.get('volume', 0)
                
                # Large open interest suggests large positions
                if open_interest >= min_contracts:
                    # Get contract type from various possible field names
                    contract_type = (
                        option.get('type') or 
                        option.get('option_type') or 
                        option.get('contract_type') or
                        option.get('putCall') or
                        ''
                    )
                    # Normalize to 'call' or 'put'
                    if contract_type:
                        ct_lower = contract_type.lower().strip()
                        if ct_lower in ['call', 'c']:
                            contract_type = 'call'
                        elif ct_lower in ['put', 'p']:
                            contract_type = 'put'
                    
                    large_blocks.append({
                        'option_symbol': option.get('option_symbol') or option.get('symbol') or '',
                        'contract_type': contract_type,
                        'strike': option.get('strike') or option.get('strike_price', 0),
                        'expiration': option.get('expiration_date') or option.get('expiration', ''),
                        'open_interest': open_interest,
                        'volume': volume,
                        'last_price': option.get('last') or option.get('lastPrice', 0),
                        'premium': (option.get('last') or 0) * open_interest * 100,  # Estimated premium
                        'detected_at': datetime.utcnow().isoformat()
                    })
        
        # Sort by open interest
        large_blocks.sort(key=lambda x: x['open_interest'], reverse=True)
        
        return large_blocks[:20]
    
    def detect_sweep_orders(self, symbol: str) -> List[Dict]:
        """
        Detect sweep orders (buying multiple strikes simultaneously)
        
        Sweep orders are when large traders buy multiple strikes at once
        """
        expirations = self.tradier.get_options_expirations(symbol)
        sweeps = []
        
        for expiration in expirations[:2]:
            options = self.tradier.get_options_chain(symbol, expiration)
            
            # Group by contract type
            calls = [opt for opt in options if opt.get('type', '').lower() == 'call']
            puts = [opt for opt in options if opt.get('type', '').lower() == 'put']
            
            # Check for simultaneous high volume across multiple strikes
            for contract_type, contracts in [('call', calls), ('put', puts)]:
                high_volume_strikes = [
                    opt for opt in contracts 
                    if opt.get('volume', 0) > 100 and opt.get('open_interest', 0) > 500
                ]
                
                if len(high_volume_strikes) >= 3:  # 3+ strikes with high volume
                    sweeps.append({
                        'symbol': symbol,
                        'contract_type': contract_type,
                        'expiration': expiration,
                        'strikes': [opt.get('strike') for opt in high_volume_strikes],
                        'total_volume': sum(opt.get('volume', 0) for opt in high_volume_strikes),
                        'total_open_interest': sum(opt.get('open_interest', 0) for opt in high_volume_strikes),
                        'strike_count': len(high_volume_strikes),
                        'detected_at': datetime.utcnow().isoformat()
                    })
        
        return sweeps
    
    def analyze_flow(self, symbol: str) -> Dict:
        """Comprehensive options flow analysis"""
        unusual_volume = self.detect_unusual_volume(symbol)
        large_blocks = self.detect_large_blocks(symbol)
        sweeps = self.detect_sweep_orders(symbol)
        
        return {
            'symbol': symbol,
            'unusual_volume': unusual_volume,
            'large_blocks': large_blocks,
            'sweep_orders': sweeps,
            'summary': {
                'unusual_volume_count': len(unusual_volume),
                'large_blocks_count': len(large_blocks),
                'sweep_orders_count': len(sweeps),
                'total_signals': len(unusual_volume) + len(large_blocks) + len(sweeps)
            },
            'analyzed_at': datetime.utcnow().isoformat()
        }

