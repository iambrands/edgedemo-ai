"""
Yahoo Finance connector using yfinance library
Completely free, no API key needed
"""
from typing import Dict, List, Optional
from flask import current_app
from datetime import datetime, timedelta
import yfinance as yf
import time
from functools import lru_cache

class YahooConnector:
    """Yahoo Finance integration for options data (via yfinance)"""
    
    def __init__(self):
        try:
            from flask import current_app
            self.use_yahoo = current_app.config.get('USE_YAHOO_DATA', False)
        except RuntimeError:
            self.use_yahoo = False
        
        # Rate limiting: Yahoo Finance has no official limits, but be respectful
        # Limit to ~2 calls per second to avoid 429 errors
        self.min_call_interval = 0.5  # 500ms between calls
        self.last_call_time = {}
        
        # Cache for quotes (5 minutes)
        self.quote_cache = {}
        self.cache_duration = timedelta(minutes=5)
        
        # Track rate limit errors
        self.rate_limit_until = None
        self.rate_limit_duration = timedelta(minutes=1)  # Wait 1 minute after 429
    
    def _rate_limit(self, symbol: str = None):
        """Respect rate limits"""
        # If we're in a rate limit cooldown, wait
        if self.rate_limit_until and datetime.utcnow() < self.rate_limit_until:
            wait_seconds = (self.rate_limit_until - datetime.utcnow()).total_seconds()
            if wait_seconds > 0:
                time.sleep(min(wait_seconds, 60))  # Max 60 second wait
        
        # Check per-symbol rate limiting
        cache_key = symbol or 'default'
        if cache_key in self.last_call_time:
            time_since_last = time.time() - self.last_call_time[cache_key]
            if time_since_last < self.min_call_interval:
                time.sleep(self.min_call_interval - time_since_last)
        
        self.last_call_time[cache_key] = time.time()
    
    def _get_cached_quote(self, symbol: str) -> Optional[Dict]:
        """Get cached quote if still valid"""
        if symbol in self.quote_cache:
            cached_data, cached_time = self.quote_cache[symbol]
            if datetime.utcnow() - cached_time < self.cache_duration:
                return cached_data
            else:
                # Remove expired cache
                del self.quote_cache[symbol]
        return None
    
    def get_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote with rate limiting and caching"""
        if not self.use_yahoo:
            return {}
        
        # Check cache first
        cached = self._get_cached_quote(symbol)
        if cached:
            try:
                from flask import current_app
                current_app.logger.debug(f"Yahoo Finance: Using cached quote for {symbol}")
            except:
                pass
            return cached
        
        # Check if we're in rate limit cooldown
        if self.rate_limit_until and datetime.utcnow() < self.rate_limit_until:
            try:
                from flask import current_app
                current_app.logger.warning(
                    f"Yahoo Finance: Rate limit cooldown active for {symbol}, "
                    f"returning empty (will retry in {(self.rate_limit_until - datetime.utcnow()).total_seconds():.0f}s)"
                )
            except:
                pass
            return {}
        
        # Apply rate limiting
        self._rate_limit(symbol)
        
        try:
            ticker = yf.Ticker(symbol)
            # Use faster method - just get history, skip info if possible
            history = ticker.history(period='1d', interval='1m')
            
            if not history.empty:
                last_price = float(history['Close'].iloc[-1])
                prev_close = float(history['Close'].iloc[-2]) if len(history) > 1 else last_price
                change = last_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                volume = int(history['Volume'].iloc[-1]) if 'Volume' in history.columns else 0
            else:
                # Fallback to info if history fails
                try:
                    info = ticker.info
                    last_price = float(info.get('currentPrice', 0))
                    prev_close = float(info.get('previousClose', last_price))
                    change = last_price - prev_close
                    change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                    volume = int(info.get('volume', 0))
                except:
                    return {}
            
            result = {
                'quotes': {
                    'quote': {
                        'symbol': symbol,
                        'last': last_price,
                        'change': change,
                        'close': prev_close,
                        'volume': volume,
                        'description': symbol  # Skip longName to avoid extra API call
                    }
                }
            }
            
            # Cache the result
            self.quote_cache[symbol] = (result, datetime.utcnow())
            
            return result
            
        except Exception as e:
            error_str = str(e)
            
            # Check for 429 rate limit errors
            if '429' in error_str or 'Too Many Requests' in error_str:
                # Set rate limit cooldown
                self.rate_limit_until = datetime.utcnow() + self.rate_limit_duration
                try:
                    from flask import current_app
                    current_app.logger.warning(
                        f"Yahoo Finance rate limit hit for {symbol}. "
                        f"Entering {self.rate_limit_duration.total_seconds()}s cooldown."
                    )
                except:
                    pass
            else:
                try:
                    from flask import current_app
                    current_app.logger.error(f"Yahoo Finance error for {symbol}: {error_str}")
                except:
                    pass
            
            return {}
    
    def get_options_expirations(self, symbol: str) -> List[str]:
        """Get available expiration dates for options"""
        if not self.use_yahoo:
            return []
        
        try:
            ticker = yf.Ticker(symbol)
            expirations = ticker.options
            # Convert to YYYY-MM-DD format
            formatted_expirations = []
            for exp in expirations:
                try:
                    # Yahoo returns dates in YYYY-MM-DD format
                    datetime.strptime(exp, '%Y-%m-%d')
                    formatted_expirations.append(exp)
                except ValueError:
                    # Try other formats if needed
                    try:
                        dt = datetime.strptime(exp, '%Y%m%d')
                        formatted_expirations.append(dt.strftime('%Y-%m-%d'))
                    except:
                        formatted_expirations.append(exp)
            
            return sorted(formatted_expirations)
        except Exception as e:
            try:
                current_app.logger.error(f"Yahoo Finance expirations error: {str(e)}")
            except RuntimeError:
                pass
            return []
    
    def get_options_chain(self, symbol: str, expiration: str) -> List[Dict]:
        """Get options chain for symbol and expiration"""
        if not self.use_yahoo:
            return []
        
        try:
            ticker = yf.Ticker(symbol)
            option_chain = ticker.option_chain(expiration)
            
            options = []
            
            # Process calls
            for idx, call in option_chain.calls.iterrows():
                option = {
                    'symbol': f"{symbol}{expiration.replace('-', '')}C{int(call['strike'] * 1000):08d}",
                    'description': f"{symbol} {expiration} {call['strike']} Call",
                    'exch': 'Q',
                    'type': 'call',
                    'last': call.get('lastPrice', 0),
                    'change': call.get('change', 0),
                    'volume': int(call.get('volume', 0)),
                    'open_interest': int(call.get('openInterest', 0)),
                    'bid': call.get('bid', 0),
                    'ask': call.get('ask', 0),
                    'strike': float(call['strike']),
                    'expiration_date': expiration,
                    'greeks': {
                        'delta': call.get('delta', 0),
                        'gamma': call.get('gamma', 0),
                        'theta': call.get('theta', 0),
                        'vega': call.get('vega', 0),
                        'mid_iv': call.get('impliedVolatility', 0) / 100 if call.get('impliedVolatility') else 0
                    }
                }
                options.append(option)
            
            # Process puts
            for idx, put in option_chain.puts.iterrows():
                option = {
                    'symbol': f"{symbol}{expiration.replace('-', '')}P{int(put['strike'] * 1000):08d}",
                    'description': f"{symbol} {expiration} {put['strike']} Put",
                    'exch': 'Q',
                    'type': 'put',
                    'last': put.get('lastPrice', 0),
                    'change': put.get('change', 0),
                    'volume': int(put.get('volume', 0)),
                    'open_interest': int(put.get('openInterest', 0)),
                    'bid': put.get('bid', 0),
                    'ask': put.get('ask', 0),
                    'strike': float(put['strike']),
                    'expiration_date': expiration,
                    'greeks': {
                        'delta': put.get('delta', 0),
                        'gamma': put.get('gamma', 0),
                        'theta': put.get('theta', 0),
                        'vega': put.get('vega', 0),
                        'mid_iv': put.get('impliedVolatility', 0) / 100 if put.get('impliedVolatility') else 0
                    }
                }
                options.append(option)
            
            return options
        except Exception as e:
            try:
                current_app.logger.error(f"Yahoo Finance options chain error: {str(e)}")
            except RuntimeError:
                pass
            return []


