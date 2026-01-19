#!/bin/bash

# IAB Options Bot - Production Test Suite
# Tests all critical endpoints and reports results

# Configuration
BASE_URL="${1:-https://web-production-8b7ae.up.railway.app}"
ADMIN_API_KEY="${ADMIN_API_KEY:-}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Timing
START_TIME=$(date +%s)

# Create results directory
RESULTS_DIR="test_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "🧪 IAB Options Bot - Production Test Suite"
echo "==========================================="
echo "Base URL: $BASE_URL"
echo "Results will be saved to: $RESULTS_DIR"
echo ""

# Helper function to test endpoints
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_code=${5:-200}
    local headers=$6
    
    echo -n "Testing $name... "
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}\n%{time_total}' -o '$RESULTS_DIR/$(echo $name | tr ' ' '_').json'"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ "$method" = "GET" ]; then
        curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    else
        curl_cmd="$curl_cmd -X '$method' -H 'Content-Type: application/json' -d '$data' '$BASE_URL$endpoint'"
    fi
    
    # Execute request
    result=$(eval $curl_cmd)
    http_code=$(echo "$result" | tail -n 2 | head -n 1)
    time_total=$(echo "$result" | tail -n 1)
    time_ms=$(echo "$time_total * 1000" | bc | cut -d. -f1)
    
    # Check result
    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code, ${time_ms}ms)"
        ((PASSED++))
        echo "$name: PASS (HTTP $http_code, ${time_ms}ms)" >> "$RESULTS_DIR/summary.txt"
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $http_code, ${time_ms}ms)"
        ((FAILED++))
        echo "$name: FAIL (Expected $expected_code, got $http_code, ${time_ms}ms)" >> "$RESULTS_DIR/summary.txt"
    fi
    
    # Performance warning
    if [ "$http_code" -eq "$expected_code" ] && [ "$time_ms" -gt 3000 ]; then
        echo -e "  ${YELLOW}⚠️  Slow response: ${time_ms}ms${NC}"
        ((WARNINGS++))
    fi
}

# Test cache performance (two identical requests)
test_cache_performance() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo "Testing cache performance for $name..."
    
    # First request (cache miss)
    echo -n "  → First request (cache miss)... "
    start_ms=$(date +%s%3N)
    response1=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    end_ms=$(date +%s%3N)
    duration1=$((end_ms - start_ms))
    
    if [ "$response1" -eq 200 ]; then
        echo -e "${GREEN}✅${NC} ${duration1}ms"
    else
        echo -e "${RED}❌ HTTP $response1${NC}"
        return
    fi
    
    # Wait a moment
    sleep 1
    
    # Second request (cache hit)
    echo -n "  → Second request (cache hit)... "
    start_ms=$(date +%s%3N)
    response2=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    end_ms=$(date +%s%3N)
    duration2=$((end_ms - start_ms))
    
    if [ "$response2" -eq 200 ]; then
        echo -e "${GREEN}✅${NC} ${duration2}ms"
        
        # Calculate improvement
        if [ "$duration2" -lt "$duration1" ]; then
            improvement=$(( (duration1 - duration2) * 100 / duration1 ))
            echo -e "  ${GREEN}💾 Cache improved response time by ${improvement}%${NC}"
            ((PASSED++))
        else
            echo -e "  ${YELLOW}⚠️  Cache did not improve performance${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${RED}❌ HTTP $response2${NC}"
        ((FAILED++))
    fi
    
    echo ""
}

# ========================================
# TEST SUITE
# ========================================

# Section 1: Health Endpoints
echo -e "${BLUE}📍 Section 1: Health Endpoints${NC}"
echo "--------------------------------"
test_endpoint "Overall System Health" "GET" "/health"
test_endpoint "Cache Health" "GET" "/health/cache"
test_endpoint "Position Health" "GET" "/health/positions"
echo ""

# Section 2: Core API Endpoints
echo -e "${BLUE}📍 Section 2: Core API Endpoints${NC}"
echo "--------------------------------"
test_endpoint "Get Expirations (AAPL)" "GET" "/api/options/expirations?symbol=AAPL"
test_endpoint "Get Expirations (TSLA)" "GET" "/api/options/expirations?symbol=TSLA"
test_endpoint "Get Quote (AAPL)" "GET" "/api/options/quote?symbol=AAPL"
test_endpoint "Get Quote (SPY)" "GET" "/api/options/quote?symbol=SPY"
echo ""

# Section 3: Options Analysis
echo -e "${BLUE}📍 Section 3: Options Analysis${NC}"
echo "-------------------------------"
test_endpoint "Analyze AAPL (Balanced)" "POST" "/api/options/analyze" \
    '{"symbol":"AAPL","expiration":"2026-01-30","preference":"balanced"}'
test_endpoint "Analyze TSLA (Aggressive)" "POST" "/api/options/analyze" \
    '{"symbol":"TSLA","expiration":"2026-02-06","preference":"aggressive"}'
test_endpoint "Analyze SPY (Conservative)" "POST" "/api/options/analyze" \
    '{"symbol":"SPY","expiration":"2026-02-13","preference":"conservative"}'
echo ""

# Section 4: Cache Performance
echo -e "${BLUE}📍 Section 4: Cache Performance Testing${NC}"
echo "----------------------------------------"
test_cache_performance "AAPL Analysis" "POST" "/api/options/analyze" \
    '{"symbol":"AAPL","expiration":"2026-01-30","preference":"balanced"}'
test_cache_performance "AAPL Expirations" "GET" "/api/options/expirations?symbol=AAPL" ""
echo ""

# Section 5: Admin Endpoints
echo -e "${BLUE}📍 Section 5: Admin Endpoints${NC}"
echo "------------------------------"
if [ -n "$ADMIN_API_KEY" ]; then
    ADMIN_HEADERS="-H 'X-API-Key: $ADMIN_API_KEY'"
    test_endpoint "Get Expiring Positions" "GET" "/api/admin/positions/expiring" "" 200 "$ADMIN_HEADERS"
    test_endpoint "Get Stale Positions" "GET" "/api/admin/positions/stale" "" 200 "$ADMIN_HEADERS"
    test_endpoint "Get Cache Stats" "GET" "/api/admin/cache/stats" "" 200 "$ADMIN_HEADERS"
else
    echo -e "${YELLOW}⚠️  Skipping admin tests (ADMIN_API_KEY not set)${NC}"
    echo "Set ADMIN_API_KEY environment variable to test admin endpoints"
fi
echo ""

# Section 6: Frontend
echo -e "${BLUE}📍 Section 6: Frontend${NC}"
echo "----------------------"
test_endpoint "Frontend Root" "GET" "/"
test_endpoint "Favicon" "GET" "/favicon.ico"
echo ""

# Section 7: Error Handling
echo -e "${BLUE}📍 Section 7: Error Handling${NC}"
echo "-----------------------------"
test_endpoint "Invalid Symbol" "GET" "/api/options/expirations?symbol=INVALID123" "" 200  # Should return empty or error
test_endpoint "Missing Required Param" "POST" "/api/options/analyze" '{"symbol":"AAPL"}' 400
test_endpoint "Invalid Endpoint" "GET" "/api/invalid/endpoint" "" 404
echo ""

# ========================================
# RESULTS SUMMARY
# ========================================

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "=========================================="
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo "=========================================="
echo "Total Duration: ${DURATION}s"
echo -e "Passed:  ${GREEN}$PASSED${NC}"
echo -e "Failed:  ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""
echo "Detailed results saved to: $RESULTS_DIR"
echo ""

# Generate summary report
cat > "$RESULTS_DIR/report.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>IAB Options Bot - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .passed { color: green; }
        .failed { color: red; }
        .warning { color: orange; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
    </style>
</head>
<body>
    <h1>IAB Options Bot - Test Report</h1>
    <p>Generated: $(date)</p>
    <p>Base URL: $BASE_URL</p>
    <h2>Summary</h2>
    <ul>
        <li class="passed">Passed: $PASSED</li>
        <li class="failed">Failed: $FAILED</li>
        <li class="warning">Warnings: $WARNINGS</li>
    </ul>
    <h2>Details</h2>
    <pre>$(cat "$RESULTS_DIR/summary.txt")</pre>
</body>
</html>
EOF

# Final verdict
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo "System is ready for production use."
    exit 0
else
    echo -e "${RED}⚠️  SOME TESTS FAILED${NC}"
    echo "Review failed tests in $RESULTS_DIR before deployment."
    exit 1
fi

