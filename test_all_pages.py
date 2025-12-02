#!/usr/bin/env python3
"""
Test script to check all application pages/endpoints for errors.
Run this to verify all tabs and features are working correctly.
"""
import requests
import json
import sys
from typing import Dict, List, Tuple

# Configuration
BASE_URL = "https://iab-optionsbot-f26fe17b39f3.herokuapp.com"
API_BASE = f"{BASE_URL}/api"

# Test credentials (you'll need to update these or create a test user)
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg: str):
    print(f"{Colors.GREEN}✓{Colors.END} {msg}")

def print_error(msg: str):
    print(f"{Colors.RED}✗{Colors.END} {msg}")

def print_warning(msg: str):
    print(f"{Colors.YELLOW}⚠{Colors.END} {msg}")

def print_info(msg: str):
    print(f"{Colors.BLUE}ℹ{Colors.END} {msg}")

def print_header(msg: str):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{msg}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")

def test_endpoint(method: str, url: str, headers: Dict = None, data: Dict = None, expected_status: int = 200) -> Tuple[bool, str, int]:
    """Test an API endpoint"""
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, f"Unknown method: {method}", 0
        
        if response.status_code == expected_status:
            return True, "OK", response.status_code
        else:
            error_msg = f"Expected {expected_status}, got {response.status_code}"
            try:
                error_data = response.json()
                if 'error' in error_data:
                    error_msg += f": {error_data['error']}"
            except:
                error_msg += f": {response.text[:100]}"
            return False, error_msg, response.status_code
    except requests.exceptions.RequestException as e:
        return False, str(e), 0

def login() -> Tuple[bool, str]:
    """Login and get access token"""
    print_info("Attempting to login...")
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access_token')
            if access_token:
                print_success(f"Login successful as {TEST_USERNAME}")
                return True, access_token
            else:
                print_error("Login response missing access_token")
                return False, ""
        else:
            error_msg = f"Login failed: {response.status_code}"
            try:
                error_data = response.json()
                if 'error' in error_data:
                    error_msg += f" - {error_data['error']}"
            except:
                error_msg += f" - {response.text[:100]}"
            print_error(error_msg)
            return False, ""
    except Exception as e:
        print_error(f"Login exception: {str(e)}")
        return False, ""

def test_health_check():
    """Test health check endpoint"""
    print_header("Health Check")
    success, msg, status = test_endpoint('GET', f"{BASE_URL}/health")
    if success:
        print_success(f"Health check: {msg} ({status})")
    else:
        print_error(f"Health check failed: {msg}")
    return success

def test_auth_endpoints(token: str):
    """Test authentication endpoints"""
    print_header("Authentication Endpoints")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ('GET', f"{API_BASE}/auth/user", headers, None, 200),
    ]
    
    results = []
    for method, url, hdrs, data, expected in endpoints:
        success, msg, status = test_endpoint(method, url, hdrs, data, expected)
        endpoint_name = url.split('/')[-1]
        if success:
            print_success(f"{endpoint_name}: {msg}")
        else:
            print_error(f"{endpoint_name}: {msg}")
        results.append(success)
    
    return all(results)

def test_watchlist_endpoints(token: str):
    """Test watchlist endpoints"""
    print_header("Watchlist Endpoints")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ('GET', f"{API_BASE}/watchlist", headers, None, 200),
        ('GET', f"{API_BASE}/watchlist/quote/AAPL", headers, None, 200),
        ('GET', f"{API_BASE}/watchlist/quote/HOOD", headers, None, 200),
        ('POST', f"{API_BASE}/watchlist/refresh", headers, None, 200),
    ]
    
    results = []
    for method, url, hdrs, data, expected in endpoints:
        success, msg, status = test_endpoint(method, url, hdrs, data, expected)
        endpoint_name = url.split('/')[-1] if '/' in url else url
        if success:
            print_success(f"{endpoint_name}: {msg}")
        else:
            print_error(f"{endpoint_name}: {msg} (Status: {status})")
        results.append(success)
    
    return all(results)

def test_options_endpoints(token: str):
    """Test options endpoints"""
    print_header("Options Endpoints")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ('GET', f"{API_BASE}/options/expirations/AAPL", headers, None, 200),
        ('GET', f"{API_BASE}/options/expirations/HOOD", headers, None, 200),
    ]
    
    results = []
    for method, url, hdrs, data, expected in endpoints:
        success, msg, status = test_endpoint(method, url, hdrs, data, expected)
        endpoint_name = url.split('/')[-2] + "/" + url.split('/')[-1]
        if success:
            print_success(f"{endpoint_name}: {msg}")
        else:
            print_error(f"{endpoint_name}: {msg} (Status: {status})")
        results.append(success)
    
    return all(results)

def test_trades_endpoints(token: str):
    """Test trades endpoints"""
    print_header("Trades Endpoints")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ('GET', f"{API_BASE}/trades/positions", headers, None, 200),
        ('GET', f"{API_BASE}/trades/history", headers, None, 200),
    ]
    
    results = []
    for method, url, hdrs, data, expected in endpoints:
        success, msg, status = test_endpoint(method, url, hdrs, data, expected)
        endpoint_name = url.split('/')[-1]
        if success:
            print_success(f"{endpoint_name}: {msg}")
        else:
            print_error(f"{endpoint_name}: {msg} (Status: {status})")
        results.append(success)
    
    return all(results)

def test_automations_endpoints(token: str):
    """Test automations endpoints"""
    print_header("Automations Endpoints")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ('GET', f"{API_BASE}/automations", headers, None, 200),
    ]
    
    results = []
    for method, url, hdrs, data, expected in endpoints:
        success, msg, status = test_endpoint(method, url, hdrs, data, expected)
        endpoint_name = url.split('/')[-1]
        if success:
            print_success(f"{endpoint_name}: {msg}")
        else:
            print_error(f"{endpoint_name}: {msg} (Status: {status})")
        results.append(success)
    
    return all(results)

def test_alerts_endpoints(token: str):
    """Test alerts endpoints"""
    print_header("Alerts Endpoints")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        ('GET', f"{API_BASE}/alerts", headers, None, 200),
    ]
    
    results = []
    for method, url, hdrs, data, expected in endpoints:
        success, msg, status = test_endpoint(method, url, hdrs, data, expected)
        endpoint_name = url.split('/')[-1]
        if success:
            print_success(f"{endpoint_name}: {msg}")
        else:
            print_error(f"{endpoint_name}: {msg} (Status: {status})")
        results.append(success)
    
    return all(results)

def test_frontend_pages():
    """Test frontend pages load correctly"""
    print_header("Frontend Pages")
    
    pages = [
        ('/', 'Home/Landing'),
        ('/login', 'Login'),
        ('/register', 'Register'),
        ('/dashboard', 'Dashboard'),
        ('/trade', 'Trade'),
        ('/options-analyzer', 'Options Analyzer'),
        ('/watchlist', 'Watchlist'),
        ('/automations', 'Automations'),
        ('/alerts', 'Alerts'),
        ('/history', 'History'),
        ('/settings', 'Settings'),
    ]
    
    results = []
    for path, name in pages:
        try:
            response = requests.get(f"{BASE_URL}{path}", timeout=10, allow_redirects=True)
            if response.status_code in [200, 302, 401]:  # 401 is OK for protected pages
                print_success(f"{name} ({path}): Loads correctly")
                results.append(True)
            else:
                print_error(f"{name} ({path}): Status {response.status_code}")
                results.append(False)
        except Exception as e:
            print_error(f"{name} ({path}): {str(e)}")
            results.append(False)
    
    return all(results)

def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("="*60)
    print("IAB OptionsBot - Comprehensive Page/Endpoint Test")
    print("="*60)
    print(f"{Colors.END}\n")
    
    print_info(f"Testing against: {BASE_URL}")
    print_info(f"Test user: {TEST_USERNAME}")
    print()
    
    all_results = []
    
    # Test health check (no auth required)
    all_results.append(test_health_check())
    
    # Test frontend pages (no auth required)
    all_results.append(test_frontend_pages())
    
    # Login to get token
    login_success, token = login()
    
    if not login_success:
        print_warning("Cannot test authenticated endpoints without login")
        print_warning("Please create a test user or update TEST_USERNAME/TEST_PASSWORD")
        print()
    else:
        # Test authenticated endpoints
        all_results.append(test_auth_endpoints(token))
        all_results.append(test_watchlist_endpoints(token))
        all_results.append(test_options_endpoints(token))
        all_results.append(test_trades_endpoints(token))
        all_results.append(test_automations_endpoints(token))
        all_results.append(test_alerts_endpoints(token))
    
    # Summary
    print_header("Test Summary")
    passed = sum(all_results)
    total = len(all_results)
    
    if passed == total:
        print_success(f"All tests passed! ({passed}/{total})")
        return 0
    else:
        print_error(f"Some tests failed: {passed}/{total} passed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

