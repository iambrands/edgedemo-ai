#!/usr/bin/env python3
"""
Create and test user credentials

Creates Kevin Celestine user and verifies login works.

Usage:
    python scripts/create_and_test_user.py
"""

import requests
import json
import sys

# Railway production URL
BASE_URL = "https://web-production-8b7ae.up.railway.app"

def create_user():
    """Create user via registration API"""
    print("=" * 60)
    print("Creating User - Kevin Celestine")
    print("=" * 60)
    
    user_data = {
        "username": "kcelestine",
        "email": "kdcelestine@yahoo.com",
        "password": "CreateWealth2026$"
    }
    
    print(f"Username: {user_data['username']}")
    print(f"Email: {user_data['email']}")
    print()
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json=user_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 201:
            data = response.json()
            print("✅ User created successfully!")
            print(f"   User ID: {data.get('user', {}).get('id')}")
            print(f"   Username: {data.get('user', {}).get('username')}")
            print(f"   Email: {data.get('user', {}).get('email')}")
            return True
        elif response.status_code == 400:
            error = response.json().get('error', 'Unknown error')
            if 'already exists' in error.lower():
                print(f"⚠️  User already exists: {error}")
                print("   Proceeding to test login...")
                return True  # Continue to login test
            else:
                print(f"❌ Registration failed: {error}")
                return False
        else:
            print(f"❌ Registration failed: Status {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error connecting to server: {e}")
        return False

def test_login():
    """Test login credentials"""
    print()
    print("=" * 60)
    print("Testing Login Credentials")
    print("=" * 60)
    
    # Try both username and email for login
    login_attempts = [
        {"username": "kcelestine", "password": "CreateWealth2026$"},  # Try username first
        {"username": "kdcelestine@yahoo.com", "password": "CreateWealth2026$"}  # Then email
    ]
    
    for attempt_num, login_data in enumerate(login_attempts, 1):
        print(f"Attempt {attempt_num}: Using {login_data['username']}")
        print(f"Password: {'*' * len(login_data['password'])}")
        print()
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Login successful!")
                print(f"   Message: {data.get('message')}")
                
                user = data.get('user', {})
                print(f"   User ID: {user.get('id')}")
                print(f"   Username: {user.get('username')}")
                print(f"   Email: {user.get('email')}")
                
                if data.get('access_token'):
                    print(f"   Access Token: ✅ Present ({len(data['access_token'])} chars)")
                if data.get('refresh_token'):
                    print(f"   Refresh Token: ✅ Present ({len(data['refresh_token'])} chars)")
                
                print()
                print("=" * 60)
                print("✅ Credentials verified and working!")
                print("=" * 60)
                print()
                print("Login Credentials:")
                print(f"  Email/Username: kdcelestine@yahoo.com or kcelestine")
                print(f"  Password: CreateWealth2026$")
                print("=" * 60)
                return True
            elif response.status_code == 401:
                error = response.json().get('error', 'Invalid credentials')
                if attempt_num < len(login_attempts):
                    print(f"⚠️  Login failed with {login_data['username']}: {error}")
                    print("   Trying next method...")
                    print()
                    continue
                else:
                    print(f"❌ Login failed: {error}")
                    print("   Password may be incorrect or user doesn't exist")
                    return False
            else:
                print(f"❌ Login failed: Status {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                if attempt_num < len(login_attempts):
                    print("   Trying next method...")
                    print()
                    continue
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error connecting to server: {e}")
            if attempt_num < len(login_attempts):
                print("   Trying next method...")
                print()
                continue
            return False
    
    return False

def main():
    """Main function"""
    print()
    print("🔐 Creating and Testing User Credentials")
    print(f"Target: {BASE_URL}")
    print()
    
    # Try to create user (may already exist)
    user_created = create_user()
    
    # Always test login
    login_success = test_login()
    
    if login_success:
        print()
        print("✅ SUCCESS: User credentials are working!")
        return 0
    else:
        print()
        print("❌ FAILED: Could not verify credentials")
        return 1

if __name__ == '__main__':
    sys.exit(main())
