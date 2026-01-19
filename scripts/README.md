# IAB Options Bot - Testing Scripts

## Overview
Comprehensive testing suite for IAB Options Bot including unit tests, integration tests, load tests, and production monitoring.

## Scripts

### 1. Production Test Suite (`test_production.sh`)
Comprehensive endpoint testing with detailed reporting.

**Usage:**
```bash
# Test production
./scripts/test_production.sh

# Test staging
./scripts/test_production.sh https://staging.example.com

# Test with admin API key
ADMIN_API_KEY=your-key ./scripts/test_production.sh
```

**Output:**
- Console output with color-coded results
- JSON files for each endpoint response
- HTML summary report
- Text summary file

### 2. Advanced API Tests (`test_api.py`)
Python-based testing with assertions and validation.

**Usage:**
```bash
# Install dependencies
pip install requests

# Run tests
python scripts/test_api.py

# Test with environment variables
TEST_BASE_URL=https://staging.example.com python scripts/test_api.py
```

**Features:**
- Response validation
- Cache performance testing
- Detailed JSON reports
- Average response time tracking

### 3. Load Testing (`load_test.sh`)
Apache Bench-based load testing.

**Requirements:**
```bash
# macOS
brew install httpd

# Ubuntu
sudo apt-get install apache2-utils
```

**Usage:**
```bash
./scripts/load_test.sh
./scripts/load_test.sh https://staging.example.com
```

**Tests:**
- Health endpoint: 100 requests, 10 concurrent
- Get expirations: 50 requests, 5 concurrent
- Quote endpoint: 200 requests, 20 concurrent

### 4. Production Monitor (`monitor_production.sh`)
Continuous health monitoring.

**Usage:**
```bash
# Monitor production
./scripts/monitor_production.sh

# Monitor with custom interval (30s)
CHECK_INTERVAL=30 ./scripts/monitor_production.sh

# Monitor staging
./scripts/monitor_production.sh https://staging.example.com
```

**Features:**
- Real-time health checks
- Component status (database, cache, API)
- Timestamp logging
- Color-coded alerts

## Test Results

Results are saved to timestamped directories:
```
test_results_20260119_150000/
├── summary.txt           # Text summary
├── report.html          # HTML report (open in browser)
├── Overall_Health.json  # Individual endpoint responses
├── Cache_Health.json
└── ...
```

## Performance Targets

- **Health endpoint**: >100 req/sec
- **Cached endpoints**: >50 req/sec
- **Analysis endpoints**: >10 req/sec
- **Failed requests**: 0%
- **Response time**: <3s for most endpoints, <500ms for cached endpoints

## Continuous Integration

These scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Production Tests
  run: ./scripts/test_production.sh
  env:
    ADMIN_API_KEY: ${{ secrets.ADMIN_API_KEY }}
```

## Troubleshooting

### Tests failing
1. Check network connectivity
2. Verify BASE_URL is correct
3. Check Railway deployment status
4. Review error messages in test results

### Slow responses
1. Check Redis cache status
2. Verify Tradier API is responding
3. Check database connection pool
4. Review Railway metrics

### Cache not working
1. Verify REDIS_URL is set
2. Check Redis connection in health endpoint
3. Review cache TTL settings
4. Check for cache key conflicts

