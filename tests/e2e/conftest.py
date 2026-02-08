"""
E2E API test fixtures.

These tests run against the live deployed instance (or a local one).
Set TEST_API_URL to the target environment.

Usage:
    TEST_API_URL=https://web-production-8b7ae.up.railway.app pytest tests/e2e/ -v
"""
import pytest
import httpx
import os

BASE_URL = os.environ.get(
    'TEST_API_URL', 'https://web-production-8b7ae.up.railway.app'
)

TEST_USER = {
    'email': os.environ.get('E2E_TEST_EMAIL', 'e2e-test@optionsedge.ai'),
    'password': os.environ.get('E2E_TEST_PASSWORD', 'TestPassword123!'),
    'username': os.environ.get('E2E_TEST_USERNAME', 'e2e-testuser'),
}

ADMIN_USER = {
    'email': os.environ.get('ADMIN_EMAIL', 'leslie.wilson@iambrands.com'),
    'password': os.environ.get('ADMIN_PASSWORD', ''),
}


@pytest.fixture(scope='session')
def api_client() -> httpx.Client:
    """HTTP client pointed at the deployed API."""
    with httpx.Client(base_url=BASE_URL, timeout=30.0) as client:
        yield client


@pytest.fixture(scope='session')
def auth_token(api_client: httpx.Client) -> str:
    """Get JWT for the standard test user."""
    r = api_client.post('/api/auth/login', json={
        'email': TEST_USER['email'],
        'password': TEST_USER['password'],
    })
    if r.status_code != 200:
        pytest.skip(f'E2E test user login failed ({r.status_code}): {r.text[:200]}')
    return r.json()['access_token']


@pytest.fixture(scope='session')
def admin_token(api_client: httpx.Client) -> str:
    """Get JWT for the admin user."""
    if not ADMIN_USER['password']:
        pytest.skip('ADMIN_PASSWORD env var not set')
    r = api_client.post('/api/auth/login', json={
        'email': ADMIN_USER['email'],
        'password': ADMIN_USER['password'],
    })
    if r.status_code != 200:
        pytest.skip(f'Admin login failed ({r.status_code})')
    return r.json()['access_token']


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    return {'Authorization': f'Bearer {auth_token}'}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    return {'Authorization': f'Bearer {admin_token}'}
