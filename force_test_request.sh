#!/bin/bash

echo "============================================================"
echo "Forcing test request to generate logs"
echo "============================================================"
echo ""

RAILWAY_URL="https://web-production-8b7ae.up.railway.app"

# Test 1: Option Chain Analyzer
echo "Test 1: Calling option chain analyzer..."
echo "URL: ${RAILWAY_URL}/api/options/analyze"
echo ""

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${RAILWAY_URL}/api/options/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "expiration": "2026-01-23",
    "preference": "balanced"
  }')

# Extract HTTP code
http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
response_body=$(echo "$response" | sed '/HTTP_CODE:/d')

echo "HTTP Status Code: $http_code"
echo ""
echo "Response:"
if command -v jq &> /dev/null; then
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
else
    echo "$response_body"
fi

echo ""
echo "============================================================"
echo "Request sent. Check Railway logs NOW for:"
echo "  - [CHAIN ANALYZER] entries"
echo "  - [RECOMMENDATIONS] entries"
echo "  - Performance timing logs"
echo "============================================================"
echo ""
echo "Railway Logs URL:"
echo "https://railway.app → iab-options-bot → Logs"
echo ""
echo "Wait 5-10 seconds for logs to appear, then search for:"
echo "  'CHAIN ANALYZER'"
echo "  'RECOMMENDATIONS'"
echo "  'performance'"
echo ""

