from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from models.trade import Trade
from models.position import Position
from models.automation import Automation
import statistics

class PerformanceTracker:
    """Track automation and position performance"""
    
    def _get_db(self):
        """Get db instance from current app context"""
        return current_app.extensions['sqlalchemy']
    
    def get_automation_performance(self, automation_id: int) -> Dict:
        """Get performance metrics for a specific automation"""
        db = self._get_db()
        
        automation = db.session.query(Automation).get(automation_id)
        if not automation:
            return {'error': 'Automation not found'}
        
        # Get all positions for this automation
        positions = db.session.query(Position).filter_by(
            automation_id=automation_id
        ).all()
        
        # Get closed positions
        closed_positions = [p for p in positions if p.status == 'closed']
        
        # Get trades for this automation
        trades = db.session.query(Trade).filter_by(
            automation_id=automation_id
        ).all()
        
        closed_trades = [t for t in trades if t.realized_pnl is not None]
        
        if not closed_trades:
            return {
                'automation_id': automation_id,
                'automation_name': automation.name,
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0.0,
                'average_return': 0.0,
                'total_pnl': 0.0,
                'total_pnl_percent': 0.0,
                'best_trade': None,
                'worst_trade': None,
                'average_hold_time': 0,
                'total_executions': automation.execution_count
            }
        
        # Calculate metrics
        winning_trades = [t for t in closed_trades if t.realized_pnl and t.realized_pnl > 0]
        losing_trades = [t for t in closed_trades if t.realized_pnl and t.realized_pnl < 0]
        
        win_rate = (len(winning_trades) / len(closed_trades) * 100) if closed_trades else 0
        total_pnl = sum(t.realized_pnl for t in closed_trades if t.realized_pnl)
        
        # Average return
        returns = [t.realized_pnl_percent for t in closed_trades if t.realized_pnl_percent]
        avg_return = statistics.mean(returns) if returns else 0.0
        
        # Best and worst trades
        best_trade = max(closed_trades, key=lambda t: t.realized_pnl_percent or 0) if closed_trades else None
        worst_trade = min(closed_trades, key=lambda t: t.realized_pnl_percent or 0) if closed_trades else None
        
        # Average hold time
        hold_times = []
        for position in closed_positions:
            if position.entry_date and position.last_updated:
                hold_time = (position.last_updated - position.entry_date).days
                hold_times.append(hold_time)
        avg_hold_time = statistics.mean(hold_times) if hold_times else 0
        
        return {
            'automation_id': automation_id,
            'automation_name': automation.name,
            'symbol': automation.symbol,
            'strategy_type': automation.strategy_type,
            'total_trades': len(closed_trades),
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': round(win_rate, 2),
            'average_return': round(avg_return, 2),
            'total_pnl': round(total_pnl, 2),
            'total_pnl_percent': round((total_pnl / sum(t.price * t.quantity * 100 for t in closed_trades if t.price and t.quantity)) * 100, 2) if closed_trades else 0.0,
            'best_trade': {
                'id': best_trade.id,
                'symbol': best_trade.symbol,
                'pnl': best_trade.realized_pnl,
                'pnl_percent': best_trade.realized_pnl_percent,
                'trade_date': best_trade.trade_date.isoformat() if best_trade.trade_date else None
            } if best_trade else None,
            'worst_trade': {
                'id': worst_trade.id,
                'symbol': worst_trade.symbol,
                'pnl': worst_trade.realized_pnl,
                'pnl_percent': worst_trade.realized_pnl_percent,
                'trade_date': worst_trade.trade_date.isoformat() if worst_trade.trade_date else None
            } if worst_trade else None,
            'average_hold_time': round(avg_hold_time, 1),
            'total_executions': automation.execution_count,
            'last_executed': automation.last_executed.isoformat() if automation.last_executed else None
        }
    
    def get_user_performance(self, user_id: int, start_date: Optional[str] = None, 
                            end_date: Optional[str] = None) -> Dict:
        """Get overall performance metrics for a user"""
        db = self._get_db()
        
        # Get all trades
        query = db.session.query(Trade).filter_by(user_id=user_id)
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Trade.trade_date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Trade.trade_date <= end)
        
        trades = query.all()
        closed_trades = [t for t in trades if t.realized_pnl is not None]
        
        # Get open positions
        open_positions = db.session.query(Position).filter_by(
            user_id=user_id,
            status='open'
        ).all()
        
        # Calculate metrics
        total_realized_pnl = sum(t.realized_pnl for t in closed_trades if t.realized_pnl)
        total_unrealized_pnl = sum(p.unrealized_pnl or 0 for p in open_positions)
        
        winning_trades = [t for t in closed_trades if t.realized_pnl and t.realized_pnl > 0]
        losing_trades = [t for t in closed_trades if t.realized_pnl and t.realized_pnl < 0]
        
        win_rate = (len(winning_trades) / len(closed_trades) * 100) if closed_trades else 0
        
        returns = [t.realized_pnl_percent for t in closed_trades if t.realized_pnl_percent]
        avg_return = statistics.mean(returns) if returns else 0.0
        
        # Performance by strategy source
        performance_by_source = {}
        for trade in closed_trades:
            source = trade.strategy_source or 'manual'
            if source not in performance_by_source:
                performance_by_source[source] = {
                    'count': 0,
                    'pnl': 0,
                    'winning': 0
                }
            performance_by_source[source]['count'] += 1
            performance_by_source[source]['pnl'] += (trade.realized_pnl or 0)
            if trade.realized_pnl and trade.realized_pnl > 0:
                performance_by_source[source]['winning'] += 1
        
        # Calculate win rates
        for source in performance_by_source:
            performance_by_source[source]['win_rate'] = (
                performance_by_source[source]['winning'] / performance_by_source[source]['count'] * 100
            ) if performance_by_source[source]['count'] > 0 else 0
        
        return {
            'total_trades': len(closed_trades),
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': round(win_rate, 2),
            'average_return': round(avg_return, 2),
            'total_realized_pnl': round(total_realized_pnl, 2),
            'total_unrealized_pnl': round(total_unrealized_pnl, 2),
            'total_pnl': round(total_realized_pnl + total_unrealized_pnl, 2),
            'open_positions': len(open_positions),
            'performance_by_source': performance_by_source
        }
    
    def get_portfolio_analytics(self, user_id: int) -> Dict:
        """Get comprehensive portfolio analytics"""
        db = self._get_db()
        
        # Get all positions
        positions = db.session.query(Position).filter_by(user_id=user_id, status='open').all()
        
        # Calculate portfolio Greeks
        total_delta = sum((p.current_delta or 0) * p.quantity * (100 if p.option_symbol else 1) for p in positions)
        total_theta = sum((p.current_theta or 0) * p.quantity * (100 if p.option_symbol else 1) for p in positions)
        total_vega = sum((p.current_vega or 0) * p.quantity * (100 if p.option_symbol else 1) for p in positions)
        total_gamma = sum((p.current_gamma or 0) * p.quantity * (100 if p.option_symbol else 1) for p in positions)
        
        # Position distribution
        positions_by_symbol = {}
        for position in positions:
            symbol = position.symbol
            if symbol not in positions_by_symbol:
                positions_by_symbol[symbol] = {
                    'count': 0,
                    'total_value': 0,
                    'total_pnl': 0
                }
            positions_by_symbol[symbol]['count'] += 1
            positions_by_symbol[symbol]['total_value'] += (position.current_price or 0) * position.quantity * (100 if position.option_symbol else 1)
            positions_by_symbol[symbol]['total_pnl'] += (position.unrealized_pnl or 0)
        
        return {
            'total_positions': len(positions),
            'portfolio_greeks': {
                'delta': round(total_delta, 2),
                'theta': round(total_theta, 2),
                'vega': round(total_vega, 2),
                'gamma': round(total_gamma, 2)
            },
            'positions_by_symbol': positions_by_symbol,
            'total_unrealized_pnl': round(sum(p.unrealized_pnl or 0 for p in positions), 2)
        }

