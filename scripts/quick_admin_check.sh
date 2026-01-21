#!/bin/bash
# Quick admin dashboard check script

BASE_URL="https://web-production-8b7ae.up.railway.app"

echo "============================================================"
echo "Admin Dashboard Status Check"
echo "============================================================"
echo ""

# Test admin debug endpoint
echo "1. Testing Admin Blueprint Registration..."
DEBUG_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/admin/debug")
HTTP_CODE=$(echo "$DEBUG_RESPONSE" | tail -n1)
BODY=$(echo "$DEBUG_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Admin blueprint loaded"
    ROUTE_COUNT=$(echo "$BODY" | grep -o '"total_routes":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "   Routes found: $ROUTE_COUNT"
else
    echo "   ❌ Admin debug failed: HTTP $HTTP_CODE"
fi

echo ""
echo "2. Testing Analyze Endpoints (without auth)..."
echo "   Note: These should return 401 without authentication"

ENDPOINTS=(
    "/api/admin/analyze/database"
    "/api/admin/analyze/redis"
    "/api/admin/analyze/connections"
)

for endpoint in "${ENDPOINTS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}")
    if [ "$HTTP_CODE" = "404" ]; then
        echo "   ❌ ${endpoint##*/}: 404 (Not Found - route not registered)"
    elif [ "$HTTP_CODE" = "401" ]; then
        echo "   ✅ ${endpoint##*/}: 401 (Unauthorized - route exists, needs auth)"
    elif [ "$HTTP_CODE" = "200" ]; then
        echo "   ✅ ${endpoint##*/}: 200 (Working!)"
    else
        echo "   ⚠️  ${endpoint##*/}: $HTTP_CODE"
    fi
done

echo ""
echo "3. Access Admin Dashboard:"
echo "   URL: ${BASE_URL}/admin/optimization"
echo "   (Requires login first)"
echo ""
echo "============================================================"

