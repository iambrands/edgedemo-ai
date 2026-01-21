#!/usr/bin/env python3
"""
Database Connection Pool Analyzer

Analyzes database connection pool configuration and usage.

Usage:
    python scripts/analyze_connections.py
"""

import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db
from sqlalchemy import text

def main():
    app = create_app()
    
    with app.app_context():
        print("=" * 70)
        print("Database Connection Pool Analysis")
        print("=" * 70)
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        print()
        
        # Get pool information
        pool = db.engine.pool
        
        print("Connection Pool Configuration:")
        print(f"   Pool Size: {pool.size()}")
        print(f"   Max Overflow: {pool._max_overflow}")
        print(f"   Timeout: {pool._timeout}")
        print(f"   Current Checked Out: {pool.checkedout()}")
        print()
        
        # Get active connections from PostgreSQL
        try:
            result = db.session.execute(text("""
                SELECT 
                    COUNT(*) as total_connections,
                    COUNT(*) FILTER (WHERE state = 'active') as active,
                    COUNT(*) FILTER (WHERE state = 'idle') as idle,
                    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
                FROM pg_stat_activity
                WHERE datname = current_database()
            """))
            
            row = result.fetchone()
            
            print("Active Database Connections:")
            print(f"   Total: {row.total_connections}")
            print(f"   Active: {row.active}")
            print(f"   Idle: {row.idle}")
            print(f"   Idle in Transaction: {row.idle_in_transaction}")
            print()
            
            if row.idle_in_transaction > 5:
                print("⚠️  WARNING: High number of idle in transaction connections")
                print("   Consider reviewing transaction management")
            
            # Connection recommendations
            if row.total_connections > pool.size() + pool._max_overflow:
                print("⚠️  WARNING: More connections than pool allows")
                print("   Consider increasing pool size or max overflow")
                
        except Exception as e:
            print(f"Could not get connection stats: {str(e)}")
        
        print()
        print("=" * 70)


if __name__ == '__main__':
    main()

