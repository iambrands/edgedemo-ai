#!/usr/bin/env python3
"""Direct SQL migration script for spreads table and rate limiting fields"""

import sys
import os

# Force immediate output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60, file=sys.stderr, flush=True)
print("Running Direct SQL Migration", file=sys.stderr, flush=True)
print("=" * 60, file=sys.stderr, flush=True)

try:
    from app import create_app, db
    from sqlalchemy import inspect, text
    
    print("✓ Imports successful", file=sys.stderr, flush=True)
    
    app = create_app()
    print("✓ App created", file=sys.stderr, flush=True)
    
    with app.app_context():
        print("\n✓ Connected to database", file=sys.stderr, flush=True)
        
        # Check if spreads table exists
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        spreads_exists = 'spreads' in tables
        
        if not spreads_exists:
            print("\nCreating spreads table...", file=sys.stderr, flush=True)
            
            # Create spreads table
            create_spreads = text("""
                CREATE TABLE IF NOT EXISTS spreads (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    spread_type VARCHAR(20) NOT NULL,
                    quantity INTEGER NOT NULL,
                    expiration DATE NOT NULL,
                    long_strike DECIMAL(10,2) NOT NULL,
                    long_premium DECIMAL(10,2) NOT NULL,
                    long_option_symbol VARCHAR(50),
                    short_strike DECIMAL(10,2) NOT NULL,
                    short_premium DECIMAL(10,2) NOT NULL,
                    short_option_symbol VARCHAR(50),
                    net_debit DECIMAL(10,2) NOT NULL,
                    max_profit DECIMAL(10,2),
                    max_loss DECIMAL(10,2),
                    breakeven DECIMAL(10,2),
                    strike_width DECIMAL(10,2),
                    current_value DECIMAL(10,2) DEFAULT 0.0,
                    unrealized_pnl DECIMAL(10,2) DEFAULT 0.0,
                    unrealized_pnl_percent DECIMAL(10,2) DEFAULT 0.0,
                    realized_pnl DECIMAL(10,2),
                    status VARCHAR(20) DEFAULT 'open',
                    account_type VARCHAR(10) DEFAULT 'paper',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    closed_at TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_spreads_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            db.session.execute(create_spreads)
            db.session.commit()
            print("✓ Spreads table created", file=sys.stderr, flush=True)
        else:
            print("✓ Spreads table already exists", file=sys.stderr, flush=True)
        
        # Create indices on spreads table
        print("\nCreating indices...", file=sys.stderr, flush=True)
        
        indices = [
            ("CREATE INDEX IF NOT EXISTS idx_spreads_user_id ON spreads(user_id)", "idx_spreads_user_id"),
            ("CREATE INDEX IF NOT EXISTS idx_spreads_symbol ON spreads(symbol)", "idx_spreads_symbol"),
            ("CREATE INDEX IF NOT EXISTS idx_spreads_status ON spreads(status)", "idx_spreads_status"),
            ("CREATE INDEX IF NOT EXISTS idx_spreads_expiration ON spreads(expiration)", "idx_spreads_expiration"),
            ("CREATE INDEX IF NOT EXISTS idx_spreads_created_at ON spreads(created_at)", "idx_spreads_created_at")
        ]
        
        for idx_sql, idx_name in indices:
            try:
                db.session.execute(text(idx_sql))
                db.session.commit()
                print(f"✓ {idx_name} created", file=sys.stderr, flush=True)
            except Exception as e:
                # Index might already exist
                if "already exists" in str(e).lower():
                    print(f"✓ {idx_name} already exists", file=sys.stderr, flush=True)
                else:
                    print(f"⚠ {idx_name} creation warning: {e}", file=sys.stderr, flush=True)
        
        # Check and add rate limiting fields to users table
        print("\nAdding rate limiting fields to users table...", file=sys.stderr, flush=True)
        
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        
        # Add daily_ai_analyses if it doesn't exist
        if 'daily_ai_analyses' not in user_columns:
            try:
                db.session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_ai_analyses INTEGER DEFAULT 0 NOT NULL"))
                db.session.commit()
                print("✓ Added daily_ai_analyses column", file=sys.stderr, flush=True)
            except Exception as e:
                # PostgreSQL doesn't support IF NOT EXISTS in ALTER TABLE
                # Check if column exists using information_schema
                check_col = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='daily_ai_analyses'
                """)
                result = db.session.execute(check_col).fetchone()
                if not result:
                    try:
                        db.session.execute(text("ALTER TABLE users ADD COLUMN daily_ai_analyses INTEGER DEFAULT 0 NOT NULL"))
                        db.session.commit()
                        print("✓ Added daily_ai_analyses column", file=sys.stderr, flush=True)
                    except Exception as col_error:
                        print(f"⚠ Could not add daily_ai_analyses: {col_error}", file=sys.stderr, flush=True)
                else:
                    print("✓ daily_ai_analyses column already exists", file=sys.stderr, flush=True)
        else:
            print("✓ daily_ai_analyses column already exists", file=sys.stderr, flush=True)
        
        # Add last_analysis_reset if it doesn't exist
        if 'last_analysis_reset' not in user_columns:
            try:
                db.session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_analysis_reset DATE DEFAULT CURRENT_DATE NOT NULL"))
                db.session.commit()
                print("✓ Added last_analysis_reset column", file=sys.stderr, flush=True)
            except Exception as e:
                # PostgreSQL doesn't support IF NOT EXISTS in ALTER TABLE
                check_col = text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='users' AND column_name='last_analysis_reset'
                """)
                result = db.session.execute(check_col).fetchone()
                if not result:
                    try:
                        db.session.execute(text("ALTER TABLE users ADD COLUMN last_analysis_reset DATE DEFAULT CURRENT_DATE NOT NULL"))
                        db.session.commit()
                        print("✓ Added last_analysis_reset column", file=sys.stderr, flush=True)
                    except Exception as col_error:
                        print(f"⚠ Could not add last_analysis_reset: {col_error}", file=sys.stderr, flush=True)
                else:
                    print("✓ last_analysis_reset column already exists", file=sys.stderr, flush=True)
        else:
            print("✓ last_analysis_reset column already exists", file=sys.stderr, flush=True)
        
        # Verify migration
        print("\nVerifying migration...", file=sys.stderr, flush=True)
        
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        spreads_exists = 'spreads' in tables
        
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        has_daily_ai = 'daily_ai_analyses' in user_columns
        has_last_reset = 'last_analysis_reset' in user_columns
        
        spreads_cols = []
        if spreads_exists:
            spreads_cols = [c['name'] for c in inspector.get_columns('spreads')]
        
        print("\n" + "=" * 60, file=sys.stderr, flush=True)
        print("Migration Results:", file=sys.stderr, flush=True)
        print("=" * 60, file=sys.stderr, flush=True)
        print(f"Spreads table exists:        {'✓ YES' if spreads_exists else '✗ NO'}", file=sys.stderr, flush=True)
        print(f"Spreads table columns:       {len(spreads_cols)} (expected: 21)", file=sys.stderr, flush=True)
        print(f"Rate limit field 1:          {'✓ YES' if has_daily_ai else '✗ NO'} (daily_ai_analyses)", file=sys.stderr, flush=True)
        print(f"Rate limit field 2:          {'✓ YES' if has_last_reset else '✗ NO'} (last_analysis_reset)", file=sys.stderr, flush=True)
        print("=" * 60, file=sys.stderr, flush=True)
        
        if spreads_exists and has_daily_ai and has_last_reset:
            print("\n✅ MIGRATION COMPLETED SUCCESSFULLY!", file=sys.stderr, flush=True)
            print("\nNext steps:", file=sys.stderr, flush=True)
            print("1. Code changes have been uncommented", file=sys.stderr, flush=True)
            print("2. Commit and push changes", file=sys.stderr, flush=True)
            print("3. Test the app", file=sys.stderr, flush=True)
            sys.exit(0)
        else:
            print("\n⚠️  MIGRATION INCOMPLETE - Some items missing", file=sys.stderr, flush=True)
            sys.exit(1)
            
except Exception as e:
    print(f"\n❌ Migration failed: {e}", file=sys.stderr, flush=True)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)

