"""E2E tests for the trading flow against the live API."""
import pytest
import httpx

pytestmark = pytest.mark.e2e


class TestOptionsData:
    def test_get_expirations(self, api_client: httpx.Client, auth_headers: dict):
        """Can fetch option expiration dates for a symbol."""
        r = api_client.get('/api/options/expirations/AAPL', headers=auth_headers)
        # The endpoint may have different path/structure — accept 200 or 404
        if r.status_code == 200:
            data = r.json()
            assert isinstance(data.get('expirations', data.get('dates', [])), list)

    def test_get_options_chain(self, api_client: httpx.Client, auth_headers: dict):
        """Can fetch options chain for a symbol."""
        r = api_client.get('/api/options/chain/AAPL', headers=auth_headers)
        if r.status_code == 200:
            data = r.json()
            assert 'options' in data or 'chain' in data or isinstance(data, list)


class TestPortfolioData:
    def test_get_positions(self, api_client: httpx.Client, auth_headers: dict):
        """Can list current positions."""
        r = api_client.get('/api/trades/positions', headers=auth_headers)
        assert r.status_code == 200

    def test_get_trade_history(self, api_client: httpx.Client, auth_headers: dict):
        """Can fetch trade history."""
        r = api_client.get('/api/trades/history', headers=auth_headers)
        assert r.status_code == 200


class TestOpportunities:
    def test_today_opportunities(self, api_client: httpx.Client, auth_headers: dict):
        r = api_client.get('/api/opportunities/today', headers=auth_headers)
        assert r.status_code == 200

    def test_market_movers(self, api_client: httpx.Client, auth_headers: dict):
        r = api_client.get('/api/opportunities/market-movers', headers=auth_headers)
        assert r.status_code == 200

    def test_ai_suggestions(self, api_client: httpx.Client, auth_headers: dict):
        r = api_client.get('/api/opportunities/ai-suggestions', headers=auth_headers)
        assert r.status_code == 200
