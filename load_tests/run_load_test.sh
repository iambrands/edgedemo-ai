#!/bin/bash
# load_tests/run_load_test.sh
# Run Locust load tests against OptionsEdge (local or Railway).

set -e

# Configuration
TARGET_HOST="${TARGET_HOST:-https://web-production-8b7ae.up.railway.app}"
USERS="${USERS:-10}"
SPAWN_RATE="${SPAWN_RATE:-2}"
RUN_TIME="${RUN_TIME:-5m}"

# Ensure results dir for headless CSV output
mkdir -p results

echo "🔥 Starting load test"
echo "   Target: $TARGET_HOST"
echo "   Users: $USERS"
echo "   Spawn rate: $SPAWN_RATE users/sec"
echo "   Duration: $RUN_TIME"
echo ""

# Run with web UI (interactive)
locust -f locustfile.py \
    --host="$TARGET_HOST" \
    --users="$USERS" \
    --spawn-rate="$SPAWN_RATE" \
    --run-time="$RUN_TIME" \
    --web-host=0.0.0.0

# Headless (CI/automated) - uncomment and run manually:
# locust -f locustfile.py \
#     --host="$TARGET_HOST" \
#     --users="$USERS" \
#     --spawn-rate="$SPAWN_RATE" \
#     --run-time="$RUN_TIME" \
#     --headless \
#     --csv=results/load_test
