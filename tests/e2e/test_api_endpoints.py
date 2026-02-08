"""E2E tests for API endpoint security and functionality."""
import pytest
import httpx

pytestmark = pytest.mark.e2e


class TestHealthEndpoints:
    def test_health_basic(self, api_client: httpx.Client):
        r = api_client.get('/health')
        assert r.status_code == 200
        data = r.json()
        assert data['status'] == 'healthy'

    def test_health_full(self, api_client: httpx.Client):
        r = api_client.get('/health/full')
        assert r.status_code in [200, 503]
        data = r.json()
        assert 'checks' in data
        assert 'database' in data['checks']
        assert 'redis' in data['checks']
        assert 'trading' in data['checks']


class TestProtectedEndpoints:
    """Verify all data endpoints require authentication."""

    PROTECTED_GET = [
        '/api/opportunities/today',
        '/api/opportunities/market-movers',
        '/api/opportunities/high-probability',
        '/api/opportunities/earnings',
        '/api/opportunities/unusual-activity',
        '/api/auth/user',
    ]

    @pytest.mark.parametrize('endpoint', PROTECTED_GET)
    def test_requires_auth(self, api_client: httpx.Client, endpoint: str):
        r = api_client.get(endpoint)
        assert r.status_code in [401, 422], (
            f'{endpoint} returned {r.status_code}, expected 401/422'
        )


class TestAdminEndpoints:
    """Verify admin endpoints are protected."""

    ADMIN_GET = [
        '/api/admin/ping',
        '/api/admin/cache-status',
        '/api/admin/performance-test',
        '/api/admin/debug',
        '/api/admin/cache/stats',
    ]

    @pytest.mark.parametrize('endpoint', ADMIN_GET)
    def test_admin_rejects_unauthenticated(self, api_client: httpx.Client, endpoint: str):
        r = api_client.get(endpoint)
        assert r.status_code == 401, (
            f'{endpoint} returned {r.status_code}, expected 401'
        )

    @pytest.mark.parametrize('endpoint', ADMIN_GET)
    def test_admin_rejects_regular_user(
        self, api_client: httpx.Client, auth_headers: dict, endpoint: str
    ):
        r = api_client.get(endpoint, headers=auth_headers)
        assert r.status_code in [403, 401], (
            f'{endpoint} returned {r.status_code}, expected 403'
        )

    def test_admin_accepts_admin_user(
        self, api_client: httpx.Client, admin_headers: dict
    ):
        r = api_client.get('/api/admin/ping', headers=admin_headers)
        assert r.status_code == 200


class TestRiskAcknowledgment:
    def test_get_risk_status(self, api_client: httpx.Client, auth_headers: dict):
        r = api_client.get('/api/user/risk-status', headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert 'acknowledged' in data
        assert 'current_version' in data

    def test_acknowledge_risk(self, api_client: httpx.Client, auth_headers: dict):
        r = api_client.post('/api/user/acknowledge-risk', headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get('success') is True


class TestTradingHalt:
    def test_halt_status(self, api_client: httpx.Client, admin_headers: dict):
        r = api_client.get('/api/admin/trading/status', headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert 'trading_active' in data

    def test_halt_and_resume(self, api_client: httpx.Client, admin_headers: dict):
        # Halt
        r = api_client.post('/api/admin/trading/halt', headers=admin_headers, json={
            'reason': 'E2E test',
        })
        assert r.status_code == 200

        # Verify halted
        r = api_client.get('/api/admin/trading/status', headers=admin_headers)
        assert r.json()['trading_active'] is False

        # Resume
        r = api_client.post('/api/admin/trading/resume', headers=admin_headers)
        assert r.status_code == 200

        # Verify resumed
        r = api_client.get('/api/admin/trading/status', headers=admin_headers)
        assert r.json()['trading_active'] is True
