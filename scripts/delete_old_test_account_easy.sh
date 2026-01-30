#!/usr/bin/env bash
# Delete old test account with zero manual input.
# Uses Railway production env if available; otherwise uses .env DATABASE_URL.

set -e
cd "$(dirname "$0")/.."

if command -v railway >/dev/null 2>&1; then
  echo "Using Railway production env (no input needed)."
  railway run python scripts/delete_old_test_account.py --yes
else
  echo "Railway CLI not found. Using .env DATABASE_URL."
  python scripts/delete_old_test_account.py --yes
fi
