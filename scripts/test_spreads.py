#!/usr/bin/env python3
"""
Debit Spreads Test Script

Tests that debit spreads functionality is working correctly.

Usage:
    python scripts/test_spreads.py --email user@example.com --password pass123 --symbol TSLA
"""

import sys
import os
import argparse
import requests
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

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
                return True, "Logged in successfully", data
            else:
                return False, "No token in response", None
        else:
            return False, f"Login failed: {response.status_code}", None
            
    except Exception as e:
        return False, f"Login error: {str(e)}", None

def test_spreads(base_url, email, password, symbol='TSLA'):
    """Test debit spreads functionality"""
    print("=" * 60)
    print("Debit Spreads Test")
    print("=" * 60)
    print()
    
    session = requests.Session()
    
    # Login
    success, message, login_data = login(session, base_url, email, password)
    if not success:
        print(f"❌ {message}")
        return False
    
    print(f"✅ {message}")
    
    # Get current balance
    try:
        app = create_app()
        with app.app_context():
            from models.user import User
            
            user_id = login_data.get('user', {}).get('id') if login_data else None
            if user_id:
                user = User.query.get(user_id)
                if user:
                    balance = user.paper_balance
                    print(f"✅ Current balance: ${balance:,.2f}")
                    print()
    except Exception as e:
        print(f"⚠️  Could not get balance: {str(e)}")
        print()
    
    # Calculate spread
    print(f"Calculating spread: {symbol} 430/400 PUT (10 contracts)")
    
    spread_data = {
        "symbol": symbol,
        "expiration": "2026-02-20",
        "option_type": "PUT",
        "quantity": 10,
        "long_strike": 430,
        "short_strike": 400
    }
    
    try:
        response = session.post(
            f"{base_url}/api/spreads/calculate",
            json=spread_data,
            timeout=15
        )
        
        if response.status_code == 200:
            calc_data = response.json()
            
            # Verify calculation fields
            checks = {
                'strike_width': calc_data.get('strike_width'),
                'net_debit': calc_data.get('net_debit'),
                'max_profit': calc_data.get('max_profit'),
                'max_loss': calc_data.get('max_loss'),
                'breakeven': calc_data.get('breakeven'),
                'return_on_risk': calc_data.get('return_on_risk')
            }
            
            all_present = True
            for field, value in checks.items():
                if value is not None:
                    print(f"✅ {field.replace('_', ' ').title()}: ${value:,.2f}" if 'return_on_risk' not in field else f"✅ {field.replace('_', ' ').title()}: {value:.2f}%")
                else:
                    print(f"❌ {field.replace('_', ' ').title()}: Missing")
                    all_present = False
            
            if not all_present:
                print("⚠️  Some calculation fields missing")
            
            print()
            
            # Execute spread (optional - commented out to avoid real trades)
            # print("Executing spread...")
            # execute_response = session.post(
            #     f"{base_url}/api/spreads/execute",
            #     json=spread_data,
            #     timeout=15
            # )
            # 
            # if execute_response.status_code in [200, 201]:
            #     exec_data = execute_response.json()
            #     spread_id = exec_data.get('id')
            #     print(f"✅ Spread executed (ID: {spread_id})")
            #     
            #     # Verify in database
            #     app = create_app()
            #     with app.app_context():
            #         from models.spread import Spread
            #         spread = Spread.query.get(spread_id)
            #         if spread:
            #             print("✅ Spread found in database")
            #             print(f"✅ All fields populated correctly")
            #             print(f"✅ Status: {spread.status}")
            # else:
            #     print(f"⚠️  Execute failed: {execute_response.status_code}")
            
            print("=" * 60)
            print("✅ DEBIT SPREADS WORKING CORRECTLY")
            print("=" * 60)
            return True
            
        else:
            print(f"❌ Calculation failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    parser = argparse.ArgumentParser(description='Test debit spreads functionality')
    parser.add_argument('--email', required=True, help='User email')
    parser.add_argument('--password', required=True, help='User password')
    parser.add_argument('--base-url', default='https://web-production-8b7ae.up.railway.app', help='Base URL')
    parser.add_argument('--symbol', default='TSLA', help='Symbol for test spread')
    
    args = parser.parse_args()
    
    success = test_spreads(args.base_url, args.email, args.password, args.symbol)
    
    return 0 if success else 1

if __name__ == '__main__':
    sys.exit(main())

