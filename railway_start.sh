#!/bin/bash
# Railway startup script with migration handling

echo "Starting Railway deployment..."
echo "PORT: ${PORT:-5000}"
echo "DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'no')"

# Set FLASK_APP if not set
export FLASK_APP=app.py

# Try to run migrations, but don't fail if database isn't ready yet
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    flask db upgrade || {
        echo "WARNING: Migration failed, but continuing startup..."
        echo "You may need to run migrations manually later"
    }
else
    echo "WARNING: DATABASE_URL not set, skipping migrations"
fi

echo "Starting Gunicorn on port ${PORT:-5000}..."
exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 120 --access-logfile - --error-logfile - "app:create_app()"

