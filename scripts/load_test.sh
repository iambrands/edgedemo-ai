#!/bin/bash

# IAB Options Bot - Load Testing
# Tests system performance under load

BASE_URL="${1:-https://web-production-8b7ae.up.railway.app}"

echo "🔥 IAB Options Bot - Load Testing"
echo "=================================="
echo "Base URL: $BASE_URL"
echo ""

# Check if ab is installed
if ! command -v ab &> /dev/null; then
    echo "❌ Apache Bench (ab) not found. Install with:"
    echo "   macOS: brew install httpd"
    echo "   Ubuntu: sudo apt-get install apache2-utils"
    exit 1
fi

# Test 1: Health endpoint (light load)
echo "Test 1: Health Endpoint (100 requests, 10 concurrent)"
echo "------------------------------------------------------"
ab -n 100 -c 10 "$BASE_URL/health" | grep -E "Requests per second|Time per request|Failed requests"
echo ""

# Test 2: Get expirations (medium load)
echo "Test 2: Get Expirations (50 requests, 5 concurrent)"
echo "----------------------------------------------------"
ab -n 50 -c 5 "$BASE_URL/api/options/expirations?symbol=AAPL" | grep -E "Requests per second|Time per request|Failed requests"
echo ""

# Test 3: Quote endpoint (sustained load)
echo "Test 3: Quote Endpoint (200 requests, 20 concurrent)"
echo "-----------------------------------------------------"
ab -n 200 -c 20 "$BASE_URL/api/options/quote?symbol=AAPL" | grep -E "Requests per second|Time per request|Failed requests"
echo ""

echo "✅ Load testing complete"
echo ""
echo "Performance Targets:"
echo "  - Health endpoint: >100 req/sec"
echo "  - Cached endpoints: >50 req/sec"
echo "  - Analysis endpoints: >10 req/sec"
echo "  - Failed requests: 0%"

