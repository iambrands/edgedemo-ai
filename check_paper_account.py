#!/usr/bin/env python3
"""Check paper trading account balance"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    # Find all users with paper trading
    users = User.query.filter_by(trading_mode='paper').all()
    
    if not users:
        print("❌ No paper trading users found!")
        print("Creating default paper trading user...")
        
        # This would require more setup, so just report
        print("   Please create a user first, then set trading_mode='paper'")
    else:
        print("Paper Trading Users:")
        print("=" * 80)
        for user in users:
            print(f"User ID: {user.id}")
            print(f"Username: {user.username}")
            print(f"Email: {user.email}")
            print(f"Trading Mode: {user.trading_mode}")
            print(f"Paper Balance: ${user.paper_balance:,.2f}")
            print(f"Status: {'❌ NEGATIVE!' if user.paper_balance < 0 else '✅ Positive'}")
            print()
            
            if user.paper_balance < 0:
                print("⚠️  FIXING NEGATIVE BALANCE...")
                original_balance = user.paper_balance
                user.paper_balance = 100000.00
                db.session.commit()
                print(f"✅ Reset from ${original_balance:,.2f} to $100,000.00")
                print()
        
        print("=" * 80)

