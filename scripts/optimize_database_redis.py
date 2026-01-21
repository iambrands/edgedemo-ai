#!/usr/bin/env python3
"""
Comprehensive Database and Redis Optimization

Applies all recommended optimizations.

Usage:
    python scripts/optimize_database_redis.py --preview
    python scripts/optimize_database_redis.py --apply
"""

import argparse
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db
from sqlalchemy import text

def apply_database_optimizations(preview=True):
    """Apply database optimizations."""
    
    optimizations = [
        # Users
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
        
        # Positions
        "CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status)",
        "CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_positions_expiration_date ON positions(expiration_date)",
        
        # Trades
        "CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at DESC)",
        
        # Alerts
        "CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status)",
        
        # Opportunities (if exists)
        "CREATE INDEX IF NOT EXISTS idx_opportunities_user_id ON opportunities(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_opportunities_symbol ON opportunities(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_opportunities_score ON opportunities(score DESC)",
        "CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC)",
        
        # Spreads
        "CREATE INDEX IF NOT EXISTS idx_spreads_user_id ON spreads(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_spreads_symbol ON spreads(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_spreads_status ON spreads(status)",
        "CREATE INDEX IF NOT EXISTS idx_spreads_expiration ON spreads(expiration)",
        
        # Users (rate limiting)
        "CREATE INDEX IF NOT EXISTS idx_users_last_analysis_reset ON users(last_analysis_reset)",
    ]
    
    print("=" * 70)
    print("Database Optimizations")
    print("=" * 70)
    print()
    
    if preview:
        print("PREVIEW MODE - No changes will be made")
        print()
        print("Would create the following indices:")
        for sql in optimizations:
            print(f"  {sql}")
    else:
        print("APPLYING OPTIMIZATIONS...")
        print()
        
        created = 0
        skipped = 0
        errors = 0
        
        for sql in optimizations:
            try:
                db.session.execute(text(sql))
                created += 1
                print(f"✅ {sql[:60]}...")
            except Exception as e:
                error_msg = str(e)
                # Check if index already exists (not a real error)
                if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                    skipped += 1
                    print(f"⏭️  {sql[:60]}... (already exists)")
                else:
                    errors += 1
                    print(f"⚠️  {sql[:60]}... ({error_msg[:40]})")
        
        try:
            db.session.commit()
        except Exception as e:
            print(f"⚠️  Error committing changes: {str(e)}")
            db.session.rollback()
        
        print()
        print(f"✅ Created: {created}")
        print(f"⏭️  Skipped (already exist): {skipped}")
        if errors > 0:
            print(f"⚠️  Errors: {errors}")

def optimize_vacuum(preview=True):
    """Run VACUUM and ANALYZE."""
    
    print()
    print("=" * 70)
    print("Database Maintenance")
    print("=" * 70)
    print()
    
    if preview:
        print("Would run:")
        print("  VACUUM ANALYZE;")
        print()
        print("⚠️  Note: VACUUM ANALYZE can take a long time on large tables")
        print("   Consider running during maintenance window")
    else:
        print("Running VACUUM ANALYZE...")
        try:
            db.session.execute(text("VACUUM ANALYZE"))
            db.session.commit()
            print("✅ VACUUM ANALYZE completed")
        except Exception as e:
            print(f"⚠️  Could not run VACUUM: {str(e)}")
            db.session.rollback()

def main():
    parser = argparse.ArgumentParser(description='Database and Redis Optimization')
    parser.add_argument('--apply', action='store_true', help='Apply optimizations')
    parser.add_argument('--skip-vacuum', action='store_true', help='Skip VACUUM')
    parser.add_argument('--preview', action='store_true', help='Preview mode (default)')
    args = parser.parse_args()
    
    app = create_app()
    
    with app.app_context():
        print("=" * 70)
        print("Database and Redis Optimization")
        print("=" * 70)
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        print()
        
        if args.apply:
            print("🔧 APPLYING OPTIMIZATIONS")
        else:
            print("👀 PREVIEW MODE (use --apply to execute)")
        
        print()
        
        # Apply database optimizations
        apply_database_optimizations(preview=not args.apply)
        
        # Run VACUUM
        if not args.skip_vacuum:
            optimize_vacuum(preview=not args.apply)
        
        print()
        print("=" * 70)
        if args.apply:
            print("✅ Optimizations Applied!")
            print()
            print("💡 Next steps:")
            print("   1. Run database analysis to verify:")
            print("      python scripts/analyze_database.py")
            print("   2. Monitor application performance")
            print("   3. Check query performance in logs")
        else:
            print("ℹ️  Run with --apply to execute")
            print()
            print("⚠️  Note: These are common optimizations.")
            print("   Review the SQL before applying in production.")
        print("=" * 70)


if __name__ == '__main__':
    main()

