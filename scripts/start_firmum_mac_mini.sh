#!/bin/zsh
cd /Users/iabadvisors/Projects/edgeai-demo
set -a
if [[ -f .env.beta ]]; then
  source .env.beta
elif [[ -f .env ]]; then
  source .env
fi
set +a
export PYTHONPATH="/Users/iabadvisors/Projects/edgeai-demo${PYTHONPATH:+:$PYTHONPATH}"
cd backend
VENV="../venv/bin/uvicorn"
if [[ ! -x "$VENV" ]]; then
  VENV="/Users/iabadvisors/Projects/IAB-RIA/venv/bin/uvicorn"
fi
exec "$VENV" app:app --host 0.0.0.0 --port ${PORT:-5006}
