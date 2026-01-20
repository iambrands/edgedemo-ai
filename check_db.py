#!/usr/bin/env python3
"""Check if database migration has been applied"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    from models.user import User
    
    print("=" * 60, flush=True)
    print("DATABASE MIGRATION STATUS CHECK", flush=True)
    print("=" * 60, flush=True)
    
    # Check users table
    try:
        inspector = inspect(db.engine)
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        print(f"\n✅ Users table exists", flush=True)
        print(f"   Total columns: {len(user_columns)}", flush=True)
        print(f"   Has daily_ai_analyses: {'daily_ai_analyses' in user_columns}", flush=True)
        print(f"   Has last_analysis_reset: {'last_analysis_reset' in user_columns}", flush=True)
        
        if 'daily_ai_analyses' in user_columns and 'last_analysis_reset' in user_columns:
            print("\n🎉 RATE LIMITING FIELDS EXIST - Migration was successful!", flush=True)
        else:
            print("\n⚠️  Rate limiting fields missing - Migration needs to run", flush=True)
    except Exception as e:
        print(f"\n❌ Error checking users table: {e}", flush=True)
        import traceback
        traceback.print_exc()
    
    # Check spreads table
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        if 'spreads' in tables:
            spread_columns = [c['name'] for c in inspector.get_columns('spreads')]
            print(f"\n✅ Spreads table exists", flush=True)
            print(f"   Total columns: {len(spread_columns)}", flush=True)
            print(f"   Columns: {', '.join(spread_columns[:5])}...", flush=True)
        else:
            print(f"\n⚠️  Spreads table doesn't exist yet", flush=True)
    except Exception as e:
        print(f"\n⚠️  Could not check spreads table: {e}", flush=True)
        import traceback
        traceback.print_exc()
    
    # Check migration version
    try:
        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.fetchone()
            if version:
                print(f"\n📊 Current migration version: {version[0]}", flush=True)
            else:
                print(f"\n⚠️  No migration version found", flush=True)
    except Exception as e:
        print(f"\n⚠️  Could not check migration version: {e}", flush=True)
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60, flush=True)
    print("CHECK COMPLETE", flush=True)
    print("=" * 60, flush=True)

