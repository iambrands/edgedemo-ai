# EdgeAI Backend Dockerfile for Railway
FROM python:3.11-slim

# Set working directory to project root
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy entire backend directory (preserves package structure)
COPY backend/ ./backend/

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Set PYTHONPATH explicitly so 'backend' package is always findable
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/health')" || exit 1

# CRITICAL: Run from /app with explicit PYTHONPATH
# backend.app:app means /app/backend/app.py
CMD ["sh", "-c", "cd /app && PYTHONPATH=/app uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
