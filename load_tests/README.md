# OptionsEdge Load Tests (Locust)

Determine capacity: how many concurrent users the platform can handle before performance degrades.

## Quick Start

```bash
cd load_tests
# Optional: use a dedicated venv to avoid dependency conflicts
# python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Web UI (interactive)
locust -f locustfile.py --host=https://web-production-8b7ae.up.railway.app

# Open http://localhost:8089, set users/spawn rate, click Start
```

Or use the run script (defaults: 10 users, spawn 2/sec, 5 min):

```bash
./run_load_test.sh
```

Override via env: `TARGET_HOST`, `USERS`, `SPAWN_RATE`, `RUN_TIME`.

## Test Scenarios

| Scenario        | Users | Spawn rate | Duration | Goal                          |
|----------------|-------|------------|----------|-------------------------------|
| Baseline       | 10    | 2/sec      | 5 min    | All &lt; 5s, 0% failure        |
| Normal load    | 25    | 5/sec      | 10 min   | p95 &lt; 8s, &lt; 1% failure   |
| Peak load      | 50    | 10/sec     | 10 min   | Watch degradation             |
| Stress test    | 100   | 10/sec     | 15 min   | Find breaking point           |
| Spike test     | 10→50 | instant    | 5 min    | Test recovery                 |

## User Classes

- **OptionsEdgeUser** (default): Login, dashboard, quotes, expirations, analyze, positions, history, watchlist, AI suggestions. Weighted tasks, 2–5s wait.
- **HeavyAnalysisUser**: Stress the `/api/options/analyze` endpoint. 1–3s wait.
- **QuoteOnlyUser**: Light load, quote checks only. 5–10s wait.

To run a specific class:

```bash
locust -f locustfile.py --host=... --user-classes OptionsEdgeUser QuoteOnlyUser
```

## Headless (CI / Automated)

```bash
locust -f locustfile.py \
  --host=https://web-production-8b7ae.up.railway.app \
  --users=50 \
  --spawn-rate=5 \
  --run-time=10m \
  --headless \
  --csv=results/test1
```

CSV files are written to `results/`.

## Distributed (Higher Load)

```bash
docker-compose up --scale locust-worker=4
# Open http://localhost:8089, set Host and start
```

## Auth (Optional)

Set test credentials so `OptionsEdgeUser` can hit protected endpoints:

```bash
export LOAD_TEST_EMAIL=your-test-user@example.com
export LOAD_TEST_PASSWORD=your-password
./run_load_test.sh
```

## Metrics to Watch

| Metric              | Good   | Warning | Critical |
|---------------------|--------|---------|----------|
| Median response time| &lt; 2s | 2–5s   | &gt; 5s  |
| p95 response time   | &lt; 5s | 5–10s  | &gt; 10s |
| Failure rate        | 0%     | &lt; 1% | &gt; 5%  |
| Requests/sec        | Stable | Declining | Crashing |

## Interpreting Results

- **Response time increases linearly with users** → Normal; capacity = where latency becomes unacceptable.
- **Response time increases exponentially** → Bottleneck (workers, DB, Redis, or Tradier rate limits).
- **Errors** → 502/503 = app/worker overload; 429 = Tradier rate limit; timeouts = worker starvation or slow queries.

## After Testing: Scaling

1. **Gunicorn**: Increase `--workers` (e.g. 8) if CPU-bound.
2. **Railway**: More replicas or larger instance.
3. **Redis**: Increase connection pool.
4. **Tradier**: Check rate limits; cache more aggressively.
5. **Database**: Connection pooling; optimize slow queries.
