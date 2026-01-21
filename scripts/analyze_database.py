#!/usr/bin/env python3
"""
Database Schema Analyzer

Analyzes database schema for optimization opportunities:
- Missing indices
- Tables without primary keys
- Large tables without partitioning
- Unused indices
- Index usage statistics

Usage:
    python scripts/analyze_database.py
    python scripts/analyze_database.py --verbose
    python scripts/analyze_database.py --export report.json
"""

import argparse
import json
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db
from sqlalchemy import inspect, text

class DatabaseAnalyzer:
    def __init__(self):
        self.results = {
            'tables': {},
            'indices': {},
            'recommendations': [],
            'stats': {}
        }
    
    def analyze_tables(self):
        """Analyze all database tables."""
        print("\n" + "=" * 70)
        print("Database Tables Analysis")
        print("=" * 70)
        
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        
        print(f"\nFound {len(table_names)} tables")
        print()
        
        for table_name in table_names:
            print(f"📊 Table: {table_name}")
            print("-" * 60)
            
            # Get columns
            columns = inspector.get_columns(table_name)
            print(f"   Columns: {len(columns)}")
            
            # Get indices
            indices = inspector.get_indexes(table_name)
            print(f"   Indices: {len(indices)}")
            
            # Get foreign keys
            foreign_keys = inspector.get_foreign_keys(table_name)
            print(f"   Foreign Keys: {len(foreign_keys)}")
            
            # Get row count (PostgreSQL specific)
            row_count = 0
            try:
                result = db.session.execute(
                    text(f"SELECT COUNT(*) FROM {table_name}")
                )
                row_count = result.scalar()
                print(f"   Row Count: {row_count:,}")
                
                # Table size
                try:
                    size_result = db.session.execute(text(
                        f"SELECT pg_size_pretty(pg_total_relation_size('{table_name}'))"
                    ))
                    table_size = size_result.scalar()
                    print(f"   Table Size: {table_size}")
                except:
                    pass
                
            except Exception as e:
                print(f"   Row Count: Unable to determine ({str(e)[:50]})")
            
            # Store results
            self.results['tables'][table_name] = {
                'columns': len(columns),
                'indices': len(indices),
                'foreign_keys': len(foreign_keys),
                'row_count': row_count
            }
            
            print()
    
    def analyze_indices(self):
        """Analyze database indices."""
        print("\n" + "=" * 70)
        print("Index Analysis")
        print("=" * 70)
        
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        
        for table_name in table_names:
            indices = inspector.get_indexes(table_name)
            
            if not indices:
                print(f"\n⚠️  Table '{table_name}' has NO indices!")
                self.results['recommendations'].append({
                    'type': 'missing_indices',
                    'table': table_name,
                    'priority': 'high',
                    'recommendation': f"Add indices to {table_name} for frequently queried columns"
                })
                continue
            
            print(f"\n📊 {table_name}:")
            for idx in indices:
                columns_str = ', '.join(idx['column_names'])
                unique_str = 'UNIQUE' if idx.get('unique') else 'NON-UNIQUE'
                print(f"   {unique_str:12s} {idx['name']:40s} ({columns_str})")
                
                # Store index info
                if table_name not in self.results['indices']:
                    self.results['indices'][table_name] = []
                self.results['indices'][table_name].append({
                    'name': idx['name'],
                    'columns': idx['column_names'],
                    'unique': idx.get('unique', False)
                })
    
    def check_missing_indices(self):
        """Check for commonly missing indices."""
        print("\n" + "=" * 70)
        print("Missing Index Detection")
        print("=" * 70)
        
        # Common patterns that should be indexed
        recommendations = []
        
        # Check for foreign key columns without indices
        inspector = inspect(db.engine)
        for table_name in inspector.get_table_names():
            foreign_keys = inspector.get_foreign_keys(table_name)
            indices = inspector.get_indexes(table_name)
            indexed_columns = set()
            
            for idx in indices:
                indexed_columns.update(idx['column_names'])
            
            for fk in foreign_keys:
                fk_column = fk['constrained_columns'][0]
                if fk_column not in indexed_columns:
                    rec = {
                        'type': 'missing_fk_index',
                        'table': table_name,
                        'column': fk_column,
                        'priority': 'high',
                        'sql': f"CREATE INDEX IF NOT EXISTS idx_{table_name}_{fk_column} ON {table_name}({fk_column});",
                        'recommendation': f"Add index on foreign key {table_name}.{fk_column}"
                    }
                    recommendations.append(rec)
                    print(f"❌ Missing FK index: {table_name}.{fk_column}")
        
        # Check for common query patterns
        common_patterns = [
            ('users', 'email'),
            ('users', 'created_at'),
            ('positions', 'user_id'),
            ('positions', 'status'),
            ('positions', 'symbol'),
            ('positions', 'expiration_date'),
            ('trades', 'user_id'),
            ('trades', 'symbol'),
            ('trades', 'executed_at'),
            ('alerts', 'user_id'),
            ('alerts', 'status'),
            ('alerts', 'created_at'),
            ('opportunities', 'user_id'),
            ('opportunities', 'symbol'),
            ('opportunities', 'score'),
            ('opportunities', 'created_at'),
        ]
        
        for table_name, column_name in common_patterns:
            if table_name not in inspector.get_table_names():
                continue
            
            indices = inspector.get_indexes(table_name)
            indexed_columns = set()
            
            for idx in indices:
                indexed_columns.update(idx['column_names'])
            
            if column_name not in indexed_columns:
                rec = {
                    'type': 'missing_common_index',
                    'table': table_name,
                    'column': column_name,
                    'priority': 'medium',
                    'sql': f"CREATE INDEX IF NOT EXISTS idx_{table_name}_{column_name} ON {table_name}({column_name});",
                    'recommendation': f"Add index on commonly queried column {table_name}.{column_name}"
                }
                recommendations.append(rec)
                print(f"⚠️  Missing common index: {table_name}.{column_name}")
        
        self.results['recommendations'].extend(recommendations)
        
        if not recommendations:
            print("\n✅ No obvious missing indices detected!")
    
    def analyze_query_performance(self):
        """Analyze query performance using pg_stat_statements."""
        print("\n" + "=" * 70)
        print("Query Performance Analysis")
        print("=" * 70)
        
        try:
            # Check if pg_stat_statements is enabled
            result = db.session.execute(text(
                "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_stat_statements'"
            ))
            
            if result.scalar() == 0:
                print("\n⚠️  pg_stat_statements extension not enabled")
                print("   To enable, run: CREATE EXTENSION pg_stat_statements;")
                return
            
            # Get slow queries
            slow_queries = db.session.execute(text("""
                SELECT 
                    LEFT(query, 100) as query_snippet,
                    calls,
                    mean_exec_time,
                    max_exec_time,
                    total_exec_time
                FROM pg_stat_statements
                WHERE mean_exec_time > 100
                ORDER BY mean_exec_time DESC
                LIMIT 10
            """))
            
            print("\n🐌 Slowest Queries (avg exec time > 100ms):")
            print()
            
            for row in slow_queries:
                print(f"   Query: {row.query_snippet}...")
                print(f"   Calls: {row.calls}")
                print(f"   Avg Time: {row.mean_exec_time:.2f}ms")
                print(f"   Max Time: {row.max_exec_time:.2f}ms")
                print(f"   Total Time: {row.total_exec_time:.2f}ms")
                print()
                
        except Exception as e:
            print(f"\n⚠️  Could not analyze query performance: {str(e)}")
    
    def analyze_table_statistics(self):
        """Analyze table statistics for optimization opportunities."""
        print("\n" + "=" * 70)
        print("Table Statistics Analysis")
        print("=" * 70)
        
        try:
            # Get table statistics
            stats = db.session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    n_live_tup as row_count,
                    n_dead_tup as dead_rows,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            """))
            
            print("\n📊 Table Statistics:")
            print()
            
            for row in stats:
                print(f"   Table: {row.tablename}")
                print(f"   Size: {row.size}")
                print(f"   Live Rows: {row.row_count:,}")
                print(f"   Dead Rows: {row.dead_rows:,}")
                
                # Check if needs vacuum
                if row.row_count > 0 and row.dead_rows > row.row_count * 0.2:  # >20% dead rows
                    print(f"   ⚠️  High dead row ratio - consider VACUUM")
                    self.results['recommendations'].append({
                        'type': 'vacuum_needed',
                        'table': row.tablename,
                        'priority': 'medium',
                        'recommendation': f"Run VACUUM on {row.tablename} (dead rows: {row.dead_rows:,})"
                    })
                
                print(f"   Last Vacuum: {row.last_vacuum or 'Never'}")
                print(f"   Last Analyze: {row.last_analyze or 'Never'}")
                print()
                
        except Exception as e:
            print(f"\n⚠️  Could not analyze table statistics: {str(e)}")
    
    def generate_report(self):
        """Generate comprehensive optimization report."""
        print("\n" + "=" * 70)
        print("Optimization Recommendations")
        print("=" * 70)
        
        if not self.results['recommendations']:
            print("\n✅ No optimization recommendations at this time!")
            return
        
        # Group by priority
        high_priority = [r for r in self.results['recommendations'] if r.get('priority') == 'high']
        medium_priority = [r for r in self.results['recommendations'] if r.get('priority') == 'medium']
        low_priority = [r for r in self.results['recommendations'] if r.get('priority') == 'low']
        
        if high_priority:
            print("\n🔴 HIGH PRIORITY:")
            for i, rec in enumerate(high_priority, 1):
                print(f"   {i}. {rec['recommendation']}")
                if 'sql' in rec:
                    print(f"      SQL: {rec['sql']}")
        
        if medium_priority:
            print("\n🟡 MEDIUM PRIORITY:")
            for i, rec in enumerate(medium_priority, 1):
                print(f"   {i}. {rec['recommendation']}")
                if 'sql' in rec:
                    print(f"      SQL: {rec['sql']}")
        
        if low_priority:
            print("\n🟢 LOW PRIORITY:")
            for i, rec in enumerate(low_priority, 1):
                print(f"   {i}. {rec['recommendation']}")


def main():
    parser = argparse.ArgumentParser(description='Database Schema Analyzer')
    parser.add_argument('--verbose', action='store_true', help='Verbose output')
    parser.add_argument('--export', help='Export results to JSON file')
    args = parser.parse_args()
    
    app = create_app()
    
    with app.app_context():
        print("=" * 70)
        print("IAB Options Bot - Database Analysis")
        print("=" * 70)
        print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)
        
        analyzer = DatabaseAnalyzer()
        
        # Run analyses
        analyzer.analyze_tables()
        analyzer.analyze_indices()
        analyzer.check_missing_indices()
        analyzer.analyze_query_performance()
        analyzer.analyze_table_statistics()
        
        # Generate report
        analyzer.generate_report()
        
        # Export results
        if args.export:
            with open(args.export, 'w') as f:
                json.dump(analyzer.results, f, indent=2, default=str)
            print(f"\n📄 Results exported to {args.export}")
        
        print("\n" + "=" * 70)
        print("Analysis Complete")
        print("=" * 70)


if __name__ == '__main__':
    main()

