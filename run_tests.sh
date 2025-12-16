#!/bin/bash
# Run all tests with coverage report

echo "Running IAB OptionsBot Test Suite..."
echo "======================================"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run tests with coverage
pytest tests/ -v --cov=. --cov-report=html --cov-report=term-missing

echo ""
echo "Coverage report generated in htmlcov/index.html"
echo "Open it in your browser to see detailed coverage"

