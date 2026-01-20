#!/bin/bash

# This script verifies migration has been run before re-enabling rate limiting
# Run this AFTER: flask db upgrade

set -e

echo "🔧 Verifying migration status before re-enabling rate limiting..."
echo ""

# Check if migration has been run
echo "Checking database schema..."
python3 << 'EOF'
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import create_app, db
    from sqlalchemy import inspect
    
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        
        # Check spreads table
        if 'spreads' not in tables:
            print("❌ ERROR: Spreads table not found. Run 'flask db upgrade' first.")
            sys.exit(1)
        
        # Check users table columns
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        
        if 'daily_ai_analyses' not in user_columns:
            print("❌ ERROR: daily_ai_analyses column not found. Run 'flask db upgrade' first.")
            sys.exit(1)
        
        if 'last_analysis_reset' not in user_columns:
            print("❌ ERROR: last_analysis_reset column not found. Run 'flask db upgrade' first.")
            sys.exit(1)
        
        print("✅ Migration confirmed:")
        print("   - Spreads table exists")
        print("   - daily_ai_analyses column exists")
        print("   - last_analysis_reset column exists")
        print("")
        print("✅ Ready to re-enable rate limiting code")
        sys.exit(0)
        
except Exception as e:
    print(f"❌ Error checking migration: {e}")
    sys.exit(1)
EOF

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Aborting: Migration must be run first"
    echo ""
    echo "Run this command on Railway:"
    echo "  flask db upgrade"
    exit 1
fi

echo ""
echo "✅ Migration verified successfully!"
echo ""
echo "Next steps:"
echo "1. Uncomment rate limiting code in models/user.py"
echo "2. Uncomment rate limiting code in api/options.py"
echo "3. Remove TODO comments"
echo "4. Commit and push:"
echo "   git add -A"
echo "   git commit -m 'feat: Re-enable rate limiting after database migration'"
echo "   git push"
echo ""
echo "Or use the automated script:"
echo "   python3 scripts/uncomment_rate_limiting.py"

