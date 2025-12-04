#!/usr/bin/env python3
"""
One-time script to update max_dte for existing users to 90 days
"""

import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from models.risk_limits import RiskLimits

def update_max_dte():
    """Update max_dte to 90 for all existing risk limits"""
    app = create_app()
    
    with app.app_context():
        # Get all risk limits
        all_limits = RiskLimits.query.all()
        
        print(f"Found {len(all_limits)} risk limit records")
        print("=" * 60)
        
        updated_count = 0
        for risk_limits in all_limits:
            if risk_limits.max_dte and risk_limits.max_dte < 90:
                old_max_dte = risk_limits.max_dte
                risk_limits.max_dte = 90
                updated_count += 1
                print(f"Updated user {risk_limits.user_id}: max_dte {old_max_dte} -> 90")
            else:
                print(f"Skipped user {risk_limits.user_id}: max_dte already {risk_limits.max_dte}")
        
        if updated_count > 0:
            db.session.commit()
            print(f"\n✅ Updated {updated_count} risk limit records")
        else:
            print("\n✅ No updates needed - all max_dte values are already 90 or higher")
        
        print("=" * 60)

if __name__ == '__main__':
    update_max_dte()

