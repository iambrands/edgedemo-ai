#!/usr/bin/env python3
"""Check if database migration has been applied"""

import sys
import os

# Force immediate output (no buffering)
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("\n" + "=" * 60, file=sys.stderr, flush=True)
print("STARTING DATABASE CHECK SCRIPT", file=sys.stderr, flush=True)
print("=" * 60 + "\n", file=sys.stderr, flush=True)

from app import create_app, db
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    from models.user import User
    
    print("=" * 60, file=sys.stderr, flush=True)
    print("DATABASE MIGRATION STATUS CHECK", file=sys.stderr, flush=True)
    print("=" * 60, file=sys.stderr, flush=True)
    
    # Check users table
    try:
        inspector = inspect(db.engine)
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        print(f"\n✅ Users table exists", file=sys.stderr, flush=True)
        print(f"   Total columns: {len(user_columns)}", file=sys.stderr, flush=True)
        print(f"   Has daily_ai_analyses: {'daily_ai_analyses' in user_columns}", file=sys.stderr, flush=True)
        print(f"   Has last_analysis_reset: {'last_analysis_reset' in user_columns}", file=sys.stderr, flush=True)
        
        if 'daily_ai_analyses' in user_columns and 'last_analysis_reset' in user_columns:
            print("\n🎉 RATE LIMITING FIELDS EXIST - Migration was successful!", file=sys.stderr, flush=True)
        else:
            print("\n⚠️  Rate limiting fields missing - Migration needs to run", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"\n❌ Error checking users table: {e}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # Check spreads table
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        if 'spreads' in tables:
            spread_columns = [c['name'] for c in inspector.get_columns('spreads')]
            print(f"\n✅ Spreads table exists", file=sys.stderr, flush=True)
            print(f"   Total columns: {len(spread_columns)}", file=sys.stderr, flush=True)
            print(f"   Columns: {', '.join(spread_columns[:5])}...", file=sys.stderr, flush=True)
        else:
            print(f"\n⚠️  Spreads table doesn't exist yet", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"\n⚠️  Could not check spreads table: {e}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # Check migration version
    try:
        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.fetchone()
            if version:
                print(f"\n📊 Current migration version: {version[0]}", file=sys.stderr, flush=True)
            else:
                print(f"\n⚠️  No migration version found", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"\n⚠️  Could not check migration version: {e}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    print("\n" + "=" * 60, file=sys.stderr, flush=True)
    print("CHECK COMPLETE", file=sys.stderr, flush=True)
    print("=" * 60 + "\n", file=sys.stderr, flush=True)

