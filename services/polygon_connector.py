"""
Polygon.io API connector for real options data
Free tier: 5 calls/minute, 2 years historical data
"""
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import current_app
import time

class PolygonConnector:
    """Polygon.io API integration for options data"""
    
    def __init__(self):
        try:
            self.api_key = current_app.config.get('POLYGON_API_KEY', '')
            self.base_url = 'https://api.polygon.io'
            self.use_polygon = current_app.config.get('USE_POLYGON_DATA', False)
            self.rate_limit_delay = 12  # 5 calls per minute = 12 seconds between calls
            self.last_call_time = 0
        except RuntimeError:
            # Outside application context
            self.api_key = ''
            self.base_url = 'https://api.polygon.io'
            self.use_polygon = False
            self.rate_limit_delay = 12
            self.last_call_time = 0
    
    def _rate_limit(self):
        """Respect rate limits (5 calls/minute for free tier)"""
        current_time = time.time()
        time_since_last_call = current_time - self.last_call_time
        if time_since_last_call < self.rate_limit_delay:
            time.sleep(self.rate_limit_delay - time_since_last_call)
        self.last_call_time = time.time()
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request to Polygon.io"""
        if not self.use_polygon or not self.api_key:
            return {}
        
        self._rate_limit()
        
        url = f"{self.base_url}{endpoint}"
        if params is None:
            params = {}
        params['apiKey'] = self.api_key
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            try:
                current_app.logger.error(f"Polygon API error: {str(e)}")
            except RuntimeError:
                pass
            return {}
    
    def get_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote"""
        endpoint = f"/v2/last/trade/{symbol}"
        data = self._make_request(endpoint)
        
        if 'results' in data:
            trade = data['results']
            return {
                'quotes': {
                    'quote': {
                        'symbol': symbol,
                        'last': trade.get('p', 0),
                        'change': 0,  # Polygon doesn't provide change in this endpoint
                        'close': trade.get('p', 0),
                        'volume': 0,
                        'description': symbol
                    }
                }
            }
        return {}
    
    def get_options_expirations(self, symbol: str) -> List[str]:
        """Get available expiration dates for options"""
        endpoint = f"/v3/snapshot/options/{symbol}"
        data = self._make_request(endpoint)
        
        expirations = set()
        if 'results' in data:
            for option in data['results']:
                if 'expiration_date' in option:
                    expirations.add(option['expiration_date'])
        
        return sorted(list(expirations))
    
    def get_options_chain(self, symbol: str, expiration: str) -> List[Dict]:
        """Get options chain for symbol and expiration"""
        endpoint = f"/v3/snapshot/options/{symbol}"
        params = {'expiration_date': expiration}
        data = self._make_request(endpoint, params)
        
        options = []
        if 'results' in data:
            for option in data['results']:
                if option.get('expiration_date') == expiration:
                    # Parse option symbol to get strike and type
                    option_symbol = option.get('ticker', '')
                    details = option.get('details', {})
                    
                    parsed_option = {
                        'symbol': option_symbol,
                        'description': option.get('name', option_symbol),
                        'exch': 'Q',
                        'type': 'call' if 'C' in option_symbol.upper() else 'put',
                        'last': option.get('last_quote', {}).get('last', 0),
                        'change': 0,
                        'volume': option.get('session', {}).get('volume', 0),
                        'open_interest': option.get('open_interest', 0),
                        'bid': option.get('last_quote', {}).get('bid', 0),
                        'ask': option.get('last_quote', {}).get('ask', 0),
                        'strike': details.get('strike_price', 0),
                        'expiration_date': expiration,
                        'greeks': {
                            'delta': details.get('delta', 0),
                            'gamma': details.get('gamma', 0),
                            'theta': details.get('theta', 0),
                            'vega': details.get('vega', 0),
                            'mid_iv': details.get('implied_volatility', 0)
                        }
                    }
                    options.append(parsed_option)
        
        return options
    
    def get_historical_data(self, symbol: str, days: int = 30) -> List[Dict]:
        """Get historical price data"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        endpoint = f"/v2/aggs/ticker/{symbol}/range/1/day/{start_date.strftime('%Y-%m-%d')}/{end_date.strftime('%Y-%m-%d')}"
        data = self._make_request(endpoint)
        
        if 'results' in data:
            return data['results']
        return []


