# Database Migration Guide

## Current Status

✅ Code deployed to Railway with rate limiting **temporarily disabled**
🔲 Database migration needs to be run
🔲 Rate limiting needs to be re-enabled

---

## Step 1: Run Migration on Railway

### Option A: Railway Shell (Recommended)

1. Go to Railway Dashboard: https://railway.app
2. Click `iab-options-bot` → `web` service
3. Click **"Shell"** tab (top navigation)
4. Wait for shell to connect
5. Run:
   ```bash
   flask db upgrade
   ```

**Expected output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade 3a2807af4be6 -> add_spread_and_rate_limit_models, Add Spread model and rate limiting
```

6. Verify migration succeeded:
   ```bash
   flask shell
   ```
   ```python
   from models.spread import Spread
   from models.user import User
   from sqlalchemy import inspect
   from app import db
   
   # Check spreads table
   inspector = inspect(db.engine)
   tables = inspector.get_table_names()
   print(f"Spreads table exists: {'spreads' in tables}")
   
   if 'spreads' in tables:
       columns = [c['name'] for c in inspector.get_columns('spreads')]
       print(f"Spreads columns: {len(columns)}")
   
   # Check users table has new fields
   columns = [c['name'] for c in inspector.get_columns('users')]
   print(f"Has daily_ai_analyses: {'daily_ai_analyses' in columns}")
   print(f"Has last_analysis_reset: {'last_analysis_reset' in columns}")
   
   exit()
   ```

**Expected verification output:**
```
Spreads table exists: True
Spreads columns: 21
Has daily_ai_analyses: True
Has last_analysis_reset: True
```

### Option B: Railway CLI

```bash
# Install Railway CLI (if not already installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Run migration
railway run flask db upgrade

# Verify
railway run flask shell
# Then run verification commands from Option A
```

---

## Step 2: Re-enable Rate Limiting Code

After migration succeeds, uncomment the following:

### File: `models/user.py`

**Find and uncomment these lines (around line 26-28):**

```python
# REMOVE THE # COMMENTS FROM THESE LINES:
daily_ai_analyses = db.Column(db.Integer, default=0)  # Counter for daily AI analyses
last_analysis_reset = db.Column(db.Date, default=datetime.utcnow)  # Date of last counter reset
```

**Find and uncomment these methods (around line 45-88):**

```python
# REMOVE THE # COMMENTS FROM THESE METHODS:
def can_analyze(self):
    """Check if user can make AI analysis request"""
    from datetime import date
    # Reset counter if new day
    today = date.today()
    if self.last_analysis_reset != today:
        self.daily_ai_analyses = 0
        self.last_analysis_reset = today
        db.session.commit()
    
    # Free tier limit: 100 analyses per day (generous for now)
    # You can adjust this later or add tier system
    return self.daily_ai_analyses < 100

def increment_analysis_count(self):
    """Increment AI analysis counter"""
    from datetime import date
    # Reset if needed
    today = date.today()
    if self.last_analysis_reset != today:
        self.daily_ai_analyses = 0
        self.last_analysis_reset = today
    
    self.daily_ai_analyses += 1
    db.session.commit()

def get_analysis_usage(self):
    """Get current usage stats"""
    from datetime import date, datetime, timedelta
    # Reset if needed
    today = date.today()
    if self.last_analysis_reset != today:
        self.daily_ai_analyses = 0
        self.last_analysis_reset = today
    
    # Calculate reset time (midnight EST)
    reset_at = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    return {
        'used': self.daily_ai_analyses,
        'limit': 100,
        'remaining': 100 - self.daily_ai_analyses,
        'reset_at': reset_at.isoformat()
    }
```

**Also remove the TODO comments:**
```python
# DELETE THIS LINE:
# TODO: Uncomment after running: flask db upgrade
```

### File: `api/options.py`

**Find and uncomment the rate limit check (around line 217-230):**

```python
# REMOVE THE # COMMENTS FROM THIS BLOCK:
# Check rate limit if user is authenticated (before cache check to avoid cache hits for rate-limited users)
if current_user:
    try:
        if not current_user.can_analyze():
            usage = current_user.get_analysis_usage()
            return jsonify({
                'error': 'Daily analysis limit reached',
                'message': f"You've used all {usage['limit']} AI analyses for today. Resets at midnight EST.",
                'usage': usage
            }), 429
    except AttributeError:
        # User model doesn't have rate limiting yet - skip check
        pass
```

**Find and uncomment the increment call (around line 321-328):**

```python
# REMOVE THE # COMMENTS FROM THIS BLOCK:
# Increment rate limit counter if user is authenticated
if current_user:
    try:
        current_user.increment_analysis_count()
    except AttributeError:
        # User model doesn't have rate limiting yet - skip
        pass
```

**Also remove the TODO comments:**
```python
# DELETE THIS LINE:
# TODO: Uncomment after running: flask db upgrade
```

---

## Step 3: Commit and Deploy

After uncommenting:

```bash
git add -A
git commit -m "feat: Re-enable rate limiting after database migration"
git push origin main
```

Railway will auto-deploy with rate limiting enabled.

---

## Step 4: Test Rate Limiting

After deployment:

1. Make multiple analysis requests (authenticated)
2. After 100 analyses, should receive:

```json
{
  "error": "Daily analysis limit reached",
  "message": "You've used all 100 AI analyses for today. Resets at midnight EST.",
  "usage": {
    "used": 100,
    "limit": 100,
    "remaining": 0,
    "reset_at": "2026-01-21T00:00:00"
  }
}
```

3. Check that cache still works (cached requests don't count against limit)

---

## Troubleshooting

### Migration Error: "relation already exists"

If spreads table already exists:

```bash
flask shell
```
```python
from app import db
db.session.execute('DROP TABLE IF EXISTS spreads CASCADE')
db.session.commit()
exit()
```

Then run `flask db upgrade` again.

### Migration Error: "column already exists"

If rate limiting columns already exist:

```bash
flask shell
```
```python
from app import db
db.session.execute('ALTER TABLE users DROP COLUMN IF EXISTS daily_ai_analyses CASCADE')
db.session.execute('ALTER TABLE users DROP COLUMN IF EXISTS last_analysis_reset CASCADE')
db.session.commit()
exit()
```

Then run `flask db upgrade` again.

### Migration Error: "No such revision"

Check the migration file exists:
```bash
ls -la migrations/versions/add_spread_and_rate_limit_models.py
```

If it doesn't exist, you may need to check the down_revision in the migration file matches your latest migration.

### Rate Limiting Not Working

Check that:
1. ✅ Migration ran successfully
2. ✅ Code was uncommented
3. ✅ Code was committed and pushed
4. ✅ Railway redeployed successfully
5. ✅ Check logs for errors
6. ✅ User is authenticated (rate limiting only applies to logged-in users)

### Quick Verification Script

Run this in Railway shell after migration:

```python
flask shell
```

```python
from models.user import User
from models.spread import Spread
from sqlalchemy import inspect
from app import db

# Check spreads table
inspector = inspect(db.engine)
tables = inspector.get_table_names()
print(f"✅ Spreads table exists: {'spreads' in tables}")

# Check users columns
user_columns = [c['name'] for c in inspector.get_columns('users')]
print(f"✅ daily_ai_analyses column: {'daily_ai_analyses' in user_columns}")
print(f"✅ last_analysis_reset column: {'last_analysis_reset' in user_columns}")

# Test User methods (should work after uncommenting)
try:
    user = User.query.first()
    if user:
        can_analyze = user.can_analyze()
        print(f"✅ can_analyze() method works: {can_analyze}")
        usage = user.get_analysis_usage()
        print(f"✅ get_analysis_usage() works: {usage}")
except AttributeError as e:
    print(f"⚠️  Rate limiting methods not uncommented yet: {e}")

exit()
```

---

## Summary Checklist

- [ ] Migration file exists: `migrations/versions/add_spread_and_rate_limit_models.py`
- [ ] Run `flask db upgrade` on Railway
- [ ] Verify tables/columns created (use verification script above)
- [ ] Uncomment rate limiting in `models/user.py` (fields + methods)
- [ ] Uncomment rate limiting in `api/options.py` (check + increment)
- [ ] Remove TODO comments
- [ ] Commit and push
- [ ] Wait for Railway deployment
- [ ] Test rate limiting works (make 101 requests)
- [ ] Monitor Anthropic API usage

After all steps complete, rate limiting will be active!

---

## Quick Reference

**Migration command:**
```bash
flask db upgrade
```

**Verification:**
```bash
flask shell
# Then run verification Python code from Step 1
```

**Files to edit:**
- `models/user.py` - Uncomment fields and methods
- `api/options.py` - Uncomment rate limit checks

**After editing:**
```bash
git add -A
git commit -m "feat: Re-enable rate limiting after database migration"
git push
```

