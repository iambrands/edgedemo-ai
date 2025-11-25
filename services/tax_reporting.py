from typing import Dict, List, Optional
from datetime import datetime, date
from flask import current_app
from models.trade import Trade
from models.position import Position
import csv
import io

class TaxReportingService:
    """Service for tax reporting and trade exports"""
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def get_trades_for_export(self, user_id: int, start_date: date = None, 
                              end_date: date = None) -> List[Dict]:
        """Get trades formatted for tax export"""
        db = self._get_db()
        
        query = db.session.query(Trade).filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Trade.trade_date >= start_date)
        if end_date:
            query = query.filter(Trade.trade_date <= end_date)
        
        trades = query.order_by(Trade.trade_date).all()
        
        export_data = []
        for trade in trades:
            export_data.append({
                'trade_date': trade.trade_date.strftime('%Y-%m-%d') if trade.trade_date else '',
                'symbol': trade.symbol,
                'option_type': trade.option_type or '',
                'strike_price': trade.strike_price or '',
                'expiration_date': trade.expiration_date.strftime('%Y-%m-%d') if trade.expiration_date else '',
                'quantity': trade.quantity,
                'entry_price': trade.entry_price or 0,
                'exit_price': trade.exit_price or 0,
                'entry_date': trade.entry_date.strftime('%Y-%m-%d') if trade.entry_date else '',
                'exit_date': trade.exit_date.strftime('%Y-%m-%d') if trade.exit_date else '',
                'profit_loss': trade.realized_pnl or 0,
                'commission': trade.commission or 0,
                'net_proceeds': (trade.realized_pnl or 0) - (trade.commission or 0),
                'strategy_source': trade.strategy_source or 'manual'
            })
        
        return export_data
    
    def export_to_csv(self, user_id: int, start_date: date = None, 
                     end_date: date = None) -> str:
        """Export trades to CSV format"""
        trades = self.get_trades_for_export(user_id, start_date, end_date)
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            'trade_date', 'symbol', 'option_type', 'strike_price', 'expiration_date',
            'quantity', 'entry_price', 'exit_price', 'entry_date', 'exit_date',
            'profit_loss', 'commission', 'net_proceeds', 'strategy_source'
        ])
        
        writer.writeheader()
        writer.writerows(trades)
        
        return output.getvalue()
    
    def detect_wash_sales(self, user_id: int, year: int = None) -> List[Dict]:
        """
        Detect wash sales (selling and buying same security within 30 days)
        
        Wash sale rules apply to options on the same underlying
        """
        db = self._get_db()
        
        if year:
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
        else:
            start_date = None
            end_date = None
        
        query = db.session.query(Trade).filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Trade.trade_date >= start_date)
        if end_date:
            query = query.filter(Trade.trade_date <= end_date)
        
        trades = query.order_by(Trade.trade_date).all()
        
        wash_sales = []
        
        # Group trades by symbol
        symbol_trades = {}
        for trade in trades:
            if trade.symbol not in symbol_trades:
                symbol_trades[trade.symbol] = []
            symbol_trades[trade.symbol].append(trade)
        
        # Check for wash sales (sell then buy within 30 days)
        for symbol, symbol_trade_list in symbol_trades.items():
            for i, trade1 in enumerate(symbol_trade_list):
                if trade1.realized_pnl and trade1.realized_pnl < 0:  # Loss
                    for trade2 in symbol_trade_list[i+1:]:
                        if trade2.entry_date and trade1.exit_date:
                            days_between = (trade2.entry_date - trade1.exit_date).days
                            if 0 <= days_between <= 30:
                                wash_sales.append({
                                    'symbol': symbol,
                                    'loss_trade': {
                                        'id': trade1.id,
                                        'date': trade1.exit_date.isoformat(),
                                        'loss': trade1.realized_pnl
                                    },
                                    'replacement_trade': {
                                        'id': trade2.id,
                                        'date': trade2.entry_date.isoformat(),
                                        'days_apart': days_between
                                    },
                                    'disallowed_loss': abs(trade1.realized_pnl)
                                })
                                break
        
        return wash_sales
    
    def calculate_tax_summary(self, user_id: int, year: int) -> Dict:
        """Calculate tax summary for a year"""
        db = self._get_db()
        
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        
        trades = db.session.query(Trade).filter(
            Trade.user_id == user_id,
            Trade.trade_date >= start_date,
            Trade.trade_date <= end_date,
            Trade.realized_pnl.isnot(None)
        ).all()
        
        total_proceeds = sum(t.realized_pnl for t in trades if t.realized_pnl)
        total_commissions = sum(t.commission or 0 for t in trades)
        total_trades = len(trades)
        
        winning_trades = [t for t in trades if t.realized_pnl and t.realized_pnl > 0]
        losing_trades = [t for t in trades if t.realized_pnl and t.realized_pnl < 0]
        
        total_gains = sum(t.realized_pnl for t in winning_trades)
        total_losses = sum(t.realized_pnl for t in losing_trades)
        
        wash_sales = self.detect_wash_sales(user_id, year)
        disallowed_losses = sum(ws['disallowed_loss'] for ws in wash_sales)
        
        return {
            'year': year,
            'total_trades': total_trades,
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'total_proceeds': round(total_proceeds, 2),
            'total_gains': round(total_gains, 2),
            'total_losses': round(total_losses, 2),
            'total_commissions': round(total_commissions, 2),
            'net_proceeds': round(total_proceeds - total_commissions, 2),
            'wash_sales_count': len(wash_sales),
            'disallowed_losses': round(disallowed_losses, 2),
            'taxable_gains': round(total_gains - abs(total_losses) + disallowed_losses, 2)
        }
    
    def export_1099b_format(self, user_id: int, year: int) -> str:
        """Export in 1099-B compatible format"""
        trades = self.get_trades_for_export(
            user_id,
            date(year, 1, 1),
            date(year, 12, 31)
        )
        
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            'Date Acquired', 'Date Sold', 'Description', 'Proceeds', 
            'Cost Basis', 'Gain/Loss', 'Wash Sale'
        ])
        
        writer.writeheader()
        
        wash_sales = {ws['loss_trade']['id']: True for ws in self.detect_wash_sales(user_id, year)}
        
        for trade in trades:
            writer.writerow({
                'Date Acquired': trade['entry_date'],
                'Date Sold': trade['exit_date'],
                'Description': f"{trade['quantity']} {trade['symbol']} {trade['option_type']} ${trade['strike_price']} {trade['expiration_date']}",
                'Proceeds': trade['exit_price'] * trade['quantity'] * 100 if trade['exit_price'] else 0,
                'Cost Basis': trade['entry_price'] * trade['quantity'] * 100 if trade['entry_price'] else 0,
                'Gain/Loss': trade['profit_loss'],
                'Wash Sale': 'Yes' if trade.get('id') in wash_sales else 'No'
            })
        
        return output.getvalue()

