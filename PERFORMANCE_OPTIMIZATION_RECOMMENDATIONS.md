# Performance Optimization Recommendations

This document provides specific optimization recommendations based on performance profiling results.

## Quick Start

```bash
# 1. Run performance assessment
python scripts/performance_assessment.py

# 2. Preview quick fixes
python scripts/quick_performance_fixes.py

# 3. Apply quick fixes
python scripts/quick_performance_fixes.py --apply

# 4. Re-run assessment to verify improvements
python scripts/performance_assessment.py
```

---

## Common Optimizations

### 1. Database Query Optimization

#### Add Missing Indices

**Problem:** Queries without proper indices scan entire tables.

**Solution:** Add indices for frequently queried columns:

```sql
-- Opportunities
CREATE INDEX idx_opportunities_symbol ON opportunities(symbol);
CREATE INDEX idx_opportunities_created_at ON opportunities(created_at);
CREATE INDEX idx_opportunities_score ON opportunities(score DESC);

-- Alerts
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);

-- Positions
CREATE INDEX idx_positions_user_id_status ON positions(user_id, status);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_expiration_date ON positions(expiration_date);

-- Trades
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_executed_at ON trades(executed_at DESC);
```

**Implementation:**
```bash
python scripts/quick_performance_fixes.py --apply
```

#### Use SELECT Specific Columns

**Problem:** `SELECT *` retrieves unnecessary data.

**Solution:** Select only needed columns:

```python
# Bad
positions = Position.query.filter_by(user_id=user_id).all()

# Good
positions = db.session.query(
    Position.id,
    Position.symbol,
    Position.entry_price,
    Position.current_price,
    Position.status
).filter_by(user_id=user_id).all()
```

#### Add Query Limits

**Problem:** Queries return too many results.

**Solution:** Add LIMIT clauses:

```python
# Limit opportunities to 50
opportunities = Opportunity.query.filter_by(
    user_id=user_id
).order_by(
    Opportunity.score.desc()
).limit(50).all()
```

#### Implement Query Result Caching

**Problem:** Same queries run multiple times.

**Solution:** Cache query results:

```python
from utils.redis_cache import get_redis_cache

cache = get_redis_cache()

# Cache opportunities for 5 minutes
cache_key = f"opportunities:{user_id}"
cached = cache.get(cache_key)

if cached:
    return cached

# Fetch from database
opportunities = Opportunity.query.filter_by(user_id=user_id).limit(50).all()

# Cache result
cache.set(cache_key, opportunities, ttl=300)
return opportunities
```

---

### 2. API Endpoint Optimization

#### Implement Pagination

**Problem:** Endpoints return large datasets in single request.

**Solution:** Add pagination support:

```python
@opportunities_bp.route('/today', methods=['GET'])
def get_today_opportunities():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    per_page = min(per_page, 100)  # Max 100 per page
    
    opportunities = Opportunity.query.filter_by(
        user_id=current_user.id
    ).order_by(
        Opportunity.score.desc()
    ).paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return jsonify({
        'opportunities': [o.to_dict() for o in opportunities.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': opportunities.total,
            'pages': opportunities.pages
        }
    })
```

#### Add Response Compression

**Problem:** Large JSON responses slow down requests.

**Solution:** Enable gzip compression:

```python
from flask import Flask
from flask_compress import Compress

app = Flask(__name__)
Compress(app)  # Automatically compresses responses
```

#### Cache Frequently Accessed Data

**Problem:** Same data fetched repeatedly.

**Solution:** Use Redis caching:

```python
from utils.redis_cache import get_redis_cache
from functools import wraps

cache = get_redis_cache()

def cached_api_response(key_prefix, ttl=300):
    """Decorator to cache API responses."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{hash(str(kwargs))}"
            
            # Check cache
            cached = cache.get(cache_key)
            if cached:
                return jsonify(cached)
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            if isinstance(result, dict):
                cache.set(cache_key, result, ttl=ttl)
            
            return jsonify(result)
        return wrapper
    return decorator

# Usage
@opportunities_bp.route('/today', methods=['GET'])
@cached_api_response('opportunities:today', ttl=300)
def get_today_opportunities():
    # ... existing code ...
```

#### Use Background Workers for Slow Operations

**Problem:** Slow operations block API responses.

**Solution:** Move to background workers:

```python
from celery import Celery

celery = Celery(app.name)

@celery.task
def generate_opportunities_report(user_id):
    """Generate opportunities report in background."""
    # Heavy computation here
    pass

@opportunities_bp.route('/report', methods=['POST'])
def generate_report():
    # Start background task
    task = generate_opportunities_report.delay(current_user.id)
    
    return jsonify({
        'task_id': task.id,
        'status': 'processing'
    })
```

---

### 3. Frontend Optimization

#### Lazy Load Opportunities Tabs

**Problem:** All 3 Opportunities tabs load simultaneously.

**Solution:** Load tabs on demand:

```typescript
// Opportunities.tsx
const [activeTab, setActiveTab] = useState('today');
const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['today']));

const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  
  if (!loadedTabs.has(tab)) {
    // Load tab data
    loadTabData(tab);
    setLoadedTabs(prev => new Set([...prev, tab]));
  }
};
```

#### Implement Virtual Scrolling

**Problem:** Rendering large lists slows down page.

**Solution:** Use virtual scrolling:

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window';

const OpportunityList = ({ opportunities }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <OpportunityCard opportunity={opportunities[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={opportunities.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

#### Add Loading Skeletons

**Problem:** Blank screens while loading.

**Solution:** Show loading skeletons:

```typescript
const OpportunityCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// Use while loading
{loading ? (
  <OpportunityCardSkeleton />
) : (
  <OpportunityCard opportunity={opportunity} />
)}
```

#### Cache API Responses in Frontend

**Problem:** Repeated API calls for same data.

**Solution:** Use React Query or SWR:

```bash
npm install @tanstack/react-query
```

```typescript
import { useQuery } from '@tanstack/react-query';

const useOpportunities = () => {
  return useQuery({
    queryKey: ['opportunities', 'today'],
    queryFn: () => fetch('/api/opportunities/today').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};
```

#### Use React.memo for Expensive Components

**Problem:** Components re-render unnecessarily.

**Solution:** Memoize expensive components:

```typescript
const OpportunityCard = React.memo(({ opportunity }) => {
  // Component code
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.opportunity.id === nextProps.opportunity.id &&
         prevProps.opportunity.score === nextProps.opportunity.score;
});
```

---

### 4. Opportunities Page Specific Optimizations

#### Load Tabs on Demand

**Current:** All 3 tabs load when page opens.

**Recommendation:** Load only active tab, lazy load others.

**Implementation:**
```typescript
// Load tab data only when tab is clicked
const [activeTab, setActiveTab] = useState('today');
const [tabData, setTabData] = useState({});

const loadTab = async (tabName: string) => {
  if (tabData[tabName]) return; // Already loaded
  
  const response = await fetch(`/api/opportunities/${tabName}`);
  const data = await response.json();
  setTabData(prev => ({ ...prev, [tabName]: data }));
};
```

#### Cache Tab Data

**Problem:** Tab data reloads on every switch.

**Solution:** Cache tab data in component state:

```typescript
// Cache for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
const [cache, setCache] = useState({});

const getCachedData = (tabName: string) => {
  const cached = cache[tabName];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};
```

#### Limit Initial Results

**Problem:** Loading all opportunities at once.

**Solution:** Load first 20, add "Load More" button:

```python
# Backend
@opportunities_bp.route('/today', methods=['GET'])
def get_today_opportunities():
    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    opportunities = Opportunity.query.filter_by(
        user_id=current_user.id
    ).order_by(
        Opportunity.score.desc()
    ).limit(limit).offset(offset).all()
    
    return jsonify({
        'opportunities': [o.to_dict() for o in opportunities],
        'has_more': len(opportunities) == limit
    })
```

#### Precompute Opportunities in Background

**Problem:** Real-time calculation is slow.

**Solution:** Precompute in background job:

```python
# In app.py
from apscheduler.triggers.interval import IntervalTrigger

def precompute_opportunities():
    """Precompute opportunities for all users every 5 minutes."""
    with app.app_context():
        users = User.query.all()
        for user in users:
            # Compute opportunities
            compute_user_opportunities(user.id)
            # Cache results
            cache.set(f"opportunities:{user.id}", results, ttl=300)

scheduler.add_job(
    precompute_opportunities,
    trigger=IntervalTrigger(minutes=5),
    id='precompute_opportunities'
)
```

---

### 5. Automation Engine Optimization

#### Run Rules in Background Workers

**Problem:** Rule execution blocks API responses.

**Solution:** Use Celery or background threads:

```python
from celery import Celery

celery = Celery(app.name)

@celery.task
def execute_automation_rule(rule_id):
    """Execute automation rule in background."""
    rule = AutomationRule.query.get(rule_id)
    # Execute rule
    execute_rule(rule)

# In API
@automation_bp.route('/execute/<int:rule_id>', methods=['POST'])
def execute_rule(rule_id):
    task = execute_automation_rule.delay(rule_id)
    return jsonify({'task_id': task.id})
```

#### Add Execution Scheduling

**Problem:** All rules execute simultaneously.

**Solution:** Schedule rule executions:

```python
# Use APScheduler to stagger executions
scheduler.add_job(
    execute_pending_rules,
    trigger=IntervalTrigger(minutes=1),
    id='execute_rules'
)

def execute_pending_rules():
    """Execute one pending rule at a time."""
    rule = AutomationRule.query.filter_by(
        status='active',
        next_execution_time <= datetime.utcnow()
    ).order_by('priority').first()
    
    if rule:
        execute_rule(rule)
```

#### Cache Rule Results

**Problem:** Same rule calculations repeated.

**Solution:** Cache rule evaluation results:

```python
def evaluate_rule(rule):
    cache_key = f"rule:{rule.id}:eval"
    cached = cache.get(cache_key)
    
    if cached:
        return cached
    
    result = perform_rule_evaluation(rule)
    cache.set(cache_key, result, ttl=60)  # Cache for 1 minute
    return result
```

#### Add Execution Timeout Limits

**Problem:** Rules can run indefinitely.

**Solution:** Set timeout limits:

```python
import signal

def execute_rule_with_timeout(rule, timeout=30):
    """Execute rule with timeout."""
    def handler(signum, frame):
        raise TimeoutError("Rule execution timed out")
    
    signal.signal(signal.SIGALRM, handler)
    signal.alarm(timeout)
    
    try:
        result = execute_rule(rule)
        signal.alarm(0)
        return result
    except TimeoutError:
        rule.status = 'error'
        rule.error_message = 'Execution timeout'
        db.session.commit()
        raise
```

---

### 6. Alerts System Optimization

#### Index Alert Fields

**Problem:** Queries scan entire alerts table.

**Solution:** Add indices (already in quick fixes):

```sql
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_user_status ON alerts(user_id, status);
```

#### Implement Alert Pagination

**Problem:** Loading all alerts at once.

**Solution:** Add pagination:

```python
@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    alerts = Alert.query.filter_by(
        user_id=current_user.id
    ).order_by(
        Alert.created_at.desc()
    ).paginate(page=page, per_page=per_page)
    
    return jsonify({
        'alerts': [a.to_dict() for a in alerts.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': alerts.total,
            'pages': alerts.pages
        }
    })
```

#### Cache Active Alerts

**Problem:** Active alerts queried frequently.

**Solution:** Cache active alerts:

```python
def get_active_alerts(user_id):
    cache_key = f"alerts:active:{user_id}"
    cached = cache.get(cache_key)
    
    if cached:
        return cached
    
    alerts = Alert.query.filter_by(
        user_id=user_id,
        status='active'
    ).all()
    
    cache.set(cache_key, alerts, ttl=60)  # Cache for 1 minute
    return alerts
```

#### Use WebSockets for Real-Time Updates

**Problem:** Polling for new alerts.

**Solution:** Use WebSockets:

```python
from flask_socketio import SocketIO, emit

socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    emit('connected', {'message': 'Connected to alerts'})

@socketio.on('subscribe_alerts')
def handle_subscribe(data):
    user_id = data['user_id']
    join_room(f"user_{user_id}")

# When alert is created
def create_alert(user_id, message):
    alert = Alert(user_id=user_id, message=message)
    db.session.add(alert)
    db.session.commit()
    
    # Emit to user's room
    socketio.emit('new_alert', alert.to_dict(), room=f"user_{user_id}")
```

#### Archive Old Alerts

**Problem:** Alerts table grows indefinitely.

**Solution:** Archive old alerts:

```python
def archive_old_alerts(days=30):
    """Archive alerts older than N days."""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    old_alerts = Alert.query.filter(
        Alert.created_at < cutoff_date,
        Alert.status.in_(['read', 'dismissed'])
    ).all()
    
    # Move to archive table or delete
    for alert in old_alerts:
        # Archive logic here
        db.session.delete(alert)
    
    db.session.commit()
```

---

## Performance Targets

### Response Time Targets

- **Fast:** < 1 second
- **Acceptable:** 1-2 seconds
- **Slow:** 2-5 seconds (needs optimization)
- **Critical:** > 5 seconds (urgent optimization)

### Specific Targets

- **Dashboard Stats:** < 1s
- **Opportunities Tabs:** < 2s each
- **Alert List:** < 1s for first 20 alerts
- **Position List:** < 1s for first 50 positions
- **Options Chain Analysis:** < 5s (acceptable due to complexity)

---

## Monitoring

### Run Regular Assessments

```bash
# Daily performance check
python scripts/performance_assessment.py --email YOUR_EMAIL --password YOUR_PASS
```

### Set Up Alerts

Monitor slow endpoints in production:

```python
# In API endpoints
if elapsed > 2.0:
    logger.warning(f"Slow endpoint: {endpoint} took {elapsed:.2f}s")
    # Send alert to monitoring system
```

---

## Implementation Priority

### Phase 1: Quick Wins (High Impact, Low Effort)

1. ✅ Add database indices (`quick_performance_fixes.py`)
2. ✅ Add query limits
3. ✅ Implement response caching

### Phase 2: Frontend Optimization (High Impact, Medium Effort)

1. Lazy load Opportunities tabs
2. Add loading skeletons
3. Implement pagination

### Phase 3: Background Processing (Medium Impact, High Effort)

1. Precompute opportunities
2. Move slow operations to background workers
3. Implement WebSockets for real-time updates

---

## Success Metrics

After implementing optimizations:

- ✅ All Opportunities tabs load in < 2s
- ✅ Dashboard loads in < 1s
- ✅ Alert list loads in < 1s
- ✅ Average endpoint response time < 2s
- ✅ No critical (>5s) endpoints
- ✅ User experience improved

---

## Resources

- Performance Assessment: `scripts/performance_assessment.py`
- Quick Fixes: `scripts/quick_performance_fixes.py`
- Database Profiler: `scripts/profile_database.py`

---

## Questions?

For specific optimization questions, refer to:
- Database optimization: Check slow queries in logs
- API optimization: Review endpoint response times
- Frontend optimization: Use browser DevTools Performance tab

