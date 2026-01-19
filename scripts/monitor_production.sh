#!/bin/bash

# IAB Options Bot - Production Monitor
# Continuously monitors system health and alerts on issues

BASE_URL="${1:-https://web-production-8b7ae.up.railway.app}"
CHECK_INTERVAL=60  # seconds

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 IAB Options Bot - Production Monitor"
echo "========================================"
echo "Base URL: $BASE_URL"
echo "Check Interval: ${CHECK_INTERVAL}s"
echo "Press Ctrl+C to stop"
echo ""

check_health() {
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [ "$status_code" -eq 200 ]; then
        # Parse JSON (requires jq)
        if command -v jq &> /dev/null; then
            status=$(echo "$body" | jq -r '.status')
            db_status=$(echo "$body" | jq -r '.components.database.status')
            cache_status=$(echo "$body" | jq -r '.components.cache.status')
            
            if [ "$status" = "healthy" ]; then
                echo -e "$timestamp ${GREEN}✅ HEALTHY${NC} | DB: $db_status | Cache: $cache_status"
            else
                echo -e "$timestamp ${YELLOW}⚠️  DEGRADED${NC} | DB: $db_status | Cache: $cache_status"
            fi
        else
            echo -e "$timestamp ${GREEN}✅ HEALTHY${NC} (HTTP 200)"
        fi
    else
        echo -e "$timestamp ${RED}❌ UNHEALTHY${NC} (HTTP $status_code)"
    fi
}

# Main monitoring loop
while true; do
    check_health
    sleep $CHECK_INTERVAL
done

