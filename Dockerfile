# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Node.js
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (but exclude node_modules and build to speed up)
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Verify build was created
RUN ls -la /app/frontend/build/ || echo "Build directory not found!"
RUN ls -la /app/frontend/build/static/ || echo "Static directory not found!"

# Return to app directory
WORKDIR /app

# Verify frontend build exists
RUN ls -la /app/frontend/build/static/js/ || echo "JS files not found!"

# Make start script executable
RUN chmod +x start.sh

# Expose port (Railway will set PORT env var)
EXPOSE 5000

# Run the application using start.sh (handles PORT variable)
CMD ["bash", "start.sh"]

