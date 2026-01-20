# Multi-stage build for backend + frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including Node.js for frontend build)
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

# Copy frontend files and build
WORKDIR /app/frontend
COPY frontend/package*.json ./
COPY frontend/ ./
RUN npm install && npm run build

# Return to app root and copy backend code
WORKDIR /app
COPY . .

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]

# Rebuild 1768949816
