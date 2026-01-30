"""
OptionsEdge load tests with Locust.

Simulates typical user sessions: login, dashboard, quotes, expirations,
options analysis, positions, history, watchlist, AI suggestions.
"""
from locust import HttpUser, task, between, tag
import random
import os

# Test symbols (mix of warmed and non-warmed)
WARMED_SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'META', 'GOOGL', 'AMZN']
OTHER_SYMBOLS = ['NFLX', 'AMD', 'COIN', 'MSFT', 'DIS', 'BA', 'JPM']
ALL_SYMBOLS = WARMED_SYMBOLS + OTHER_SYMBOLS

# Expirations to test (update these to valid future dates)
EXPIRATIONS = ['2026-02-07', '2026-02-14', '2026-02-21', '2026-03-21']


class OptionsEdgeUser(HttpUser):
    """
    Simulates a typical OptionsEdge user session.

    Behavior pattern:
    - Login once
    - Browse dashboard
    - Analyze 2-5 symbols
    - Check positions/history occasionally
    """

    # Wait 2-5 seconds between actions (simulates reading/thinking)
    wait_time = between(2, 5)

    # Store auth token
    token = None

    def on_start(self):
        """Called when user starts - login and get token."""
        test_email = os.getenv('LOAD_TEST_EMAIL', 'loadtest@example.com')
        test_password = os.getenv('LOAD_TEST_PASSWORD', 'testpassword')

        try:
            response = self.client.post('/api/auth/login', json={
                'email': test_email,
                'password': test_password
            })
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token') or data.get('access_token')
        except Exception as e:
            print(f"Login failed: {e}")

    @property
    def auth_headers(self):
        """Return auth headers if logged in."""
        if self.token:
            return {'Authorization': f'Bearer {self.token}'}
        return {}

    # =========================================================================
    # HIGH FREQUENCY TASKS (weight=10) - Most common user actions
    # =========================================================================

    @task(10)
    @tag('dashboard')
    def view_dashboard(self):
        """User views the dashboard - hits multiple endpoints."""
        self.client.get('/api/opportunities/today', headers=self.auth_headers)
        self.client.get('/api/opportunities/market-movers?limit=8', headers=self.auth_headers)

    @task(10)
    @tag('quote')
    def get_quote(self):
        """User checks a stock quote."""
        symbol = random.choice(ALL_SYMBOLS)
        self.client.get(f'/api/options/quote/{symbol}', headers=self.auth_headers)

    @task(8)
    @tag('expirations')
    def get_expirations(self):
        """User loads expirations for a symbol."""
        symbol = random.choice(ALL_SYMBOLS)
        self.client.get(f'/api/options/expirations/{symbol}', headers=self.auth_headers)

    # =========================================================================
    # MEDIUM FREQUENCY TASKS (weight=5) - Analysis actions
    # =========================================================================

    @task(5)
    @tag('analyze', 'heavy')
    def analyze_options(self):
        """User runs options analysis - HEAVY endpoint."""
        symbol = random.choice(ALL_SYMBOLS)
        expiration = random.choice(EXPIRATIONS)

        self.client.post('/api/options/analyze',
            json={
                'symbol': symbol,
                'expiration': expiration,
                'preference': 'balanced'
            },
            headers=self.auth_headers
        )

    @task(5)
    @tag('positions')
    def view_positions(self):
        """User checks their positions."""
        self.client.get('/api/trades/positions', headers=self.auth_headers)
        self.client.get('/api/trades/pl-summary', headers=self.auth_headers)

    # =========================================================================
    # LOW FREQUENCY TASKS (weight=2) - Occasional actions
    # =========================================================================

    @task(2)
    @tag('history')
    def view_history(self):
        """User checks trade history."""
        self.client.get('/api/trades/history', headers=self.auth_headers)

    @task(2)
    @tag('watchlist')
    def view_watchlist(self):
        """User checks watchlist."""
        self.client.get('/api/watchlist', headers=self.auth_headers)

    @task(1)
    @tag('ai')
    def get_ai_suggestions(self):
        """User requests AI suggestions - potentially slow."""
        self.client.get('/api/opportunities/ai-suggestions?limit=8', headers=self.auth_headers)


class HeavyAnalysisUser(HttpUser):
    """
    Simulates a power user doing lots of analysis.
    Use this to stress-test the analysis endpoint specifically.
    """

    wait_time = between(1, 3)

    @task
    def analyze_multiple_symbols(self):
        """Rapid-fire analysis requests."""
        symbol = random.choice(ALL_SYMBOLS)
        expiration = random.choice(EXPIRATIONS)

        self.client.post('/api/options/analyze',
            json={
                'symbol': symbol,
                'expiration': expiration,
                'preference': random.choice(['balanced', 'conservative', 'aggressive'])
            }
        )


class QuoteOnlyUser(HttpUser):
    """
    Simulates users just checking quotes (light load).
    """

    wait_time = between(5, 10)

    @task
    def check_quote(self):
        """Check a single quote (no auth required for public-style test)."""
        symbol = random.choice(ALL_SYMBOLS)
        self.client.get(f'/api/options/quote/{symbol}')
