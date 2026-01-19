# 🚀 Redis Setup Guide for Railway

## Quick Setup Steps

### 1. Add Redis Service in Railway

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add Redis"**
3. Railway will automatically:
   - Create a Redis instance
   - Add `REDIS_URL` environment variable to your web service
   - Connect the services

### 2. Verify Environment Variable

After adding Redis, check that `REDIS_URL` is set:

```bash
# In Railway dashboard → Your Web Service → Variables
# You should see:
REDIS_URL=redis://default:password@hostname:port
```

### 3. Deploy

The code is already set up! Just push to GitHub and Railway will:
1. Install `redis>=5.0.0` from `requirements.txt`
2. Connect to Redis automatically
3. Fall back to in-memory cache if Redis is unavailable

---

## What's Cached?

### **Quotes** (5 second TTL)
- `GET /api/options/quote/<symbol>`
- Stock quotes from Tradier API
- **Expected improvement:** 98% faster (1-3s → 0.01-0.05s)

### **Options Chains** (30 second TTL)
- `GET /api/options/chain` (via TradierConnector)
- Options chain data for symbol + expiration
- **Expected improvement:** 99% faster (2-5s → 0.01-0.05s)

### **Opportunities** (60 second TTL)
- `GET /api/opportunities/today`
- `GET /api/opportunities/market-movers`
- Trading opportunities and market movers
- **Expected improvement:** 99% faster (2-5s → 0.01-0.05s)

### **Trade History** (30 second TTL)
- `GET /api/trades/history`
- Already cached, now using Redis instead of in-memory

---

## Cache Keys Format

- Quotes: `quote:{SYMBOL}` (e.g., `quote:AAPL`)
- Options Chains: `options_chain:{SYMBOL}:{EXPIRATION}` (e.g., `options_chain:AAPL:2026-01-23`)
- Opportunities: `cache:{hash}` (auto-generated from request path + params)
- Market Movers: `cache:{hash}` (auto-generated)

---

## Monitoring

### Check Cache Stats

The Redis cache utility provides stats:

```python
from utils.redis_cache import get_redis_cache

cache = get_redis_cache()
stats = cache.get_stats()
# Returns:
# {
#     'using_redis': True,
#     'in_memory_entries': 0,
#     'redis_memory_used': '2.5M',
#     'redis_keys': 150
# }
```

### Railway Logs

Watch for these log messages:

- ✅ `Redis cache connected` - Redis is working
- ⚠️ `Redis connection failed, using in-memory cache` - Fallback active
- ✅ `Cache HIT: /api/options/quote/AAPL` - Cache working
- 🔍 `Cache MISS: /api/options/quote/AAPL` - Cache miss (normal)

---

## Troubleshooting

### Redis Not Connecting?

1. **Check REDIS_URL is set:**
   ```bash
   # In Railway dashboard
   Variables → REDIS_URL should be present
   ```

2. **Check Redis service is running:**
   - Railway dashboard → Redis service → Should show "Active"

3. **Check logs:**
   ```bash
   railway logs
   # Look for: "Redis connection failed" or "Redis cache connected"
   ```

### Fallback to In-Memory

If Redis fails, the app automatically falls back to in-memory cache:
- ✅ App continues working
- ⚠️ Cache is per-worker (not shared)
- ⚠️ Cache lost on restart

This is fine for development, but Redis is recommended for production.

---

## Performance Expectations

### Before Redis:
- Quote requests: 1-3 seconds
- Options chain: 2-5 seconds
- Opportunities: 2-5 seconds
- Dashboard load: 3-8 seconds

### After Redis (with cache hits):
- Quote requests: 0.01-0.05 seconds (**98% faster**)
- Options chain: 0.01-0.05 seconds (**99% faster**)
- Opportunities: 0.01-0.05 seconds (**99% faster**)
- Dashboard load: 1-2 seconds (**70% faster**)

### Cache Hit Rates (Expected):
- Quotes: 80-90% (frequently accessed, 5s TTL)
- Options Chains: 60-70% (less frequent, 30s TTL)
- Opportunities: 70-80% (moderate frequency, 60s TTL)

---

## Cost

**Railway Redis:**
- Hobby Plan: $5/month (256MB) - Sufficient for most apps
- Pro Plan: $20/month (1GB) - For high traffic

**Alternative: Upstash Redis (Free Tier)**
- 10,000 commands/day free
- 256MB storage
- Perfect for low-medium traffic
- Set `REDIS_URL` to Upstash connection string

---

## Next Steps

1. ✅ Add Redis service in Railway
2. ✅ Verify `REDIS_URL` is set
3. ✅ Deploy (automatic via GitHub)
4. ✅ Monitor logs for "Redis cache connected"
5. ✅ Test endpoints - should see "Cache HIT" in logs

**That's it!** Redis caching is now active. 🎉

