#!/usr/bin/env python3
"""
Create test user for Railway

Simple script to create a user directly in the database.
Can be run on Railway via shell or as a one-time script.

Usage on Railway:
    python scripts/create_user_railway.py
"""

import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.user import User
from app import db
import bcrypt

def create_user():
    """Create test user Kevin Celestine"""
    
    app = create_app()
    
    with app.app_context():
        # User details
        username = "kcelestine"
        email = "kdcelestine@yahoo.com"
        password = "CreateWealth2026$"
        
        print("=" * 60)
        print("Creating Test User - Kevin Celestine")
        print("=" * 60)
        print(f"Username: {username}")
        print(f"Email: {email}")
        print()
        
        try:
            # Check if user exists using raw SQL to avoid migration issues
            result = db.session.execute(
                db.text("SELECT id, username, password_hash FROM users WHERE email = :email"),
                {"email": email}
            ).fetchone()
            
            if result:
                user_id, existing_username, password_hash = result
                print(f"⚠️  User already exists!")
                print(f"   User ID: {user_id}")
                print(f"   Username: {existing_username}")
                
                # Verify password
                print("\nVerifying password...")
                if bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
                    print("✅ Password verification: SUCCESS")
                    print(f"\nLogin credentials:")
                    print(f"  Email/Username: {email} or {existing_username}")
                    print(f"  Password: {password}")
                    print("=" * 60)
                    return True
                else:
                    # Update password
                    print("❌ Password does not match - updating...")
                    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    db.session.execute(
                        db.text("UPDATE users SET password_hash = :hash WHERE email = :email"),
                        {"hash": hashed, "email": email}
                    )
                    db.session.commit()
                    print("✅ Password updated!")
                    
                    # Verify again
                    if bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8')):
                        print("✅ Password verification: SUCCESS")
                        print(f"\nLogin credentials:")
                        print(f"  Email/Username: {email} or {existing_username}")
                        print(f"  Password: {password}")
                        print("=" * 60)
                        return True
                    else:
                        print("❌ Password verification failed after update")
                        return False
            else:
                # Create new user using raw SQL
                print("Creating new user...")
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                now = datetime.utcnow()
                
                # Insert user (skip rate limiting columns if they don't exist)
                try:
                    db.session.execute(
                        db.text("""
                            INSERT INTO users (username, email, password_hash, created_at, updated_at, 
                                             default_strategy, risk_tolerance, notification_enabled, 
                                             trading_mode, paper_balance)
                            VALUES (:username, :email, :password_hash, :created_at, :updated_at,
                                    :strategy, :risk, :notif, :mode, :balance)
                        """),
                        {
                            "username": username,
                            "email": email,
                            "password_hash": hashed,
                            "created_at": now,
                            "updated_at": now,
                            "strategy": "balanced",
                            "risk": "moderate",
                            "notif": True,
                            "mode": "paper",
                            "balance": 100000.0
                        }
                    )
                    db.session.commit()
                    
                    # Get created user
                    user_result = db.session.execute(
                        db.text("SELECT id, username FROM users WHERE email = :email"),
                        {"email": email}
                    ).fetchone()
                    
                    if user_result:
                        user_id, created_username = user_result
                        print("✅ User created successfully!")
                        print(f"   User ID: {user_id}")
                        print(f"   Username: {created_username}")
                        
                        # Verify password
                        if bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8')):
                            print("✅ Password verification: SUCCESS")
                            print(f"\nLogin credentials:")
                            print(f"  Email/Username: {email} or {created_username}")
                            print(f"  Password: {password}")
                            print("=" * 60)
                            return True
                        else:
                            print("❌ Password verification failed")
                            return False
                    else:
                        print("❌ User created but could not verify")
                        return False
                        
                except Exception as e:
                    db.session.rollback()
                    print(f"❌ Error creating user: {e}")
                    import traceback
                    traceback.print_exc()
                    return False
                    
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = create_user()
    sys.exit(0 if success else 1)

