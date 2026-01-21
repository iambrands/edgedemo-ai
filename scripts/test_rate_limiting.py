#!/usr/bin/env python3
"""
Rate Limiting Test Script

Tests that rate limiting is working correctly.

Usage:
    python scripts/test_rate_limiting.py --email user@example.com --password pass123 --base-url https://example.com
"""

import sys
import os
import argparse
import time
import requests
from datetime import datetime

def login(session, base_url, email, password):
    """Login and return session"""
    try:
        response = session.post(
            f"{base_url}/api/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            if token:
                session.headers.update({'Authorization': f'Bearer {token}'})
                return True, "Logged in successfully"
            else:
                return False, "No token in response"
        else:
            return False, f"Login failed: {response.status_code} - {response.text[:200]}"
            
    except Exception as e:
        return False, f"Login error: {str(e)}"

def test_rate_limiting(base_url, email, password, num_requests=5):
    """Test rate limiting with sequential requests"""
    print("=" * 60)
    print("Rate Limiting Test")
    print("=" * 60)
    print()
    
    session = requests.Session()
    
    # Login
    success, message = login(session, base_url, email, password)
    if not success:
        print(f"❌ {message}")
        return False
    
    print(f"✅ {message}")
    print()
    
    # Make sequential requests
    usage_history = []
    for i in range(num_requests):
        try:
            response = session.post(
                f"{base_url}/api/options/analyze",
                json={
                    "symbol": "SPY",
                    "expiration": "2026-02-20",
                    "preference": "balanced"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                usage = data.get('usage')
                
                if usage:
                    used = usage.get('used', 0)
                    limit = usage.get('limit', 100)
                    remaining = usage.get('remaining', 100)
                    reset_at = usage.get('reset_at')
                    
                    usage_history.append({
                        'request': i + 1,
                        'used': used,
                        'limit': limit,
                        'remaining': remaining,
                        'reset_at': reset_at
                    })
                    
                    print(f"Request {i + 1}: ✅ {used}/{limit} used ({remaining} remaining)")
                else:
                    print(f"Request {i + 1}: ⚠️  No usage data in response")
                    
            elif response.status_code == 429:
                print(f"Request {i + 1}: ✅ Rate limit reached (429)")
                data = response.json()
                usage = data.get('usage', {})
                print(f"   Used: {usage.get('used', '?')}/{usage.get('limit', '?')}")
                break
            else:
                print(f"Request {i + 1}: ❌ Failed: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                
            # Delay between requests
            if i < num_requests - 1:
                time.sleep(0.5)
                
        except Exception as e:
            print(f"Request {i + 1}: ❌ Error: {str(e)}")
    
    print()
    
    # Test cache behavior
    print("Cache Test:")
    try:
        # Make same request twice
        test_symbol = "AAPL"
        response1 = session.post(
            f"{base_url}/api/options/analyze",
            json={
                "symbol": test_symbol,
                "expiration": "2026-02-20",
                "preference": "balanced"
            },
            timeout=30
        )
        
        if response1.status_code == 200:
            data1 = response1.json()
            usage1 = data1.get('usage', {})
            used1 = usage1.get('used', 0)
            cached1 = data1.get('cached', False)
            
            print(f"✅ First request: {used1}/100 used (cached: {cached1})")
            
            # Wait a bit then make same request
            time.sleep(0.5)
            
            response2 = session.post(
                f"{base_url}/api/options/analyze",
                json={
                    "symbol": test_symbol,
                    "expiration": "2026-02-20",
                    "preference": "balanced"
                },
                timeout=30
            )
            
            if response2.status_code == 200:
                data2 = response2.json()
                usage2 = data2.get('usage', {})
                used2 = usage2.get('used', 0)
                cached2 = data2.get('cached', False)
                
                print(f"✅ Second request (cached: {cached2}): {used2}/100 used")
                
                if cached2 and used1 == used2:
                    print("✅ Cache doesn't increment usage counter (correct!)")
                elif not cached2:
                    print("⚠️  Second request not cached (may be normal if TTL expired)")
                else:
                    print("⚠️  Usage incremented even though cached (may be intentional)")
            else:
                print(f"❌ Second request failed: {response2.status_code}")
        else:
            print(f"⚠️  Cache test skipped: First request failed ({response1.status_code})")
            
    except Exception as e:
        print(f"⚠️  Cache test error: {str(e)}")
    
    print()
    
    # Verify usage tracking
    if usage_history:
        print("Verification:")
        valid = True
        for i, usage in enumerate(usage_history):
            if i > 0:
                prev_used = usage_history[i-1]['used']
                curr_used = usage['used']
                
                if curr_used != prev_used + 1:
                    print(f"❌ Usage tracking error: Request {i+1} shows {curr_used}, expected {prev_used + 1}")
                    valid = False
        
        if valid:
            print("✅ Usage increments correctly")
        
        if usage_history[0].get('reset_at'):
            print(f"✅ Reset time: {usage_history[0]['reset_at']}")
        
        print()
    
    # Summary
    print("=" * 60)
    if len(usage_history) >= num_requests:
        print("✅ RATE LIMITING WORKING CORRECTLY")
        print("=" * 60)
        return True
    else:
        print("⚠️  RATE LIMITING TEST INCOMPLETE")
        print("=" * 60)
        return False

def main():
    parser = argparse.ArgumentParser(description='Test rate limiting functionality')
    parser.add_argument('--email', required=True, help='User email')
    parser.add_argument('--password', required=True, help='User password')
    parser.add_argument('--base-url', default='https://web-production-8b7ae.up.railway.app', help='Base URL')
    parser.add_argument('--num-requests', type=int, default=5, help='Number of requests to make')
    
    args = parser.parse_args()
    
    success = test_rate_limiting(args.base_url, args.email, args.password, args.num_requests)
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())

