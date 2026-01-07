from typing import Dict, List, Optional
from datetime import datetime, date, timedelta
from flask import current_app
from models.earnings import EarningsCalendar
from models.automation import Automation
import requests

class EarningsCalendarService:
    """Service for managing earnings calendar and auto-pausing automations"""
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def add_earnings_date(self, symbol: str, earnings_date: date, 
                         earnings_time: str = 'after_market',
                         fiscal_quarter: str = None,
                         user_id: int = None) -> EarningsCalendar:
        """Add or update earnings date for a symbol"""
        db = self._get_db()
        
        # Check if earnings date already exists
        existing = db.session.query(EarningsCalendar).filter_by(
            symbol=symbol,
            earnings_date=earnings_date
        ).first()
        
        if existing:
            existing.earnings_time = earnings_time
            existing.fiscal_quarter = fiscal_quarter
            existing.user_id = user_id
            existing.updated_at = datetime.utcnow()
            db.session.commit()
            return existing
        
        earnings = EarningsCalendar(
            symbol=symbol,
            earnings_date=earnings_date,
            earnings_time=earnings_time,
            fiscal_quarter=fiscal_quarter,
            user_id=user_id
        )
        
        db.session.add(earnings)
        db.session.commit()
        
        return earnings
    
    def fetch_earnings_from_finnhub(self, symbol: str) -> Optional[Dict]:
        """Fetch earnings date from Finnhub API (free tier)"""
        try:
            # Finnhub free tier - 60 API calls/minute
            try:
                api_key = current_app.config.get('FINNHUB_API_KEY', '')
            except RuntimeError:
                api_key = ''
            
            if not api_key:
                return None
            
            url = f"https://finnhub.io/api/v1/calendar/earnings"
            params = {
                'symbol': symbol.upper(),
                'token': api_key
            }
            
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if 'earningsCalendar' in data and len(data['earningsCalendar']) > 0:
                    # Get next upcoming earnings
                    today = date.today()
                    upcoming = None
                    for earnings in data['earningsCalendar']:
                        earnings_date = datetime.strptime(earnings.get('date', ''), '%Y-%m-%d').date()
                        if earnings_date >= today:
                            upcoming = earnings
                            break
                    
                    if upcoming:
                        return {
                            'symbol': symbol.upper(),
                            'earnings_date': datetime.strptime(upcoming.get('date', ''), '%Y-%m-%d').date(),
                            'earnings_time': 'after_market',  # Default
                            'fiscal_quarter': upcoming.get('quarter'),
                            'estimated_eps': upcoming.get('epsEstimate'),
                            'actual_eps': upcoming.get('epsActual')
                        }
        except Exception as e:
            try:
                current_app.logger.warning(f"Error fetching earnings from Finnhub for {symbol}: {e}")
            except:
                pass
        return None
    
    def get_or_fetch_earnings_for_symbol(self, symbol: str, user_id: int = None) -> Optional[Dict]:
        """Get earnings from DB or fetch from API if not found"""
        db = self._get_db()
        today = date.today()
        
        # Check database first
        existing = db.session.query(EarningsCalendar).filter(
            EarningsCalendar.symbol == symbol.upper(),
            EarningsCalendar.earnings_date >= today
        ).order_by(EarningsCalendar.earnings_date).first()
        
        if existing:
            return existing.to_dict()
        
        # Fetch from API if not in database
        earnings_data = self.fetch_earnings_from_finnhub(symbol)
        if earnings_data:
            earnings = self.add_earnings_date(
                symbol=earnings_data['symbol'],
                earnings_date=earnings_data['earnings_date'],
                earnings_time=earnings_data.get('earnings_time', 'after_market'),
                fiscal_quarter=earnings_data.get('fiscal_quarter'),
                user_id=user_id
            )
            return earnings.to_dict()
        
        return None
    
    def get_upcoming_earnings(self, days_ahead: int = 30, user_id: int = None, symbols: List[str] = None) -> List[Dict]:
        """Get upcoming earnings dates, optionally fetching for specific symbols"""
        db = self._get_db()
        
        today = date.today()
        end_date = today + timedelta(days=days_ahead)
        
        # If symbols provided, fetch earnings for them first
        if symbols:
            for symbol in symbols:
                try:
                    self.get_or_fetch_earnings_for_symbol(symbol, user_id)
                except Exception as e:
                    try:
                        current_app.logger.warning(f"Error fetching earnings for {symbol}: {e}")
                    except:
                        pass
        
        query = db.session.query(EarningsCalendar).filter(
            EarningsCalendar.earnings_date >= today,
            EarningsCalendar.earnings_date <= end_date
        )
        
        if user_id:
            query = query.filter(
                (EarningsCalendar.user_id == user_id) | (EarningsCalendar.user_id.is_(None))
            )
        
        earnings = query.order_by(EarningsCalendar.earnings_date).all()
        
        # Enhance with days until earnings
        result = []
        for e in earnings:
            earnings_dict = e.to_dict()
            days_until = (e.earnings_date - today).days
            earnings_dict['days_until'] = days_until
            earnings_dict['is_this_week'] = days_until <= 7
            earnings_dict['is_this_month'] = days_until <= 30
            result.append(earnings_dict)
        
        return result
    
    def get_earnings_for_symbol(self, symbol: str, user_id: int = None) -> List[Dict]:
        """Get all earnings dates for a symbol"""
        db = self._get_db()
        
        query = db.session.query(EarningsCalendar).filter_by(symbol=symbol)
        
        if user_id:
            query = query.filter(
                (EarningsCalendar.user_id == user_id) | (EarningsCalendar.user_id.is_(None))
            )
        
        earnings = query.order_by(EarningsCalendar.earnings_date.desc()).all()
        
        return [e.to_dict() for e in earnings]
    
    def check_and_pause_automations(self, days_before: int = 3) -> Dict:
        """Check for upcoming earnings and auto-pause automations"""
        db = self._get_db()
        
        today = date.today()
        pause_date = today + timedelta(days=days_before)
        
        # Get earnings in the pause window
        upcoming_earnings = db.session.query(EarningsCalendar).filter(
            EarningsCalendar.earnings_date >= today,
            EarningsCalendar.earnings_date <= pause_date,
            EarningsCalendar.auto_pause_enabled == True
        ).all()
        
        paused_count = 0
        affected_symbols = set()
        
        for earnings in upcoming_earnings:
            # Find automations for this symbol
            automations = db.session.query(Automation).filter_by(
                symbol=earnings.symbol,
                is_active=True,
                is_paused=False
            ).all()
            
            for automation in automations:
                # Only pause if user has auto_pause enabled or it's a user-specific earnings entry
                if earnings.user_id is None or automation.user_id == earnings.user_id:
                    automation.is_paused = True
                    paused_count += 1
                    affected_symbols.add(earnings.symbol)
        
        if paused_count > 0:
            db.session.commit()
        
        return {
            'paused_count': paused_count,
            'affected_symbols': list(affected_symbols),
            'earnings_count': len(upcoming_earnings)
        }
    
    def get_historical_impact(self, symbol: str) -> Dict:
        """Get historical earnings impact for a symbol"""
        db = self._get_db()
        
        # Get past earnings
        past_earnings = db.session.query(EarningsCalendar).filter(
            EarningsCalendar.symbol == symbol,
            EarningsCalendar.earnings_date < date.today()
        ).order_by(EarningsCalendar.earnings_date.desc()).limit(10).all()
        
        if not past_earnings:
            return {
                'average_iv_change': 0,
                'average_price_change': 0,
                'average_iv_crush': 0,
                'sample_size': 0
            }
        
        iv_changes = [e.historical_iv_change for e in past_earnings if e.historical_iv_change]
        price_changes = [e.historical_price_change for e in past_earnings if e.historical_price_change]
        iv_crushes = [e.historical_iv_crush for e in past_earnings if e.historical_iv_crush]
        
        return {
            'average_iv_change': sum(iv_changes) / len(iv_changes) if iv_changes else 0,
            'average_price_change': sum(price_changes) / len(price_changes) if price_changes else 0,
            'average_iv_crush': sum(iv_crushes) / len(iv_crushes) if iv_crushes else 0,
            'sample_size': len(past_earnings)
        }

