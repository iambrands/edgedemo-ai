#!/bin/bash
# Railway startup script

# Get PORT from environment, default to 5000
PORT=${PORT:-5000}

# Run database migrations
echo "Running database migrations..."
flask db upgrade || echo "Migration failed, continuing..."

# Start gunicorn with increased timeout for long-running operations like options analysis
echo "Starting gunicorn on port $PORT..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 300 --graceful-timeout 30 --access-logfile - --error-logfile - "app:create_app()"

