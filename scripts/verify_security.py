#!/usr/bin/env python3
"""
Security hardening verification script for OptionsEdge.
Run after deployment to verify all security measures are in place.

Usage:
    railway run python scripts/verify_security.py
    # or
    ADMIN_EMAIL=leslie@iabadvisors.com ADMIN_PASSWORD=xxx python scripts/verify_security.py
"""
import requests
import time
import sys
import os

BASE_URL = os.environ.get('BASE_URL', 'https://web-production-8b7ae.up.railway.app')


class SecurityVerifier:
    def __init__(self):
        self.results = []
        self.admin_token = None

    def test(self, name, condition, details=''):
        status = 'PASS' if condition else 'FAIL'
        self.results.append({'name': name, 'passed': condition, 'details': details})
        icon = '  PASS' if condition else '  FAIL'
        print(f'{icon}: {name}')
        if details and not condition:
            print(f'         {details}')

    def login(self, email, password):
        try:
            r = requests.post(
                f'{BASE_URL}/api/auth/login',
                json={'email': email, 'password': password},
                timeout=10,
            )
            if r.status_code == 200:
                return r.json().get('access_token')
        except Exception as e:
            print(f'  Login error: {e}')
        return None

    def test_rate_limiting(self):
        print('\n--- Rate Limiting Tests ---')
        blocked = False
        for i in range(8):
            try:
                r = requests.post(
                    f'{BASE_URL}/api/auth/login',
                    json={'email': f'ratelimit-test-{int(time.time())}@test.com', 'password': 'wrong'},
                    timeout=10,
                )
                if r.status_code == 429:
                    blocked = True
                    self.test(f'Rate limiting activates after {i + 1} attempts', i >= 4,
                              f'Blocked at attempt {i + 1}')
                    break
            except Exception:
                pass
            time.sleep(0.3)

        if not blocked:
            self.test('Rate limiting activates', False, 'Never received 429 after 8 attempts')

    def test_admin_protection(self):
        print('\n--- Admin Protection Tests ---')
        # Without token
        try:
            r = requests.get(f'{BASE_URL}/api/admin/ping', timeout=10)
            self.test('Admin /ping rejects unauthenticated', r.status_code == 401,
                       f'Got {r.status_code}')
        except Exception as e:
            self.test('Admin /ping rejects unauthenticated', False, str(e))

        # Cache status
        try:
            r = requests.get(f'{BASE_URL}/api/admin/cache-status', timeout=10)
            self.test('Admin /cache-status rejects unauthenticated', r.status_code == 401,
                       f'Got {r.status_code}')
        except Exception as e:
            self.test('Admin /cache-status rejects unauthenticated', False, str(e))

        # Performance test
        try:
            r = requests.get(f'{BASE_URL}/api/admin/performance-test', timeout=10)
            self.test('Admin /performance-test rejects unauthenticated', r.status_code == 401,
                       f'Got {r.status_code}')
        except Exception as e:
            self.test('Admin /performance-test rejects unauthenticated', False, str(e))

        # With admin token
        if self.admin_token:
            try:
                r = requests.get(
                    f'{BASE_URL}/api/admin/ping',
                    headers={'Authorization': f'Bearer {self.admin_token}'},
                    timeout=10,
                )
                self.test('Admin /ping accepts admin', r.status_code == 200,
                           f'Got {r.status_code}')
            except Exception as e:
                self.test('Admin /ping accepts admin', False, str(e))

    def test_opportunities_auth(self):
        print('\n--- Opportunities Auth Tests ---')
        endpoints = [
            '/api/opportunities/today',
            '/api/opportunities/market-movers',
            '/api/opportunities/high-probability',
            '/api/opportunities/earnings',
            '/api/opportunities/unusual-activity',
        ]
        for ep in endpoints:
            try:
                r = requests.get(f'{BASE_URL}{ep}', timeout=10)
                self.test(f'{ep} requires auth', r.status_code in [401, 422],
                           f'Got {r.status_code}')
            except Exception as e:
                self.test(f'{ep} requires auth', False, str(e))

    def test_trading_halt(self):
        print('\n--- Trading Halt Tests ---')
        if not self.admin_token:
            print('  Skipped (no admin token)')
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}

        # Check status
        try:
            r = requests.get(f'{BASE_URL}/api/admin/trading/status', headers=headers, timeout=10)
            self.test('Trading status endpoint works', r.status_code == 200,
                       f'Got {r.status_code}')
        except Exception as e:
            self.test('Trading status endpoint works', False, str(e))

        # Halt
        try:
            r = requests.post(
                f'{BASE_URL}/api/admin/trading/halt', headers=headers,
                json={'reason': 'Security verification test'},
                timeout=10,
            )
            self.test('Trading halt works', r.status_code == 200, f'Got {r.status_code}')
        except Exception as e:
            self.test('Trading halt works', False, str(e))

        # Resume
        try:
            r = requests.post(f'{BASE_URL}/api/admin/trading/resume', headers=headers, timeout=10)
            self.test('Trading resume works', r.status_code == 200, f'Got {r.status_code}')
        except Exception as e:
            self.test('Trading resume works', False, str(e))

    def test_risk_acknowledgment(self):
        print('\n--- Risk Acknowledgment Tests ---')
        if not self.admin_token:
            print('  Skipped (no admin token)')
            return

        headers = {'Authorization': f'Bearer {self.admin_token}'}

        try:
            r = requests.get(f'{BASE_URL}/api/user/risk-status', headers=headers, timeout=10)
            self.test('Risk status endpoint works', r.status_code == 200,
                       f'Got {r.status_code}')
            if r.status_code == 200:
                data = r.json()
                self.test('Risk status returns expected fields',
                           'acknowledged' in data and 'current_version' in data,
                           f'Fields: {list(data.keys())}')
        except Exception as e:
            self.test('Risk status endpoint works', False, str(e))

    def test_health(self):
        print('\n--- Health Check Tests ---')
        try:
            r = requests.get(f'{BASE_URL}/health', timeout=10)
            self.test('Health endpoint responds', r.status_code == 200,
                       f'Got {r.status_code}')
        except Exception as e:
            self.test('Health endpoint responds', False, str(e))

    def test_legal_pages(self):
        print('\n--- Legal Pages Tests ---')
        for path in ['/terms', '/privacy']:
            try:
                r = requests.get(f'{BASE_URL}{path}', timeout=10)
                self.test(f'{path} is accessible', r.status_code == 200,
                           f'Got {r.status_code}')
            except Exception as e:
                self.test(f'{path} is accessible', False, str(e))

    def run_all(self, admin_email=None, admin_password=None):
        print('=' * 60)
        print('OPTIONSEDGE SECURITY VERIFICATION')
        print('=' * 60)
        print(f'Target: {BASE_URL}')

        if admin_email and admin_password:
            self.admin_token = self.login(admin_email, admin_password)
            if self.admin_token:
                print('  Admin login successful')
            else:
                print('  Admin login failed (some tests will be skipped)')

        self.test_health()
        self.test_legal_pages()
        self.test_rate_limiting()
        self.test_admin_protection()
        self.test_opportunities_auth()
        self.test_trading_halt()
        self.test_risk_acknowledgment()

        # Summary
        print('\n' + '=' * 60)
        print('SUMMARY')
        print('=' * 60)
        passed = sum(1 for r in self.results if r['passed'])
        total = len(self.results)
        print(f'Passed: {passed}/{total}')

        if passed == total:
            print('\n  ALL SECURITY CHECKS PASSED')
            return 0
        else:
            print('\n  SOME SECURITY CHECKS FAILED:')
            for r in self.results:
                if not r['passed']:
                    print(f'  - {r["name"]}')
            return 1


if __name__ == '__main__':
    verifier = SecurityVerifier()
    admin_email = os.environ.get('ADMIN_EMAIL')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    sys.exit(verifier.run_all(admin_email=admin_email, admin_password=admin_password))
