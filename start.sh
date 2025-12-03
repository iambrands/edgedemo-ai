#!/bin/bash
# Railway startup script

# Get PORT from environment, default to 5000
PORT=${PORT:-5000}

# Start gunicorn
exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --access-logfile - --error-logfile - "app:create_app()"

