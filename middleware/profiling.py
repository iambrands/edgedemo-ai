"""
Performance profiling middleware for OptionsEdge
Tracks request timing, slow operations, and API costs
"""

import time
import logging
from functools import wraps
from flask import request, g
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# In-memory metrics storage
performance_metrics = defaultdict(list)
slow_requests = []
api_call_metrics = defaultdict(list)


def before_request_profiling():
    """Start timing request - call in @app.before_request"""
    g.start_time = time.time()
    
    # Store user ID for logging
    try:
        from flask_jwt_extended import get_jwt_identity
        g.user_id = get_jwt_identity()
    except:
        g.user_id = None


def after_request_profiling(response):
    """
    Log request timing and slow requests
    Call in @app.after_request
    """
    if not hasattr(g, 'start_time'):
        return response
    
    duration = (time.time() - g.start_time) * 1000  # Convert to ms
    
    # Add timing header
    response.headers['X-Response-Time'] = f"{duration:.2f}ms"
    
    # Track metric
    endpoint = f"{request.method} {request.path}"
    performance_metrics[endpoint].append({
        'duration': duration,
        'timestamp': datetime.utcnow().isoformat(),
        'status_code': response.status_code
    })
    
    # Keep only last 1000 entries per endpoint
    if len(performance_metrics[endpoint]) > 1000:
        performance_metrics[endpoint] = performance_metrics[endpoint][-1000:]
    
    # Log slow requests (>1 second)
    if duration > 1000:
        slow_req = {
            'endpoint': endpoint,
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': g.user_id
        }
        
        slow_requests.append(slow_req)
        
        logger.warning(
            f"SLOW REQUEST: {endpoint} took {duration:.2f}ms | User: {g.user_id}"
        )
        
        # Keep only last 100 slow requests
        if len(slow_requests) > 100:
            slow_requests.pop(0)
    
    return response


class PerformanceMonitor:
    """
    Context manager to track specific operations
    
    Usage:
        with PerformanceMonitor('Claude.analyze'):
            result = claude_client.analyze(prompt)
    """
    
    def __init__(self, operation_name: str, threshold_ms: float = 500):
        self.operation_name = operation_name
        self.threshold_ms = threshold_ms
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (time.time() - self.start_time) * 1000
        
        # Log slow operations
        if duration > self.threshold_ms:
            logger.warning(
                f"SLOW OPERATION: {self.operation_name} took {duration:.2f}ms"
            )
        
        # Track metric
        performance_metrics[self.operation_name].append({
            'duration': duration,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Keep only last 1000 entries
        if len(performance_metrics[self.operation_name]) > 1000:
            performance_metrics[self.operation_name] = performance_metrics[self.operation_name][-1000:]


def track_api_call(service: str, duration_ms: float, cost: float = 0, metadata: dict = None):
    """
    Track external API call
    
    Args:
        service: 'claude', 'tradier', etc.
        duration_ms: Duration in milliseconds
        cost: Cost in dollars
        metadata: Additional info (model, tokens, etc.)
    """
    api_call_metrics[service].append({
        'duration': duration_ms,
        'cost': cost,
        'timestamp': datetime.utcnow().isoformat(),
        'metadata': metadata or {}
    })
    
    # Keep last 1000 calls
    if len(api_call_metrics[service]) > 1000:
        api_call_metrics[service] = api_call_metrics[service][-1000:]
    
    # Log expensive calls
    if cost > 0.01:  # More than 1 cent
        logger.warning(f"EXPENSIVE API CALL: {service} cost ${cost:.4f}")


def get_performance_report(hours: int = 24):
    """Generate performance report"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    report = {}
    
    for operation, metrics in performance_metrics.items():
        # Filter to recent
        recent = [m for m in metrics if datetime.fromisoformat(m['timestamp']) > cutoff]
        
        if recent:
            durations = [m['duration'] for m in recent]
            sorted_durations = sorted(durations)
            
            report[operation] = {
                'count': len(recent),
                'avg': round(sum(durations) / len(durations), 2),
                'min': round(min(durations), 2),
                'max': round(max(durations), 2),
                'p95': round(sorted_durations[int(len(sorted_durations) * 0.95)], 2) if len(sorted_durations) > 20 else round(max(durations), 2)
            }
    
    return report


def get_api_call_report(hours: int = 24):
    """Get API call statistics with costs"""
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    report = {}
    
    for service, calls in api_call_metrics.items():
        recent = [c for c in calls if datetime.fromisoformat(c['timestamp']) > cutoff]
        
        if recent:
            durations = [c['duration'] for c in recent]
            costs = [c['cost'] for c in recent]
            
            report[service] = {
                'total_calls': len(recent),
                'total_cost': round(sum(costs), 4),
                'avg_duration': round(sum(durations) / len(durations), 2),
                'avg_cost_per_call': round(sum(costs) / len(costs), 6) if costs else 0,
                'calls_per_hour': round(len(recent) / hours, 2)
            }
    
    return report


def get_slow_requests(limit: int = 50):
    """Get recent slow requests"""
    return sorted(slow_requests, key=lambda x: x['duration'], reverse=True)[:limit]
