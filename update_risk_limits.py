#!/usr/bin/env python3
"""
Quick script to update risk limits for existing users
Sets daily loss limit to 50% for paper trading
"""
import sys
import os
from app import create_app
from models.risk_limits import RiskLimits
from models.user import User

app = create_app()

with app.app_context():
    db = app.extensions['sqlalchemy']
    
    # Get all users
    users = db.session.query(User).all()
    
    if not users:
        print("No users found in database.")
        sys.exit(1)
    
    print("🔧 Updating Risk Limits for Paper Trading")
    print("=" * 60)
    
    updated = 0
    for user in users:
        risk_limits = db.session.query(RiskLimits).filter_by(user_id=user.id).first()
        
        if not risk_limits:
            print(f"\n⚠️  User {user.username} has no risk limits, creating...")
            from services.risk_manager import RiskManager
            risk_manager = RiskManager()
            risk_limits = risk_manager.get_risk_limits(user.id)
        
        old_limit = risk_limits.max_daily_loss_percent
        risk_limits.max_daily_loss_percent = 50.0  # Set to 50% for paper trading
        
        db.session.commit()
        
        print(f"✅ {user.username}: {old_limit}% → 50% daily loss limit")
        updated += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Updated {updated} user(s)")
    print("\n💡 You can now trade without hitting the daily loss limit!")
    print("   (50% of $100k = $50,000 daily loss limit)")


