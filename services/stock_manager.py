from typing import Dict, List, Optional
from models.stock import Stock
from models.user import User
from services.tradier_connector import TradierConnector
from flask import current_app

class StockManager:
    """Stock watchlist and management service"""
    
    def __init__(self):
        self.tradier = TradierConnector()
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def add_to_watchlist(self, user_id: int, symbol: str, tags: List[str] = None, 
                        notes: str = None) -> Stock:
        """Add stock to user's watchlist"""
        db = self._get_db()
        # Check if already exists
        existing = db.session.query(Stock).filter_by(user_id=user_id, symbol=symbol.upper()).first()
        if existing:
            # Update existing
            if tags:
                existing.tags = ','.join(tags)
            if notes:
                existing.notes = notes
            db.session.commit()
            return existing
        
        # Get quote to populate initial data
        quote = self.tradier.get_quote(symbol)
        company_name = symbol
        current_price = None
        change_percent = None
        volume = None
        
        if 'quotes' in quote and 'quote' in quote['quotes']:
            quote_data = quote['quotes']['quote']
            company_name = quote_data.get('description', symbol)
            current_price = quote_data.get('last')
            change = quote_data.get('change', 0)
            prev_close = quote_data.get('close', current_price)
            if prev_close:
                change_percent = (change / prev_close * 100) if prev_close > 0 else 0
            volume = quote_data.get('volume')
        
        # Create new stock entry
        stock = Stock(
            user_id=user_id,
            symbol=symbol.upper(),
            company_name=company_name,
            current_price=current_price,
            change_percent=change_percent,
            volume=volume,
            tags=','.join(tags) if tags else None,
            notes=notes
        )
        
        db.session.add(stock)
        db.session.commit()
        return stock
    
    def remove_from_watchlist(self, user_id: int, symbol: str) -> bool:
        """Remove stock from watchlist"""
        db = self._get_db()
        stock = db.session.query(Stock).filter_by(user_id=user_id, symbol=symbol.upper()).first()
        if stock:
            db.session.delete(stock)
            db.session.commit()
            return True
        return False
    
    def get_watchlist(self, user_id: int) -> List[Stock]:
        """Get user's watchlist"""
        db = self._get_db()
        return db.session.query(Stock).filter_by(user_id=user_id).order_by(Stock.symbol).all()
    
    def update_stock_notes(self, user_id: int, symbol: str, notes: str) -> Optional[Stock]:
        """Update notes for a stock"""
        db = self._get_db()
        stock = db.session.query(Stock).filter_by(user_id=user_id, symbol=symbol.upper()).first()
        if stock:
            stock.notes = notes
            db.session.commit()
            return stock
        return None
    
    def update_stock_tags(self, user_id: int, symbol: str, tags: List[str]) -> Optional[Stock]:
        """Update tags for a stock"""
        db = self._get_db()
        stock = db.session.query(Stock).filter_by(user_id=user_id, symbol=symbol.upper()).first()
        if stock:
            stock.tags = ','.join(tags) if tags else None
            db.session.commit()
            return stock
        return None
    
    def refresh_watchlist_prices(self, user_id: int) -> Dict:
        """Refresh prices for all stocks in watchlist"""
        db = self._get_db()
        stocks = self.get_watchlist(user_id)
        updated = 0
        errors = []
        
        for stock in stocks:
            try:
                quote = self.tradier.get_quote(stock.symbol)
                if 'quotes' in quote and 'quote' in quote['quotes']:
                    quote_data = quote['quotes']['quote']
                    stock.current_price = quote_data.get('last')
                    change = quote_data.get('change', 0)
                    prev_close = quote_data.get('close', stock.current_price)
                    if prev_close:
                        stock.change_percent = (change / prev_close * 100) if prev_close > 0 else 0
                    stock.volume = quote_data.get('volume')
                    updated += 1
            except Exception as e:
                errors.append(f"Error updating {stock.symbol}: {str(e)}")
        
        db.session.commit()
        return {'updated': updated, 'errors': errors}
    
    def get_stock_with_options_signals(self, user_id: int, symbol: str) -> Optional[Dict]:
        """Get stock with options analysis signals"""
        db = self._get_db()
        stock = db.session.query(Stock).filter_by(user_id=user_id, symbol=symbol.upper()).first()
        if not stock:
            return None
        
        # Refresh price
        quote = self.tradier.get_quote(symbol)
        if 'quotes' in quote and 'quote' in quote['quotes']:
            quote_data = quote['quotes']['quote']
            stock.current_price = quote_data.get('last')
        
        # Get IV rank (simplified - would need historical IV data for real calculation)
        # For now, use mock IV rank
        stock.iv_rank = 50.0  # Placeholder
        stock.implied_volatility = 0.25  # Placeholder
        
        db.session.commit()
        
        return stock.to_dict()

