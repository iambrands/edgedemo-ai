#!/usr/bin/env python3
"""
Create test user script

Creates a test user with the specified credentials.

Usage:
    python scripts/create_test_user.py
"""

import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.user import User

def create_test_user():
    """Create test user Kevin Celestine"""
    
    app = create_app()
    
    with app.app_context():
        from app import db
        
        # User details
        username = "kcelestine"
        email = "kdcelestine@yahoo.com"
        password = "CreateWealth2026$"
        full_name = "Kevin Celestine"
        
        print("=" * 60)
        print("Creating Test User")
        print("=" * 60)
        print(f"Username: {username}")
        print(f"Email: {email}")
        print(f"Name: {full_name}")
        print()
        
        # Check if user already exists (handle migration issues)
        try:
            existing_user = db.session.query(User).filter_by(email=email).first()
        except Exception as e:
            print(f"⚠️  Could not check existing users (database migration issue): {e}")
            existing_user = None
        
        if existing_user:
            print(f"⚠️  User with email {email} already exists!")
            print(f"   User ID: {existing_user.id}")
            print(f"   Username: {existing_user.username}")
            
            # Update password if requested
            response = input("\nUpdate password? (y/n): ").strip().lower()
            if response == 'y':
                existing_user.set_password(password)
                db.session.commit()
                print("✅ Password updated successfully!")
                
                # Verify password
                if existing_user.check_password(password):
                    print("✅ Password verification: SUCCESS")
                else:
                    print("❌ Password verification: FAILED")
                    return False
            else:
                # Just verify existing password
                print("\nVerifying existing password...")
                try:
                    if existing_user.check_password(password):
                        print("✅ Password verification: SUCCESS")
                        print("✅ User credentials are working!")
                        print(f"\nLogin credentials:")
                        print(f"  Email/Username: {email} or {existing_user.username}")
                        print(f"  Password: {password}")
                        return True
                    else:
                        print("❌ Password verification: FAILED")
                        print("   Password does not match")
                        return False
                except Exception as e:
                    print(f"❌ Error verifying password: {e}")
                    return False
            
            print("\n✅ User already exists and password updated/verified")
            return True
        
        # Check if username exists
        existing_username = User.query.filter_by(username=username).first()
        if existing_username:
            print(f"⚠️  Username '{username}' already exists!")
            # Try alternative username
            username = f"{username}{datetime.now().strftime('%Y%m%d')}"
            print(f"   Using alternative username: {username}")
        
        # Create new user
        try:
            user = User(
                username=username,
                email=email,
                default_strategy='balanced',
                risk_tolerance='moderate'
            )
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            print("✅ User created successfully!")
            print(f"   User ID: {user.id}")
            print(f"   Username: {user.username}")
            print(f"   Email: {user.email}")
            
            # Verify password
            print("\nVerifying password...")
            if user.check_password(password):
                print("✅ Password verification: SUCCESS")
                
                # Test login credentials
                print("\nTesting login credentials...")
                test_user = User.query.filter_by(email=email).first()
                if test_user and test_user.check_password(password):
                    print("✅ Login credentials verified: SUCCESS")
                    print("\n" + "=" * 60)
                    print("✅ User creation and verification complete!")
                    print("=" * 60)
                    print(f"\nLogin credentials:")
                    print(f"  Email/Username: {email} or {username}")
                    print(f"  Password: {password}")
                    print("=" * 60)
                    return True
                else:
                    print("❌ Login credentials verification: FAILED")
                    return False
            else:
                print("❌ Password verification: FAILED")
                return False
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating user: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = create_test_user()
    sys.exit(0 if success else 1)

