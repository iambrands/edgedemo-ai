from typing import Dict
from datetime import datetime, time, date, timedelta
import pytz

class MarketHours:
    """Market hours detection and utilities"""
    
    # Market hours (ET)
    MARKET_OPEN = time(9, 30)  # 9:30 AM ET
    MARKET_CLOSE = time(16, 0)  # 4:00 PM ET
    
    # Pre-market (4:00 AM - 9:30 AM ET)
    PRE_MARKET_OPEN = time(4, 0)
    PRE_MARKET_CLOSE = time(9, 30)
    
    # After-hours (4:00 PM - 8:00 PM ET)
    AFTER_HOURS_OPEN = time(16, 0)
    AFTER_HOURS_CLOSE = time(20, 0)
    
    # Market holidays (2024-2025)
    MARKET_HOLIDAYS = [
        date(2024, 1, 1),   # New Year's Day
        date(2024, 1, 15),  # Martin Luther King Jr. Day
        date(2024, 2, 19),  # Presidents' Day
        date(2024, 3, 29),  # Good Friday
        date(2024, 5, 27),  # Memorial Day
        date(2024, 6, 19),  # Juneteenth
        date(2024, 7, 4),   # Independence Day
        date(2024, 9, 2),   # Labor Day
        date(2024, 11, 28), # Thanksgiving
        date(2024, 12, 25), # Christmas
        date(2025, 1, 1),   # New Year's Day
        date(2025, 1, 20),  # Martin Luther King Jr. Day
        date(2025, 2, 17),  # Presidents' Day
        date(2025, 4, 18),  # Good Friday
        date(2025, 5, 26),  # Memorial Day
        date(2025, 6, 19),  # Juneteenth
        date(2025, 7, 4),   # Independence Day
        date(2025, 9, 1),   # Labor Day
        date(2025, 11, 27), # Thanksgiving
        date(2025, 12, 25), # Christmas
    ]
    
    @staticmethod
    def is_market_open() -> bool:
        """Check if market is currently open"""
        # Get current time in ET
        et = pytz.timezone('US/Eastern')
        now_et = datetime.now(et)
        current_time = now_et.time()
        current_date = now_et.date()
        
        # Check if holiday
        if current_date in MarketHours.MARKET_HOLIDAYS:
            return False
        
        # Check if weekend
        if now_et.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False
        
        # Check if within market hours
        return MarketHours.MARKET_OPEN <= current_time < MarketHours.MARKET_CLOSE
    
    @staticmethod
    def is_pre_market() -> bool:
        """Check if currently pre-market hours"""
        et = pytz.timezone('US/Eastern')
        now_et = datetime.now(et)
        current_time = now_et.time()
        current_date = now_et.date()
        
        if current_date in MarketHours.MARKET_HOLIDAYS:
            return False
        
        if now_et.weekday() >= 5:
            return False
        
        return MarketHours.PRE_MARKET_OPEN <= current_time < MarketHours.PRE_MARKET_CLOSE
    
    @staticmethod
    def is_after_hours() -> bool:
        """Check if currently after-hours"""
        et = pytz.timezone('US/Eastern')
        now_et = datetime.now(et)
        current_time = now_et.time()
        current_date = now_et.date()
        
        if current_date in MarketHours.MARKET_HOLIDAYS:
            return False
        
        if now_et.weekday() >= 5:
            return False
        
        return MarketHours.AFTER_HOURS_OPEN <= current_time < MarketHours.AFTER_HOURS_CLOSE
    
    @staticmethod
    def is_trading_hours() -> bool:
        """Check if currently any trading hours (pre-market, market, or after-hours)"""
        return (MarketHours.is_pre_market() or 
                MarketHours.is_market_open() or 
                MarketHours.is_after_hours())
    
    @staticmethod
    def get_next_market_open() -> datetime:
        """Get next market open time"""
        et = pytz.timezone('US/Eastern')
        now_et = datetime.now(et)
        current_date = now_et.date()
        
        # Start from today
        check_date = current_date
        
        # Find next trading day
        while True:
            # Skip weekends
            weekday = check_date.weekday()
            if weekday >= 5:
                days_to_add = 7 - weekday
                check_date = check_date + timedelta(days=days_to_add)
                continue
            
            # Skip holidays
            if check_date in MarketHours.MARKET_HOLIDAYS:
                check_date = check_date + timedelta(days=1)
                continue
            
            # Found trading day
            next_open = et.localize(datetime.combine(check_date, MarketHours.MARKET_OPEN))
            
            # If today and market hasn't opened yet, return today
            if check_date == current_date and now_et.time() < MarketHours.MARKET_OPEN:
                return next_open
            
            # Otherwise, return next day
            if check_date > current_date or now_et.time() >= MarketHours.MARKET_CLOSE:
                return next_open
            
            # Move to next day
            check_date = check_date + timedelta(days=1)
    
    @staticmethod
    def get_market_status() -> Dict:
        """Get current market status"""
        return {
            'is_market_open': MarketHours.is_market_open(),
            'is_pre_market': MarketHours.is_pre_market(),
            'is_after_hours': MarketHours.is_after_hours(),
            'is_trading_hours': MarketHours.is_trading_hours(),
            'next_market_open': MarketHours.get_next_market_open().isoformat() if not MarketHours.is_market_open() else None
        }

