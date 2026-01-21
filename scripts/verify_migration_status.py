#!/usr/bin/env python3
"""
Verify Migration Status

Checks if migration has completed successfully by verifying
tables and columns exist in the database.

Usage:
    python scripts/verify_migration_status.py
"""

import sys
import os
from sqlalchemy import inspect

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

def verify_migration_status():
    """Verify that migration has completed successfully."""
    print("=" * 60)
    print("Migration Status Verification")
    print("=" * 60)
    print()
    
    app = create_app()
    
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            # Check spreads table
            print("Checking Spreads Table:")
            if 'spreads' in tables:
                print("✅ Spreads table exists")
                
                columns = [c['name'] for c in inspector.get_columns('spreads')]
                print(f"   Columns: {len(columns)} (expected: 21)")
                
                if len(columns) == 21:
                    print("   ✅ All columns present")
                else:
                    print(f"   ⚠️  Expected 21 columns, found {len(columns)}")
                    
                # Check indices
                indices = [idx['name'] for idx in inspector.get_indexes('spreads')]
                required_indices = [
                    'idx_spreads_user_id',
                    'idx_spreads_symbol',
                    'idx_spreads_status',
                    'idx_spreads_expiration',
                    'idx_spreads_created_at'
                ]
                
                print(f"   Indices: {len(indices)} (expected: 5+)")
                missing_indices = [idx for idx in required_indices if idx not in indices]
                if missing_indices:
                    print(f"   ⚠️  Missing indices: {missing_indices}")
                else:
                    print("   ✅ All required indices present")
            else:
                print("❌ Spreads table does NOT exist")
                print("   Migration may not have run yet")
            
            print()
            
            # Check users table for rate limiting fields
            print("Checking Users Table:")
            if 'users' in tables:
                print("✅ Users table exists")
                
                columns = [c['name'] for c in inspector.get_columns('users')]
                
                has_daily_ai_analyses = 'daily_ai_analyses' in columns
                has_last_analysis_reset = 'last_analysis_reset' in columns
                
                if has_daily_ai_analyses:
                    print("   ✅ daily_ai_analyses column exists")
                else:
                    print("   ❌ daily_ai_analyses column missing")
                
                if has_last_analysis_reset:
                    print("   ✅ last_analysis_reset column exists")
                else:
                    print("   ❌ last_analysis_reset column missing")
                
                if has_daily_ai_analyses and has_last_analysis_reset:
                    print("   ✅ Rate limiting fields present")
                else:
                    print("   ⚠️  Rate limiting fields missing")
            else:
                print("❌ Users table does NOT exist")
            
            print()
            print("=" * 60)
            
            # Overall status
            spreads_exists = 'spreads' in tables
            users_exists = 'users' in tables
            rate_limit_fields = False
            
            if users_exists:
                columns = [c['name'] for c in inspector.get_columns('users')]
                rate_limit_fields = (
                    'daily_ai_analyses' in columns and
                    'last_analysis_reset' in columns
                )
            
            if spreads_exists and users_exists and rate_limit_fields:
                print("✅ MIGRATION STATUS: COMPLETE")
                print()
                print("All required tables and columns exist.")
                print("Safe to remove migration from startup command.")
                print()
                print("Next steps:")
                print("1. Go to Railway dashboard")
                print("2. Update Custom Start Command to:")
                print("   gunicorn \"app:create_app()\"")
                print("3. Redeploy")
                print("=" * 60)
                return 0
            else:
                print("⚠️  MIGRATION STATUS: INCOMPLETE")
                print()
                if not spreads_exists:
                    print("❌ Spreads table missing")
                if not users_exists:
                    print("❌ Users table missing")
                if not rate_limit_fields:
                    print("❌ Rate limiting fields missing")
                print()
                print("Run migration before removing from startup:")
                print("  python migrate_direct.py")
                print("  OR")
                print("  Keep migration in startup command for now")
                print("=" * 60)
                return 1
                
        except Exception as e:
            print(f"❌ Error checking migration status: {str(e)}")
            import traceback
            traceback.print_exc()
            return 1

if __name__ == '__main__':
    sys.exit(verify_migration_status())

