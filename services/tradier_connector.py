import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import random
import time
from utils.rate_limiter import tradier_rate_limiter

class TradierConnector:
    """Tradier API integration with mock data support and alternative data sources"""
    
    def __init__(self):
        try:
            from flask import current_app
            self.api_key = current_app.config.get('TRADIER_API_KEY')
            self.api_secret = current_app.config.get('TRADIER_API_SECRET')
            self.account_id = current_app.config.get('TRADIER_ACCOUNT_ID')
            self.base_url = current_app.config.get('TRADIER_BASE_URL', 'https://api.tradier.com/v1')
            # CRITICAL: Default to False for USE_MOCK_DATA - only use mock if explicitly enabled
            # This prevents silent fallback to mock data which causes wrong prices
            self.use_mock = current_app.config.get('USE_MOCK_DATA', False)
            self.use_yahoo = current_app.config.get('USE_YAHOO_DATA', False)
            self.use_polygon = current_app.config.get('USE_POLYGON_DATA', False)
            self.sandbox = current_app.config.get('TRADIER_SANDBOX', True)
            
            # Log configuration for debugging
            try:
                current_app.logger.info(
                    f"🔧 TRADIER CONFIG: use_mock={self.use_mock}, use_yahoo={self.use_yahoo}, "
                    f"use_polygon={self.use_polygon}, sandbox={self.sandbox}, "
                    f"api_key_present={bool(self.api_key)}, base_url={self.base_url}"
                )
            except:
                pass
            
            # Initialize alternative data sources if enabled
            # DISABLED: Yahoo Finance causes rate limiting issues - use Tradier directly
            # if self.use_yahoo:
            #     try:
            #         from services.yahoo_connector import YahooConnector
            #         self.yahoo = YahooConnector()
            #     except ImportError:
            #         self.use_yahoo = False
            #         self.yahoo = None
            # else:
            #     self.yahoo = None
            self.yahoo = None  # Disabled - use Tradier directly
            self.use_yahoo = False  # Force disable
            
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
            self.use_mock = False  # Changed default to False - don't use mock outside app context
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
    
    @tradier_rate_limiter
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        """Make API request or return mock data (rate limited)"""
        if self.use_mock:
            return self._get_mock_data(endpoint, params)
        
        url = f"{self.base_url}/{endpoint}"
        try:
            response = requests.get(url, headers=self._get_headers(), params=params, timeout=10)
            
            # Check for rate limit errors (429)
            if response.status_code == 429:
                try:
                    current_app.logger.warning(f"Tradier API rate limit hit for {endpoint}. Waiting and retrying...")
                except RuntimeError:
                    pass
                # Wait a bit longer and retry once
                time.sleep(2)
                response = requests.get(url, headers=self._get_headers(), params=params, timeout=10)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                try:
                    current_app.logger.error(f"Tradier API rate limit exceeded for {endpoint}. Using fallback.")
                except RuntimeError:
                    pass
            else:
                try:
                    current_app.logger.error(
                        f"🚨 TRADIER API HTTP ERROR for {endpoint}: {str(e)} "
                        f"(status={e.response.status_code if hasattr(e, 'response') else 'N/A'})"
                    )
                except RuntimeError:
                    pass
            # CRITICAL: Only fallback to mock if explicitly enabled
            # Otherwise, return empty/error response to prevent wrong data
            if self.use_mock:
                try:
                    current_app.logger.warning(
                        f"⚠️ TRADIER API failed for {endpoint}, falling back to MOCK DATA "
                        f"(USE_MOCK_DATA=True). This may cause incorrect prices!"
                    )
                except RuntimeError:
                    pass
                return self._get_mock_data(endpoint, params)
            else:
                # Return empty response - don't use mock data
                try:
                    current_app.logger.error(
                        f"🚨🚨🚨 TRADIER API FAILED for {endpoint} and USE_MOCK_DATA=False. "
                        f"Returning empty response to prevent wrong data."
                    )
                except RuntimeError:
                    pass
                return {}
        except Exception as e:
            try:
                current_app.logger.error(
                    f"🚨 TRADIER API EXCEPTION for {endpoint}: {str(e)} "
                    f"(type={type(e).__name__})"
                )
            except RuntimeError:
                pass
            # CRITICAL: Only fallback to mock if explicitly enabled
            if self.use_mock:
                try:
                    current_app.logger.warning(
                        f"⚠️ TRADIER API exception for {endpoint}, falling back to MOCK DATA. "
                        f"This may cause incorrect prices!"
                    )
                except RuntimeError:
                    pass
                return self._get_mock_data(endpoint, params)
            else:
                # Return empty response - don't use mock data
                try:
                    current_app.logger.error(
                        f"🚨🚨🚨 TRADIER API EXCEPTION for {endpoint} and USE_MOCK_DATA=False. "
                        f"Returning empty response."
                    )
                except RuntimeError:
                    pass
                return {}
    
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
        # CRITICAL: Log when fetching quotes for index options
        is_index_option = symbol in ['SPY', 'QQQ', 'IWM', 'DIA'] or any(symbol.startswith(s) for s in ['SPY', 'QQQ', 'IWM', 'DIA'])
        is_option_symbol = len(symbol) > 15 and (symbol[-9:-1].isdigit() or 'C' in symbol[-10:] or 'P' in symbol[-10:])
        
        try:
            from flask import current_app
            if is_index_option or is_option_symbol:
                current_app.logger.info(
                    f"🔍 TRADIER get_quote called for: {symbol} "
                    f"(is_index_option={is_index_option}, is_option_symbol={is_option_symbol})"
                )
        except:
            pass
        
        # DISABLED: Yahoo Finance - use Tradier directly
        # Try Yahoo Finance first if enabled
        # if self.use_yahoo and self.yahoo:
        #     quote = self.yahoo.get_quote(symbol)
        #     if quote:
        #         try:
        #             from flask import current_app
        #             if is_index_option or is_option_symbol:
        #                 current_app.logger.info(f"✅ TRADIER: Using Yahoo quote for {symbol}: {quote}")
        #         except:
        #             pass
        #         return quote
        
        # Try Polygon.io if enabled
        if self.use_polygon and self.polygon:
            quote = self.polygon.get_quote(symbol)
            if quote:
                try:
                    from flask import current_app
                    if is_index_option or is_option_symbol:
                        current_app.logger.info(f"✅ TRADIER: Using Polygon quote for {symbol}: {quote}")
                except:
                    pass
                return quote
        
        # CRITICAL: Tradier's /markets/quotes endpoint returns STOCK PRICE for option symbols, not option premium!
        # For option symbols, we MUST use get_options_chain instead - NEVER use get_quote for options
        if is_option_symbol:
            try:
                from flask import current_app
                current_app.logger.warning(
                    f"🚨 CRITICAL: get_quote called for option symbol {symbol}! "
                    f"Tradier's quotes endpoint returns STOCK PRICE, not option premium. "
                    f"Use get_options_chain instead. Returning empty quote to force chain lookup."
                )
            except:
                pass
            # Return empty quote to force caller to use options chain
            return {'quotes': {'quote': {}}}
        
        # Try Tradier API first (unless mock is explicitly enabled) - ONLY for stock symbols
        if not self.use_mock:
            endpoint = 'markets/quotes'
            params = {'symbols': symbol}
            try:
                response = self._make_request(endpoint, params)
                
                # Check if we got valid data
                if 'quotes' in response and 'quote' in response['quotes']:
                    quote = response['quotes']['quote']
                    if isinstance(quote, list):
                        quote = quote[0]
                    
                    # Check for unmatched_symbols (Tradier returns this when symbol not found)
                    if 'unmatched_symbols' in response.get('quotes', {}):
                        try:
                            from flask import current_app
                            current_app.logger.warning(
                                f"⚠️ TRADIER: Symbol {symbol} not found (unmatched_symbols). "
                                f"Returning empty quote."
                            )
                        except:
                            pass
                        return {'quotes': {'quote': {}}}
                    
                    try:
                        from flask import current_app
                        if is_index_option:
                            current_app.logger.info(f"✅ TRADIER: Using REAL Tradier quote for {symbol}")
                    except:
                        pass
                    return {
                        'quotes': {
                            'quote': quote
                        }
                    }
            except Exception as e:
                try:
                    from flask import current_app
                    current_app.logger.warning(f"Tradier API call failed for {symbol}, falling back to mock: {e}")
                except:
                    pass
        
        # Fall back to mock only if explicitly enabled OR if Tradier API failed
        if self.use_mock:
            result = self._mock_quote(symbol)
            try:
                from flask import current_app
                if is_index_option or is_option_symbol:
                    current_app.logger.warning(f"⚠️ TRADIER: Using MOCK quote for {symbol} (not real data!)")
            except:
                pass
            return result
        
        # If we get here, Tradier API failed and mock is disabled
        # Return empty quote structure
        try:
            from flask import current_app
            current_app.logger.error(f"❌ TRADIER: API failed for {symbol} and mock data is disabled. No data available.")
        except:
            pass
        return {'quotes': {'quote': {}}}
        
        try:
            from flask import current_app
            if is_index_option or is_option_symbol:
                current_app.logger.info(
                    f"🔍 TRADIER API response for {symbol}: {response}"
                )
        except:
            pass
        
        # Always return the full structure to match mock data format
        if 'quotes' in response and 'quote' in response['quotes']:
            quote = response['quotes']['quote']
            if isinstance(quote, list):
                quote = quote[0]
            
            # CRITICAL VALIDATION: Check if this looks like stock price for an option
            if is_option_symbol and quote.get('last'):
                last_price = float(quote.get('last', 0))
                if last_price > 50:
                    try:
                        from flask import current_app
                        current_app.logger.error(
                            f"🚨 CRITICAL: Tradier get_quote returned STOCK PRICE ${last_price:.2f} "
                            f"for option symbol {symbol}! This is WRONG for options!"
                        )
                    except:
                        pass
            
            # Return in the same format as mock data
            return {
                'quotes': {
                    'quote': quote
                }
            }
        return {'quotes': {'quote': {}}}
    
    def _mock_quote(self, symbol: str) -> Dict:
        """Mock stock quote - returns option premiums for option symbols, stock prices for stocks"""
        # Check if this is an option symbol (long symbol with C/P and date)
        is_option_symbol = len(symbol) > 15 and (symbol[-9:-1].isdigit() or 'C' in symbol[-10:] or 'P' in symbol[-10:])
        
        if is_option_symbol:
            # For options, return realistic option premiums (typically $0.01 to $50)
            # Use a more realistic range based on typical option pricing
            base_price = random.uniform(0.10, 25.0)  # Option premiums are usually < $50
            change = random.uniform(-0.50, 0.50)
            return {
                'quotes': {
                    'quote': {
                        'symbol': symbol,
                        'description': f'{symbol} Option',
                        'last': round(base_price, 2),
                        'change': round(change, 2),
                        'volume': random.randint(100, 10000),
                        'open': round(base_price - change * 0.5, 2),
                        'high': round(base_price + abs(change), 2),
                        'low': round(base_price - abs(change), 2),
                        'close': round(base_price - change, 2),
                        'bid': round(max(0.01, base_price - 0.10), 2),
                        'ask': round(base_price + 0.10, 2)
                    }
                }
            }
        else:
            # For stocks, return stock prices
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
        # DISABLED: Yahoo Finance - use Tradier directly
        # Try Yahoo Finance first if enabled
        # if self.use_yahoo and self.yahoo:
        #     expirations = self.yahoo.get_options_expirations(symbol)
        #     if expirations:
        #         return expirations
        
        # Try Polygon.io if enabled
        if self.use_polygon and self.polygon:
            expirations = self.polygon.get_options_expirations(symbol)
            if expirations:
                return expirations
        
        # Fall back to mock or Tradier
        if self.use_mock:
            mock_data = self._mock_expirations(symbol)
            try:
                from flask import current_app
                current_app.logger.info(f'Mock expirations for {symbol}: {mock_data}')
            except RuntimeError:
                pass
            return mock_data['expirations']['expiration']
        
        endpoint = f'markets/options/expirations'
        params = {'symbol': symbol}
        response = self._make_request(endpoint, params)
        try:
            from flask import current_app
            current_app.logger.info(f'Tradier expirations response for {symbol}: {response}')
        except RuntimeError:
            pass
        
        # Tradier API can return either 'expiration' or 'date' field
        if 'expirations' in response:
            expirations_data = response['expirations']
            # Check for 'date' field (Tradier Sandbox format)
            if 'date' in expirations_data:
                expirations = expirations_data['date']
            # Check for 'expiration' field (Tradier Production format)
            elif 'expiration' in expirations_data:
                expirations = expirations_data['expiration']
            else:
                expirations = None
            
            if expirations:
                # Handle both list and single value
                if isinstance(expirations, list):
                    result = expirations
                else:
                    result = [expirations] if expirations else []
                
                # If Tradier returns empty, fall back to mock data
                if not result:
                    try:
                        from flask import current_app
                        current_app.logger.warning(f'Tradier returned empty expirations for {symbol}, falling back to mock data')
                    except RuntimeError:
                        pass
                    return self._mock_expirations(symbol)['expirations']['expiration']
                return result
        
        # If no expirations in response, fall back to mock data
        try:
            from flask import current_app
            current_app.logger.warning(f'No expirations in Tradier response for {symbol}, falling back to mock data')
        except RuntimeError:
            pass
        return self._mock_expirations(symbol)['expirations']['expiration']
    
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
        # CRITICAL: Log index options specifically
        is_index = symbol in ['SPY', 'QQQ', 'IWM', 'DIA']
        
        try:
            from flask import current_app
            if is_index:
                current_app.logger.info(
                    f"🔍 TRADIER get_options_chain called for INDEX: {symbol} exp={expiration}"
                )
        except:
            pass
        
        # DISABLED: Yahoo Finance - use Tradier directly
        # Try Yahoo Finance first if enabled
        # if self.use_yahoo and self.yahoo:
        #     chain = self.yahoo.get_options_chain(symbol, expiration)
        #     if chain:
        #         try:
        #             from flask import current_app
        #             if is_index:
        #                 current_app.logger.info(
        #                     f"✅ TRADIER: Using Yahoo options chain for {symbol}, found {len(chain)} options"
        #                 )
        #         except:
        #             pass
        #         return chain
        
        # Try Polygon.io if enabled
        if self.use_polygon and self.polygon:
            chain = self.polygon.get_options_chain(symbol, expiration)
            if chain:
                try:
                    from flask import current_app
                    if is_index:
                        current_app.logger.info(
                            f"✅ TRADIER: Using Polygon options chain for {symbol}, found {len(chain)} options"
                        )
                except:
                    pass
                return chain
        
        # Fall back to mock or Tradier
        if self.use_mock:
            try:
                from flask import current_app
                if is_index:
                    current_app.logger.warning(
                        f"⚠️ TRADIER: Using MOCK options chain for {symbol} (not real data!)"
                    )
            except:
                pass
            chain_data = self._mock_options_chain(symbol, expiration)
            if 'options' in chain_data and 'option' in chain_data['options']:
                options = chain_data['options']['option']
                return options if isinstance(options, list) else [options]
            return []
        
        endpoint = 'markets/options/chains'
        params = {'symbol': symbol, 'expiration': expiration, 'greeks': 'true'}
        response = self._make_request(endpoint, params)
        
        try:
            from flask import current_app
            if is_index:
                current_app.logger.info(
                    f"🔍 TRADIER API options chain response for {symbol}: "
                    f"has_options={('options' in response)}, "
                    f"response_keys={list(response.keys()) if isinstance(response, dict) else 'N/A'}"
                )
        except:
            pass
        
        if 'options' in response and 'option' in response['options']:
            options = response['options']['option']
            options_list = options if isinstance(options, list) else [options]
            
            # CRITICAL: Validate and filter out options with stock prices instead of premiums
            validated_options = []
            rejected_count = 0
            
            for opt in options_list:
                bid = opt.get('bid', 0) or 0
                ask = opt.get('ask', 0) or 0
                last = opt.get('last', 0) or 0
                strike = opt.get('strike', 0) or opt.get('strike_price', 0)
                
                # CRITICAL VALIDATION: Option premiums should NEVER be > $50
                # If bid/ask/last are > $50, this is likely a stock price, not an option premium
                max_price = max(bid, ask, last) if (bid or ask or last) else 0
                
                if max_price > 50:
                    rejected_count += 1
                    try:
                        from flask import current_app
                        if is_index and rejected_count <= 3:  # Log first 3 rejections
                            current_app.logger.warning(
                                f"🚨 TRADIER: REJECTED option with stock price: "
                                f"strike=${strike}, bid=${bid:.2f}, ask=${ask:.2f}, last=${last:.2f} "
                                f"(max=${max_price:.2f} > $50 threshold)"
                            )
                    except:
                        pass
                    continue  # Skip this option - it has stock prices, not premiums
                
                validated_options.append(opt)
            
            try:
                from flask import current_app
                if is_index:
                    current_app.logger.info(
                        f"✅ TRADIER: Parsed {len(options_list)} options, validated {len(validated_options)} "
                        f"(rejected {rejected_count} with stock prices)"
                    )
                    # Log first few VALIDATED option prices
                    for i, opt in enumerate(validated_options[:3]):
                        bid = opt.get('bid', 0) or 0
                        ask = opt.get('ask', 0) or 0
                        last = opt.get('last', 0) or 0
                        strike = opt.get('strike', 0) or opt.get('strike_price', 0)
                        opt_type = opt.get('type', '')
                        current_app.logger.info(
                            f"   Valid Option {i+1}: {opt_type} ${strike} - bid=${bid:.2f}, ask=${ask:.2f}, last=${last:.2f}"
                        )
            except:
                pass
            
            return validated_options
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
                from flask import current_app
                current_app.logger.error(f"Order placement error: {str(e)}")
            except RuntimeError:
                pass  # Outside application context
            return {'error': str(e)}

