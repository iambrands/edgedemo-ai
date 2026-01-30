# Redis on Railway – Settings & Optimization

## Your current setup (from Railway)

- **Redis**: Online, with **redis-volume** (persistent).
- **Resources**: 32 vCPU, 32 GB memory (plan max) – more than enough for this app.
- **Note**: “Replicas are not available for attached volumes” – you have a single Redis instance; that’s normal with a volume.

## Recommended Redis configuration (Railway)

If your Redis service allows custom config (e.g. via Variables or a config file), set:

| Setting | Recommended | Why |
|--------|-------------|-----|
| **maxmemory** | e.g. `256mb` or `512mb` | Caps memory so Redis doesn’t grow unbounded. Adjust to your plan. |
| **maxmemory-policy** | `allkeys-lru` | Evicts least-recently-used keys when full; good for cache-only usage. |

If **maxmemory** is `0` (not set), Redis can use all RAM; setting a limit avoids OOM and keeps the app’s cache behavior predictable.

## How the app uses Redis

- **Cache manager** (`services/cache_manager.py`): positions, trade history, P/L summary, opportunities, market movers, options flow, analysis – TTLs 30s–360s.
- **Tradier connector**: quote and options-chain cache (30s TTL).
- **Cache warmer**: runs in background after startup and every 4 minutes; warms `opportunities:today`, `market_movers`, `options_flow_analyze:*` with 360s TTL.

## Checking Redis in the app

- **Optimization Dashboard** → Redis tab: hit rate, key patterns, and recommendations (e.g. set maxmemory if it’s 0).
- **Admin** → `/api/admin/analyze/redis`: same Redis analysis as JSON.

## Summary

- CPU/memory for Redis are fine at 32 vCPU / 32 GB.
- Set **maxmemory** and **maxmemory-policy** if the dashboard shows “Max memory: 0B”.
- Reducing log noise (TRADIER CONFIG, RECOMMENDATIONS, AI analyzed…) is done in code so Railway logs stay readable.
