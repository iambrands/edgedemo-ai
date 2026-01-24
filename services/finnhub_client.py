"""
Finnhub API client with caching for economic and earnings calendars.

Free tier limits:
- 60 API calls per minute
- 30,000 API calls per month

Endpoints:
- Economic Calendar: Major economic events (GDP, unemployment, etc.)
- Earnings Calendar: Company earnings announcements
"""

import os
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from functools import lru_cache

logger = logging.getLogger(__name__)

# Simple in-memory cache with expiration
_cache: Dict[str, Dict[str, Any]] = {}


def _get_cached(key: str, max_age_seconds: int = 3600) -> Optional[Any]:
    """Get cached value if not expired"""
    if key in _cache:
        cached = _cache[key]
        if datetime.utcnow().timestamp() - cached['timestamp'] < max_age_seconds:
            return cached['data']
    return None


def _set_cache(key: str, data: Any):
    """Set cache value with timestamp"""
    _cache[key] = {
        'data': data,
        'timestamp': datetime.utcnow().timestamp()
    }


class FinnhubClient:
    """
    Finnhub API client with caching and rate limiting awareness.
    
    Usage:
        client = FinnhubClient()
        
        # Get economic calendar
        economic = client.get_economic_calendar(days_ahead=7)
        
        # Get earnings calendar
        earnings = client.get_earnings_calendar(days_ahead=7)
        
        # Get earnings for specific symbol
        aapl_earnings = client.get_symbol_earnings('AAPL')
    """
    
    def __init__(self, api_key: str = None):
        """
        Initialize Finnhub client.
        
        Args:
            api_key: Finnhub API key. If not provided, reads from FINNHUB_API_KEY env var.
        """
        self.api_key = api_key or os.getenv('FINNHUB_API_KEY', '')
        self.base_url = "https://finnhub.io/api/v1"
        
        if not self.api_key:
            logger.warning("FINNHUB_API_KEY not found - Finnhub features will be disabled")
    
    def is_available(self) -> bool:
        """Check if Finnhub client is available"""
        return bool(self.api_key)
    
    def _make_request(self, endpoint: str, params: Dict = None, timeout: int = 10) -> Optional[Dict]:
        """Make API request with error handling"""
        if not self.is_available():
            logger.warning("Finnhub API key not configured")
            return None
        
        url = f"{self.base_url}/{endpoint}"
        request_params = {'token': self.api_key}
        if params:
            request_params.update(params)
        
        try:
            response = requests.get(url, params=request_params, timeout=timeout)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 403:
                logger.error("Finnhub API key invalid or unauthorized")
                return None
            elif response.status_code == 429:
                logger.warning("Finnhub rate limit exceeded (60 calls/minute)")
                return None
            else:
                logger.error(f"Finnhub API error: {response.status_code} - {response.text[:200]}")
                return None
                
        except requests.exceptions.Timeout:
            logger.error(f"Finnhub API timeout for {endpoint}")
            return None
        except Exception as e:
            logger.error(f"Finnhub API error for {endpoint}: {e}")
            return None
    
    def get_economic_calendar(self, days_ahead: int = 7, use_cache: bool = True) -> Dict:
        """
        Get economic calendar events (GDP, unemployment, etc.)
        
        Args:
            days_ahead: Number of days to look ahead (default: 7)
            use_cache: Use cached data if available (default: True)
        
        Returns:
            Dict with events, counts, and metadata
        """
        cache_key = f"economic_calendar_{days_ahead}"
        
        # Check cache first (1 hour TTL)
        if use_cache:
            cached = _get_cached(cache_key, max_age_seconds=3600)
            if cached is not None:
                logger.debug("Returning cached economic calendar")
                return cached
        
        if not self.is_available():
            return {
                'events': [],
                'total': 0,
                'high_impact': 0,
                'from_date': None,
                'to_date': None,
                'error': 'API key not configured'
            }
        
        from_date = datetime.now().strftime('%Y-%m-%d')
        to_date = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
        
        data = self._make_request('calendar/economic', {
            'from': from_date,
            'to': to_date
        })
        
        if data is None:
            return {
                'events': [],
                'total': 0,
                'high_impact': 0,
                'from_date': from_date,
                'to_date': to_date,
                'error': 'API request failed'
            }
        
        events = data.get('economicCalendar', [])
        
        # Enrich events with additional info
        enriched_events = []
        for event in events:
            enriched = {
                'id': f"{event.get('country', 'US')}_{event.get('event', '')}_{event.get('time', '')}".replace(' ', '_'),
                'event': event.get('event', 'Unknown'),
                'country': event.get('country', 'US'),
                'time': event.get('time'),
                'impact': event.get('impact', 'low'),
                'actual': event.get('actual'),
                'estimate': event.get('estimate'),
                'previous': event.get('prev'),
                'unit': event.get('unit', ''),
            }
            enriched_events.append(enriched)
        
        # Sort by time
        enriched_events.sort(key=lambda x: x.get('time') or '')
        
        # Count by impact
        high_impact = len([e for e in enriched_events if e.get('impact') == 'high'])
        medium_impact = len([e for e in enriched_events if e.get('impact') == 'medium'])
        
        result = {
            'events': enriched_events,
            'total': len(enriched_events),
            'high_impact': high_impact,
            'medium_impact': medium_impact,
            'from_date': from_date,
            'to_date': to_date,
            'cached': False
        }
        
        # Cache the result
        _set_cache(cache_key, result)
        
        logger.info(f"Fetched {len(enriched_events)} economic events ({high_impact} high impact)")
        
        return result
    
    def get_earnings_calendar(self, days_ahead: int = 7, use_cache: bool = True) -> Dict:
        """
        Get earnings calendar (company earnings announcements)
        
        Args:
            days_ahead: Number of days to look ahead (default: 7)
            use_cache: Use cached data if available (default: True)
        
        Returns:
            Dict with earnings, counts, and metadata
        """
        cache_key = f"earnings_calendar_{days_ahead}"
        
        # Check cache first (1 hour TTL)
        if use_cache:
            cached = _get_cached(cache_key, max_age_seconds=3600)
            if cached is not None:
                logger.debug("Returning cached earnings calendar")
                return cached
        
        if not self.is_available():
            return {
                'earnings': [],
                'total': 0,
                'from_date': None,
                'to_date': None,
                'error': 'API key not configured'
            }
        
        from_date = datetime.now().strftime('%Y-%m-%d')
        to_date = (datetime.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
        
        data = self._make_request('calendar/earnings', {
            'from': from_date,
            'to': to_date
        })
        
        if data is None:
            return {
                'earnings': [],
                'total': 0,
                'from_date': from_date,
                'to_date': to_date,
                'error': 'API request failed'
            }
        
        earnings = data.get('earningsCalendar', [])
        
        # Enrich earnings data
        enriched_earnings = []
        for earning in earnings:
            enriched = {
                'symbol': earning.get('symbol', ''),
                'date': earning.get('date'),
                'hour': earning.get('hour', ''),  # 'bmo' (before market open), 'amc' (after market close)
                'quarter': earning.get('quarter'),
                'year': earning.get('year'),
                'eps_estimate': earning.get('epsEstimate'),
                'eps_actual': earning.get('epsActual'),
                'revenue_estimate': earning.get('revenueEstimate'),
                'revenue_actual': earning.get('revenueActual'),
            }
            enriched_earnings.append(enriched)
        
        # Sort by date
        enriched_earnings.sort(key=lambda x: x.get('date') or '')
        
        result = {
            'earnings': enriched_earnings,
            'total': len(enriched_earnings),
            'from_date': from_date,
            'to_date': to_date,
            'cached': False
        }
        
        # Cache the result
        _set_cache(cache_key, result)
        
        logger.info(f"Fetched {len(enriched_earnings)} earnings events")
        
        return result
    
    def get_symbol_earnings(self, symbol: str, use_cache: bool = True) -> Dict:
        """
        Get earnings for a specific symbol
        
        Args:
            symbol: Stock symbol (e.g., 'AAPL')
            use_cache: Use cached data if available (default: True)
        
        Returns:
            Dict with upcoming and past earnings for the symbol
        """
        cache_key = f"symbol_earnings_{symbol.upper()}"
        
        # Check cache first (24 hour TTL for individual symbols)
        if use_cache:
            cached = _get_cached(cache_key, max_age_seconds=86400)
            if cached is not None:
                logger.debug(f"Returning cached earnings for {symbol}")
                return cached
        
        if not self.is_available():
            return {
                'symbol': symbol.upper(),
                'upcoming': None,
                'all_earnings': [],
                'error': 'API key not configured'
            }
        
        data = self._make_request('calendar/earnings', {
            'symbol': symbol.upper()
        })
        
        if data is None:
            return {
                'symbol': symbol.upper(),
                'upcoming': None,
                'all_earnings': [],
                'error': 'API request failed'
            }
        
        earnings = data.get('earningsCalendar', [])
        
        # Find upcoming earnings
        today = datetime.now().date()
        upcoming = None
        past = []
        
        for earning in earnings:
            try:
                earnings_date = datetime.strptime(earning.get('date', ''), '%Y-%m-%d').date()
                earning_data = {
                    'date': earning.get('date'),
                    'quarter': earning.get('quarter'),
                    'year': earning.get('year'),
                    'eps_estimate': earning.get('epsEstimate'),
                    'eps_actual': earning.get('epsActual'),
                    'revenue_estimate': earning.get('revenueEstimate'),
                    'revenue_actual': earning.get('revenueActual'),
                }
                
                if earnings_date >= today and upcoming is None:
                    upcoming = earning_data
                    upcoming['days_until'] = (earnings_date - today).days
                else:
                    past.append(earning_data)
            except (ValueError, TypeError):
                continue
        
        result = {
            'symbol': symbol.upper(),
            'upcoming': upcoming,
            'past_earnings': past[:10],  # Last 10 earnings
            'total_earnings': len(earnings),
            'cached': False
        }
        
        # Cache the result
        _set_cache(cache_key, result)
        
        return result
    
    def clear_cache(self):
        """Clear all cached data"""
        global _cache
        _cache = {}
        logger.info("Finnhub cache cleared")


# Singleton instance
_finnhub_client: Optional[FinnhubClient] = None


def get_finnhub_client() -> FinnhubClient:
    """Get or create Finnhub client singleton"""
    global _finnhub_client
    if _finnhub_client is None:
        _finnhub_client = FinnhubClient()
    return _finnhub_client
