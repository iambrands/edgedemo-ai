import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import current_app
import random

class TradierConnector:
    """Tradier API integration with mock data support and alternative data sources"""
    
    def __init__(self):
        try:
            self.api_key = current_app.config.get('TRADIER_API_KEY')
            self.api_secret = current_app.config.get('TRADIER_API_SECRET')
            self.account_id = current_app.config.get('TRADIER_ACCOUNT_ID')
            self.base_url = current_app.config.get('TRADIER_BASE_URL', 'https://api.tradier.com/v1')
            self.use_mock = current_app.config.get('USE_MOCK_DATA', True)
            self.use_yahoo = current_app.config.get('USE_YAHOO_DATA', False)
            self.use_polygon = current_app.config.get('USE_POLYGON_DATA', False)
            self.sandbox = current_app.config.get('TRADIER_SANDBOX', True)
            
            # Initialize alternative data sources if enabled
            if self.use_yahoo:
                try:
                    from services.yahoo_connector import YahooConnector
                    self.yahoo = YahooConnector()
                except ImportError:
                    self.use_yahoo = False
                    self.yahoo = None
            else:
                self.yahoo = None
            
            if self.use_polygon:
                try:
                    from services.polygon_connector import PolygonConnector
                    self.polygon = PolygonConnector()
                except ImportError:
                    self.use_polygon = False
                    self.polygon = None
            else:
                self.polygon = None
        except RuntimeError:
            # Outside application context - use defaults
            self.api_key = ''
            self.api_secret = ''
            self.account_id = ''
            self.base_url = 'https://api.tradier.com/v1'
            self.use_mock = True
            self.use_yahoo = False
            self.use_polygon = False
            self.sandbox = True
            self.yahoo = None
            self.polygon = None
    
    def _get_headers(self) -> Dict:
        """Get API headers"""
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/json'
        }
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request or return mock data"""
        if self.use_mock:
            return self._get_mock_data(endpoint, params)
        
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.get(url, headers=self._get_headers(), params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            try:
                current_app.logger.error(f"Tradier API error: {str(e)}")
            except RuntimeError:
                pass  # Outside application context
            # Fallback to mock data on error
            return self._get_mock_data(endpoint, params)
    
    def _get_mock_data(self, endpoint: str, params: Dict = None) -> Dict:
        """Generate mock data for development"""
        if 'quotes' in endpoint:
            return self._mock_quote(params.get('symbols', 'AAPL') if params else 'AAPL')
        elif 'options/expirations' in endpoint:
            return self._mock_expirations(params.get('symbol', 'AAPL') if params else 'AAPL')
        elif 'options/chains' in endpoint:
            return self._mock_options_chain(
                params.get('symbol', 'AAPL') if params else 'AAPL',
                params.get('expiration', '')
            )
        elif 'accounts' in endpoint and 'positions' in endpoint:
            return self._mock_positions()
        elif 'accounts' in endpoint and 'balances' in endpoint:
            return self._mock_balances()
        return {}
    
    def get_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote - tries Yahoo/Polygon first if enabled"""
        # Try Yahoo Finance first if enabled
        if self.use_yahoo and self.yahoo:
            quote = self.yahoo.get_quote(symbol)
            if quote:
                return quote
        
        # Try Polygon.io if enabled
        if self.use_polygon and self.polygon:
            quote = self.polygon.get_quote(symbol)
            if quote:
                return quote
        
        # Fall back to mock or Tradier
        if self.use_mock:
            return self._mock_quote(symbol)
        
        endpoint = 'markets/quotes'
        params = {'symbols': symbol}
        response = self._make_request(endpoint, params)
        # Always return the full structure to match mock data format
        if 'quotes' in response and 'quote' in response['quotes']:
            quote = response['quotes']['quote']
            if isinstance(quote, list):
                quote = quote[0]
            # Return in the same format as mock data
            return {
                'quotes': {
                    'quote': quote
                }
            }
        return {'quotes': {'quote': {}}}
    
    def _mock_quote(self, symbol: str) -> Dict:
        """Mock stock quote"""
        base_price = random.uniform(50, 500)
        change = random.uniform(-5, 5)
        return {
            'quotes': {
                'quote': {
                    'symbol': symbol,
                    'description': f'{symbol} Inc.',
                    'last': round(base_price, 2),
                    'change': round(change, 2),
                    'volume': random.randint(1000000, 10000000),
                    'open': round(base_price - change * 0.5, 2),
                    'high': round(base_price + abs(change), 2),
                    'low': round(base_price - abs(change), 2),
                    'close': round(base_price - change, 2)
                }
            }
        }
    
    def get_options_expirations(self, symbol: str) -> List[str]:
        """Get available option expiration dates - tries Yahoo/Polygon first if enabled"""
        # Try Yahoo Finance first if enabled
        if self.use_yahoo and self.yahoo:
            expirations = self.yahoo.get_options_expirations(symbol)
            if expirations:
                return expirations
        
        # Try Polygon.io if enabled
        if self.use_polygon and self.polygon:
            expirations = self.polygon.get_options_expirations(symbol)
            if expirations:
                return expirations
        
        # Fall back to mock or Tradier
        if self.use_mock:
            mock_data = self._mock_expirations(symbol)
            try:
                current_app.logger.info(f'Mock expirations for {symbol}: {mock_data}')
            except RuntimeError:
                pass
            return mock_data['expirations']['expiration']
        
        endpoint = f'markets/options/expirations'
        params = {'symbol': symbol}
        response = self._make_request(endpoint, params)
        try:
            current_app.logger.info(f'Tradier expirations response for {symbol}: {response}')
        except RuntimeError:
            pass
        if 'expirations' in response and 'expiration' in response['expirations']:
            expirations = response['expirations']['expiration']
            # Handle both list and single value
            if isinstance(expirations, list):
                return expirations
            else:
                return [expirations]
        return []
    
    def _mock_expirations(self, symbol: str) -> Dict:
        """Mock expiration dates"""
        today = datetime.now()
        expirations = []
        # Generate next 12 Fridays
        for i in range(1, 13):
            days_until_friday = (4 - today.weekday()) % 7
            if days_until_friday == 0:
                days_until_friday = 7
            expiration = today + timedelta(days=days_until_friday + (i-1) * 7)
            expirations.append(expiration.strftime('%Y-%m-%d'))
        return {'expirations': {'expiration': expirations}}
    
    def get_options_chain(self, symbol: str, expiration: str) -> List[Dict]:
        """Get options chain for symbol and expiration - tries Yahoo/Polygon first if enabled"""
        # Try Yahoo Finance first if enabled
        if self.use_yahoo and self.yahoo:
            chain = self.yahoo.get_options_chain(symbol, expiration)
            if chain:
                return chain
        
        # Try Polygon.io if enabled
        if self.use_polygon and self.polygon:
            chain = self.polygon.get_options_chain(symbol, expiration)
            if chain:
                return chain
        
        # Fall back to mock or Tradier
        if self.use_mock:
            chain_data = self._mock_options_chain(symbol, expiration)
            if 'options' in chain_data and 'option' in chain_data['options']:
                options = chain_data['options']['option']
                return options if isinstance(options, list) else [options]
            return []
        
        endpoint = 'markets/options/chains'
        params = {'symbol': symbol, 'expiration': expiration, 'greeks': 'true'}
        response = self._make_request(endpoint, params)
        if 'options' in response and 'option' in response['options']:
            options = response['options']['option']
            return options if isinstance(options, list) else [options]
        return []
    
    def _mock_options_chain(self, symbol: str, expiration: str) -> Dict:
        """Generate mock options chain with Greeks"""
        quote = self.get_quote(symbol)
        stock_price = quote['quotes']['quote']['last'] if 'quotes' in quote else 100
        
        options = []
        strikes = []
        # Generate strikes around current price
        for i in range(-10, 11):
            strike = round(stock_price + (i * 5), 0)
            strikes.append(strike)
        
        for strike in strikes:
            # Call option
            call_price = max(0.01, stock_price - strike + random.uniform(0.5, 10))
            call_volume = random.randint(0, 500)
            call_oi = random.randint(0, 2000)
            call_bid = call_price * 0.98
            call_ask = call_price * 1.02
            
            options.append({
                'symbol': f'{symbol}{expiration.replace("-", "")}C{int(strike * 1000):08d}',
                'description': f'{symbol} {expiration} {strike} Call',
                'exch': 'Q',
                'type': 'call',
                'last': round(call_price, 2),
                'change': round(random.uniform(-0.5, 0.5), 2),
                'volume': call_volume,
                'open_interest': call_oi,
                'bid': round(call_bid, 2),
                'ask': round(call_ask, 2),
                'strike': strike,
                'expiration_date': expiration,
                'greeks': {
                    'delta': round(random.uniform(0.1, 0.9), 4),
                    'gamma': round(random.uniform(0.001, 0.01), 4),
                    'theta': round(random.uniform(-0.05, -0.01), 4),
                    'vega': round(random.uniform(0.01, 0.1), 4),
                    'mid_iv': round(random.uniform(0.15, 0.50), 4)
                }
            })
            
            # Put option
            put_price = max(0.01, strike - stock_price + random.uniform(0.5, 10))
            put_volume = random.randint(0, 500)
            put_oi = random.randint(0, 2000)
            put_bid = put_price * 0.98
            put_ask = put_price * 1.02
            
            options.append({
                'symbol': f'{symbol}{expiration.replace("-", "")}P{int(strike * 1000):08d}',
                'description': f'{symbol} {expiration} {strike} Put',
                'exch': 'Q',
                'type': 'put',
                'last': round(put_price, 2),
                'change': round(random.uniform(-0.5, 0.5), 2),
                'volume': put_volume,
                'open_interest': put_oi,
                'bid': round(put_bid, 2),
                'ask': round(put_ask, 2),
                'strike': strike,
                'expiration_date': expiration,
                'greeks': {
                    'delta': round(random.uniform(-0.9, -0.1), 4),
                    'gamma': round(random.uniform(0.001, 0.01), 4),
                    'theta': round(random.uniform(-0.05, -0.01), 4),
                    'vega': round(random.uniform(0.01, 0.1), 4),
                    'mid_iv': round(random.uniform(0.15, 0.50), 4)
                }
            })
        
        return {'options': {'option': options}}
    
    def get_account_balances(self) -> Dict:
        """Get account balances"""
        if self.use_mock:
            return self._mock_balances()
        
        endpoint = f'accounts/{self.account_id}/balances'
        response = self._make_request(endpoint)
        return response.get('balances', {})
    
    def _mock_balances(self) -> Dict:
        """Mock account balances"""
        return {
            'balances': {
                'total_equity': 100000.00,
                'cash': {
                    'cash_available': 50000.00,
                    'cash_margin': 50000.00,
                    'sweep': 0.00
                },
                'pdt': {
                    'day_trade_buying_power': 100000.00,
                    'fed_call': 0.00
                }
            }
        }
    
    def get_positions(self) -> List[Dict]:
        """Get current positions"""
        if self.use_mock:
            return self._mock_positions()
        
        endpoint = f'accounts/{self.account_id}/positions'
        response = self._make_request(endpoint)
        if 'positions' in response and 'position' in response['positions']:
            positions = response['positions']['position']
            return positions if isinstance(positions, list) else [positions]
        return []
    
    def _mock_positions(self) -> Dict:
        """Mock positions"""
        return {
            'positions': {
                'position': []
            }
        }
    
    def place_order(self, symbol: str, side: str, quantity: int, order_type: str = 'market', 
                   price: float = None, option_symbol: str = None) -> Dict:
        """Place an order"""
        if self.use_mock:
            return {
                'order': {
                    'id': random.randint(100000, 999999),
                    'status': 'ok',
                    'partner_id': 'mock_order'
                }
            }
        
        endpoint = f'accounts/{self.account_id}/orders'
        data = {
            'class': 'option' if option_symbol else 'equity',
            'symbol': option_symbol if option_symbol else symbol,
            'side': side,
            'quantity': quantity,
            'type': order_type
        }
        if price:
            data['price'] = price
        
        try:
            response = requests.post(
                f"{self.base_url}/{endpoint}",
                headers=self._get_headers(),
                data=data,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            try:
                current_app.logger.error(f"Order placement error: {str(e)}")
            except RuntimeError:
                pass  # Outside application context
            return {'error': str(e)}

