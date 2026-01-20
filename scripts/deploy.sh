#!/bin/bash
set -e

echo "🚀 Starting deployment..."
echo ""

# Run database migrations
echo "📊 Running database migrations..."
flask db upgrade

# Check migration status
if [ $? -eq 0 ]; then
    echo "✅ Database migrations completed successfully"
    echo ""
else
    echo "❌ Database migrations failed"
    exit 1
fi

# Log migration status (optional)
echo "📊 Checking migration status..."
flask db current 2>/dev/null || echo "⚠️  Could not determine current migration"
echo ""

# Start the application
echo "🎯 Starting application..."
echo ""

# Use PORT from environment or default to 8080
PORT=${PORT:-8080}

# Start gunicorn with appropriate workers
# Workers = (2 x CPU cores) + 1, but cap at 4 for Railway
exec gunicorn app:app \
    --bind 0.0.0.0:${PORT} \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info

