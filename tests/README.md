# IAB OptionsBot Test Suite

## Overview

This test suite provides comprehensive automated testing for all critical features of the IAB OptionsBot platform. Tests are organized by feature area and cover both happy paths and error cases.

## Test Coverage

### ✅ Authentication Tests (`test_auth.py`)
- User registration (success, duplicates, validation)
- User login (success, wrong password, non-existent user)
- User info retrieval
- Authentication token validation

### ✅ Trade Execution Tests (`test_trades.py`)
- Getting positions (empty and with data)
- Executing buy trades
- Balance validation
- Invalid symbol handling
- Trade history retrieval
- Position refresh
- Position closing

### ✅ Automation Tests (`test_automations.py`)
- Creating automations
- Getting automations
- Updating automations
- Deleting automations
- Toggling automation status

### ✅ Watchlist Tests (`test_watchlist.py`)
- Adding stocks
- Getting watchlist
- Updating stocks
- Deleting stocks

### ✅ Feedback Tests (`test_feedback.py`)
- Submitting feedback (all types)
- Missing field validation
- Invalid type validation
- Retrieving user feedback

### ✅ Opportunity Discovery Tests (`test_opportunities.py`)
- Today's opportunities
- Quick scan
- Market movers
- AI-powered suggestions

### ✅ Service Layer Tests (`test_services.py`)
- Input sanitization (XSS prevention)
- Symbol sanitization
- Float/int validation
- Risk manager functionality

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
# Using pytest directly
pytest tests/ -v

# Using the test script (includes coverage)
./run_tests.sh

# With coverage report
pytest tests/ -v --cov=. --cov-report=html --cov-report=term-missing
```

### Run Specific Test Files

```bash
# Test authentication only
pytest tests/test_auth.py -v

# Test trades only
pytest tests/test_trades.py -v

# Test specific test class
pytest tests/test_auth.py::TestAuth -v

# Test specific test function
pytest tests/test_auth.py::TestAuth::test_login_success -v
```

### Run with Coverage

```bash
pytest tests/ --cov=. --cov-report=html
# Open htmlcov/index.html in browser to see coverage report
```

## Test Configuration

Tests use:
- **In-memory SQLite database** for isolation (no database setup needed)
- **Pytest fixtures** for test data (users, positions, automations)
- **Flask test client** for API testing
- **Automatic cleanup** after each test

## Test Structure

```
tests/
├── __init__.py          # Package initialization
├── conftest.py          # Pytest fixtures and configuration
├── test_auth.py         # Authentication tests
├── test_trades.py       # Trade execution tests
├── test_automations.py  # Automation tests
├── test_watchlist.py    # Watchlist tests
├── test_feedback.py     # Feedback tests
├── test_opportunities.py # Opportunity discovery tests
└── test_services.py     # Service layer tests
```

## Fixtures Available

- `app`: Flask application instance
- `client`: Test client for making requests
- `test_user`: Pre-created test user
- `auth_headers`: Authentication headers for test user
- `test_position`: Pre-created test position
- `test_automation`: Pre-created test automation
- `test_stock`: Pre-created watchlist stock

## Writing New Tests

1. Create a new test file: `tests/test_feature.py`
2. Import necessary fixtures from `conftest.py`
3. Write test classes and methods:

```python
import pytest

class TestFeature:
    def test_feature_success(self, client, auth_headers):
        """Test successful feature operation"""
        response = client.get('/api/feature', headers=auth_headers)
        assert response.status_code == 200
    
    def test_feature_error(self, client, auth_headers):
        """Test error handling"""
        response = client.post('/api/feature', json={}, headers=auth_headers)
        assert response.status_code == 400
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest tests/ -v --cov=. --cov-report=xml
```

## Notes

- Tests are isolated (each test gets a fresh database)
- Tests use mock data by default (no external API calls)
- All tests should pass before deploying to production
- Coverage reports help identify untested code paths

