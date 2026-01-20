#!/usr/bin/env python3
"""Run database migration and verify result"""

import sys
import os

# Force immediate output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60, file=sys.stderr, flush=True)
print("RUNNING DATABASE MIGRATION", file=sys.stderr, flush=True)
print("=" * 60, file=sys.stderr, flush=True)

from app import create_app, db
from flask_migrate import upgrade
from sqlalchemy import inspect, text

app = create_app()

with app.app_context():
    # Run migration
    try:
        print("📊 Running flask db upgrade...", file=sys.stderr, flush=True)
        upgrade()
        print("✅ Migration command completed", file=sys.stderr, flush=True)
    except Exception as e:
        print(f"❌ Migration failed: {e}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    
    # Verify migration result
    print("\n" + "=" * 60, file=sys.stderr, flush=True)
    print("VERIFYING MIGRATION RESULT", file=sys.stderr, flush=True)
    print("=" * 60, file=sys.stderr, flush=True)
    
    try:
        inspector = inspect(db.engine)
        
        # Check users table
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        has_rate_limit = 'daily_ai_analyses' in user_columns and 'last_analysis_reset' in user_columns
        
        print(f"\n✅ Users table: {len(user_columns)} columns", file=sys.stderr, flush=True)
        print(f"   daily_ai_analyses: {'✅' if 'daily_ai_analyses' in user_columns else '❌'}", file=sys.stderr, flush=True)
        print(f"   last_analysis_reset: {'✅' if 'last_analysis_reset' in user_columns else '❌'}", file=sys.stderr, flush=True)
        
        # Check spreads table
        tables = inspector.get_table_names()
        has_spreads = 'spreads' in tables
        
        if has_spreads:
            spread_columns = [c['name'] for c in inspector.get_columns('spreads')]
            print(f"\n✅ Spreads table: {len(spread_columns)} columns", file=sys.stderr, flush=True)
        else:
            print(f"\n❌ Spreads table: NOT FOUND", file=sys.stderr, flush=True)
        
        # Check migration version
        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.fetchone()
            print(f"\n📊 Migration version: {version[0] if version else 'UNKNOWN'}", file=sys.stderr, flush=True)
        
        # Final status
        print("\n" + "=" * 60, file=sys.stderr, flush=True)
        if has_rate_limit and has_spreads:
            print("🎉 MIGRATION SUCCESSFUL - All tables/columns exist!", file=sys.stderr, flush=True)
        else:
            print("⚠️  MIGRATION INCOMPLETE - Some tables/columns missing", file=sys.stderr, flush=True)
            if not has_rate_limit:
                print("   Missing: rate limiting fields", file=sys.stderr, flush=True)
            if not has_spreads:
                print("   Missing: spreads table", file=sys.stderr, flush=True)
        print("=" * 60 + "\n", file=sys.stderr, flush=True)
        
    except Exception as e:
        print(f"❌ Error verifying migration: {e}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc(file=sys.stderr)

