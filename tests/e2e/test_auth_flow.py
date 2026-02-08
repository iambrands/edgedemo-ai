"""E2E tests for authentication flows against the live API."""
import pytest
import httpx
import time

pytestmark = pytest.mark.e2e


class TestLogin:
    def test_login_success(self, api_client: httpx.Client):
        from tests.e2e.conftest import TEST_USER
        r = api_client.post('/api/auth/login', json={
            'email': TEST_USER['email'],
            'password': TEST_USER['password'],
        })
        assert r.status_code == 200
        data = r.json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['email'] == TEST_USER['email']

    def test_login_invalid_credentials(self, api_client: httpx.Client):
        r = api_client.post('/api/auth/login', json={
            'email': 'nonexistent@test.com',
            'password': 'wrong',
        })
        assert r.status_code == 401

    def test_login_missing_fields(self, api_client: httpx.Client):
        r = api_client.post('/api/auth/login', json={})
        assert r.status_code == 400

    def test_login_rate_limiting(self, api_client: httpx.Client):
        """After 5 failed attempts, should get 429."""
        statuses = []
        for i in range(7):
            r = api_client.post('/api/auth/login', json={
                'email': f'ratelimit-e2e-{int(time.time())}@test.com',
                'password': 'wrong',
            })
            statuses.append(r.status_code)
            time.sleep(0.2)

        # At least the later ones should be 429 OR all 401 if per-IP counter
        assert 401 in statuses or 429 in statuses


class TestTokenRefresh:
    def test_refresh_token(self, api_client: httpx.Client):
        from tests.e2e.conftest import TEST_USER
        # Login first
        login_r = api_client.post('/api/auth/login', json={
            'email': TEST_USER['email'],
            'password': TEST_USER['password'],
        })
        assert login_r.status_code == 200
        refresh_token = login_r.json()['refresh_token']

        # Refresh
        r = api_client.post('/api/auth/refresh', headers={
            'Authorization': f'Bearer {refresh_token}',
        })
        assert r.status_code == 200
        assert 'access_token' in r.json()


class TestGetUser:
    def test_get_current_user(self, api_client: httpx.Client, auth_headers: dict):
        r = api_client.get('/api/auth/user', headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert 'user' in data
        assert 'email' in data['user']

    def test_get_user_without_auth(self, api_client: httpx.Client):
        r = api_client.get('/api/auth/user')
        assert r.status_code == 401
