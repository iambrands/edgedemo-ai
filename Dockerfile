FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend/

# Create frontend directory and copy
RUN mkdir -p frontend
COPY frontend/index.html ./frontend/

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
# Use PORT environment variable (defaults to 8000)
CMD sh -c "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"

