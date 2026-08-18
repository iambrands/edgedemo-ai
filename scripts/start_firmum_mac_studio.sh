#!/bin/zsh
# Mac Studio production — port 8004
cd /Users/iabadvisors/Projects/edgeai-demo
set -a
if [[ -f .env.production ]]; then
  source .env.production
elif [[ -f .env ]]; then
  source .env
fi
set +a
export PYTHONPATH="/Users/iabadvisors/Projects/edgeai-demo${PYTHONPATH:+:$PYTHONPATH}"
cd backend
exec ../venv/bin/uvicorn app:app --host 0.0.0.0 --port ${PORT:-8004} --workers ${WORKERS:-4}
