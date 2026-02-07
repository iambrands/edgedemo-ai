"""Admin endpoints for manual cleanup and maintenance"""

from flask import Blueprint, jsonify, request, current_app
from services.cleanup_service import (
    cleanup_expired_positions, 
    get_expiring_today, 
    get_stale_positions,
    cleanup_old_closed_positions
)
from services.cache_manager import get_cache, set_cache, clear_cache_pattern, CacheManager
from utils.decorators import token_required
from flask import current_app, jsonify
from functools import wraps
from sqlalchemy import inspect, text
from datetime import datetime
import logging
import sys
import os

# Try to import redis, but handle gracefully if not available
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    """Decorator to require admin access."""
    @wraps(f)
    @token_required
    def decorated_function(current_user, *args, **kwargs):
        if not current_user.is_admin():
            logger.warning(f"Non-admin user {current_user.email} attempted to access admin endpoint")
            return jsonify({
                'error': 'Admin access required',
                'message': 'You do not have permission to access this resource'
            }), 403
        return f(current_user, *args, **kwargs)
    return decorated_function


@admin_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(current_user, user_id):
    """
    Delete a user and all associated data. Requires admin authentication.
    POST /api/admin/users/<user_id> with DELETE method.
    """
    if current_user.id == user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    db = current_app.extensions['sqlalchemy']
    from models.user import User
    from models.trade import Trade
    from models.position import Position
    from models.stock import Stock
    from models.automation import Automation
    from models.alert import Alert
    from models.user_performance import UserPerformance
    from models.risk_limits import RiskLimits
    from models.feedback import Feedback
    from models.spread import Spread

    target_user = db.session.query(User).get(user_id)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    email = target_user.email
    try:
        deleted = {}
        deleted['trades'] = Trade.query.filter_by(user_id=user_id).delete()
        deleted['positions'] = Position.query.filter_by(user_id=user_id).delete()
        deleted['stocks'] = Stock.query.filter_by(user_id=user_id).delete()
        deleted['automations'] = Automation.query.filter_by(user_id=user_id).delete()
        deleted['alerts'] = Alert.query.filter_by(user_id=user_id).delete()
        deleted['user_performance'] = UserPerformance.query.filter_by(user_id=user_id).delete()
        deleted['risk_limits'] = RiskLimits.query.filter_by(user_id=user_id).delete()
        deleted['feedback'] = Feedback.query.filter_by(user_id=user_id).delete()
        deleted['spreads'] = Spread.query.filter_by(user_id=user_id).delete()

        try:
            from models.alert_filters import AlertFilters
            deleted['alert_filters'] = AlertFilters.query.filter_by(user_id=user_id).delete()
        except Exception:
            pass
        try:
            from models.strategy import Strategy
            deleted['strategies'] = Strategy.query.filter_by(user_id=user_id).delete()
        except Exception:
            pass

        db.session.delete(target_user)
        db.session.commit()

        logger.info(f"Admin {current_user.email} deleted user {email}: {deleted}")
        return jsonify({
            'success': True,
            'message': f'User {email} deleted',
            'deleted': deleted
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to delete user {email}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


# --- Beta code management (controlled registration) ---
import secrets
import string

@admin_bp.route('/admin/beta-codes', methods=['GET'])
@admin_required
def list_beta_codes(current_user):
    """List all beta codes with usage stats."""
    from models.beta_code import BetaCode
    db = current_app.extensions['sqlalchemy']
    codes = db.session.query(BetaCode).order_by(BetaCode.created_at.desc()).all()
    return jsonify([{
        'id': c.id,
        'code': c.code,
        'description': c.description or '',
        'max_uses': c.max_uses,
        'current_uses': c.current_uses,
        'valid_from': c.valid_from.isoformat() if c.valid_from else None,
        'valid_until': c.valid_until.isoformat() if c.valid_until else None,
        'is_active': c.is_active,
        'is_valid': c.is_valid(),
        'created_at': c.created_at.isoformat() if c.created_at else None,
    } for c in codes])


@admin_bp.route('/admin/beta-codes', methods=['POST'])
@admin_required
def create_beta_code(current_user):
    """Create a new beta code."""
    from models.beta_code import BetaCode
    db = current_app.extensions['sqlalchemy']
    data = request.get_json() or {}

    code_str = (data.get('code') or '').strip().upper()
    if not code_str:
        random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
        code_str = f"BETA-{random_part}"

    if db.session.query(BetaCode).filter_by(code=code_str).first():
        return jsonify({'error': 'Code already exists'}), 400

    valid_until = None
    if data.get('valid_until'):
        try:
            valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00'))
        except (ValueError, TypeError):
            pass

    code = BetaCode(
        code=code_str,
        description=data.get('description', ''),
        max_uses=int(data.get('max_uses', 100)),
        valid_until=valid_until,
        is_active=data.get('is_active', True),
        created_by=current_user.id
    )
    db.session.add(code)
    db.session.commit()

    return jsonify({
        'message': 'Beta code created',
        'code': code.code,
        'id': code.id
    }), 201


@admin_bp.route('/admin/beta-codes/<int:code_id>', methods=['PUT'])
@admin_required
def update_beta_code(current_user, code_id):
    """Update a beta code."""
    from models.beta_code import BetaCode
    db = current_app.extensions['sqlalchemy']
    code = db.session.query(BetaCode).get(code_id)
    if not code:
        return jsonify({'error': 'Beta code not found'}), 404

    data = request.get_json() or {}
    if 'description' in data:
        code.description = data['description']
    if 'max_uses' in data:
        code.max_uses = int(data['max_uses'])
    if 'is_active' in data:
        code.is_active = bool(data['is_active'])
    if 'valid_until' in data:
        code.valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00')) if data['valid_until'] else None

    db.session.commit()
    return jsonify({'message': 'Beta code updated'})


@admin_bp.route('/admin/beta-codes/<int:code_id>', methods=['DELETE'])
@admin_required
def delete_beta_code(current_user, code_id):
    """Deactivate a beta code (preserve history)."""
    from models.beta_code import BetaCode
    db = current_app.extensions['sqlalchemy']
    code = db.session.query(BetaCode).get(code_id)
    if not code:
        return jsonify({'error': 'Beta code not found'}), 404
    code.is_active = False
    db.session.commit()
    return jsonify({'message': 'Beta code deactivated'})


@admin_bp.route('/admin/beta-codes/<int:code_id>/users', methods=['GET'])
@admin_required
def get_beta_code_users(current_user, code_id):
    """Get all users who registered with a specific code."""
    from models.beta_code import BetaCodeUsage
    from models.user import User
    db = current_app.extensions['sqlalchemy']
    usages = db.session.query(BetaCodeUsage).filter_by(beta_code_id=code_id).all()
    out = []
    for u in usages:
        usr = db.session.query(User).get(u.user_id)
        out.append({
            'user_id': u.user_id,
            'email': usr.email if usr else None,
            'used_at': u.used_at.isoformat() if u.used_at else None
        })
    return jsonify(out)


@admin_bp.route('/admin/ping', methods=['GET'])
@admin_required
def ping(current_user):
    """Simple test endpoint - no auth, no database. Use this to verify admin routes work.
    
    Access at: /api/admin/ping
    """
    try:
        logger.info("Ping endpoint called - admin routes are working")
        return jsonify({
            'status': 'ok',
            'message': 'Admin routes are working',
            'blueprint': admin_bp.name,
            'endpoint': '/api/admin/ping',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Ping endpoint error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@admin_bp.route('/admin/warm-cache', methods=['POST'])
@admin_required
def warm_cache_now(current_user):
    """
    Manually trigger cache warming.
    
    POST /api/admin/warm-cache
    
    Query params:
    - symbols: comma-separated list of symbols to warm (optional)
               If not provided, warms all default symbols
    
    Examples:
    - curl -X POST https://your-app/api/admin/warm-cache
    - curl -X POST "https://your-app/api/admin/warm-cache?symbols=AAPL,AMD,TSLA"
    """
    import time
    start_time = time.time()
    
    try:
        # Get optional symbols filter
        symbols_param = request.args.get('symbols', '')
        
        results = {
            'status': 'warming',
            'started_at': datetime.utcnow().isoformat(),
            'symbols_warmed': [],
            'symbols_failed': [],
            'errors': []
        }
        
        # Import the warming function
        from services.cache_warmer import warm_all_caches
        from services.options_flow import OptionsFlowAnalyzer
        
        if symbols_param:
            # Warm specific symbols only
            symbols = [s.strip().upper() for s in symbols_param.split(',') if s.strip()]
            logger.info(f"🔥 Manual cache warming for symbols: {symbols}")
            
            for symbol in symbols:
                try:
                    cache_key = f'options_flow_analyze:{symbol}'
                    analyzer = OptionsFlowAnalyzer()
                    analysis = analyzer.analyze_flow(symbol)
                    
                    if analysis:
                        set_cache(cache_key, analysis, timeout=300)
                        results['symbols_warmed'].append(symbol)
                        logger.info(f"✅ Warmed {symbol}")
                    else:
                        # Cache empty result
                        empty_result = {
                            'symbol': symbol,
                            'unusual_volume': [],
                            'summary': {'total_signals': 0, 'bullish': 0, 'bearish': 0},
                            'message': 'No unusual activity detected'
                        }
                        set_cache(cache_key, empty_result, timeout=300)
                        results['symbols_warmed'].append(f"{symbol} (empty)")
                        
                except Exception as e:
                    results['symbols_failed'].append(symbol)
                    results['errors'].append(f"{symbol}: {str(e)}")
                    logger.error(f"❌ Failed to warm {symbol}: {e}")
        else:
            # Full warming
            logger.info("🔥 Manual FULL cache warming triggered")
            warming_result = warm_all_caches()
            results['full_warming_result'] = warming_result
        
        results['status'] = 'complete'
        results['duration_seconds'] = round(time.time() - start_time, 2)
        results['completed_at'] = datetime.utcnow().isoformat()
        
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"❌ Manual cache warming failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e),
            'duration_seconds': round(time.time() - start_time, 2)
        }), 500


@admin_bp.route('/admin/cache-status', methods=['GET'])
@admin_required
def cache_status(current_user):
    """
    Check cache status for options flow symbols.
    
    GET /api/admin/cache-status
    GET /api/admin/cache-status?symbols=AAPL,AMD,SPY
    
    Returns which symbols are cached and which are not.
    """
    try:
        # Default symbols to check
        default_symbols = [
            'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMD', 'TSLA',
            'META', 'AMZN', 'GOOGL', 'BA', 'COIN', 'DIA', 'IWM'
        ]
        
        # Get optional symbols filter
        symbols_param = request.args.get('symbols', '')
        if symbols_param:
            symbols = [s.strip().upper() for s in symbols_param.split(',') if s.strip()]
        else:
            symbols = default_symbols
        
        cache_status = {}
        cached_count = 0
        
        for symbol in symbols:
            cache_key = f'options_flow_analyze:{symbol}'
            cached = get_cache(cache_key)
            is_cached = cached is not None
            cache_status[symbol] = {
                'cached': is_cached,
                'cache_key': cache_key
            }
            if is_cached:
                cached_count += 1
        
        return jsonify({
            'status': 'ok',
            'total_symbols': len(symbols),
            'cached_count': cached_count,
            'uncached_count': len(symbols) - cached_count,
            'symbols': cache_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Cache status check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@admin_bp.route('/admin/debug', methods=['GET'])
@admin_required
def admin_debug(current_user):
    """Debug endpoint to verify admin blueprint is registered"""
    try:
        from flask import current_app
        routes = []
        for rule in current_app.url_map.iter_rules():
            if 'admin' in rule.rule:
                routes.append({
                    'rule': rule.rule,
                    'methods': [m for m in rule.methods if m not in ['OPTIONS', 'HEAD']],
                    'endpoint': rule.endpoint
                })
        return jsonify({
            'status': 'admin blueprint loaded',
            'admin_routes': routes,
            'total_routes': len(routes),
            'analyze_routes': [r for r in routes if 'analyze' in r['rule']],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# REMOVED: Duplicate cache-status endpoint (moved to line ~155 with better implementation)

@admin_bp.route('/admin/pnl-diagnostic', methods=['GET'])
@admin_required
def pnl_diagnostic(current_user):
    """
    Diagnostic endpoint to see trades contributing to realized P&L.
    
    GET /api/admin/pnl-diagnostic
    GET /api/admin/pnl-diagnostic?user_id=3
    
    Shows breakdown of realized P&L by trade.
    """
    try:
        from models.trade import Trade
        from models.user import User
        db = current_app.extensions['sqlalchemy']
        
        user_id = request.args.get('user_id', type=int)
        
        # Get trades with realized P&L
        query = db.session.query(Trade).filter(Trade.realized_pnl.isnot(None))
        
        if user_id:
            query = query.filter(Trade.user_id == user_id)
        
        trades = query.order_by(Trade.trade_date.desc()).all()
        
        total_realized = sum(t.realized_pnl or 0 for t in trades)
        winning = [t for t in trades if (t.realized_pnl or 0) > 0]
        losing = [t for t in trades if (t.realized_pnl or 0) < 0]
        
        # Group by user
        by_user = {}
        for t in trades:
            uid = t.user_id
            if uid not in by_user:
                by_user[uid] = {'total': 0, 'trades': 0}
            by_user[uid]['total'] += t.realized_pnl or 0
            by_user[uid]['trades'] += 1
        
        trade_details = []
        for t in trades[:50]:  # Show top 50 trades
            trade_details.append({
                'id': t.id,
                'user_id': t.user_id,
                'symbol': t.symbol,
                'action': t.action,
                'quantity': t.quantity,
                'price': float(t.price) if t.price else None,
                'realized_pnl': float(t.realized_pnl) if t.realized_pnl else None,
                'trade_date': t.trade_date.isoformat() if t.trade_date else None,
                'option_symbol': t.option_symbol
            })
        
        return jsonify({
            'status': 'ok',
            'total_realized_pnl': float(total_realized),
            'total_trades_with_pnl': len(trades),
            'winning_trades': len(winning),
            'losing_trades': len(losing),
            'win_amount': sum(t.realized_pnl or 0 for t in winning),
            'loss_amount': sum(t.realized_pnl or 0 for t in losing),
            'by_user': by_user,
            'recent_trades': trade_details,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"P&L diagnostic failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@admin_bp.route('/admin/performance-test', methods=['GET'])
@admin_required
def performance_test(current_user):
    """
    Test performance of cached endpoints. Requires admin authentication.
    
    Access at: /api/admin/performance-test
    """
    import time
    from services.cache_manager import get_cache
    
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'cache_status': {},
        'endpoint_tests': []
    }
    
    # Test 1: Check if cache warmer populated data
    cache_tests = [
        'options_flow_analyze:AAPL',
        'options_flow_analyze:SPY',
        'options_flow_analyze:TSLA',
        'options_flow_analyze:AMD',
        'quote:AAPL',
        'quote:SPY'
    ]
    
    for key in cache_tests:
        try:
            cached = get_cache(key)
            results['cache_status'][key] = 'HIT' if cached else 'MISS'
        except Exception as e:
            results['cache_status'][key] = f'ERROR: {e}'
    
    # Test 2: Time actual endpoint operations (without HTTP overhead)
    test_symbols = ['AAPL', 'SPY', 'TSLA', 'AMD']
    
    for symbol in test_symbols:
        # Test options flow analysis
        cache_key = f'options_flow_analyze:{symbol}'
        
        # First call (should be cached if warmer worked)
        start = time.time()
        try:
            cached_data = get_cache(cache_key)
            first_call_time = (time.time() - start) * 1000  # Convert to ms
            
            results['endpoint_tests'].append({
                'endpoint': f'/api/options-flow/analyze/{symbol}',
                'cache_status': 'HIT' if cached_data else 'MISS',
                'response_time_ms': round(first_call_time, 2),
                'expected': '<500ms' if cached_data else '2000-7000ms'
            })
        except Exception as e:
            results['endpoint_tests'].append({
                'endpoint': f'/api/options-flow/analyze/{symbol}',
                'cache_status': 'ERROR',
                'error': str(e),
                'response_time_ms': -1
            })
    
    # Test 3: Quote fetching
    start = time.time()
    try:
        quote_cached = get_cache('quote:AAPL')
        quote_time = (time.time() - start) * 1000
        
        results['endpoint_tests'].append({
            'endpoint': '/api/quotes (AAPL)',
            'cache_status': 'HIT' if quote_cached else 'MISS',
            'response_time_ms': round(quote_time, 2),
            'expected': '<100ms' if quote_cached else '500-1000ms'
        })
    except Exception as e:
        results['endpoint_tests'].append({
            'endpoint': '/api/quotes (AAPL)',
            'cache_status': 'ERROR',
            'error': str(e),
            'response_time_ms': -1
        })
    
    # Summary
    total_cached = sum(1 for test in results['endpoint_tests'] if test.get('cache_status') == 'HIT')
    total_tests = len(results['endpoint_tests'])
    
    results['summary'] = {
        'total_tests': total_tests,
        'cache_hits': total_cached,
        'cache_misses': total_tests - total_cached,
        'cache_hit_rate': f"{(total_cached / total_tests * 100):.1f}%" if total_tests > 0 else "N/A",
        'overall_status': 'GOOD' if total_cached >= total_tests * 0.8 else 'NEEDS_IMPROVEMENT'
    }
    
    return jsonify(results), 200


@admin_bp.route('/admin/cleanup/expired', methods=['POST'])
@admin_required
def manual_cleanup_expired(current_user):
    """Manually trigger expired position cleanup"""
    try:
        count = cleanup_expired_positions()
        return jsonify({
            'status': 'success',
            'message': f'Closed {count} expired positions',
            'count': count,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Manual cleanup failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/cleanup/cache', methods=['POST'])
@admin_required
def manual_cleanup_cache(current_user):
    """Manually clear cache"""
    try:
        # Use cache_manager for consistency
        cm = CacheManager()
        if cm.enabled and cm.redis:
            cm.redis.flushdb()
            return jsonify({
                'status': 'success',
                'message': 'All cache cleared',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        else:
            return jsonify({
                'status': 'warning',
                'message': 'Redis not configured, no cache to clear',
                'timestamp': datetime.utcnow().isoformat()
            }), 200
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/positions/expiring', methods=['GET'])
@admin_required
def check_expiring_positions(current_user):
    """Get positions expiring today"""
    try:
        expiring = get_expiring_today()
        return jsonify({
            'status': 'success',
            'count': len(expiring),
            'positions': [{
                'id': p.id,
                'symbol': p.symbol,
                'contract_type': p.contract_type or 'option',
                'strike': float(p.strike_price) if p.strike_price else None,
                'expiration_date': p.expiration_date.isoformat() if p.expiration_date else None,
                'unrealized_pnl_percent': float(p.unrealized_pnl_percent) if p.unrealized_pnl_percent else 0,
                'quantity': p.quantity
            } for p in expiring],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get expiring positions: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/positions/stale', methods=['GET'])
@admin_required
def check_stale_positions(current_user):
    """Find positions with stale price data"""
    try:
        hours = request.args.get('hours', 24, type=int)
        stale = get_stale_positions(hours=hours)
        
        return jsonify({
            'status': 'success',
            'count': len(stale),
            'hours_threshold': hours,
            'positions': [{
                'id': p.id,
                'symbol': p.symbol,
                'contract_type': p.contract_type or 'option',
                'strike': float(p.strike_price) if p.strike_price else None,
                'last_updated': p.last_updated.isoformat() if p.last_updated else None,
                'age_hours': (datetime.utcnow() - p.last_updated).total_seconds() / 3600 if p.last_updated else None,
                'current_price': float(p.current_price) if p.current_price else None,
                'entry_price': float(p.entry_price) if p.entry_price else None
            } for p in stale],
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get stale positions: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/cache/stats', methods=['GET'])
@admin_required
def cache_stats(current_user):
    """Get detailed cache statistics"""
    try:
        # Use CacheManager for consistency
        cm = CacheManager()
        stats = cm.get_stats()
        
        # Add cache metrics
        from utils.cache_metrics import CacheMetrics
        cache_metrics = CacheMetrics.get_stats()
        stats.update(cache_metrics)
        return jsonify({
            'status': 'success',
            'stats': stats,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}", exc_info=True)
        return jsonify({
            'status': 'error', 
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/analyze/database', methods=['GET'])
@admin_required
def analyze_database(current_user):
    """Analyze database schema and performance."""
    try:
        results = {
            'tables': [],
            'indices': {},
            'missing_indices': [],
            'recommendations': [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        db = current_app.extensions['sqlalchemy']
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        
        # Analyze each table
        for table_name in table_names:
            columns = inspector.get_columns(table_name)
            indices = inspector.get_indexes(table_name)
            foreign_keys = inspector.get_foreign_keys(table_name)
            
            # Get row count and size
            row_count = 0
            table_size = 'Unknown'
            try:
                row_count = db.session.execute(
                    text(f"SELECT COUNT(*) FROM {table_name}")
                ).scalar()
                
                try:
                    size_result = db.session.execute(text(
                        f"SELECT pg_size_pretty(pg_total_relation_size('{table_name}'))"
                    ))
                    table_size = size_result.scalar()
                except:
                    pass
            except Exception as e:
                logger.debug(f"Could not get stats for {table_name}: {str(e)}")
            
            table_info = {
                'name': table_name,
                'columns': len(columns),
                'indices': len(indices),
                'foreign_keys': len(foreign_keys),
                'row_count': row_count,
                'size': table_size
            }
            results['tables'].append(table_info)
            
            # Store index info
            results['indices'][table_name] = [
                {
                    'name': idx['name'],
                    'columns': idx['column_names'],
                    'unique': idx.get('unique', False)
                }
                for idx in indices
            ]
            
            # Check for missing FK indices
            indexed_columns = set()
            for idx in indices:
                indexed_columns.update(idx['column_names'])
            
            for fk in foreign_keys:
                fk_column = fk['constrained_columns'][0]
                if fk_column not in indexed_columns:
                    results['missing_indices'].append({
                        'table': table_name,
                        'column': fk_column,
                        'type': 'foreign_key',
                        'priority': 'high',
                        'sql': f"CREATE INDEX IF NOT EXISTS idx_{table_name}_{fk_column} ON {table_name}({fk_column});"
                    })
        
        # Check for common missing indices (only on existing tables)
        common_patterns = [
            ('users', 'email'),
            ('users', 'created_at'),
            ('positions', 'user_id'),
            ('positions', 'status'),
            ('positions', 'symbol'),
            ('positions', 'expiration_date'),
            ('trades', 'user_id'),
            ('trades', 'symbol'),
            ('trades', 'executed_at'),
            ('alerts', 'user_id'),
            ('alerts', 'status'),
            ('alerts', 'created_at'),
            ('spreads', 'user_id'),
            ('spreads', 'symbol'),
            ('spreads', 'status'),
        ]
        
        # Get existing tables as a set for fast lookup
        existing_tables = set(table_names)
        
        for table_name, column_name in common_patterns:
            # Skip if table doesn't exist
            if table_name not in existing_tables:
                continue
            
            indices = inspector.get_indexes(table_name)
            indexed_columns = set()
            for idx in indices:
                indexed_columns.update(idx['column_names'])
            
            # Check if this column (or multi-column index) is missing
            if column_name not in indexed_columns:
                # Check for multi-column index (e.g., "user_id,status")
                if ',' in column_name:
                    # For multi-column, check if all columns are in any index
                    cols = [c.strip() for c in column_name.split(',')]
                    has_index = any(all(col in idx['column_names'] for col in cols) for idx in indices)
                    if not has_index:
                        results['missing_indices'].append({
                            'table': table_name,
                            'column': column_name,
                            'type': 'common_pattern',
                            'priority': 'medium',
                            'sql': f"CREATE INDEX IF NOT EXISTS idx_{table_name}_{column_name.replace(',', '_')} ON {table_name}({column_name});"
                        })
                else:
                    results['missing_indices'].append({
                        'table': table_name,
                        'column': column_name,
                        'type': 'common_pattern',
                        'priority': 'medium',
                        'sql': f"CREATE INDEX IF NOT EXISTS idx_{table_name}_{column_name} ON {table_name}({column_name});"
                    })
        
        # Generate recommendations
        if results['missing_indices']:
            high_priority = [x for x in results['missing_indices'] if x['priority'] == 'high']
            results['recommendations'].append({
                'type': 'missing_indices',
                'count': len(results['missing_indices']),
                'high_priority_count': len(high_priority),
                'message': f"Found {len(results['missing_indices'])} missing indices ({len(high_priority)} high priority)"
            })
        
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"Database analysis failed: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admin/analyze/redis', methods=['GET'])
@admin_required
def analyze_redis(current_user):
    """Analyze Redis cache performance."""
    try:
        results = {
            'connected': False,
            'info': {},
            'keys': {},
            'recommendations': [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        if not REDIS_AVAILABLE:
            results['error'] = 'Redis package not available'
            return jsonify(results), 200
        
        try:
            # Use CacheManager for consistency
            cm = CacheManager()
            if not cm.enabled or not cm.redis:
                results['error'] = 'Redis not configured'
                return jsonify(results), 200
            
            redis_client = cm.redis
            redis_client.ping()
            results['connected'] = True
            
            # Get Redis info
            info = redis_client.info()
            maxmem = info.get('maxmemory', 0)
            maxmem_human = info.get('maxmemory_human') or ('0B' if maxmem == 0 else f'{maxmem // (1024*1024)}M')
            results['info'] = {
                'version': info.get('redis_version', 'Unknown'),
                'uptime_days': info.get('uptime_in_days', 0),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', 'Unknown'),
                'max_memory': maxmem_human
            }
            if maxmem == 0:
                results['recommendations'].append({
                    'type': 'maxmemory_not_set',
                    'priority': 'low',
                    'message': 'Max memory is not set (0B). On Railway, set a memory limit and eviction policy (e.g. maxmemory 256mb, maxmemory-policy allkeys-lru) in Redis config to avoid unbounded growth.'
                })
            
            # Get total keys
            try:
                keys = list(redis_client.scan_iter(match='*', count=1000))
                results['info']['total_keys'] = len(keys)
                results['keys']['total'] = len(keys)
                
                # Key patterns (sample first 100)
                patterns = {}
                for key in keys[:100]:
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    pattern = key_str.split(':')[0] if ':' in key_str else key_str
                    patterns[pattern] = patterns.get(pattern, 0) + 1
                
                results['keys']['patterns'] = patterns
            except Exception as e:
                logger.debug(f"Could not analyze keys: {str(e)}")
            
            # Calculate hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total = hits + misses
            
            if total > 0:
                hit_rate = (hits / total) * 100
                results['info']['hit_rate'] = round(hit_rate, 2)
                results['info']['hits'] = hits
                results['info']['misses'] = misses
                
                if hit_rate < 80:
                    results['recommendations'].append({
                        'type': 'low_hit_rate',
                        'priority': 'medium',
                        'message': f'Cache hit rate is {hit_rate:.1f}%. Ensure cache warmer runs every 4 min and hot keys use 360s TTL. Quote/options TTLs were extended to improve hits.'
                    })
            
        except Exception as e:
            results['error'] = str(e)
            logger.error(f"Redis analysis failed: {e}", exc_info=True)
        
        return jsonify(results), 200
        
    except Exception as e:
        logger.error(f"Redis analysis failed: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admin/analyze/connections', methods=['GET'])
@admin_required
def analyze_connections(current_user):
    """Analyze database connection pool."""
    try:
        results = {
            'pool': {},
            'active_connections': {},
            'recommendations': [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Get db from current_app extensions
        db = current_app.extensions['sqlalchemy']
        
        # Get pool info (handle gracefully if methods don't exist)
        try:
            pool = db.engine.pool
            results['pool'] = {
                'size': getattr(pool, 'size', lambda: 0)(),
                'checked_out': getattr(pool, 'checkedout', lambda: 0)(),
                'overflow': getattr(pool, 'overflow', lambda: 0)(),
                'max_overflow': getattr(pool, '_max_overflow', 0)
            }
        except Exception as e:
            logger.warning(f"Could not get pool info: {str(e)}")
            results['pool'] = {
                'error': str(e)[:200],
                'note': 'Pool information not available'
            }
        
        # Get active connections (PostgreSQL specific)
        try:
            result = db.session.execute(text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE state = 'active') as active,
                    COUNT(*) FILTER (WHERE state = 'idle') as idle,
                    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                FROM pg_stat_activity
                WHERE datname = current_database()
                    AND pid != pg_backend_pid()
            """))
            
            row = result.fetchone()
            if row:
                # Handle both attribute and index access
                total = row.total if hasattr(row, 'total') else row[0]
                active = row.active if hasattr(row, 'active') else row[1]
                idle = row.idle if hasattr(row, 'idle') else row[2]
                idle_in_transaction = row.idle_in_transaction if hasattr(row, 'idle_in_transaction') else row[3]
                
                results['active_connections'] = {
                    'total': total,
                    'active': active,
                    'idle': idle,
                    'idle_in_transaction': idle_in_transaction
                }
                
                if idle_in_transaction > 5:
                    results['recommendations'].append({
                        'type': 'idle_transactions',
                        'priority': 'high',
                        'message': f'High number of idle in transaction connections ({idle_in_transaction})'
                    })
            else:
                results['active_connections'] = {'error': 'No connection data returned'}
        except Exception as e:
            error_msg = str(e)[:200]
            logger.warning(f"Could not get connection stats: {error_msg}")
            results['active_connections'] = {
                'error': error_msg,
                'note': 'Connection stats may require PostgreSQL or special permissions'
            }
        
        return jsonify(results), 200
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Connection analysis failed: {error_msg}", exc_info=True)
        return jsonify({
            'error': error_msg[:500],
            'details': 'See server logs for more information',
            'timestamp': datetime.utcnow().isoformat()
        }), 500


@admin_bp.route('/admin/optimize/apply', methods=['POST'])
@admin_required
def apply_optimizations(current_user):
    """Apply database optimizations - only on existing tables."""
    try:
        # Log authenticated user
        logger.info(f"🔧 Apply optimizations called by user {current_user.id} ({current_user.username})")
        
        data = request.get_json() or {}
        preview_only = data.get('preview', False)
        
        results = {
            'preview': preview_only,
            'applied': [],
            'failed': [],
            'skipped': [],  # Track tables that don't exist yet
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Get db and inspector
        db = current_app.extensions['sqlalchemy']
        inspector = inspect(db.engine)
        existing_tables = set(inspector.get_table_names())
        logger.info(f"Existing tables: {sorted(existing_tables)}")
        
        # Define all potential optimizations with table info
        all_optimizations = [
            # Basic indices
            ("users", "email", "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"),
            ("users", "created_at", "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)"),
            
            ("positions", "user_id", "CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id)"),
            ("positions", "status", "CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status)"),
            ("positions", "symbol", "CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)"),
            ("positions", "expiration_date", "CREATE INDEX IF NOT EXISTS idx_positions_expiration_date ON positions(expiration_date)"),
            ("positions", "user_id,status", "CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status)"),
            
            ("trades", "user_id", "CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)"),
            ("trades", "symbol", "CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)"),
            # Note: trades table uses 'trade_date', not 'executed_at'
            ("trades", "trade_date", "CREATE INDEX IF NOT EXISTS idx_trades_trade_date ON trades(trade_date DESC)"),
            
            ("alerts", "user_id", "CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)"),
            ("alerts", "status", "CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)"),
            ("alerts", "created_at", "CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC)"),
            # Note: Multi-column index might fail if either column doesn't exist
            # ("alerts", "user_id,status", "CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status)"),
            
            ("spreads", "user_id", "CREATE INDEX IF NOT EXISTS idx_spreads_user_id ON spreads(user_id)"),
            ("spreads", "symbol", "CREATE INDEX IF NOT EXISTS idx_spreads_symbol ON spreads(symbol)"),
            ("spreads", "status", "CREATE INDEX IF NOT EXISTS idx_spreads_status ON spreads(status)"),
            
            # Foreign key indices - critical for JOIN performance
            ("positions", "automation_id", "CREATE INDEX IF NOT EXISTS idx_positions_automation_id ON positions(automation_id)"),
            
            ("trades", "automation_id", "CREATE INDEX IF NOT EXISTS idx_trades_automation_id ON trades(automation_id)"),
            ("trades", "entry_trade_id", "CREATE INDEX IF NOT EXISTS idx_trades_entry_trade_id ON trades(entry_trade_id)"),
            
            ("audit_logs", "automation_id", "CREATE INDEX IF NOT EXISTS idx_audit_logs_automation_id ON audit_logs(automation_id)"),
            ("audit_logs", "position_id", "CREATE INDEX IF NOT EXISTS idx_audit_logs_position_id ON audit_logs(position_id)"),
            ("audit_logs", "trade_id", "CREATE INDEX IF NOT EXISTS idx_audit_logs_trade_id ON audit_logs(trade_id)"),
            
            ("error_logs", "automation_id", "CREATE INDEX IF NOT EXISTS idx_error_logs_automation_id ON error_logs(automation_id)"),
            ("error_logs", "position_id", "CREATE INDEX IF NOT EXISTS idx_error_logs_position_id ON error_logs(position_id)"),
            ("error_logs", "trade_id", "CREATE INDEX IF NOT EXISTS idx_error_logs_trade_id ON error_logs(trade_id)"),
            
            ("alerts", "automation_id", "CREATE INDEX IF NOT EXISTS idx_alerts_automation_id ON alerts(automation_id)"),
            ("alerts", "position_id", "CREATE INDEX IF NOT EXISTS idx_alerts_position_id ON alerts(position_id)"),
            ("alerts", "trade_id", "CREATE INDEX IF NOT EXISTS idx_alerts_trade_id ON alerts(trade_id)"),
            
            ("strategy_logs", "position_id", "CREATE INDEX IF NOT EXISTS idx_strategy_logs_position_id ON strategy_logs(position_id)"),
        ]
        
        # Filter to only existing tables
        optimizations_to_apply = []
        for table_name, column_name, sql in all_optimizations:
            if table_name in existing_tables:
                optimizations_to_apply.append((table_name, column_name, sql))
            else:
                results['skipped'].append({
                    'table': table_name,
                    'column': column_name,
                    'reason': 'Table does not exist',
                    'sql': sql
                })
        
        logger.info(f"Will apply {len(optimizations_to_apply)} optimizations, skipped {len(results['skipped'])}")
        
        if preview_only:
            results['would_apply'] = [
                {'table': t, 'column': c, 'sql': s} 
                for t, c, s in optimizations_to_apply
            ]
        else:
            # Apply optimizations
            for table_name, column_name, sql in optimizations_to_apply:
                try:
                    logger.info(f"Applying: {sql}")
                    db.session.execute(text(sql))
                    results['applied'].append({
                        'table': table_name,
                        'column': column_name,
                        'sql': sql
                    })
                    logger.info(f"✅ Applied: {table_name}.{column_name}")
                except Exception as e:
                    error_msg = str(e)[:200]
                    # Check if index already exists (not a real error)
                    if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                        results['applied'].append({
                            'table': table_name,
                            'column': column_name,
                            'sql': sql,
                            'note': 'Already exists'
                        })
                        logger.info(f"✅ Already exists: {table_name}.{column_name}")
                    # Check if column doesn't exist (should skip, not fail)
                    elif 'does not exist' in error_msg.lower() or 'column' in error_msg.lower() and 'not exist' in error_msg.lower():
                        results['skipped'].append({
                            'table': table_name,
                            'column': column_name,
                            'sql': sql,
                            'reason': 'Column does not exist',
                            'error': error_msg
                        })
                        logger.warning(f"⚠️ Skipped (column doesn't exist): {table_name}.{column_name} - {error_msg}")
                    else:
                        results['failed'].append({
                            'table': table_name,
                            'column': column_name,
                            'sql': sql,
                            'error': error_msg
                        })
                        logger.error(f"❌ Failed: {table_name}.{column_name} - {error_msg}")
            
            # Commit if no failures
            if not results['failed']:
                db.session.commit()
                logger.info(f"✅ Committed {len(results['applied'])} optimizations")
            else:
                db.session.rollback()
                logger.warning(f"⚠️ Rolled back due to {len(results['failed'])} failures")
        
        # Add summary
        results['summary'] = {
            'applied': len(results['applied']),
            'skipped': len(results['skipped']),
            'failed': len(results['failed']),
            'total': len(all_optimizations)
        }
        
        return jsonify(results), 200
        
    except Exception as e:
        db = current_app.extensions['sqlalchemy']
        db.session.rollback()
        logger.error(f"Optimization apply failed: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admin/cache/warm', methods=['POST'])
@admin_required
def force_cache_warming(current_user):
    """Manually trigger cache warming for testing."""
    try:
        from services.cache_warmer import CacheWarmer
        
        logger.info("🔄 Manual cache warming triggered by admin")
        warmer = CacheWarmer()
        results = warmer.warm_all()
        
        return jsonify({
            'status': 'success',
            'message': 'Cache warming completed',
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Manual cache warming failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@admin_bp.route('/admin/test-earnings', methods=['GET'])
@admin_required
def test_earnings(current_user):
    """
    Test Finnhub earnings calendar integration. Requires admin authentication.
    
    Access at: /api/admin/test-earnings
    
    This endpoint tests:
    1. Whether FINNHUB_API_KEY is configured
    2. Whether the Finnhub API is reachable
    3. Whether earnings data is being returned
    """
    import requests
    from datetime import timedelta
    
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'finnhub_config': {},
        'api_test': {},
        'earnings_data': None
    }
    
    # Check if API key is configured
    finnhub_key = os.getenv('FINNHUB_API_KEY')
    results['finnhub_config'] = {
        'api_key_set': bool(finnhub_key),
        'api_key_length': len(finnhub_key) if finnhub_key else 0,
        'api_key_prefix': finnhub_key[:8] + '...' if finnhub_key and len(finnhub_key) > 8 else 'NOT SET'
    }
    
    if not finnhub_key:
        results['api_test']['error'] = 'FINNHUB_API_KEY not set in environment variables'
        results['api_test']['fix'] = 'Add FINNHUB_API_KEY to Railway environment variables. Get free key at: https://finnhub.io/register'
        return jsonify(results), 200  # Return 200 so we can see the diagnostic info
    
    # Test API call directly
    try:
        # Get earnings for next 14 days (wider range to ensure we get some data)
        today = datetime.now()
        end_date = today + timedelta(days=14)
        
        url = 'https://finnhub.io/api/v1/calendar/earnings'
        params = {
            'from': today.strftime('%Y-%m-%d'),
            'to': end_date.strftime('%Y-%m-%d'),
            'token': finnhub_key
        }
        
        logger.info(f"[EARNINGS TEST] Calling Finnhub: {url}")
        logger.info(f"[EARNINGS TEST] Date range: {params['from']} to {params['to']}")
        
        response = requests.get(url, params=params, timeout=10)
        
        results['api_test'] = {
            'status_code': response.status_code,
            'url': url,
            'date_range': f"{params['from']} to {params['to']}",
            'response_time_ms': round(response.elapsed.total_seconds() * 1000, 2)
        }
        
        if response.status_code == 200:
            data = response.json()
            earnings_list = data.get('earningsCalendar', [])
            
            results['earnings_data'] = {
                'total_earnings': len(earnings_list),
                'sample_earnings': earnings_list[:5],  # First 5 for preview
                'raw_response_keys': list(data.keys())
            }
            results['api_test']['success'] = True
            results['api_test']['message'] = f"Found {len(earnings_list)} earnings announcements"
            
            # Also test the FinnhubClient class
            try:
                from services.finnhub_client import get_finnhub_client
                client = get_finnhub_client()
                results['finnhub_client'] = {
                    'available': client.is_available(),
                    'api_key_set': bool(client.api_key),
                    'base_url': client.base_url
                }
            except Exception as client_error:
                results['finnhub_client'] = {
                    'error': str(client_error)
                }
        
        elif response.status_code == 401:
            results['api_test']['success'] = False
            results['api_test']['error'] = 'Invalid API key (401 Unauthorized)'
            results['api_test']['fix'] = 'Get a new API key from https://finnhub.io/register'
        
        elif response.status_code == 403:
            results['api_test']['success'] = False
            results['api_test']['error'] = 'Access forbidden (403) - API key may be revoked or invalid'
            results['api_test']['fix'] = 'Get a new API key from https://finnhub.io/register'
        
        elif response.status_code == 429:
            results['api_test']['success'] = False
            results['api_test']['error'] = 'Rate limit exceeded (429)'
            results['api_test']['fix'] = 'Wait a minute and try again. Free tier allows 60 calls/minute.'
        
        else:
            results['api_test']['success'] = False
            results['api_test']['error'] = f"Unexpected status code: {response.status_code}"
            results['api_test']['response_text'] = response.text[:500]
            
    except requests.exceptions.Timeout:
        results['api_test']['success'] = False
        results['api_test']['error'] = 'Request timed out (10s)'
        
    except requests.exceptions.ConnectionError as e:
        results['api_test']['success'] = False
        results['api_test']['error'] = f'Connection error: {str(e)}'
        
    except Exception as e:
        results['api_test']['success'] = False
        results['api_test']['error'] = str(e)
        logger.error(f"[EARNINGS TEST] Error: {e}", exc_info=True)
    
    return jsonify(results), 200


@admin_bp.route('/admin/test-finnhub-full', methods=['GET'])
@admin_required
def test_finnhub_full(current_user):
    """
    Test all Finnhub endpoints. Requires admin authentication.
    
    Access at: /api/admin/test-finnhub-full
    """
    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'tests': {}
    }
    
    try:
        from services.finnhub_client import get_finnhub_client
        client = get_finnhub_client()
        
        results['client_status'] = {
            'available': client.is_available(),
            'api_key_present': bool(client.api_key),
            'api_key_preview': client.api_key[:8] + '...' if client.api_key and len(client.api_key) > 8 else None
        }
        
        if not client.is_available():
            results['error'] = 'Finnhub API key not configured'
            results['fix'] = 'Set FINNHUB_API_KEY environment variable in Railway'
            return jsonify(results), 200
        
        # Test 1: Earnings Calendar
        try:
            earnings = client.get_earnings_calendar(days_ahead=14, use_cache=False)
            results['tests']['earnings_calendar'] = {
                'success': True,
                'total': earnings.get('total', 0),
                'sample': earnings.get('earnings', [])[:3],
                'date_range': f"{earnings.get('from_date')} to {earnings.get('to_date')}"
            }
        except Exception as e:
            results['tests']['earnings_calendar'] = {
                'success': False,
                'error': str(e)
            }
        
        # Test 2: Economic Calendar
        try:
            economic = client.get_economic_calendar(days_ahead=7, use_cache=False)
            results['tests']['economic_calendar'] = {
                'success': True,
                'total': economic.get('total', 0),
                'high_impact': economic.get('high_impact', 0),
                'sample': economic.get('events', [])[:3]
            }
        except Exception as e:
            results['tests']['economic_calendar'] = {
                'success': False,
                'error': str(e)
            }
        
        # Test 3: Symbol-specific earnings (AAPL as test)
        try:
            aapl_earnings = client.get_symbol_earnings('AAPL', use_cache=False)
            results['tests']['symbol_earnings'] = {
                'success': True,
                'symbol': 'AAPL',
                'upcoming': aapl_earnings.get('upcoming'),
                'total_historical': aapl_earnings.get('total_earnings', 0)
            }
        except Exception as e:
            results['tests']['symbol_earnings'] = {
                'success': False,
                'error': str(e)
            }
        
    except Exception as e:
        results['error'] = str(e)
        logger.error(f"[FINNHUB FULL TEST] Error: {e}", exc_info=True)
    
    return jsonify(results), 200


@admin_bp.route('/admin/debug/positions', methods=['GET'])
@token_required
def debug_positions(current_user):
    """Debug endpoint to verify all positions exist in database.
    
    This endpoint allows any logged-in user to check their own positions.
    Use this to verify data is safe before making changes.
    
    Access at: /api/admin/debug/positions
    """
    try:
        from models.position import Position
        
        db = current_app.extensions['sqlalchemy']
        
        # Get current user's positions
        positions = db.session.query(Position).filter_by(
            user_id=current_user.id
        ).order_by(Position.created_at.desc()).all()
        
        # Get detailed info
        position_data = []
        for pos in positions:
            position_data.append({
                'id': pos.id,
                'symbol': pos.symbol,
                'contract_type': pos.contract_type,
                'strike_price': float(pos.strike_price) if pos.strike_price else None,
                'expiration_date': pos.expiration_date.isoformat() if pos.expiration_date else None,
                'quantity': pos.quantity,
                'entry_price': float(pos.entry_price) if pos.entry_price else None,
                'current_price': float(pos.current_price) if pos.current_price else None,
                'status': pos.status,
                'spread_id': getattr(pos, 'spread_id', None),
                'position_type': getattr(pos, 'position_type', None),
                'created_at': pos.created_at.isoformat() if pos.created_at else None,
                'last_updated': pos.last_updated.isoformat() if pos.last_updated else None,
                'unrealized_pnl': float(pos.unrealized_pnl) if pos.unrealized_pnl else None,
                'realized_pnl': float(pos.realized_pnl) if pos.realized_pnl else None,
                'is_spread': getattr(pos, 'is_spread', False)
            })
        
        # Summary statistics
        total_positions = len(positions)
        open_positions = len([p for p in positions if p.status == 'open'])
        closed_positions = len([p for p in positions if p.status == 'closed'])
        spread_positions = len([p for p in positions if getattr(p, 'is_spread', False) or getattr(p, 'spread_id', None)])
        positions_with_price = len([p for p in positions if p.current_price is not None])
        positions_without_price = len([p for p in positions if p.current_price is None and p.status == 'open'])
        
        return jsonify({
            'user_id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'summary': {
                'total_positions': total_positions,
                'open_positions': open_positions,
                'closed_positions': closed_positions,
                'spread_positions': spread_positions,
                'positions_with_price': positions_with_price,
                'positions_without_price': positions_without_price
            },
            'positions': position_data,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in debug positions endpoint: {e}", exc_info=True)
        return jsonify({
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500


# ============================================================
# TRADING HALT / KILL SWITCH ENDPOINTS
# ============================================================

@admin_bp.route('/admin/trading/halt', methods=['POST'])
@admin_required
def halt_trading(current_user):
    """
    Emergency halt all trading. Sets a global flag checked by TradeExecutor.
    
    POST /api/admin/trading/halt
    Body: {"reason": "Market volatility"} (optional)
    """
    try:
        data = request.get_json() or {}
        reason = data.get('reason', 'Emergency halt by administrator')

        halt_data = {
            'halted': True,
            'reason': reason,
            'halted_at': datetime.utcnow().isoformat(),
            'halted_by': current_user.email,
        }
        set_cache('global_trading_halt', halt_data, timeout=86400 * 7)  # 7 days

        logger.critical(f"TRADING HALTED by {current_user.email}: {reason}")

        try:
            from utils.audit_logger import log_audit
            log_audit(
                action_type='trading_halted',
                action_category='admin',
                description=f'Trading halted: {reason}',
                user_id=current_user.id,
                details=halt_data,
                success=True,
            )
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': 'Trading has been HALTED',
            'halt_status': halt_data,
        }), 200
    except Exception as e:
        logger.error(f"Failed to halt trading: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admin/trading/resume', methods=['POST'])
@admin_required
def resume_trading(current_user):
    """
    Resume trading after a halt.
    
    POST /api/admin/trading/resume
    """
    try:
        resume_data = {
            'halted': False,
            'reason': None,
            'resumed_at': datetime.utcnow().isoformat(),
            'resumed_by': current_user.email,
        }
        set_cache('global_trading_halt', resume_data, timeout=86400)

        logger.critical(f"TRADING RESUMED by {current_user.email}")

        try:
            from utils.audit_logger import log_audit
            log_audit(
                action_type='trading_resumed',
                action_category='admin',
                description='Trading resumed',
                user_id=current_user.id,
                details=resume_data,
                success=True,
            )
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': 'Trading has been RESUMED',
            'halt_status': resume_data,
        }), 200
    except Exception as e:
        logger.error(f"Failed to resume trading: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/admin/trading/status', methods=['GET'])
@admin_required
def trading_status(current_user):
    """
    Get current trading halt status.
    
    GET /api/admin/trading/status
    """
    try:
        halt_status = get_cache('global_trading_halt')
        if halt_status is None:
            halt_status = {'halted': False, 'reason': None}

        return jsonify({
            'trading_active': not halt_status.get('halted', False),
            'halt_status': halt_status,
        }), 200
    except Exception as e:
        return jsonify({
            'trading_active': True,  # Fail open
            'error': str(e),
        }), 200

