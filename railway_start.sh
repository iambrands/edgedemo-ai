#!/bin/bash
# Railway startup script with migration handling

set -e

echo "Starting Railway deployment..."

# Try to run migrations, but don't fail if database isn't ready yet
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    flask db upgrade || {
        echo "Migration failed, but continuing startup..."
        echo "You may need to run migrations manually later"
    }
else
    echo "WARNING: DATABASE_URL not set, skipping migrations"
fi

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120 "app:create_app()"

