#!/usr/bin/env python3
"""
Quick Performance Fixes

Applies common performance optimizations automatically.

Usage:
    python scripts/quick_performance_fixes.py --preview
    python scripts/quick_performance_fixes.py --apply
"""

import argparse
from app import create_app
from models import db
from sqlalchemy import text

def add_missing_indices(preview=True):
    """Add commonly missing database indices."""
    
    indices = [
        # Opportunities table (if exists)
        "CREATE INDEX IF NOT EXISTS idx_opportunities_symbol ON opportunities(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_opportunities_score ON opportunities(score DESC)",
        
        # Alerts table (if exists)
        "CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_alerts_user_status ON alerts(user_id, status)",
        
        # Positions table
        "CREATE INDEX IF NOT EXISTS idx_positions_user_id_status ON positions(user_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status)",
        "CREATE INDEX IF NOT EXISTS idx_positions_expiration_date ON positions(expiration_date)",
        
        # Trades table
        "CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)",
        "CREATE INDEX IF NOT EXISTS idx_trades_executed_at ON trades(executed_at DESC)",
        
        # Users table (for rate limiting)
        "CREATE INDEX IF NOT EXISTS idx_users_last_analysis_reset ON users(last_analysis_reset)",
    ]
    
    created = 0
    skipped = 0
    errors = 0
    
    if preview:
        print("Would create the following indices:")
        print()
        for idx in indices:
            print(f"  - {idx}")
    else:
        print("Creating indices...")
        print()
        for idx in indices:
            try:
                db.session.execute(text(idx))
                db.session.commit()
                created += 1
                print(f"  ✅ {idx}")
            except Exception as e:
                error_msg = str(e)
                # Check if index already exists (not a real error)
                if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                    skipped += 1
                    print(f"  ⏭️  {idx[:60]}... (already exists)")
                else:
                    errors += 1
                    print(f"  ⚠️  {idx[:60]}... ({error_msg[:50]})")
        
        print()
        print(f"✅ Created: {created}")
        print(f"⏭️  Skipped (already exist): {skipped}")
        if errors > 0:
            print(f"⚠️  Errors: {errors}")


def main():
    parser = argparse.ArgumentParser(description='Quick Performance Fixes')
    parser.add_argument('--apply', action='store_true', help='Apply fixes (default is preview)')
    parser.add_argument('--preview', action='store_true', help='Preview mode (default)')
    args = parser.parse_args()
    
    app = create_app()
    
    with app.app_context():
        print("=" * 70)
        print("Quick Performance Fixes")
        print("=" * 70)
        print()
        
        if args.apply:
            print("🔧 Applying fixes...")
        else:
            print("👀 Preview mode (use --apply to execute)")
        
        print()
        add_missing_indices(preview=not args.apply)
        
        print()
        if args.apply:
            print("✅ Fixes applied!")
            print()
            print("💡 Next steps:")
            print("   1. Re-run performance assessment:")
            print("      python scripts/performance_assessment.py")
            print("   2. Monitor application performance")
            print("   3. Check database query times in logs")
        else:
            print("ℹ️  Run with --apply to execute these changes")
            print()
            print("⚠️  Note: These are common optimizations.")
            print("   Review the SQL before applying in production.")


if __name__ == '__main__':
    main()

