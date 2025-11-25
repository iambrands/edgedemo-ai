#!/bin/bash

# IAB OptionsBot Startup Script

echo "Starting IAB OptionsBot..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your configuration"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Backend: python app.py (or: source venv/bin/activate && python app.py)"
echo "  2. Frontend: cd frontend && npm start"
echo ""
echo "Or use Docker: docker-compose up --build"

