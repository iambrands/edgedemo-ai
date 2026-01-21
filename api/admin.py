"""Admin endpoints for manual cleanup and maintenance"""

from flask import Blueprint, jsonify, request, current_app
from services.cleanup_service import (
    cleanup_expired_positions, 
    get_expiring_today, 
    get_stale_positions,
    cleanup_old_closed_positions
)
from utils.redis_cache import get_redis_cache
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

# Diagnostic endpoint - no auth, no database (test if blueprint is loaded)
@admin_bp.route('/admin/ping', methods=['GET'])
def ping():
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

# TODO: Add authentication middleware for production
# For now, these are unprotected - add auth before production launch

# Debug route to check if admin blueprint is loaded (no auth required for debugging)
@admin_bp.route('/admin/debug', methods=['GET'])
def admin_debug():
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


@admin_bp.route('/admin/cleanup/expired', methods=['POST'])
def manual_cleanup_expired():
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
def manual_cleanup_cache():
    """Manually clear cache"""
    try:
        cache = get_redis_cache()
        cache.clear_cache()
        return jsonify({
            'status': 'success',
            'message': 'All cache cleared',
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
def check_expiring_positions():
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
def check_stale_positions():
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
def cache_stats():
    """Get detailed cache statistics"""
    try:
        cache = get_redis_cache()
        stats = cache.get_stats()
        
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
            cache = get_redis_cache()
            if not cache.redis_client:
                results['error'] = 'Redis not configured'
                return jsonify(results), 200
            
            redis_client = cache.redis_client
            redis_client.ping()
            results['connected'] = True
            
            # Get Redis info
            info = redis_client.info()
            results['info'] = {
                'version': info.get('redis_version', 'Unknown'),
                'uptime_days': info.get('uptime_in_days', 0),
                'connected_clients': info.get('connected_clients', 0),
                'used_memory': info.get('used_memory_human', 'Unknown'),
                'max_memory': info.get('maxmemory_human', 'Not set')
            }
            
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
                        'message': f'Cache hit rate is {hit_rate:.1f}% - consider reviewing cache strategy'
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

