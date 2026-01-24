#!/usr/bin/env python3
"""
Test Finnhub API connection and endpoints
Run this script to diagnose Finnhub integration issues.

Usage:
    python scripts/test_finnhub.py
    
Or with Railway CLI:
    railway run python scripts/test_finnhub.py
"""
import os
import sys
import requests
from datetime import datetime, timedelta

# Try to load dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def test_api_key():
    """Test if API key is accessible"""
    api_key = os.getenv('FINNHUB_API_KEY')
    
    print("=" * 50)
    print("FINNHUB API KEY CHECK")
    print("=" * 50)
    
    if not api_key:
        print("❌ FINNHUB_API_KEY not found in environment")
        print("\nTo fix:")
        print("  1. Check Railway dashboard -> Variables tab")
        print("  2. Add: FINNHUB_API_KEY=your_api_key")
        print("  3. Redeploy the application")
        return None
    
    print(f"✅ API Key present: Yes")
    print(f"   First 8 chars: {api_key[:8]}...")
    print(f"   Key length: {len(api_key)} characters")
    
    return api_key


def test_economic_calendar(api_key: str):
    """Test economic calendar endpoint"""
    print("\n" + "=" * 50)
    print("ECONOMIC CALENDAR TEST")
    print("=" * 50)
    
    url = "https://finnhub.io/api/v1/calendar/economic"
    from_date = datetime.now().strftime('%Y-%m-%d')
    to_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    
    params = {
        'token': api_key,
        'from': from_date,
        'to': to_date
    }
    
    print(f"URL: {url}")
    print(f"Date range: {from_date} to {to_date}")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            events = data.get('economicCalendar', [])
            
            print(f"✅ Economic calendar API call successful!")
            print(f"   Total events: {len(events)}")
            
            # Count by impact
            high_impact = [e for e in events if e.get('impact') == 'high']
            medium_impact = [e for e in events if e.get('impact') == 'medium']
            low_impact = [e for e in events if e.get('impact') == 'low']
            
            print(f"   High impact: {len(high_impact)}")
            print(f"   Medium impact: {len(medium_impact)}")
            print(f"   Low impact: {len(low_impact)}")
            
            if events:
                print("\nSample events (first 5):")
                for event in events[:5]:
                    impact = event.get('impact', 'N/A')
                    country = event.get('country', 'N/A')
                    name = event.get('event', 'Unknown')
                    time = event.get('time', 'N/A')
                    print(f"  [{impact.upper():6}] {country}: {name} @ {time}")
            
            return True
            
        elif response.status_code == 403:
            print("❌ API key invalid or unauthorized")
            print(f"   Response: {response.text[:200]}")
            print("\nTo fix: Get a valid API key from https://finnhub.io/dashboard")
            return False
            
        elif response.status_code == 429:
            print("❌ Rate limit exceeded (free tier: 60 calls/minute)")
            print("   Wait a minute and try again, or implement caching")
            return False
            
        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out (Finnhub may be slow)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_earnings_calendar(api_key: str):
    """Test earnings calendar endpoint"""
    print("\n" + "=" * 50)
    print("EARNINGS CALENDAR TEST")
    print("=" * 50)
    
    url = "https://finnhub.io/api/v1/calendar/earnings"
    from_date = datetime.now().strftime('%Y-%m-%d')
    to_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    
    params = {
        'token': api_key,
        'from': from_date,
        'to': to_date
    }
    
    print(f"URL: {url}")
    print(f"Date range: {from_date} to {to_date}")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            events = data.get('earningsCalendar', [])
            
            print(f"✅ Earnings calendar API call successful!")
            print(f"   Total earnings: {len(events)}")
            
            if events:
                print("\nSample earnings (first 5):")
                for event in events[:5]:
                    symbol = event.get('symbol', 'N/A')
                    date_str = event.get('date', 'N/A')
                    eps_est = event.get('epsEstimate', 'N/A')
                    print(f"  {symbol}: {date_str} (EPS Est: {eps_est})")
            
            return True
        else:
            print(f"❌ API call failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_single_stock_earnings(api_key: str, symbol: str = 'AAPL'):
    """Test earnings for a single stock"""
    print("\n" + "=" * 50)
    print(f"SINGLE STOCK EARNINGS TEST ({symbol})")
    print("=" * 50)
    
    url = "https://finnhub.io/api/v1/calendar/earnings"
    params = {
        'symbol': symbol,
        'token': api_key
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            events = data.get('earningsCalendar', [])
            
            print(f"✅ Single stock earnings API call successful!")
            print(f"   Earnings events for {symbol}: {len(events)}")
            
            if events:
                # Find next upcoming
                today = datetime.now().date()
                upcoming = None
                for e in events:
                    try:
                        earnings_date = datetime.strptime(e.get('date', ''), '%Y-%m-%d').date()
                        if earnings_date >= today:
                            upcoming = e
                            break
                    except:
                        pass
                
                if upcoming:
                    print(f"\n   Next earnings for {symbol}:")
                    print(f"     Date: {upcoming.get('date')}")
                    print(f"     Quarter: {upcoming.get('quarter')}")
                    print(f"     EPS Estimate: {upcoming.get('epsEstimate')}")
                else:
                    print(f"   No upcoming earnings found for {symbol}")
            
            return True
        else:
            print(f"❌ API call failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("   FINNHUB API DIAGNOSTIC TEST")
    print("=" * 60)
    
    # Test 1: Check API key
    api_key = test_api_key()
    if not api_key:
        print("\n❌ Cannot proceed without API key")
        sys.exit(1)
    
    # Test 2: Economic calendar
    economic_ok = test_economic_calendar(api_key)
    
    # Test 3: Earnings calendar
    earnings_ok = test_earnings_calendar(api_key)
    
    # Test 4: Single stock
    single_ok = test_single_stock_earnings(api_key, 'AAPL')
    
    # Summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    all_passed = all([economic_ok, earnings_ok, single_ok])
    
    if all_passed:
        print("✅ All tests passed! Finnhub API is working correctly.")
    else:
        print("⚠️  Some tests failed:")
        if not economic_ok:
            print("   - Economic calendar failed")
        if not earnings_ok:
            print("   - Earnings calendar failed")
        if not single_ok:
            print("   - Single stock earnings failed")
        
        print("\nCommon fixes:")
        print("  1. Verify API key is correct at https://finnhub.io/dashboard")
        print("  2. Check rate limits (free tier: 60 calls/minute)")
        print("  3. Ensure FINNHUB_API_KEY is set in Railway variables")
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())
