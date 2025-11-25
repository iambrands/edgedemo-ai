"""
Yahoo Finance connector using yfinance library
Completely free, no API key needed
"""
from typing import Dict, List, Optional
from flask import current_app
from datetime import datetime
import yfinance as yf

class YahooConnector:
    """Yahoo Finance integration for options data (via yfinance)"""
    
    def __init__(self):
        try:
            self.use_yahoo = current_app.config.get('USE_YAHOO_DATA', False)
        except RuntimeError:
            self.use_yahoo = False
    
    def get_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote"""
        if not self.use_yahoo:
            return {}
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            history = ticker.history(period='1d')
            
            if not history.empty:
                last_price = history['Close'].iloc[-1]
                prev_close = history['Close'].iloc[-2] if len(history) > 1 else last_price
                change = last_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                volume = history['Volume'].iloc[-1]
            else:
                last_price = info.get('currentPrice', 0)
                prev_close = info.get('previousClose', last_price)
                change = last_price - prev_close
                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                volume = info.get('volume', 0)
            
            return {
                'quotes': {
                    'quote': {
                        'symbol': symbol,
                        'last': last_price,
                        'change': change,
                        'close': prev_close,
                        'volume': int(volume),
                        'description': info.get('longName', symbol)
                    }
                }
            }
        except Exception as e:
            try:
                current_app.logger.error(f"Yahoo Finance error: {str(e)}")
            except RuntimeError:
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


