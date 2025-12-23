#!/usr/bin/env python3
"""
Quick script to revert incorrect SELL trades from 12/23/25
This can be run directly on the production server or locally if connected to production DB
"""

import requests
import json
import sys

def revert_trades_via_api(base_url, token):
    """Call the API endpoint to revert trades"""
    url = f"{base_url}/api/trades/revert-incorrect-sells"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "date": "2025-12-23"
    }
    
    print("=" * 80)
    print("REVERTING INCORRECT SELL TRADES VIA API")
    print("=" * 80)
    print(f"URL: {url}")
    print(f"Date: {data['date']}")
    print()
    
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        print()
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print()
            print(f"Trades reverted: {result.get('reverted', 0)}")
            print(f"Positions reopened: {result.get('positions_reopened', 0)}")
            print()
            
            if result.get('trade_ids'):
                print("Reverted Trade IDs:")
                for tid in result['trade_ids']:
                    print(f"  - {tid}")
            print()
            
            if result.get('position_ids'):
                print("Reopened Position IDs:")
                for pid in result['position_ids']:
                    print(f"  - {pid}")
            print()
            
            if result.get('balance_adjustments'):
                print("Balance Adjustments:")
                for user_id, adj in result['balance_adjustments'].items():
                    print(f"  - User {user_id}: ${adj:.2f}")
            
            return True
        else:
            print("❌ ERROR!")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error calling API: {e}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python revert_trades_now.py <base_url> <auth_token>")
        print()
        print("Example:")
        print("  python revert_trades_now.py https://web-production-8b7ae.up.railway.app YOUR_TOKEN")
        print()
        print("To get your token:")
        print("  1. Log into the app")
        print("  2. Open browser DevTools (F12)")
        print("  3. Go to Application/Storage > Local Storage")
        print("  4. Copy the 'access_token' value")
        sys.exit(1)
    
    base_url = sys.argv[1]
    token = sys.argv[2]
    
    revert_trades_via_api(base_url, token)

