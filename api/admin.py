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
from flask import current_app
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
@token_required
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
        
        # Check for common missing indices
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
            ('opportunities', 'user_id'),
            ('opportunities', 'symbol'),
            ('opportunities', 'score'),
            ('opportunities', 'created_at'),
        ]
        
        for table_name, column_name in common_patterns:
            if table_name not in table_names:
                continue
            
            indices = inspector.get_indexes(table_name)
            indexed_columns = set()
            for idx in indices:
                indexed_columns.update(idx['column_names'])
            
            if column_name not in indexed_columns:
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
@token_required
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
@token_required
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
@token_required
def apply_optimizations(current_user):
    """Apply database optimizations."""
    try:
        data = request.get_json() or {}
        preview_only = data.get('preview', True)
        
        results = {
            'preview': preview_only,
            'applied': [],
            'failed': [],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Define all optimizations
        optimizations = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status)",
            "CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)",
            "CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_positions_expiration_date ON positions(expiration_date)",
            "CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)",
            "CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_spreads_user_id ON spreads(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_spreads_symbol ON spreads(symbol)",
            "CREATE INDEX IF NOT EXISTS idx_spreads_status ON spreads(status)",
        ]
        
        if preview_only:
            results['would_apply'] = optimizations
        else:
            db = current_app.extensions['sqlalchemy']
            for sql in optimizations:
                try:
                    db.session.execute(text(sql))
                    results['applied'].append(sql)
                except Exception as e:
                    error_msg = str(e)
                    # Check if index already exists (not a real error)
                    if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                        results['applied'].append(sql)  # Still count as success
                    else:
                        results['failed'].append({
                            'sql': sql,
                            'error': error_msg[:100]
                        })
            
            if not results['failed'] or len(results['failed']) < len(optimizations):
                try:
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    results['error'] = str(e)
        
        return jsonify(results), 200
        
    except Exception as e:
        db = current_app.extensions['sqlalchemy']
        db.session.rollback()
        logger.error(f"Optimization apply failed: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

