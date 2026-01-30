"""
Pre-computation service for popular symbols.

Proactively analyzes popular symbols every 5 minutes so results
are instantly available when users request them.
"""

import logging
from datetime import datetime
from typing import List
import pytz
import json
import time
import os

from services.cache_manager import CacheManager
from services.tradier_connector import TradierConnector
from services.options_analyzer import OptionsAnalyzer

logger = logging.getLogger(__name__)


class PrecomputeService:
    """
    Pre-compute analysis for popular symbols to ensure instant results.
    
    Strategy:
    - Runs every 5 minutes during market hours
    - Analyzes top 15 most requested symbols
    - Caches for next 2 expirations (most commonly requested)
    - Uses 'balanced' preference (most common)
    """
    
    # Top symbols based on user request patterns
    POPULAR_SYMBOLS = [
        # Index ETFs (most popular)
        'SPY', 'QQQ', 'IWM', 'DIA',
        # Mega-cap tech (high demand)
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
        # Popular stocks
        'AMD', 'JPM', 'DIS', 'V'
    ]
    
    def __init__(self):
        self.cache = CacheManager()
        self.tradier = TradierConnector()
        self.analyzer = OptionsAnalyzer()
        self.last_run = None
    
    def precompute_popular_symbols(self) -> None:
        """
        Pre-compute analysis for all popular symbols.
        Called by scheduler every 5 minutes during market hours.
        """
        
        # Skip if market closed
        if not self._is_market_hours():
            logger.info("📴 Market closed, skipping precompute")
            return
        
        start_time = time.time()
        logger.info(f"🚀 Starting precompute for {len(self.POPULAR_SYMBOLS)} symbols")
        
        success_count = 0
        skip_count = 0
        error_count = 0
        
        for symbol in self.POPULAR_SYMBOLS:
            try:
                result = self._precompute_symbol(symbol)
                if result == 'success':
                    success_count += 1
                elif result == 'skipped':
                    skip_count += 1
            except Exception as e:
                logger.error(f"❌ Failed to precompute {symbol}: {e}")
                error_count += 1
        
        duration = time.time() - start_time
        
        logger.info(
            f"✅ Precompute complete in {duration:.1f}s: "
            f"{success_count} computed, {skip_count} skipped, {error_count} errors"
        )
        
        self.last_run = datetime.now()
    
    def _precompute_symbol(self, symbol: str) -> str:
        """
        Pre-compute analysis for single symbol.
        
        Returns:
            'success' - analysis computed and cached
            'skipped' - cache still fresh, no work needed
            'error' - failed to compute
        """
        
        try:
            # Get next expiration (most commonly requested)
            expirations = self.tradier.get_options_expirations(symbol)
            if not expirations or len(expirations) < 1:
                logger.warning(f"⚠️ No expirations for {symbol}")
                return 'error'
            
            # Analyze for balanced preference (most common)
            expiration = expirations[0]  # Nearest expiration
            cache_key = f"analysis:{symbol}:{expiration}:balanced"
            
            # Check if fresh cache exists
            if self.cache.redis and self.cache.redis.exists(cache_key):
                ttl = self.cache.redis.ttl(cache_key)
                if ttl > 120:  # More than 2 minutes remaining
                    logger.debug(f"⏭️  Skipping {symbol} - cache fresh ({ttl}s remaining)")
                    return 'skipped'
            
            # Perform analysis
            logger.debug(f"Pre-computing: {symbol} {expiration}")
            
            result = self.analyzer.analyze_options_chain(
                symbol=symbol,
                expiration=expiration,
                preference='balanced'
            )
            
            # Cache for 5 minutes
            if self.cache.redis:
                self.cache.set_analysis(symbol, expiration, 'balanced', result, ttl=300)
            
            logger.debug(f"Cached analysis: {symbol} (valid for 5 min)")
            return 'success'
            
        except Exception as e:
            logger.error(f"❌ Analysis failed for {symbol}: {e}", exc_info=True)
            return 'error'
    
    def _is_market_hours(self) -> bool:
        """
        Check if market is currently open.
        NYSE/NASDAQ: 9:30 AM - 4:00 PM ET, Monday-Friday
        """
        try:
            now = datetime.now(pytz.timezone('US/Eastern'))
        except:
            # Fallback if pytz not available
            from datetime import timezone, timedelta
            et = timezone(timedelta(hours=-5))  # EST
            now = datetime.now(et)
        
        # Weekend
        if now.weekday() >= 5:
            return False
        
        # Before market open (9:30 AM)
        if now.hour < 9 or (now.hour == 9 and now.minute < 30):
            return False
        
        # After market close (4:00 PM)
        if now.hour >= 16:
            return False
        
        return True
    
    def get_status(self) -> dict:
        """Get precompute service status"""
        return {
            'enabled': True,
            'symbols_tracked': len(self.POPULAR_SYMBOLS),
            'symbols': self.POPULAR_SYMBOLS,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'market_open': self._is_market_hours()
        }

