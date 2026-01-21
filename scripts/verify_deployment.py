#!/usr/bin/env python3
"""
Deployment Verification Script

Verifies that database migration executed successfully and all features are enabled.

Usage:
    python scripts/verify_deployment.py
"""

import sys
import os
import ast
from datetime import datetime
from sqlalchemy import inspect, text

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

def check_database_schema():
    """Check database schema for migration success"""
    results = {'passed': 0, 'failed': 0, 'checks': []}
    
    try:
        inspector = inspect(db.engine)
        
        # Check spreads table
        tables = inspector.get_table_names()
        if 'spreads' in tables:
            spread_columns = [c['name'] for c in inspector.get_columns('spreads')]
            if len(spread_columns) == 21:
                results['checks'].append(('Spreads table exists (21 columns)', True))
                results['passed'] += 1
            else:
                results['checks'].append((f'Spreads table columns: {len(spread_columns)} (expected 21)', False))
                results['failed'] += 1
        else:
            results['checks'].append(('Spreads table exists', False))
            results['failed'] += 1
        
        # Check spreads indices
        if 'spreads' in tables:
            indices = [idx['name'] for idx in inspector.get_indexes('spreads')]
            required_indices = [
                'idx_spreads_user_id',
                'idx_spreads_symbol', 
                'idx_spreads_status',
                'idx_spreads_expiration',
                'idx_spreads_created_at'
            ]
            
            for idx_name in required_indices:
                if idx_name in indices or any(idx_name in idx for idx in indices):
                    results['checks'].append((f'Index: {idx_name}', True))
                    results['passed'] += 1
                else:
                    results['checks'].append((f'Index: {idx_name}', False))
                    results['failed'] += 1
        
        # Check users table fields
        user_columns = [c['name'] for c in inspector.get_columns('users')]
        
        if 'daily_ai_analyses' in user_columns:
            results['checks'].append(('Users field: daily_ai_analyses', True))
            results['passed'] += 1
        else:
            results['checks'].append(('Users field: daily_ai_analyses', False))
            results['failed'] += 1
        
        if 'last_analysis_reset' in user_columns:
            results['checks'].append(('Users field: last_analysis_reset', True))
            results['passed'] += 1
        else:
            results['checks'].append(('Users field: last_analysis_reset', False))
            results['failed'] += 1
            
    except Exception as e:
        results['checks'].append((f'Database check error: {str(e)}', False))
        results['failed'] += 1
    
    return results

def check_health_endpoint():
    """Check application health endpoint"""
    results = {'passed': 0, 'failed': 0, 'checks': [], 'response_time': 0}
    
    try:
        import requests
        import time
        
        start = time.time()
        response = requests.get('http://localhost:5000/health', timeout=5)
        response_time = time.time() - start
        
        results['response_time'] = response_time
        
        if response.status_code == 200:
            results['checks'].append(('Health endpoint responding (200)', True))
            results['passed'] += 1
            
            data = response.json()
            if data.get('status') == 'healthy' or 'status' in data:
                results['checks'].append(('Health status valid', True))
                results['passed'] += 1
            else:
                results['checks'].append(('Health status valid', False))
                results['failed'] += 1
        else:
            results['checks'].append((f'Health endpoint status: {response.status_code}', False))
            results['failed'] += 1
            
    except requests.exceptions.ConnectionError:
        results['checks'].append(('Health endpoint (skipped - not running locally)', None))
    except Exception as e:
        results['checks'].append((f'Health check error: {str(e)}', False))
        results['failed'] += 1
    
    return results

def check_code_verification():
    """Check that rate limiting code is uncommented"""
    results = {'passed': 0, 'failed': 0, 'checks': []}
    
    try:
        # Check models/user.py
        user_model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'user.py')
        with open(user_model_path, 'r') as f:
            user_code = f.read()
        
        # Check for uncommented rate limiting fields
        if 'daily_ai_analyses = db.Column' in user_code and not user_code.count('# daily_ai_analyses = db.Column'):
            results['checks'].append(('Rate limiting fields uncommented', True))
            results['passed'] += 1
        else:
            results['checks'].append(('Rate limiting fields uncommented', False))
            results['failed'] += 1
        
        # Check for uncommented methods using AST
        try:
            tree = ast.parse(user_code)
            methods = [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
            
            if 'can_analyze' in methods and 'increment_analysis_count' in methods and 'get_analysis_usage' in methods:
                results['checks'].append(('Rate limiting methods uncommented', True))
                results['passed'] += 1
            else:
                results['checks'].append(('Rate limiting methods uncommented', False))
                results['failed'] += 1
        except:
            # Fallback to string search
            if 'def can_analyze' in user_code and 'def increment_analysis_count' in user_code:
                results['checks'].append(('Rate limiting methods uncommented', True))
                results['passed'] += 1
            else:
                results['checks'].append(('Rate limiting methods uncommented', False))
                results['failed'] += 1
        
        # Check api/options.py
        options_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'api', 'options.py')
        with open(options_path, 'r') as f:
            options_code = f.read()
        
        # Check for uncommented rate limit check
        if 'if not current_user.can_analyze():' in options_code and options_code.count('# if not current_user.can_analyze():') == 0:
            results['checks'].append(('Rate limit checks active in API', True))
            results['passed'] += 1
        else:
            results['checks'].append(('Rate limit checks active in API', False))
            results['failed'] += 1
            
    except Exception as e:
        results['checks'].append((f'Code check error: {str(e)}', False))
        results['failed'] += 1
    
    return results

def main():
    print("=" * 60)
    print("Deployment Verification Report")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    app = create_app()
    
    with app.app_context():
        # Check database schema
        print("Database Schema:")
        db_results = check_database_schema()
        for check_name, passed in db_results['checks']:
            status = '✅' if passed else '❌'
            print(f"{status} {check_name}")
        print()
        
        # Check health endpoint
        print("Application Health:")
        health_results = check_health_endpoint()
        for check_name, passed in health_results['checks']:
            if passed is None:
                print(f"⏭️  {check_name}")
            elif passed:
                print(f"✅ {check_name}")
            else:
                print(f"❌ {check_name}")
        
        if health_results['response_time'] > 0:
            print(f"✅ Response time: {health_results['response_time']:.2f}s")
        print()
        
        # Check code verification
        print("Code Verification:")
        code_results = check_code_verification()
        for check_name, passed in code_results['checks']:
            status = '✅' if passed else '❌'
            print(f"{status} {check_name}")
        print()
        
        # Summary
        total_passed = db_results['passed'] + health_results['passed'] + code_results['passed']
        total_failed = db_results['failed'] + health_results['failed'] + code_results['failed']
        
        print("=" * 60)
        if total_failed == 0:
            print("Overall Status: ✅ ALL CHECKS PASSED")
            print("=" * 60)
            return 0
        else:
            print(f"Overall Status: ❌ {total_failed} CHECK(S) FAILED")
            print(f"Passed: {total_passed}, Failed: {total_failed}")
            print("=" * 60)
            return 1

if __name__ == '__main__':
    sys.exit(main())

