# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    nginx \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to project root
WORKDIR /app

# Set PYTHONPATH so 'backend' package is importable
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# CRITICAL: Copy backend INTO /app/backend/ (preserve package structure)
COPY backend/ ./backend/

# Create __init__.py to ensure backend is a proper Python package
RUN touch ./backend/__init__.py

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy nginx config (if exists)
COPY frontend/nginx.conf /etc/nginx/nginx.conf.template 2>/dev/null || true

# Expose port
EXPOSE ${PORT:-8000}

# Run uvicorn - module path is backend.app:app
# Looks for /app/backend/app.py and imports work because PYTHONPATH=/app
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
